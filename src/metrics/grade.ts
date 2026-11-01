import type { ProfileMetrics } from './index';

export type GradeLevel = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C';

export interface Grade {
  level: GradeLevel;
  /** "Top N%" - lower is better, 0..100. */
  percentile: number;
}

type Curve = 'exp' | 'log' | 'linear';

/**
 * Activity score v2. Deliberately built from stats that mean the same thing with and without a GitHub
 * token (12-month contributions instead of commit counts, which are lifetime in REST mode) and that
 * reward real collaboration - merged PRs in other people's repos, repos contributed to, reviews, steady
 * weekly activity - over raw volume. Factors that couldn't be loaded are skipped and the weights
 * renormalise, so a missing token lowers precision, not the score.
 *
 * [field, median for an "average active developer", weight, curve]
 */
const FACTORS: [keyof ProfileMetrics, number, number, Curve][] = [
  ['contributions', 300, 2, 'exp'],
  ['externalMergedPRs', 5, 3, 'exp'],
  ['reposContributedTo', 5, 2, 'exp'],
  ['consistency', 100, 2, 'linear'],
  ['reviews', 10, 1, 'exp'],
  ['stars', 50, 2, 'log'],
  ['followers', 20, 0.5, 'log']
];

const LEVELS: [number, GradeLevel][] = [
  [1, 'S'], [12.5, 'A+'], [25, 'A'], [37.5, 'A-'], [50, 'B+'], [62.5, 'B'], [75, 'B-'], [87.5, 'C+'], [100, 'C']
];

const curve = (x: number, c: Curve) => (c === 'exp' ? 1 - 2 ** -x : c === 'log' ? x / (1 + x) : Math.min(1, x));

/** Overall activity score. Deterministic and cheap; not an official GitHub metric and not a measure of code quality. */
export function calculateGrade(m: ProfileMetrics): Grade {
  let total = 0;
  let weights = 0;
  for (const [key, median, weight, c] of FACTORS) {
    const raw = m[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    total += weight * curve(raw / median, c);
    weights += weight;
  }
  const percentile = weights ? Math.round((1 - total / weights) * 1000) / 10 : 100;
  const level = LEVELS.find(([max]) => percentile <= max)?.[1] ?? 'C';
  return { level, percentile };
}
