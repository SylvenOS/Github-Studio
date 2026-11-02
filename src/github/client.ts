import { cached } from '../core/cache';
import { ApiError, badRequest, notFound, rateLimited, upstream } from '../core/errors';
import {
  aggregateRepos,
  levelFromEnum,
  mergeCalendars,
  parsePinnedHtml,
  parseContributionHtml,
  type GqlRepoNode
} from './parse';
import { benchUntilReset, observe, pick, poolFor, poolStatus, type TokenState } from './tokens';
import type { CalendarDay, ContributionDetail, DateRange, PinnedRepo, RepoDetail, RepoHealth, RepoSummary, StarHistory, StarPoint, Supporter, UserData, UserExtended, LanguageStat, YearLanguages } from './types';

export * from './types';

const API = 'https://api.github.com';
/** Per upstream call. */
const PER_CALL_MS = 6000;
/** Whole client (one card request): keep well under GitHub camo's image timeout. */
const DEADLINE_MS = 9000;
/** Outgoing fetches per request. Workers' free plan allows 50 subrequests including cache operations. */
const MAX_SUBREQUESTS = 30;
const MAX_REPO_PAGES = 3; // 300 repositories
const MAX_AVATAR_BYTES = 1_000_000;
/** Past calendar years never change. */
const PAST_YEAR_TTL = 30 * 86_400;

export interface ClientOptions {
  tokens?: string[];
  /** Freshness of upstream data, seconds (stale copies are still served for days if GitHub fails). */
  ttl?: number;
  waitUntil?: (p: Promise<unknown>) => void;
}

// ---- date ranges ----------------------------------------------------------------------------

const day = (d: Date) => d.toISOString().slice(0, 10);

/** The rolling window GitHub shows on a profile (≈ last 12 months). */
export function lastYearRange(now = new Date()): DateRange {
  return { from: day(new Date(now.getTime() - 364 * 86_400_000)), to: day(now), rolling: true };
}

export function calendarYearRange(year: number, now = new Date()): DateRange {
  const end = year >= now.getUTCFullYear() ? day(now) : `${year}-12-31`;
  return { from: `${year}-01-01`, to: end };
}

// ---- GraphQL documents ----------------------------------------------------------------------

const REPO_ARGS = 'ownerAffiliations:OWNER, privacy:PUBLIC, isFork:false, first:100, orderBy:{field:STARGAZERS, direction:DESC}';
const REPO_NODES = `nodes{ name description url stargazerCount forkCount isArchived pushedAt createdAt
  primaryLanguage{name color}
  languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{name color} } } }
  pageInfo{ hasNextPage endCursor }`;

const USER_QUERY = `query($login:String!){ user(login:$login){
  login name avatarUrl bio createdAt company location websiteUrl twitterUsername
  followers{totalCount} following{totalCount} gists(privacy:PUBLIC){totalCount}
  all:repositories(ownerAffiliations:OWNER, privacy:PUBLIC){totalCount}
  pullRequests{totalCount} issues{totalCount}
  contributionsCollection{ totalCommitContributions totalPullRequestReviewContributions restrictedContributionsCount
    contributionCalendar{totalContributions} }
  repositories(${REPO_ARGS}){ ${REPO_NODES} }
}}`;

/** Second-tier fields: only cards that show them pay for them. */
const EXTENDED_QUERY = `query($login:String!){ user(login:$login){
  pronouns isHireable
  status{ emoji message }
  socialAccounts(first:10){ nodes{ provider url displayName } }
  starredRepositories{totalCount}
  sponsors(first:1){totalCount} sponsoring(first:1){totalCount}
  organizations(first:12){ nodes{ login name avatarUrl } }
  repositoryDiscussions{totalCount}
  repositoryDiscussionComments(onlyAnswers:true){totalCount}
  mergedPRs:pullRequests(states:MERGED){totalCount}
  closedPRs:pullRequests(states:CLOSED){totalCount}
  closedIssues:issues(states:CLOSED){totalCount}
  repositoriesContributedTo(contributionTypes:[COMMIT, PULL_REQUEST, ISSUE, PULL_REQUEST_REVIEW], includeUserRepositories:false, first:1){totalCount}
  pinnedItems(first:6, types:[REPOSITORY]){ nodes{ ... on Repository{ name description url stargazerCount forkCount owner{login} primaryLanguage{name color} } } }
  contributionsCollection{ totalPullRequestContributions totalIssueContributions contributionYears }
}}`;

const REPO_PAGE_QUERY = `query($login:String!,$after:String){ user(login:$login){
  repositories(${REPO_ARGS}, after:$after){ ${REPO_NODES} } }}`;

const CALENDAR_FIELDS = 'contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount contributionLevel } } }';

const REPO_REF = 'repository{ nameWithOwner owner{login} isPrivate stargazerCount primaryLanguage{name color} } contributions{totalCount}';
const CONTRIB_QUERY = `query($login:String!,$from:DateTime!,$to:DateTime!,$q:String!){
  user(login:$login){ contributionsCollection(from:$from, to:$to){
    totalCommitContributions totalPullRequestContributions totalIssueContributions totalPullRequestReviewContributions
    restrictedContributionsCount totalRepositoriesWithContributedCommits totalRepositoriesWithContributedPullRequests
    totalRepositoriesWithContributedIssues totalRepositoriesWithContributedPullRequestReviews
    pullRequestContributionsByRepository(maxRepositories:50){ ${REPO_REF} }
    commitContributionsByRepository(maxRepositories:50){ ${REPO_REF} } } }
  ext:search(type:ISSUE, query:$q, first:1){ issueCount } }`;

export const emptyExtended = (): UserExtended => ({
  pronouns: null, hireable: false, status: null, socials: [], pinned: [], mergedPullRequests: 0, closedPullRequests: 0,
  closedIssues: 0, organizations: [], discussionAnswers: 0, discussions: 0, sponsors: 0, sponsoring: 0, starred: 0,
  contributionYears: [], reposContributedTo: 0, pullRequestContributions: 0, issueContributions: 0
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (attempt: number) => Math.round(150 * 2 ** attempt * (0.5 + Math.random()));

export class GitHubClient {
  private readonly tokens: string[];
  private readonly pool: TokenState[];
  private readonly ttl: number;
  private readonly waitUntil?: (p: Promise<unknown>) => void;
  private readonly deadline = Date.now() + DEADLINE_MS;
  /** Upstream fetches made by this client (one client per incoming request). */
  subrequests = 0;
  private lastToken?: TokenState;

  constructor(opts: ClientOptions = {}) {
    this.tokens = [...new Set((opts.tokens ?? []).filter(Boolean))];
    this.pool = poolFor(this.tokens);
    this.ttl = opts.ttl ?? 1800;
    this.waitUntil = opts.waitUntil;
  }

  get hasToken() {
    return this.tokens.length > 0;
  }

  /** Token health without network calls and without revealing tokens. */
  tokenStatus() {
    return poolStatus(this.tokens);
  }

  // ---- public API ---------------------------------------------------------------------------

  getUser(login: string): Promise<UserData> {
    const mode = this.hasToken ? 'gql' : 'rest';
    return this.cache(`user:${login.toLowerCase()}:${mode}`, () =>
      this.hasToken ? this.getUserGraphQL(login) : this.getUserRest(login)
    );
  }

  /**
   * Extra profile data (pinned repos, orgs, merged PRs, sponsors, ...). Without a token the public parts are
   * still collected: pinned repos from the profile page, merged/closed PR counts from search, public orgs.
   * Token-only fields stay empty and `partial` is set.
   */
  getUserExtended(login: string): Promise<UserExtended> {
    if (!this.hasToken) return this.cache(`userx:${login.toLowerCase()}:public`, () => this.getExtendedPublic(login), Math.max(this.ttl, 3600));
    return this.cache(`userx:${login.toLowerCase()}`, () => this.getExtendedGraphQL(login), Math.max(this.ttl, 3600));
  }

  /**
   * Daily contributions across date ranges, merged and sorted. Finished years are fetched together in
   * one request and kept for a month; the current year / rolling window use stable keys that don't roll
   * over at midnight, so a busy minute doesn't refetch every calendar at once.
   */
  async getCalendar(login: string, ranges: DateRange[] = [lastYearRange()]): Promise<CalendarDay[]> {
    const l = login.toLowerCase();
    const mode = this.hasToken ? 'g' : 'h';
    const thisYear = new Date().getUTCFullYear();
    const past = ranges.filter((r) => !r.rolling && Number(r.from.slice(0, 4)) < thisYear);
    const live = ranges.filter((r) => !past.includes(r));

    const parts: Promise<CalendarDay[]>[] = [];
    if (past.length) {
      const years = past.map((r) => r.from.slice(0, 4)).join(',');
      parts.push(this.cache(`calpast:${l}:${years}:${mode}`, () => this.fetchCalendars(login, past).then((p) => p.flat()), PAST_YEAR_TTL));
    }
    for (const r of live) {
      const id = r.rolling ? 'rolling' : r.from.slice(0, 4);
      parts.push(this.cache(`cal:${l}:${id}:${mode}`, () => this.fetchCalendars(login, [r]).then((p) => p[0])));
    }
    return mergeCalendars(await Promise.all(parts));
  }

  /** Contribution breakdown for a window, including work in other people's repositories (needs a token for full detail). */
  getContributions(login: string, range: DateRange = lastYearRange()): Promise<ContributionDetail> {
    const id = range.rolling ? 'rolling' : range.from.slice(0, 4);
    return this.cache(`contrib:${login.toLowerCase()}:${id}:${this.hasToken ? 'g' : 'r2'}`, async () => {
      const extQuery = `author:${login} is:pr is:merged -user:${login}`;
      if (!this.hasToken) {
        // token-less: the search API counts public commits, PRs, issues and reviews for any date range
        const span = `${range.from}..${range.to}`;
        const [ext, commits, prs, issues, reviews] = await Promise.all([
          this.searchCount('issues', extQuery),
          this.searchCount('commits', `author:${login} author-date:${span}`),
          this.searchCount('issues', `author:${login} type:pr created:${span}`),
          this.searchCount('issues', `author:${login} type:issue created:${span}`),
          this.searchCount('issues', `reviewed-by:${login} -author:${login} type:pr updated:${span}`)
        ]);
        return {
          from: range.from, to: range.to, commits: commits ?? 0, pullRequests: prs ?? 0, issues: issues ?? 0, reviews: reviews ?? 0, restricted: 0,
          reposWithCommits: 0, reposWithPullRequests: 0, reposWithIssues: 0, reposWithReviews: 0,
          externalMergedPullRequests: ext ?? 0, externalRepos: [], searched: true
        };
      }
      const data = await this.graphql<{ user: any; ext: { issueCount: number } }>(CONTRIB_QUERY, {
        login, from: `${range.from}T00:00:00Z`, to: `${range.to}T23:59:59Z`, q: extQuery
      });
      const cc = data.user.contributionsCollection;
      const external = new Map<string, ContributionDetail['externalRepos'][number]>();
      const add = (list: any[], field: 'pullRequests' | 'commits') => {
        for (const e of list ?? []) {
          const r = e.repository;
          if (!r || r.isPrivate || r.owner.login.toLowerCase() === login.toLowerCase()) continue;
          const cur = external.get(r.nameWithOwner) ?? { nameWithOwner: r.nameWithOwner, owner: r.owner.login, stars: r.stargazerCount, language: r.primaryLanguage?.name ?? null, languageColor: r.primaryLanguage?.color ?? null, pullRequests: 0, commits: 0 };
          cur[field] += e.contributions.totalCount;
          external.set(r.nameWithOwner, cur);
        }
      };
      const all = new Map<string, NonNullable<ContributionDetail['repos']>[number]>();
      for (const e of [...(cc.pullRequestContributionsByRepository ?? []), ...(cc.commitContributionsByRepository ?? [])]) {
        const r = e.repository;
        if (!r || r.isPrivate) continue;
        const cur = all.get(r.nameWithOwner) ?? { nameWithOwner: r.nameWithOwner, stars: r.stargazerCount, language: r.primaryLanguage?.name ?? null, languageColor: r.primaryLanguage?.color ?? null, contributions: 0 };
        cur.contributions += e.contributions.totalCount;
        all.set(r.nameWithOwner, cur);
      }
      add(cc.pullRequestContributionsByRepository, 'pullRequests');
      add(cc.commitContributionsByRepository, 'commits');
      return {
        from: range.from,
        to: range.to,
        commits: cc.totalCommitContributions,
        pullRequests: cc.totalPullRequestContributions,
        issues: cc.totalIssueContributions,
        reviews: cc.totalPullRequestReviewContributions,
        restricted: cc.restrictedContributionsCount,
        reposWithCommits: cc.totalRepositoriesWithContributedCommits,
        reposWithPullRequests: cc.totalRepositoriesWithContributedPullRequests,
        reposWithIssues: cc.totalRepositoriesWithContributedIssues,
        reposWithReviews: cc.totalRepositoriesWithContributedPullRequestReviews,
        externalMergedPullRequests: data.ext?.issueCount ?? 0,
        externalRepos: [...external.values()].sort((a, b) => b.stars - a.stars).slice(0, 20),
        repos: [...all.values()].sort((a, b) => b.contributions - a.contributions).slice(0, 20)
      };
    }, 6 * 3600);
  }

  getRepository(owner: string, repo: string): Promise<RepoDetail> {
    return this.cache(`repo:${owner.toLowerCase()}/${repo.toLowerCase()}`, async () => {
      const r = await this.rest<Record<string, any>>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
      return {
        owner: r.owner?.login ?? owner,
        name: r.name,
        description: r.description ?? null,
        url: r.html_url,
        stars: r.stargazers_count ?? 0,
        forks: r.forks_count ?? 0,
        watchers: r.subscribers_count ?? r.watchers_count ?? 0,
        openIssues: r.open_issues_count ?? 0,
        language: r.language ?? null,
        license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : null,
        topics: r.topics ?? [],
        sizeKb: r.size ?? 0,
        archived: !!r.archived,
        isFork: !!r.fork,
        updatedAt: r.pushed_at ?? r.updated_at
      };
    });
  }

  /** Avatar image as base64 (cached for a day). Only GitHub's avatar host is fetched, no redirects, size-capped. */
  getAvatar(avatarUrl: string, size = 160): Promise<{ mime: string; base64: string }> {
    return this.cache(`avatar:${avatarUrl}:${size}`, async () => {
      const url = new URL(avatarUrl);
      if (url.protocol !== 'https:' || !/^([a-z0-9-]+\.)*githubusercontent\.com$/i.test(url.hostname)) throw upstream('Unexpected avatar host');
      url.searchParams.set('s', String(size));
      // 'manual' (not 'error', which Workers rejects): a redirect comes back as 3xx and is refused below
      const res = await this.request(url.toString(), { auth: false, redirect: 'manual' });
      if (!res.ok) throw upstream(`Could not load avatar (${res.status})`);
      if (Number(res.headers.get('content-length') ?? 0) > MAX_AVATAR_BYTES) throw upstream('Avatar is too large');
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > MAX_AVATAR_BYTES) throw upstream('Avatar is too large');
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { mime: res.headers.get('content-type')?.split(';')[0] ?? 'image/png', base64: btoa(bin) };
    }, 86_400);
  }

  /**
   * Star history by sampling: stargazers are listed oldest-first with timestamps, so the first entry of
   * page N says when star #(N-1)*100+1 arrived. A handful of evenly spaced pages draws the whole curve
   * (the technique star-history.com uses). GitHub only pages through the first 40k stargazers.
   */
  getStarHistory(owner: string, repo: string, samples = 8): Promise<StarHistory> {
    return this.cache(`stars:${owner.toLowerCase()}/${repo.toLowerCase()}:${samples}`, async () => {
      const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
      const info = await this.rest<Record<string, any>>(base);
      const total: number = info.stargazers_count ?? 0;
      const createdAt: string = info.created_at ?? new Date().toISOString();
      const pages = Math.min(400, Math.ceil(total / 100));
      const picks = new Set<number>();
      if (pages <= samples) for (let p = 1; p <= pages; p++) picks.add(p);
      else for (let i = 0; i < samples; i++) picks.add(Math.max(1, Math.round(1 + (i * (pages - 1)) / (samples - 1))));
      const results = await Promise.all(
        [...picks].map(async (page) => {
          const list = await this.rest<{ starred_at: string }[]>(`${base}/stargazers?per_page=100&page=${page}`, { Accept: 'application/vnd.github.star+json' }).catch(() => [] as { starred_at: string }[]);
          const out: StarPoint[] = [];
          if (!Array.isArray(list)) return out;
          if (list[0]?.starred_at) out.push({ date: list[0].starred_at, count: (page - 1) * 100 + 1 });
          if (page === pages && list.length > 1 && list[list.length - 1]?.starred_at) out.push({ date: list[list.length - 1].starred_at, count: (page - 1) * 100 + list.length });
          return out;
        })
      );
      const points = [{ date: createdAt, count: 0 }, ...results.flat(), { date: new Date().toISOString(), count: total }]
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter((p, i, all) => i === 0 || p.count >= all[i - 1].count);
      return { repo: `${info.owner?.login ?? owner}/${info.name ?? repo}`, total, createdAt, points, truncated: total > 40_000 };
    }, 12 * 3600);
  }

  /** Commit contributions per year grouped by repository language (one GraphQL call for all years). Needs a token. */
  getLanguageTrend(login: string, years: number[]): Promise<YearLanguages[]> {
    if (!this.hasToken) return Promise.reject(badRequest('Language trends need a GitHub token on the server'));
    const ys = [...new Set(years)].filter((y) => Number.isInteger(y) && y >= 2008 && y <= 2100).sort();
    return this.cache(`langtrend:${login.toLowerCase()}:${ys.join(',')}`, async () => {
      const now = new Date();
      const body = ys
        .map((y) => {
          const r = calendarYearRange(y, now);
          return `y${y}:contributionsCollection(from:"${r.from}T00:00:00Z", to:"${r.to}T23:59:59Z"){ commitContributionsByRepository(maxRepositories:25){ repository{ isPrivate primaryLanguage{name color} } contributions{totalCount} } }`;
        })
        .join('\n');
      const { user } = await this.graphql<{ user: any }>(`query($login:String!){ user(login:$login){ ${body} } }`, { login });
      if (!user) throw notFound('GitHub user not found');
      return ys.map((year) => {
        const byLang = new Map<string, { name: string; color: string | null; count: number }>();
        for (const e of user[`y${year}`]?.commitContributionsByRepository ?? []) {
          const lang = e.repository?.primaryLanguage;
          if (!lang || e.repository.isPrivate) continue;
          const cur = byLang.get(lang.name) ?? { name: lang.name, color: lang.color ?? null, count: 0 };
          cur.count += e.contributions.totalCount;
          byLang.set(lang.name, cur);
        }
        const languages = [...byLang.values()].sort((a, b) => b.count - a.count);
        return { year, languages, total: languages.reduce((a, l) => a + l.count, 0) };
      });
    }, 12 * 3600);
  }

  /** Public sponsors of the user (or accounts they sponsor). Needs a token. */
  getSupporters(login: string, mode: 'sponsors' | 'sponsoring', first = 60): Promise<{ total: number; people: Supporter[] }> {
    if (!this.hasToken) return Promise.reject(badRequest('The sponsors wall needs a GitHub token on the server'));
    return this.cache(`supporters:${login.toLowerCase()}:${mode}:${first}`, async () => {
      const field = mode === 'sponsoring' ? 'sponsoring' : 'sponsors';
      const { user } = await this.graphql<{ user: any }>(
        `query($login:String!,$n:Int!){ user(login:$login){ list:${field}(first:$n){ totalCount nodes{ __typename ... on User{ login name avatarUrl } ... on Organization{ login name avatarUrl } } } } }`,
        { login, n: first }
      );
      if (!user) throw notFound('GitHub user not found');
      const people: Supporter[] = (user.list?.nodes ?? [])
        .filter((n: any) => n?.login)
        .map((n: any) => ({ login: n.login, name: n.name ?? null, avatarUrl: n.avatarUrl, kind: n.__typename === 'Organization' ? 'org' : 'user' }));
      return { total: user.list?.totalCount ?? people.length, people };
    }, 6 * 3600);
  }

  /**
   * Author timestamps of the user's recent commits (default branches of the repos they committed to most
   * in the last year, up to 100 each). Git timestamps keep the author's own UTC offset, so the hour is
   * the author's local time. Needs a token.
   */
  getCommitTimes(login: string): Promise<string[]> {
    if (!this.hasToken) {
      // token-less: commit search returns the 100 newest commits with author-local timestamps
      return this.cache(`committimes:${login.toLowerCase()}:search`, async () => {
        const j = await this.rest<{ items?: { commit?: { author?: { date?: string } } }[] }>(
          `/search/commits?q=${encodeURIComponent(`author:${login}`)}&sort=author-date&order=desc&per_page=100`
        );
        return (j.items ?? []).map((i) => i.commit?.author?.date).filter((d): d is string => typeof d === 'string');
      }, 6 * 3600);
    }
    return this.cache(`committimes:${login.toLowerCase()}`, async () => {
      const id = await this.cache(`uid:${login.toLowerCase()}`, async () => {
        const { user } = await this.graphql<{ user: { id: string } | null }>('query($login:String!){ user(login:$login){ id } }', { login });
        if (!user) throw notFound('GitHub user not found');
        return user.id;
      }, PAST_YEAR_TTL);
      const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
      const { user } = await this.graphql<{ user: any }>(
        'query($login:String!,$id:ID!,$since:GitTimestamp!){ user(login:$login){ contributionsCollection{ commitContributionsByRepository(maxRepositories:10){ repository{ isPrivate defaultBranchRef{ target{ ... on Commit{ history(first:100, author:{id:$id}, since:$since){ nodes{ authoredDate } } } } } } } } } }',
        { login, id, since }
      );
      const times: string[] = [];
      for (const e of user?.contributionsCollection?.commitContributionsByRepository ?? []) {
        if (e.repository?.isPrivate) continue;
        for (const n of e.repository?.defaultBranchRef?.target?.history?.nodes ?? []) if (typeof n.authoredDate === 'string') times.push(n.authoredDate);
      }
      return times;
    }, 6 * 3600);
  }

  /** Side-by-side repository facts and health signals. Full detail with a token; basic REST fields without. */
  getRepoHealth(list: { owner: string; repo: string }[]): Promise<RepoHealth[]> {
    const id = list.map((r) => `${r.owner}/${r.repo}`.toLowerCase()).join(',');
    return this.cache(`repohealth:${id}:${this.hasToken ? 'g' : 'r'}`, async () => {
      if (!this.hasToken) {
        return Promise.all(
          list.map(async ({ owner, repo }): Promise<RepoHealth> => {
            const r = await this.rest<Record<string, any>>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
            return {
              nameWithOwner: r.full_name ?? `${owner}/${repo}`, description: r.description ?? null, stars: r.stargazers_count ?? 0,
              forks: r.forks_count ?? 0, watchers: r.subscribers_count ?? 0, language: r.language ?? null, languageColor: null,
              license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : null, archived: !!r.archived,
              createdAt: r.created_at ?? null, pushedAt: r.pushed_at ?? null, openIssues: null, closedIssues: null,
              openPullRequests: null, mergedPullRequests: null, releases: null, latestRelease: null, commits30d: null
            };
          })
        );
      }
      const vars: Record<string, string> = { since: new Date(Date.now() - 30 * 86_400_000).toISOString() };
      const decl = list.map((_, i) => `$o${i}:String!,$n${i}:String!`).join(',');
      const body = list
        .map(({ owner, repo }, i) => {
          vars[`o${i}`] = owner;
          vars[`n${i}`] = repo;
          return `r${i}:repository(owner:$o${i}, name:$n${i}){ nameWithOwner description stargazerCount forkCount watchers{totalCount}
            isArchived createdAt pushedAt licenseInfo{spdxId} primaryLanguage{name color}
            openIssues:issues(states:OPEN){totalCount} closedIssues:issues(states:CLOSED){totalCount}
            openPRs:pullRequests(states:OPEN){totalCount} mergedPRs:pullRequests(states:MERGED){totalCount}
            releases(first:1, orderBy:{field:CREATED_AT, direction:DESC}){ totalCount nodes{ tagName publishedAt } }
            defaultBranchRef{ target{ ... on Commit{ history(since:$since){ totalCount } } } } }`;
        })
        .join('\n');
      const data = await this.graphql<Record<string, any>>(`query($since:GitTimestamp!,${decl}){ ${body} }`, vars);
      return list.map((_, i): RepoHealth => {
        const r = data[`r${i}`];
        if (!r) throw notFound(`Repository ${list[i].owner}/${list[i].repo} not found`);
        const rel = r.releases?.nodes?.[0];
        return {
          nameWithOwner: r.nameWithOwner, description: r.description ?? null, stars: r.stargazerCount, forks: r.forkCount,
          watchers: r.watchers?.totalCount ?? 0, language: r.primaryLanguage?.name ?? null, languageColor: r.primaryLanguage?.color ?? null,
          license: r.licenseInfo?.spdxId && r.licenseInfo.spdxId !== 'NOASSERTION' ? r.licenseInfo.spdxId : null, archived: !!r.isArchived,
          createdAt: r.createdAt ?? null, pushedAt: r.pushedAt ?? null, openIssues: r.openIssues?.totalCount ?? 0,
          closedIssues: r.closedIssues?.totalCount ?? 0, openPullRequests: r.openPRs?.totalCount ?? 0, mergedPullRequests: r.mergedPRs?.totalCount ?? 0,
          releases: r.releases?.totalCount ?? 0, latestRelease: rel ? { tag: rel.tagName, date: rel.publishedAt ?? null } : null,
          commits30d: r.defaultBranchRef?.target?.history?.totalCount ?? 0
        };
      });
    }, 3 * 3600);
  }

  /** Most recently merged pull requests the user opened in other people's repositories (search API, works without a token). */
  getRecentMergedPRs(login: string, count = 5): Promise<{ title: string; repo: string; url: string; mergedAt: string | null }[]> {
    return this.cache(`recentprs:${login.toLowerCase()}:${count}`, async () => {
      const q = `author:${login} is:pr is:merged -user:${login}`;
      const j = await this.rest<{ items?: Record<string, any>[] }>(`/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${count}`);
      return (j.items ?? []).map((i) => ({
        title: String(i.title ?? '').slice(0, 140),
        repo: String(i.repository_url ?? '').replace('https://api.github.com/repos/', ''),
        url: String(i.html_url ?? ''),
        mergedAt: i.pull_request?.merged_at ?? i.closed_at ?? null
      }));
    }, 3 * 3600);
  }

  /** Live quota per token (admin only - costs one call per token). Never returns the tokens themselves. */
  async getRateLimits(): Promise<{ label: string; limit: number; remaining: number; reset: string }[]> {
    const pool = this.tokens.length ? this.tokens : [undefined];
    return Promise.all(
      pool.slice(0, 10).map(async (token, i) => {
        const res = await this.request(`${API}/rate_limit`, { auth: false, headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const core = ((await res.json().catch(() => ({}))) as any).resources?.core ?? {};
        return {
          label: token ? `token-${i + 1}` : 'anonymous',
          limit: core.limit ?? 0,
          remaining: core.remaining ?? 0,
          reset: core.reset ? new Date(core.reset * 1000).toISOString() : ''
        };
      })
    );
  }

  // ---- GraphQL ------------------------------------------------------------------------------

  private async getUserGraphQL(login: string): Promise<UserData> {
    const { user } = await this.graphql<{ user: any }>(USER_QUERY, { login });
    if (!user) throw notFound('GitHub user not found');
    const nodes: GqlRepoNode[] = [...user.repositories.nodes];

    let page = user.repositories.pageInfo;
    for (let i = 1; i < MAX_REPO_PAGES && page.hasNextPage; i++) {
      const next = await this.graphql<{ user: any }>(REPO_PAGE_QUERY, { login, after: page.endCursor });
      nodes.push(...next.user.repositories.nodes);
      page = next.user.repositories.pageInfo;
    }

    const { repos, languages, stars, forks } = aggregateRepos(nodes);
    const cc = user.contributionsCollection;
    return {
      login: user.login,
      name: user.name || user.login,
      avatarUrl: user.avatarUrl,
      bio: user.bio || null,
      createdAt: user.createdAt,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      publicRepos: user.all.totalCount,
      gists: user.gists.totalCount,
      stars,
      forks,
      pullRequests: user.pullRequests.totalCount,
      issues: user.issues.totalCount,
      commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
      reviews: cc.totalPullRequestReviewContributions,
      contributions: cc.contributionCalendar.totalContributions,
      repos,
      languages,
      source: 'graphql',
      company: user.company || null,
      location: user.location || null,
      website: user.websiteUrl || null,
      twitter: user.twitterUsername || null
    };
  }

  private async getExtendedGraphQL(login: string): Promise<UserExtended> {
    const { user } = await this.graphql<{ user: any }>(EXTENDED_QUERY, { login });
    if (!user) throw notFound('GitHub user not found');
    const cc = user.contributionsCollection;
    const pinned: PinnedRepo[] = (user.pinnedItems?.nodes ?? [])
      .filter((n: any) => n && n.name)
      .map((n: any) => ({
        name: n.name,
        owner: n.owner?.login ?? login,
        description: n.description ?? null,
        url: n.url,
        stars: n.stargazerCount ?? 0,
        forks: n.forkCount ?? 0,
        language: n.primaryLanguage?.name ?? null,
        languageColor: n.primaryLanguage?.color ?? null
      }));
    return {
      pronouns: user.pronouns || null,
      hireable: !!user.isHireable,
      status: user.status ? { emoji: user.status.emoji ?? null, message: user.status.message ?? null } : null,
      socials: (user.socialAccounts?.nodes ?? []).map((s: any) => ({ provider: String(s.provider).toLowerCase(), url: s.url, name: s.displayName ?? null })),
      pinned,
      mergedPullRequests: user.mergedPRs?.totalCount ?? 0,
      closedPullRequests: user.closedPRs?.totalCount ?? 0,
      closedIssues: user.closedIssues?.totalCount ?? 0,
      organizations: (user.organizations?.nodes ?? []).map((o: any) => ({ login: o.login, name: o.name ?? null, avatarUrl: o.avatarUrl })),
      discussionAnswers: user.repositoryDiscussionComments?.totalCount ?? 0,
      discussions: user.repositoryDiscussions?.totalCount ?? 0,
      sponsors: user.sponsors?.totalCount ?? 0,
      sponsoring: user.sponsoring?.totalCount ?? 0,
      starred: user.starredRepositories?.totalCount ?? 0,
      contributionYears: cc.contributionYears ?? [],
      reposContributedTo: user.repositoriesContributedTo?.totalCount ?? 0,
      pullRequestContributions: cc.totalPullRequestContributions ?? 0,
      issueContributions: cc.totalIssueContributions ?? 0
    };
  }

  private async getExtendedPublic(login: string): Promise<UserExtended> {
    const [pinned, merged, closed, orgs] = await Promise.all([
      this.request(`https://github.com/${encodeURIComponent(login)}`, { auth: false })
        .then(async (r) => (r.ok ? parsePinnedHtml(await r.text()) : []))
        .catch(() => [] as PinnedRepo[]),
      this.searchCount('issues', `author:${login} type:pr is:merged`),
      this.searchCount('issues', `author:${login} type:pr is:unmerged is:closed`),
      this.rest<{ login: string; avatar_url: string }[]>(`/users/${encodeURIComponent(login)}/orgs`).catch(() => [])
    ]);
    return {
      ...emptyExtended(),
      partial: true,
      pinned,
      mergedPullRequests: merged ?? 0,
      closedPullRequests: closed ?? 0,
      organizations: (Array.isArray(orgs) ? orgs : []).slice(0, 12).map((o) => ({ login: o.login, name: null, avatarUrl: o.avatar_url }))
    };
  }

  /** Language bytes of a few repositories via REST (token-less fallback for byte-based cards). */
  getLanguageBytes(owner: string, repos: string[]): Promise<LanguageStat[]> {
    return this.cache(`langbytes:${owner.toLowerCase()}:${repos.join(',').toLowerCase()}`, async () => {
      const parts = await Promise.all(
        repos.map((r) => this.rest<Record<string, number>>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(r)}/languages`).catch(() => ({} as Record<string, number>)))
      );
      const total = new Map<string, LanguageStat>();
      for (const part of parts) for (const [name, size] of Object.entries(part)) {
        const cur = total.get(name) ?? { name, color: null, size: 0, repos: 0 };
        cur.size += size;
        cur.repos += 1;
        total.set(name, cur);
      }
      return [...total.values()].sort((a, b) => b.size - a.size);
    }, 86_400);
  }

  private fetchCalendars(login: string, ranges: DateRange[]): Promise<CalendarDay[][]> {
    return this.hasToken ? this.calendarGraphQL(login, ranges) : Promise.all(ranges.map((r) => this.calendarHtml(login, r)));
  }

  private async calendarGraphQL(login: string, ranges: DateRange[]): Promise<CalendarDay[][]> {
    const vars: Record<string, string> = { login };
    const decl = ranges.map((_, i) => `$f${i}:DateTime!,$t${i}:DateTime!`).join(',');
    const body = ranges
      .map((r, i) => {
        vars[`f${i}`] = `${r.from}T00:00:00Z`;
        vars[`t${i}`] = `${r.to}T23:59:59Z`;
        return `r${i}:contributionsCollection(from:$f${i}, to:$t${i}){ ${CALENDAR_FIELDS} }`;
      })
      .join('\n');
    const { user } = await this.graphql<{ user: any }>(`query($login:String!,${decl}){ user(login:$login){ ${body} } }`, vars);
    if (!user) throw notFound('GitHub user not found');

    return ranges.map((_, i) =>
      (user[`r${i}`].contributionCalendar.weeks as any[]).flatMap((w) =>
        (w.contributionDays as any[]).map((d): CalendarDay => ({
          date: d.date,
          count: d.contributionCount,
          level: levelFromEnum(d.contributionLevel)
        }))
      )
    );
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await this.request(`${API}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    await this.assertOk(res);
    const json = (await res.json()) as { data?: T; errors?: { type?: string; message: string }[] };
    if (json.errors?.length) {
      const e = json.errors[0];
      if (e.type === 'NOT_FOUND') throw notFound('GitHub user not found');
      if (e.type === 'RATE_LIMITED') {
        if (this.lastToken) benchUntilReset(this.lastToken);
        throw rateLimited('GitHub API rate limit exceeded');
      }
      // details go to the log, not to the public error card
      console.warn(JSON.stringify({ evt: 'graphql_error', type: e.type, message: e.message.slice(0, 300) }));
      if (!json.data) throw upstream('GitHub returned an error for this request');
    }
    if (!json.data) throw upstream('Empty response from GitHub');
    return json.data;
  }

  // ---- REST / HTML fallback (no token) --------------------------------------------------------

  private async getUserRest(login: string): Promise<UserData> {
    const u = await this.rest<Record<string, any>>(`/users/${encodeURIComponent(login)}`);
    const pages = Math.min(MAX_REPO_PAGES, Math.max(1, Math.ceil((u.public_repos ?? 0) / 100)));

    const [repoPages, calendar, prs, issues, reviews, commits] = await Promise.all([
      Promise.all(
        Array.from({ length: pages }, (_, i) =>
          this.rest<any[]>(`/users/${encodeURIComponent(login)}/repos?per_page=100&page=${i + 1}&type=owner`).catch(() => [] as any[])
        )
      ),
      this.getCalendar(login).catch(() => [] as CalendarDay[]),
      this.searchCount('issues', `author:${login} type:pr`),
      this.searchCount('issues', `author:${login} type:issue`),
      this.searchCount('issues', `reviewed-by:${login} -author:${login}`),
      this.searchCount('commits', `author:${login}`)
    ]);

    const own = repoPages.flat().filter((r) => !r.fork);
    const repos: RepoSummary[] = own
      .map((r) => ({
        name: r.name,
        description: r.description ?? null,
        url: r.html_url,
        stars: r.stargazers_count ?? 0,
        forks: r.forks_count ?? 0,
        language: r.language ?? null,
        languageColor: null,
        archived: !!r.archived,
        pushedAt: r.pushed_at ?? null,
        createdAt: r.created_at ?? null
      }))
      .sort((a, b) => b.stars - a.stars || b.forks - a.forks);

    const counts = new Map<string, number>();
    for (const r of repos) if (r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
    const languages: LanguageStat[] = [...counts]
      .map(([name, n]) => ({ name, color: null, size: n, repos: n }))
      .sort((a, b) => b.size - a.size);

    return {
      login: u.login,
      name: u.name || u.login,
      avatarUrl: u.avatar_url,
      bio: u.bio || null,
      createdAt: u.created_at ?? null,
      followers: u.followers ?? 0,
      following: u.following ?? 0,
      publicRepos: u.public_repos ?? 0,
      gists: u.public_gists ?? 0,
      stars: repos.reduce((a, r) => a + r.stars, 0),
      forks: repos.reduce((a, r) => a + r.forks, 0),
      pullRequests: prs ?? 0,
      issues: issues ?? 0,
      commits: commits ?? 0, // lifetime in REST mode
      reviews: reviews ?? 0,
      contributions: calendar.reduce((a, d) => a + d.count, 0),
      repos,
      languages,
      source: 'rest',
      company: u.company || null,
      location: u.location || null,
      website: u.blog || null,
      twitter: u.twitter_username || null
    };
  }

  private async calendarHtml(login: string, r: DateRange): Promise<CalendarDay[]> {
    // The HTML endpoint only understands calendar years (`from`/`to` pick the year); with no params it
    // returns the rolling last 12 months.
    const query = r.rolling ? '' : `?from=${r.from.slice(0, 4)}-01-01&to=${r.from.slice(0, 4)}-12-31`;
    const res = await this.request(`https://github.com/users/${encodeURIComponent(login)}/contributions${query}`, { auth: false });
    if (res.status === 404) throw notFound('GitHub user not found');
    if (!res.ok) throw upstream(`Could not load contribution graph (${res.status})`);
    return parseContributionHtml(await res.text()).filter((d) => d.date <= r.to && (r.rolling || d.date >= r.from));
  }

  private async searchCount(kind: 'issues' | 'commits', q: string): Promise<number | null> {
    try {
      const res = await this.request(`${API}/search/${kind}?q=${encodeURIComponent(q)}&per_page=1`);
      if (!res.ok) return null;
      return ((await res.json()) as { total_count?: number }).total_count ?? null;
    } catch {
      return null;
    }
  }

  // ---- plumbing -----------------------------------------------------------------------------

  private async rest<T>(path: string, headers?: Record<string, string>): Promise<T> {
    const res = await this.request(`${API}${path}`, headers ? { headers } : {});
    await this.assertOk(res);
    return (await res.json()) as T;
  }

  private async assertOk(res: Response) {
    if (res.ok) return;
    if (res.status === 404) throw notFound('GitHub user or repository not found');
    const limited = res.status === 429 || res.status === 403 || res.headers.get('x-ratelimit-remaining') === '0';
    if (limited) {
      throw rateLimited(this.hasToken ? 'GitHub API rate limit exceeded' : 'GitHub API rate limit exceeded (server has no GITHUB_TOKEN configured)');
    }
    if (res.status === 401) throw upstream('GitHub rejected the configured token');
    throw upstream(`GitHub responded with ${res.status}`);
  }

  /**
   * One upstream call with failover: API calls go to the healthiest token, and on 401/403/429, 5xx or a
   * timeout they're retried (different token, jittered backoff) within the request's overall deadline.
   * Also enforces the per-request subrequest budget.
   */
  private async request(url: string, init: RequestInit & { auth?: boolean } = {}): Promise<Response> {
    const { auth = true, ...rest } = init;
    const useTokens = auth && this.pool.length > 0 && url.startsWith(API);
    const attempts = useTokens ? Math.min(3, this.pool.length + 1) : 2;
    const tried = new Set<TokenState>();
    let lastError: ApiError = upstream('GitHub did not respond in time');

    for (let i = 0; i < attempts; i++) {
      const left = this.deadline - Date.now();
      if (left < 250) break;
      if (this.subrequests >= MAX_SUBREQUESTS) throw upstream('This card needs too many GitHub requests');

      const headers = new Headers(rest.headers);
      headers.set('User-Agent', 'github-stats-api');
      if (url.startsWith(API) && !headers.has('Accept')) headers.set('Accept', 'application/vnd.github+json');
      let token: TokenState | undefined;
      if (useTokens) {
        // prefer an untried token; for 5xx/timeouts a healthy token may be retried
        token = pick(this.pool, tried) ?? pick(this.pool, new Set());
        if (!token) {
          lastError = rateLimited('All configured GitHub tokens are rate-limited right now');
          break;
        }
        tried.add(token);
        headers.set('Authorization', `Bearer ${token.token}`);
        this.lastToken = token;
      }

      this.subrequests++;
      try {
        const res = await fetch(url, { ...rest, headers, signal: AbortSignal.timeout(Math.min(PER_CALL_MS, left)) });
        if (token) observe(token, res);
        const tokenProblem = !!token && (res.status === 401 || res.status === 429 || (res.status === 403 && token.downUntil > Date.now()));
        const retryable = res.status >= 500 || tokenProblem || (!token && res.status === 429);
        if (retryable && i < attempts - 1) {
          await sleep(jitter(i));
          continue;
        }
        return res;
      } catch (e) {
        if (e instanceof ApiError) throw e;
        lastError = upstream('GitHub did not respond in time');
        if (i < attempts - 1) await sleep(jitter(i));
      }
    }
    throw lastError;
  }

  private cache<T>(key: string, load: () => Promise<T>, ttl = this.ttl): Promise<T> {
    return cached(key, { ttl, waitUntil: this.waitUntil }, load);
  }
}
