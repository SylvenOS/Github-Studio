import type { MiddlewareHandler } from 'hono';

/**
 * Two-tier cache for upstream data.
 *  - Cloudflare Cache API (`caches.default`) when running on the edge: shared across requests/isolates.
 *  - In-memory Map otherwise (Node, tests) and as a per-isolate L1.
 * Concurrent misses for the same key are coalesced into a single upstream call.
 */
interface Entry {
  value: unknown;
  expires: number;
}

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 500;

const edge: Cache | undefined =
  typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined;

const edgeUrl = (key: string) => `https://cache.internal/${encodeURIComponent(key)}`;

export interface CacheOptions {
  ttl: number;
  waitUntil?: (p: Promise<unknown>) => void;
}

export async function cached<T>(key: string, opts: CacheOptions, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = memory.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const run = (async () => {
    if (edge) {
      try {
        const res = await edge.match(edgeUrl(key));
        if (res) {
          const value = (await res.json()) as T;
          remember(key, value, opts.ttl);
          return value;
        }
      } catch {
        /* cache is best-effort */
      }
    }

    const value = await load();
    remember(key, value, opts.ttl);

    if (edge) {
      const store = edge
        .put(
          edgeUrl(key),
          new Response(JSON.stringify(value), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${opts.ttl}` }
          })
        )
        .catch(() => undefined);
      opts.waitUntil?.(store);
    }
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, run);
  return run;
}

function remember(key: string, value: unknown, ttl: number) {
  if (memory.size >= MAX_ENTRIES) {
    // drop the oldest insertion (Map preserves insertion order)
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  // keep the L1 short so edge-level invalidation is honoured reasonably quickly
  memory.set(key, { value, expires: Date.now() + Math.min(ttl, 300) * 1000 });
}

export function clearMemoryCache() {
  memory.clear();
  inflight.clear();
}

/** Same URL with query params sorted, so `?a=1&b=2` and `?b=2&a=1` share one cache entry. */
export function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.searchParams.sort();
  u.hash = '';
  return u.toString();
}

/**
 * Caches whole successful responses in the Cloudflare Cache API (no-op elsewhere).
 * Lifetime comes from each response's own Cache-Control header.
 */
export function responseCache(): MiddlewareHandler {
  return async (c, next) => {
    if (!edge || c.req.method !== 'GET') return next();
    const key = new Request(normalizeUrl(c.req.url));
    const hit = await edge.match(key).catch(() => undefined);
    if (hit) return new Response(hit.body, hit);

    await next();
    if (c.res.ok && /max-age=[1-9]/.test(c.res.headers.get('Cache-Control') ?? '')) {
      try {
        c.executionCtx.waitUntil(edge.put(key, c.res.clone()).catch(() => undefined));
      } catch {
        /* no execution context available */
      }
    }
  };
}
