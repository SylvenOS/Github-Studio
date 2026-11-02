import { defineCard } from './types';
import { bool, int, oneOf } from '../core/params';
import { esc, fmt, MONTHS } from '../core/text';
import { calendarYearRange, type CalendarDay } from '../github/client';
import { anim, cls, contentTop, frame, PAD } from '../svg/frame';

const LAYOUTS = ['bars', 'line'] as const;

interface Params {
  year: number;
  compare: boolean;
  layout: (typeof LAYOUTS)[number];
  values: boolean;
}

interface Data {
  year: number;
  months: number[];
  previous: number[] | null;
  /** Last day included (for year-to-date comparisons). */
  through: string;
}

const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? '+∞' : '±0%') : `${a >= b ? '+' : '−'}${Math.abs(Math.round(((a - b) / b) * 100))}%`);

export const monthlyCard = defineCard<Params, Data>({
  id: 'monthly',
  aliases: ['monthly-summary', 'trend', 'period-compare'],
  category: 'activity',
  tags: ['monthly', 'trend', 'comparison', 'year over year', 'growth', 'summary', 'realistic'],
  variants: [{ label: 'Bars vs last year' }, { label: 'Line', params: { layout: 'line' } }, { label: 'This year only', params: { compare: 'false', values: 'true' } }],
  title: 'Monthly Trend',
  description: 'Contributions per month with last year as a ghost series, plus year-to-date and last-30-days comparisons, so you can see how your activity is changing, not just when it happened.',
  cacheSeconds: 3 * 3600,
  params: [
    { name: 'year', type: 'number', min: 2009, description: 'Year (default: this year)' },
    { name: 'compare', type: 'boolean', default: true, description: 'Overlay the previous year and show deltas' },
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'bars', description: 'Chart type' },
    { name: 'values', type: 'boolean', default: false, description: 'Print the value above each month' }
  ],
  parse: (q) => {
    const now = new Date().getUTCFullYear();
    return { year: int(q.year, now, 2009, now), compare: bool(q.compare, true), layout: oneOf(q.layout, LAYOUTS, 'bars'), values: bool(q.values, false) };
  },

  async load(client, p, common) {
    const ranges = [calendarYearRange(p.year)];
    if (p.compare) ranges.push(calendarYearRange(p.year - 1));
    const days = await client.getCalendar(common.username, ranges);
    const sum = (year: number) => {
      const m = new Array(12).fill(0);
      for (const d of days) if (d.date.startsWith(`${year}-`)) m[Number(d.date.slice(5, 7)) - 1] += d.count;
      return m;
    };
    const cur = days.filter((d: CalendarDay) => d.date.startsWith(`${p.year}-`));
    return { year: p.year, months: sum(p.year), previous: p.compare ? sum(p.year - 1) : null, through: cur[cur.length - 1]?.date ?? `${p.year}-12-31` };
  },

  render(d, p, { theme, common, title }) {
    const header = title('Monthly Trend');
    const top = contentTop(!!header);
    const W = 560;
    const animate = common.animation;
    const thisYear = d.year === new Date().getUTCFullYear();
    const lastMonth = thisYear ? Number(d.through.slice(5, 7)) - 1 : 11;
    const total = d.months.reduce((a, b) => a + b, 0);

    // comparisons
    let stats = `<text x="${PAD}" y="${top + 18}" class="value fg">${fmt(total)}</text><text x="${PAD}" y="${top + 35}" class="label muted">${thisYear ? 'this year so far' : `in ${d.year}`}</text>`;
    if (d.previous) {
      // same period last year: full months before the current one + the same share of the current month
      const day = Number(d.through.slice(8, 10));
      const prevYtd = d.previous.slice(0, lastMonth).reduce((a, b) => a + b, 0) + (thisYear ? Math.round((d.previous[lastMonth] * day) / 30.4) : d.previous[lastMonth]);
      const delta = pct(total, prevYtd);
      const up = total >= prevYtd;
      stats +=
        `<text x="${PAD + 150}" y="${top + 18}" class="value" style="fill:${up ? '#3fb950' : '#f85149'}">${esc(delta)}</text>` +
        `<text x="${PAD + 150}" y="${top + 35}" class="label muted">vs ${thisYear ? 'same period ' : ''}${d.year - 1} (${fmt(prevYtd)})</text>`;
    }
    const best = d.months.indexOf(Math.max(...d.months));
    stats += `<text x="${W - PAD}" y="${top + 18}" class="value fg" text-anchor="end">${total ? MONTHS[best] : '-'}</text><text x="${W - PAD}" y="${top + 35}" class="label muted" text-anchor="end">best month</text>`;

    const chart = { x: PAD, y: top + 56, w: W - PAD * 2, h: 130 };
    const max = Math.max(1, ...d.months, ...(d.previous ?? []));
    const step = chart.w / 12;
    let body = stats;
    for (const f of [0.5, 1]) {
      const y = chart.y + chart.h - f * chart.h;
      body += `<line x1="${chart.x}" y1="${y}" x2="${chart.x + chart.w}" y2="${y}" class="sk-bd" stroke-dasharray="3 4"/>`;
    }
    const yOf = (v: number) => chart.y + chart.h - (v / max) * chart.h;

    if (p.layout === 'line') {
      const path = (vals: number[], upto: number) => vals.slice(0, upto + 1).map((v, i) => `${i ? 'L' : 'M'}${(chart.x + i * step + step / 2).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ');
      if (d.previous) body += `<path d="${path(d.previous, 11)}" fill="none" class="sk-bd" stroke-width="2" stroke-dasharray="5 4"/>`;
      body += `<path d="${path(d.months, lastMonth)}" fill="none" class="sk-ser" stroke-width="2.6" stroke-linejoin="round"/>`;
      d.months.slice(0, lastMonth + 1).forEach((v, i) => (body += `<circle cx="${(chart.x + i * step + step / 2).toFixed(1)}" cy="${yOf(v).toFixed(1)}" r="3"${cls('ser', animate, i)}/>`));
    } else {
      const bw = step * (d.previous ? 0.36 : 0.6);
      d.months.forEach((v, i) => {
        const x = chart.x + i * step + (step - (d.previous ? bw * 2 + 2 : bw)) / 2;
        if (d.previous) {
          const hp = (d.previous[i] / max) * chart.h;
          body += `<rect x="${x.toFixed(1)}" y="${(chart.y + chart.h - hp).toFixed(1)}" width="${bw.toFixed(1)}" height="${hp.toFixed(1)}" rx="2" class="muted" fill-opacity=".35"><title>${MONTHS[i]} ${d.year - 1}: ${d.previous[i]}</title></rect>`;
        }
        if (i > lastMonth) return;
        const h = (v / max) * chart.h;
        const bx = d.previous ? x + bw + 2 : x;
        body += `<rect x="${bx.toFixed(1)}" y="${(chart.y + chart.h - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2"${cls('ser', animate, i)}><title>${MONTHS[i]} ${d.year}: ${v}</title></rect>`;
        if (p.values && v) body += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(chart.y + chart.h - h - 4).toFixed(1)}" class="label muted" font-size="9" text-anchor="middle">${fmt(v)}</text>`;
      });
    }
    MONTHS.forEach((m, i) => (body += `<text x="${(chart.x + i * step + step / 2).toFixed(1)}" y="${chart.y + chart.h + 15}" class="label muted" font-size="10" text-anchor="middle">${m}</text>`));

    let legend = '';
    if (d.previous) {
      const ly = chart.y + chart.h + 34;
      legend = `<g${anim(animate, 13)}><rect x="${PAD}" y="${ly - 9}" width="10" height="10" rx="2" class="ser"/><text x="${PAD + 15}" y="${ly}" class="label fg" font-size="11">${d.year}</text><rect x="${PAD + 60}" y="${ly - 9}" width="10" height="10" rx="2" class="muted" fill-opacity=".35"/><text x="${PAD + 75}" y="${ly}" class="label fg" font-size="11">${d.year - 1}</text></g>`;
    }
    return frame(body + legend, {
      width: W,
      height: chart.y + chart.h + (d.previous ? 48 : 28),
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `Monthly contributions of ${common.username} in ${d.year}: ${total} total`
    });
  }
});
