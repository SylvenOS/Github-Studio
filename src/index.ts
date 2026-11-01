import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pkg from '../package.json';
import { calculateTrophies } from './achievements/engine';
import { cards, findCard } from './cards';
import type { CardDefinition } from './cards/types';
import { cacheStats, canonicalKey, edgeResponse, l1Info } from './core/cache';
import { applyCompat } from './core/compat';
import { ApiError, badRequest, notFound, rateLimited, toApiError, type ErrorCode } from './core/errors';
import { META_CACHE, assertAllowed, cacheHeader, cacheSeconds, jsonError, type Ctx } from './core/http';
import { translator } from './core/i18n';
import { withNumberFormat } from './core/text';
import { COMMON_PARAMS, background, color, list, parseCommon, username, type ParamDoc, type Query } from './core/params';
import { GitHubClient } from './github/client';
import { poolStatus } from './github/tokens';
import { calculateProfileMetrics } from './metrics';
import { calculateGrade } from './metrics/grade';
import { buildOpenApi } from './openapi';
import { playgroundHtml } from './playground';
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
const APP_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src * data: blob:; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
/** Rendered SVGs larger than this are refused (GitHub's image proxy stops at ~5 MB anyway). */
const MAX_SVG_BYTES = 2_500_000;
/** How long an error card may be cached, by cause. Bad input never fixes itself; outages do. */
const ERROR_CACHE: Record<ErrorCode, number> = { bad_request: 86_400, not_found: 3600, rate_limited: 60, upstream: 120, internal: 60 };

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('Referrer-Policy', 'no-referrer');
});
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], maxAge: 86400 }));

// ---- helpers -------------------------------------------------------------------------------

function tokensOf(c: Ctx): string[] {
  const env = c.env ?? {};
  return [env.GITHUB_TOKEN, ...(env.GITHUB_TOKENS?.split(',') ?? [])].map((t) => t?.trim()).filter(Boolean) as string[];
}

function createClient(c: Ctx): GitHubClient {
  let waitUntil: ((p: Promise<unknown>) => void) | undefined;
  try {
    waitUntil = c.executionCtx.waitUntil.bind(c.executionCtx);
  } catch {
    /* not running in a worker (tests, Node) */
  }
  return new GitHubClient({ tokens: tokensOf(c), waitUntil, ttl: cacheSeconds(c) });
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

/** Card error responses: JSON for `format=json`, otherwise an SVG (HTTP 200) so READMEs show the reason instead of a broken image. */
function errorResponse(c: Ctx, err: ApiError, query: Query) {
  if (query.format === 'json') return jsonError(c, err);
  return c.body(messageCard(err.message, themeFromQuery(query)), 200, {
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
    const data = await card.load(client, params, common);
    const cache = cacheHeader(card.cacheSeconds ?? cacheSeconds(c, common.cacheSeconds));

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

app.get('/', (c) => c.html(playgroundHtml, 200, { 'Content-Security-Policy': APP_CSP, 'Cache-Control': 'public, max-age=300' }));

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

app.get('/api/themes', (c) => c.json(themes, 200, { 'Cache-Control': META_CACHE }));

app.get('/api/openapi.json', (c) => c.json(buildOpenApi(new URL(c.req.url).origin, pkg.version), 200, { 'Cache-Control': META_CACHE }));

// Token quota. Public: health from observed headers only (no GitHub calls, no secrets). Admin: live quota.
app.get('/api/rate-limit', async (c) => {
  const admin = c.env?.ADMIN_TOKEN;
  const auth = c.req.header('authorization') ?? '';
  try {
    if (admin && auth === `Bearer ${admin}`) {
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
  const key = canonicalKey(new URL(c.req.url).origin, '/api/profile', c.req.query(), PROFILE_PARAMS);
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
  const key = canonicalKey(new URL(c.req.url).origin, `/api/${card.id}`, query, allowedFor(card), card.extraParam);
  let client: GitHubClient | undefined;
  const [res, hit] = await edgeResponse(c, key, async () => {
    if (await overLimit(c, query.username)) return errorResponse(c, rateLimited('Too many requests, please try again in a minute'), query);
    client = createClient(c);
    return renderCard(c, card, query, client);
  });
  log({ evt: 'card', card: card.id, user: query.username?.toLowerCase(), cache: hit ? 'hit' : 'miss', status: res.status, error: res.headers.get('X-Card-Error') ?? undefined, ms: Date.now() - started, sub: client?.subrequests ?? 0 });
  return res;
}

// `/api?username=` is github-readme-stats' stats card
app.get('/api', (c) => handleCard(c, 'stats'));
app.get('/api/:card', (c) => handleCard(c, c.req.param('card')));

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Not found. See /api/cards for available endpoints.' } }, 404));
app.onError((e, c) => jsonError(c, e));

export default app;
