import type { CalendarDay } from '../github/types';

export interface StreakRange {
  length: number;
  start: string | null;
  end: string | null;
}

export interface StreakStats {
  total: number;
  current: StreakRange;
  longest: StreakRange;
  firstDate: string | null;
}

const EMPTY: StreakRange = { length: 0, start: null, end: null };

/**
 * Streaks over a chronologically sorted list of days.
 * Today may still be empty without breaking the current streak (the day isn't over yet).
 */
export function computeStreaks(days: CalendarDay[]): StreakStats {
  let total = 0;
  let longest: StreakRange = EMPTY;
  let run: StreakRange = EMPTY;

  for (const d of days) {
    total += d.count;
    if (d.count > 0) {
      run = run.length ? { ...run, length: run.length + 1, end: d.date } : { length: 1, start: d.date, end: d.date };
      if (run.length > longest.length) longest = run;
    } else {
      run = EMPTY;
    }
  }

  let current: StreakRange = EMPTY;
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  for (; i >= 0 && days[i].count > 0; i--) {
    current = current.length
      ? { length: current.length + 1, start: days[i].date, end: current.end }
      : { length: 1, start: days[i].date, end: days[i].date };
  }

  return { total, current, longest, firstDate: days[0]?.date ?? null };
}
