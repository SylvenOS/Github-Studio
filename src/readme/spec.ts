import { findCard } from '../cards';
import { badRequest } from '../core/errors';
import { username as validateUsername } from '../core/params';
import { themes } from '../themes';

/**
 * The README document model. A README is a list of blocks; each block is plain data, so it can be
 * stored, shared, edited in the builder, or sent to the API. `normalizeSpec` is the single gate that
 * turns untrusted input into a safe, bounded spec.
 */
export type Align = 'left' | 'center' | 'right';

export interface CardBlock {
  type: 'card';
  card: string;
  params?: Record<string, string>;
  align?: Align;
  width?: number;
  link?: string;
  alt?: string;
}

export interface BadgeItem {
  kind: 'stat' | 'social' | 'tech' | 'custom';
  /** stat id, social network, or technology name */
  name?: string;
  /** social handle (or full URL for `website`, `mastodon`) */
  handle?: string;
  url?: string;
  label?: string;
  message?: string;
  color?: string;
  logo?: string;
}

export type Block =
  | CardBlock
  | { type: 'row'; align?: Align; items: CardBlock[] }
  | { type: 'heading'; text: string; level?: number; align?: Align }
  | { type: 'text'; markdown: string; align?: Align }
  | { type: 'badges'; align?: Align; style?: string; items: BadgeItem[] }
  | { type: 'divider'; style?: string; align?: Align }
  | { type: 'html'; html: string }
  | { type: 'details'; summary: string; open?: boolean; blocks: Block[] };

export interface ReadmeSpec {
  username: string;
  theme: string;
  /** When set, images switch to this theme in GitHub's dark mode (via <picture>). */
  dark?: string;
  align: Align;
  /** Query parameters applied to every card (locale, radius, animation, ...). */
  params: Record<string, string>;
  footer: boolean;
  blocks: Block[];
}

export const BLOCK_TYPES = ['card', 'row', 'heading', 'text', 'badges', 'divider', 'html', 'details'] as const;

const LIMITS = { blocks: 60, rowItems: 4, badges: 40, text: 6000, html: 6000, str: 200, paramValue: 200, params: 30 };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = LIMITS.str) => (typeof v === 'string' ? v.slice(0, max) : '');
const ALIGNS: Align[] = ['left', 'center', 'right'];
const align = (v: unknown): Align | undefined => (ALIGNS.includes(v as Align) ? (v as Align) : undefined);

/** Only plain http(s) URLs without whitespace or quotes make it into generated markup. */
export function safeUrl(v: unknown): string | undefined {
  const s = str(v, 500).trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : undefined;
}

const hexColor = (v: unknown) => (typeof v === 'string' && /^#?[0-9a-f]{3,8}$/i.test(v.trim()) ? v.trim().replace('#', '') : undefined);

function sanitizeParams(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(v)) return out;
  for (const [k, raw] of Object.entries(v).slice(0, LIMITS.params)) {
    if (!/^[a-z][a-z0-9_]{0,29}$/.test(k) || k === 'username' || k === 'format') continue;
    if (typeof raw !== 'string' && typeof raw !== 'number' && typeof raw !== 'boolean') continue;
    out[k] = String(raw).slice(0, LIMITS.paramValue);
  }
  return out;
}

function card(v: unknown): CardBlock {
  if (!isRecord(v)) throw badRequest('Each card needs an object with a "card" id');
  const def = findCard(str(v.card, 40));
  if (!def) throw badRequest(`Unknown card "${str(v.card, 40)}"`);
  const width = Number(v.width);
  return {
    type: 'card',
    card: def.id,
    params: sanitizeParams(v.params),
    align: align(v.align),
    width: Number.isFinite(width) && width >= 40 && width <= 1200 ? Math.round(width) : undefined,
    link: safeUrl(v.link),
    alt: str(v.alt, 120) || undefined
  };
}

function badge(v: unknown): BadgeItem | null {
  if (!isRecord(v)) return null;
  const kind = v.kind;
  if (kind !== 'stat' && kind !== 'social' && kind !== 'tech' && kind !== 'custom') return null;
  return {
    kind,
    name: str(v.name, 60) || undefined,
    handle: str(v.handle, 200) || undefined,
    url: safeUrl(v.url),
    label: str(v.label, 60) || undefined,
    message: str(v.message, 60) || undefined,
    color: hexColor(v.color),
    logo: /^[a-z0-9-]{1,40}$/i.test(str(v.logo, 40)) ? str(v.logo, 40) : undefined
  };
}

function block(v: unknown, depth: number): Block {
  if (!isRecord(v)) throw badRequest('Each block must be an object');
  switch (v.type) {
    case 'card':
      return card(v);
    case 'row': {
      const items = Array.isArray(v.items) ? v.items.slice(0, LIMITS.rowItems).map(card) : [];
      return { type: 'row', align: align(v.align), items };
    }
    case 'heading': {
      const level = Number(v.level);
      return { type: 'heading', text: str(v.text, 160).replace(/[\r\n]+/g, ' '), level: level >= 1 && level <= 6 ? Math.round(level) : 2, align: align(v.align) };
    }
    case 'text':
      return { type: 'text', markdown: str(v.markdown, LIMITS.text), align: align(v.align) };
    case 'badges': {
      const items = (Array.isArray(v.items) ? v.items : []).slice(0, LIMITS.badges).map(badge).filter((b): b is BadgeItem => !!b);
      const style = str(v.style, 20);
      return { type: 'badges', align: align(v.align), style: ['flat', 'flat-square', 'plastic', 'for-the-badge', 'social'].includes(style) ? style : undefined, items };
    }
    case 'divider':
      return { type: 'divider', style: str(v.style, 20) || undefined, align: align(v.align) };
    case 'html':
      return { type: 'html', html: str(v.html, LIMITS.html) };
    case 'details': {
      if (depth >= 1) throw badRequest('Details blocks cannot be nested');
      const inner = Array.isArray(v.blocks) ? v.blocks.slice(0, LIMITS.blocks).map((b) => block(b, depth + 1)) : [];
      return { type: 'details', summary: str(v.summary, 120) || 'Details', open: v.open === true, blocks: inner };
    }
    default:
      throw badRequest(`Unknown block type "${str(v.type, 20)}". Use one of: ${BLOCK_TYPES.join(', ')}`);
  }
}

const themeName = (v: unknown, fallback: string) => (v === 'auto' || (typeof v === 'string' && themes[v]) ? (v as string) : fallback);

/** Validates untrusted input into a bounded, safe spec. Throws `bad_request` with a helpful message otherwise. */
export function normalizeSpec(input: unknown, overrides: Partial<Pick<ReadmeSpec, 'username' | 'theme' | 'dark' | 'align' | 'footer'>> = {}): ReadmeSpec {
  if (!isRecord(input)) throw badRequest('The README spec must be a JSON object');
  if (!Array.isArray(input.blocks)) throw badRequest('The README spec needs a "blocks" array');
  if (input.blocks.length > LIMITS.blocks) throw badRequest(`Too many blocks (max ${LIMITS.blocks})`);

  const theme = themeName(overrides.theme ?? input.theme, 'default');
  const dark = overrides.dark !== undefined ? themeName(overrides.dark, '') : themeName(input.dark, '');
  return {
    username: validateUsername(overrides.username ?? str(input.username, 40)),
    theme,
    dark: dark && dark !== theme ? dark : undefined,
    align: overrides.align ?? align(input.align) ?? 'center',
    params: sanitizeParams(input.params),
    footer: overrides.footer ?? input.footer === true,
    blocks: input.blocks.map((b) => block(b, 0))
  };
}

/** Decodes the compact `spec=` query parameter (base64url-encoded JSON). */
export function decodeSpecParam(value: string): unknown {
  if (value.length > 60_000) throw badRequest('spec is too large');
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw badRequest('spec must be base64url-encoded JSON');
  }
}

export function encodeSpecParam(spec: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(spec));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
