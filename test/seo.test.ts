import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cards } from '../src/cards';
import { clearMemoryCache } from '../src/core/cache';
import { resetTokenStates } from '../src/github/tokens';
import app from '../src/index';
import { mockGitHub, testEnv } from './helpers';

const env = testEnv();
const get = (path: string) => app.request(`https://stats.example.org${path}`, {}, env);

beforeEach(() => {
  clearMemoryCache();
  resetTokenStates();
  vi.unstubAllGlobals();
});

const ldOf = (html: string) => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(m).not.toBeNull();
  return JSON.parse((m as RegExpMatchArray)[1]);
};

describe('search and AI discoverability', () => {
  it('landing page at / is server-rendered with SylvenOS branding, live examples, FAQ markup and a hash-pinned script', async () => {
    const res = await get('/');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('<link rel="canonical" href="https://stats.example.org/">');
    expect((html.match(/<h1[ >]/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/app"');
    expect(html).toContain('Sylven<span>OS</span>');
    expect(html).toContain('Learn. Build. Educate.');
    // the developer is named in machine-readable data only, never in visible text or snippets
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<meta[^>]*>/g, '');
    expect(visible).not.toContain('Akshay');
    expect(visible).toContain(`© ${new Date().getFullYear()}`.replace('©', '&copy;'));
    expect(html).toContain('/sylvenos-logo.webp');
    expect(html).toContain('https://stats.example.org/api/stats?username=');
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'none'");
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts.length).toBe(2);
    for (const script of scripts) {
      const digest = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script)))));
      expect(csp).toContain(`'sha256-${digest}'`);
    }
    expect(html).toContain('id="theme"');
    for (const script of scripts) expect(() => new Function(script), 'landing script must be valid JavaScript').not.toThrow();
    const ld = ldOf(html)['@graph'];
    const faq = ld.find((n: { '@type': string }) => n['@type'] === 'FAQPage');
    expect(faq['@id']).toBe('https://stats.example.org/#faq');
    for (const q of faq.mainEntity) expect(html).toContain(q.name.replace(/&/g, '&amp;'));
    expect(ld.some((n: { '@type': string }) => n['@type'] === 'AboutPage')).toBe(false);
    expect(res.headers.get('link')).toContain('rel="service-desc"');
  });

  it('app page (at /app) has canonical, social tags, structured data and one static h1', async () => {
    const html = await (await get('/app')).text();
    expect(html).toContain('<link rel="canonical" href="https://stats.example.org/app">');
    expect(html).toContain('property="og:image" content="https://stats.example.org/og.jpg"');
    expect(html).toContain('property="og:image" content="https://stats.example.org/og-square.jpg"');
    expect(html).toContain('property="og:image:alt"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).not.toContain('__ORIGIN__');
    expect(html).not.toContain('__JSONLD__');
    expect((html.match(/<h1[ >]/g) ?? []).length).toBe(1);
    const ld = ldOf(html);
    const types = ld['@graph'].map((n: { '@type': string }) => n['@type']);
    expect(types).toEqual(expect.arrayContaining(['Organization', 'Person', 'WebSite', 'SoftwareApplication']));
    const person = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'Person');
    expect(person.name).toBe('Akshay Kurve');
    expect(person.alternateName).toEqual(['Akshay D Kurve', 'Akshay Dhanraj Kurve']);
    expect(person.worksFor['@id']).toContain('sylvenos.com');
    const res = await get('/app');
    expect(res.headers.get('link')).toContain('rel="service-desc"');
  });

  it('about page is server-rendered with FAQ markup, author and organisation', async () => {
    const res = await get('/about');
    const html = await res.text();
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(html).toContain('<h1>');
    expect(html).toContain('rel="canonical" href="https://stats.example.org/about"');
    expect(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<meta[^>]*>/g, '')).not.toContain('Akshay');
    expect(html).toContain('Akshay Dhanraj Kurve'); // structured data only
    expect(html).toContain('https://sylvenos.com');
    const faq = ldOf(html)['@graph'].find((n: { '@type': string }) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(8);
    const types = ldOf(html)['@graph'].map((n: { '@type': string }) => n['@type']);
    expect(types).toEqual(expect.arrayContaining(['AboutPage', 'BreadcrumbList', 'HowTo']));
    expect(html).toContain('id="theme"');
    expect(html).toContain('/sylvenos-logo.webp');
    const csp = res.headers.get('content-security-policy') ?? '';
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts.length).toBe(2);
    for (const script of scripts) {
      const digest = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script)))));
      expect(csp).toContain(`'sha256-${digest}'`);
      expect(() => new Function(script)).not.toThrow();
    }
    expect(html).toContain('Key facts');
    expect(html).toContain('Accuracy, sources and corrections');
    expect(html).toMatch(/<time datetime="\d{4}-\d{2}-\d{2}">/);
    for (const q of faq.mainEntity) expect(html).toContain(q.name.replace(/&/g, '&amp;'));
  });

  it('robots.txt welcomes crawlers and AI bots and points to the sitemap', async () => {
    const txt = await (await get('/robots.txt')).text();
    expect(txt).toContain('Sitemap: https://stats.example.org/sitemap.xml');
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) expect(txt).toContain(`User-agent: ${bot}`);
    expect(txt).toContain('Allow: /api/openapi.json');
    expect(txt).toContain('Content-Signal: search=yes, ai-input=yes, ai-train=yes');
    for (const bot of ['anthropic-ai', 'Perplexity-User', 'Meta-ExternalAgent']) expect(txt).toContain(`User-agent: ${bot}`);
  });

  it('sitemap is valid XML with absolute URLs for this host', async () => {
    const xml = await (await get('/sitemap.xml')).text();
    expect(xml).toMatch(/^<\?xml/);
    expect(xml).toContain('<loc>https://stats.example.org/about</loc>');
    expect(xml).toContain('<loc>https://stats.example.org/app</loc>');
    expect(xml).toContain('<image:loc>https://stats.example.org/sylvenos-logo.webp</image:loc>');
    expect((xml.match(/<url>/g) ?? []).length).toBe((xml.match(/<\/url>/g) ?? []).length);
    expect(xml).toContain('<image:loc>https://stats.example.org/og.jpg</image:loc>');
    expect(xml).toContain('xmlns:image=');
  });

  it('llms.txt names the project, organisation and developer; llms-full lists every card', async () => {
    const short = await (await get('/llms.txt')).text();
    expect(short.startsWith('# ProfileFoundry')).toBe(true);
    expect(short).toContain('SylvenOS');
    expect(short).toContain('Akshay Kurve');
    expect(short).toContain('Akshay D Kurve');
    expect(short).toContain('## Key facts');
    expect(short).toContain('## How to cite');
    const full = await (await get('/llms-full.txt')).text();
    for (const c of cards) expect(full, c.id).toContain(`/api/${c.id}`);
  });

  it('serves the SylvenOS logo as WebP', async () => {
    const r = await get('/sylvenos-logo.webp');
    expect(r.headers.get('content-type')).toBe('image/webp');
    expect(new TextDecoder().decode(new Uint8Array(await r.arrayBuffer()).slice(0, 4))).toBe('RIFF');
  });

  it('serves security.txt (RFC 9116) and the share image', async () => {
    const sec = await (await get('/.well-known/security.txt')).text();
    expect(sec).toMatch(/^Contact: https:\/\//m);
    expect(sec).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T/m);
    const img = await get('/og.jpg');
    expect(img.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await img.arrayBuffer())[0]).toBe(0xff);
    const sq = await get('/og-square.jpg');
    expect(sq.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await sq.arrayBuffer())[0]).toBe(0xff);
  });

  it('keeps generated card responses out of search results', async () => {
    mockGitHub();
    const res = await get('/api/stats?username=octo');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
  });
});
