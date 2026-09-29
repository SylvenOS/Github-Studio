import type { UserData } from '../github/client';

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
