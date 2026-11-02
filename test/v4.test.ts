import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveIcon } from '../src/cards/tech';
import { clearMemoryCache } from '../src/core/cache';
import { applyCompat } from '../src/core/compat';
import { parseStyle } from '../src/core/params';
import { compact, fmt, withNumberFormat } from '../src/core/text';
import { resetTokenStates } from '../src/github/tokens';
import app from '../src/index';
import { analyzePatterns } from '../src/metrics/patterns';
import { assertWellFormedSvg, mockGitHub } from './helpers';

type Res = { json(): Promise<any> } & Response;
const env = { GITHUB_TOKEN: 'test-token' };
const get = (path: string) => app.request(path, {}, env) as Promise<Res>;
const svgOf = async (path: string) => {
  const res = await get(path);
  expect(res.headers.get('x-card-error'), path).toBeNull();
  const svg = await res.text();
  assertWellFormedSvg(svg);
  return svg;
};

beforeEach(() => {
  clearMemoryCache();
  resetTokenStates();
  vi.unstubAllGlobals();
});

describe('github-readme-stats compatibility', () => {
  it('maps their parameter names onto ours', () => {
    expect(applyCompat('stats', { bg_color: '000', text_color: 'fff', border_radius: '8', custom_title: 'Hi', card_width: '500', disable_animations: 'true', hide: 'contribs,stars', hide_rank: 'true' })).toEqual({
      bg: '000', fg: 'fff', radius: '8', title: 'Hi', width: '500', animation: 'false', hide: 'contributions,stars'
    });
    expect(applyCompat('languages', { layout: 'compact', exclude_repo: 'a,b' })).toEqual({ layout: 'bar', exclude: 'a,b' });
    expect(applyCompat('languages', { layout: 'donut-vertical' }).layout).toBe('donut');
    expect(applyCompat('languages', { layout: 'pie' }).layout).toBe('pie'); // native layouts are left alone
    expect(applyCompat('stats', { bg: '111', bg_color: '222' }).bg).toBe('111'); // native name wins
  });
  it('serves their URLs: /api?username= and /api/top-langs', async () => {
    mockGitHub();
    const stats = await svgOf('/api?username=octo&theme=onedark&bg_color=282c34&hide_rank=true');
    expect(stats).toContain('--bg:#282c34');
    expect(await svgOf('/api/top-langs?username=octo&layout=compact')).toContain('Top Languages');
  });
});

describe('unified style options', () => {
  it('validates everything to numbers, enums and hex colours', () => {
    expect(parseStyle({ width: '99999', padding: '2', text_scale: '500', title_color: 'red;}', heat_colors: '000,111,222,333', chart_colors: 'f00,0f0', border_width: '2.3', glow: 'true' })).toEqual({
      width: 1600, padding: 8, textScale: 150, chartColors: ['#f00', '#0f0'], borderWidth: 2.5, glow: true
    });
  });
  it('width scales the card, padding grows the canvas, title can be centred', async () => {
    mockGitHub();
    const svg = await svgOf('/api/stats?username=octo&width=960&padding=45&title_align=center');
    expect(svg).toMatch(/^<svg width="960" height="\d+" viewBox="0 0 520 /);
    expect(svg).toContain('<g transform="translate(20 20)">');
    expect(svg).toMatch(/class="header accent" text-anchor="middle"/);
    expect(svg).not.toContain('@octo</text>'); // subtitle hidden when centred
  });
  it('colours, opacity, border, text scale and glow reach the CSS', async () => {
    mockGitHub();
    const svg = await svgOf('/api/stats?username=octo&title_color=ff0000&value_color=00ff00&icon_color=0000ff&bg_opacity=40&border_width=4&text_scale=120&glow=true&show_icons=true');
    for (const s of ['.header{fill:#ff0000}', '.value{fill:#00ff00}', '.ic{fill:#0000ff}', '.bgr{fill-opacity:0.4}', 'stroke-width="4"', 'drop-shadow']) expect(svg).toContain(s);
    expect(svg).toContain('.value{font-size:19.2px}');
  });
  it('heat and chart colours apply to heatmaps and charts', async () => {
    mockGitHub();
    const heat = await svgOf('/api/contributions?username=octo&heat_colors=111111,222222,333333,444444,555555');
    expect(heat).toContain('.l4{fill:#555555;fill-opacity:1}');
    const langs = await svgOf('/api/languages?username=octo&chart_colors=abcdef,123456');
    expect(langs).toContain('fill="#abcdef"');
    expect(await svgOf('/api/activity?username=octo&chart_colors=abcdef')).toContain('--s0:#abcdef');
  });
  it('number_format and locale change how numbers are written', () => {
    expect(withNumberFormat('auto', 'de', () => fmt(1234567))).toBe('1.234.567');
    expect(withNumberFormat('compact', 'en', () => fmt(15400))).toBe('15.4k');
    expect(withNumberFormat('full', 'en', () => compact(15400))).toBe('15,400');
    expect(fmt(1234)).toBe('1,234'); // state never leaks out of a render
  });
});

describe('card options', () => {
  it('heatmap: shapes, sizes, Monday weeks and hidden labels', async () => {
    mockGitHub();
    expect(await svgOf('/api/contributions?username=octo&shape=circle')).toContain('<circle cx=');
    const big = await svgOf('/api/contributions?username=octo&cell=16&gap=5&week_start=mon&weekdays=false&legend=false&months=false');
    expect(big).toContain('width="16"');
    expect(big).not.toContain('>Mon<');
    expect(big).not.toContain('contributions in the last year');
  });
  it('languages: pie, progress bars and chips; decimals', async () => {
    mockGitHub();
    for (const layout of ['pie', 'bars', 'chips']) await svgOf(`/api/languages?username=octo&layout=${layout}`);
    expect(await svgOf('/api/languages?username=octo&layout=bars&decimals=0')).toMatch(/>\d+%</);
  });
  it('activity: bar radius, line width, no grid', async () => {
    mockGitHub();
    const svg = await svgOf('/api/activity?username=octo&bar_radius=10&grid=false');
    expect(svg).toContain('rx="10"');
    expect(svg).not.toContain('stroke-dasharray="3 4"');
  });
});

describe('realistic stats', () => {
  it('work patterns from a calendar', () => {
    const days = Array.from({ length: 14 }, (_, i) => ({ date: `2024-01-${String(i + 7).padStart(2, '0')}`, count: i % 7 === 3 ? 10 : i % 7 === 0 ? 0 : 1, level: 1 as const }));
    const w = analyzePatterns(days);
    expect(w.busiestWeekday).toBe(3); // Wednesdays
    expect(w.consistencyPct).toBe(100);
    expect(w.activeDays).toBe(12);
    expect(w.bestDay?.count).toBe(10);
    expect(w.weekendPct).toBeLessThan(10);
  });
  it('impact card shows external merged PRs, merge rate and external projects', async () => {
    mockGitHub();
    const svg = await svgOf('/api/impact?username=octo');
    expect(svg).toContain('>42<'); // external merged PRs (search)
    expect(svg).toContain('83%'); // 250 / (250 + 50)
    expect(svg).toContain('vercel/next.js');
    expect(svg).not.toContain('octo/alpha'); // own repos are not "external"
    const json = await (await get('/api/impact?username=octo&format=json')).json();
    expect(json.externalRepos[0].nameWithOwner).toBe('vercel/next.js');
  });
  it('pinned card lists real pins, prefixing repos owned by others', async () => {
    mockGitHub();
    const svg = await svgOf('/api/pinned?username=octo&layout=list');
    expect(svg).toContain('acme/cool-lib');
    expect(svg).toContain('&lt;b&gt;'); // descriptions are escaped
  });
  it('profile card shows company/location/pronouns/status details', async () => {
    mockGitHub();
    expect(await svgOf('/api/profile-card?username=octo')).toContain('they/them');
  });
  it('activity radar splits commits, PRs, reviews and issues', async () => {
    mockGitHub();
    const json = await (await get('/api/radar?username=octo&data=activity&format=json')).json();
    expect(json.axes.map((a: { name: string }) => a.name)).toEqual(['Commits', 'Pull requests', 'Code review', 'Issues']);
    expect(json.axes.reduce((a: number, b: { percent: number }) => a + b.percent, 0)).toBeCloseTo(100);
  });
});

describe('visual formats', () => {
  it('tech stack: aliases resolve, unknown names are skipped, styles render', async () => {
    expect(resolveIcon('TS')).toBe('typescript');
    expect(resolveIcon('C++')).toBe('cplusplus');
    expect(resolveIcon('Jupyter Notebook')).toBe('jupyter');
    expect(resolveIcon('not-a-tech')).toBeUndefined();
    for (const style of ['tile', 'plain', 'mono', 'outline']) {
      const svg = await svgOf(`/api/tech?icons=ts,react,nope,docker&style=${style}&labels=true`);
      expect(svg.match(/<title>/g)).toHaveLength(3);
    }
    mockGitHub();
    expect(await svgOf('/api/tech?username=octo')).toContain('<title>TypeScript</title>'); // auto from languages
  });
  it('3D skyline renders towers and grows when animated', async () => {
    mockGitHub();
    const svg = await svgOf('/api/skyline?username=octo');
    expect((svg.match(/<polygon/g) ?? []).length).toBeGreaterThan(100);
    expect(await svgOf('/api/skyline?username=octo&animation=true')).toContain('@keyframes grow');
  });
  it('typing: still by default, typed and erased with animation, text escaped', async () => {
    const still = await svgOf('/api/typing?lines=Hello%20%3Cb%3E;Second');
    expect(still).toContain('Hello &lt;b&gt;');
    expect(still).not.toContain('<animate');
    const moving = await svgOf('/api/typing?lines=One;Two;Three&animation=true');
    expect(moving.match(/<clipPath id="tc\d"/g)).toHaveLength(3);
    expect(await svgOf('/api/typing?lines=a;b&mode=stack&animation=true')).toContain('@keyframes tw0');
  });
  it('snake and wave effects animate the heatmap only with animation=true', async () => {
    mockGitHub();
    expect(await svgOf('/api/contributions?username=octo&effect=snake')).not.toContain('offset-path');
    expect(await svgOf('/api/contributions?username=octo&effect=snake&animation=true')).toContain('offset-path');
    expect(await svgOf('/api/contributions?username=octo&effect=wave&animation=true')).toContain('@keyframes wv');
  });
  it('footer and header waves', async () => {
    expect(await svgOf('/api/divider?style=footer')).toMatch(/height="120"/);
    expect(await svgOf('/api/divider?style=header&animation=true')).toContain('@keyframes fw');
  });
});

describe('composite card', () => {
  it('combines cards, applies prefixed params to one card, scopes ids and theme variables', async () => {
    mockGitHub();
    const svg = await svgOf('/api/composite?username=octo&cards=stats,languages,profile-card&stats.layout=compact&languages.theme=dracula&columns=2');
    expect(svg.match(/<svg /g)?.length).toBe(4);
    expect(svg).toContain('id="c0"');
    expect(svg).toContain('#c1{--bg:#282a36'); // dracula only for the languages card
    expect(svg).not.toContain(':root{');
    expect(svg).toContain('url(#c2-av)'); // profile avatar clip scoped
    expect(svg).toContain('>Repos<'); // compact stats labels
  });
  it('rejects unknown cards and self-nesting; one failing card shows an error tile', async () => {
    mockGitHub();
    expect((await get('/api/composite?username=octo&cards=stats,nope&format=json')).status).toBe(400);
    expect((await get('/api/composite?username=octo&cards=composite&format=json')).status).toBe(400);
    const svg = await svgOf('/api/composite?username=octo&cards=stats,compare');
    expect(svg).toContain('vs'); // compare without vs -> error tile, rest renders
  });
  it('prefixed params are part of the cache key; unknown params are not', async () => {
    const { canonicalKey } = await import('../src/core/cache');
    const allowed = new Map([['username', {}], ['cards', {}]]);
    const extra = (n: string) => /^[a-z-]{2,20}\.[a-z_]{1,30}$/.test(n);
    const a = canonicalKey('https://x', '/api/composite', { username: 'o', cards: 'stats', 'stats.layout': 'compact', junk: '1' }, allowed, extra);
    expect(a).toContain('stats.layout=compact');
    expect(a).not.toContain('junk');
  });
});
