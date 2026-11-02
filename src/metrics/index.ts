import type { CalendarDay, ContributionDetail, GitHubClient, UserData, UserExtended } from '../github/client';
import { lastYearRange } from '../github/client';
import { analyzePatterns } from './patterns';

export interface ProfileMetrics {
  username: string;
  name: string;
  repositories: number;
  stars: number;
  forks: number;
  followers: number;
  following: number;
  gists: number;
  topLanguage: string | null;
  pullRequests: number;
  /** Last 12 months with a token (GraphQL); lifetime in token-less REST mode. */
  commits: number;
  /** Last 12 months. */
  contributions: number;
  issues: number;
  reviews: number;
  accountAgeYears: number;

  // ---- realistic-impact extras (present when the insights were loaded, see loadInsights) ----
  /** PRs merged into repositories the user doesn't own (lifetime). */
  externalMergedPRs?: number;
  /** Repositories outside the user's account contributed to (≈ last year). */
  reposContributedTo?: number;
  organizations?: number;
  discussionAnswers?: number;
  sponsors?: number;
  /** Share of weeks with a contribution over the last year, 0-100. */
  consistency?: number;
  /** merged / (merged + closed-unmerged), 0-100. */
  mergeRate?: number;
}

export function calculateProfileMetrics(user: UserData, now = new Date()): ProfileMetrics {
  const created = user.createdAt ? new Date(user.createdAt).getTime() : NaN;
  return {
    username: user.login,
    name: user.name,
    repositories: user.publicRepos,
    stars: user.stars,
    forks: user.forks,
    followers: user.followers,
    following: user.following,
    gists: user.gists,
    topLanguage: user.languages[0]?.name ?? null,
    pullRequests: user.pullRequests,
    commits: user.commits,
    contributions: user.contributions,
    issues: user.issues,
    reviews: user.reviews,
    accountAgeYears: Number.isFinite(created) ? Math.floor((now.getTime() - created) / (365.25 * 86_400_000)) : 0
  };
}

/** Adds the realistic-impact fields. Values that couldn't be loaded (e.g. no token) are left undefined, not zero. */
export function withExtras(
  m: ProfileMetrics,
  x: { extended?: UserExtended; contributions?: ContributionDetail; calendar?: CalendarDay[]; hasToken?: boolean }
): ProfileMetrics {
  const out = { ...m };
  // external merged PRs come from search, which works with and without a token
  if (x.contributions) out.externalMergedPRs = x.contributions.externalMergedPullRequests;
  if (x.extended) {
    // public data (also collected without a token)
    out.organizations = x.extended.organizations.length;
    const decided = x.extended.mergedPullRequests + x.extended.closedPullRequests;
    if (decided > 0) out.mergeRate = Math.round((x.extended.mergedPullRequests / decided) * 1000) / 10;
    // token-only data
    if (x.hasToken !== false && !x.extended.partial) {
      out.reposContributedTo = x.extended.reposContributedTo;
      out.discussionAnswers = x.extended.discussionAnswers;
      out.sponsors = x.extended.sponsors;
    }
  }
  if (x.calendar?.length) out.consistency = analyzePatterns(x.calendar).consistencyPct;
  return out;
}

/**
 * Everything the realistic metrics need, loaded in parallel. Each part is cached and shared with other
 * cards (profile, heatmap, impact), so this rarely costs more than one extra GitHub call.
 */
export async function loadInsights(client: GitHubClient, login: string) {
  const [user, extended, contributions, calendar] = await Promise.all([
    client.getUser(login),
    client.getUserExtended(login).catch(() => undefined),
    client.getContributions(login).catch(() => undefined),
    client.getCalendar(login, [lastYearRange()]).catch(() => undefined)
  ]);
  const metrics = withExtras(calculateProfileMetrics(user), { extended, contributions, calendar, hasToken: client.hasToken });
  return { user, extended, contributions, calendar, metrics };
}
