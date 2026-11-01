import type { ProfileMetrics } from '../metrics';

export type TrophyRank = 'SSS+' | 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type TrophyType =
  | 'commits' | 'prs' | 'contributions' | 'repos' | 'stars' | 'followers' | 'issues' | 'reviews' | 'years'
  | 'external' | 'collaborations' | 'orgs' | 'answers' | 'consistency' | 'sponsors';

export interface Trophy {
  id: string;
  type: TrophyType;
  title: string;
  description: string;
  rank: TrophyRank;
  /** 1 (E) .. 9 (SSS+) */
  level: number;
  value: number;
  /** Threshold for the next rank, or null at the top. */
  next: number | null;
  /** 0..1 progress from this rank's threshold to the next; 1 at the top. */
  progress: number;
  /** Shown, but not counted towards the overall rank. */
  vanity?: boolean;
}

export const RANKS: TrophyRank[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'SSS+'];

/** Rank = 1 + number of thresholds reached. Thresholds are ascending: [D, C, B, A, S, SS, SSS, SSS+]. */
export function determineRank(value: number, thresholds: number[]): TrophyRank {
  return RANKS[thresholds.filter((t) => value >= t).length];
}

export function rankProgress(value: number, thresholds: number[]) {
  const reached = thresholds.filter((t) => value >= t).length;
  const next = thresholds[reached] ?? null;
  const floor = reached === 0 ? 0 : thresholds[reached - 1];
  return { level: reached + 1, next, progress: next === null ? 1 : Math.min(1, Math.max(0, (value - floor) / (next - floor))) };
}

interface TrophyDef {
  id: string;
  type: TrophyType;
  title: string;
  description: string;
  /** undefined = the data isn't available (e.g. no token) and the trophy is left out. */
  value: (m: ProfileMetrics) => number | undefined;
  thresholds: number[];
  /** Excluded from the overall rank (rewards seniority or volume rather than impact). */
  vanity?: boolean;
}

/** Add an entry to introduce a new trophy. */
const TROPHIES: TrophyDef[] = [
  { id: 'commits', type: 'commits', title: 'Commit Machine', description: 'Commits', value: (m) => m.commits, thresholds: [10, 100, 500, 1000, 2000, 5000, 10000, 20000] },
  { id: 'prs', type: 'prs', title: 'PR Creator', description: 'Pull requests opened', value: (m) => m.pullRequests, thresholds: [1, 10, 50, 100, 250, 500, 1000, 2000] },
  { id: 'contributions', type: 'contributions', title: 'Contributor', description: 'Contributions in the last year', value: (m) => m.contributions, thresholds: [50, 200, 500, 1000, 2000, 4000, 8000, 10000] },
  { id: 'repos', type: 'repos', title: 'Repository Builder', description: 'Public repositories', value: (m) => m.repositories, thresholds: [1, 5, 10, 25, 50, 100, 200, 500], vanity: true },
  { id: 'stars', type: 'stars', title: 'Stargazer', description: 'Stars earned across repositories', value: (m) => m.stars, thresholds: [10, 50, 100, 500, 1000, 5000, 10000, 50000] },
  { id: 'followers', type: 'followers', title: 'Influencer', description: 'GitHub followers', value: (m) => m.followers, thresholds: [5, 20, 50, 100, 500, 1000, 5000, 10000] },
  { id: 'issues', type: 'issues', title: 'Bug Hunter', description: 'Issues opened', value: (m) => m.issues, thresholds: [1, 10, 25, 50, 100, 250, 500, 1000] },
  { id: 'reviews', type: 'reviews', title: 'Code Reviewer', description: 'Pull request reviews', value: (m) => m.reviews, thresholds: [1, 10, 50, 100, 250, 500, 1000, 2000] },
  { id: 'years', type: 'years', title: 'Veteran', description: 'Years on GitHub', value: (m) => m.accountAgeYears, thresholds: [1, 2, 3, 5, 7, 10, 13, 16], vanity: true },
  // realistic impact (need the extended data; left out when unavailable)
  { id: 'external', type: 'external', title: 'Open Sourcerer', description: "Pull requests merged into other people's repositories", value: (m) => m.externalMergedPRs, thresholds: [1, 5, 15, 40, 100, 250, 500, 1000] },
  { id: 'collaborations', type: 'collaborations', title: 'Collaborator', description: 'Repositories contributed to (last year)', value: (m) => m.reposContributedTo, thresholds: [1, 3, 6, 10, 20, 35, 60, 100] },
  { id: 'consistency', type: 'consistency', title: 'Consistent', description: 'Share of weeks with contributions (last year)', value: (m) => m.consistency, thresholds: [10, 25, 40, 55, 70, 80, 90, 97] },
  { id: 'answers', type: 'answers', title: 'Answerer', description: 'Accepted discussion answers', value: (m) => m.discussionAnswers, thresholds: [1, 3, 10, 25, 50, 100, 250, 500] },
  { id: 'orgs', type: 'orgs', title: 'Team Player', description: 'Public organization memberships', value: (m) => m.organizations, thresholds: [1, 2, 3, 4, 6, 8, 10, 12], vanity: true },
  { id: 'sponsors', type: 'sponsors', title: 'Sponsored', description: 'GitHub Sponsors supporters', value: (m) => m.sponsors, thresholds: [1, 3, 10, 25, 50, 100, 250, 500] }
];

export const trophyIds = TROPHIES.map((t) => t.id);

export function calculateTrophies(metrics: ProfileMetrics): Trophy[] {
  const out: Trophy[] = [];
  for (const { value, thresholds, vanity, ...t } of TROPHIES) {
    const v = value(metrics);
    if (v === undefined || !Number.isFinite(v)) continue;
    out.push({ ...t, value: v, rank: determineRank(v, thresholds), ...rankProgress(v, thresholds), ...(vanity ? { vanity: true } : {}) });
  }
  return out;
}

/** Average level across trophies, as a rank. */
export function overallRank(trophies: Trophy[]): { rank: TrophyRank; level: number } {
  // seniority and volume trophies are shown but don't count towards the overall rank
  const counted = trophies.filter((t) => !t.vanity);
  if (!counted.length) return { rank: 'E', level: 1 };
  const level = Math.round(counted.reduce((a, t) => a + t.level, 0) / counted.length);
  return { rank: RANKS[level - 1], level };
}
