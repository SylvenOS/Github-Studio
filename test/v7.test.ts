import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMemoryCache } from '../src/core/cache';
import { languageShares } from '../src/cards/languages';
import { resetTokenStates } from '../src/github/tokens';
import app from '../src/index';
import { shield } from '../src/svg/shield';
import { assertWellFormedSvg, mockGitHub, testEnv } from './helpers';

type Res = { json(): Promise<any> } & Response;
let env = testEnv();
const get = (path: string, e: Record<string, unknown> = env) => app.request(path, {}, e) as Promise<Res>;
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
  env = testEnv();
});

describe('profile design', () => {
  it('renders the minimal, glass and poster designs', async () => {
    mockGitHub();
    for (const design of ['minimal', 'glass', 'poster']) expect(await svgOf(`/api/design?username=octo&design=${design}&role=Dev%20%3Cb%3E`), design).toContain('Dev &lt;b&gt;');
  });
  it('window chrome, scanlines, photo and custom skills', async () => {
    mockGitHub();
    const svg = await svgOf('/api/design?username=octo&design=terminal&chrome=windows&scanlines=true&avatar=photo&skills=Go,Zig');
    expect(svg).toContain('url(#scan)');
    expect(svg).toContain('data:image/png;base64');
    expect(svg).toContain('Go, Zig');
    await svgOf('/api/design?username=octo&design=ide&chrome=linux');
    expect(await svgOf('/api/design?username=octo&design=terminal&chrome=none')).not.toContain('<circle cx="22" cy="19" r="6"');
  });
});

describe('stats card', () => {
  it('new layouts, grade styles, highlight, sort, labels and sparkline', async () => {
    mockGitHub();
    await svgOf('/api/stats?username=octo&layout=row&show_icons=true');
    for (const rank of ['letter', 'percentile', 'badge', 'stars', 'bar']) await svgOf(`/api/stats?username=octo&rank=${rank}`);
    const hl = await svgOf('/api/stats?username=octo&highlight=stars&labels=none&sort=value');
    expect(hl).toContain('accent value');
    expect(await svgOf('/api/stats?username=octo&sparkline=true')).toContain('Last 6 months');
    expect(await svgOf('/api/stats?username=octo&footer_text=hello%20there')).toContain('hello there');
    expect(await svgOf('/api/stats?username=octo&rank=badge&ring_color=ff00aa')).toContain('#ff00aa');
  });
});

describe('profile, impact, ascii, languages', () => {
  it('profile cover layout', async () => {
    mockGitHub();
    const svg = await svgOf('/api/profile-card?username=octo&layout=cover');
    expect(svg).toContain('Open to work');
    expect(svg).toContain('url(#cvg)');
  });
  it('impact lists recent merged PRs, escaped', async () => {
    mockGitHub();
    const svg = await svgOf('/api/impact?username=octo&recent=3');
    expect(svg).toContain('RECENTLY MERGED');
    expect(svg).toContain('Fix &lt;b&gt;crash&lt;/b&gt; on startup');
  });
  it('ascii has extra charsets, a custom ramp and brightness', async () => {
    mockGitHub();
    for (const charset of ['braille', 'minimal', 'dots', 'geometric', 'retro', 'math']) await svgOf(`/api/ascii?username=octo&charset=${charset}`);
    expect(await svgOf('/api/ascii?username=octo&charset=custom&text=.%3A%23&brightness=20')).toContain('<svg');
    expect((await get('/api/ascii?username=octo&brightness=999')).headers.get('x-card-error')).toBeNull(); // clamped, not an error
  });
  it('languages: other slice, minimum share, alphabetical order, no legend', async () => {
    const langs = [
      { name: 'A', color: null, size: 70, repos: 1 }, { name: 'B', color: null, size: 20, repos: 1 }, { name: 'C', color: null, size: 8, repos: 1 }, { name: 'D', color: null, size: 2, repos: 1 }
    ];
    const withOther = languageShares(langs, { count: 2, hide: [], by: 'size', other: true });
    expect(withOther.map((s) => s.name)).toEqual(['A', 'B', 'Other']);
    expect(withOther.reduce((a, s) => a + s.percent, 0)).toBeCloseTo(100, 5);
    expect(languageShares(langs, { count: 4, hide: [], by: 'size', minPercent: 5 }).map((s) => s.name)).toEqual(['A', 'B', 'C']);
    expect(languageShares(langs, { count: 4, hide: [], by: 'size', order: 'name' }).map((s) => s.name)).toEqual(['A', 'B', 'C', 'D']);
    mockGitHub();
    await svgOf('/api/languages?username=octo&legend=false');
  });
  it('language trend: absolute mode, angular stream, values and no legend', async () => {
    mockGitHub();
    await svgOf('/api/language-trend?username=octo&mode=absolute&smooth=false&height=240&legend=false');
    await svgOf('/api/language-trend?username=octo&layout=bars&values=true');
  });
  it('code volume layouts and units', async () => {
    mockGitHub();
    await svgOf('/api/code?username=octo&layout=stack');
    expect(await svgOf('/api/code?username=octo&unit=bytes&total=false')).not.toContain('estimated lines of code');
  });
});

describe('tech stack', () => {
  it('named groups, circle tiles, shadow and alignment', async () => {
    const svg = await svgOf('/api/tech?groups=Frontend:ts,react;Backend:go,postgres&shape=circle&shadow=true&align=center');
    expect(svg).toContain('FRONTEND');
    expect(svg).toContain('BACKEND');
    expect(svg).toContain('url(#tsh)');
    const j = await (await get('/api/tech?groups=A:ts;B:go&format=json')).json();
    expect(j.map((g: { title: string }) => g.title)).toEqual(['A', 'B']);
  });
});

describe('activity cards', () => {
  it('contribution graph: bars view, highlights and summary', async () => {
    mockGitHub();
    await svgOf('/api/contributions?username=octo&view=bars');
    const svg = await svgOf('/api/contributions?username=octo&highlight=both&summary=true');
    expect(svg).toContain('active days');
    expect(svg).toContain('stroke-dasharray="3 2"');
  });
  it('activity chart styles and options', async () => {
    mockGitHub();
    for (const style of ['bar', 'area', 'line', 'step', 'lollipop']) await svgOf(`/api/activity?username=octo&style=${style}&peak=true&average=true&values=true&smooth=true&height=180`);
  });
  it('work patterns: radial, no chart, values', async () => {
    mockGitHub();
    await svgOf('/api/patterns?username=octo&chart=radial&values=true');
    expect(await svgOf('/api/patterns?username=octo&chart=none')).toContain('width="300"');
  });
  it('punch card hour format and highlight; monthly goal and diff colours', async () => {
    mockGitHub({ calendarDays: 400 });
    expect(await svgOf('/api/punchcard?username=octo&hours=24h&highlight=true')).toContain('>09<');
    await svgOf('/api/punchcard?username=octo&legend=false');
    const m = await svgOf('/api/monthly?username=octo&goal=50&diff=true');
    expect(m).toContain('goal 50');
    expect(m).toMatch(/fill="#(3fb950|f85149)"/);
  });
  it('year in review: story and compact layouts, custom headline', async () => {
    mockGitHub();
    const story = await svgOf('/api/year?username=octo&layout=story&year=2025&headline=MY%20YEAR');
    expect(story).toContain('MY YEAR');
    await svgOf('/api/year?username=octo&layout=compact&columns=6&year=2025');
    expect(await svgOf('/api/year?username=octo&headline=HELLO&year=2025')).toContain('HELLO');
  });
  it('streak and achievements options', async () => {
    mockGitHub({ calendarDays: 30 });
    for (const style of ['trophy', 'badge', 'list']) await svgOf(`/api/achievements?username=octo&style=${style}&rows=2&gap=10`);
    const only = await (await get('/api/achievements?username=octo&show=stars&format=json')).json();
    expect(only.trophies.map((t: { id: string }) => t.id)).toEqual(['stars']);
  });
});

describe('banners, dividers, typing, quote', () => {
  it('banner shapes, aurora, footers and text options', async () => {
    for (const style of ['slice', 'shark', 'egg', 'cylinder', 'rect', 'soft', 'aurora']) await svgOf(`/api/banner?style=${style}&text=Hi&subtitle=There&stroke=2&color=ffee00`);
    expect(await svgOf('/api/banner?style=slice&reverse=true&fill=solid')).toContain('scale(1 -1)');
  });
  it('divider styles', async () => {
    for (const style of ['zigzag', 'pulse', 'blocks', 'diamond', 'label']) await svgOf(`/api/divider?style=${style}&text=Projects&thickness=3&animation=true`);
    expect(await svgOf('/api/divider?style=label&text=A%20%3Cb%3E')).toContain('A &lt;B&gt;');
  });
  it('typing: cursor styles, no repeat, fixed height, colour', async () => {
    for (const cs of ['bar', 'block', 'underscore']) await svgOf(`/api/typing?lines=one;two&animation=true&cursor_style=${cs}&repeat=false&height=120&vcenter=true&letter_spacing=3&color=ff00aa&align=right`);
    const once = await svgOf('/api/typing?lines=one;two&animation=true&repeat=false');
    expect(once).toContain('1 forwards');
    expect(await svgOf('/api/typing?lines=one&animation=true')).toContain('infinite');
  });
  it('quote layouts', async () => {
    for (const layout of ['code', 'big', 'note']) await svgOf(`/api/quote?layout=${layout}&index=2&size=18`);
    expect(await svgOf('/api/quote?layout=code&text=a%20%3Cb%3E&author=me')).toContain('a &lt;b&gt;');
  });
});

describe('badges, views, spotify, stars', () => {
  it('shield styles with logo and scale', () => {
    for (const style of ['flat', 'flat-square', 'plastic', 'pill', 'for-the-badge', 'social'] as const) {
      const svg = shield({ label: 'stars', value: '1.2k', style, labelColor: '#555', valueColor: '#08c', logo: { path: 'M0 0h24v24H0z', color: '#fff' }, scale: 2 });
      assertWellFormedSvg(svg);
      expect(svg).toContain('width=');
    }
    expect(shield({ label: 'a', value: 'b', style: 'flat', labelColor: '#555', valueColor: '#08c', scale: 2 })).toContain('viewBox="0 0');
  });
  it('badge and views accept the new styles', async () => {
    mockGitHub();
    for (const style of ['flat-square', 'plastic', 'social', 'for-the-badge']) {
      await svgOf(`/api/badge?username=octo&stat=stars&style=${style}&logo=github&scale=150`);
      await svgOf(`/api/views?username=octo&style=${style}&color=ff00aa`);
    }
  });
  it('spotify bar styles, backdrop and sizes', async () => {
    mockGitHub();
    for (const q of ['bar=waves', 'bar=progress&size=large&backdrop=true', 'size=small']) await svgOf(`/api/spotify?${q}`);
  });
  it('star history period and milestones', async () => {
    mockGitHub();
    await svgOf('/api/stars?repo=octo/alpha&period=1y');
    await svgOf('/api/stars?repo=octo/alpha&milestones=true');
  });
});

describe('repo compare and sponsors', () => {
  it('row selection and bars; sponsors list and stack', async () => {
    mockGitHub();
    const svg = await svgOf('/api/repo-compare?repos=vercel/next.js,remix-run/remix&rows=stars,forks&bars=true&signals=false');
    expect(svg).toContain('Stars');
    expect(svg).not.toContain('Releases');
    for (const layout of ['wall', 'list', 'stack']) await svgOf(`/api/sponsors?username=octo&layout=${layout}&cta=Become%20a%20sponsor`);
  });
  it('wakatime donut', async () => {
    mockGitHub();
    await svgOf('/api/wakatime?username=octo&layout=donut');
  });
});

describe('web app design', () => {
  it('is a three-pane workbench without emoji or gradient chrome', async () => {
    const html = await (await get('/')).text();
    for (const marker of ['class="rail only-play"', 'class="inspector"', 'id="stage-title"', 'class="brand"', 'id="username"']) expect(html, marker).toContain(marker);
    // emoji and decorative glyphs were replaced by line icons
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
    // both colour schemes are defined as tokens, with the explicit override
    expect(html).toContain('prefers-color-scheme:dark');
    expect(html).toContain(':root[data-scheme=dark]');
    expect(html).not.toContain('linear-gradient(90deg,var(--accent),var(--accent2))');
  });
  it('lists each profile design once', async () => {
    const meta = await (await get('/api/cards')).json();
    const design = meta.cards.find((c: { id: string }) => c.id === 'design');
    const names = design.variants.map((v: { label: string }) => v.label);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(9);
  });
});

describe('web app card panel', () => {
  it('serves the search box and card options container, and the script stays valid', async () => {
    const html = await (await get('/')).text();
    for (const id of ['card-search', 'card-cats', 'card-params', 'card-count']) expect(html).toContain(`id="${id}"`);
    const script = /<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? '';
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('renderCardPanel');
  });
});

describe('response diagnostics', () => {
  it('reports cache state and timing (no edge cache in tests, so a miss) on card responses', async () => {
    mockGitHub();
    const first = await get('/api/stats?username=octo');
    expect(first.headers.get('x-cache')).toBe('MISS');
    expect(first.headers.get('server-timing')).toMatch(/^total;dur=\d+/);
    assertWellFormedSvg(await first.text());
  });
});

describe('repository timeline card', () => {
  it('renders every style and metric', async () => {
    mockGitHub();
    for (const style of ['bars', 'line', 'area', 'dots', 'lollipop']) {
      expect(await svgOf(`/api/repo-timeline?username=octo&style=${style}&values=true&grid=true`), style).toContain('Repository Timeline');
    }
    await svgOf('/api/repo-timeline?username=octo&metric=stars&cumulative=true&labels=full&years=3&summary=false&axis=false');
    const json = await (await get('/api/repo-timeline?username=octo&format=json')).json();
    expect(json.years.length).toBeGreaterThan(0);
  });
});

describe('card-wide style options', () => {
  it('applies weight, spacing, border, shadow, tone and opacity safely', async () => {
    mockGitHub();
    const svg = await svgOf('/api/stats?username=octo&title_weight=black&value_weight=medium&letter_spacing=1.5&border_style=dashed&shadow=strong&margin=10&tone=sepia&card_opacity=80&hide_icons=true&subtitle_color=ff0066&title_font=Georgia,serif');
    expect(svg).toContain('font-weight:900');
    expect(svg).toContain('letter-spacing:1.5px');
    expect(svg).toContain('stroke-dasharray="7 5"');
    expect(svg).toContain('drop-shadow');
    expect(svg).toContain('sepia(');
    expect(svg).toContain('opacity:0.8');
    expect(svg).toContain('.sub{fill:#ff0066}');
    expect(svg).toContain('Georgia');
    // user text can't break out of the CSS
    const bad = await svgOf('/api/stats?username=octo&title_font=a%7D%3Cscript%3E&tone=evil&shadow=%22');
    expect(bad).not.toContain('<script');
    expect(bad).not.toContain('evil');
  });
});

describe('icons', () => {
  it('serves the favicon and the touch icon and links them from the app', async () => {
    const svg = await get('/favicon.svg');
    expect(svg.headers.get('content-type')).toContain('image/svg+xml');
    assertWellFormedSvg(await svg.text());
    const png = new Uint8Array(await (await get('/apple-touch-icon.png')).arrayBuffer());
    expect(Array.from(png.slice(1, 4))).toEqual([80, 78, 71]); // "PNG"
    expect((await get('/favicon.ico')).status).toBe(301);
    expect(await (await get('/')).text()).toContain('rel="icon"');
  });
});
