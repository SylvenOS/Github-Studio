import { defineCard } from './types';
import { bool, int } from '../core/params';
import { fmt } from '../core/text';
import { calendarYearRange, lastYearRange, type CalendarDay } from '../github/client';
import { contentTop, frame, PAD } from '../svg/frame';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CELL = 10;
const GAP = 3;
const STEP = CELL + GAP;

interface Params {
  year: number | null;
  months: boolean;
}

/** Places each day on a week/weekday grid (columns start on Sunday). */
export function layoutDays(days: CalendarDay[]) {
  let col = 0;
  return days.map((d, i) => {
    const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (i > 0 && dow === 0) col++;
    return { ...d, col, dow };
  });
}

export const contributionsCard = defineCard<Params, CalendarDay[]>({
  id: 'contributions',
  aliases: ['heatmap'],
  title: 'Contribution Graph',
  description: 'Heatmap of daily contributions for the last year or a given calendar year.',
  params: [
    { name: 'year', type: 'number', min: 2008, description: 'Calendar year (default: last 12 months)' },
    { name: 'months', type: 'boolean', default: true, description: 'Show month labels' }
  ],
  parse: (q) => ({
    year: q.year ? int(q.year, new Date().getUTCFullYear(), 2008, new Date().getUTCFullYear()) : null,
    months: bool(q.months, true)
  }),
  load: (client, p, common) =>
    client.getCalendar(common.username, [p.year ? calendarYearRange(p.year) : lastYearRange()]),

  render(days, p, { theme, common, title, t }) {
    const header = title(t('title.contributions'));
    const top = contentTop(!!header);
    const cells = layoutDays(days);
    const columns = (cells.at(-1)?.col ?? 0) + 1;
    const gx = PAD + 28;
    const gy = top + (p.months ? 18 : 0);
    const width = gx + columns * STEP - GAP + PAD;
    const total = days.reduce((a, d) => a + d.count, 0);

    const rects = cells
      .map((c) => `<rect x="${c.col * STEP}" y="${c.dow * STEP}" width="${CELL}" height="${CELL}" rx="2" class="l${c.level}"/>`)
      .join('');

    let monthLabels = '';
    if (p.months) {
      const firstInCol = new Map<number, (typeof cells)[number]>();
      const sizes = new Map<number, number>();
      for (const c of cells) {
        if (!firstInCol.has(c.col)) firstInCol.set(c.col, c);
        sizes.set(c.col, (sizes.get(c.col) ?? 0) + 1);
      }
      let last = -1;
      let lastCol = -Infinity;
      for (const [col, c] of firstInCol) {
        const m = Number(c.date.slice(5, 7)) - 1;
        if (m === last) continue;
        last = m;
        // labels are ~3 columns wide; a sliver of a month at the edge would collide with its neighbour
        if (col - lastCol < 3 || (col === 0 && (sizes.get(0) ?? 0) < 4)) continue;
        lastCol = col;
        monthLabels += `<text x="${gx + col * STEP}" y="${top + 8}" class="label muted" font-size="10">${MONTHS[m]}</text>`;
      }
    }

    const weekdays = [1, 3, 5]
      .map((d) => `<text x="${PAD}" y="${gy + d * STEP + 9}" class="label muted" font-size="9">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]}</text>`)
      .join('');

    const legendY = gy + 7 * STEP + 12;
    const swatchX = width - PAD - 30 - 5 * STEP + 3;
    const legend =
      `<text x="${PAD}" y="${legendY + 9}" class="label muted" font-size="11">${p.year ? t('misc.contributions_in', { n: fmt(total), year: p.year }) : t('misc.contributions_last_year', { n: fmt(total) })}</text>` +
      `<text x="${swatchX - 6}" y="${legendY + 9}" class="label muted" font-size="10" text-anchor="end">${t('misc.less')}</text>` +
      [0, 1, 2, 3, 4]
        .map((l) => `<rect x="${swatchX + l * STEP}" y="${legendY}" width="${CELL}" height="${CELL}" rx="2" class="l${l}"/>`)
        .join('') +
      `<text x="${width - PAD}" y="${legendY + 9}" class="label muted" font-size="10" text-anchor="end">${t('misc.more')}</text>`;

    return frame(`${monthLabels}${weekdays}<g transform="translate(${gx} ${gy})">${rects}</g>${legend}`, {
      width: Math.max(width, 460),
      height: legendY + CELL + PAD,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `${fmt(total)} contributions by ${common.username}`
    });
  }
});
