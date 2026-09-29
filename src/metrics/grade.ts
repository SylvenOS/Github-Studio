import type { ProfileMetrics } from './index';

export type GradeLevel = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C';

export interface Grade {
  level: GradeLevel;
  /** "Top N%" - lower is better, 0..100. */
  percentile: number;
}

// [median for an "average active developer", weight, curve]
// exponential: saturates smoothly; lognormal: long-tailed metrics (stars, followers)
const FACTORS: [keyof ProfileMetrics, number, number, 'exp' | 'log'][] = [
  ['commits', 250, 2, 'exp'],
  ['pullRequests', 50, 3, 'exp'],
  ['issues', 25, 1, 'exp'],
  ['reviews', 2, 1, 'exp'],
  ['stars', 50, 4, 'log'],
  ['followers', 10, 1, 'log']
];

const LEVELS: [number, GradeLevel][] = [
  [1, 'S'], [12.5, 'A+'], [25, 'A'], [37.5, 'A-'], [50, 'B+'], [62.5, 'B'], [75, 'B-'], [87.5, 'C+'], [100, 'C']
];

/** Overall developer grade from activity and reach. Deterministic and cheap; not an official GitHub metric. */
export function calculateGrade(m: ProfileMetrics): Grade {
  let total = 0;
  let weights = 0;
  for (const [key, median, weight, curve] of FACTORS) {
    const x = Number(m[key]) / median;
    total += weight * (curve === 'exp' ? 1 - 2 ** -x : x / (1 + x));
    weights += weight;
  }
  const percentile = Math.round((1 - total / weights) * 1000) / 10;
  const level = LEVELS.find(([max]) => percentile <= max)?.[1] ?? 'C';
  return { level, percentile };
}
