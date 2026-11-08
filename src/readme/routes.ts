import { Hono } from 'hono';
import { badRequest } from '../core/errors';
import { assertAllowed, cacheHeader, jsonError, readTextCapped, type Ctx } from '../core/http';
import { username } from '../core/params';
import type { AppEnv } from '../types';
import { PRESETS, findPreset } from './presets';
import { renderReadme } from './render';
import { BLOCK_TYPES, decodeSpecParam, normalizeSpec, safeUrl, type ReadmeSpec } from './spec';
import { SOCIALS } from './badges';

/** README generator: `/api/readme` (GET or POST) and `/api/presets`. */
export const readmeRoutes = new Hono<AppEnv>();

const MAX_BODY = 200_000;
const PREVIEW_CSP = "sandbox; default-src 'none'; img-src * data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'";

/** Images in the generated README point at this origin: the request's own, or `?base=` for a custom domain. */
function originOf(c: Ctx, base?: string): string {
  if (base) {
    const url = safeUrl(base);
    if (!url) throw badRequest('base must be an http(s) URL');
    return new URL(url).origin;
  }
  return new URL(c.req.url).origin;
}

function overridesFrom(q: Record<string, string>) {
  const o: Partial<Pick<ReadmeSpec, 'username' | 'theme' | 'dark' | 'align' | 'footer'>> = {};
  if (q.username) o.username = q.username;
  if (q.theme) o.theme = q.theme;
  if (q.dark !== undefined) o.dark = q.dark;
  if (q.align === 'left' || q.align === 'center' || q.align === 'right') o.align = q.align;
  if (q.footer !== undefined) o.footer = q.footer === 'true';
  return o;
}

function respond(c: Ctx, spec: ReadmeSpec, origin: string, format: string, download: boolean, cache: string) {
  const out = renderReadme(spec, origin);
  if (format === 'json') return c.json({ spec, markdown: out.markdown, html: out.html, warnings: out.warnings }, 200, { 'Cache-Control': cache });
  if (format === 'html') return c.body(out.html, 200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': PREVIEW_CSP, 'Cache-Control': cache });
  return c.body(out.markdown, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': cache,
    ...(download ? { 'Content-Disposition': 'attachment; filename="README.md"' } : {})
  });
}

function withoutHtml(blocks: ReadmeSpec['blocks']): ReadmeSpec['blocks'] {
  return blocks
    .filter((b) => b.type !== 'html')
    .map((b) => (b.type === 'details' ? { ...b, blocks: withoutHtml(b.blocks) } : b));
}

readmeRoutes.get('/readme', (c) => {
  try {
    const q = c.req.query();
    let input: unknown;
    if (q.spec) {
      input = decodeSpecParam(q.spec);
    } else {
      const preset = findPreset(q.preset ?? 'classic');
      if (!preset) throw badRequest(`Unknown preset "${q.preset}". Available: ${PRESETS.map((p) => p.id).join(', ')}`);
      const login = username(q.username);
      input = { username: login, theme: preset.theme, blocks: preset.build(login) };
    }
    const spec = normalizeSpec(input, overridesFrom(q));
    assertAllowed(c, spec.username);
    // an HTML page served by GET from our origin must not carry arbitrary third-party HTML
    if (q.format === 'html') spec.blocks = withoutHtml(spec.blocks);
    return respond(c, spec, originOf(c, q.base), q.format ?? 'md', q.download === '1' || q.download === 'true', cacheHeader(600));
  } catch (e) {
    return jsonError(c, e);
  }
});

readmeRoutes.post('/readme', async (c) => {
  try {
    if (Number(c.req.header('content-length') ?? 0) > MAX_BODY) throw badRequest('Request body is too large');
    const raw = await readTextCapped(c.req.raw.body, MAX_BODY);
    if (raw === null) throw badRequest('Request body is too large');
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw badRequest('Body must be JSON');
    }
    const wrapped = typeof body === 'object' && body !== null && 'spec' in body ? (body as { spec: unknown; base?: string }) : { spec: body };
    const q = c.req.query();
    const spec = normalizeSpec(wrapped.spec, overridesFrom(q));
    assertAllowed(c, spec.username);
    return respond(c, spec, originOf(c, q.base ?? wrapped.base), q.format ?? 'json', q.download === '1', 'no-store');
  } catch (e) {
    return jsonError(c, e);
  }
});

readmeRoutes.get('/presets', (c) => {
  try {
    const q = c.req.query();
    const login = q.username ? username(q.username) : 'your-username';
    return c.json(
      {
        presets: PRESETS.map((p) => ({ id: p.id, title: p.title, description: p.description, theme: p.theme, blocks: p.build(login) })),
        blockTypes: BLOCK_TYPES,
        socials: Object.keys(SOCIALS)
      },
      200,
      { 'Cache-Control': 'public, max-age=3600' }
    );
  } catch (e) {
    return jsonError(c, e);
  }
});
