import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cards } from '../src/cards';
import { clearMemoryCache } from '../src/core/cache';
import app from '../src/index';
import { assertWellFormedSvg, mockGitHub } from './helpers';

const env = { GITHUB_TOKEN: 'test-token' };
type Res = { json(): Promise<any> } & Response;
const get = (path: string, e: Record<string, string> = env) => app.request(path, {}, e) as Promise<Res>;

beforeEach(() => {
  clearMemoryCache();
  vi.unstubAllGlobals();
});

describe('every card renders valid SVG', () => {
  for (const card of cards) {
    it(`/api/${card.id}`, async () => {
      mockGitHub();
      const res = await get(`/api/${card.id}?username=octo&repo=alpha`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('image/svg+xml');
      expect(res.headers.get('x-card-error')).toBeNull();
      const svg = await res.text();
      assertWellFormedSvg(svg);
      expect(svg).toContain('aria-label=');
    });
  }
});

describe('card output', () => {
  it('shows real data, not placeholders', async () => {
    mockGitHub();
    const svg = await (await get('/api/stats?username=octo')).text();
    expect(svg).toContain('5,312'); // stars: 5000+300+12+0
    expect(svg).toContain('1,234'); // followers
    expect(svg).not.toContain('>184<');
  });

  it('escapes untrusted repo descriptions', async () => {
    mockGitHub();
    const svg = await (await get('/api/top-repos?username=octo')).text();
    expect(svg).toContain('&lt;script&gt;');
    assertWellFormedSvg(svg);
  });

  it('theme=auto embeds a dark-mode media query; colour overrides are validated', async () => {
    mockGitHub();
    const auto = await (await get('/api/stats?username=octo&theme=auto')).text();
    expect(auto).toContain('prefers-color-scheme:dark');
    const custom = await (await get('/api/stats?username=octo&accent=ff0000&bg=zzz')).text();
    expect(custom).toContain('--accent:#ff0000');
    expect(custom).toContain('--bg:#ffffff');
  });

  it('supports hide/show and layouts on the stats card', async () => {
    mockGitHub();
    const svg = await (await get('/api/stats?username=octo&hide=stars,forks&show=commits&layout=compact')).text();
    expect(svg).not.toContain('>Stars<');
    expect(svg).toContain('Commits');
  });

  it('streak card counts current and longest streaks', async () => {
    mockGitHub({ calendarDays: 30 });
    const json = await (await get('/api/streak?username=octo&format=json')).json();
    expect(json.current.length).toBe(30);

    clearMemoryCache();
    mockGitHub({ calendarDays: 30, gaps: [0, 1] });
    const broken = await (await get('/api/streak?username=octo&format=json')).json();
    expect(broken.current.length).toBe(0);
    expect(broken.longest.length).toBe(28);
  });

  it('achievements JSON respects hide', async () => {
    mockGitHub();
    const json = await (await get('/api/achievements?username=octo&format=json&hide=stars,years')).json();
    expect(json.trophies.map((t: { id: string }) => t.id)).not.toContain('stars');
    expect(json.trophies).toHaveLength(7);
    expect(json.overall.rank).toBeDefined();
  });
});

describe('errors', () => {
  it('rejects invalid usernames with an SVG error card by default', async () => {
    const res = await get('/api/stats?username=%3Cscript%3E');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-card-error')).toBe('bad_request');
    assertWellFormedSvg(await res.text());
  });

  it('returns real status codes for format=json', async () => {
    expect((await get('/api/stats?format=json')).status).toBe(400);
    mockGitHub({ userMissing: true });
    const res = await get('/api/stats?username=ghost&format=json');
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('not_found');
  });

  it('404s unknown cards and lists the available ones', async () => {
    const res = await get('/api/nope?username=octo');
    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toContain('stats');
  });

  it('honours BLOCKLIST', async () => {
    mockGitHub();
    const res = await get('/api/stats?username=Octo&format=json', { ...env, BLOCKLIST: 'octo' });
    expect(res.status).toBe(404);
  });

  it('repo card requires repo', async () => {
    expect((await get('/api/repos?username=octo&format=json')).status).toBe(400);
  });
});

describe('caching and meta', () => {
  it('shares GitHub data across cards and themes (one upstream call)', async () => {
    const fetchMock = mockGitHub();
    await Promise.all([
      get('/api/stats?username=octo'),
      get('/api/languages?username=octo&theme=dark'),
      get('/api/radar?username=octo')
    ]);
    const userCalls = fetchMock.mock.calls.filter(([, init]) => String(init?.body).includes('followers'));
    expect(userCalls).toHaveLength(1);
  });

  it('sets cache headers, CORS and a restrictive CSP', async () => {
    mockGitHub();
    const res = await get('/api/stats?username=octo');
    expect(res.headers.get('cache-control')).toContain('max-age=1800');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
  });

  it('lists cards with their params and serves the playground', async () => {
    const meta = await (await get('/api/cards')).json();
    expect(meta.cards.map((c: { id: string }) => c.id)).toContain('streak');
    expect(meta.common.find((p: { name: string }) => p.name === 'theme').options).toContain('auto');
    expect(await (await get('/')).text()).toContain('GitPulse');
  });

  it('serves /api/profile with metrics, trophies and isolated plugin failures', async () => {
    mockGitHub();
    const json = await (await get('/api/profile?username=octo&plugins=none')).json();
    expect(json.metrics.stars).toBe(5312);
    expect(json.trophies.length).toBeGreaterThan(5);
    expect(json.plugins).toEqual({});
    const withPlugins = await (await get('/api/profile?username=octo&plugins=devto')).json();
    expect(withPlugins.plugins.devto.error).toBeDefined(); // mocked fetch 404s; the request still succeeds
  });
});
