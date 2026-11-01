export interface RepoSummary {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  languageColor: string | null;
  archived: boolean;
  pushedAt: string | null;
}

export interface LanguageStat {
  name: string;
  color: string | null;
  /** Bytes of code when known (GraphQL); number of repositories in REST fallback mode. */
  size: number;
  /** Repositories whose primary language this is. */
  repos: number;
}

export interface UserData {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string | null;
  createdAt: string | null;
  followers: number;
  following: number;
  /** Public repositories owned by the user, forks included. */
  publicRepos: number;
  gists: number;
  /** Sum over the user's own non-fork repositories. */
  stars: number;
  forks: number;
  /** Lifetime authored pull requests / issues. */
  pullRequests: number;
  issues: number;
  /** Activity over the last 12 months. */
  commits: number;
  reviews: number;
  contributions: number;
  /** Own non-fork repositories, most-starred first. */
  repos: RepoSummary[];
  /** Sorted by `size`, descending. */
  languages: LanguageStat[];
  /** `graphql` = full data; `rest` = token-less fallback with reduced accuracy. */
  source: 'graphql' | 'rest';
  company: string | null;
  location: string | null;
  website: string | null;
  twitter: string | null;
}

/** Second-tier data, fetched only by cards that need it (profile, impact, pinned, trophies, grade). */
export interface UserExtended {
  pronouns: string | null;
  hireable: boolean;
  status: { emoji: string | null; message: string | null } | null;
  socials: { provider: string; url: string; name: string | null }[];
  /** Pinned repositories (may include org repos). */
  pinned: PinnedRepo[];
  /** Lifetime pull requests by state. */
  mergedPullRequests: number;
  closedPullRequests: number;
  closedIssues: number;
  organizations: { login: string; name: string | null; avatarUrl: string }[];
  discussionAnswers: number;
  discussions: number;
  sponsors: number;
  sponsoring: number;
  starred: number;
  /** Years with contributions, newest first. */
  contributionYears: number[];
  /** Repositories (not owned by the user) contributed to in roughly the last year. */
  reposContributedTo: number;
  /** Last 12 months. */
  pullRequestContributions: number;
  issueContributions: number;
}

export interface PinnedRepo {
  name: string;
  owner: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  languageColor: string | null;
}

/** Contribution breakdown for a time window, including work in other people's repositories. */
export interface ContributionDetail {
  from: string;
  to: string;
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  restricted: number;
  reposWithCommits: number;
  reposWithPullRequests: number;
  reposWithIssues: number;
  reposWithReviews: number;
  /** Pull requests merged into repositories the user doesn't own (lifetime, via search). */
  externalMergedPullRequests: number;
  /** Repositories outside the user's account they opened PRs in during the window, most-starred first. */
  externalRepos: { nameWithOwner: string; owner: string; stars: number; language: string | null; languageColor: string | null; pullRequests: number; commits: number }[];
}

export interface CalendarDay {
  date: string;
  count: number;
  /** 0 (none) .. 4 (most) */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
  /** The rolling last-12-months window (as opposed to a calendar year). */
  rolling?: boolean;
}

export interface RepoDetail {
  owner: string;
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  language: string | null;
  license: string | null;
  topics: string[];
  sizeKb: number;
  archived: boolean;
  isFork: boolean;
  updatedAt: string;
}
