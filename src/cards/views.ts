import { defineCard } from './types';
import { badRequest, upstream } from '../core/errors';
import { bool, color, int, oneOf } from '../core/params';
import { compact, esc, fmt } from '../core/text';
import { frame } from '../svg/frame';
import { shield, type ShieldStyle } from '../svg/shield';
import { TECH_ICONS } from '../svg/tech-icons';
import { resolveIcon } from './tech';

const STYLES = ['badge', 'flat', 'pill', 'plastic', 'for-the-badge', 'social', 'digits', 'card'] as const;

interface Params {
  style: (typeof STYLES)[number];
  label: string;
  key: string;
  base: number;
  abbreviated: boolean;
  count: boolean;
  color?: string;
  labelColor?: string;
  logo?: string;
  scale: number;
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
    { label: 'Social', params: { style: 'social', logo: 'github' } },
    { label: 'Plastic', params: { style: 'plastic', color: '4c1' } },
    { label: 'For the badge', params: { style: 'for-the-badge', abbreviated: 'true' } },
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
    { name: 'count', type: 'boolean', default: true, description: 'Count this load (false = read only)' },
    { name: 'color', type: 'color', description: 'Number background (hex, no #; default: theme accent)' },
    { name: 'label_color', type: 'color', description: 'Label background (hex, no #)' },
    { name: 'logo', type: 'string', description: 'Brand logo in the badge, e.g. github' },
    { name: 'scale', type: 'number', default: 100, min: 50, max: 300, step: 10, description: 'Badge size in percent' }
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
      count: bool(q.count, true),
      color: color(q.color),
      labelColor: color(q.label_color),
      logo: q.logo?.slice(0, 30),
      scale: Math.max(50, Math.min(300, Number.parseInt(q.scale ?? '100', 10) || 100))
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
        `<text x="20" y="64" class="accent" font-size="30" font-weight="700">${esc(value)}</text>`;
      return frame(body, { width: Math.max(180, textW(value) * 2 + 20), height: 86, theme, label });
    }
    const map: Record<string, ShieldStyle> = { badge: 'flat', flat: 'flat-square', pill: 'pill', plastic: 'plastic', 'for-the-badge': 'for-the-badge', social: 'social', 'flat-square': 'flat-square' };
    const slug = p.logo ? resolveIcon(p.logo) : undefined;
    return shield({
      label: p.label,
      value,
      style: map[p.style] ?? 'flat',
      labelColor: p.labelColor ?? '#555555',
      valueColor: p.color ?? theme.accent,
      logo: slug ? { path: TECH_ICONS[slug].p, color: '#ffffff' } : undefined,
      scale: p.scale / 100
    });
  }
});
