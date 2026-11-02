import { defineCard } from './types';
import { badRequest } from '../core/errors';
import { bool, int, list, oneOf } from '../core/params';
import { esc, fmt, shortDate, WEEKDAYS } from '../core/text';
import { calendarYearRange, type CalendarDay } from '../github/client';
import { anim, contentTop, frame, PAD } from '../svg/frame';
import { icon } from '../svg/icons';

const LAYOUTS = ['classic', 'ring', 'cards', 'compact', 'week'] as const;
const MODES = ['daily', 'weekly'] as const;
const PARTS = ['total', 'current', 'longest'] as const;

interface Params {
  years: number;
  layout: (typeof LAYOUTS)[number];
  mode: (typeof MODES)[number];
  /** Weekdays (0 = Sun) that never break a streak. */
  exclude: number[];
  hide: string[];
  dates: boolean;
}

interface Run {
  length: number;
  start: string | null;
  end: string | null;
}

export interface StreakResult {
  total: number;
  firstDate: string | null;
  current: Run;
  longest: Run;
  /** Last 14 days, oldest first (for the week strip). */
  recent: { date: string; count: number }[];
  mode: 'daily' | 'weekly';
}

const EMPTY: Run = { length: 0, start: null, end: null };

/**
 * Streaks over chronologically sorted days. Daily: consecutive days with a contribution, where excluded
 * weekdays without contributions are skipped (neither counted nor breaking). Weekly: consecutive weeks
 * (Sunday-based) with at least one contribution. The current period may still be empty without breaking.
 */
export function streaksOf(days: CalendarDay[], mode: 'daily' | 'weekly', exclude: number[] = []): StreakResult {
  const total = days.reduce((a, d) => a + d.count, 0);
  const firstDate = days.find((d) => d.count > 0)?.date ?? null;
  const recent = days.slice(-14).map((d) => ({ date: d.date, count: d.count }));
  // units: days, or weeks keyed by their Sunday
  let units: { key: string; active: boolean; skip: boolean }[];
  if (mode === 'weekly') {
    const weeks = new Map<string, number>();
    for (const d of days) {
      const t = Date.parse(`${d.date}T00:00:00Z`);
      const sunday = new Date(t - new Date(t).getUTCDay() * 86_400_000).toISOString().slice(0, 10);
      weeks.set(sunday, (weeks.get(sunday) ?? 0) + d.count);
    }
    units = [...weeks].sort((a, b) => a[0].localeCompare(b[0])).map(([key, n]) => ({ key, active: n > 0, skip: false }));
  } else {
    units = days.map((d) => ({ key: d.date, active: d.count > 0, skip: d.count === 0 && exclude.includes(new Date(`${d.date}T00:00:00Z`).getUTCDay()) }));
  }
  let longest = EMPTY;
  let run = EMPTY;
  units.forEach((u, i) => {
    if (u.active) run = run.length ? { ...run, length: run.length + 1, end: u.key } : { length: 1, start: u.key, end: u.key };
    else if (!u.skip && !(i === units.length - 1)) run = EMPTY; // the last (current) unit may still be empty
    if (run.length > longest.length) longest = run;
  });
  // current: walk back from the end, allowing the last unit to be empty
  let current = EMPTY;
  let i = units.length - 1;
  if (i >= 0 && !units[i].active) i--;
  let len = 0;
  let end: string | null = null;
  let start: string | null = null;
  for (; i >= 0; i--) {
    const u = units[i];
    if (u.active) {
      len++;
      end ??= u.key;
      start = u.key;
    } else if (!u.skip) break;
  }
  if (len) current = { length: len, start, end };
  return { total, firstDate, current, longest, recent, mode };
}

export const streakCard = defineCard<Params, StreakResult>({
  id: 'streak',
  category: 'activity',
  tags: ['streak', 'consistency', 'fire', 'weekly', 'ring'],
  variants: [
    { label: 'Classic' },
    { label: 'Ring', params: { layout: 'ring' } },
    { label: 'Cards', params: { layout: 'cards' } },
    { label: 'This week', params: { layout: 'week' } },
    { label: 'Compact', params: { layout: 'compact' } },
    { label: 'Weekly streak', params: { mode: 'weekly' } },
    { label: 'Weekdays only', params: { exclude_days: 'sat,sun' } }
  ],
  title: 'GitHub Streak',
  description: 'Total contributions plus current and longest streaks, daily or weekly, with weekends (or any days) optionally excluded. Five layouts.',
  params: [
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'classic', description: 'Presentation' },
    { name: 'mode', type: 'enum', options: [...MODES], default: 'daily', description: 'Count consecutive days or consecutive weeks' },
    { name: 'exclude_days', type: 'list', description: 'Days that never break a daily streak, e.g. sat,sun' },
    { name: 'hide', type: 'list', description: `Parts to hide: ${PARTS.join(', ')}` },
    { name: 'dates', type: 'boolean', default: true, description: 'Show date ranges' },
    { name: 'years', type: 'number', default: 10, min: 1, max: 15, description: 'How many years of history to scan' }
  ],
  parse(q) {
    const exclude = list(q.exclude_days).map((d) => {
      const i = WEEKDAYS.findIndex((w) => w.toLowerCase() === d.toLowerCase().slice(0, 3));
      if (i < 0) throw badRequest('exclude_days takes weekday names, e.g. sat,sun');
      return i;
    });
    if (exclude.length >= 7) throw badRequest('exclude_days cannot exclude every day');
    return {
      years: int(q.years, 10, 1, 15),
      layout: oneOf(q.layout, LAYOUTS, 'classic'),
      mode: oneOf(q.mode, MODES, 'daily'),
      exclude: [...new Set(exclude)],
      hide: list(q.hide),
      dates: bool(q.dates, true)
    };
  },

  async load(client, p, common) {
    const user = await client.getUser(common.username);
    const now = new Date();
    const joined = user.createdAt ? new Date(user.createdAt).getUTCFullYear() : now.getUTCFullYear();
    const first = Math.max(joined, now.getUTCFullYear() - p.years + 1);
    const ranges = Array.from({ length: now.getUTCFullYear() - first + 1 }, (_, i) => calendarYearRange(first + i, now));
    return streaksOf(await client.getCalendar(common.username, ranges), p.mode, p.exclude);
  },
  toJSON: ({ recent: _r, ...s }) => s,

  render(s, p, { theme, common, title, t }) {
    const header = title(t('title.streak'));
    const animate = common.animation;
    const unit = s.mode === 'weekly' ? 'week' : 'day';
    const unitLabel = (n: number) => (s.mode === 'weekly' ? `${n} week${n === 1 ? '' : 's'}` : `${n} day${n === 1 ? '' : 's'}`);
    const range = (r: Run) => (!p.dates || !r.start ? '' : r.start === r.end ? shortDate(r.start) : `${shortDate(r.start)} - ${shortDate(r.end)}`);
    const totalSub = p.dates && s.firstDate ? `${shortDate(s.firstDate)} - ${t('streak.present')}` : '';
    const show = (k: string) => !p.hide.includes(k);
    const curLabel = s.mode === 'weekly' ? 'Weekly streak' : t('streak.current');
    const longLabel = s.mode === 'weekly' ? 'Longest weekly' : t('streak.longest');
    const note = p.exclude.length ? `${p.exclude.map((d) => WEEKDAYS[d]).join(', ')} excluded` : '';
    const label = `${common.username}: current ${unit} streak ${s.current.length}, longest ${s.longest.length}, ${s.total} contributions`;

    // ---- compact: one line
    if (p.layout === 'compact') {
      const W = 440;
      const body =
        icon('flame', PAD - 4, 14, 'accent', 1) +
        `<text x="${PAD + 18}" y="27" class="fg" font-size="14"><tspan font-weight="800" class="accent">${unitLabel(s.current.length)}</tspan> current · <tspan font-weight="700">${unitLabel(s.longest.length)}</tspan> longest · <tspan font-weight="700">${fmt(s.total)}</tspan> total</text>`;
      return frame(body, { width: W, height: 44, theme, label });
    }

    // ---- week strip: current streak + last 14 days
    if (p.layout === 'week') {
      const top = contentTop(!!header);
      const W = 440;
      const max = Math.max(1, ...s.recent.map((d) => d.count));
      const cw = (W - PAD * 2) / 14;
      let body =
        icon('flame', PAD - 2, top + 2, 'accent', 1.3) +
        `<text x="${PAD + 26}" y="${top + 20}" class="accent" font-size="26" font-weight="800">${s.current.length}</text>` +
        `<text x="${PAD + 30 + String(s.current.length).length * 16}" y="${top + 20}" class="fg" font-size="13">${unit} streak</text>` +
        `<text x="${W - PAD}" y="${top + 20}" class="muted" font-size="12" text-anchor="end">best ${unitLabel(s.longest.length)}</text>`;
      s.recent.forEach((d, i) => {
        const x = PAD + i * cw;
        const lvl = d.count === 0 ? 0 : Math.min(4, 1 + Math.floor((d.count / max) * 3.99));
        const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
        body +=
          `<g${anim(animate, i)}><rect x="${(x + 3).toFixed(1)}" y="${top + 38}" width="${(cw - 6).toFixed(1)}" height="${(cw - 6).toFixed(1)}" rx="6" class="l${lvl}"><title>${esc(`${d.date}: ${d.count}`)}</title></rect>` +
          `<text x="${(x + cw / 2).toFixed(1)}" y="${top + 38 + cw + 8}" class="muted" font-size="9.5" text-anchor="middle">${WEEKDAYS[dow][0]}</text></g>`;
      });
      return frame(body, { width: W, height: top + 38 + cw + 22, theme, title: header, subtitle: note || `@${common.username}`, label });
    }

    // ---- ring: big current streak
    if (p.layout === 'ring') {
      const top = contentTop(!!header);
      const W = 440;
      const cx = W / 2;
      const cy = top + 72;
      const r = 54;
      const c = 2 * Math.PI * r;
      const frac = s.longest.length ? Math.max(0.03, s.current.length / s.longest.length) : 0;
      let body =
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" class="sk-accent" stroke-opacity=".15" stroke-width="10"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" class="sk-accent" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>` +
        icon('flame', cx - 9, cy - 42, 'accent', 1.15) +
        `<text x="${cx}" y="${cy + 14}" class="accent" font-size="38" font-weight="800" text-anchor="middle">${s.current.length}</text>` +
        `<text x="${cx}" y="${cy + 32}" class="muted" font-size="11" text-anchor="middle">${esc(curLabel.toLowerCase())}</text>`;
      const side = (x: number, v: string, l: string, sub: string, anchor: string) =>
        `<text x="${x}" y="${cy - 2}" class="fg" font-size="22" font-weight="700" text-anchor="${anchor}">${v}</text><text x="${x}" y="${cy + 16}" class="muted" font-size="11" text-anchor="${anchor}">${esc(l)}</text>` +
        (sub ? `<text x="${x}" y="${cy + 31}" class="muted" font-size="9.5" text-anchor="${anchor}">${esc(sub)}</text>` : '');
      if (show('total')) body += side(PAD + 10, fmt(s.total), t('streak.total'), totalSub, 'start');
      if (show('longest')) body += side(W - PAD - 10, String(s.longest.length), longLabel, range(s.longest), 'end');
      body += `<text x="${cx}" y="${cy + r + 24}" class="muted" font-size="10" text-anchor="middle">${esc(range(s.current) || note)}</text>`;
      return frame(body, { width: W, height: cy + r + 36, theme, title: header, subtitle: `@${common.username}`, label });
    }

    // ---- cards: three tiles
    if (p.layout === 'cards') {
      const top = contentTop(!!header);
      const parts = [
        show('total') && { v: fmt(s.total), l: t('streak.total'), sub: totalSub, hot: false },
        show('current') && { v: String(s.current.length), l: curLabel, sub: range(s.current), hot: true },
        show('longest') && { v: String(s.longest.length), l: longLabel, sub: range(s.longest), hot: false }
      ].filter(Boolean) as { v: string; l: string; sub: string; hot: boolean }[];
      const W = 480;
      const gap = 10;
      const tw = (W - PAD * 2 - gap * (parts.length - 1)) / parts.length;
      const body = parts
        .map((x, i) => {
          const tx = PAD + i * (tw + gap);
          return (
            `<g${anim(animate, i)}><rect x="${tx.toFixed(1)}" y="${top}" width="${tw.toFixed(1)}" height="92" rx="12" class="${x.hot ? 'accent' : 'bd'}" fill-opacity="${x.hot ? 0.12 : 0.45}"/>` +
            (x.hot ? icon('flame', tx + 14, top + 14, 'accent', 0.9) : '') +
            `<text x="${(tx + tw / 2).toFixed(1)}" y="${top + 46}" class="${x.hot ? 'accent' : 'fg'}" font-size="28" font-weight="800" text-anchor="middle">${x.v}</text>` +
            `<text x="${(tx + tw / 2).toFixed(1)}" y="${top + 64}" class="muted" font-size="11" text-anchor="middle">${esc(x.l)}</text>` +
            (x.sub ? `<text x="${(tx + tw / 2).toFixed(1)}" y="${top + 80}" class="muted" font-size="9.5" text-anchor="middle">${esc(x.sub)}</text>` : '') +
            '</g>'
          );
        })
        .join('');
      return frame(body, { width: W, height: top + 92 + PAD, theme, title: header, subtitle: note || `@${common.username}`, label });
    }

    // ---- classic: three columns, ring around the current streak
    const top = contentTop(!!header);
    const W = 480;
    const cols = [
      show('total') && 'total',
      show('current') && 'current',
      show('longest') && 'longest'
    ].filter(Boolean) as string[];
    const colW = (W - PAD * 2) / cols.length;
    const cy = top + 44;
    let body = '';
    cols.forEach((k, i) => {
      const cx = PAD + colW * i + colW / 2;
      if (i) body += `<line x1="${PAD + colW * i}" y1="${cy - 34}" x2="${PAD + colW * i}" y2="${cy + 46}" class="sk-bd"/>`;
      if (k === 'current') {
        body +=
          `<g${anim(animate, i, 'pulse')}><circle cx="${cx}" cy="${cy - 6}" r="36" fill="none" class="sk-accent" stroke-width="5"/>` +
          `<rect x="${cx - 12}" y="${cy - 52}" width="24" height="20" class="bg"/>` +
          icon('flame', cx - 8, cy - 50, 'accent', 1) +
          `<text x="${cx}" y="${cy + 4}" class="accent" font-size="28" font-weight="800" text-anchor="middle">${s.current.length}</text></g>` +
          `<text x="${cx}" y="${cy + 50}" class="accent" font-size="12" font-weight="700" text-anchor="middle">${esc(curLabel)}</text>` +
          `<text x="${cx}" y="${cy + 66}" class="muted" font-size="10" text-anchor="middle">${esc(range(s.current))}</text>`;
      } else {
        const v = k === 'total' ? fmt(s.total) : String(s.longest.length);
        const l = k === 'total' ? t('streak.total') : longLabel;
        const sub = k === 'total' ? totalSub : range(s.longest);
        body +=
          `<g${anim(animate, i)}><text x="${cx}" y="${cy + 4}" class="fg" font-size="28" font-weight="700" text-anchor="middle">${v}</text>` +
          `<text x="${cx}" y="${cy + 26}" class="fg" font-size="12" text-anchor="middle">${esc(l)}</text>` +
          (sub ? `<text x="${cx}" y="${cy + 42}" class="muted" font-size="10" text-anchor="middle">${esc(sub)}</text>` : '') +
          '</g>';
      }
    });
    if (note) body += `<text x="${W / 2}" y="${cy + 84}" class="muted" font-size="9.5" text-anchor="middle">${esc(note)}</text>`;
    return frame(body, { width: W, height: cy + (note ? 96 : 80), theme, title: header, subtitle: `@${common.username}`, label });
  }
});
