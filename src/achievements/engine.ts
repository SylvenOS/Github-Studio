import type { ProfileMetrics } from '../metrics';

export type TrophyRank = 'SSS+' | 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type TrophyType = 'commits' | 'prs' | 'contributions' | 'repos' | 'stars' | 'followers' | 'issues' | 'reviews' | 'years';

export interface Trophy {
  id: string;
  type: TrophyType;
  title: string;
  description: string;
  rank: TrophyRank;
  value: number;
}

const RANKS: TrophyRank[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'SSS+'];

/** Rank = 1 + number of thresholds reached. Thresholds are ascending: [D, C, B, A, S, SS, SSS, SSS+]. */
export function determineRank(value: number, thresholds: number[]): TrophyRank {
  return RANKS[thresholds.filter((t) => value >= t).length];
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
  { id: 'contributions', type: 'contributions', title: 'Open Source Contributor', description: 'Contributions in the last year', value: (m) => m.contributions, thresholds: [50, 200, 500, 1000, 2000, 4000, 8000, 10000] },
  { id: 'repos', type: 'repos', title: 'Repository Builder', description: 'Public repositories', value: (m) => m.repositories, thresholds: [1, 5, 10, 25, 50, 100, 200, 500] },
  { id: 'stars', type: 'stars', title: 'Stargazer', description: 'Stars earned across repositories', value: (m) => m.stars, thresholds: [10, 50, 100, 500, 1000, 5000, 10000, 50000] },
  { id: 'followers', type: 'followers', title: 'Influencer', description: 'GitHub followers', value: (m) => m.followers, thresholds: [5, 20, 50, 100, 500, 1000, 5000, 10000] },
  { id: 'issues', type: 'issues', title: 'Bug Hunter', description: 'Issues opened', value: (m) => m.issues, thresholds: [1, 10, 25, 50, 100, 250, 500, 1000] },
  { id: 'reviews', type: 'reviews', title: 'Code Reviewer', description: 'Pull request reviews', value: (m) => m.reviews, thresholds: [1, 10, 50, 100, 250, 500, 1000, 2000] },
  { id: 'years', type: 'years', title: 'Veteran', description: 'Years on GitHub', value: (m) => m.accountAgeYears, thresholds: [1, 2, 3, 5, 7, 10, 13, 16] }
];

export const trophyIds = TROPHIES.map((t) => t.id);

export function calculateTrophies(metrics: ProfileMetrics): Trophy[] {
  return TROPHIES.map(({ value, thresholds, ...t }) => ({ ...t, value: value(metrics), rank: determineRank(value(metrics), thresholds) }));
}
