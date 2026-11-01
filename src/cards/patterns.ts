import { defineCard } from './types';
import { int, list, oneOf } from '../core/params';
import { WEEKDAYS, esc, fmt, shortDate } from '../core/text';
import { calendarYearRange, lastYearRange } from '../github/client';
import { analyzePatterns, type WorkPatterns } from '../metrics/patterns';
import { anim, cls, contentTop, frame, PAD } from '../svg/frame';

const STARTS = ['sun', 'mon'] as const;

interface Params {
  year: number | null;
  weekStart: (typeof STARTS)[number];
  hide: string[];
}

const STATS: { key: string; label: string; value: (w: WorkPatterns) => string }[] = [
  { key: 'active', label: 'Active days', value: (w) => `${fmt(w.activeDays)} (${Math.round(w.activeDaysPct)}%)` },
  { key: 'consistency', label: 'Weekly consistency', value: (w) => `${Math.round(w.consistencyPct)}%` },
  { key: 'average', label: 'Per active day', value: (w) => String(w.avgPerActiveDay) },
  { key: 'busiest', label: 'Busiest weekday', value: (w) => WEEKDAYS[w.busiestWeekday] },
  { key: 'weekend', label: 'Weekend share', value: (w) => `${Math.round(w.weekendPct)}%` },
  { key: 'best', label: 'Best day', value: (w) => (w.bestDay ? `${fmt(w.bestDay.count)} · ${shortDate(w.bestDay.date)}` : '-') },
  { key: 'break', label: 'Longest break', value: (w) => `${w.longestBreak} day${w.longestBreak === 1 ? '' : 's'}` }
];

export const patternsCard = defineCard<Params, WorkPatterns>({
  id: 'patterns',
  aliases: ['habits', 'work-patterns'],
  category: 'activity',
  tags: ['habits', 'productivity', 'consistency', 'weekday', 'routine', 'realistic'],
  variants: [{ label: 'Default' }, { label: 'Monday first', params: { week_start: 'mon' } }, { label: 'Essentials', params: { hide: 'best,break,average' } }],
  title: 'Work Patterns',
  description: 'How you work: active days, weekly consistency (fairer than streaks), average per active day, busiest weekday, weekend share, best day and longest break.',
  params: [
    { name: 'year', type: 'number', min: 2008, description: 'Calendar year (default: last 12 months)' },
    { name: 'week_start', type: 'enum', options: [...STARTS], default: 'sun', description: 'First day of the week in the chart' },
    { name: 'hide', type: 'list', description: `Stats to hide: ${STATS.map((s) => s.key).join(', ')}` }
  ],
  parse: (q) => ({
    year: q.year ? int(q.year, new Date().getUTCFullYear(), 2008, new Date().getUTCFullYear()) : null,
    weekStart: oneOf(q.week_start, STARTS, 'sun'),
    hide: list(q.hide)
  }),
  load: async (client, p, common) => analyzePatterns(await client.getCalendar(common.username, [p.year ? calendarYearRange(p.year) : lastYearRange()])),

  render(w, p, { theme, common, title }) {
    const header = title('Work Patterns');
    const top = contentTop(!!header);
    const width = 480;
    const animate = common.animation;
    const stats = STATS.filter((s) => !p.hide.includes(s.key));

    const rows = stats
      .map((s, i) => {
        const y = top + 14 + i * 24;
        return (
          `<g${anim(animate, i)}><text x="${PAD}" y="${y}" class="label muted" font-size="12">${esc(s.label)}</text>` +
          `<text x="${PAD + 205}" y="${y}" class="fg" font-size="13" font-weight="600" text-anchor="end">${esc(s.value(w))}</text></g>`
        );
      })
      .join('');

    // weekday chart on the right
    const order = p.weekStart === 'mon' ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    const chartX = PAD + 235;
    const chartW = width - PAD - chartX;
    const chartH = Math.max(110, stats.length * 24 - 20);
    const max = Math.max(...w.weekdayTotals, 1);
    const step = chartW / 7;
    const bw = step * 0.62;
    const bars = order
      .map((dow, i) => {
        const h = Math.max(w.weekdayTotals[dow] ? 3 : 0, (w.weekdayTotals[dow] / max) * chartH);
        const x = chartX + i * step + (step - bw) / 2;
        const busiest = dow === w.busiestWeekday && w.total > 0;
        return (
          `<rect x="${x.toFixed(1)}" y="${(top + chartH - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"${cls('ser', animate, i)}${busiest ? '' : ' fill-opacity=".45"'}/>` +
          `<text x="${(x + bw / 2).toFixed(1)}" y="${top + chartH + 16}" text-anchor="middle" class="label muted" font-size="10">${WEEKDAYS[dow].slice(0, 2)}</text>`
        );
      })
      .join('');

    return frame(rows + bars, {
      width,
      height: Math.max(top + stats.length * 24 + 12, top + chartH + 30),
      theme,
      title: header,
      subtitle: `${fmt(w.total)} · @${common.username}`,
      label: `Work patterns of ${common.username}: ${Math.round(w.consistencyPct)}% weekly consistency, busiest on ${WEEKDAYS[w.busiestWeekday]}`
    });
  }
});
