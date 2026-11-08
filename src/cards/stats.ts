import { defineCard } from './types';
import { bool, color, int, list, oneOf } from '../core/params';
import { compact, esc, fmt } from '../core/text';
import type { CalendarDay } from '../github/client';
import { calculateProfileMetrics, loadInsights, type ProfileMetrics } from '../metrics';
import { calculateGrade, type Grade } from '../metrics/grade';
import { anim, contentTop, frame, PAD } from '../svg/frame';
import { icon, type IconName } from '../svg/icons';

interface StatDef {
  icon: IconName;
  value: (m: ProfileMetrics) => number;
}

/** Every stat the card can show. Add an entry here to make it available via `hide=`/`show=`. */
export const STATS: Record<string, StatDef> = {
  repos: { icon: 'repo', value: (m) => m.repositories },
  stars: { icon: 'star', value: (m) => m.stars },
  forks: { icon: 'fork', value: (m) => m.forks },
  followers: { icon: 'people', value: (m) => m.followers },
  following: { icon: 'people', value: (m) => m.following },
  gists: { icon: 'repo', value: (m) => m.gists },
  commits: { icon: 'commit', value: (m) => m.commits },
  contributions: { icon: 'commit', value: (m) => m.contributions },
  prs: { icon: 'pr', value: (m) => m.pullRequests },
  issues: { icon: 'issue', value: (m) => m.issues },
  reviews: { icon: 'review', value: (m) => m.reviews },
  age: { icon: 'people', value: (m) => m.accountAgeYears }
};

const DEFAULT_ORDER = ['repos', 'stars', 'forks', 'followers', 'contributions', 'prs', 'issues', 'reviews'];
const LAYOUTS = ['grid', 'classic', 'tiles', 'row', 'compact', 'minimal'] as const;
const RANKS = ['none', 'letter', 'percentile', 'badge', 'stars', 'bar'] as const;
const LABELS = ['full', 'short', 'none'] as const;
const SORTS = ['default', 'value'] as const;

type Data = ProfileMetrics & { grade?: Grade; weeks?: number[] };

interface Params {
  layout: (typeof LAYOUTS)[number];
  showIcons: boolean;
  keys: string[];
  compactNumbers: boolean;
  footer: boolean;
  rank: (typeof RANKS)[number];
  columns: number;
  ringColor?: string;
  labels: (typeof LABELS)[number];
  sort: (typeof SORTS)[number];
  highlight: string[];
  sparkline: boolean;
  footerText?: string;
  dividers: boolean;
}

const topPct = (g: Grade) => (g.percentile < 1 ? '<1' : String(Math.round(g.percentile)));

/** Grade widget drawn in a 120px column on the right: ring (letter or percentile), badge or five stars. */
function rankWidget(g: Grade, mode: 'letter' | 'percentile' | 'badge' | 'stars', cx: number, cy: number, animate: boolean, ringColor: string | undefined, r = 40, caption = true): string {
  const stroke = ringColor ? ` stroke="${ringColor}"` : ' class="sk-accent"';
  const cap = (text: string) => (caption ? `<text x="${cx}" y="${cy + r + 22}" text-anchor="middle" class="label muted" font-size="10.5">${esc(text)}</text>` : '');
  if (mode === 'badge') {
    return (
      `<rect x="${cx - 38}" y="${cy - 38}" width="76" height="76" rx="20"${ringColor ? ` fill="${ringColor}"` : ' class="accent"'} fill-opacity=".14"/>` +
      `<rect x="${cx - 38}" y="${cy - 38}" width="76" height="76" rx="20" fill="none"${stroke} stroke-width="2.5"/>` +
      `<text x="${cx}" y="${cy + 12}" text-anchor="middle" class="fg" font-size="34" font-weight="800">${esc(g.level)}</text>` +
      cap(`top ${topPct(g)}%`)
    );
  }
  if (mode === 'stars') {
    const lit = Math.max(1, Math.min(5, Math.round((1 - g.percentile / 100) * 5 + 0.4)));
    const stars = [0, 1, 2, 3, 4].map((i) => `<g${i < lit ? '' : ' opacity=".22"'}>${icon('star', cx - 54 + i * 22, cy - 6, 'accent', 1.15)}</g>`).join('');
    return (
      `<text x="${cx}" y="${cy - 14}" text-anchor="middle" class="fg" font-size="30" font-weight="800">${esc(g.level)}</text>` + stars +
      `<text x="${cx}" y="${cy + 34}" text-anchor="middle" class="label muted" font-size="10.5">top ${topPct(g)}%</text>`
    );
  }
  const c = 2 * Math.PI * r;
  const sw = r > 30 ? 7 : 5;
  const filled = Math.max(0.04, 1 - g.percentile / 100);
  const label = mode === 'letter' ? g.level : `${topPct(g)}%`;
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"${stroke} stroke-opacity=".2" stroke-width="${sw}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"${stroke} stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(c * filled).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"${animate ? ' class="rk"' : ''}/>` +
    (animate ? `<style>@keyframes rk{from{stroke-dasharray:0 ${c.toFixed(1)}}}.rk{animation:rk 1.2s ease-out}@media (prefers-reduced-motion:reduce){.rk{animation:none}}</style>` : '') +
    `<text x="${cx}" y="${(cy + (mode === 'letter' ? 9 : 6) * (r / 40)).toFixed(1)}" text-anchor="middle" class="fg" font-size="${Math.round((mode === 'letter' ? 26 : 18) * (r / 40))}" font-weight="800">${esc(label)}</text>` +
    cap(mode === 'letter' ? `top ${topPct(g)}%` : 'activity score')
  );
}

export const statsCard = defineCard<Params, Data>({
  id: 'stats',
  category: 'overview',
  tags: ['numbers', 'repos', 'stars', 'followers', 'summary', 'grade', 'rank', 'sparkline'],
  variants: [
    { label: 'Default' },
    { label: 'Compact', params: { layout: 'compact' } },
    { label: 'Minimal', params: { layout: 'minimal' } },
    { label: 'With icons', params: { show_icons: 'true' } },
    { label: 'Extended', params: { show: 'commits,following,gists,age', show_icons: 'true' } },
    { label: 'With grade', params: { rank: 'letter', show_icons: 'true' } },
    { label: 'Classic list', params: { layout: 'classic', rank: 'letter' } },
    { label: 'Tiles', params: { layout: 'tiles' } },
    { label: 'Tiles, 3 columns', params: { layout: 'tiles', columns: '3', show: 'commits' } },
    { label: 'Single row', params: { layout: 'row', hide: 'forks,issues,reviews,repos' } },
    { label: 'Badge grade', params: { layout: 'classic', rank: 'badge', show_icons: 'true' } },
    { label: 'Star rating', params: { layout: 'tiles', rank: 'stars' } },
    { label: 'Grade bar', params: { rank: 'bar', show_icons: 'true' } },
    { label: 'With activity sparkline', params: { sparkline: 'true', show_icons: 'true' } },
    { label: 'Stars highlighted', params: { highlight: 'stars,followers', show_icons: 'true' } },
    { label: 'Largest first', params: { sort: 'value', show_icons: 'true' } }
  ],
  title: 'GitHub Stats',
  description: 'Overview of repositories, stars, followers and activity: six layouts, an activity grade as a ring, badge, stars or bar, an optional 6-month sparkline, highlights and sorting.',
  params: [
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'grid', description: 'grid, classic (list with icons), tiles, row, compact or minimal' },
    { name: 'columns', type: 'number', default: 4, min: 1, max: 6, description: 'Columns (grid and tiles; classic uses 1-2)' },
    { name: 'show_icons', type: 'boolean', default: false, description: 'Show icons next to values' },
    { name: 'hide', type: 'list', description: `Stats to hide: ${Object.keys(STATS).join(', ')}` },
    { name: 'show', type: 'list', description: 'Extra stats to append, e.g. commits,following,gists,age' },
    { name: 'sort', type: 'enum', options: [...SORTS], default: 'default', description: 'Keep the usual order, or largest numbers first' },
    { name: 'highlight', type: 'list', description: 'Stats drawn in the accent colour, e.g. stars,followers' },
    { name: 'labels', type: 'enum', options: [...LABELS], default: 'full', description: 'Full, short or no labels under the numbers' },
    { name: 'compact_numbers', type: 'boolean', default: false, description: 'Abbreviate numbers (1.2k)' },
    { name: 'rank', type: 'enum', options: [...RANKS], default: 'none', description: 'Activity grade: ring with letter or percentile, badge, five stars, or a progress bar' },
    { name: 'ring_color', type: 'color', description: 'Colour of the grade ring/badge (default: accent)' },
    { name: 'sparkline', type: 'boolean', default: false, description: 'Add a 6-month contribution sparkline' },
    { name: 'dividers', type: 'boolean', default: true, description: 'Lines between rows (grid layout)' },
    { name: 'footer', type: 'boolean', default: true, description: 'Show footer (grid layout)' },
    { name: 'footer_text', type: 'string', description: 'Your own footer text instead of the update date (max 40)' }
  ],

  parse(q) {
    const layout = oneOf(q.layout, LAYOUTS, 'grid');
    const hide = new Set(list(q.hide));
    const extra = list(q.show).filter((k) => !DEFAULT_ORDER.includes(k));
    // compact/minimal only have room for a few stats, so ones asked for explicitly go first
    const ordered = layout === 'grid' ? [...DEFAULT_ORDER, ...extra] : [...extra, ...DEFAULT_ORDER];
    const keys = ordered.filter((k) => STATS[k] && !hide.has(k));
    return {
      layout,
      showIcons: bool(q.show_icons, false),
      keys: keys.length ? keys : DEFAULT_ORDER,
      compactNumbers: bool(q.compact_numbers, false),
      footer: bool(q.footer, true),
      rank: oneOf(q.rank, RANKS, 'none'),
      columns: int(q.columns, 4, 1, 6),
      ringColor: color(q.ring_color),
      labels: oneOf(q.labels, LABELS, 'full'),
      sort: oneOf(q.sort, SORTS, 'default'),
      highlight: list(q.highlight),
      sparkline: bool(q.sparkline, false),
      footerText: q.footer_text ? q.footer_text.trim().slice(0, 40) : undefined,
      dividers: bool(q.dividers, true)
    };
  },

  async load(client, p, common) {
    const wantGrade = p.rank !== 'none' && p.layout !== 'minimal';
    let data: Data;
    if (wantGrade) {
      // the grade uses the realistic metrics (merged external PRs, consistency, ...), shared with other cards' caches
      const { metrics } = await loadInsights(client, common.username);
      data = { ...metrics, grade: calculateGrade(metrics) };
    } else {
      data = calculateProfileMetrics(await client.getUser(common.username));
    }
    if (p.sparkline && p.layout !== 'minimal') {
      const days = await client.getCalendar(common.username).catch(() => [] as CalendarDay[]);
      const recent = days.slice(-26 * 7);
      const weeks: number[] = [];
      for (let i = 0; i < recent.length; i += 7) weeks.push(recent.slice(i, i + 7).reduce((a, d) => a + d.count, 0));
      data.weeks = weeks;
    }
    return data;
  },

  toJSON: (m, p) => Object.fromEntries([['username', m.username], ...p.keys.map((k) => [k, STATS[k].value(m)]), ...(m.grade ? [['grade', m.grade]] : []), ...(m.weeks ? [['weeks', m.weeks]] : [])]),

  render(m, p, { theme, common, title, t }) {
    const num = p.compactNumbers ? compact : fmt;
    const header = title(t('title.stats'));
    const top = contentTop(!!header && p.layout !== 'minimal');
    const animate = common.animation;
    let items = p.keys.map((k) => ({ ...STATS[k], key: k }));
    if (p.sort === 'value') items = [...items].sort((a, b) => b.value(m) - a.value(m));
    const hot = new Set(p.highlight);
    const label = `GitHub stats for ${m.username}`;
    const labelOf = (k: string, short = false) => (p.labels === 'none' ? '' : t(`stat.${k}${short || p.labels === 'short' ? '.short' : ''}` as 'stat.repos'));
    const valueCls = (k: string) => (hot.has(k) ? 'accent value' : 'fg value');
    const valueStyle = (k: string) => (hot.has(k) ? ' font-weight="800"' : '');

    if (p.layout === 'minimal') {
      const shown = items.slice(0, 3);
      const body =
        `<text x="${PAD}" y="45" class="accent" font-size="14" font-weight="600">@${esc(m.username)}</text>` +
        `<g${anim(animate)} font-size="14">` +
        shown.map((s, i) => `<text x="${140 + i * 110}" y="45" class="fg">${esc(t(`stat.${s.key}.short`))}: <tspan font-weight="700"${hot.has(s.key) ? ' class="accent"' : ''}>${num(s.value(m))}</tspan></text>`).join('') +
        `</g>`;
      return frame(body, { width: 480, height: 80, theme, label });
    }

    const ringMode = p.rank === 'letter' || p.rank === 'percentile' || p.rank === 'badge' || p.rank === 'stars' ? p.rank : null;
    const sideOn = !!ringMode && !!m.grade;
    const sideW = sideOn ? 120 : 0;
    let W = 480;
    let bottom = top;
    /** Where the side widget centres: above the footer, if any. */
    let centerBottom: number | null = null;

    let body = '';
    if (p.layout === 'classic') {
      const cols = Math.min(2, p.columns === 4 ? 1 : p.columns);
      W = 480 + (cols === 2 ? 120 : 0);
      const colW = (W - PAD * 2 - sideW) / cols;
      const per = Math.ceil(items.length / cols);
      body = items
        .map((s, i) => {
          const x = PAD + Math.floor(i / per) * colW;
          const y = top + 18 + (i % per) * 26;
          return (
            `<g${anim(animate, i)}>` + icon(s.icon, x, y - 12, 'accent', 0.9) +
            `<text x="${x + 24}" y="${y}" class="fg" font-size="13.5">${esc(labelOf(s.key) || s.key)}:</text>` +
            `<text x="${x + colW - 16}" y="${y}" class="${valueCls(s.key)}" text-anchor="end" font-weight="700">${num(s.value(m))}</text></g>`
          );
        })
        .join('');
      bottom = top + 18 + per * 26 - 10;
    } else if (p.layout === 'tiles') {
      const cols = Math.max(1, Math.min(p.columns, items.length));
      const gap = 10;
      const tileW = cols >= 4 ? 118 : 150;
      W = PAD * 2 + cols * tileW + (cols - 1) * gap + sideW;
      body = items
        .map((s, i) => {
          const x = PAD + (i % cols) * (tileW + gap);
          const y = top + Math.floor(i / cols) * (74 + gap);
          return (
            `<g${anim(animate, i)}><rect x="${x}" y="${y}" width="${tileW}" height="74" rx="12" class="bd" fill-opacity=".45"/>` +
            `<circle cx="${x + 24}" cy="${y + 24}" r="13" class="accent" fill-opacity=".14"/>` + icon(s.icon, x + 16, y + 16, 'accent', 1) +
            (p.labels === 'none' ? '' : `<text x="${x + 14}" y="${y + 60}" class="muted" font-size="11">${esc(labelOf(s.key, true))}</text>`) +
            `<text x="${x + tileW - 14}" y="${y + 31}" class="${valueCls(s.key)}" text-anchor="end" style="font-size:20px" font-weight="800">${num(s.value(m))}</text></g>`
          );
        })
        .join('');
      bottom = top + Math.ceil(items.length / cols) * (74 + gap) - gap;
    } else if (p.layout === 'row') {
      const shown = items.slice(0, Math.min(items.length, p.columns === 4 ? 5 : p.columns));
      const cw = 100;
      W = PAD * 2 + shown.length * cw + sideW;
      const cy = top + 30;
      body = shown
        .map((s, i) => {
          const cx = PAD + i * cw + cw / 2;
          return (
            (i ? `<line x1="${PAD + i * cw}" y1="${cy - 22}" x2="${PAD + i * cw}" y2="${cy + 34}" class="sk-bd"/>` : '') +
            `<g${anim(animate, i)}>` + (p.showIcons ? icon(s.icon, cx - 8, cy - 40, 'accent', 1) : '') +
            `<text x="${cx}" y="${cy + 6}" class="${valueCls(s.key)}" text-anchor="middle" style="font-size:24px" font-weight="800">${num(s.value(m))}</text>` +
            (p.labels === 'none' ? '' : `<text x="${cx}" y="${cy + 26}" class="label muted" text-anchor="middle">${esc(labelOf(s.key, true))}</text>`) + '</g>'
          );
        })
        .join('');
      bottom = cy + 40;
    } else {
      // grid / compact
      const perRow = Math.max(1, Math.min(p.columns, 6));
      const colW = perRow === 4 ? 110 : Math.round(440 / perRow);
      const rowH = 65;
      const visible = p.layout === 'compact' ? items.slice(0, perRow) : items;
      const rows = Math.ceil(visible.length / perRow);
      W = (perRow === 4 ? 480 : PAD * 2 + perRow * colW) + sideW;
      const cells = visible
        .map((s, i) => {
          const x = PAD + (i % perRow) * colW;
          const y = top + 20 + Math.floor(i / perRow) * rowH;
          const labelText = labelOf(s.key, p.layout === 'compact');
          return (
            `<g transform="translate(${x} ${y})"${anim(animate, i)}>` +
            (p.showIcons ? icon(s.icon, 0, -12) : '') +
            `<text x="${p.showIcons ? 20 : 0}" y="0" class="${valueCls(s.key)}"${valueStyle(s.key)}>${num(s.value(m))}</text>` +
            (labelText ? `<text x="0" y="20" class="label muted">${esc(labelText)}</text>` : '') + '</g>'
          );
        })
        .join('');
      if (p.layout === 'compact') {
        body = cells;
        bottom = top + rowH - 10;
      } else {
        const lines = p.dividers ? Array.from({ length: p.footer ? rows : rows - 1 }, (_, r) => `<line x1="${PAD}" y1="${top + (r + 1) * rowH - 10}" x2="${W - PAD - sideW + (sideOn ? 5 : 0)}" y2="${top + (r + 1) * rowH - 10}" class="sk-bd" stroke-width="1"/>`).join('') : '';
        const footerY = top + rows * rowH + 15;
        const foot = p.footer
          ? `<text x="${PAD}" y="${footerY}" class="label muted">${p.footerText ? esc(p.footerText) : `${t('misc.updated')} ${new Date().toISOString().slice(0, 10)}`}</text>` +
            `<text x="${W - PAD}" y="${footerY}" class="label muted" text-anchor="end">ProfileFoundry</text>`
          : '';
        body = cells + lines + foot;
        bottom = top + rows * rowH + (p.footer ? 20 : -5);
        centerBottom = top + rows * rowH - 14;
      }
    }

    let height = bottom + PAD;
    // side grade widget, vertically centred on the content
    if (sideOn) {
      const compactRing = p.layout === 'compact';
      const cy = compactRing ? top + 22 : Math.max(top + 46, (top + (centerBottom ?? bottom)) / 2 - 4);
      body += rankWidget(m.grade!, ringMode as 'letter' | 'percentile' | 'badge' | 'stars', W - PAD - 50, cy, animate, p.ringColor, p.layout === 'compact' ? 26 : 40, p.layout !== 'compact');
      height = Math.max(height, cy + (compactRing ? 40 : p.rank === 'stars' ? 56 : 74));
    }
    // grade bar: a full-width progress strip under the numbers
    if (p.rank === 'bar' && m.grade) {
      const bw = W - PAD * 2;
      const fill = Math.max(0.03, 1 - m.grade.percentile / 100);
      const by = height - 4;
      body +=
        `<text x="${PAD}" y="${by + 4}" class="label muted">Activity grade</text>` +
        `<text x="${W - PAD}" y="${by + 4}" class="fg" font-size="12" font-weight="700" text-anchor="end">${esc(m.grade.level)} · top ${topPct(m.grade)}%</text>` +
        `<rect x="${PAD}" y="${by + 14}" width="${bw}" height="8" rx="4" class="bd"/>` +
        `<rect x="${PAD}" y="${by + 14}" width="${(bw * fill).toFixed(1)}" height="8" rx="4"${p.ringColor ? ` fill="${p.ringColor}"` : ' class="accent"'}/>`;
      height = by + 38;
    }
    // 6-month sparkline
    if (p.sparkline && m.weeks?.length) {
      const sw = W - PAD * 2;
      const sy = height + 4;
      const max = Math.max(1, ...m.weeks);
      const step = sw / Math.max(1, m.weeks.length - 1);
      const pts = m.weeks.map((v, i) => [PAD + i * step, sy + 38 - (v / max) * 34] as const);
      const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
      body +=
        `<text x="${PAD}" y="${sy + 2}" class="label muted" font-size="10.5">Last 6 months</text>` +
        `<text x="${W - PAD}" y="${sy + 2}" class="label muted" font-size="10.5" text-anchor="end">${fmt(m.weeks.reduce((a, b) => a + b, 0))} contributions</text>` +
        `<path d="${line} L${(PAD + sw).toFixed(1)} ${sy + 40} L${PAD} ${sy + 40} Z" class="ser" fill-opacity=".14"/>` +
        `<path d="${line}" fill="none" class="sk-ser" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      height = sy + 52;
    }

    return frame(body, { width: W, height, theme, title: header, subtitle: `@${m.username}`, label });
  }
});
