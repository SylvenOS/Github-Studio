import { defineCard } from './types';
import { bool, int } from '../core/params';
import { fmt, shortDate } from '../core/text';
import { calendarYearRange, lastYearRange, type CalendarDay } from '../github/client';
import { contentTop, frame, PAD } from '../svg/frame';
import { layoutDays } from './contributions';

interface Params {
  year: number | null;
  height: number;
  cell: number;
  stats: boolean;
}

/**
 * Isometric 3D contribution skyline: every day is a block whose height follows its contribution count
 * (square-root scale so one huge day doesn't flatten the rest). Faces reuse the heatmap level classes,
 * so themes and `heat_colors` apply, and the two visible sides are shaded for depth.
 */
export const skylineCard = defineCard<Params, CalendarDay[]>({
  id: 'skyline',
  aliases: ['3d', 'isometric', 'city'],
  category: 'activity',
  tags: ['3d', 'isometric', 'city', 'skyline', 'contributions', 'calendar'],
  variants: [
    { label: 'Skyline' },
    { label: 'Tall towers', params: { height: '110' } },
    { label: 'Neon city', params: { theme: 'synthwave', glow: 'true' } },
    { label: 'Growing (animated)', params: { animation: 'true' } }
  ],
  title: '3D Contribution Skyline',
  description: 'Your contribution calendar as an isometric 3D city: every day is a tower whose height follows how much you did.',
  params: [
    { name: 'year', type: 'number', min: 2008, description: 'Calendar year (default: last 12 months)' },
    { name: 'height', type: 'number', default: 60, min: 20, max: 140, description: 'Height of the tallest tower' },
    { name: 'cell', type: 'number', default: 10, min: 6, max: 16, description: 'Block size' },
    { name: 'stats', type: 'boolean', default: true, description: 'Show the total and best day' }
  ],
  parse: (q) => ({
    year: q.year ? int(q.year, new Date().getUTCFullYear(), 2008, new Date().getUTCFullYear()) : null,
    height: int(q.height, 60, 20, 140),
    cell: int(q.cell, 10, 6, 16),
    stats: bool(q.stats, true)
  }),
  load: (client, p, common) => client.getCalendar(common.username, [p.year ? calendarYearRange(p.year) : lastYearRange()]),

  render(days, p, { theme, common, title }) {
    const header = title('3D Contribution Skyline');
    const top = contentTop(!!header);
    const cells = layoutDays(days);
    const cols = (cells.at(-1)?.col ?? 0) + 1;
    const cw = p.cell * 0.866; // cos 30°
    const ch = p.cell * 0.5; // sin 30°
    const max = Math.max(...days.map((d) => d.count), 1);
    const ox = PAD + 7 * cw;
    const oy = top + p.height + (p.stats ? 26 : 8);
    const P = (gx: number, gy: number, h = 0): string => `${(ox + (gx - gy) * cw).toFixed(1)},${(oy + (gx + gy) * ch - h).toFixed(1)}`;
    const animate = common.animation;

    // painter's order: blocks further back (smaller col+row) first
    const ordered = [...cells].sort((a, b) => a.col + a.dow - (b.col + b.dow) || a.col - b.col);
    const inset = 0.08;
    const blocks = ordered
      .map((c) => {
        const x0 = c.col + inset;
        const x1 = c.col + 1 - inset;
        const y0 = c.dow + inset;
        const y1 = c.dow + 1 - inset;
        const h = c.count > 0 ? Math.max(2, Math.sqrt(c.count / max) * p.height) : 0;
        const topFace = `<polygon points="${P(x0, y0, h)} ${P(x1, y0, h)} ${P(x1, y1, h)} ${P(x0, y1, h)}" class="l${c.level}"/>`;
        if (!h) return topFace;
        const left = `${P(x0, y1, h)} ${P(x1, y1, h)} ${P(x1, y1)} ${P(x0, y1)}`;
        const right = `${P(x1, y1, h)} ${P(x1, y0, h)} ${P(x1, y0)} ${P(x1, y1)}`;
        const faces =
          `<polygon points="${left}" class="l${c.level}"/><polygon points="${left}" fill="#000" fill-opacity=".22"/>` +
          `<polygon points="${right}" class="l${c.level}"/><polygon points="${right}" fill="#000" fill-opacity=".38"/>` +
          topFace;
        return animate ? `<g class="tw" style="--i:${c.col}">${faces}</g>` : faces;
      })
      .join('');

    const best = days.reduce<CalendarDay | null>((b, d) => (!b || d.count > b.count ? d : b), null);
    const total = days.reduce((a, d) => a + d.count, 0);
    const stats = p.stats
      ? `<text x="${PAD}" y="${top + 10}" class="fg" font-size="13" font-weight="700">${fmt(total)} contributions</text>` +
        (best && best.count ? `<text x="${PAD}" y="${top + 27}" class="muted" font-size="11">Best day: ${fmt(best.count)} on ${shortDate(best.date)}</text>` : '')
      : '';
    const css = animate
      ? '<style>.tw{transform-box:fill-box;transform-origin:50% 100%;animation:grow .9s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*25ms)}@keyframes grow{from{transform:scaleY(0);opacity:0}to{transform:none;opacity:1}}@media (prefers-reduced-motion:reduce){.tw{animation:none}}</style>'
      : '';

    const natural = Math.round(ox + (cols + 0.5) * cw + PAD);
    const width = Math.max(natural, 340); // keeps the title and stats from colliding on short ranges
    const shift = Math.round((width - natural) / 2);
    const height = Math.round(oy + (cols + 7) * ch + PAD);
    return frame(css + stats + (shift ? `<g transform="translate(${shift} 0)">${blocks}</g>` : blocks), {
      width,
      height,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `3D contribution skyline for ${common.username}: ${fmt(total)} contributions`
    });
  }
});
