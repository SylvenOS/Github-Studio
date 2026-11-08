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
  it('app page has canonical, social tags, structured data and one static h1', async () => {
    const html = await (await get('/')).text();
    expect(html).toContain('<link rel="canonical" href="https://stats.example.org/">');
    expect(html).toContain('property="og:image" content="https://stats.example.org/og.jpg"');
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
    const res = await get('/');
    expect(res.headers.get('link')).toContain('rel="service-desc"');
  });

  it('about page is server-rendered with FAQ markup, author and organisation', async () => {
    const res = await get('/about');
    const html = await res.text();
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(html).toContain('<h1>');
    expect(html).toContain('rel="canonical" href="https://stats.example.org/about"');
    expect(html).toContain('Akshay Kurve');
    expect(html).toContain('Akshay Dhanraj Kurve');
    expect(html).toContain('https://sylvenos.com');
    const faq = ldOf(html)['@graph'].find((n: { '@type': string }) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(8);
    for (const q of faq.mainEntity) expect(html).toContain(q.name.replace(/&/g, '&amp;'));
  });

  it('robots.txt welcomes crawlers and AI bots and points to the sitemap', async () => {
    const txt = await (await get('/robots.txt')).text();
    expect(txt).toContain('Sitemap: https://stats.example.org/sitemap.xml');
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) expect(txt).toContain(`User-agent: ${bot}`);
    expect(txt).toContain('Allow: /api/openapi.json');
  });

  it('sitemap is valid XML with absolute URLs for this host', async () => {
    const xml = await (await get('/sitemap.xml')).text();
    expect(xml).toMatch(/^<\?xml/);
    expect(xml).toContain('<loc>https://stats.example.org/about</loc>');
    expect((xml.match(/<url>/g) ?? []).length).toBe((xml.match(/<\/url>/g) ?? []).length);
  });

  it('llms.txt names the project, organisation and developer; llms-full lists every card', async () => {
    const short = await (await get('/llms.txt')).text();
    expect(short.startsWith('# ProfileFoundry')).toBe(true);
    expect(short).toContain('SylvenOS');
    expect(short).toContain('Akshay Kurve');
    expect(short).toContain('Akshay D Kurve');
    const full = await (await get('/llms-full.txt')).text();
    for (const c of cards) expect(full, c.id).toContain(`/api/${c.id}`);
  });

  it('serves security.txt (RFC 9116) and the share image', async () => {
    const sec = await (await get('/.well-known/security.txt')).text();
    expect(sec).toMatch(/^Contact: https:\/\//m);
    expect(sec).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T/m);
    const img = await get('/og.jpg');
    expect(img.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await img.arrayBuffer())[0]).toBe(0xff);
  });

  it('keeps generated card responses out of search results', async () => {
    mockGitHub();
    const res = await get('/api/stats?username=octo');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
  });
});
