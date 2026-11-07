import { defineCard } from './types';
import { bool, int, oneOf } from '../core/params';
import { MONTHS, WEEKDAYS, fmt, shortDate } from '../core/text';
import { computeStreaks } from '../metrics/streak';
import { calendarYearRange, lastYearRange, type CalendarDay } from '../github/client';
import { contentTop, frame, PAD } from '../svg/frame';

const SHAPES = ['square', 'round', 'circle'] as const;
const STARTS = ['sun', 'mon'] as const;
const EFFECTS = ['none', 'snake', 'wave'] as const;
const VIEWS = ['heatmap', 'bars'] as const;
const HIGHLIGHTS = ['none', 'best', 'today', 'both'] as const;

interface Params {
  year: number | null;
  months: boolean;
  shape: (typeof SHAPES)[number];
  cell: number;
  gap: number;
  weekStart: (typeof STARTS)[number];
  legend: boolean;
  weekdays: boolean;
  effect: (typeof EFFECTS)[number];
  view: (typeof VIEWS)[number];
  highlight: (typeof HIGHLIGHTS)[number];
  summary: boolean;
}

/** Places each day on a week/weekday grid. Columns start on Sunday, or Monday with `weekStart='mon'`. */
export function layoutDays(days: CalendarDay[], weekStart: 'sun' | 'mon' = 'sun') {
  let col = 0;
  return days.map((d, i) => {
    const raw = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    const dow = weekStart === 'mon' ? (raw + 6) % 7 : raw;
    if (i > 0 && dow === 0) col++;
    return { ...d, col, dow };
  });
}

/** One heatmap cell in the chosen shape. */
function cellSvg(x: number, y: number, size: number, shape: Params['shape'], cls: string): string {
  if (shape === 'circle') return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" class="${cls}"/>`;
  const rx = shape === 'round' ? size * 0.35 : Math.max(1, size * 0.2);
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx.toFixed(1)}" class="${cls}"/>`;
}

export const contributionsCard = defineCard<Params, CalendarDay[]>({
  id: 'contributions',
  category: 'activity',
  tags: ['heatmap', 'calendar', 'graph'],
  variants: [
    { label: 'Last 12 months' },
    { label: 'No month labels', params: { months: 'false' } },
    { label: 'Round cells', params: { shape: 'round' } },
    { label: 'Dots', params: { shape: 'circle', gap: '4' } },
    { label: 'Big cells, Monday first', params: { cell: '14', week_start: 'mon' } },
    { label: 'Snake (animated)', params: { effect: 'snake', animation: 'true' } },
    { label: 'Wave (animated)', params: { effect: 'wave', shape: 'round', animation: 'true' } },
    { label: 'Weekly bars', params: { view: 'bars' } },
    { label: 'Best day highlighted', params: { highlight: 'both', summary: 'true' } },
    { label: 'Summary line', params: { summary: 'true', shape: 'round' } }
  ],
  aliases: ['heatmap'],
  title: 'Contribution Graph',
  description: 'Heatmap of daily contributions for the last year or a given calendar year.',
  params: [
    { name: 'year', type: 'number', min: 2008, description: 'Calendar year (default: last 12 months)' },
    { name: 'shape', type: 'enum', options: [...SHAPES], default: 'square', description: 'Cell shape' },
    { name: 'cell', type: 'number', default: 10, min: 6, max: 18, description: 'Cell size in px' },
    { name: 'gap', type: 'number', default: 3, min: 1, max: 6, description: 'Gap between cells' },
    { name: 'week_start', type: 'enum', options: [...STARTS], default: 'sun', description: 'First day of the week' },
    { name: 'months', type: 'boolean', default: true, description: 'Show month labels' },
    { name: 'weekdays', type: 'boolean', default: true, description: 'Show weekday labels' },
    { name: 'legend', type: 'boolean', default: true, description: 'Show total and the less/more legend' },
    { name: 'view', type: 'enum', options: [...VIEWS], default: 'heatmap', description: 'Daily heatmap or weekly totals as bars' },
    { name: 'highlight', type: 'enum', options: [...HIGHLIGHTS], default: 'none', description: 'Ring around your best day and/or today' },
    { name: 'summary', type: 'boolean', default: false, description: 'Add active days, longest streak and best day under the graph' },
    { name: 'effect', type: 'enum', options: [...EFFECTS], default: 'none', description: 'Animation (with animation=true): a snake eating your contributions, or a wave' }
  ],
  parse: (q) => ({
    year: q.year ? int(q.year, new Date().getUTCFullYear(), 2008, new Date().getUTCFullYear()) : null,
    months: bool(q.months, true),
    shape: oneOf(q.shape, SHAPES, 'square'),
    cell: int(q.cell, 10, 6, 18),
    gap: int(q.gap, 3, 1, 6),
    weekStart: oneOf(q.week_start, STARTS, 'sun'),
    legend: bool(q.legend, true),
    weekdays: bool(q.weekdays, true),
    effect: oneOf(q.effect, EFFECTS, 'none'),
    view: oneOf(q.view, VIEWS, 'heatmap'),
    highlight: oneOf(q.highlight, HIGHLIGHTS, 'none'),
    summary: bool(q.summary, false)
  }),
  load: (client, p, common) =>
    client.getCalendar(common.username, [p.year ? calendarYearRange(p.year) : lastYearRange()]),

  render(days, p, { theme, common, title, t }) {
    const header = title(t('title.contributions'));
    const top = contentTop(!!header);
    const CELL = p.cell;
    const GAP = p.gap;
    const STEP = CELL + GAP;
    const cells = layoutDays(days, p.weekStart);
    const columns = (cells.at(-1)?.col ?? 0) + 1;
    const gx = PAD + (p.weekdays ? 28 : 0);
    const gy = top + (p.months ? 18 : 0);
    // short ranges would otherwise be narrower than their own legend and summary line
    const width = Math.max(gx + columns * STEP - GAP + PAD, p.legend ? (p.summary ? 440 : 340) : 0);
    const total = days.reduce((a, d) => a + d.count, 0);

    const effect = common.animation ? p.effect : 'none';
    // snake: visit cells column by column, alternating direction, eating the active ones
    const order = (c: { col: number; dow: number }) => c.col * 7 + (c.col % 2 ? 6 - c.dow : c.dow);
    const steps = columns * 7;
    const loop = Math.max(8, steps * 0.045); // seconds per loop
    const rects = cells
      .map((c) => {
        const cell = cellSvg(c.col * STEP, c.dow * STEP, CELL, p.shape, `l${c.level}`);
        if (effect === 'snake' && c.level > 0) return `<g class="eat" style="--d:${((order(c) / steps) * loop * 0.85).toFixed(2)}s">${cell}</g>`;
        if (effect === 'wave') return `<g class="wv" style="--d:${((c.col + c.dow) * 0.06).toFixed(2)}s">${cell}</g>`;
        return cell;
      })
      .join('');
    const bars = p.view === 'bars';
    const weekly = new Array(columns).fill(0);
    for (const c of cells) weekly[c.col] += c.count;
    const barH = 7 * STEP - GAP;
    const maxWeek = Math.max(1, ...weekly);
    const barRects = weekly
      .map((v, i) => {
        const h = Math.max(v ? 2 : 0, (v / maxWeek) * barH);
        return `<rect x="${i * STEP}" y="${(barH - h).toFixed(1)}" width="${CELL}" height="${h.toFixed(1)}" rx="${Math.min(3, CELL / 3)}" class="ser"><title>${v}</title></rect>`;
      })
      .join('');
    // highlight rings: best day and today
    const best = cells.reduce((a, c) => (c.count > a.count ? c : a), cells[0]);
    const ring = (c: (typeof cells)[number], dashed: boolean) =>
      `<rect x="${c.col * STEP - 2}" y="${c.dow * STEP - 2}" width="${CELL + 4}" height="${CELL + 4}" rx="${p.shape === 'circle' ? (CELL + 4) / 2 : 4}" fill="none" class="sk-accent" stroke-width="1.8"${dashed ? ' stroke-dasharray="3 2"' : ''}/>`;
    const marks =
      !bars && cells.length
        ? ((p.highlight === 'best' || p.highlight === 'both') && best.count > 0 ? ring(best, false) : '') + ((p.highlight === 'today' || p.highlight === 'both') ? ring(cells[cells.length - 1], true) : '')
        : '';
    let fxStyle = '';
    let fxHead = '';
    if (effect === 'snake') {
      const centre = (col: number, dow: number) => `${(col * STEP + CELL / 2).toFixed(1)},${(dow * STEP + CELL / 2).toFixed(1)}`;
      const path: string[] = [];
      for (let col = 0; col < columns; col++) for (let k = 0; k < 7; k++) path.push(centre(col, col % 2 ? 6 - k : k));
      // CSS motion path (not SMIL) so prefers-reduced-motion can stop it; one shared loop keeps head and cells in sync
      fxStyle =
        `<style>.eat{animation:eat ${loop.toFixed(1)}s linear infinite;animation-delay:var(--d)}@keyframes eat{0%{opacity:1}1%,88%{opacity:.12}100%{opacity:1}}` +
        `.snk{offset-path:path('M${path.join(' L')}');offset-rotate:0deg;animation:snk ${loop.toFixed(1)}s linear infinite}` +
        `@keyframes snk{0%{offset-distance:0%;opacity:1}85%{offset-distance:100%;opacity:1}86%,100%{offset-distance:100%;opacity:0}}` +
        `@media (prefers-reduced-motion:reduce){.eat{animation:none}.snk{display:none}}</style>`;
      fxHead = `<circle r="${(CELL * 0.62).toFixed(1)}" class="accent snk"/>`;
    } else if (effect === 'wave') {
      fxStyle = '<style>.wv{transform-box:fill-box;transform-origin:center;animation:wv 2.4s ease-in-out infinite;animation-delay:var(--d)}@keyframes wv{0%,100%{transform:scale(1)}50%{transform:scale(.55)}}@media (prefers-reduced-motion:reduce){.wv{animation:none}}</style>';
    }

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
      const minGap = Math.ceil(30 / STEP); // a label is ~30px wide
      for (const [col, c] of firstInCol) {
        const m = Number(c.date.slice(5, 7)) - 1;
        if (m === last) continue;
        last = m;
        // a sliver of a month at the edge would collide with its neighbour
        if (col - lastCol < minGap || (col === 0 && (sizes.get(0) ?? 0) < 4)) continue;
        lastCol = col;
        monthLabels += `<text x="${gx + col * STEP}" y="${top + 8}" class="label muted" font-size="10">${MONTHS[m]}</text>`;
      }
    }

    // Mon / Wed / Fri rows (their row index depends on the first day of the week)
    const weekdays = !p.weekdays || bars
      ? ''
      : [1, 3, 5]
          .map((d) => {
            const row = p.weekStart === 'mon' ? d - 1 : d;
            return `<text x="${PAD}" y="${gy + row * STEP + CELL - 1}" class="label muted" font-size="9">${WEEKDAYS[d]}</text>`;
          })
          .join('');

    const legendY = gy + 7 * STEP + 12;
    const streaks = computeStreaks(days);
    const active = days.filter((d) => d.count > 0).length;
    const sumLine = p.summary ? `${fmt(active)} active days · longest streak ${streaks.longest.length} · best day ${fmt(best?.count ?? 0)}${best ? ` (${shortDate(best.date)})` : ''}` : '';
    const sumH = p.summary ? 20 : 0;
    const sw = Math.min(CELL, 12);
    const swatchX = width - PAD - 30 - 5 * (sw + 3) + 3;
    const legend = !p.legend
      ? ''
      : (p.summary ? `<text x="${PAD}" y="${legendY + 9}" class="fg" font-size="11.5" font-weight="600">${sumLine}</text>` : '') +
        `<text x="${PAD}" y="${legendY + 9 + sumH}" class="label muted" font-size="11">${p.year ? t('misc.contributions_in', { n: fmt(total), year: p.year }) : t('misc.contributions_last_year', { n: fmt(total) })}</text>` +
        `<text x="${swatchX - 6}" y="${legendY + 9 + sumH}" class="label muted" font-size="10" text-anchor="end">${t('misc.less')}</text>` +
        [0, 1, 2, 3, 4].map((l) => cellSvg(swatchX + l * (sw + 3), legendY + sumH, sw, p.shape, `l${l}`)).join('') +
        `<text x="${width - PAD}" y="${legendY + 9 + sumH}" class="label muted" font-size="10" text-anchor="end">${t('misc.more')}</text>`;

    return frame(`${monthLabels}${weekdays}<g transform="translate(${gx} ${gy})">${bars ? barRects : rects}${marks}${fxHead}</g>${fxStyle}${legend}`, {
      width: Math.max(width, 460),
      height: (p.legend ? legendY + sw + sumH : gy + 7 * STEP - GAP) + PAD,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `${fmt(total)} contributions by ${common.username}`
    });
  }
});
