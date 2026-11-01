import type { Context } from 'hono';
import { ApiError, notFound } from './errors';

/**
 * Two-tier cache for upstream (GitHub) data, built to keep READMEs working under heavy traffic and
 * GitHub outages:
 *  - L1: per-isolate in-memory LRU with a byte budget.
 *  - L2: Cloudflare Cache API (`caches.default`), shared by every request in the colo.
 * Each entry has a *soft* TTL (fresh) and a much longer *hard* TTL. Between the two we serve the stale
 * value instantly and refresh in the background (stale-while-revalidate). If a refresh fails - GitHub
 * down, rate-limited, timing out - we keep serving the last good value (stale-if-error). Unknown users
 * are cached negatively so they can't be used to hammer GitHub. Concurrent misses for a key are
 * coalesced into one upstream call.
 */
interface Stored {
  v?: unknown;
  /** Negative entry: the upstream said this doesn't exist. */
  err?: 'not_found';
  /** Epoch ms when the value was fetched. */
  at: number;
  /** Approximate size in bytes (L1 budget accounting). */
  size: number;
}

export interface CacheOptions {
  /** Seconds a value is considered fresh. */
  ttl: number;
  /** Seconds a stale value may still be served (while refreshing / when the upstream fails). Default 7 days. */
  hard?: number;
  /** Seconds a "not found" result is remembered. Default 1 hour. */
  negative?: number;
  waitUntil?: (p: Promise<unknown>) => void;
}

const L1_BUDGET = 24 * 1024 * 1024; // keep well under the 128 MB isolate limit
const DEFAULT_HARD = 7 * 86_400;
const DEFAULT_NEGATIVE = 3600;

const memory = new Map<string, Stored>();
const inflight = new Map<string, Promise<unknown>>();
let l1Bytes = 0;
export const cacheStats = { l1Hits: 0, l2Hits: 0, stale: 0, misses: 0, errorsMasked: 0, negativeHits: 0 };

const edge: Cache | undefined =
  typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined;

const edgeUrl = (key: string) => `https://cache.internal/v2/${encodeURIComponent(key)}`;

function remember(key: string, s: Stored) {
  const old = memory.get(key);
  if (old) {
    l1Bytes -= old.size;
    memory.delete(key);
  }
  memory.set(key, s); // re-insert = most recently used
  l1Bytes += s.size;
  for (const [k, v] of memory) {
    if (l1Bytes <= L1_BUDGET) break;
    memory.delete(k); // Map iterates oldest first -> least recently used
    l1Bytes -= v.size;
  }
}

async function read(key: string): Promise<Stored | undefined> {
  const hit = memory.get(key);
  if (hit) {
    remember(key, hit); // bump recency
    cacheStats.l1Hits++;
    return hit;
  }
  if (!edge) return undefined;
  try {
    const res = await edge.match(edgeUrl(key));
    if (!res) return undefined;
    const text = await res.text();
    const s = JSON.parse(text) as Stored;
    s.size = text.length;
    remember(key, s);
    cacheStats.l2Hits++;
    return s;
  } catch {
    return undefined; // cache is best-effort
  }
}

function write(key: string, s: Omit<Stored, 'size'>, opts: CacheOptions) {
  const body = JSON.stringify(s);
  remember(key, { ...s, size: body.length });
  if (!edge) return;
  const keep = s.err ? opts.negative ?? DEFAULT_NEGATIVE : opts.hard ?? DEFAULT_HARD;
  const store = edge
    .put(edgeUrl(key), new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${keep}` } }))
    .catch(() => undefined);
  opts.waitUntil?.(store);
}

/** Runs `load` once per key at a time, storing the outcome (value or negative result). */
function refresh<T>(key: string, opts: CacheOptions, load: () => Promise<T>): Promise<T> {
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const run = (async () => {
    try {
      const v = await load();
      write(key, { v, at: Date.now() }, opts);
      return v;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'not_found') write(key, { err: 'not_found', at: Date.now() }, opts);
      throw e;
    }
  })().finally(() => inflight.delete(key));
  inflight.set(key, run);
  return run;
}

export async function cached<T>(key: string, opts: CacheOptions, load: () => Promise<T>): Promise<T> {
  const s = await read(key);
  const age = s ? (Date.now() - s.at) / 1000 : Infinity;

  if (s?.err) {
    if (age < (opts.negative ?? DEFAULT_NEGATIVE)) {
      cacheStats.negativeHits++;
      throw notFound('GitHub user or repository not found');
    }
  } else if (s && s.v !== undefined) {
    if (age < opts.ttl) return s.v as T;
    if (age < (opts.hard ?? DEFAULT_HARD)) {
      // stale-while-revalidate: answer now, refresh in the background
      cacheStats.stale++;
      const bg = refresh(key, opts, load).catch(() => undefined);
      opts.waitUntil?.(bg);
      return s.v as T;
    }
  }

  cacheStats.misses++;
  try {
    return await refresh(key, opts, load);
  } catch (e) {
    // stale-if-error: a failing upstream should never turn a working card into an error card
    if (s?.v !== undefined && !(e instanceof ApiError && e.code === 'not_found')) {
      cacheStats.errorsMasked++;
      return s.v as T;
    }
    throw e;
  }
}

export function clearMemoryCache() {
  memory.clear();
  inflight.clear();
  l1Bytes = 0;
  for (const k of Object.keys(cacheStats) as (keyof typeof cacheStats)[]) cacheStats[k] = 0;
}

export const l1Info = () => ({ entries: memory.size, bytes: l1Bytes, inflight: inflight.size });

/**
 * Whole-response edge cache with a caller-supplied canonical key, so junk or reordered query
 * parameters can't create new cache entries (cache-busting) or force re-renders.
 * Returns `[response, hit]`.
 */
export async function edgeResponse(c: Context, key: string, produce: () => Promise<Response>): Promise<[Response, boolean]> {
  if (!edge) return [await produce(), false];
  const req = new Request(key);
  const hit = await edge.match(req).catch(() => undefined);
  if (hit) return [new Response(hit.body, hit), true];
  const res = await produce();
  if (res.ok && /max-age=[1-9]/.test(res.headers.get('Cache-Control') ?? '')) {
    try {
      c.executionCtx.waitUntil(edge.put(req, res.clone()).catch(() => undefined));
    } catch {
      /* no execution context available */
    }
  }
  return [res, false];
}

/**
 * Canonical cache key: only parameters the endpoint understands, with empty values and defaults
 * removed, usernames lower-cased and keys sorted.
 */
export function canonicalKey(
  origin: string,
  path: string,
  query: Record<string, string>,
  allowed: Map<string, { default?: unknown }>,
  extra?: (name: string) => boolean
): string {
  const out = new URLSearchParams();
  for (const k of Object.keys(query).sort()) {
    const doc = allowed.get(k) ?? (extra?.(k) ? {} : undefined);
    if (!doc) continue;
    let v = (query[k] ?? '').trim().slice(0, 300);
    if (k === 'username' || k === 'vs') v = v.toLowerCase();
    if (v === '' || (doc.default !== undefined && String(doc.default) === v)) continue;
    out.set(k, v);
  }
  const qs = out.toString();
  return `${origin}${path}${qs ? `?${qs}` : ''}`;
}
