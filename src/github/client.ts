import { cached } from '../core/cache';
import { notFound, rateLimited, upstream } from '../core/errors';
import {
  aggregateRepos,
  levelFromEnum,
  mergeCalendars,
  parseContributionHtml,
  type GqlRepoNode
} from './parse';
import type { CalendarDay, DateRange, RepoDetail, RepoSummary, UserData, LanguageStat } from './types';

export * from './types';

const API = 'https://api.github.com';
const TIMEOUT_MS = 8000;
const MAX_REPO_PAGES = 3; // 300 repositories

export interface ClientOptions {
  tokens?: string[];
  /** Cache lifetime for upstream data, seconds. */
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
const REPO_NODES = `nodes{ name description url stargazerCount forkCount isArchived pushedAt
  primaryLanguage{name color}
  languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{name color} } } }
  pageInfo{ hasNextPage endCursor }`;

const USER_QUERY = `query($login:String!){ user(login:$login){
  login name avatarUrl bio createdAt
  followers{totalCount} following{totalCount} gists(privacy:PUBLIC){totalCount}
  all:repositories(ownerAffiliations:OWNER, privacy:PUBLIC){totalCount}
  pullRequests{totalCount} issues{totalCount}
  contributionsCollection{ totalCommitContributions totalPullRequestReviewContributions restrictedContributionsCount
    contributionCalendar{totalContributions} }
  repositories(${REPO_ARGS}){ ${REPO_NODES} }
}}`;

const REPO_PAGE_QUERY = `query($login:String!,$after:String){ user(login:$login){
  repositories(${REPO_ARGS}, after:$after){ ${REPO_NODES} } }}`;

const CALENDAR_FIELDS = 'contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount contributionLevel } } }';

export class GitHubClient {
  private readonly tokens: string[];
  private readonly ttl: number;
  private readonly waitUntil?: (p: Promise<unknown>) => void;

  constructor(opts: ClientOptions = {}) {
    this.tokens = (opts.tokens ?? []).filter(Boolean);
    this.ttl = opts.ttl ?? 1800;
    this.waitUntil = opts.waitUntil;
  }

  get hasToken() {
    return this.tokens.length > 0;
  }

  // ---- public API ---------------------------------------------------------------------------

  getUser(login: string): Promise<UserData> {
    const mode = this.hasToken ? 'gql' : 'rest';
    return this.cache(`user:${login.toLowerCase()}:${mode}`, () =>
      this.hasToken ? this.getUserGraphQL(login) : this.getUserRest(login)
    );
  }

  /** Daily contributions across one or more date ranges, merged and sorted. */
  async getCalendar(login: string, ranges: DateRange[] = [lastYearRange()]): Promise<CalendarDay[]> {
    const parts = await Promise.all(
      ranges.map((r) => this.cache(`cal:${login.toLowerCase()}:${r.from}:${r.to}:${this.hasToken ? 'g' : 'h'}`, () =>
        this.hasToken ? this.calendarGraphQL(login, [r]).then((p) => p[0]) : this.calendarHtml(login, r)
      ))
    );
    return mergeCalendars(parts);
  }

  getRepository(owner: string, repo: string): Promise<RepoDetail> {
    return this.cache(`repo:${owner.toLowerCase()}/${repo.toLowerCase()}`, async () => {
      const r = await this.rest<Record<string, any>>(`/repos/${owner}/${repo}`);
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

  /** Avatar image as base64 (cached). Only GitHub's avatar hosts are fetched. */
  getAvatar(avatarUrl: string, size = 160): Promise<{ mime: string; base64: string }> {
    return this.cache(`avatar:${avatarUrl}:${size}`, async () => {
      const url = new URL(avatarUrl);
      if (url.protocol !== 'https:' || !/(^|.)githubusercontent.com$/.test(url.hostname)) throw upstream('Unexpected avatar host');
      url.searchParams.set('s', String(size));
      const res = await this.request(url.toString(), { auth: false });
      if (!res.ok) throw upstream(`Could not load avatar (${res.status})`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { mime: res.headers.get('content-type')?.split(';')[0] ?? 'image/png', base64: btoa(bin) };
    });
  }

  /** Remaining API quota for each configured token (never returns the tokens themselves). */
  async getRateLimits(): Promise<{ label: string; limit: number; remaining: number; reset: string }[]> {
    const pool = this.tokens.length ? this.tokens : [undefined];
    return Promise.all(
      pool.map(async (token, i) => {
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
      source: 'graphql'
    };
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
      if (e.type === 'RATE_LIMITED') throw rateLimited('GitHub API rate limit exceeded');
      if (!json.data) throw upstream(`GitHub GraphQL error: ${e.message}`);
    }
    if (!json.data) throw upstream('Empty response from GitHub');
    return json.data;
  }

  // ---- REST / HTML fallback (no token) --------------------------------------------------------

  private async getUserRest(login: string): Promise<UserData> {
    const u = await this.rest<Record<string, any>>(`/users/${login}`);
    const pages = Math.min(MAX_REPO_PAGES, Math.max(1, Math.ceil((u.public_repos ?? 0) / 100)));

    const [repoPages, calendar, prs, issues, reviews, commits] = await Promise.all([
      Promise.all(
        Array.from({ length: pages }, (_, i) =>
          this.rest<any[]>(`/users/${login}/repos?per_page=100&page=${i + 1}&type=owner`).catch(() => [] as any[])
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
        pushedAt: r.pushed_at ?? null
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
      source: 'rest'
    };
  }

  private async calendarHtml(login: string, r: DateRange): Promise<CalendarDay[]> {
    // The HTML endpoint only understands calendar years (`from`/`to` pick the year); with no params it
    // returns the rolling last 12 months.
    const query = r.rolling ? '' : `?from=${r.from.slice(0, 4)}-01-01&to=${r.from.slice(0, 4)}-12-31`;
    const res = await this.request(`https://github.com/users/${login}/contributions${query}`, { auth: false });
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

  private async rest<T>(path: string): Promise<T> {
    const res = await this.request(`${API}${path}`);
    await this.assertOk(res);
    return (await res.json()) as T;
  }

  private async assertOk(res: Response) {
    if (res.ok) return;
    if (res.status === 404) throw notFound('GitHub user or repository not found');
    const limited = res.status === 429 || res.headers.get('x-ratelimit-remaining') === '0';
    if (limited) {
      throw rateLimited(
        this.hasToken ? 'GitHub API rate limit exceeded' : 'GitHub API rate limit exceeded (server has no GITHUB_TOKEN configured)'
      );
    }
    if (res.status === 401) throw upstream('GitHub rejected the configured token');
    throw upstream(`GitHub responded with ${res.status}`);
  }

  private async request(url: string, init: RequestInit & { auth?: boolean } = {}): Promise<Response> {
    const { auth = true, ...rest } = init;
    const headers = new Headers(rest.headers);
    headers.set('User-Agent', 'github-stats-api');
    if (url.startsWith(API)) headers.set('Accept', 'application/vnd.github+json');
    if (auth && this.tokens.length) headers.set('Authorization', `Bearer ${this.tokens[Math.floor(Math.random() * this.tokens.length)]}`);
    try {
      return await fetch(url, { ...rest, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw upstream('GitHub did not respond in time');
    }
  }

  private cache<T>(key: string, load: () => Promise<T>): Promise<T> {
    return cached(key, { ttl: this.ttl, waitUntil: this.waitUntil }, load);
  }
}
