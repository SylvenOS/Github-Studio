import type { Context } from 'hono';
import { notFound, toApiError } from './errors';
import type { AppEnv } from '../types';

export type Ctx = Context<AppEnv>;

export const DEFAULT_CACHE_SECONDS = 1800;
/** Static metadata (cards, themes, spec) only changes on deploy. */
export const META_CACHE = 'public, max-age=3600, s-maxage=3600';

export const cacheHeader = (seconds: number) => `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=86400`;

export function cacheSeconds(c: Ctx, requested?: number): number {
  const fromEnv = Number.parseInt(c.env?.CACHE_SECONDS ?? '', 10);
  return requested ?? (Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_CACHE_SECONDS);
}

/** Throws not_found for usernames listed in the BLOCKLIST env var. */
export function assertAllowed(c: Ctx, user: string) {
  const blocked = c.env?.BLOCKLIST?.split(',').map((s) => s.trim().toLowerCase());
  if (blocked?.includes(user.toLowerCase())) throw notFound('This user is not available');
}

export function jsonError(c: Ctx, e: unknown) {
  const err = toApiError(e);
  return c.json({ error: { code: err.code, message: err.message } }, err.status as 400, { 'Cache-Control': 'no-store' });
}
