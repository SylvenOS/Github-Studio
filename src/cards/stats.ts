import { defineCard } from './types';
import { bool, list, oneOf } from '../core/params';
import { compact, esc, fmt } from '../core/text';
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
const LAYOUTS = ['grid', 'compact', 'minimal'] as const;
const RANKS = ['none', 'letter', 'percentile'] as const;

type Data = ProfileMetrics & { grade?: Grade };

interface Params {
  layout: (typeof LAYOUTS)[number];
  showIcons: boolean;
  keys: string[];
  compactNumbers: boolean;
  footer: boolean;
  rank: (typeof RANKS)[number];
}

/** Circular activity-score badge (letter or percentile), drawn at (cx, cy). */
function rankRing(g: Grade, mode: 'letter' | 'percentile', cx: number, cy: number, animate: boolean, r = 40, caption = true): string {
  const c = 2 * Math.PI * r;
  const filled = Math.max(0.04, 1 - g.percentile / 100);
  const label = mode === 'letter' ? g.level : `${g.percentile < 1 ? '<1' : Math.round(g.percentile)}%`;
  const ring =
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" class="sk-accent" stroke-opacity=".2" stroke-width="${r > 30 ? 7 : 5}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" class="sk-accent${animate ? ' rk' : ''}" stroke-width="${r > 30 ? 7 : 5}" stroke-linecap="round" stroke-dasharray="${(c * filled).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>` +
    (animate ? `<style>@keyframes rk{from{stroke-dasharray:0 ${c.toFixed(1)}}}.rk{animation:rk 1.2s ease-out}@media (prefers-reduced-motion:reduce){.rk{animation:none}}</style>` : '');
  return (
    ring +
    `<text x="${cx}" y="${(cy + (mode === 'letter' ? 9 : 6) * (r / 40)).toFixed(1)}" text-anchor="middle" class="fg" font-size="${Math.round((mode === 'letter' ? 26 : 18) * (r / 40))}" font-weight="800">${esc(label)}</text>` +
    (caption
      ? `<text x="${cx}" y="${cy + r + 22}" text-anchor="middle" class="label muted" font-size="10.5">${mode === 'letter' ? `top ${g.percentile < 1 ? '<1' : Math.round(g.percentile)}%` : 'activity score'}</text>`
      : '')
  );
}

export const statsCard = defineCard<Params, Data>({
  id: 'stats',
  category: 'overview',
  tags: ['numbers', 'repos', 'stars', 'followers', 'summary'],
  variants: [
    { label: 'Default' },
    { label: 'Compact', params: { layout: 'compact' } },
    { label: 'Minimal', params: { layout: 'minimal' } },
    { label: 'With icons', params: { show_icons: 'true' } },
    { label: 'Extended', params: { show: 'commits,following,gists,age', show_icons: 'true' } },
    { label: 'With grade', params: { rank: 'letter', show_icons: 'true' } }
  ],
  title: 'GitHub Stats',
  description: 'Overview of repositories, stars, followers and activity.',
  params: [
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'grid', description: 'Card layout' },
    { name: 'show_icons', type: 'boolean', default: false, description: 'Show icons next to values' },
    { name: 'hide', type: 'list', description: `Stats to hide: ${Object.keys(STATS).join(', ')}` },
    { name: 'show', type: 'list', description: 'Extra stats to append, e.g. commits,following,gists,age' },
    { name: 'compact_numbers', type: 'boolean', default: false, description: 'Abbreviate numbers (1.2k)' },
    { name: 'footer', type: 'boolean', default: true, description: 'Show footer (grid layout)' },
    { name: 'rank', type: 'enum', options: [...RANKS], default: 'none', description: 'Activity-score ring: letter grade (S, A+ ... C) or top-N% percentile' }
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
      rank: oneOf(q.rank, RANKS, 'none')
    };
  },

  async load(client, p, common) {
    if (p.rank === 'none' || p.layout === 'minimal') return calculateProfileMetrics(await client.getUser(common.username));
    // the grade uses the realistic metrics (merged external PRs, consistency, ...), shared with other cards' caches
    const { metrics } = await loadInsights(client, common.username);
    return { ...metrics, grade: calculateGrade(metrics) };
  },

  toJSON: (m, p) => Object.fromEntries([['username', m.username], ...p.keys.map((k) => [k, STATS[k].value(m)]), ...(m.grade ? [['grade', m.grade]] : [])]),

  render(m, p, { theme, common, title, t }) {
    const num = p.compactNumbers ? compact : fmt;
    const header = title(t('title.stats'));
    const top = contentTop(!!header && p.layout !== 'minimal');
    const animate = common.animation;
    const items = p.keys.map((k) => ({ ...STATS[k], key: k }));
    const label = `GitHub stats for ${m.username}`;

    if (p.layout === 'minimal') {
      const shown = items.slice(0, 3);
      const body =
        `<text x="${PAD}" y="45" class="accent" font-size="14" font-weight="600">@${esc(m.username)}</text>` +
        `<g${anim(animate)} font-size="14">` +
        shown
          .map((s, i) => `<text x="${140 + i * 110}" y="45" class="fg">${esc(t(`stat.${s.key}.short`))}: <tspan font-weight="700">${num(s.value(m))}</tspan></text>`)
          .join('') +
        `</g>`;
      return frame(body, { width: 480, height: 80, theme, label });
    }

    const perRow = 4;
    const colW = 110;
    const rowH = 65;
    const visible = p.layout === 'compact' ? items.slice(0, perRow) : items;
    const rows = Math.ceil(visible.length / perRow);

    const cells = visible
      .map((s, i) => {
        const x = PAD + (i % perRow) * colW;
        const y = top + 20 + Math.floor(i / perRow) * rowH;
        const labelText = p.layout === 'compact' ? t(`stat.${s.key}.short`) : t(`stat.${s.key}` as 'stat.repos');
        return (
          `<g transform="translate(${x} ${y})"${anim(animate, i)}>` +
          (p.showIcons ? icon(s.icon, 0, -12) : '') +
          `<text x="${p.showIcons ? 20 : 0}" y="0" class="value fg">${num(s.value(m))}</text>` +
          `<text x="0" y="20" class="label muted">${esc(labelText)}</text></g>`
        );
      })
      .join('');

    const ringOn = p.rank !== 'none' && !!m.grade;
    const W = ringOn ? 600 : 480;
    if (p.layout === 'compact') {
      const ring = ringOn ? rankRing(m.grade!, p.rank as 'letter' | 'percentile', W - PAD - 50, top + 16, animate, 26, false) : '';
      return frame(cells + ring, { width: W, height: top + rowH + (ringOn ? 12 : 0), theme, title: header, subtitle: `@${m.username}`, label });
    }

    const dividers = Array.from({ length: p.footer ? rows : rows - 1 }, (_, r) => {
      const y = top + (r + 1) * rowH - 10;
      return `<line x1="${PAD}" y1="${y}" x2="${(ringOn ? 465 : 480 - PAD)}" y2="${y}" class="sk-bd" stroke-width="1"/>`;
    }).join('');
    const footerY = top + rows * rowH + 15;
    const footer = p.footer
      ? `<text x="${PAD}" y="${footerY}" class="label muted">${t('misc.updated')} ${new Date().toISOString().slice(0, 10)}</text>` +
        `<text x="${W - PAD}" y="${footerY}" class="label muted" text-anchor="end">GitPulse</text>`
      : '';

    const bodyH = top + rows * rowH + (p.footer ? 35 : 10);
    const ring = ringOn ? rankRing(m.grade!, p.rank as 'letter' | 'percentile', W - PAD - 50, Math.max(top + 45, (top + rows * rowH) / 2 + 10), animate) : '';
    return frame(cells + dividers + footer + ring, {
      width: W,
      height: Math.max(bodyH, ringOn ? top + 140 : 0),
      theme,
      title: header,
      subtitle: `@${m.username}`,
      label
    });
  }
});
