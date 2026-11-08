import { notFound, upstream } from '../core/errors';
import { readTextCapped } from '../core/http';

export interface SafeFetchOptions {
  /** Hostnames this call may reach (exact match). Anything else is refused before any network I/O. */
  hosts: string[];
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  /** Response bodies above this size are refused. */
  maxBytes?: number;
  /** Provider name used in error messages. */
  name: string;
}

/**
 * The single way non-GitHub providers (WakaTime, Spotify, ...) are reached: https only, allow-listed
 * hosts, no redirects, a timeout and a body-size cap, so a misbehaving provider can't stall or bloat a card.
 */
export async function safeFetch(url: string, o: SafeFetchOptions): Promise<Response> {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !o.hosts.includes(u.hostname)) throw upstream(`Refusing to contact ${u.hostname}`);
  let res: Response;
  try {
    res = await fetch(u.toString(), {
      method: o.method ?? 'GET',
      headers: { 'User-Agent': 'ProfileFoundry (+https://sylvenos.com)', ...o.headers },
      body: o.body,
      redirect: 'manual', // Workers rejects 'error'; 3xx responses are refused below
      signal: AbortSignal.timeout(o.timeoutMs ?? 6000)
    });
  } catch {
    throw upstream(`${o.name} did not respond in time`);
  }
  if (res.status >= 300 && res.status < 400) throw upstream(`${o.name} tried to redirect`);
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > (o.maxBytes ?? 2_000_000)) throw upstream(`${o.name} response is too large`);
  return res;
}

export async function safeJson<T>(url: string, o: SafeFetchOptions): Promise<{ status: number; data: T }> {
  const res = await safeFetch(url, o);
  const text = await readTextCapped(res.body, o.maxBytes ?? 2_000_000);
  if (text === null) throw upstream(`${o.name} response is too large`);
  if (res.status === 404) throw notFound(`${o.name}: not found`);
  let data: T;
  try {
    data = (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw upstream(`${o.name} returned an unreadable response`);
  }
  return { status: res.status, data };
}

/** Image bytes as a data URI (for album art etc.), size-capped. */
export async function imageDataUri(url: string, o: SafeFetchOptions): Promise<string | null> {
  try {
    const res = await safeFetch(url, o);
    if (!res.ok) return null;
    const mime = res.headers.get('content-type')?.split(';')[0] ?? '';
    if (!/^image\/(png|jpeg|gif|webp)$/.test(mime)) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > (o.maxBytes ?? 500_000)) return null;
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:${mime};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}
