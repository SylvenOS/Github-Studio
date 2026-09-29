import { defineCard } from './types';
import { notFound } from '../core/errors';
import { bool, repoName } from '../core/params';
import { compact, esc, wrap } from '../core/text';
import type { RepoDetail } from '../github/client';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, PAD } from '../svg/frame';
import { icon } from '../svg/icons';

interface Params {
  repo: string;
  showOwner: boolean;
}

const CHAR_W = 6.6; // approx. glyph width at 12px, for laying out the stat row

export const repoCard = defineCard<Params, RepoDetail>({
  id: 'repos',
  category: 'repositories',
  tags: ['pin', 'project', 'showcase'],
  variants: [
    { label: 'Top repository (auto)' },
    { label: 'With owner', params: { show_owner: 'true' } }
  ],
  aliases: ['repo', 'pin'],
  title: 'Repository',
  description: 'Pinned-repository style card for a single repository.',
  params: [
    { name: 'repo', type: 'string', description: 'Repository name, or `auto` for the most-starred one', default: 'auto' },
    { name: 'show_owner', type: 'boolean', default: false, description: 'Prefix the name with the owner' }
  ],
  parse: (q) => ({ repo: q.repo && q.repo !== 'auto' ? repoName(q.repo) : 'auto', showOwner: bool(q.show_owner, false) }),
  async load(client, p, common) {
    let name = p.repo;
    if (name === 'auto') {
      const top = (await client.getUser(common.username)).repos[0];
      if (!top) throw notFound('This user has no public repositories');
      name = top.name;
    }
    return client.getRepository(common.username, name);
  },

  render(r, p, { theme, common, title }) {
    const header = title(p.showOwner ? `${r.owner}/${r.name}` : r.name);
    const top = contentTop(!!header);
    const animate = common.animation;

    const lines = wrap(r.description || 'No description provided.', 52, 2);
    const desc = lines
      .map((l, i) => `<text x="${PAD}" y="${top + i * 20}" class="fg" font-size="14">${esc(l)}</text>`)
      .join('');

    // stat row: language, stars, forks, [license]
    const rowY = top + 60;
    let x = PAD;
    let row = '';
    if (r.language) {
      row += `<circle cx="${x + 5}" cy="${rowY - 4}" r="5" fill="${esc(languageColor(r.language))}"/><text x="${x + 15}" y="${rowY}" class="label muted">${esc(r.language)}</text>`;
      x += 15 + r.language.length * CHAR_W + 18;
    }
    for (const [name, value] of [['star', r.stars], ['fork', r.forks]] as const) {
      const text = compact(value);
      row += icon(name, x, rowY - 12, 'muted') + `<text x="${x + 20}" y="${rowY}" class="label muted">${text}</text>`;
      x += 20 + text.length * CHAR_W + 16;
    }
    if (r.license) row += `<text x="${x}" y="${rowY}" class="label muted">${esc(r.license)}</text>`;

    return frame(`<g${anim(animate)}>${desc}${row}</g>`, {
      width: 400,
      height: rowY + 25,
      theme,
      title: header,
      subtitle: r.archived ? 'archived' : undefined,
      label: `${r.owner}/${r.name}: ${r.stars} stars, ${r.forks} forks`
    });
  }
});
