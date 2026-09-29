import { GitHubProfile } from '../github/client';

export interface ProfileMetrics {
  username: string;
  repositories: number;
  stars: number;
  forks: number;
  followers: number;
  topLanguage: string;
  pullRequests: number;
  commits: number;
  contributions: number;
  issues: number;
  reviews: number;
}


export function calculateProfileMetrics(profile: GitHubProfile, repos: any[] = []): ProfileMetrics {
  return {
    username: profile.username,
    repositories: profile.publicRepositories,
    stars: repos.reduce((acc, repo) => acc + repo.stars, 0) || 184, // mock data
    forks: repos.reduce((acc, repo) => acc + repo.forks, 0) || 51,
    followers: profile.followers,
    topLanguage: "TypeScript",
    pullRequests: profile.pullRequests,
    commits: profile.commits,
    contributions: profile.contributions,
    issues: profile.issues,
    reviews: profile.reviews
  };
}
