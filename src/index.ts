import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pkg from '../package.json';
import { calculateTrophies } from './achievements/engine';
import { cards, findCard } from './cards';
import type { CardDefinition } from './cards/types';
import { cacheStats, canonicalKey, edgeResponse, l1Info } from './core/cache';
import { applyCompat } from './core/compat';
import { ApiError, badRequest, notFound, rateLimited, toApiError, type ErrorCode } from './core/errors';
import { META_CACHE, assertAllowed, cacheHeader, cacheSeconds, jsonError, safeEqual, type Ctx } from './core/http';
import { translator } from './core/i18n';
import { withNumberFormat } from './core/text';
import { COMMON_PARAMS, background, color, list, parseCommon, username, type ParamDoc, type Query } from './core/params';
import { GitHubClient } from './github/client';
import { poolStatus } from './github/tokens';
import { calculateProfileMetrics } from './metrics';
import { calculateGrade } from './metrics/grade';
import { DEFINITIONS } from './metrics/definitions';
import { buildOpenApi } from './openapi';
import { playgroundHtml } from './playground';
import { aboutHtml, jsonLd, llmsFullTxt, llmsTxt, robotsTxt, securityTxt, sitemapXml } from './seo';
import { APPLE_TOUCH_ICON_BASE64, FAVICON_SVG, OG_IMAGE_BASE64 } from './ui/icons';
import { SCRIPT } from './ui/script';
import { runPlugins } from './plugins';
import { readmeRoutes } from './readme/routes';
import { messageCard } from './svg/frame';
import { resolveTheme, themes } from './themes';
import type { AppEnv } from './types';

const SVG_HEADERS = {
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  // if someone opens the SVG directly, forbid scripts and remote loads
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox"
};
/** The app's single inline script is pinned by hash, so injected scripts could not run even if markup slipped through. */
const appCsp = (scriptHash: string) =>
  `default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; img-src * data: blob:; connect-src 'self' https:; frame-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
let scriptHash: Promise<string> | undefined;
const appScriptHash = () =>
  (scriptHash ??= crypto.subtle.digest('SHA-256', new TextEncoder().encode(SCRIPT)).then((d) => btoa(String.fromCharCode(...new Uint8Array(d)))));
/** Rendered SVGs larger than this are refused (GitHub's image proxy stops at ~5 MB anyway). */
const MAX_SVG_BYTES = 2_500_000;
const NO_STORE = 'no-cache, no-store, must-revalidate, max-age=0';
/** How long an error card may be cached, by cause. Bad input never fixes itself; outages do. */
const ERROR_CACHE: Record<ErrorCode, number> = { bad_request: 86_400, not_found: 3600, rate_limited: 60, upstream: 120, internal: 60 };

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('Referrer-Policy', 'no-referrer');
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  c.res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], maxAge: 86400 }));

// ---- helpers -------------------------------------------------------------------------------

function tokensOf(c: Ctx): string[] {
  const env = c.env ?? {};
  return [env.GITHUB_TOKEN, ...(env.GITHUB_TOKENS?.split(',') ?? [])].map((t) => t?.trim()).filter(Boolean) as string[];
}

function waitUntilOf(c: Ctx): ((p: Promise<unknown>) => void) | undefined {
  try {
    return c.executionCtx.waitUntil.bind(c.executionCtx);
  } catch {
    return undefined; // not running in a worker (tests, Node)
  }
}

function createClient(c: Ctx): GitHubClient {
  return new GitHubClient({ tokens: tokensOf(c), waitUntil: waitUntilOf(c), ttl: cacheSeconds(c) });
}

const allowedCache = new Map<string, Map<string, ParamDoc>>();
/** Parameters a card understands - everything else is dropped from its cache key. */
function allowedFor(card: CardDefinition): Map<string, ParamDoc> {
  let m = allowedCache.get(card.id);
  if (!m) {
    m = new Map([...COMMON_PARAMS, ...card.params].map((p) => [p.name, p]));
    allowedCache.set(card.id, m);
  }
  return m;
}

/**
 * Abuse protection, only consulted on cache misses so cached traffic stays free. GitHub's image proxy
 * (camo) fetches from a handful of IPs for everyone, so it's limited per username instead of per IP.
 * No-op when the rate-limit bindings aren't configured.
 */
async function overLimit(c: Ctx, user: string | undefined): Promise<boolean> {
  const camo = /github-camo/i.test(c.req.header('user-agent') ?? '');
  const binding = camo ? c.env?.RL_USER : c.env?.RL_IP;
  if (!binding) return false;
  const key = camo ? `u:${(user ?? '').toLowerCase()}` : `ip:${c.req.header('cf-connecting-ip') ?? 'unknown'}`;
  try {
    return !(await binding.limit({ key })).success;
  } catch {
    return false; // never fail closed because the limiter is unavailable
  }
}

function themeFromQuery(query: Query) {
  const bg = background(query.bg);
  return resolveTheme(query.theme, { bg: bg.color, fg: color(query.fg), muted: color(query.muted), accent: color(query.accent), border: color(query.border) }, { gradient: bg.gradient });
}

const ERROR_TITLE: Record<ErrorCode, string> = {
  bad_request: 'Check the card options',
  not_found: 'Not found',
  rate_limited: 'Taking a short break',
  upstream: 'Temporarily unavailable',
  internal: 'Something went wrong'
};

/** A hint on how to fix the error, when there's an obvious one. */
function errorHint(err: ApiError): string | undefined {
  const m = err.message.toLowerCase();
  if (m.includes('token')) return 'The server owner can add GITHUB_TOKEN (no scopes needed) to unlock this.';
  if (m.includes('not configured') || m.includes('not set up')) return 'This optional feature has to be enabled on the server; see the README.';
  if (err.code === 'rate_limited') return 'GitHub is limiting requests. The card fixes itself within a few minutes.';
  if (err.code === 'upstream') return 'The data source did not answer. Cached data is used as soon as it is available.';
  if (err.code === 'not_found') return 'Check the spelling of the username or repository.';
  if (err.code === 'bad_request') return 'See /api/cards for every option and its allowed values.';
  return undefined;
}

/** Card error responses: JSON for `format=json`, otherwise an SVG (HTTP 200) so READMEs show the reason instead of a broken image. */
function errorResponse(c: Ctx, err: ApiError, query: Query) {
  if (query.format === 'json') return jsonError(c, err);
  const tone = err.code === 'rate_limited' || err.code === 'upstream' ? 'warn' : err.code === 'bad_request' ? 'info' : 'error';
  const lower = err.message.toLowerCase();
  const title = lower.includes('token') ? 'Needs a GitHub token' : lower.includes('not configured') || lower.includes('not set up') ? 'Not enabled on this server' : ERROR_TITLE[err.code];
  return c.body(messageCard(err.message, themeFromQuery(query), { title, hint: errorHint(err), tone }), 200, {
    ...SVG_HEADERS,
    'Cache-Control': `public, max-age=${ERROR_CACHE[err.code]}`,
    'X-Card-Error': err.code
  });
}

function log(fields: Record<string, unknown>) {
  console.log(JSON.stringify(fields));
}

async function renderCard(c: Ctx, card: CardDefinition, query: Query, client: GitHubClient): Promise<Response> {
  try {
    const common = parseCommon(query, card.needsUser !== false);
    if (common.username) assertAllowed(c, common.username);
    const params = card.parse(query, common);
    for (const u of card.users?.(params) ?? []) assertAllowed(c, u);
    const data = await card.load(client, params, common, { env: c.env ?? {}, waitUntil: waitUntilOf(c) });
    // cacheSeconds 0 = live (counters): never stored by us, camo or browsers
    const cache = card.cacheSeconds === 0 ? NO_STORE : cacheHeader(card.cacheSeconds ?? cacheSeconds(c, common.cacheSeconds));

    if (common.format === 'text') {
      if (!card.toText) throw badRequest(`The ${card.id} card has no text format`);
      return c.text(card.toText(data, params), 200, { 'Cache-Control': cache, 'Content-Type': 'text/plain; charset=utf-8' });
    }
    if (common.format === 'json') {
      return c.json((card.toJSON ? card.toJSON(data, params) : data) as object, 200, { 'Cache-Control': cache });
    }

    const theme = resolveTheme(common.theme, common.colors, { radius: common.radius, font: common.font, hideBorder: common.hideBorder, gradient: common.gradient, style: common.style });
    const svg = withNumberFormat(common.numberFormat, common.locale, () =>
      card.render(data, params, {
        theme,
        common,
        title: (fallback) => (common.hideTitle ? undefined : common.title ?? fallback),
        t: translator(common.locale)
      })
    );
    if (svg.length > MAX_SVG_BYTES) throw badRequest('This combination of options produces an image that is too large');
    return c.body(svg, 200, { ...SVG_HEADERS, 'Cache-Control': cache });
  } catch (e) {
    return errorResponse(c, toApiError(e), query);
  }
}

// ---- meta endpoints ------------------------------------------------------------------------

const ICON_CACHE = 'public, max-age=86400';
app.get('/favicon.svg', (c) => c.body(FAVICON_SVG, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': ICON_CACHE }));
app.get('/favicon.ico', (c) => c.redirect('/favicon.svg', 301));
app.get('/apple-touch-icon.png', (c) => {
  const bin = atob(APPLE_TOUCH_ICON_BASE64);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return c.body(bytes, 200, { 'Content-Type': 'image/png', 'Cache-Control': ICON_CACHE });
});

const originOf = (c: Ctx) => new URL(c.req.url).origin;
const bytesOf = (b64: string) => Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
app.get('/og.jpg', (c) => c.body(bytesOf(OG_IMAGE_BASE64), 200, { 'Content-Type': 'image/jpeg', 'Cache-Control': ICON_CACHE }));

// crawler and assistant files; the host comes from the request so every deployment describes itself
const TEXT = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' };
app.get('/robots.txt', (c) => c.body(robotsTxt(originOf(c)), 200, TEXT));
app.get('/sitemap.xml', (c) => c.body(sitemapXml(originOf(c)), 200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }));
app.get('/llms.txt', (c) => c.body(llmsTxt(originOf(c)), 200, { ...TEXT, 'Content-Type': 'text/markdown; charset=utf-8' }));
app.get('/llms-full.txt', (c) => c.body(llmsFullTxt(originOf(c)), 200, { ...TEXT, 'Content-Type': 'text/markdown; charset=utf-8' }));
app.get('/.well-known/security.txt', (c) => c.body(securityTxt(originOf(c)), 200, TEXT));
app.get('/about', (c) =>
  c.html(aboutHtml(originOf(c)), 200, {
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Cache-Control': 'public, max-age=3600'
  })
);

app.get('/', async (c) => {
  const origin = originOf(c);
  const html = playgroundHtml.split('__ORIGIN__').join(origin).replace('__JSONLD__', () => jsonLd(origin));
  return c.html(html, 200, {
    'Content-Security-Policy': appCsp(await appScriptHash()),
    'Cache-Control': 'public, max-age=300',
    Link: `<${origin}/api/openapi.json>; rel="service-desc", <${origin}/llms.txt>; rel="describedby"; type="text/markdown"`
  });
});

app.get('/api/health', (c) => {
  const tokens = poolStatus(tokensOf(c));
  const healthy = tokens.filter((t) => t.healthy).length;
  const degraded = tokens.length > 0 && healthy === 0;
  return c.json(
    {
      status: degraded ? 'degraded' : 'ok',
      version: pkg.version,
      github: { token: tokens.length > 0, tokens: tokens.length, healthyTokens: healthy },
      cache: { ...l1Info(), ...cacheStats }
    },
    degraded ? 503 : 200,
    { 'Cache-Control': 'no-store' }
  );
});

app.get('/api/cards', (c) =>
  c.json(
    {
      common: COMMON_PARAMS.map((p) => (p.name === 'theme' ? { ...p, options: ['auto', ...Object.keys(themes)] } : p)),
      cards: cards.map(({ id, aliases, title, description, params, category, tags, variants, needsUser }) => ({
        id,
        aliases: aliases ?? [],
        title,
        description,
        category,
        tags: tags ?? [],
        variants: variants ?? [{ label: 'Default' }],
        needsUser: needsUser !== false,
        params
      }))
    },
    200,
    { 'Cache-Control': META_CACHE }
  )
);

app.get('/api/definitions', (c) => c.json({ metrics: DEFINITIONS }, 200, { 'Cache-Control': META_CACHE }));

app.get('/api/themes', (c) => c.json(themes, 200, { 'Cache-Control': META_CACHE }));

app.get('/api/openapi.json', (c) => c.json(buildOpenApi(new URL(c.req.url).origin, pkg.version), 200, { 'Cache-Control': META_CACHE }));

// Token quota. Public: health from observed headers only (no GitHub calls, no secrets). Admin: live quota.
app.get('/api/rate-limit', async (c) => {
  const admin = c.env?.ADMIN_TOKEN;
  const auth = c.req.header('authorization') ?? '';
  try {
    if (admin && safeEqual(auth, `Bearer ${admin}`)) {
      return c.json({ tokens: await createClient(c).getRateLimits() }, 200, { 'Cache-Control': 'no-store' });
    }
    return c.json({ tokens: poolStatus(tokensOf(c)) }, 200, { 'Cache-Control': 'no-store' });
  } catch (e) {
    return jsonError(c, e);
  }
});

const PROFILE_PARAMS = new Map<string, ParamDoc>([
  ['username', { name: 'username', type: 'string', description: '' }],
  ['plugins', { name: 'plugins', type: 'string', description: '' }]
]);

// Aggregated developer profile (JSON only): GitHub data + derived metrics + trophies + plugins.
app.get('/api/profile', async (c) => {
  const key = canonicalKey(new URL(c.req.url).origin, `/${pkg.version}/api/profile`, c.req.query(), PROFILE_PARAMS);
  const [res] = await edgeResponse(c, key, async () => {
    try {
      const login = username(c.req.query('username'));
      assertAllowed(c, login);
      if (await overLimit(c, login)) throw rateLimited('Too many requests, please slow down');
      const wanted = c.req.query('plugins');
      const user = await createClient(c).getUser(login);
      const metrics = calculateProfileMetrics(user);
      const plugins = await runPlugins(login, wanted === 'none' ? [] : wanted ? list(wanted) : undefined);
      return c.json({ github: user, metrics, grade: calculateGrade(metrics), trophies: calculateTrophies(metrics), plugins }, 200, {
        'Cache-Control': cacheHeader(cacheSeconds(c))
      });
    } catch (e) {
      return jsonError(c, e);
    }
  });
  return res;
});

// README generator: /api/readme (GET/POST) and /api/presets. Registered before the /api/:card catch-all.
app.route('/api', readmeRoutes);

// ---- cards ---------------------------------------------------------------------------------

async function handleCard(c: Ctx, id: string) {
  const started = Date.now();
  const card = findCard(id);
  if (!card) {
    return jsonError(c, notFound(`Unknown card "${id}". Available: ${cards.map((x) => x.id).join(', ')}`));
  }
  // github-readme-stats parameter names are rewritten first, so both spellings share one cache entry
  const query = applyCompat(card.id, c.req.query());

  // One cache entry per *meaningful* request: unknown params, defaults and param order don't matter.
  const key = canonicalKey(new URL(c.req.url).origin, `/${pkg.version}/api/${card.id}`, query, allowedFor(card), card.extraParam);
  let client: GitHubClient | undefined;
  const [res, hit] = await edgeResponse(c, key, async () => {
    if (await overLimit(c, query.username)) return errorResponse(c, rateLimited('Too many requests, please try again in a minute'), query);
    client = createClient(c);
    return renderCard(c, card, query, client);
  });
  log({ evt: 'card', card: card.id, user: query.username?.toLowerCase(), cache: hit ? 'hit' : 'miss', status: res.status, error: res.headers.get('X-Card-Error') ?? undefined, ms: Date.now() - started, sub: client?.subrequests ?? 0 });
  // timing and cache state are visible to developers (DevTools, curl -i); clone because cached responses are immutable
  const out = new Response(res.body, res);
  const ms = Date.now() - started;
  out.headers.set('X-Cache', hit ? 'HIT' : 'MISS');
  out.headers.set('X-Robots-Tag', 'noindex'); // generated images and per-user data are not search results
  out.headers.set('Server-Timing', `total;dur=${ms}${client ? `, github;desc="${client.subrequests} calls"` : ''}`);
  return out;
}

// `/api?username=` is github-readme-stats' stats card
app.get('/api', (c) => handleCard(c, 'stats'));
app.get('/api/:card', (c) => handleCard(c, c.req.param('card')));

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Not found. See /api/cards for available endpoints.' } }, 404));
app.onError((e, c) => jsonError(c, e));

export default app;
// Durable Object class for the view counter (bound as VIEWS in wrangler.toml)
export { ViewCounter } from './counter';
