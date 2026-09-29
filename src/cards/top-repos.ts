import { defineCard } from './types';
import { bool, int, list, oneOf } from '../core/params';
import { compact, esc, truncate } from '../core/text';
import type { RepoSummary } from '../github/client';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, messageCard, PAD } from '../svg/frame';
import { icon } from '../svg/icons';

const SORTS = ['stars', 'forks', 'updated'] as const;

interface Params {
  limit: number;
  sort: (typeof SORTS)[number];
  exclude: string[];
  skipArchived: boolean;
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
    .sort(cmp[p.sort])
    .slice(0, p.limit);
}

export const topReposCard = defineCard<Params, RepoSummary[]>({
  id: 'top-repos',
  title: 'Top Repositories',
  description: 'The user’s best repositories, ranked by stars, forks or recent activity.',
  params: [
    { name: 'limit', type: 'number', default: 5, min: 1, max: 10, description: 'Number of repositories' },
    { name: 'sort', type: 'enum', options: [...SORTS], default: 'stars', description: 'Ranking' },
    { name: 'exclude', type: 'list', description: 'Repository names to skip' },
    { name: 'skip_archived', type: 'boolean', default: false, description: 'Skip archived repositories' }
  ],
  parse: (q) => ({
    limit: int(q.limit, 5, 1, 10),
    sort: oneOf(q.sort, SORTS, 'stars'),
    exclude: list(q.exclude),
    skipArchived: bool(q.skip_archived, false)
  }),
  load: async (client, _p, common) => (await client.getUser(common.username)).repos,
  toJSON: (repos, p) => selectRepos(repos, p),

  render(all, p, { theme, common, title, t }) {
    const header = title(t('title.top_repos'));
    const repos = selectRepos(all, p);
    if (!repos.length) return messageCard('No public repositories found.', theme, { title: header ?? 'Top Repositories' });

    const width = 480;
    const rowH = 85;
    const y0 = contentTop(!!header) - 5;
    const rows = repos
      .map((r, i) => {
        const y = y0 + i * rowH;
        const lang = r.language;
        const langW = lang ? 28 + lang.length * 6.4 + 16 : 0;
        const stars = compact(r.stars);
        return (
          `<g transform="translate(${PAD} ${y})"${anim(common.animation, i)}>` +
          `<rect width="${width - PAD * 2}" height="75" rx="${Math.min(theme.borderRadius, 12)}" class="bg sk-bd" stroke-width="1"/>` +
          `<text x="15" y="25" class="fg" font-size="14" font-weight="600">${esc(truncate(r.name, 40))}</text>` +
          `<text x="15" y="45" class="muted" font-size="12">${esc(truncate(r.description || 'No description provided.', 62))}</text>` +
          (lang ? `<circle cx="19" cy="61" r="4" fill="${esc(languageColor(lang, r.languageColor))}"/><text x="28" y="65" class="fg" font-size="11">${esc(lang)}</text>` : '') +
          icon('star', 15 + langW, 55, 'muted', 0.8) +
          `<text x="${15 + langW + 15}" y="65" class="muted" font-size="11">${stars}</text>` +
          icon('fork', 15 + langW + 25 + stars.length * 6.4 + 10, 55, 'muted', 0.8) +
          `<text x="${15 + langW + 25 + stars.length * 6.4 + 25}" y="65" class="muted" font-size="11">${compact(r.forks)}</text>` +
          `</g>`
        );
      })
      .join('');

    return frame(rows, {
      width,
      height: y0 + repos.length * rowH + 15,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `Top repositories of ${common.username}: ${repos.map((r) => r.name).join(', ')}`
    });
  }
});
