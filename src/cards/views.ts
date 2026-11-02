import { defineCard } from './types';
import { badRequest, upstream } from '../core/errors';
import { bool, int, oneOf } from '../core/params';
import { compact, esc, fmt } from '../core/text';
import { frame } from '../svg/frame';

const STYLES = ['badge', 'flat', 'pill', 'digits', 'card'] as const;

interface Params {
  style: (typeof STYLES)[number];
  label: string;
  key: string;
  base: number;
  abbreviated: boolean;
  count: boolean;
}

/** Chars-to-pixels for badge text (Verdana-ish 11px). */
const textW = (s: string) => Math.round(Array.from(s).length * 6.6 + 12);

export const viewsCard = defineCard<Params, { views: number }>({
  id: 'views',
  aliases: ['visitors', 'counter', 'view-counter'],
  category: 'utility',
  tags: ['views', 'visitors', 'counter', 'hits', 'traffic', 'badge'],
  variants: [
    { label: 'Badge' },
    { label: 'Pill', params: { style: 'pill' } },
    { label: 'Digits', params: { style: 'digits' } },
    { label: 'Card', params: { style: 'card' } }
  ],
  title: 'Profile Views',
  description: 'Counts how often your README is viewed. Every load counts once and is never cached, so GitHub always shows the live number. Needs the VIEWS Durable Object binding.',
  cacheSeconds: 0,
  params: [
    { name: 'style', type: 'enum', options: [...STYLES], default: 'badge', description: 'Look of the counter' },
    { name: 'label', type: 'string', default: 'Profile views', description: 'Text before the number' },
    { name: 'key', type: 'string', description: 'Separate counter name, e.g. a repository (letters, digits, - _ .)' },
    { name: 'base', type: 'number', default: 0, min: 0, max: 1_000_000_000, description: 'Added to the count (to carry over an old counter)' },
    { name: 'abbreviated', type: 'boolean', default: false, description: 'Show 12.3k instead of 12,345' },
    { name: 'count', type: 'boolean', default: true, description: 'Count this load (false = read only)' }
  ],
  parse(q) {
    const key = (q.key ?? '').trim();
    if (key && !/^[\w.-]{1,40}$/.test(key)) throw badRequest('key may only contain letters, digits, "-", "_" and "." (max 40)');
    return {
      style: oneOf(q.style, STYLES, 'badge'),
      label: (q.label ?? 'Profile views').slice(0, 40),
      key,
      base: int(q.base, 0, 0, 1_000_000_000),
      abbreviated: bool(q.abbreviated, false),
      count: bool(q.count, true)
    };
  },

  async load(_client, p, common, { env }) {
    if (!env.VIEWS) throw upstream('The view counter is not set up on this server (VIEWS Durable Object binding missing)');
    const name = `${common.username.toLowerCase()}${p.key ? `/${p.key.toLowerCase()}` : ''}`;
    const stub = env.VIEWS.get(env.VIEWS.idFromName(name));
    const res = await stub.fetch(`https://counter/${p.count ? 'hit' : 'read'}`);
    const { count } = (await res.json()) as { count: number };
    return { views: count + p.base };
  },

  render({ views }, p, { theme }) {
    const value = p.abbreviated ? compact(views) : fmt(views);
    const label = `${p.label}: ${value}`;

    if (p.style === 'digits') {
      const digits = Array.from(String(views).padStart(6, '0'));
      const w = 26;
      const cells = digits
        .map((d, i) => `<rect x="${i * (w + 4)}" y="0" width="${w}" height="36" rx="5" class="bd"/><text x="${i * (w + 4) + w / 2}" y="25" text-anchor="middle" class="accent" font-size="20" font-weight="700" font-family="Consolas,monospace">${d}</text>`)
        .join('');
      const W = digits.length * (w + 4) - 4;
      return frame(cells, { width: W, height: 36, theme: { ...theme, hideBorder: true }, transparent: true, label });
    }
    if (p.style === 'card') {
      const body =
        `<text x="20" y="32" class="label muted" font-size="12">${esc(p.label.toUpperCase())}</text>` +
        `<text x="20" y="64" class="value accent" font-size="30" font-weight="700">${esc(value)}</text>`;
      return frame(body, { width: Math.max(180, textW(value) * 2 + 20), height: 86, theme, label });
    }
    const lw = p.label ? textW(p.label) : 0;
    const vw = textW(value);
    const W = lw + vw;
    const r = p.style === 'pill' ? 10 : p.style === 'flat' ? 0 : 3;
    const body =
      `<clipPath id="vc"><rect width="${W}" height="20" rx="${r}"/></clipPath><g clip-path="url(#vc)">` +
      (lw ? `<rect width="${lw}" height="20" fill="#555"/>` : '') +
      `<rect x="${lw}" width="${vw}" height="20" class="accent"/></g>` +
      `<g font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">` +
      (lw ? `<text x="${lw / 2}" y="14" text-anchor="middle" fill="#fff">${esc(p.label)}</text>` : '') +
      `<text x="${lw + vw / 2}" y="14" text-anchor="middle" fill="#fff" font-weight="600">${esc(value)}</text></g>`;
    return frame(body, { width: W, height: 20, theme: { ...theme, hideBorder: true }, transparent: true, label });
  }
});
