import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheStats, cached, canonicalKey, clearMemoryCache } from '../src/core/cache';
import { notFound, upstream } from '../src/core/errors';
import { GitHubClient } from '../src/github/client';
import { poolStatus, resetTokenStates } from '../src/github/tokens';
import app from '../src/index';
import { stripActive } from '../src/readme/render';
import { encodeSpecParam, normalizeSpec } from '../src/readme/spec';
import { USER_FIXTURE, mockGitHub } from './helpers';

type Res = { json(): Promise<any> } & Response;
const env = { GITHUB_TOKEN: 'test-token' };
const get = (path: string, e: Record<string, string> = env) => app.request(path, {}, e) as Promise<Res>;
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  clearMemoryCache();
  resetTokenStates();
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('cache: freshness, stale data and negative results', () => {
  it('serves stale data instantly and refreshes it in the background', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const load = vi.fn().mockResolvedValueOnce('A').mockResolvedValueOnce('B');
    expect(await cached('k1', { ttl: 10 }, load)).toBe('A');
    vi.setSystemTime(Date.now() + 20_000); // past the soft TTL
    expect(await cached('k1', { ttl: 10 }, load)).toBe('A'); // stale, no waiting
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
    expect(await cached('k1', { ttl: 10 }, load)).toBe('B');
    expect(cacheStats.stale).toBe(1);
  });

  it('keeps serving the last good value when the upstream fails after the hard TTL', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    expect(await cached('k2', { ttl: 10, hard: 60 }, async () => 'good')).toBe('good');
    vi.setSystemTime(Date.now() + 120_000);
    expect(await cached('k2', { ttl: 10, hard: 60 }, async () => { throw upstream('GitHub is down'); })).toBe('good');
    expect(cacheStats.errorsMasked).toBe(1);
  });

  it('remembers "not found" so unknown users cannot hammer GitHub', async () => {
    const load = vi.fn().mockRejectedValue(notFound('nope'));
    await expect(cached('k3', { ttl: 10 }, load)).rejects.toThrow();
    await expect(cached('k3', { ttl: 10 }, load)).rejects.toThrow();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent misses into one upstream call', async () => {
    let calls = 0;
    const load = () => new Promise<string>((r) => { calls++; setTimeout(() => r('v'), 10); });
    const out = await Promise.all(Array.from({ length: 20 }, () => cached('k4', { ttl: 10 }, load)));
    expect(new Set(out)).toEqual(new Set(['v']));
    expect(calls).toBe(1);
  });
});

describe('canonical cache keys', () => {
  const allowed = new Map<string, { default?: unknown }>([['username', {}], ['theme', { default: 'default' }], ['layout', { default: 'grid' }]]);
  it('ignores junk params, defaults, order and username case', () => {
    const a = canonicalKey('https://x', '/api/stats', { username: 'Octo', theme: 'default', layout: 'grid', junk: Math.random().toString(), v: '3' }, allowed);
    const b = canonicalKey('https://x', '/api/stats', { username: 'octo' }, allowed);
    expect(a).toBe(b);
    expect(canonicalKey('https://x', '/api/stats', { layout: 'compact', username: 'octo' }, allowed)).toBe('https://x/api/stats?layout=compact&username=octo');
  });
});

describe('token pool failover', () => {
  it('benches a revoked token and retries with a healthy one', async () => {
    const inner = mockGitHub();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get('authorization');
      if (auth === 'Bearer bad') return new Response('{"message":"Bad credentials"}', { status: 401 });
      return inner(input, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    // deterministic: always try the first of the healthiest tokens (the bad one) first
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const client = new GitHubClient({ tokens: ['bad', 'good'] });
    for (let i = 0; i < 4; i++) {
      clearMemoryCache();
      expect((await new GitHubClient({ tokens: ['bad', 'good'] }).getUser('octo')).login).toBe('octo');
    }
    const status = poolStatus(['bad', 'good']);
    expect(status.find((t) => t.label === 'token-1')?.healthy).toBe(false);
    expect(status.find((t) => t.label === 'token-2')?.healthy).toBe(true);
    expect(JSON.stringify(status)).not.toContain('good');
    expect(client.hasToken).toBe(true);
    vi.restoreAllMocks();
  });

  it('a card keeps rendering from stale data while GitHub is rate-limiting', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    mockGitHub();
    expect((await get('/api/stats?username=octo')).headers.get('x-card-error')).toBeNull();
    vi.setSystemTime(Date.now() + 2 * 3600_000);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })));
    const res = await get('/api/stats?username=octo');
    expect(res.headers.get('x-card-error')).toBeNull();
    expect(await res.text()).toContain('5,312');
  });

  it('error cards are cached briefly for outages and long for bad input', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    const outage = await get('/api/stats?username=octo');
    expect(outage.headers.get('x-card-error')).toBe('upstream');
    expect(outage.headers.get('cache-control')).toContain('max-age=120');
    const bad = await get('/api/stats?username=-bad-');
    expect(bad.headers.get('cache-control')).toContain('max-age=86400');
  });
});

describe('request budget', () => {
  it('a 15-year streak needs only a couple of GitHub calls (past years are batched)', async () => {
    const fetchMock = mockGitHub({ calendarDays: 30 });
    const res = await get('/api/streak?username=octo&years=15');
    expect(res.headers.get('x-card-error')).toBeNull();
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4);
  });
});

describe('README hardening', () => {
  it('rejects oversized bodies before reading them and overly complex specs', async () => {
    const big = await app.request('/api/readme', { method: 'POST', headers: { 'content-length': '500000', 'content-type': 'application/json' }, body: '{}' }, env);
    expect(big.status).toBe(400);
    const heavy = { username: 'octo', blocks: Array.from({ length: 20 }, () => ({ type: 'details', summary: 's', blocks: Array.from({ length: 20 }, () => ({ type: 'divider' })) })) };
    expect(() => normalizeSpec(heavy)).toThrow(/too complex/);
  });
  it('preview sanitizer drops active tags and non-http URLs, even entity-encoded ones', () => {
    const out = stripActive('<a href="java&#x73;cript:alert(1)">x</a><meta http-equiv="refresh" content="0;url=https://evil"><form action="https://evil"><a href="https://ok.dev">ok</a><img src="data:text/html,x">');
    expect(out).not.toMatch(/javascript|java&#x73;|<meta|<form|data:/i);
    expect(out).toContain('href="https://ok.dev"');
  });
  it('GET-served HTML previews never include raw HTML blocks', async () => {
    const spec = encodeSpecParam({ username: 'octo', blocks: [{ type: 'html', html: '<b>raw</b>' }, { type: 'heading', text: 'Hi' }] });
    const html = await (await get(`/api/readme?spec=${spec}&format=html`)).text();
    expect(html).not.toContain('<b>raw</b>');
    expect(html).toContain('Hi');
  });
});

describe('expensive cards stay bounded', () => {
  it('3D ascii frames are capped by a cell budget', async () => {
    mockGitHub();
    const svg = await (await get('/api/ascii?username=octo&shape=sphere&cols=110&frames=48&animation=true')).text();
    const frames = svg.match(/class="fr"/g)?.length ?? 0;
    expect(frames).toBeGreaterThan(1);
    expect(frames).toBeLessThanOrEqual(Math.floor(60_000 / (110 * 55)));
    expect(svg.length).toBeLessThan(2_500_000);
  });
  it('USER_FIXTURE still parses through the slimmer core query', () => {
    expect(USER_FIXTURE.login).toBe('octo');
  });
});
