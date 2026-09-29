import { badRequest } from './errors';
import { themes } from '../themes';

export type Query = Record<string, string>;

export interface ParamDoc {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'list' | 'color';
  description: string;
  default?: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
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
  if (!REPO.test(v)) throw badRequest('Invalid repository name');
  return v;
}

export interface CommonParams {
  username: string;
  theme: string;
  colors: { bg?: string; fg?: string; muted?: string; accent?: string; border?: string };
  radius: number | null;
  font?: string;
  animation: boolean;
  hideBorder: boolean;
  hideTitle: boolean;
  title?: string;
  format: 'svg' | 'json';
  cacheSeconds?: number;
}

export function parseCommon(q: Query): CommonParams {
  const font = q.font?.replace(/[^\w\s,'"-]/g, '').slice(0, 80).trim();
  return {
    username: username(q.username),
    theme: q.theme === 'auto' || themes[q.theme] ? q.theme : 'default',
    colors: {
      bg: color(q.bg),
      fg: color(q.fg),
      muted: color(q.muted),
      accent: color(q.accent),
      border: color(q.border)
    },
    radius: q.radius ? int(q.radius, 6, 0, 40) : null,
    font: font || undefined,
    animation: bool(q.animation, true),
    hideBorder: bool(q.hide_border, false),
    hideTitle: bool(q.hide_title, false),
    title: q.title ? q.title.slice(0, 60) : undefined,
    format: q.format === 'json' ? 'json' : 'svg',
    cacheSeconds: q.cache_seconds ? int(q.cache_seconds, 1800, 1800, 86400) : undefined
  };
}

export const COMMON_PARAMS: ParamDoc[] = [
  { name: 'username', type: 'string', description: 'GitHub username', default: 'torvalds' },
  { name: 'theme', type: 'enum', description: 'Theme name (`auto` follows the viewer’s light/dark preference)', default: 'default' },
  { name: 'bg', type: 'color', description: 'Background colour override (hex, no #)' },
  { name: 'fg', type: 'color', description: 'Text colour override' },
  { name: 'muted', type: 'color', description: 'Secondary text colour override' },
  { name: 'accent', type: 'color', description: 'Accent colour override' },
  { name: 'border', type: 'color', description: 'Border colour override' },
  { name: 'radius', type: 'number', description: 'Corner radius', min: 0, max: 40 },
  { name: 'font', type: 'string', description: 'Font family' },
  { name: 'title', type: 'string', description: 'Custom card title' },
  { name: 'animation', type: 'boolean', description: 'CSS animations', default: true },
  { name: 'hide_border', type: 'boolean', description: 'Hide the card border', default: false },
  { name: 'hide_title', type: 'boolean', description: 'Hide the card header', default: false },
  { name: 'format', type: 'enum', description: 'Response format', options: ['svg', 'json'], default: 'svg' },
  { name: 'cache_seconds', type: 'number', description: 'Cache lifetime (min 1800)', min: 1800, max: 86400 }
];
