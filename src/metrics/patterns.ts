import type { CalendarDay } from '../github/types';

export interface WorkPatterns {
  totalDays: number;
  activeDays: number;
  /** Share of days with at least one contribution, 0-100. */
  activeDaysPct: number;
  /** Share of weeks with at least one contribution, 0-100 - fairer than streaks (one day off doesn't reset it). */
  consistencyPct: number;
  /** Average contributions on the days the user was active. */
  avgPerActiveDay: number;
  /** Totals per weekday, Sunday first. */
  weekdayTotals: number[];
  /** 0 = Sunday. */
  busiestWeekday: number;
  /** Share of contributions made on Saturday/Sunday, 0-100. */
  weekendPct: number;
  bestDay: { date: string; count: number } | null;
  /** "YYYY-MM" with the most contributions. */
  bestMonth: { month: string; count: number } | null;
  /** Longest run of days without contributions. */
  longestBreak: number;
  total: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Work-pattern statistics from a contribution calendar (no extra API calls). */
export function analyzePatterns(days: CalendarDay[]): WorkPatterns {
  const weekdayTotals = new Array(7).fill(0);
  const months = new Map<string, number>();
  const weeks = new Map<string, boolean>();
  let active = 0;
  let total = 0;
  let weekend = 0;
  let best: { date: string; count: number } | null = null;
  let gap = 0;
  let longestBreak = 0;

  for (const d of days) {
    const date = new Date(`${d.date}T00:00:00Z`);
    const dow = date.getUTCDay();
    total += d.count;
    weekdayTotals[dow] += d.count;
    if (dow === 0 || dow === 6) weekend += d.count;
    months.set(d.date.slice(0, 7), (months.get(d.date.slice(0, 7)) ?? 0) + d.count);
    // ISO-ish week bucket: the Sunday that starts the week
    const weekKey = new Date(date.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
    weeks.set(weekKey, (weeks.get(weekKey) ?? false) || d.count > 0);
    if (d.count > 0) {
      active++;
      gap = 0;
      if (!best || d.count > best.count) best = { date: d.date, count: d.count };
    } else {
      gap++;
      longestBreak = Math.max(longestBreak, gap);
    }
  }

  const activeWeeks = [...weeks.values()].filter(Boolean).length;
  let bestMonth: WorkPatterns['bestMonth'] = null;
  for (const [month, count] of months) if (!bestMonth || count > bestMonth.count) bestMonth = { month, count };

  return {
    totalDays: days.length,
    activeDays: active,
    activeDaysPct: days.length ? round1((active / days.length) * 100) : 0,
    consistencyPct: weeks.size ? round1((activeWeeks / weeks.size) * 100) : 0,
    avgPerActiveDay: active ? round1(total / active) : 0,
    weekdayTotals,
    busiestWeekday: weekdayTotals.indexOf(Math.max(...weekdayTotals)),
    weekendPct: total ? round1((weekend / total) * 100) : 0,
    bestDay: best,
    bestMonth: bestMonth && bestMonth.count > 0 ? bestMonth : null,
    longestBreak,
    total
  };
}
