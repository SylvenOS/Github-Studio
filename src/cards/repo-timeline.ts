import { defineCard } from './types';
import { bool, int, oneOf } from '../core/params';
import { compact, esc } from '../core/text';
import type { RepoSummary } from '../github/client';
import { anim, contentTop, frame, messageCard, PAD } from '../svg/frame';

const METRICS = ['repos', 'stars', 'forks'] as const;
const STYLES = ['bars', 'line', 'area', 'dots', 'lollipop'] as const;

interface Params {
  metric: (typeof METRICS)[number];
  style: (typeof STYLES)[number];
  years: number;
  cumulative: boolean;
  archived: boolean;
  empty: boolean;
  values: boolean;
  grid: boolean;
  axis: boolean;
  highlight: boolean;
  summary: boolean;
  height: number;
  gap: number;
  round: number;
  labels: 'full' | 'short';
}

interface Year {
  year: number;
  value: number;
}

/** Repositories (or their stars) grouped by the year they were created. Repos without a date are skipped. */
export function yearsOf(repos: RepoSummary[], p: Pick<Params, 'metric' | 'cumulative' | 'archived' | 'empty' | 'years'>): Year[] {
  const dated = repos.filter((r) => r.createdAt && (p.archived || !r.archived));
  if (!dated.length) return [];
  const by = new Map<number, number>();
  for (const r of dated) {
    const y = Number((r.createdAt as string).slice(0, 4));
    by.set(y, (by.get(y) ?? 0) + (p.metric === 'repos' ? 1 : p.metric === 'stars' ? r.stars : r.forks));
  }
  const first = Math.min(...by.keys());
  const last = Math.max(...by.keys(), new Date().getUTCFullYear());
  const out: Year[] = [];
  let run = 0;
  for (let y = first; y <= last; y++) {
    run += by.get(y) ?? 0;
    const v = p.cumulative ? run : by.get(y) ?? 0;
    if (p.empty || by.has(y) || p.cumulative) out.push({ year: y, value: v });
  }
  return out.slice(-p.years);
}

export const repoTimelineCard = defineCard<Params, RepoSummary[]>({
  id: 'repo-timeline',
  aliases: ['timeline', 'repos-by-year'],
  category: 'repositories',
  tags: ['timeline', 'history', 'years', 'repositories', 'growth'],
  variants: [
    { label: 'Repos per year' },
    { label: 'Stars by year', params: { metric: 'stars' } },
    { label: 'Growth curve', params: { style: 'area', cumulative: 'true' } },
    { label: 'Lollipop', params: { style: 'lollipop', values: 'true' } },
    { label: 'Dotted line', params: { style: 'line', grid: 'true' } },
    { label: 'Last 5 years', params: { years: '5', values: 'true' } }
  ],
  title: 'Repository Timeline',
  description: 'How a profile grew: repositories (or their stars and forks) by creation year, as bars, line, area, dots or lollipops.',
  params: [
    { name: 'metric', type: 'enum', options: [...METRICS], default: 'repos', description: 'What to count per year' },
    { name: 'style', type: 'enum', options: [...STYLES], default: 'bars', description: 'Chart style' },
    { name: 'years', type: 'number', default: 12, min: 2, max: 20, description: 'Most recent years to show' },
    { name: 'cumulative', type: 'boolean', default: false, description: 'Running total instead of per-year values' },
    { name: 'archived', type: 'boolean', default: true, description: 'Include archived repositories' },
    { name: 'empty', type: 'boolean', default: true, description: 'Show years with no activity' },
    { name: 'values', type: 'boolean', default: false, description: 'Print the value above each point' },
    { name: 'grid', type: 'boolean', default: false, description: 'Horizontal grid lines' },
    { name: 'axis', type: 'boolean', default: true, description: 'Year labels under the chart' },
    { name: 'highlight', type: 'boolean', default: true, description: 'Colour the best year in the accent colour' },
    { name: 'summary', type: 'boolean', default: true, description: 'Headline numbers above the chart' },
    { name: 'height', type: 'number', default: 130, min: 70, max: 300, description: 'Chart height in px' },
    { name: 'gap', type: 'number', default: 6, min: 1, max: 24, description: 'Space between bars' },
    { name: 'round', type: 'number', default: 3, min: 0, max: 12, description: 'Bar corner radius' },
    { name: 'labels', type: 'enum', options: ['full', 'short'], default: 'short', description: '2026 or ’26' }
  ],
  parse: (q) => ({
    metric: oneOf(q.metric, METRICS, 'repos'),
    style: oneOf(q.style, STYLES, 'bars'),
    years: int(q.years, 12, 2, 20),
    cumulative: bool(q.cumulative, false),
    archived: bool(q.archived, true),
    empty: bool(q.empty, true),
    values: bool(q.values, false),
    grid: bool(q.grid, false),
    axis: bool(q.axis, true),
    highlight: bool(q.highlight, true),
    summary: bool(q.summary, true),
    height: int(q.height, 130, 70, 300),
    gap: int(q.gap, 6, 1, 24),
    round: int(q.round, 3, 0, 12),
    labels: oneOf(q.labels, ['full', 'short'] as const, 'short')
  }),
  load: async (client, _p, common) => (await client.getUser(common.username)).repos,
  toJSON: (repos, p) => ({ metric: p.metric, years: yearsOf(repos, p) }),

  render(repos, p, { theme, common, title }) {
    const header = title('Repository Timeline');
    const years = yearsOf(repos, p);
    if (!years.length) return messageCard('No repositories with a creation date yet.', theme, { title: header ?? 'Repository Timeline', tone: 'info' });

    const n = years.length;
    const width = Math.max(340, PAD * 2 + n * 34);
    const top = contentTop(!!header);
    const total = years.reduce((s, y) => s + (p.cumulative ? 0 : y.value), 0);
    const best = years.reduce((a, b) => (b.value > a.value ? b : a));
    const sumH = p.summary ? 44 : 0;
    const valuePad = p.values ? 14 : 0;
    const cy = top + sumH + valuePad;
    const H = p.height;
    const max = Math.max(1, ...years.map((y) => y.value));
    const inner = width - PAD * 2;
    const step = inner / n;
    const bw = Math.max(3, step - p.gap);
    const x = (i: number) => PAD + i * step + step / 2;
    const yv = (v: number) => cy + H - (v / max) * H;
    const unit = p.metric === 'repos' ? 'repositories' : p.metric;
    const lbl = (y: number) => (p.labels === 'full' ? String(y) : `’${String(y).slice(2)}`);
    const dim = (y: Year) => (p.highlight && y !== best ? ' fill-opacity=".55"' : '');

    let svg = '';
    if (p.summary) {
      const head = p.cumulative ? years[n - 1].value : total;
      svg += `<text x="${PAD}" y="${top + 16}" class="value fg" font-size="22" font-weight="700">${compact(head)}</text>`;
      svg += `<text x="${PAD}" y="${top + 33}" class="label muted" font-size="11">${esc(unit)} · ${years[0].year}–${years[n - 1].year}</text>`;
      svg += `<text x="${width - PAD}" y="${top + 16}" class="fg" font-size="13" font-weight="600" text-anchor="end">${best.year}</text>`;
      svg += `<text x="${width - PAD}" y="${top + 33}" class="label muted" font-size="11" text-anchor="end">best year · ${compact(best.value)}</text>`;
    }
    if (p.grid) {
      for (let g = 0; g <= 3; g++) {
        const gy = cy + (H * g) / 3;
        svg += `<line x1="${PAD}" y1="${gy}" x2="${width - PAD}" y2="${gy}" class="sk-bd" stroke-dasharray="3 4" stroke-opacity="${g === 3 ? 1 : 0.6}"/>`;
      }
    } else {
      svg += `<line x1="${PAD}" y1="${cy + H}" x2="${width - PAD}" y2="${cy + H}" class="sk-bd"/>`;
    }

    const pts = years.map((y, i) => `${x(i).toFixed(1)},${yv(y.value).toFixed(1)}`);
    if (p.style === 'area' || p.style === 'line') {
      const line = `M${pts.join('L')}`;
      if (p.style === 'area') svg += `<path d="${line}L${x(n - 1).toFixed(1)},${cy + H}L${x(0).toFixed(1)},${cy + H}Z" class="accent" fill-opacity=".18"/>`;
      svg += `<path d="${line}" fill="none" class="sk-accent" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    years.forEach((y, i) => {
      const cx = x(i);
      const py = yv(y.value);
      const a = anim(common.animation, i);
      let shape = '';
      if (p.style === 'bars') {
        const h = Math.max(y.value > 0 ? 2 : 0, cy + H - py);
        shape = `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(cy + H - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(p.round, bw / 2)}" class="accent"${dim(y)}/>`;
      } else if (p.style === 'lollipop') {
        shape = `<line x1="${cx}" y1="${cy + H}" x2="${cx}" y2="${py}" class="sk-accent" stroke-width="2"${y.value ? '' : ' stroke-opacity=".3"'}/><circle cx="${cx}" cy="${py}" r="${p.highlight && y === best ? 5.5 : 4}" class="accent"/>`;
      } else {
        shape = `<circle cx="${cx}" cy="${py}" r="${p.style === 'dots' ? Math.max(3, Math.min(9, 3 + (y.value / max) * 6)) : p.highlight && y === best ? 4.5 : 3}" class="accent"${p.style === 'dots' ? dim(y) : ''}/>`;
      }
      svg += `<g${a}>${shape}`;
      if (p.values && (y.value > 0 || p.style !== 'bars')) svg += `<text x="${cx}" y="${(p.style === 'bars' ? py - 5 : py - 9).toFixed(1)}" class="label muted" font-size="9.5" text-anchor="middle">${compact(y.value)}</text>`;
      svg += `</g>`;
      if (p.axis && (n <= 12 || i % 2 === (n - 1) % 2)) svg += `<text x="${cx}" y="${cy + H + 16}" class="label muted" font-size="10" text-anchor="middle">${lbl(y.year)}</text>`;
    });

    const height = cy + H + (p.axis ? 16 : 0) + PAD;
    return frame(svg, {
      width,
      height,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `Repository timeline for ${common.username}: ${compact(total)} ${unit}`
    });
  }
});
