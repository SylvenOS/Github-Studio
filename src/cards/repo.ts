import { defineCard } from './types';
import { badRequest, notFound } from '../core/errors';
import { bool, oneOf, repoName } from '../core/params';
import { compact, emojify, esc, truncate, wrap } from '../core/text';
import type { RepoDetail } from '../github/client';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, PAD } from '../svg/frame';
import { icon } from '../svg/icons';

const LAYOUTS = ['default', 'detailed', 'compact'] as const;

interface Params {
  repo: string;
  owner?: string;
  showOwner: boolean;
  layout: (typeof LAYOUTS)[number];
  topics: boolean;
  descriptionLines: number;
}

const CHAR_W = 6.6; // approx. glyph width at 12px, for laying out the stat row

const ago = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d < 1 ? 'today' : d < 30 ? `${d}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`;
};

export const repoCard = defineCard<Params, RepoDetail>({
  id: 'repos',
  category: 'repositories',
  tags: ['pin', 'project', 'showcase', 'repository'],
  variants: [
    { label: 'Top repository (auto)' },
    { label: 'With owner', params: { show_owner: 'true' } },
    { label: 'Detailed', params: { layout: 'detailed' } },
    { label: 'Compact', params: { layout: 'compact' } }
  ],
  aliases: ['repo', 'pin'],
  title: 'Repository',
  description: 'Pinned-repository style card for a single repository: default, detailed (topics, watchers, issues, license, last push) or a compact one-liner. Any owner via owner/name.',
  params: [
    { name: 'repo', type: 'string', description: 'Repository name, owner/name, or `auto` for your most-starred one', default: 'auto' },
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'default', description: 'Presentation' },
    { name: 'show_owner', type: 'boolean', default: false, description: 'Prefix the name with the owner' },
    { name: 'topics', type: 'boolean', default: true, description: 'Show topics (detailed layout)' },
    { name: 'description_lines', type: 'number', default: 2, min: 0, max: 4, description: 'Lines of description' }
  ],
  parse(q) {
    let repo = 'auto';
    let owner: string | undefined;
    if (q.repo && q.repo !== 'auto') {
      const parts = q.repo.split('/');
      if (parts.length > 2) throw badRequest('repo must be a name or owner/name');
      if (parts.length === 2) owner = parts[0].trim();
      repo = repoName(parts[parts.length - 1].trim());
    }
    const lines = Number.parseInt(q.description_lines ?? '2', 10);
    return {
      repo,
      owner,
      showOwner: bool(q.show_owner, false),
      layout: oneOf(q.layout, LAYOUTS, 'default'),
      topics: bool(q.topics, true),
      descriptionLines: Number.isFinite(lines) ? Math.max(0, Math.min(4, lines)) : 2
    };
  },
  users: (p) => (p.owner ? [p.owner] : []),
  async load(client, p, common) {
    let name = p.repo;
    if (name === 'auto') {
      const top = (await client.getUser(common.username)).repos[0];
      if (!top) throw notFound('This user has no public repositories');
      name = top.name;
    }
    return client.getRepository(p.owner ?? common.username, name);
  },

  render(r, p, { theme, common, title }) {
    const showOwner = p.showOwner || (p.owner && p.owner.toLowerCase() !== common.username.toLowerCase());
    const name = showOwner ? `${r.owner}/${r.name}` : r.name;
    const animate = common.animation;
    const description = emojify(r.description) || 'No description provided.';
    const label = `${r.owner}/${r.name}: ${r.stars} stars, ${r.forks} forks`;

    if (p.layout === 'compact') {
      const W = 460;
      const stats = `★ ${compact(r.stars)}   ⑂ ${compact(r.forks)}`;
      const body =
        icon('repo', PAD - 6, 13, 'muted', 0.9) +
        `<text x="${PAD + 14}" y="25" class="accent" font-size="13.5" font-weight="700">${esc(truncate(name, 30))}</text>` +
        (r.language ? `<circle cx="${W - PAD - 150}" cy="21" r="4.5" fill="${esc(languageColor(r.language))}"/><text x="${W - PAD - 141}" y="25" class="muted" font-size="11.5">${esc(truncate(r.language, 12))}</text>` : '') +
        `<text x="${W - PAD}" y="25" class="muted" font-size="11.5" text-anchor="end">${stats}</text>`;
      return frame(body, { width: W, height: 42, theme, label });
    }

    const header = title(name);
    const top = contentTop(!!header);
    const W = p.layout === 'detailed' ? 480 : 400;
    const lines = p.descriptionLines ? wrap(description, Math.floor((W - PAD * 2) / 7.4), p.descriptionLines) : [];
    let y = top;
    let body = lines.map((l, i) => `<text x="${PAD}" y="${top + i * 20}" class="fg" font-size="14">${esc(l)}</text>`).join('');
    y += lines.length * 20 + (lines.length ? 8 : 0);

    if (p.layout === 'detailed' && p.topics && r.topics.length) {
      let x = PAD;
      for (const topic of r.topics.slice(0, 8)) {
        const w = Math.round(topic.length * 6.4 + 18);
        if (x + w > W - PAD) break;
        body += `<rect x="${x}" y="${y - 2}" width="${w}" height="20" rx="10" class="accent" fill-opacity=".12"/><text x="${x + w / 2}" y="${y + 12}" class="accent" font-size="11" text-anchor="middle">${esc(topic)}</text>`;
        x += w + 6;
      }
      y += 30;
    }

    // stat row: language, stars, forks, [watchers, issues], license
    const rowY = y + 16;
    let x = PAD;
    let row = '';
    if (r.language) {
      row += `<circle cx="${x + 5}" cy="${rowY - 4}" r="5" fill="${esc(languageColor(r.language))}"/><text x="${x + 15}" y="${rowY}" class="label muted">${esc(r.language)}</text>`;
      x += 15 + r.language.length * CHAR_W + 18;
    }
    const stats: [Parameters<typeof icon>[0], number][] = [['star', r.stars], ['fork', r.forks]];
    if (p.layout === 'detailed') stats.push(['review', r.watchers], ['issue', r.openIssues]);
    for (const [ic, value] of stats) {
      const text = compact(value);
      row += icon(ic, x, rowY - 12, 'muted') + `<text x="${x + 20}" y="${rowY}" class="label muted">${text}</text>`;
      x += 20 + text.length * CHAR_W + 16;
    }
    if (r.license) row += `<text x="${x}" y="${rowY}" class="label muted">${esc(r.license)}</text>`;
    let h = rowY + 25;
    if (p.layout === 'detailed') {
      row += `<text x="${PAD}" y="${rowY + 24}" class="muted" font-size="11">${esc([r.updatedAt ? `Updated ${ago(r.updatedAt)}` : '', r.archived ? 'Archived' : '', r.isFork ? 'Fork' : ''].filter(Boolean).join(' · '))}</text>`;
      h += 18;
    }

    return frame(`<g${anim(animate)}>${body}${row}</g>`, {
      width: W,
      height: h,
      theme,
      title: header,
      subtitle: r.archived ? 'archived' : undefined,
      label
    });
  }
});
