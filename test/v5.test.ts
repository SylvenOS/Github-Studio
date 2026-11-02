import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bucket } from '../src/cards/punchcard';
import { clearMemoryCache } from '../src/core/cache';
import { applyCompat } from '../src/core/compat';
import { resetTokenStates } from '../src/github/tokens';
import app from '../src/index';
import { DEFINITIONS } from '../src/metrics/definitions';
import { cards } from '../src/cards';
import { assertWellFormedSvg, mockGitHub, testEnv } from './helpers';

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

beforeEach(() => {
  clearMemoryCache();
  resetTokenStates();
  vi.unstubAllGlobals();
  env = testEnv();
});

describe('profile designs', () => {
  it('renders all six design systems from the same data, escaped', async () => {
    mockGitHub();
    for (const design of ['terminal', 'ide', 'editorial', 'dashboard', 'blueprint', 'retro']) {
      const svg = await svgOf(`/api/design?username=octo&design=${design}&role=Dev%20%3Cb%3E&now=Building%20%26%20shipping`);
      expect(svg, design).toContain('Dev &lt;b&gt;');
      expect(svg, design).not.toContain('<b>');
    }
  });
  it('uses the design’s signature palette unless a theme is given', async () => {
    mockGitHub();
    expect(await svgOf('/api/design?username=octo&design=terminal')).toContain('--bg:#0b0f14');
    expect(await svgOf('/api/design?username=octo&design=blueprint')).toContain('--bg:#0d3b8c');
    const themed = await svgOf('/api/design?username=octo&design=terminal&theme=dracula');
    expect(themed).toContain('--bg:#282a36');
  });
  it('hides sections and validates text inputs', async () => {
    mockGitHub();
    const svg = await svgOf('/api/design?username=octo&design=terminal&hide=projects,languages');
    expect(svg).not.toContain('ls -l ~/projects');
    expect(svg).not.toContain('langs --top');
    expect((await get('/api/design?username=octo&role=' + 'x'.repeat(41))).headers.get('x-card-error')).toBe('bad_request');
    expect((await get('/api/design?username=octo&prompt=a%20b')).headers.get('x-card-error')).toBe('bad_request');
  });
  it('ships README presets for every design system', async () => {
    const j = await (await get('/api/presets?username=octo')).json();
    const ids = j.presets.map((p: { id: string }) => p.id);
    for (const id of ['terminal-os', 'code-studio', 'editorial', 'dev-dashboard', 'blueprint', 'retro', 'analyst']) expect(ids).toContain(id);
    mockGitHub();
    const md = await (await get('/api/readme?username=octo&preset=terminal-os')).text();
    expect(md).toContain('/api/design?');
    expect(md).toContain('theme=terminal');
  });
});

describe('analytics cards', () => {
  it('year in review: totals, months, top repos; token-only numbers show "-" without a token', async () => {
    mockGitHub();
    const j = await (await get(`/api/year?username=octo&year=${new Date().getUTCFullYear()}&format=json`)).json();
    expect(j.months).toHaveLength(12);
    expect(j.repos.map((r: { nameWithOwner: string }) => r.nameWithOwner)).toContain('octo/alpha'); // own repos count too
    expect(await svgOf(`/api/year?username=octo&year=${new Date().getUTCFullYear() - 1}`)).toContain('YEAR IN REVIEW');
    expect(await svgOf(`/api/year?username=octo&year=${new Date().getUTCFullYear()}`)).toContain('SO FAR');
    const tokenless = await svgOf('/api/year?username=octo', {});
    // without a token the counts come from the search API instead of showing dashes
    expect(tokenless).toMatch(/>\d+<\/text><text[^>]*>Commits/);
  });
  it('monthly trend compares against last year', async () => {
    mockGitHub({ calendarDays: 400 });
    const svg = await svgOf('/api/monthly?username=octo');
    expect(svg).toMatch(/vs (same period )?\d{4}/);
    expect(await svgOf('/api/monthly?username=octo&layout=line&compare=false')).not.toMatch(/vs (same period )?\d{4}/);
  });
  it('punch card buckets by the author’s own clock, or a fixed offset', async () => {
    expect(bucket('2026-03-03T23:15:00+05:30', null)).toEqual([2, 23]); // Tuesday 23:xx local
    expect(bucket('2026-03-03T23:15:00+05:30', 0)).toEqual([2, 17]);
    expect(bucket('2026-03-03T23:15:00+05:30', 2)).toEqual([2, 19]);
    expect(bucket('garbage', null)).toBeNull();
    mockGitHub();
    const svg = await svgOf('/api/punchcard?username=octo');
    expect(svg).toContain('4 commits'); // the private repo is skipped
    expect(svg).toContain('busiest Tue around 23:00');
    expect((await get('/api/punchcard?username=octo&tz=99')).headers.get('x-card-error')).toBe('bad_request');
    // without a token the commit search API is used (author-local timestamps too)
    const tokenless = await svgOf('/api/punchcard?username=octo', {});
    expect(tokenless).toContain('2 commits');
  });
  it('language trend groups commits by repo language per year and skips private repos', async () => {
    mockGitHub();
    const { basis, years: j } = await (await get('/api/language-trend?username=octo&years=3&format=json')).json();
    expect(basis).toBe('commits');
    expect(j).toHaveLength(3);
    expect(j[0].year).toBeLessThan(j[2].year);
    expect(JSON.stringify(j)).not.toContain('Secret');
    for (const layout of ['stream', 'bars', 'lines']) await svgOf(`/api/language-trend?username=octo&layout=${layout}`);
  });
  it('code volume labels lines as an estimate and needs a token', async () => {
    mockGitHub();
    const svg = await svgOf('/api/code?username=octo');
    expect(svg).toContain('estimated lines of code');
    expect(svg).toContain('not counted');
    expect((await get('/api/code?username=octo', {})).headers.get('x-card-error')).not.toBeNull(); // no token: REST data has no byte counts
  });
});

describe('repository cards', () => {
  it('star history samples stargazer pages into a rising curve', async () => {
    mockGitHub();
    const j = await (await get('/api/stars?username=octo&repo=alpha&format=json')).json();
    const pts = j[0].points;
    expect(j[0].repo).toBe('octo/alpha');
    expect(pts[0].count).toBe(0);
    expect(pts[pts.length - 1].count).toBe(5000);
    for (let i = 1; i < pts.length; i++) expect(pts[i].count).toBeGreaterThanOrEqual(pts[i - 1].count);
    await svgOf('/api/stars?repo=octo/alpha&scale=log&points=true');
    expect((await get('/api/stars?repo=nonsense')).headers.get('x-card-error')).toBe('bad_request');
  });
  it('repo compare shows facts, leaders and threshold-based health signals', async () => {
    mockGitHub();
    const svg = await svgOf('/api/repo-compare?repos=vercel/next.js,remix-run/remix');
    expect(svg).toContain('HEALTH SIGNALS');
    expect(svg).toContain('#3fb950'); // pushed 3 days ago = good
    expect(svg).toContain('A &lt;great&gt; repo'.slice(0, 0)); // descriptions only in the single-repo view
    const single = await svgOf('/api/repo-health?repos=vercel/next.js');
    expect(single).toContain('Repository Health');
    expect(single).toContain('A &lt;great&gt; repo');
    expect((await get('/api/repo-compare?repos=a')).headers.get('x-card-error')).toBe('bad_request');
  });
});

describe('integrations and community', () => {
  it('wakatime: breakdowns, layouts and a clear message for private profiles', async () => {
    mockGitHub();
    const svg = await svgOf('/api/wakatime?username=octo');
    expect(svg).toContain('21 hrs 5 mins');
    expect(svg).toContain('Markdown &lt;md&gt;');
    await svgOf('/api/wakatime?username=octo&section=editors&layout=compact&percent=true');
    const priv = await get('/api/wakatime?username=private');
    expect(priv.headers.get('x-card-error')).toBe('bad_request');
    expect(await priv.text()).toContain('private');
  });
  it('spotify: now playing with embedded cover; explains when not configured', async () => {
    const fetchMock = mockGitHub();
    const svg = await svgOf('/api/spotify');
    expect(svg).toContain('NOW PLAYING');
    expect(svg).toContain('Song &amp; &lt;Dance&gt;');
    expect(svg).toContain('href="data:image/png;base64,');
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith('https://i.scdn.co/'))).toBe(true);
    const res = await get('/api/spotify', { GITHUB_TOKEN: 't' });
    expect(res.headers.get('x-card-error')).toBe('upstream');
    expect(await res.text()).toContain('not configured');
  });
  it('sponsors wall embeds avatars and escapes names', async () => {
    mockGitHub();
    const svg = await svgOf('/api/sponsors?username=octo&names=true');
    expect(svg).toContain('data:image/png;base64,');
    expect(svg).toContain('Acme &lt;Inc&gt;');
    expect(svg).toContain('+27 more');
  });
  it('views counter counts every load, is never cached and supports separate keys', async () => {
    const a = await (await get('/api/views?username=octo&format=json')).json();
    const res = await get('/api/views?username=octo&format=json');
    expect((await res.json()).views).toBe(a.views + 1);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect((await (await get('/api/views?username=octo&count=false&format=json')).json()).views).toBe(a.views + 1);
    expect((await (await get('/api/views?username=octo&key=repo-x&format=json')).json()).views).toBe(1);
    expect((await (await get('/api/views?username=octo&base=1000&count=false&format=json')).json()).views).toBe(1000 + a.views + 1);
    for (const style of ['badge', 'flat', 'pill', 'digits', 'card']) await svgOf(`/api/views?username=octo&style=${style}`);
    expect((await get('/api/views?username=octo', { GITHUB_TOKEN: 't' })).headers.get('x-card-error')).toBe('upstream');
    expect((await get('/api/views?username=octo&key=a/b')).headers.get('x-card-error')).toBe('bad_request');
    expect((await get('/api/composite?username=octo&cards=stats,views')).headers.get('x-card-error')).toBe('bad_request');
  });
  it('quote: daily or custom text, four layouts, length-limited', async () => {
    for (const layout of ['card', 'minimal', 'terminal', 'bubble']) await svgOf(`/api/quote?layout=${layout}`);
    expect(await svgOf('/api/quote?text=Ship%20%3Cit%3E&author=Me')).toContain('Ship &lt;it&gt;');
    expect((await get('/api/quote?text=' + 'x'.repeat(221))).headers.get('x-card-error')).toBe('bad_request');
  });
});

describe('grades, motion and transparency', () => {
  it('stats card can show a letter grade or percentile ring; readme-stats hide_rank=false maps to it', async () => {
    mockGitHub();
    const svg = await svgOf('/api/stats?username=octo&rank=letter');
    expect(svg).toMatch(/>(S|A\+|A|A-|B\+|B|B-|C\+|C)<\/text>/);
    expect(svg).toContain('width="600"');
    expect(await svgOf('/api/stats?username=octo&rank=percentile&layout=compact')).toMatch(/>\d+%<\/text>|>&lt;1%<\/text>/);
    expect((await (await get('/api/stats?username=octo&rank=letter&format=json')).json()).grade.level).toBeTruthy();
    expect(applyCompat('stats', { hide_rank: 'false' }).rank).toBe('letter');
    expect(applyCompat('stats', { hide_rank: 'false', rank_icon: 'percentile' }).rank).toBe('percentile');
    expect(applyCompat('stats', { hide_rank: 'true' }).rank).toBeUndefined();
  });
  it('typing and snake animations use CSS that honours prefers-reduced-motion (no SMIL)', async () => {
    const typing = await svgOf('/api/typing?lines=one;two&animation=true');
    expect(typing).not.toContain('<animate');
    expect(typing).toContain('prefers-reduced-motion');
    expect(typing).toContain('tx-rest'); // cycle mode shows only the first line when motion is reduced
    mockGitHub();
    const snake = await svgOf('/api/contributions?username=octo&effect=snake&animation=true');
    expect(snake).not.toContain('animateMotion');
    expect(snake).toMatch(/prefers-reduced-motion:reduce\)\{[^}]*\}\.snk\{display:none\}/);
  });
  it('documents every metric with a source and calculation', async () => {
    const j = await (await get('/api/definitions')).json();
    expect(j.metrics.length).toBe(DEFINITIONS.length);
    const ids = new Set(cards.map((c) => c.id));
    for (const d of DEFINITIONS) {
      expect(d.source && d.calculation, d.id).toBeTruthy();
      for (const c of d.cards) expect(ids.has(c), `${d.id} -> ${c}`).toBe(true);
    }
  });
  it('the web app offers the studio tools', async () => {
    const html = await (await get('/')).text();
    for (const id of ['designs', 'b-zip', 'b-config', 'b-import', 'config-file', 'build-check', 'defs']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('README Studio');
  });
});
