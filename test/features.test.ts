import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RANKS, calculateTrophies, overallRank, rankProgress } from '../src/achievements/engine';
import { bucketize } from '../src/cards/activity';
import { selectTrophies } from '../src/cards/achievements';
import { clearMemoryCache } from '../src/core/cache';
import { CHARSETS, cellsToText, gridToCells, identiconGrid, rowToRuns, sampleGrid } from '../src/core/ascii';
import { translator } from '../src/core/i18n';
import { decodeImage } from '../src/core/image';
import { background } from '../src/core/params';
import app from '../src/index';
import { calculateProfileMetrics } from '../src/metrics';
import { calculateGrade } from '../src/metrics/grade';
import { trophyArt, trophyDefs } from '../src/svg/trophy';
import { assertWellFormedSvg, makeAvatarPng, mockGitHub } from './helpers';

type Res = { json(): Promise<any> } & Response;
const env = { GITHUB_TOKEN: 'test-token' };
const get = (path: string) => app.request(path, {}, env) as Promise<Res>;

beforeEach(() => {
  clearMemoryCache();
  vi.unstubAllGlobals();
});

describe('trophies', () => {
  it('draws a distinct trophy for every rank, well-formed', () => {
    const arts = RANKS.map((r) => trophyArt(r, true));
    expect(new Set(arts).size).toBe(RANKS.length);
    for (const r of RANKS) {
      assertWellFormedSvg(`<svg>${trophyDefs([r], true)}${trophyArt(r, true)}</svg>`);
    }
  });
  it('escalates ornamentation with rank (crown at SSS, wings at SSS+)', () => {
    expect(trophyArt('A', false)).not.toContain('stroke-linejoin="round"/><circle');
    expect(trophyArt('SSS+', false).length).toBeGreaterThan(trophyArt('E', false).length * 1.5);
    expect(trophyDefs(['SSS+'], true)).toContain('animateTransform');
    expect(trophyDefs(['SSS+'], false)).not.toContain('animateTransform');
  });
  it('reports progress toward the next rank', () => {
    const t = [10, 100, 500, 1000, 2000, 5000, 10000, 20000];
    expect(rankProgress(55, t)).toMatchObject({ level: 2, next: 100 });
    expect(rankProgress(55, t).progress).toBeCloseTo(0.5);
    expect(rankProgress(99999, t)).toEqual({ level: 9, next: null, progress: 1 });
  });
  it('sorts by rank and filters by min_rank', () => {
    const m = calculateProfileMetrics({ ...baseUser(), stars: 60000, followers: 2 } as any);
    const all = calculateTrophies(m);
    const sorted = selectTrophies(all, { hide: [], sort: 'rank', minRank: 'E' });
    expect(sorted[0].level).toBeGreaterThanOrEqual(sorted.at(-1)!.level);
    expect(selectTrophies(all, { hide: [], sort: 'default', minRank: 'S' }).every((t) => t.level >= 6)).toBe(true);
    expect(overallRank(all).level).toBeGreaterThan(0);
  });
});

function baseUser() {
  return {
    login: 'x', name: 'x', createdAt: '2020-01-01T00:00:00Z', publicRepos: 3, followers: 0, following: 0, gists: 0, stars: 0, forks: 0,
    pullRequests: 0, issues: 0, commits: 0, reviews: 0, contributions: 0, languages: [], repos: []
  };
}

describe('grade', () => {
  it('ranks stronger profiles higher', () => {
    const weak = calculateGrade(calculateProfileMetrics(baseUser() as any));
    const strong = calculateGrade(calculateProfileMetrics({ ...baseUser(), stars: 50000, followers: 90000, commits: 4000, pullRequests: 3000, issues: 900, reviews: 800 } as any));
    expect(weak.level).toBe('C');
    expect(strong.level).toBe('S');
    expect(strong.percentile).toBeLessThan(weak.percentile);
  });
});

describe('ascii engine', () => {
  const png = makeAvatarPng();
  it('decodes PNG bytes and samples a grid with transparent corners', () => {
    const img = decodeImage(png);
    expect([img.width, img.height]).toEqual([32, 32]);
    const grid = sampleGrid(img, 16, 8);
    expect(grid.lum).toHaveLength(128);
    expect(grid.lum[0]).toBe(-1); // corner is outside the disc
    expect(grid.lum[4 * 16 + 8]).toBeGreaterThan(0);
  });
  it('rejects unsupported data', () => {
    expect(() => decodeImage(new Uint8Array([1, 2, 3]))).toThrow();
  });
  it.each(CHARSETS)('renders the %s charset', (charset) => {
    const grid = sampleGrid(decodeImage(png), 20, 10);
    const rows = gridToCells(grid, { charset, text: 'HELLO', contrast: 150, invert: false, color: false });
    const text = cellsToText(rows);
    expect(text.split('\n')).toHaveLength(10);
    expect(text.trim().length).toBeGreaterThan(10);
    if (charset === 'text') expect(text.replace(/[\sHELO]/g, '')).toBe('');
    if (charset === 'binary') expect(text.replace(/[\s01]/g, '')).toBe('');
  });
  it('makes the centre denser than the transparent corner and honours invert', () => {
    const grid = sampleGrid(decodeImage(png), 20, 10);
    const rows = gridToCells(grid, { charset: 'classic', text: '', contrast: 100, invert: false, color: false });
    expect(rows[0][0].ch).toBe(' ');
    expect(rows[5][10].ch).not.toBe(' ');
  });
  it('merges neighbours into runs and skips blanks', () => {
    const runs = rowToRuns([
      { ch: 'a', level: 0, color: null }, { ch: 'b', level: 0, color: null }, { ch: ' ', level: 0, color: null },
      { ch: 'c', level: 0, color: null }
    ]);
    expect(runs.map((r) => [r.x, r.text])).toEqual([[0, 'ab'], [3, 'c']]);
  });
  it('generates a deterministic identicon', () => {
    expect(identiconGrid('octo', 20, 10)).toEqual(identiconGrid('octo', 20, 10));
    expect(identiconGrid('octo', 20, 10).lum).not.toEqual(identiconGrid('other', 20, 10).lum);
  });
});

describe('i18n and backgrounds', () => {
  it('translates with English fallback and placeholders', () => {
    expect(translator('es')('title.streak')).toBe('Racha de GitHub');
    expect(translator('zh')('misc.top', { n: 5 })).toBe('前 5%');
    expect(translator('de')('stat.repos')).toBe('Repositories');
    expect(translator('xx')('stat.stars')).toBe('Stars');
    expect(translator('en')('stat.repos.short')).toBe('Repos');
  });
  it('parses gradient backgrounds', () => {
    expect(background('135,ff0000,00f')).toEqual({ gradient: { angle: 135, stops: ['#ff0000', '#00f'] } });
    expect(background('ff0000')).toEqual({ color: '#ff0000' });
    expect(background('90,nope,alsonope')).toEqual({});
  });
});

describe('activity buckets', () => {
  const days = ['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02'].map((date, i) => ({ date, count: i + 1, level: 1 as const }));
  it('groups by month in order and by weekday', () => {
    expect(bucketize(days, 'month')).toEqual([{ label: 'Jan', value: 3 }, { label: 'Feb', value: 7 }]);
    const wd = bucketize(days, 'weekday');
    expect(wd).toHaveLength(7);
    expect(wd.reduce((a, b) => a + b.value, 0)).toBe(10);
  });
});

describe('new endpoints and cards', () => {
  it('ascii card renders animated SVG from a real decoded avatar', async () => {
    mockGitHub();
    const res = await get('/api/ascii?username=octo&charset=alnum&mode=color&anim=reveal&cols=30');
    expect(res.headers.get('x-card-error')).toBeNull();
    const svg = await res.text();
    assertWellFormedSvg(svg);
    expect(svg).toContain('@keyframes rv');
    expect(svg).toContain('fill="#');
  });
  it('ascii card supports every animation and honours animation=false', async () => {
    mockGitHub();
    for (const anim of ['scan', 'reveal', 'type', 'wave', 'flicker', 'pulse', 'none']) {
      assertWellFormedSvg(await (await get(`/api/ascii?username=octo&anim=${anim}&cols=24`)).text());
    }
    const still = await (await get('/api/ascii?username=octo&animation=false&anim=wave&cols=24')).text();
    expect(still).not.toContain('@keyframes wv');
  });
  it('ascii card returns paste-ready plain text', async () => {
    mockGitHub();
    const res = await get('/api/ascii?username=octo&format=text&cols=30&charset=binary');
    expect(res.headers.get('content-type')).toContain('text/plain');
    const text = await res.text();
    expect(text.split('\n').length).toBeGreaterThan(5);
    expect(text.replace(/[\s01]/g, '')).toBe('');
  });
  it('falls back to an identicon when the avatar cannot be fetched', async () => {
    mockGitHub({ avatarFails: true });
    const res = await get('/api/ascii?username=octo&format=text&cols=24');
    expect((await res.text()).trim().length).toBeGreaterThan(20);
  });
  it('text format is rejected for cards without one', async () => {
    mockGitHub();
    expect((await get('/api/stats?username=octo&format=text')).headers.get('x-card-error')).toBe('bad_request');
  });
  it('profile card embeds the avatar and shows a grade', async () => {
    mockGitHub();
    const svg = await (await get('/api/profile-card?username=octo&theme=dracula')).text();
    assertWellFormedSvg(svg);
    expect(svg).toContain('<image href="data:image/png;base64,');
    expect(svg).toContain('Octo Cat &lt;b&gt;');
    const json = await (await get('/api/profile?username=octo&plugins=none')).json();
    expect(json.grade.level).toBeDefined();
    // the JSON form of the card never includes the avatar bytes
    expect(JSON.stringify(await (await get('/api/profile-card?username=octo&format=json')).json())).not.toContain('base64');
  });
  it('achievements render trophy artwork by default and shields with style=badge', async () => {
    mockGitHub();
    const trophies = await (await get('/api/achievements?username=octo')).text();
    assertWellFormedSvg(trophies);
    expect(trophies).toContain('linearGradient');
    expect(trophies).toContain('Overall');
    const badges = await (await get('/api/achievements?username=octo&style=badge&progress=false')).text();
    assertWellFormedSvg(badges);
    expect(badges).not.toContain('linearGradient id="tg-');
  });
  it('badge card renders each style and rejects unknown stats', async () => {
    mockGitHub();
    for (const style of ['flat', 'pill', 'for-the-badge']) {
      const svg = await (await get(`/api/badge?username=octo&stat=stars&style=${style}`)).text();
      assertWellFormedSvg(svg);
      expect(svg.toUpperCase()).toContain('5.3K');
    }
    expect((await get('/api/badge?username=octo&stat=nope&format=json')).status).toBe(400);
  });
  it('activity card renders bars, area and line', async () => {
    mockGitHub({ calendarDays: 120 });
    for (const style of ['bar', 'area', 'line']) {
      for (const by of ['month', 'week', 'weekday']) {
        assertWellFormedSvg(await (await get(`/api/activity?username=octo&style=${style}&by=${by}`)).text());
      }
    }
  });
  it('locale translates titles; gradient backgrounds render', async () => {
    mockGitHub();
    const svg = await (await get('/api/stats?username=octo&locale=es&bg=135,0f2027,2c5364')).text();
    expect(svg).toContain('Estadísticas de GitHub');
    expect(svg).toContain('linearGradient id="bgGrad"');
    expect(svg).toContain('url(#bgGrad)');
  });
  it('serves OpenAPI generated from the registry, and rate limits without leaking tokens', async () => {
    mockGitHub();
    const spec = await (await get('/api/openapi.json')).json();
    expect(spec.openapi).toBe('3.0.3');
    expect(Object.keys(spec.paths)).toEqual(expect.arrayContaining(['/api/ascii', '/api/achievements', '/api/badge']));
    const limits = await get('/api/rate-limit');
    const body = await limits.text();
    expect(body).toContain('4321');
    expect(body).not.toContain('test-token');
  });
});

