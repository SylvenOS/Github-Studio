import { defineCard } from './types';
import { bool, int, num, oneOf } from '../core/params';
import { MONTHS, WEEKDAYS, compact, fmt } from '../core/text';
import { calendarYearRange, lastYearRange, type CalendarDay } from '../github/client';
import { anim, cls, contentTop, frame, messageCard, PAD } from '../svg/frame';

const BY = ['month', 'week', 'weekday'] as const;
const STYLES = ['bar', 'area', 'line'] as const;

interface Params {
  by: (typeof BY)[number];
  style: (typeof STYLES)[number];
  year: number | null;
  barRadius: number;
  lineWidth: number;
  grid: boolean;
}

export interface Bucket {
  label: string;
  value: number;
}

/** Groups days into months (chronological), the last 26 weeks, or weekday totals. */
export function bucketize(days: CalendarDay[], by: Params['by']): Bucket[] {
  if (by === 'weekday') {
    const totals = new Array(7).fill(0);
    for (const d of days) totals[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += d.count;
    return WEEKDAYS.map((label, i) => ({ label, value: totals[i] }));
  }
  if (by === 'week') {
    const weeks: Bucket[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const [, m, d] = chunk[0].date.split('-');
      weeks.push({ label: `${MONTHS[Number(m) - 1]} ${Number(d)}`, value: chunk.reduce((a, x) => a + x.count, 0) });
    }
    return weeks.slice(-26);
  }
  const months = new Map<string, Bucket>();
  for (const d of days) {
    const key = d.date.slice(0, 7);
    const b = months.get(key) ?? { label: MONTHS[Number(key.slice(5)) - 1], value: 0 };
    b.value += d.count;
    months.set(key, b);
  }
  return [...months.values()];
}

export const activityCard = defineCard<Params, CalendarDay[]>({
  id: 'activity',
  category: 'activity',
  tags: ['chart', 'bars', 'trend'],
  variants: [
    { label: 'Monthly bars' },
    { label: 'Weekly area', params: { by: 'week', style: 'area' } },
    { label: 'Weekday bars', params: { by: 'weekday' } },
    { label: 'Monthly line', params: { style: 'line' } }
  ],
  aliases: ['chart'],
  title: 'Contribution Activity',
  description: 'Contribution totals per month, week or weekday as bars, an area or a line.',
  params: [
    { name: 'by', type: 'enum', options: [...BY], default: 'month', description: 'Group by' },
    { name: 'style', type: 'enum', options: [...STYLES], default: 'bar', description: 'Chart style' },
    { name: 'year', type: 'number', min: 2008, description: 'Calendar year (default: last 12 months)' },
    { name: 'bar_radius', type: 'number', default: 3, min: 0, max: 14, description: 'Corner radius of bars' },
    { name: 'line_width', type: 'number', default: 2.5, min: 1, max: 6, step: 0.5, description: 'Line thickness (line/area)' },
    { name: 'grid', type: 'boolean', default: true, description: 'Show grid lines and axis labels' }
  ],
  parse: (q) => ({
    by: oneOf(q.by, BY, 'month'),
    style: oneOf(q.style, STYLES, 'bar'),
    year: q.year ? int(q.year, new Date().getUTCFullYear(), 2008, new Date().getUTCFullYear()) : null,
    barRadius: int(q.bar_radius, 3, 0, 14),
    lineWidth: num(q.line_width, 2.5, 1, 6, 0.5),
    grid: bool(q.grid, true)
  }),
  load: (client, p, common) => client.getCalendar(common.username, [p.year ? calendarYearRange(p.year) : lastYearRange()]),
  toJSON: (days, p) => bucketize(days, p.by),

  render(days, p, { theme, common, title, t }) {
    const header = title(t('title.activity'));
    const buckets = bucketize(days, p.by);
    if (!buckets.length) return messageCard('No contribution data available.', theme, { title: header ?? t('title.activity'), tone: 'info' });

    const width = 480;
    const top = contentTop(!!header);
    const plotH = 120;
    const left = PAD + 30;
    const plotW = width - left - PAD;
    const max = Math.max(...buckets.map((b) => b.value), 1);
    const step = plotW / buckets.length;
    const total = buckets.reduce((a, b) => a + b.value, 0);
    const y = (v: number) => top + plotH - (v / max) * plotH;
    const x = (i: number) => left + step * i + step / 2;

    const grid = !p.grid ? '' : [0, 0.5, 1]
      .map((f) => {
        const gy = top + plotH - f * plotH;
        return `<line x1="${left}" y1="${gy}" x2="${width - PAD}" y2="${gy}" class="sk-bd" stroke-width="1" stroke-dasharray="${f === 0 ? '0' : '3 4'}"/>` +
          `<text x="${left - 8}" y="${gy + 4}" text-anchor="end" class="muted" font-size="10">${compact(max * f)}</text>`;
      })
      .join('');

    let marks: string;
    if (p.style === 'bar') {
      const bw = Math.min(28, step * 0.62);
      marks = buckets
        .map((b, i) => {
          const h = Math.max(b.value ? 2 : 0, (b.value / max) * plotH);
          return `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(top + plotH - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${p.barRadius}"${cls('ser', common.animation, i % 12)}/>`;
        })
        .join('');
    } else {
      const pts = buckets.map((b, i) => `${x(i).toFixed(1)},${y(b.value).toFixed(1)}`);
      const line = `<polyline points="${pts.join(' ')}" class="sk-ser" stroke-width="${p.lineWidth}" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`;
      const area = p.style === 'area'
        ? `<polygon points="${x(0).toFixed(1)},${top + plotH} ${pts.join(' ')} ${x(buckets.length - 1).toFixed(1)},${top + plotH}" class="ser" fill-opacity=".18"/>`
        : '';
      const dots = buckets.length <= 30 ? buckets.map((b, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(b.value).toFixed(1)}" r="3" class="bg sk-ser" stroke-width="2"/>`).join('') : '';
      marks = `<g${anim(common.animation)}>${area}${line}${dots}</g>`;
    }

    const every = Math.ceil(buckets.length / 13);
    const labels = buckets
      .map((b, i) => (i % every ? '' : `<text x="${x(i).toFixed(1)}" y="${top + plotH + 18}" text-anchor="middle" class="muted" font-size="10">${b.label}</text>`))
      .join('');

    return frame(grid + marks + labels, {
      width,
      height: top + plotH + 45,
      theme,
      title: header,
      subtitle: `${fmt(total)} · @${common.username}`,
      label: `Contribution activity for ${common.username}: ${fmt(total)} contributions`
    });
  }
});
