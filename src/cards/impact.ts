import { defineCard } from './types';
import { bool, int, list } from '../core/params';
import { compact, esc, truncate } from '../core/text';
import type { ContributionDetail, UserExtended } from '../github/client';
import { loadInsights, type ProfileMetrics } from '../metrics';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, PAD } from '../svg/frame';
import { icon, type IconName } from '../svg/icons';

interface Params {
  count: number;
  orgs: boolean;
  hide: string[];
  columns: number;
  tiles: boolean;
  recent: number;
}

interface Data {
  metrics: ProfileMetrics;
  contributions: ContributionDetail | null;
  orgs: string[];
  hasToken: boolean;
  recent: { title: string; repo: string; url: string; mergedAt: string | null }[];
}

/** KPI tiles. `undefined` values render as "-" (data not available, e.g. no token). */
const KPIS: { key: string; label: string; icon: IconName; value: (d: Data) => string | undefined }[] = [
  { key: 'external', label: 'Merged PRs (others)', icon: 'pr', value: (d) => (d.metrics.externalMergedPRs === undefined ? undefined : compact(d.metrics.externalMergedPRs)) },
  { key: 'merge_rate', label: 'PR merge rate', icon: 'pr', value: (d) => (d.metrics.mergeRate === undefined ? undefined : `${Math.round(d.metrics.mergeRate)}%`) },
  { key: 'repos', label: 'Repos contributed to', icon: 'repo', value: (d) => (d.metrics.reposContributedTo === undefined ? undefined : compact(d.metrics.reposContributedTo)) },
  // with a token: reviews in the last 12 months; without: lifetime reviews found by search
  { key: 'reviews', label: 'PR reviews', icon: 'review', value: (d) => (d.contributions && d.hasToken ? compact(d.contributions.reviews) : compact(d.metrics.reviews)) },
  { key: 'answers', label: 'Discussion answers', icon: 'issue', value: (d) => (d.metrics.discussionAnswers === undefined ? undefined : compact(d.metrics.discussionAnswers)) },
  { key: 'orgs', label: 'Organizations', icon: 'people', value: (d) => (d.metrics.organizations === undefined ? undefined : String(d.metrics.organizations)) }
];

export const impactCard = defineCard<Params, Data>({
  id: 'impact',
  aliases: ['realistic', 'open-source'],
  category: 'overview',
  tags: ['realistic', 'impact', 'collaboration', 'merged', 'external', 'open source', 'reviews', 'orgs'],
  variants: [{ label: 'Full' }, { label: 'With recent merges', params: { recent: '4', count: '2' } }, { label: 'Merges only', params: { recent: '5', count: '0', orgs: 'false', hide: 'repos,reviews,answers,orgs' } }, { label: 'Tiles', params: { tiles: 'true' } }, { label: 'One row', params: { columns: '6', count: '0', orgs: 'false' } }, { label: 'Numbers only', params: { count: '0', orgs: 'false' } }, { label: 'Top 5 projects', params: { count: '5' } }],
  title: 'Open Source Impact',
  description: 'Realistic collaboration stats: pull requests merged into other people’s projects, merge rate, repos contributed to, reviews, accepted answers and your biggest external contributions.',
  params: [
    { name: 'count', type: 'number', default: 3, min: 0, max: 6, description: 'External projects to list' },
    { name: 'orgs', type: 'boolean', default: true, description: 'Show organization chips' },
    { name: 'hide', type: 'list', description: `Tiles to hide: ${KPIS.map((k) => k.key).join(', ')}` },
    { name: 'columns', type: 'number', default: 3, min: 2, max: 6, description: 'Number tiles per row' },
    { name: 'tiles', type: 'boolean', default: false, description: 'Draw each number on a rounded tile' },
    { name: 'recent', type: 'number', default: 0, min: 0, max: 6, description: 'List the most recently merged pull requests in other people’s repos' }
  ],
  parse: (q) => ({ count: int(q.count, 3, 0, 6), orgs: bool(q.orgs, true), hide: list(q.hide), columns: int(q.columns, 3, 2, 6), tiles: bool(q.tiles, false), recent: int(q.recent, 0, 0, 6) }),

  async load(client, p, common) {
    const { metrics, contributions, extended } = await loadInsights(client, common.username);
    return {
      metrics,
      contributions: contributions ?? null,
      orgs: (extended as UserExtended | undefined)?.organizations.map((o) => o.login) ?? [],
      hasToken: client.hasToken,
      recent: p.recent ? await client.getRecentMergedPRs(common.username, p.recent).catch(() => []) : []
    };
  },

  toJSON: (d) => ({
    externalMergedPRs: d.metrics.externalMergedPRs ?? null,
    mergeRate: d.metrics.mergeRate ?? null,
    reposContributedTo: d.metrics.reposContributedTo ?? null,
    reviews: d.hasToken ? d.contributions?.reviews ?? null : null,
    discussionAnswers: d.metrics.discussionAnswers ?? null,
    organizations: d.orgs,
    externalRepos: d.contributions?.externalRepos ?? []
  }),

  render(d, p, { theme, common, title }) {
    const header = title('Open Source Impact');
    const top = contentTop(!!header);
    const width = p.columns > 3 ? 120 * p.columns + PAD * 2 : 480;
    const animate = common.animation;
    const kpis = KPIS.filter((k) => !p.hide.includes(k.key));

    const cols = p.columns;
    const colW = (width - PAD * 2) / cols;
    const tiles = kpis
      .map((k, i) => {
        const x = PAD + (i % cols) * colW;
        const y = top + 20 + Math.floor(i / cols) * 58;
        const v = k.value(d);
        return (
          `<g transform="translate(${x.toFixed(1)} ${y})"${anim(animate, i)}>${p.tiles ? `<rect x="-10" y="-26" width="${(colW - 8).toFixed(1)}" height="52" rx="10" class="bd" fill-opacity=".45"/>` : ''}${icon(k.icon, 0, -13, 'accent', 0.9)}` +
          `<text x="20" y="0" class="value fg">${v === undefined ? '-' : esc(v)}</text>` +
          `<text x="0" y="19" class="label muted">${esc(k.label)}</text></g>`
        );
      })
      .join('');
    let y = top + Math.ceil(kpis.length / cols) * 58 + 4;

    let projects = '';
    const external = (d.contributions?.externalRepos ?? []).slice(0, p.count);
    if (p.count > 0) {
      projects += `<line x1="${PAD}" y1="${y}" x2="${width - PAD}" y2="${y}" class="sk-bd"/><text x="${PAD}" y="${y + 22}" class="label muted" font-weight="600">TOP EXTERNAL CONTRIBUTIONS</text>`;
      y += 30;
      if (!external.length) {
        projects += `<text x="${PAD}" y="${y + 16}" class="muted" font-size="12">${d.hasToken ? 'No contributions to other people’s repositories in the last year.' : 'Top external projects need a GitHub token on the server.'}</text>`;
        y += 28;
      }
      external.forEach((r, i) => {
        const ry = y + 18 + i * 26;
        const meta = [r.pullRequests ? `${r.pullRequests} PR${r.pullRequests === 1 ? '' : 's'}` : '', r.commits ? `${r.commits} commit${r.commits === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
        projects +=
          `<g${anim(animate, i + 6)}><circle cx="${PAD + 5}" cy="${ry - 4}" r="5" fill="${esc(languageColor(r.language, r.languageColor))}"/>` +
          `<text x="${PAD + 16}" y="${ry}" class="fg" font-size="13" font-weight="600">${esc(truncate(r.nameWithOwner, 28))}</text>` +
          icon('star', width - PAD - 190, ry - 11, 'muted', 0.75) +
          `<text x="${width - PAD - 176}" y="${ry}" class="muted" font-size="12">${compact(r.stars)}</text>` +
          `<text x="${width - PAD}" y="${ry}" class="muted" font-size="12" text-anchor="end">${esc(meta)}</text></g>`;
      });
      y += external.length * 26 + 8;
    }

    let recent = '';
    if (p.recent > 0) {
      y += 6;
      recent += `<line x1="${PAD}" y1="${y}" x2="${width - PAD}" y2="${y}" class="sk-bd"/><text x="${PAD}" y="${y + 22}" class="label muted" font-weight="600">RECENTLY MERGED</text>`;
      y += 30;
      if (!d.recent.length) {
        recent += `<text x="${PAD}" y="${y + 16}" class="muted" font-size="12">No merged pull requests in other people’s repositories found.</text>`;
        y += 28;
      }
      d.recent.forEach((r, i) => {
        const ry = y + 16 + i * 34;
        const when = r.mergedAt ? r.mergedAt.slice(0, 10) : '';
        recent +=
          `<g${anim(animate, i + 9)}><circle cx="${PAD + 5}" cy="${ry - 4}" r="4" fill="#a371f7"/>` +
          `<text x="${PAD + 16}" y="${ry}" class="fg" font-size="12.5" font-weight="600">${esc(truncate(r.title, 52))}</text>` +
          `<text x="${PAD + 16}" y="${ry + 15}" class="muted" font-size="11">${esc(truncate(r.repo, 40))}</text>` +
          `<text x="${width - PAD}" y="${ry}" class="muted" font-size="11" text-anchor="end">${esc(when)}</text></g>`;
      });
      y += Math.max(1, d.recent.length) * 34 + 4;
    }

    let chips = '';
    if (p.orgs && d.orgs.length) {
      let x = PAD;
      y += 10;
      for (const login of d.orgs.slice(0, 8)) {
        const w = Math.round(login.length * 7 + 22);
        if (x + w > width - PAD) break;
        chips += `<g transform="translate(${x} ${y})"><rect width="${w}" height="22" rx="11" class="bd" fill-opacity=".7"/><text x="${w / 2}" y="15" text-anchor="middle" class="fg" font-size="11.5">@${esc(login)}</text></g>`;
        x += w + 6;
      }
      y += 30;
    }

    return frame(tiles + projects + recent + chips, {
      width,
      height: y + 14,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `Open source impact of ${common.username}: ${d.metrics.externalMergedPRs ?? 'unknown'} pull requests merged into other repositories`
    });
  }
});
