import { beforeEach, describe, expect, it, vi } from 'vitest';
import { streaksOf } from '../src/cards/streak';
import { clearMemoryCache } from '../src/core/cache';
import { emojify } from '../src/core/text';
import { parsePinnedHtml } from '../src/github/parse';
import { resetTokenStates } from '../src/github/tokens';
import app from '../src/index';
import { assertWellFormedSvg, mockGitHub, PROFILE_HTML, testEnv } from './helpers';

type Res = { json(): Promise<any> } & Response;
let env = testEnv();
const get = (path: string, e: Record<string, unknown> = env) => app.request(path, {}, e) as Promise<Res>;
const svgOf = async (path: string, e?: Record<string, unknown>) => {
  const res = await get(path, e);
  expect(res.headers.get('x-card-error'), path).toBeNull();
  const svg = await res.text();
  assertWellFormedSvg(svg);
  return svg;
};
const day = (offset: number, count: number) => ({ date: new Date(Date.UTC(2026, 2, 1) + offset * 86_400_000).toISOString().slice(0, 10), count, level: (count ? 2 : 0) as 0 | 2 });

beforeEach(() => {
  clearMemoryCache();
  resetTokenStates();
  vi.unstubAllGlobals();
  env = testEnv();
});

describe('fixes found with real data', () => {
  it('fetches avatars and providers without redirect:"error" (Workers rejects it)', async () => {
    const fetchMock = mockGitHub();
    await svgOf('/api/profile-card?username=octo');
    const avatarCall = fetchMock.mock.calls.find(([u]) => String(u).startsWith('https://avatars.githubusercontent.com/'));
    expect(avatarCall).toBeTruthy();
    expect((avatarCall![1] as RequestInit).redirect).toBe('manual');
    expect(fetchMock.mock.calls.every(([, init]) => (init as RequestInit | undefined)?.redirect !== 'error')).toBe(true);
  });
  it('wakatime falls back to the profile’s public range instead of failing', async () => {
    mockGitHub();
    const svg = await svgOf('/api/wakatime?username=narrow&range=last_7_days');
    expect(svg).toContain('last 30 days');
  });
  it('error cards explain the cause and how to fix it', async () => {
    mockGitHub();
    const res = await get('/api/sponsors?username=octo', {});
    const svg = await res.text();
    assertWellFormedSvg(svg);
    expect(svg).toContain('Needs a GitHub token');
    expect(svg).toContain('GITHUB_TOKEN');
    expect(await (await get('/api/stats?username=octo&layout=nope&hide=x')).text()).not.toContain('Something went wrong');
  });
  it('star history explains repositories without stars', async () => {
    const fetchMock = mockGitHub();
    fetchMock.mockImplementationOnce(async () => Response.json({ stargazers_count: 0, created_at: '2024-01-01T00:00:00Z', name: 'empty', owner: { login: 'octo' } }));
    const svg = await svgOf('/api/stars?repo=octo/empty');
    expect(svg).toContain('no stars yet');
  });
});

describe('token-less fallbacks', () => {
  it('parses pinned repositories from the public profile page', () => {
    const pins = parsePinnedHtml(PROFILE_HTML);
    expect(pins).toHaveLength(2);
    expect(pins[0]).toMatchObject({ owner: 'octo', name: 'alpha', stars: 1200, forks: 34, language: 'TypeScript', languageColor: '#3178c6', description: 'Fast :zap: things & more' });
    expect(pins[1]).toMatchObject({ owner: 'acme', name: 'tool', description: null, language: null });
    expect(parsePinnedHtml('<html>no pins</html>')).toEqual([]);
  });
  it('pinned works without a token and turns :shortcodes: into emoji', async () => {
    mockGitHub();
    const svg = await svgOf('/api/pinned?username=octo', {});
    expect(svg).toContain('alpha');
    expect(svg).toContain('acme/tool');
    expect(svg).toContain('Fast ⚡ things &amp; more');
  });
  it('code volume measures recent repositories via REST without a token', async () => {
    mockGitHub();
    const j = await (await get('/api/code?username=octo&format=json')).json();
    expect(j.length).toBeGreaterThan(0); // with token: GraphQL bytes
    const fetchMock = mockGitHub();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/users/octo/repos')) return Response.json([{ name: 'alpha', stargazers_count: 3, forks_count: 0, language: 'TypeScript', pushed_at: '2026-01-01T00:00:00Z', created_at: '2025-02-01T00:00:00Z' }]);
      if (url.endsWith('/users/octo')) return Response.json({ login: 'octo', public_repos: 1, created_at: '2020-01-01T00:00:00Z' });
      if (url.endsWith('/repos/octo/alpha/languages')) return Response.json({ TypeScript: 34000 });
      if (url.includes('/search/')) return Response.json({ total_count: 1 });
      return new Response('', { status: 404 });
    });
    const svg = await svgOf('/api/code?username=octo', {});
    expect(svg).toContain('latest repos');
    const trend = await (await get('/api/language-trend?username=octo&years=3&format=json', {})).json();
    expect(trend.basis).toBe('repos');
    expect(JSON.stringify(trend.years)).toContain('TypeScript');
  });
});

describe('global style options', () => {
  it('card styles, background patterns and title options render valid SVG', async () => {
    mockGitHub();
    for (const style of ['glass', 'elevated', 'outline', 'neon', 'gradient', 'soft']) {
      const svg = await svgOf(`/api/stats?username=octo&card_style=${style}`);
      if (style === 'elevated') expect(svg).toContain('filter="url(#lift)"');
      if (style === 'neon') expect(svg).toContain('filter="url(#neon)"');
      if (style === 'gradient') expect(svg).toContain('stroke="url(#bdGrad)"');
      if (style === 'glass') expect(svg).toContain('url(#sheen)');
    }
    for (const pattern of ['dots', 'grid', 'diagonal', 'topo']) expect(await svgOf(`/api/languages?username=octo&bg_pattern=${pattern}`)).toContain('url(#bgpat)');
    const titled = await svgOf('/api/streak?username=octo&title_gradient=true&accent2=ff00aa&title_transform=uppercase&title_divider=true');
    expect(titled).toContain('fill:url(#titleGrad)');
    expect(titled).toContain('#ff00aa');
    expect(titled).toContain('text-transform:uppercase');
    expect((await get('/api/stats?username=octo&card_style=evil')).headers.get('x-card-error')).toBeNull(); // unknown values fall back
  });
});

describe('card upgrades', () => {
  it('streaks: daily, weekly and with excluded weekdays', () => {
    // Sun 2026-03-01 .. ; active every weekday, nothing on weekends
    const days = Array.from({ length: 21 }, (_, i) => {
      const dow = (i + 0) % 7; // 2026-03-01 is a Sunday
      return day(i, dow === 0 || dow === 6 ? 0 : 1);
    });
    expect(streaksOf(days, 'daily').longest.length).toBe(5);
    expect(streaksOf(days, 'daily', [0, 6]).longest.length).toBe(15);
    expect(streaksOf(days, 'weekly').current.length).toBe(3);
  });
  it('streak layouts and options', async () => {
    mockGitHub({ calendarDays: 30 });
    for (const layout of ['classic', 'ring', 'cards', 'compact', 'week']) await svgOf(`/api/streak?username=octo&layout=${layout}`);
    expect(await svgOf('/api/streak?username=octo&exclude_days=sat,sun')).toContain('Sat, Sun excluded');
    expect(await svgOf('/api/streak?username=octo&mode=weekly&layout=compact')).toContain('week');
    expect((await get('/api/streak?username=octo&exclude_days=funday')).headers.get('x-card-error')).toBe('bad_request');
  });
  it('stats: classic list and tiles with columns', async () => {
    mockGitHub();
    expect(await svgOf('/api/stats?username=octo&layout=classic&rank=letter')).toContain('Repositories:');
    await svgOf('/api/stats?username=octo&layout=tiles&columns=3');
    await svgOf('/api/stats?username=octo&columns=2');
  });
  it('top repos: grid, table and ranked, with language and star filters', async () => {
    mockGitHub();
    for (const layout of ['list', 'grid', 'table', 'ranked']) await svgOf(`/api/top-repos?username=octo&layout=${layout}&updated=true`);
    const j = await (await get('/api/top-repos?username=octo&language=rust&format=json')).json();
    expect(j.map((r: { name: string }) => r.name)).toEqual(['beta']);
    const k = await (await get('/api/top-repos?username=octo&min_stars=100&format=json')).json();
    expect(k.every((r: { stars: number }) => r.stars >= 100)).toBe(true);
  });
  it('languages treemap, donut centre label and hidden percentages', async () => {
    mockGitHub();
    await svgOf('/api/languages?username=octo&layout=treemap');
    expect(await svgOf('/api/languages?username=octo&layout=donut')).toMatch(/>\d+%<\/text><text[^>]*>TypeScript/);
    expect(await svgOf('/api/languages?username=octo&layout=bars&percentages=false')).not.toMatch(/>\d+\.\d%</); // the aria-label keeps them
  });
  it('profile card layouts, stat choice and avatar shapes', async () => {
    mockGitHub();
    for (const layout of ['default', 'centered', 'banner']) await svgOf(`/api/profile-card?username=octo&layout=${layout}&shape=rounded`);
    const svg = await svgOf('/api/profile-card?username=octo&stats=contributions,reviews');
    expect(svg).toContain('Contributions');
    expect(svg).not.toContain('>Followers<');
  });
  it('pinned falls back to top repos and supports three columns', async () => {
    mockGitHub();
    await svgOf('/api/pinned?username=octo&columns=3&descriptions=false');
    const j = await (await get('/api/pinned?username=octo&format=json')).json();
    expect(j.source).toBe('pinned');
  });
  it('compare: table layout, avatars and a default rival', async () => {
    mockGitHub();
    const svg = await svgOf('/api/compare?username=octo&layout=table');
    expect(svg).toContain('Even match');
    expect(svg).toContain('data:image/png;base64');
  });
  it('radar options and the repository card’s detailed layout for any owner', async () => {
    mockGitHub();
    await svgOf('/api/radar?username=octo&grid=circle&levels=6&values=true&fill=70&scale=linear');
    const repo = await svgOf('/api/repos?username=someone&repo=octo/alpha&layout=detailed');
    expect(repo).toContain('octo/alpha');
    await svgOf('/api/repos?username=octo&repo=alpha&layout=compact');
    expect((await get('/api/repos?username=octo&repo=a/b/c')).headers.get('x-card-error')).toBe('bad_request');
  });
  it('impact tiles and columns', async () => {
    mockGitHub();
    await svgOf('/api/impact?username=octo&tiles=true&columns=6&count=0');
  });
  it('emoji shortcodes', () => {
    expect(emojify(':rocket: Fast :zap:')).toBe('🚀 Fast ⚡');
    expect(emojify('Hello :not_an_emoji_code: world')).toBe('Hello world');
    expect(emojify(null)).toBe('');
  });
});
