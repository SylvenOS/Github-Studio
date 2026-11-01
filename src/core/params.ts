import { badRequest } from './errors';
import { normalizeLocale, LOCALES } from './i18n';
import { themes, type FrameStyle } from '../themes';

export type Query = Record<string, string>;

export interface ParamDoc {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'list' | 'color';
  description: string;
  default?: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
  /** Number input granularity (defaults to 1). */
  step?: number;
  /** Section in the web UI. */
  group?: 'layout' | 'colors' | 'typography' | 'effects' | 'data';
}

const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPO = /^[\w.-]{1,100}$/;
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function int(v: string | undefined, def: number, min: number, max: number): number {
  const n = v === undefined || v === '' ? NaN : Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

export function bool(v: string | undefined, def: boolean): boolean {
  if (v === undefined || v === '') return def;
  return ['true', '1', 'yes', 'on'].includes(v.toLowerCase());
}

export function list(v: string | undefined): string[] {
  return (v ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
}

export function oneOf<T extends string>(v: string | undefined, allowed: readonly T[], def: T): T {
  return allowed.includes(v as T) ? (v as T) : def;
}

export function color(v: string | undefined): string | undefined {
  const m = v ? HEX.exec(v.trim()) : null;
  return m ? `#${m[1]}` : undefined;
}

export function username(v: string | undefined): string {
  if (!v) throw badRequest('Missing required parameter: username');
  if (!USERNAME.test(v)) throw badRequest('Invalid GitHub username');
  return v;
}

export function repoName(v: string | undefined): string {
  if (!v) throw badRequest('Missing required parameter: repo (e.g. &repo=github-stats)');
  if (!REPO.test(v) || /^\.+$/.test(v)) throw badRequest('Invalid repository name');
  return v;
}

export interface Gradient {
  angle: number;
  stops: string[];
}

/** `bg=135,ff0000,0000ff` -> a gradient; `bg=ff0000` -> a plain colour. */
export function background(v: string | undefined): { color?: string; gradient?: Gradient } {
  if (!v) return {};
  if (!v.includes(',')) return { color: color(v) };
  const [angle, ...raw] = v.split(',');
  const stops = raw.map(color).filter((c): c is string => !!c).slice(0, 5);
  return stops.length >= 2 ? { gradient: { angle: int(angle, 90, 0, 360), stops } } : {};
}

/** A comma-separated list of hex colours; returns undefined unless it has between `min` and `max` valid entries. */
export function colorList(v: string | undefined, min: number, max: number): string[] | undefined {
  if (!v) return undefined;
  const parts = v.split(',').map((p) => color(p.trim()));
  if (parts.length < min || parts.length > max || parts.some((p) => !p)) return undefined;
  return parts as string[];
}

/** Decimal clamp rounded to `step`. */
export function num(v: string | undefined, def: number, min: number, max: number, step = 1): number {
  const n = v === undefined || v === '' ? NaN : Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n / step) * step));
}

export interface CommonParams {
  username: string;
  theme: string;
  colors: { bg?: string; fg?: string; muted?: string; accent?: string; border?: string };
  gradient?: Gradient;
  radius: number | null;
  font?: string;
  animation: boolean;
  hideBorder: boolean;
  hideTitle: boolean;
  title?: string;
  locale: string;
  format: 'svg' | 'json' | 'text';
  cacheSeconds?: number;
  /** Generic presentation options, applied by frame(). */
  style: FrameStyle;
  numberFormat: 'auto' | 'full' | 'compact';
}

/**
 * Parses the parameters every card shares. Decorative cards (banner, divider) pass `requireUser = false`,
 * in which case a missing/invalid username just becomes an empty string.
 */
export function parseCommon(q: Query, requireUser = true): CommonParams {
  // letters, digits, spaces, commas and dashes only; multi-word families are quoted here, never by the caller
  const font = q.font && /^[\w\s,-]{1,80}$/.test(q.font)
    ? q.font.split(',').map((f) => f.trim()).filter(Boolean).slice(0, 5).map((f) => (/\s/.test(f) ? `'${f}'` : f)).join(', ')
    : undefined;
  const bg = background(q.bg);
  return {
    username: requireUser ? username(q.username) : q.username && USERNAME.test(q.username) ? q.username : '',
    theme: q.theme === 'auto' || themes[q.theme] ? q.theme : 'default',
    colors: {
      bg: bg.color,
      fg: color(q.fg),
      muted: color(q.muted),
      accent: color(q.accent),
      border: color(q.border)
    },
    gradient: bg.gradient,
    radius: q.radius ? int(q.radius, 6, 0, 40) : null,
    font: font || undefined,
    animation: bool(q.animation, false),
    hideBorder: bool(q.hide_border, false),
    hideTitle: bool(q.hide_title, false),
    title: q.title ? q.title.slice(0, 60) : undefined,
    locale: normalizeLocale(q.locale),
    format: q.format === 'json' || q.format === 'text' ? q.format : 'svg',
    cacheSeconds: q.cache_seconds ? int(q.cache_seconds, 1800, 1800, 86400) : undefined,
    numberFormat: oneOf(q.number_format, ['auto', 'full', 'compact'] as const, q.compact_numbers === 'true' ? 'compact' : 'auto'),
    style: parseStyle(q)
  };
}

/** Everything here is validated to numbers, enums or hex colours: user text never reaches CSS. */
export function parseStyle(q: Query): FrameStyle {
  const s: FrameStyle = {};
  if (q.width) s.width = int(q.width, 480, 200, 1600);
  if (q.padding) s.padding = int(q.padding, 25, 8, 60);
  if (q.text_scale) s.textScale = int(q.text_scale, 100, 70, 150);
  if (q.title_size) s.titleSize = int(q.title_size, 18, 10, 32);
  if (q.title_align) s.titleAlign = oneOf(q.title_align, ['left', 'center', 'right'] as const, 'left');
  if (q.hide_subtitle) s.hideSubtitle = bool(q.hide_subtitle, false);
  const title = color(q.title_color);
  if (title) s.titleColor = title;
  const icon = color(q.icon_color);
  if (icon) s.iconColor = icon;
  const value = color(q.value_color);
  if (value) s.valueColor = value;
  const heat = colorList(q.heat_colors, 5, 5);
  if (heat) s.heatColors = heat;
  const chart = colorList(q.chart_colors, 1, 10);
  if (chart) s.chartColors = chart;
  if (q.bg_opacity) s.bgOpacity = int(q.bg_opacity, 100, 0, 100);
  if (q.border_width) s.borderWidth = num(q.border_width, 1.5, 0, 6, 0.5);
  if (q.glow) s.glow = bool(q.glow, false);
  return s;
}

export const COMMON_PARAMS: ParamDoc[] = [
  { name: 'username', type: 'string', description: 'GitHub username', default: 'torvalds', group: 'data' },
  { name: 'theme', type: 'enum', description: 'Theme name (`auto` follows the viewer’s light/dark preference)', default: 'default', group: 'colors' },
  // colours
  { name: 'bg', type: 'color', description: 'Background: hex (no #) or gradient `angle,c1,c2[,c3]`, e.g. 135,0f2027,2c5364', group: 'colors' },
  { name: 'fg', type: 'color', description: 'Text colour', group: 'colors' },
  { name: 'muted', type: 'color', description: 'Secondary text (labels) colour', group: 'colors' },
  { name: 'accent', type: 'color', description: 'Accent colour (charts, highlights)', group: 'colors' },
  { name: 'title_color', type: 'color', description: 'Title colour', group: 'colors' },
  { name: 'value_color', type: 'color', description: 'Colour of the big numbers', group: 'colors' },
  { name: 'icon_color', type: 'color', description: 'Icon colour', group: 'colors' },
  { name: 'border', type: 'color', description: 'Border colour', group: 'colors' },
  { name: 'chart_colors', type: 'list', description: 'Chart series colours, comma-separated hex (up to 10)', group: 'colors' },
  { name: 'heat_colors', type: 'list', description: 'Five heatmap colours (empty → most), comma-separated hex', group: 'colors' },
  { name: 'bg_opacity', type: 'number', description: 'Background opacity %', default: 100, min: 0, max: 100, group: 'colors' },
  // layout
  { name: 'width', type: 'number', description: 'Card width in px (scales the whole card)', min: 200, max: 1600, step: 10, group: 'layout' },
  { name: 'padding', type: 'number', description: 'Inner padding', default: 25, min: 8, max: 60, group: 'layout' },
  { name: 'radius', type: 'number', description: 'Corner radius', min: 0, max: 40, group: 'layout' },
  { name: 'border_width', type: 'number', description: 'Border thickness', default: 1.5, min: 0, max: 6, step: 0.5, group: 'layout' },
  { name: 'hide_border', type: 'boolean', description: 'Hide the card border', default: false, group: 'layout' },
  { name: 'hide_title', type: 'boolean', description: 'Hide the card header', default: false, group: 'layout' },
  { name: 'hide_subtitle', type: 'boolean', description: 'Hide the @username next to the title', default: false, group: 'layout' },
  { name: 'title_align', type: 'enum', options: ['left', 'center', 'right'], default: 'left', description: 'Title alignment', group: 'layout' },
  // typography
  { name: 'title', type: 'string', description: 'Custom card title', group: 'typography' },
  { name: 'font', type: 'string', description: 'Font family, e.g. Fira Code, monospace', group: 'typography' },
  { name: 'title_size', type: 'number', description: 'Title font size', default: 18, min: 10, max: 32, group: 'typography' },
  { name: 'text_scale', type: 'number', description: 'Text size %', default: 100, min: 70, max: 150, step: 5, group: 'typography' },
  { name: 'number_format', type: 'enum', options: ['auto', 'full', 'compact'], default: 'auto', description: 'Numbers: as designed, always full (12,345) or always compact (12.3k)', group: 'typography' },
  { name: 'locale', type: 'enum', options: [...LOCALES], default: 'en', description: 'Language for labels, titles and numbers', group: 'typography' },
  // effects
  { name: 'animation', type: 'boolean', description: 'Enable animations (fade-ins, ASCII effects, 3D spin). Off by default', default: false, group: 'effects' },
  { name: 'glow', type: 'boolean', description: 'Neon glow on titles and accents', default: false, group: 'effects' },
  // data / output
  { name: 'format', type: 'enum', description: 'Response format (`text` is supported by the ascii card)', options: ['svg', 'json', 'text'], default: 'svg', group: 'data' },
  { name: 'cache_seconds', type: 'number', description: 'Cache lifetime (min 1800)', min: 1800, max: 86400, group: 'data' }
];
