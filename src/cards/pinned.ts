import { defineCard } from './types';
import { bool, int, oneOf } from '../core/params';
import { compact, emojify, esc, truncate, wrap } from '../core/text';
import type { PinnedRepo } from '../github/client';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, messageCard, PAD } from '../svg/frame';
import { icon } from '../svg/icons';

const LAYOUTS = ['grid', 'list'] as const;

interface Params {
  layout: (typeof LAYOUTS)[number];
  count: number;
  descriptions: boolean;
  owner: boolean;
  fallback: boolean;
  columns: number;
}

interface Data {
  repos: PinnedRepo[];
  /** `top` when nothing is pinned and the most-starred repositories are shown instead. */
  source: 'pinned' | 'top';
}

export const pinnedCard = defineCard<Params, Data>({
  id: 'pinned',
  aliases: ['pins', 'featured'],
  category: 'repositories',
  tags: ['pinned', 'featured', 'projects', 'showcase', 'portfolio'],
  variants: [{ label: 'Grid' }, { label: 'List', params: { layout: 'list' } }, { label: 'Compact grid', params: { descriptions: 'false' } }, { label: 'Three columns', params: { columns: '3', descriptions: 'false' } }],
  title: 'Pinned Repositories',
  description: 'The repositories you pinned on your profile (including organization repos), as a grid or a list. Works without a server token, and falls back to your most-starred repos when nothing is pinned.',
  params: [
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'grid', description: 'Two-column grid or a full-width list' },
    { name: 'count', type: 'number', default: 6, min: 1, max: 6, description: 'How many pins to show' },
    { name: 'descriptions', type: 'boolean', default: true, description: 'Show descriptions' },
    { name: 'owner', type: 'boolean', default: false, description: 'Show owner/name for every repo (always shown for repos you don’t own)' },
    { name: 'columns', type: 'number', default: 2, min: 1, max: 3, description: 'Columns in the grid layout' },
    { name: 'fallback', type: 'boolean', default: true, description: 'Show your most-starred repositories when nothing is pinned' }
  ],
  parse: (q) => ({ layout: oneOf(q.layout, LAYOUTS, 'grid'), count: int(q.count, 6, 1, 6), descriptions: bool(q.descriptions, true), owner: bool(q.owner, false), fallback: bool(q.fallback, true), columns: int(q.columns, 2, 1, 3) }),
  async load(client, p, common) {
    const pinned = (await client.getUserExtended(common.username)).pinned;
    if (pinned.length || !p.fallback) return { repos: pinned, source: 'pinned' };
    const user = await client.getUser(common.username);
    return {
      source: 'top',
      repos: user.repos.slice(0, 6).map((r) => ({ name: r.name, owner: user.login, description: r.description, url: r.url, stars: r.stars, forks: r.forks, language: r.language, languageColor: r.languageColor }))
    };
  },
  toJSON: (d) => d,

  render(d, p, { theme, common, title }) {
    const header = title(d.source === 'top' ? 'Top Repositories' : 'Pinned Repositories');
    const repos = d.repos.slice(0, p.count);
    if (!repos.length) return messageCard('No pinned or public repositories to show yet.', theme, { title: header ?? 'Pinned Repositories', tone: 'info' });

    const grid = p.layout === 'grid';
    const width = grid && Math.min(p.columns, repos.length) === 3 ? 660 : 480;
    const cols = grid ? Math.max(1, Math.min(p.columns, repos.length)) : 1;
    const gap = 10;
    const tileW = (width - PAD * 2 - gap * (cols - 1)) / cols;
    const tileH = p.descriptions ? (grid ? 96 : 78) : 58;
    const top = contentTop(!!header) - 5;
    const chars = grid ? Math.floor(tileW / 7.2) : 64;

    const tiles = repos
      .map((r, i) => {
        const x = PAD + (i % cols) * (tileW + gap);
        const y = top + Math.floor(i / cols) * (tileH + gap);
        const name = p.owner || r.owner.toLowerCase() !== common.username.toLowerCase() ? `${r.owner}/${r.name}` : r.name;
        const desc = p.descriptions ? wrap(emojify(r.description) || 'No description provided.', chars, grid ? 2 : 1) : [];
        const metaY = tileH - 14;
        const lang = r.language;
        const langW = lang ? 26 + lang.length * 6.2 + 12 : 0;
        const stars = compact(r.stars);
        return (
          `<g transform="translate(${x.toFixed(1)} ${y})"${anim(common.animation, i)}>` +
          `<rect width="${tileW.toFixed(1)}" height="${tileH}" rx="${Math.min(theme.borderRadius, 10)}" class="bg sk-bd" stroke-width="1"/>` +
          icon('repo', 12, 12, 'muted', 0.85) +
          `<text x="32" y="25" class="accent" font-size="13" font-weight="700">${esc(truncate(name, grid ? Math.floor(tileW / 8.4) : 56))}</text>` +
          desc.map((l, k) => `<text x="12" y="${45 + k * 16}" class="muted" font-size="11.5">${esc(l)}</text>`).join('') +
          (lang ? `<circle cx="17" cy="${metaY - 4}" r="4.5" fill="${esc(languageColor(lang, r.languageColor))}"/><text x="27" y="${metaY}" class="fg" font-size="11">${esc(lang)}</text>` : '') +
          icon('star', 12 + langW, metaY - 10, 'muted', 0.75) +
          `<text x="${26 + langW}" y="${metaY}" class="muted" font-size="11">${stars}</text>` +
          icon('fork', 40 + langW + stars.length * 6.3, metaY - 10, 'muted', 0.75) +
          `<text x="${54 + langW + stars.length * 6.3}" y="${metaY}" class="muted" font-size="11">${compact(r.forks)}</text>` +
          `</g>`
        );
      })
      .join('');

    const rows = Math.ceil(repos.length / cols);
    return frame(tiles, {
      width,
      height: top + rows * (tileH + gap) - gap + PAD,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `Pinned repositories of ${common.username}: ${repos.map((r) => r.name).join(', ')}`
    });
  }
});
