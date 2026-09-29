import type { ProfileMetrics } from '../metrics';

export type TrophyRank = 'SSS+' | 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type TrophyType = 'commits' | 'prs' | 'contributions' | 'repos' | 'stars' | 'followers' | 'issues' | 'reviews' | 'years';

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
  value: (m: ProfileMetrics) => number;
  thresholds: number[];
}

/** Add an entry to introduce a new trophy. */
const TROPHIES: TrophyDef[] = [
  { id: 'commits', type: 'commits', title: 'Commit Machine', description: 'Commits', value: (m) => m.commits, thresholds: [10, 100, 500, 1000, 2000, 5000, 10000, 20000] },
  { id: 'prs', type: 'prs', title: 'PR Creator', description: 'Pull requests opened', value: (m) => m.pullRequests, thresholds: [1, 10, 50, 100, 250, 500, 1000, 2000] },
  { id: 'contributions', type: 'contributions', title: 'Contributor', description: 'Contributions in the last year', value: (m) => m.contributions, thresholds: [50, 200, 500, 1000, 2000, 4000, 8000, 10000] },
  { id: 'repos', type: 'repos', title: 'Repository Builder', description: 'Public repositories', value: (m) => m.repositories, thresholds: [1, 5, 10, 25, 50, 100, 200, 500] },
  { id: 'stars', type: 'stars', title: 'Stargazer', description: 'Stars earned across repositories', value: (m) => m.stars, thresholds: [10, 50, 100, 500, 1000, 5000, 10000, 50000] },
  { id: 'followers', type: 'followers', title: 'Influencer', description: 'GitHub followers', value: (m) => m.followers, thresholds: [5, 20, 50, 100, 500, 1000, 5000, 10000] },
  { id: 'issues', type: 'issues', title: 'Bug Hunter', description: 'Issues opened', value: (m) => m.issues, thresholds: [1, 10, 25, 50, 100, 250, 500, 1000] },
  { id: 'reviews', type: 'reviews', title: 'Code Reviewer', description: 'Pull request reviews', value: (m) => m.reviews, thresholds: [1, 10, 50, 100, 250, 500, 1000, 2000] },
  { id: 'years', type: 'years', title: 'Veteran', description: 'Years on GitHub', value: (m) => m.accountAgeYears, thresholds: [1, 2, 3, 5, 7, 10, 13, 16] }
];

export const trophyIds = TROPHIES.map((t) => t.id);

export function calculateTrophies(metrics: ProfileMetrics): Trophy[] {
  return TROPHIES.map(({ value, thresholds, ...t }) => {
    const v = value(metrics);
    return { ...t, value: v, rank: determineRank(v, thresholds), ...rankProgress(v, thresholds) };
  });
}

/** Average level across trophies, as a rank. */
export function overallRank(trophies: Trophy[]): { rank: TrophyRank; level: number } {
  if (!trophies.length) return { rank: 'E', level: 1 };
  const level = Math.round(trophies.reduce((a, t) => a + t.level, 0) / trophies.length);
  return { rank: RANKS[level - 1], level };
}
