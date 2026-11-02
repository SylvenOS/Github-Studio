import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cards } from '../src/cards';
import { clearMemoryCache } from '../src/core/cache';
import app from '../src/index';
import { resolveBadge, shieldUrl } from '../src/readme/badges';
import { PRESETS } from '../src/readme/presets';
import { markdownToHtml, renderReadme, stripActive } from '../src/readme/render';
import { encodeSpecParam, normalizeSpec } from '../src/readme/spec';
import { assertWellFormedSvg, mockGitHub, testEnv } from './helpers';

type Res = { json(): Promise<any> } & Response;
const env = testEnv();
const get = (path: string, e: Record<string, unknown> = env) => app.request(path, {}, e) as Promise<Res>;
const post = (path: string, body: unknown) =>
  app.request(path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }, env) as Promise<Res>;

beforeEach(() => {
  clearMemoryCache();
  vi.unstubAllGlobals();
});

describe('spec validation', () => {
  const base = { username: 'octo', blocks: [] as unknown[] };

  it('accepts a good spec and fills defaults', () => {
    const s = normalizeSpec({ ...base, blocks: [{ type: 'card', card: 'stats', params: { layout: 'compact' } }] });
    expect(s).toMatchObject({ username: 'octo', theme: 'default', align: 'center', footer: false });
    expect(s.blocks[0]).toMatchObject({ type: 'card', card: 'stats', params: { layout: 'compact' } });
  });
  it('resolves card aliases to their canonical id', () => {
    expect(normalizeSpec({ ...base, blocks: [{ type: 'card', card: 'trophies' }] }).blocks[0]).toMatchObject({ card: 'achievements' });
  });
  it('rejects bad input with helpful errors', () => {
    expect(() => normalizeSpec('nope')).toThrow(/JSON object/);
    expect(() => normalizeSpec({ username: 'octo' })).toThrow(/blocks/);
    expect(() => normalizeSpec({ ...base, username: '<x>' })).toThrow(/username/);
    expect(() => normalizeSpec({ ...base, blocks: [{ type: 'card', card: 'nope' }] })).toThrow(/Unknown card/);
    expect(() => normalizeSpec({ ...base, blocks: [{ type: 'evil' }] })).toThrow(/Unknown block type/);
    expect(() => normalizeSpec({ ...base, blocks: Array.from({ length: 61 }, () => ({ type: 'divider' })) })).toThrow(/Too many/);
    expect(() => normalizeSpec({ ...base, blocks: [{ type: 'details', blocks: [{ type: 'details', blocks: [] }] }] })).toThrow(/nested/);
  });
  it('drops unsafe params, URLs and colours', () => {
    const s = normalizeSpec({
      ...base,
      blocks: [{ type: 'card', card: 'stats', params: { 'bad key': 'x', username: 'hijack', format: 'json', ok_key: 'v' }, link: 'javascript:alert(1)', width: 99999 }]
    });
    const b = s.blocks[0] as any;
    expect(b.params).toEqual({ ok_key: 'v' });
    expect(b.link).toBeUndefined();
    expect(b.width).toBeUndefined();
    const badges = normalizeSpec({ ...base, blocks: [{ type: 'badges', items: [{ kind: 'custom', label: 'x', color: 'red;}', url: 'ftp://x' }, { kind: 'bogus' }] }] }).blocks[0] as any;
    expect(badges.items).toHaveLength(1);
    expect(badges.items[0].color).toBeUndefined();
    expect(badges.items[0].url).toBeUndefined();
  });
  it('validates theme names and only keeps a distinct dark theme', () => {
    expect(normalizeSpec({ ...base, theme: 'nope' }).theme).toBe('default');
    expect(normalizeSpec({ ...base, theme: 'dracula', dark: 'dracula' }).dark).toBeUndefined();
    expect(normalizeSpec({ ...base, theme: 'default', dark: 'dracula' }).dark).toBe('dracula');
  });
});

describe('badges', () => {
  const ctx = { origin: 'https://x.dev', username: 'octo', theme: 'default' };
  it('encodes shield text safely (dashes, underscores, spaces)', () => {
    expect(shieldUrl('a-b_c d', 'e-f', '123456', 'flat')).toContain('a--b__c_d-e--f-123456');
  });
  it('builds social, tech, stat and custom badges', () => {
    expect(resolveBadge({ kind: 'social', name: 'twitter', handle: 'jack' }, 'flat', ctx)).toMatchObject({ href: 'https://twitter.com/jack' });
    expect(resolveBadge({ kind: 'social', name: 'website', handle: 'https://example.com' }, 'flat', ctx)?.href).toBe('https://example.com');
    expect(resolveBadge({ kind: 'social', name: 'twitter', handle: 'bad handle<' }, 'flat', ctx)?.href).toBeUndefined();
    expect(resolveBadge({ kind: 'social', name: 'unknown-net' }, 'flat', ctx)).toBeNull();
    const ts = resolveBadge({ kind: 'tech', name: 'TypeScript' }, 'for-the-badge', ctx)!;
    expect(ts.src).toContain('TypeScript-3178C6');
    expect(ts.src).toContain('logo=typescript');
    expect(resolveBadge({ kind: 'tech', name: 'C++' }, 'flat', ctx)!.src).toContain('logo=cplusplus');
    expect(resolveBadge({ kind: 'stat', name: 'stars' }, 'flat', ctx)!.src).toBe('https://x.dev/api/badge?username=octo&stat=stars&style=flat');
    expect(resolveBadge({ kind: 'custom', label: 'Hi', message: 'there', color: 'ff0000' }, 'flat', ctx)!.src).toContain('Hi-there-ff0000');
    expect(resolveBadge({ kind: 'custom' }, 'flat', ctx)).toBeNull();
  });
});

describe('rendering', () => {
  const spec = (blocks: unknown[], extra: object = {}) => normalizeSpec({ username: 'octo', blocks, ...extra });

  it('lays cards out side by side and aligns them', () => {
    const md = renderReadme(spec([{ type: 'row', align: 'left', items: [{ type: 'card', card: 'stats' }, { type: 'card', card: 'languages', params: { layout: 'donut' } }] }]), 'https://x.dev').markdown;
    expect(md).toContain('<p align="left">');
    expect(md).toContain('https://x.dev/api/stats?username=octo');
    expect(md).toContain('/api/languages?username=octo&layout=donut');
    expect(md.match(/<img /g)).toHaveLength(2);
    // cards in a row shrink to share the line instead of wrapping
    expect(md.match(/width="48%"/g)).toHaveLength(2);
  });
  it('keeps an explicit width and leaves single cards at natural size', () => {
    const md = renderReadme(spec([{ type: 'row', items: [{ type: 'card', card: 'stats', width: 300 }, { type: 'card', card: 'streak' }, { type: 'card', card: 'radar' }] }, { type: 'card', card: 'stats' }]), 'https://x.dev').markdown;
    expect(md).toContain('width="300"');
    expect(md.match(/width="32%"/g)).toHaveLength(2);
    expect(md.split('<p align')[2]).not.toContain('width=');
  });
  it('threads the global theme and params through, and lets a card override the theme', () => {
    const md = renderReadme(spec([{ type: 'card', card: 'stats' }, { type: 'card', card: 'streak', params: { theme: 'nord' } }], { theme: 'dracula', params: { locale: 'es', radius: '12' } }), 'https://x.dev').markdown;
    expect(md).toContain('/api/stats?username=octo&theme=dracula&locale=es&radius=12');
    expect(md).toContain('/api/streak?username=octo&theme=nord&locale=es');
  });
  it('emits <picture> sources for GitHub dark mode', () => {
    const md = renderReadme(spec([{ type: 'card', card: 'stats' }], { theme: 'default', dark: 'github_dark' }), 'https://x.dev').markdown;
    expect(md).toContain('<picture>');
    expect(md).toContain('prefers-color-scheme: dark');
    expect(md).toContain('theme=github_dark');
  });
  it('renders headings, text, links, widths, dividers, details and footer', () => {
    const out = renderReadme(
      spec(
        [
          { type: 'heading', text: 'Hello', level: 1 },
          { type: 'heading', text: 'Centered', level: 3, align: 'center' },
          { type: 'text', markdown: 'Some **bold** words.', align: 'center' },
          { type: 'card', card: 'stats', width: 400, link: 'https://github.com/octo' },
          { type: 'divider', style: 'dots' },
          { type: 'details', summary: 'More', blocks: [{ type: 'card', card: 'streak' }] }
        ],
        { footer: true }
      ),
      'https://x.dev'
    );
    expect(out.markdown).toContain('# Hello');
    expect(out.markdown).toContain('<h3 align="center">Centered</h3>');
    expect(out.markdown).toContain('<div align="center">\n\nSome **bold** words.\n\n</div>');
    expect(out.markdown).toMatch(/<a href="https:\/\/github\.com\/octo"><img src="https:\/\/x\.dev\/api\/stats\?username=octo&v=\w+" alt="GitHub Stats for @octo" width="400" \/><\/a>/);
    expect(out.markdown).toContain('/api/divider?style=dots');
    expect(out.markdown).toContain('<details>\n<summary>More</summary>');
    expect(out.markdown).toContain('Generated with');
    expect(out.html).toContain('<strong>bold</strong>');
    expect(out.html.startsWith('<div class="markdown-body">')).toBe(true);
  });
  it('escapes attribute values so alt text cannot break out', () => {
    const md = renderReadme(spec([{ type: 'card', card: 'stats', alt: 'x" onerror="alert(1)' }]), 'https://x.dev').markdown;
    expect(md).not.toContain('onerror="alert');
    expect(md).toContain('&quot;');
  });
  it('strips active content from raw HTML in the preview only', () => {
    const out = renderReadme(spec([{ type: 'html', html: '<b onclick="x()">hi</b><script>alert(1)</script><a href="javascript:x">l</a>' }]), 'https://x.dev');
    expect(out.markdown).toContain('<script>'); // the user's own README content is left alone
    expect(out.html).not.toMatch(/<script|onclick|javascript:/i);
    expect(stripActive('<iframe src=x>')).toBe('');
    expect(markdownToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
  });
  it('every preset validates and renders', () => {
    for (const p of PRESETS) {
      const s = normalizeSpec({ username: 'octo', theme: p.theme, blocks: p.build('octo') });
      const md = renderReadme(s, 'https://x.dev').markdown;
      expect(md.length, p.id).toBeGreaterThan(100);
      expect(md, p.id).not.toContain('undefined');
    }
  });
});

describe('generator rules', () => {
  const spec = (blocks: unknown[], extra: object = {}) => normalizeSpec({ username: 'octo', blocks, ...extra });
  it('adds a cache-busting version that is stable but changes with the README', () => {
    const v = (md: string) => /v=(\w+)/.exec(md)?.[1];
    const a = renderReadme(spec([{ type: 'card', card: 'stats' }]), 'https://x.dev').markdown;
    expect(v(a)).toBeTruthy();
    expect(v(renderReadme(spec([{ type: 'card', card: 'stats' }]), 'https://x.dev').markdown)).toBe(v(a));
    expect(v(renderReadme(spec([{ type: 'card', card: 'stats', params: { layout: 'compact' } }]), 'https://x.dev').markdown)).not.toBe(v(a));
  });
  it('warns about too many images and several animations', () => {
    const many = renderReadme(spec(Array.from({ length: 9 }, () => ({ type: 'card', card: 'stats' }))), 'https://x.dev');
    expect(many.warnings.join(' ')).toMatch(/9 images/);
    const moving = renderReadme(spec([{ type: 'card', card: 'skyline', params: { animation: 'true' } }, { type: 'card', card: 'typing', params: { animation: 'true' } }]), 'https://x.dev');
    expect(moving.warnings.join(' ')).toMatch(/2 animated/);
    expect(renderReadme(spec([{ type: 'card', card: 'stats' }]), 'https://x.dev').warnings).toEqual([]);
  });
  it('the new presets exist', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(expect.arrayContaining(['recruiter', 'maximal']));
  });
});

describe('README endpoints', () => {
  it('GET returns markdown for a preset, with an attachment header on download', async () => {
    const res = await get('/api/readme?username=octo&preset=classic&theme=dracula');
    expect(res.headers.get('content-type')).toContain('text/markdown');
    const md = await res.text();
    expect(md).toContain('http://localhost/api/stats?username=octo&theme=dracula');
    expect(md).toContain('/api/banner?');
    const dl = await get('/api/readme?username=octo&download=1');
    expect(dl.headers.get('content-disposition')).toContain('README.md');
  });
  it('supports json and sandboxed html formats, a custom base URL, dark mode and align overrides', async () => {
    const json = await (await get('/api/readme?username=octo&preset=minimal&format=json&dark=github_dark&align=left')).json();
    expect(json.spec.dark).toBe('github_dark');
    expect(json.markdown).toContain('<picture>');
    expect(json.markdown).toContain('align="left"');
    const html = await get('/api/readme?username=octo&format=html');
    expect(html.headers.get('content-security-policy')).toContain('sandbox');
    const based = await (await get('/api/readme?username=octo&base=https://stats.example.com/x/y')).text();
    expect(based).toContain('https://stats.example.com/api/stats');
    expect((await get('/api/readme?username=octo&base=javascript:1')).status).toBe(400);
  });
  it('accepts a fully custom spec via ?spec= (base64url JSON)', async () => {
    const spec = { username: 'octo', blocks: [{ type: 'heading', text: 'Grüße 👋', level: 1 }, { type: 'card', card: 'ascii', params: { shape: 'sphere' } }] };
    const md = await (await get(`/api/readme?spec=${encodeSpecParam(spec)}`)).text();
    expect(md).toContain('# Grüße 👋');
    expect(md).toContain('/api/ascii?username=octo&shape=sphere');
    expect((await get('/api/readme?spec=!!!')).status).toBe(400);
  });
  it('rejects unknown presets, missing usernames and blocked users', async () => {
    expect((await get('/api/readme?username=octo&preset=nope')).status).toBe(400);
    expect((await get('/api/readme')).status).toBe(400);
    expect((await get('/api/readme?username=octo', { ...env, BLOCKLIST: 'octo' })).status).toBe(404);
  });
  it('POST validates the body and returns spec, markdown and html', async () => {
    const res = await post('/api/readme', { username: 'octo', blocks: [{ type: 'card', card: 'streak' }, { type: 'html', html: '<script>x</script><p>ok</p>' }] });
    const json = await res.json();
    expect(json.spec.blocks).toHaveLength(2);
    expect(json.markdown).toContain('/api/streak?username=octo');
    expect(json.html).not.toContain('<script');
    expect((await post('/api/readme', '{nope')).status).toBe(400);
    expect((await post('/api/readme', { username: 'octo', blocks: [{ type: 'card', card: 'nope' }] })).status).toBe(400);
    expect((await post('/api/readme', 'x'.repeat(250_000))).status).toBe(400);
    const wrapped = await (await post('/api/readme?format=md', { spec: { username: 'octo', blocks: [{ type: 'divider' }] }, base: 'https://b.dev' })).text();
    expect(wrapped).toContain('https://b.dev/api/divider');
  });
  it('lists presets with ready-to-edit blocks', async () => {
    const json = await (await get('/api/presets?username=octo')).json();
    expect(json.presets.map((p: { id: string }) => p.id)).toEqual(expect.arrayContaining(['classic', 'showcase', 'hacker']));
    expect(json.presets[0].blocks.length).toBeGreaterThan(2);
    expect(json.blockTypes).toContain('row');
    expect(json.socials).toContain('linkedin');
    expect((await get('/api/presets?username=<x>')).status).toBe(400);
  });
});

describe('new cards', () => {
  it('banner renders in every style without a username, animated or not', async () => {
    for (const style of ['wave', 'gradient', 'grid', 'terminal']) {
      for (const animation of ['false', 'true']) {
        const res = await get(`/api/banner?style=${style}&text=Hello%20%3Cworld%3E&subtitle=Dev&animation=${animation}`);
        expect(res.headers.get('x-card-error'), style).toBeNull();
        const svg = await res.text();
        assertWellFormedSvg(svg);
        expect(svg).toContain('Hello &lt;world&gt;');
        if (animation === 'false') expect(svg).not.toContain('@keyframes');
      }
    }
  });
  it('banner shrinks long text to fit and defaults to the username', async () => {
    const long = await (await get(`/api/banner?text=${'W'.repeat(60)}&size=90`)).text();
    expect(Number(/font-size="(\d+)"/.exec(long.slice(long.indexOf('<text')))?.[1])).toBeLessThan(40);
    expect(await (await get('/api/banner?username=octo')).text()).toContain("Hi, I&apos;m octo");
  });
  it('divider renders every style transparently', async () => {
    for (const style of ['wave', 'dots', 'line', 'gradient', 'dashed', 'stars']) {
      const svg = await (await get(`/api/divider?style=${style}&animation=true`)).text();
      assertWellFormedSvg(svg);
      expect(svg).not.toContain('class="bg"');
    }
  });
  it('compare shows two users head to head and covers the blocklist', async () => {
    mockGitHub();
    const svg = await (await get('/api/compare?username=octo&vs=octocat')).text();
    assertWellFormedSvg(svg);
    expect(svg).toContain(" vs ");
    const json = await (await get('/api/compare?username=octo&vs=octocat&metrics=stars,repos&format=json')).json();
    expect(json.rows.map((r: { metric: string }) => r.metric)).toEqual(['stars', 'repos']);
    expect((await get('/api/compare?username=octo&format=json')).status).toBe(400);
    expect((await get('/api/compare?username=octo&vs=octocat&format=json', { ...env, BLOCKLIST: 'octocat' })).status).toBe(404);
  });
});

describe('store', () => {
  it('exposes categories, tags and variants for every card', async () => {
    const meta = await (await get('/api/cards')).json();
    for (const c of meta.cards) {
      expect(c.category, c.id).toBeTruthy();
      expect(c.variants.length, c.id).toBeGreaterThan(0);
    }
    expect(new Set(meta.cards.map((c: { category: string }) => c.category))).toEqual(new Set(['overview', 'activity', 'languages', 'repositories', 'achievements', 'art', 'decor', 'utility', 'integrations', 'designs']));
    expect(meta.cards.find((c: { id: string }) => c.id === 'banner').needsUser).toBe(false);
  });
  it('every variant of every card renders without an error card', async () => {
    mockGitHub();
    for (const card of cards) {
      for (const v of card.variants ?? [{ label: 'Default', params: {} }]) {
        const q = new URLSearchParams({ username: 'octo', ...(v.params ?? {}) });
        const res = await get(`/api/${card.id}?${q}`);
        expect(res.headers.get('x-card-error'), `${card.id} / ${v.label}`).toBeNull();
        assertWellFormedSvg(await res.text());
      }
    }
  });
});

describe('web UI', () => {
  it('serves the app shell with all three tabs, and its script is syntactically valid', async () => {
    const html = await (await get('/')).text();
    for (const id of ['tab-play', 'tab-store', 'tab-builder', 'b-reset', 'reset', 'blocks', 'addbar']) expect(html).toContain(`id="${id}"`);
    const script = /<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? '';
    expect(script.length).toBeGreaterThan(10_000);
    expect(() => new Function(script)).not.toThrow();
    expect(script).not.toContain('innerHTML = html'); // user content must never be injected as markup
  });
});
