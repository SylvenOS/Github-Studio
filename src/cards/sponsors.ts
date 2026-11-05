import { defineCard } from './types';
import { bool, int, oneOf } from '../core/params';
import { esc, truncate } from '../core/text';
import type { Supporter } from '../github/client';
import { anim, contentTop, frame, PAD } from '../svg/frame';

const MODES = ['sponsors', 'sponsoring'] as const;
const SHAPES = ['circle', 'rounded', 'square'] as const;
const LAYOUTS = ['wall', 'list', 'stack'] as const;
/** Avatars embedded as images (each is one cached fetch); the rest show initials. */
const MAX_EMBEDDED = 18;

interface Params {
  mode: (typeof MODES)[number];
  count: number;
  size: number;
  perLine: number;
  names: boolean;
  shape: (typeof SHAPES)[number];
  layout: (typeof LAYOUTS)[number];
  cta: string;
}

interface Data {
  total: number;
  people: (Supporter & { image: string | null })[];
}

const initials = (s: Supporter) => (s.name || s.login).split(/[\s-_]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

export const sponsorsCard = defineCard<Params, Data>({
  id: 'sponsors',
  aliases: ['sponsor-wall', 'supporters'],
  category: 'achievements',
  tags: ['sponsors', 'supporters', 'funding', 'thanks', 'avatars', 'community'],
  variants: [{ label: 'Avatar wall' }, { label: 'With names', params: { names: 'true', size: '48', per_line: '6' } }, { label: 'Who I sponsor', params: { mode: 'sponsoring' } }, { label: 'Name list', params: { layout: 'list', count: '8' } }, { label: 'Overlapping stack', params: { layout: 'stack', size: '44' } }],
  title: 'Sponsors Wall',
  description: 'Avatars of your public GitHub Sponsors (or the people you sponsor). Needs a token on the server.',
  cacheSeconds: 6 * 3600,
  params: [
    { name: 'mode', type: 'enum', options: [...MODES], default: 'sponsors', description: 'Your sponsors, or who you sponsor' },
    { name: 'count', type: 'number', default: 24, min: 1, max: 60, description: 'People shown' },
    { name: 'size', type: 'number', default: 40, min: 24, max: 80, description: 'Avatar size' },
    { name: 'per_line', type: 'number', default: 10, min: 3, max: 16, description: 'Avatars per row' },
    { name: 'names', type: 'boolean', default: false, description: 'Show logins under avatars' },
    { name: 'shape', type: 'enum', options: [...SHAPES], default: 'circle', description: 'Avatar shape' },
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'wall', description: 'Avatar wall, name list or overlapping stack' },
    { name: 'cta', type: 'string', description: 'Call-to-action line under the list, e.g. Become a sponsor (max 40)' }
  ],
  parse: (q) => ({
    mode: oneOf(q.mode, MODES, 'sponsors'),
    count: int(q.count, 24, 1, 60),
    size: int(q.size, 40, 24, 80),
    perLine: int(q.per_line, 10, 3, 16),
    names: bool(q.names, false),
    shape: oneOf(q.shape, SHAPES, 'circle'),
    layout: oneOf(q.layout, LAYOUTS, 'wall'),
    cta: (q.cta ?? '').trim().slice(0, 40)
  }),

  async load(client, p, common) {
    const { total, people } = await client.getSupporters(common.username, p.mode, p.count);
    const shown = people.slice(0, p.count);
    const images = await Promise.all(
      shown.map((s, i) =>
        i < MAX_EMBEDDED ? client.getAvatar(s.avatarUrl, p.size * 2).then((a) => `data:${a.mime};base64,${a.base64}`).catch(() => null) : Promise.resolve(null)
      )
    );
    return { total, people: shown.map((s, i) => ({ ...s, image: images[i] })) };
  },
  toJSON: (d) => ({ total: d.total, people: d.people.map(({ image: _i, ...s }) => s) }),

  render(d, p, { theme, common, title }) {
    const header = title(p.mode === 'sponsoring' ? 'Sponsoring' : 'Sponsors');
    const top = contentTop(!!header);
    const animate = common.animation;
    const s = p.size;
    const gap = Math.round(s * 0.25);
    const cellH = s + (p.names ? 18 : 0);
    const perLine = Math.min(p.perLine, Math.max(1, d.people.length));
    const W = p.layout === 'stack' ? Math.max(320, PAD * 2 + s + (d.people.length - 1) * s * 0.62) : Math.max(320, PAD * 2 + perLine * s + (perLine - 1) * gap);
    const rx = p.shape === 'circle' ? s / 2 : p.shape === 'rounded' ? s / 5 : 0;

    if (!d.people.length) {
      const msg = p.mode === 'sponsoring' ? 'Not sponsoring anyone publicly yet.' : 'No public sponsors yet. Be the first!';
      return frame(`<text x="${PAD}" y="${top + 22}" class="label muted" font-size="13">${esc(msg)}</text>`, { width: 360, height: top + 42, theme, title: header, label: msg });
    }

    if (p.layout === 'list') {
      const W2 = 420;
      const rowH = Math.max(34, s * 0.9);
      const rows = d.people
        .map((person, i) => {
          const y = top + 8 + i * rowH;
          const face = person.image
            ? `<clipPath id="sl${i}"><circle cx="${PAD + 14}" cy="${y + 14}" r="14"/></clipPath><image href="${esc(person.image)}" x="${PAD}" y="${y}" width="28" height="28" clip-path="url(#sl${i})"/>`
            : `<circle cx="${PAD + 14}" cy="${y + 14}" r="14" class="bd"/><text x="${PAD + 14}" y="${y + 19}" text-anchor="middle" class="accent" font-size="11" font-weight="700">${esc(initials(person))}</text>`;
          return `<g${anim(animate, i)}>${face}<text x="${PAD + 38}" y="${y + 13}" class="fg" font-size="12.5" font-weight="600">${esc(truncate(person.name || person.login, 28))}</text><text x="${PAD + 38}" y="${y + 27}" class="muted" font-size="10.5">@${esc(person.login)}${person.kind === 'org' ? ' · organization' : ''}</text></g>`;
        })
        .join('');
      const cta2 = p.cta ? `<text x="${PAD}" y="${top + 24 + d.people.length * rowH}" class="accent" font-size="12" font-weight="600">${esc(p.cta)} →</text>` : '';
      return frame(rows + cta2, {
        width: W2,
        height: top + 20 + d.people.length * rowH + (p.cta ? 26 : 8),
        theme,
        title: header,
        subtitle: d.total > d.people.length ? `+${d.total - d.people.length} more` : `${d.total} total`,
        label: `${d.total} sponsors of ${common.username}`
      });
    }
    const overlap = p.layout === 'stack';
    const body = d.people
      .map((person, i) => {
        const x = overlap ? PAD + i * (s * 0.62) : PAD + (i % perLine) * (s + gap);
        const y = overlap ? top + 8 : top + 8 + Math.floor(i / perLine) * (cellH + gap);
        const clip = `sp${i}`;
        const face = person.image
          ? `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${rx}"/></clipPath><image href="${esc(person.image)}" x="${x}" y="${y}" width="${s}" height="${s}" clip-path="url(#${clip})"/>`
          : `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${rx}" class="bd"/><text x="${x + s / 2}" y="${y + s / 2 + s * 0.13}" text-anchor="middle" class="accent" font-size="${Math.round(s * 0.36)}" font-weight="700">${esc(initials(person))}</text>`;
        const name = p.names ? `<text x="${x + s / 2}" y="${y + s + 13}" text-anchor="middle" class="muted" font-size="10">${esc(truncate(person.login, Math.max(6, Math.floor(s / 6))))}</text>` : '';
        return `<g${anim(animate, i)}><title>${esc(person.name ? `${person.name} (@${person.login})` : `@${person.login}`)}</title>${face}${name}</g>`;
      })
      .join('');
    const rows = overlap ? 1 : Math.ceil(d.people.length / perLine);
    const more = d.total > d.people.length ? `+${d.total - d.people.length} more` : '';
    return frame(body, {
      width: W,
      height: top + 8 + rows * (cellH + gap) - gap + PAD,
      theme,
      title: header,
      subtitle: more || `${d.total} total`,
      label: `${d.total} ${p.mode === 'sponsoring' ? 'accounts sponsored by' : 'sponsors of'} ${common.username}`
    });
  }
});
