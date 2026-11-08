import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cards } from '../src/cards';
import { clearMemoryCache } from '../src/core/cache';
import { COMMON_PARAMS } from '../src/core/params';
import { resetTokenStates } from '../src/github/tokens';
import app from '../src/index';
import { assertWellFormedSvg, mockGitHub, testEnv } from './helpers';

const PAYLOADS = [
  '"><script>alert(1)</script>',
  "'};</style><script>alert(2)</script>",
  '<img src=x onerror=alert(3)>',
  'javascript:alert(4)',
  '"; fill:red} </style><svg onload=alert(5)>'
];

const ALLOWED_TAGS = new Set(
  'svg style defs g rect circle ellipse path line polygon polyline text tspan title desc image use symbol clipPath mask pattern marker linearGradient radialGradient stop filter feDropShadow feGaussianBlur feMerge feMergeNode feColorMatrix feFlood feComposite feOffset feBlend animate animateTransform set a textPath'.split(' ')
);

/**
 * Inspects real markup only (escaped text such as &lt;img onerror=...&gt; is harmless):
 * unknown tags, event-handler attributes and script URLs. Returns what it found, or null.
 */
function unsafeMarkup(svg: string): string | null {
  const body = svg.replace(/<style[\s\S]*?<\/style>/g, '<style/>');
  for (const m of body.matchAll(/<\/?([a-zA-Z][\w:-]*)([^>]*)>/g)) {
    if (!ALLOWED_TAGS.has(m[1])) return `tag <${m[1]}>`;
    for (const a of m[2].matchAll(/\s([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/g)) {
      if (/^on/i.test(a[1])) return `attribute ${a[1]}`;
      if (/^(xlink:)?href$/i.test(a[1]) && /^["']\s*(javascript|data:text\/html)/i.test(a[2])) return 'script url';
    }
  }
  return null;
}

/** The style block is checked separately: user text must never be able to close it or add rules. */
function styleBreakout(svg: string): boolean {
  return (svg.match(/<style/g) ?? []).length !== (svg.match(/<\/style>/g) ?? []).length;
}

let env = testEnv();
const get = (path: string) => app.request(path, {}, env);

beforeEach(() => {
  clearMemoryCache();
  resetTokenStates();
  vi.unstubAllGlobals();
  env = testEnv();
});

describe('injection resistance', () => {
  it('no option of any card can inject markup into the SVG', async () => {
    mockGitHub();
    const problems: string[] = [];
    for (const card of cards) {
      const base = card.needsUser === false ? '' : 'username=octo';
      const names = [...card.params, ...COMMON_PARAMS]
        .filter((p) => !['username', 'format', 'cache_seconds'].includes(p.name) && p.type !== 'boolean' && p.type !== 'number')
        .map((p) => p.name);
      for (const name of names) {
        for (const payload of PAYLOADS) {
          const res = await get(`/api/${card.id}?${base}&${name}=${encodeURIComponent(payload)}`);
          const svg = await res.text();
          const hit = unsafeMarkup(svg) ?? (styleBreakout(svg) ? 'style block broken' : null);
          if (hit) problems.push(`${card.id}?${name}: ${hit}`);
          else {
            try {
              assertWellFormedSvg(svg);
            } catch {
              problems.push(`${card.id}?${name}: not well formed`);
            }
          }
        }
      }
    }
    expect(problems).toEqual([]);
  }, 120_000);

  it('hostile GitHub data (names, bios, descriptions) is escaped', async () => {
    mockGitHub();
    for (const id of ['stats', 'profile-card', 'top-repos', 'pinned', 'impact', 'repo-timeline', 'design']) {
      const svg = await (await get(`/api/${id}?username=octo`)).text();
      expect(unsafeMarkup(svg), id).toBeNull();
    }
  });

  it('rejects usernames that are not valid GitHub logins', async () => {
    mockGitHub();
    for (const bad of ['../etc/passwd', 'a b', 'x'.repeat(60), '<script>', 'octo;drop']) {
      const res = await get(`/api/stats?username=${encodeURIComponent(bad)}&format=json`);
      expect(res.status, bad).toBe(400);
    }
  });
});

describe('transport and headers', () => {
  it('sends the security headers on every response', async () => {
    mockGitHub();
    for (const path of ['/', '/api/stats?username=octo', '/api/health']) {
      const res = await get(path);
      expect(res.headers.get('x-content-type-options'), path).toBe('nosniff');
      expect(res.headers.get('referrer-policy'), path).toBe('no-referrer');
      expect(res.headers.get('permissions-policy'), path).toContain('camera=()');
      expect(res.headers.get('strict-transport-security'), path).toContain('max-age');
    }
    const svg = await get('/api/stats?username=octo');
    expect(svg.headers.get('content-security-policy')).toContain('sandbox');
    expect((await get('/')).headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });

  it('protects /api/rate-limit details behind ADMIN_TOKEN', async () => {
    const e = { ...env, ADMIN_TOKEN: 's3cret' };
    const anon = await app.request('/api/rate-limit', {}, e);
    expect(JSON.stringify(await anon.json())).not.toContain('s3cret');
    const wrong = await app.request('/api/rate-limit', { headers: { authorization: 'Bearer nope' } }, e);
    expect(wrong.status).toBe(200); // public health view only, never the live quota
  });

  it('refuses oversized request bodies, with or without Content-Length', async () => {
    const big = JSON.stringify({ blocks: [], pad: 'x'.repeat(300_000) });
    const res = await app.request('/api/readme', { method: 'POST', body: big, headers: { 'content-type': 'application/json' } }, env);
    expect(res.status).toBe(400);
  });
});

describe('app content security policy', () => {
  it('pins the one inline script by hash instead of allowing inline scripts', async () => {
    const res = await get('/');
    const html = await res.text();
    const csp = res.headers.get('content-security-policy') ?? '';
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts).toHaveLength(1);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scripts[0]));
    const hash = btoa(String.fromCharCode(...new Uint8Array(digest)));
    expect(csp).toContain(`script-src 'sha256-${hash}'`);
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(html).not.toMatch(/\son[a-z]+="/); // inline event attributes would be blocked
  });
});
