import { defineCard } from './types';
import { bool, int, num, oneOf } from '../core/params';
import { MONTHS, WEEKDAYS, compact, fmt } from '../core/text';
import { calendarYearRange, lastYearRange, type CalendarDay } from '../github/client';
import { anim, cls, contentTop, frame, messageCard, PAD } from '../svg/frame';

const BY = ['month', 'week', 'weekday'] as const;
const STYLES = ['bar', 'area', 'line', 'step', 'lollipop'] as const;

interface Params {
  by: (typeof BY)[number];
  style: (typeof STYLES)[number];
  year: number | null;
  barRadius: number;
  lineWidth: number;
  grid: boolean;
  height: number;
  smooth: boolean;
  peak: boolean;
  average: boolean;
  values: boolean;
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
    { label: 'Monthly line', params: { style: 'line' } },
    { label: 'Smooth area', params: { style: 'area', smooth: 'true' } },
    { label: 'Lollipop with values', params: { style: 'lollipop', values: 'true' } },
    { label: 'Peak highlighted', params: { peak: 'true', average: 'true', values: 'true' } },
    { label: 'Steps', params: { style: 'step', by: 'week' } },
    { label: 'Tall weekly bars', params: { by: 'week', height: '200' } }
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
    { name: 'grid', type: 'boolean', default: true, description: 'Show grid lines and axis labels' },
    { name: 'height', type: 'number', default: 120, min: 70, max: 260, step: 10, description: 'Plot height' },
    { name: 'smooth', type: 'boolean', default: false, description: 'Curved lines (line and area)' },
    { name: 'peak', type: 'boolean', default: false, description: 'Highlight the highest bar or point, dim the rest' },
    { name: 'average', type: 'boolean', default: false, description: 'Dashed average line' },
    { name: 'values', type: 'boolean', default: false, description: 'Print the value of each bar or point' }
  ],
  parse: (q) => ({
    by: oneOf(q.by, BY, 'month'),
    style: oneOf(q.style, STYLES, 'bar'),
    year: q.year ? int(q.year, new Date().getUTCFullYear(), 2008, new Date().getUTCFullYear()) : null,
    barRadius: int(q.bar_radius, 3, 0, 14),
    height: int(q.height, 120, 70, 260),
    smooth: bool(q.smooth, false),
    peak: bool(q.peak, false),
    average: bool(q.average, false),
    values: bool(q.values, false),
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
    const plotH = p.height;
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

    const dim = (v: number) => (p.peak && v !== max ? ' fill-opacity=".4"' : '');
    const valueLabel = (i: number, v: number) => (p.values && v > 0 ? `<text x="${x(i).toFixed(1)}" y="${(y(v) - 7).toFixed(1)}" text-anchor="middle" class="fg" font-size="9.5" font-weight="600">${compact(v)}</text>` : '');
    let marks: string;
    if (p.style === 'lollipop') {
      marks = buckets
        .map((b, i) => `<g${anim(common.animation, i % 12)}><line x1="${x(i).toFixed(1)}" y1="${top + plotH}" x2="${x(i).toFixed(1)}" y2="${y(b.value).toFixed(1)}" class="sk-ser" stroke-width="2"${dim(b.value)}/><circle cx="${x(i).toFixed(1)}" cy="${y(b.value).toFixed(1)}" r="${p.peak && b.value === max ? 6 : 4.5}" class="ser"${dim(b.value)}/>${valueLabel(i, b.value)}</g>`)
        .join('');
    } else if (p.style === 'bar') {
      const bw = Math.min(28, step * 0.62);
      marks = buckets
        .map((b, i) => {
          const h = Math.max(b.value ? 2 : 0, (b.value / max) * plotH);
          return `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(top + plotH - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${p.barRadius}"${cls('ser', common.animation, i % 12)}${dim(b.value)}/>${valueLabel(i, b.value)}`;
        })
        .join('');
    } else {
      const coords = buckets.map((bk, i) => [x(i), y(bk.value)] as const);
      let d = '';
      if (p.style === 'step') {
        coords.forEach(([cx, cy], i) => (d += `${i ? 'L' : 'M'}${(cx - step / 2).toFixed(1)} ${cy.toFixed(1)} L${(cx + step / 2).toFixed(1)} ${cy.toFixed(1)} `));
      } else if (p.smooth && coords.length > 2) {
        coords.forEach(([cx, cy], i) => {
          if (!i) return (d += `M${cx.toFixed(1)} ${cy.toFixed(1)} `);
          const [px, py] = coords[i - 1];
          const mx = (px + cx) / 2;
          d += `C${mx.toFixed(1)} ${py.toFixed(1)} ${mx.toFixed(1)} ${cy.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)} `;
        });
      } else {
        coords.forEach(([cx, cy], i) => (d += `${i ? 'L' : 'M'}${cx.toFixed(1)} ${cy.toFixed(1)} `));
      }
      const x0 = p.style === 'step' ? coords[0][0] - step / 2 : coords[0][0];
      const x1 = p.style === 'step' ? coords[coords.length - 1][0] + step / 2 : coords[coords.length - 1][0];
      const line = `<path d="${d.trim()}" class="sk-ser" stroke-width="${p.lineWidth}" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`;
      const area = p.style === 'area' || p.style === 'step' ? `<path d="${d.trim()} L${x1.toFixed(1)} ${top + plotH} L${x0.toFixed(1)} ${top + plotH} Z" class="ser" fill-opacity=".18"/>` : '';
      const dots = p.style !== 'step' && buckets.length <= 30 ? buckets.map((bk, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(bk.value).toFixed(1)}" r="${p.peak && bk.value === max ? 5 : 3}" class="${p.peak && bk.value === max ? 'ser' : 'bg sk-ser'}" stroke-width="2"/>${valueLabel(i, bk.value)}`).join('') : '';
      marks = `<g${anim(common.animation)}>${area}${line}${dots}</g>`;
    }

    const avg = total / buckets.length;
    const avgLine = p.average ? `<line x1="${left}" y1="${y(avg).toFixed(1)}" x2="${width - PAD}" y2="${y(avg).toFixed(1)}" class="sk-accent" stroke-width="1.2" stroke-dasharray="5 4" stroke-opacity=".8"/><text x="${width - PAD}" y="${(y(avg) - 5).toFixed(1)}" text-anchor="end" class="accent" font-size="9.5" font-weight="600">avg ${compact(Math.round(avg))}</text>` : '';
    const every = Math.ceil(buckets.length / 13);
    const labels = buckets
      .map((b, i) => (i % every ? '' : `<text x="${x(i).toFixed(1)}" y="${top + plotH + 18}" text-anchor="middle" class="muted" font-size="10">${b.label}</text>`))
      .join('');

    return frame(grid + marks + avgLine + labels, {
      width,
      height: top + plotH + 45,
      theme,
      title: header,
      subtitle: `${fmt(total)} · @${common.username}`,
      label: `Contribution activity for ${common.username}: ${fmt(total)} contributions`
    });
  }
});
