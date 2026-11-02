import { defineCard } from './types';
import { bool, int, list, oneOf } from '../core/params';
import { compact, emojify, esc, truncate, wrap } from '../core/text';
import type { RepoSummary } from '../github/client';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, messageCard, PAD } from '../svg/frame';
import { icon } from '../svg/icons';

const SORTS = ['stars', 'forks', 'updated'] as const;
const LAYOUTS = ['list', 'grid', 'table', 'ranked'] as const;

interface Params {
  limit: number;
  sort: (typeof SORTS)[number];
  exclude: string[];
  skipArchived: boolean;
  layout?: (typeof LAYOUTS)[number];
  language?: string[];
  minStars?: number;
  descriptions?: boolean;
  updated?: boolean;
}

export function selectRepos(repos: RepoSummary[], p: Params): RepoSummary[] {
  const excluded = new Set(p.exclude.map((e) => e.toLowerCase()));
  const cmp: Record<Params['sort'], (a: RepoSummary, b: RepoSummary) => number> = {
    stars: (a, b) => b.stars - a.stars || b.forks - a.forks,
    forks: (a, b) => b.forks - a.forks || b.stars - a.stars,
    updated: (a, b) => (b.pushedAt ?? '').localeCompare(a.pushedAt ?? '')
  };
  return repos
    .filter((r) => !excluded.has(r.name.toLowerCase()) && !(p.skipArchived && r.archived))
    .filter((r) => !p.language?.length || (r.language && p.language.includes(r.language.toLowerCase())))
    .filter((r) => r.stars >= (p.minStars ?? 0))
    .sort(cmp[p.sort])
    .slice(0, p.limit);
}

export const topReposCard = defineCard<Params, RepoSummary[]>({
  id: 'top-repos',
  category: 'repositories',
  tags: ['projects', 'stars', 'showcase'],
  variants: [
    { label: 'Top 5 by stars' },
    { label: 'Top 3', params: { limit: '3' } },
    { label: 'Most forked', params: { sort: 'forks' } },
    { label: 'Recently active', params: { sort: 'updated', updated: 'true' } },
    { label: 'Grid', params: { layout: 'grid', limit: '6' } },
    { label: 'Table', params: { layout: 'table', limit: '8' } },
    { label: 'Leaderboard', params: { layout: 'ranked' } }
  ],
  title: 'Top Repositories',
  description: 'The user’s best repositories, ranked by stars, forks or recent activity.',
  params: [
    { name: 'limit', type: 'number', default: 5, min: 1, max: 10, description: 'Number of repositories' },
    { name: 'sort', type: 'enum', options: [...SORTS], default: 'stars', description: 'Ranking' },
    { name: 'exclude', type: 'list', description: 'Repository names to skip' },
    { name: 'skip_archived', type: 'boolean', default: false, description: 'Skip archived repositories' },
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'list', description: 'list, 2-column grid, compact table or ranked leaderboard' },
    { name: 'language', type: 'list', description: 'Only repositories in these languages, e.g. TypeScript,Rust' },
    { name: 'min_stars', type: 'number', default: 0, min: 0, max: 1000000, description: 'Hide repositories with fewer stars' },
    { name: 'descriptions', type: 'boolean', default: true, description: 'Show descriptions' },
    { name: 'updated', type: 'boolean', default: false, description: 'Show when each repository was last pushed' }
  ],
  parse: (q) => ({
    limit: int(q.limit, 5, 1, 10),
    sort: oneOf(q.sort, SORTS, 'stars'),
    exclude: list(q.exclude),
    skipArchived: bool(q.skip_archived, false),
    layout: oneOf(q.layout, LAYOUTS, 'list'),
    language: list(q.language).map((l) => l.toLowerCase()),
    minStars: int(q.min_stars, 0, 0, 1_000_000),
    descriptions: bool(q.descriptions, true),
    updated: bool(q.updated, false)
  }),
  load: async (client, _p, common) => (await client.getUser(common.username)).repos,
  toJSON: (repos, p) => selectRepos(repos, p),

  render(all, p, { theme, common, title, t }) {
    const header = title(t('title.top_repos'));
    const repos = selectRepos(all, p);
    if (!repos.length) return messageCard('No public repositories found.', theme, { title: header ?? 'Top Repositories', tone: 'info' });

    const width = 480;
    const y0 = contentTop(!!header) - 5;
    const ago = (iso: string | null) => {
      if (!iso) return '';
      const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
      return d < 1 ? 'today' : d < 30 ? `${d}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`;
    };
    const meta = (r: RepoSummary, x: number, y: number, tight = false) => {
      const lang = r.language ? (tight ? truncate(r.language, 10) : r.language) : null;
      const langW = lang ? 28 + lang.length * 6.4 + 16 : 0;
      const stars = compact(r.stars);
      const fx = x + langW + 25 + stars.length * 6.4 + 10;
      const forks = compact(r.forks);
      return (
        (lang ? `<circle cx="${x + 4}" cy="${y - 4}" r="4" fill="${esc(languageColor(lang, r.languageColor))}"/><text x="${x + 13}" y="${y}" class="fg" font-size="11">${esc(lang)}</text>` : '') +
        icon('star', x + langW, y - 10, 'muted', 0.8) +
        `<text x="${x + langW + 15}" y="${y}" class="muted" font-size="11">${stars}</text>` +
        icon('fork', fx, y - 10, 'muted', 0.8) +
        `<text x="${fx + 15}" y="${y}" class="muted" font-size="11">${forks}</text>` +
        (p.updated && r.pushedAt && !tight ? `<text x="${fx + 30 + forks.length * 6.4}" y="${y}" class="muted" font-size="11">· ${ago(r.pushedAt)}</text>` : '') +
        (r.archived && !tight ? `<text x="${fx + 30 + forks.length * 6.4 + (p.updated ? 60 : 0)}" y="${y}" class="muted" font-size="10" font-style="italic">archived</text>` : '')
      );
    };
    const radius = Math.min(theme.borderRadius, 12);
    let rows = '';
    let height = 0;

    if (p.layout === 'table') {
      const lh = 26;
      rows += `<text x="${PAD}" y="${y0 + 12}" class="muted" font-size="10" letter-spacing="1">#  REPOSITORY</text><text x="${width - PAD - 70}" y="${y0 + 12}" class="muted" font-size="10" letter-spacing="1" text-anchor="end">STARS</text><text x="${width - PAD}" y="${y0 + 12}" class="muted" font-size="10" letter-spacing="1" text-anchor="end">FORKS</text>`;
      repos.forEach((r, i) => {
        const y = y0 + 36 + i * lh;
        rows +=
          (i % 2 === 0 ? `<rect x="${PAD - 8}" y="${y - 17}" width="${width - PAD * 2 + 16}" height="${lh}" rx="5" class="bd" fill-opacity=".35"/>` : '') +
          `<g${anim(common.animation, i)}><text x="${PAD}" y="${y}" class="muted" font-size="12">${i + 1}</text>` +
          `<circle cx="${PAD + 24}" cy="${y - 4}" r="4" fill="${esc(languageColor(r.language, r.languageColor))}"/>` +
          `<text x="${PAD + 34}" y="${y}" class="fg" font-size="13" font-weight="600">${esc(truncate(r.name, 30))}</text>` +
          (p.updated && r.pushedAt ? `<text x="${width - PAD - 120}" y="${y}" class="muted" font-size="11" text-anchor="end">${ago(r.pushedAt)}</text>` : '') +
          `<text x="${width - PAD - 70}" y="${y}" class="fg" font-size="12.5" text-anchor="end">${compact(r.stars)}</text>` +
          `<text x="${width - PAD}" y="${y}" class="muted" font-size="12.5" text-anchor="end">${compact(r.forks)}</text></g>`;
      });
      height = y0 + 36 + repos.length * lh;
    } else if (p.layout === 'ranked') {
      const max = Math.max(1, ...repos.map((r) => (p.sort === 'forks' ? r.forks : r.stars)));
      const lh = 40;
      repos.forEach((r, i) => {
        const y = y0 + 22 + i * lh;
        const v = p.sort === 'forks' ? r.forks : r.stars;
        const bw = Math.max(4, (v / max) * (width - PAD * 2 - 40));
        const medal = ['#f5c542', '#c0c7d0', '#d0894f'][i];
        rows +=
          `<g${anim(common.animation, i)}>` +
          `<circle cx="${PAD + 11}" cy="${y - 4}" r="11" ${medal ? `fill="${medal}"` : 'class="bd"'}/>` +
          `<text x="${PAD + 11}" y="${y}" class="${medal ? '' : 'fg'}" ${medal ? 'fill="#1b1b1b"' : ''} font-size="11" font-weight="800" text-anchor="middle">${i + 1}</text>` +
          `<text x="${PAD + 30}" y="${y}" class="fg" font-size="13" font-weight="700">${esc(truncate(r.name, 34))}</text>` +
          `<text x="${width - PAD}" y="${y}" class="muted" font-size="12" text-anchor="end">${p.sort === 'forks' ? '⑂' : '★'} ${compact(v)}</text>` +
          `<rect x="${PAD + 30}" y="${y + 7}" width="${(width - PAD * 2 - 40).toFixed(1)}" height="6" rx="3" class="bd"/>` +
          `<rect x="${PAD + 30}" y="${y + 7}" width="${bw.toFixed(1)}" height="6" rx="3" fill="${esc(languageColor(r.language, r.languageColor))}"/></g>`;
      });
      height = y0 + 22 + repos.length * lh - 10;
    } else if (p.layout === 'grid') {
      const gap = 10;
      const tw = (width - PAD * 2 - gap) / 2;
      const th = p.descriptions ? 92 : 58;
      repos.forEach((r, i) => {
        const x = PAD + (i % 2) * (tw + gap);
        const y = y0 + Math.floor(i / 2) * (th + gap);
        rows +=
          `<g transform="translate(${x.toFixed(1)} ${y})"${anim(common.animation, i)}>` +
          `<rect width="${tw.toFixed(1)}" height="${th}" rx="${radius}" class="bg sk-bd" stroke-width="1"/>` +
          icon('repo', 12, 12, 'muted', 0.85) +
          `<text x="32" y="25" class="accent" font-size="13" font-weight="700">${esc(truncate(r.name, 24))}</text>` +
          (p.descriptions ? wrap(emojify(r.description) || 'No description provided.', 30, 2).map((l, k) => `<text x="12" y="${45 + k * 15}" class="muted" font-size="11.5">${esc(l)}</text>`).join('') : '') +
          meta(r, 12, th - 13, true) +
          '</g>';
      });
      height = y0 + Math.ceil(repos.length / 2) * (th + gap) - gap;
    } else {
      const rowH = p.descriptions ? 85 : 60;
      repos.forEach((r, i) => {
        const y = y0 + i * rowH;
        rows +=
          `<g transform="translate(${PAD} ${y})"${anim(common.animation, i)}>` +
          `<rect width="${width - PAD * 2}" height="${rowH - 10}" rx="${radius}" class="bg sk-bd" stroke-width="1"/>` +
          `<text x="15" y="25" class="fg" font-size="14" font-weight="600">${esc(truncate(r.name, 40))}</text>` +
          (p.descriptions ? `<text x="15" y="45" class="muted" font-size="12">${esc(truncate(emojify(r.description) || 'No description provided.', 62))}</text>` : '') +
          meta(r, 15, rowH - 20) +
          '</g>';
      });
      height = y0 + repos.length * rowH - 10;
    }

    return frame(rows, {
      width,
      height: height + PAD,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `Top repositories of ${common.username}: ${repos.map((r) => r.name).join(', ')}`
    });
  }
});
