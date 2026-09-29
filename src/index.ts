import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import pkg from '../package.json';
import { calculateTrophies } from './achievements/engine';
import { cards, findCard } from './cards';
import { responseCache } from './core/cache';
import { ApiError, notFound, toApiError } from './core/errors';
import { COMMON_PARAMS, color, list, parseCommon, username, type Query } from './core/params';
import { GitHubClient } from './github/client';
import { calculateProfileMetrics } from './metrics';
import { playgroundHtml } from './playground';
import { runPlugins } from './plugins';
import { messageCard } from './svg/frame';
import { resolveTheme, themes } from './themes';
import type { AppEnv } from './types';

const DEFAULT_CACHE_SECONDS = 1800;
const SVG_HEADERS = {
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  // if someone opens the SVG directly, forbid scripts and remote loads
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"
};

type Ctx = Context<AppEnv>;

const app = new Hono<AppEnv>();

app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'], maxAge: 86400 }));
app.use('/api/*', responseCache());

// ---- helpers -------------------------------------------------------------------------------

function createClient(c: Ctx): GitHubClient {
  const env = c.env ?? {};
  const tokens = [env.GITHUB_TOKEN, ...(env.GITHUB_TOKENS?.split(',') ?? [])].map((t) => t?.trim()).filter(Boolean) as string[];
  let waitUntil: ((p: Promise<unknown>) => void) | undefined;
  try {
    waitUntil = c.executionCtx.waitUntil.bind(c.executionCtx);
  } catch {
    /* not running in a worker (tests, Node) */
  }
  return new GitHubClient({ tokens, waitUntil, ttl: cacheSeconds(c) });
}

function cacheSeconds(c: Ctx, requested?: number): number {
  const fromEnv = Number.parseInt(c.env?.CACHE_SECONDS ?? '', 10);
  return requested ?? (Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_CACHE_SECONDS);
}

function assertAllowed(c: Ctx, user: string) {
  const blocked = c.env?.BLOCKLIST?.split(',').map((s) => s.trim().toLowerCase());
  if (blocked?.includes(user.toLowerCase())) throw notFound('This user is not available');
}

const cacheHeader = (s: number) => `public, max-age=${s}, s-maxage=${s}, stale-while-revalidate=86400`;

/** Card error responses: JSON for `format=json`, otherwise an SVG so READMEs show the reason instead of a broken image. */
function errorResponse(c: Ctx, err: ApiError, query: Query) {
  if (query.format === 'json') {
    return c.json({ error: { code: err.code, message: err.message } }, err.status as 400, { 'Cache-Control': 'no-store' });
  }
  const theme = resolveTheme(query.theme, { bg: color(query.bg), fg: color(query.fg), muted: color(query.muted), accent: color(query.accent), border: color(query.border) });
  return c.body(messageCard(err.message, theme), 200, {
    ...SVG_HEADERS,
    'Cache-Control': 'public, max-age=60',
    'X-Card-Error': err.code
  });
}

// ---- meta endpoints ------------------------------------------------------------------------

app.get('/', (c) => c.html(playgroundHtml));

app.get('/api/health', (c) =>
  c.json({ status: 'ok', version: pkg.version, github: { token: !!(c.env?.GITHUB_TOKEN || c.env?.GITHUB_TOKENS) } })
);

app.get('/api/cards', (c) =>
  c.json({
    common: COMMON_PARAMS.map((p) => (p.name === 'theme' ? { ...p, options: ['auto', ...Object.keys(themes)] } : p)),
    cards: cards.map(({ id, aliases, title, description, params }) => ({ id, aliases: aliases ?? [], title, description, params }))
  })
);

app.get('/api/themes', (c) => c.json(themes));

// Aggregated developer profile (JSON only): GitHub data + derived metrics + trophies + plugins.
app.get('/api/profile', async (c) => {
  try {
    const login = username(c.req.query('username'));
    assertAllowed(c, login);
    const wanted = c.req.query('plugins');
    const user = await createClient(c).getUser(login);
    const metrics = calculateProfileMetrics(user);
    const plugins = await runPlugins(login, wanted === 'none' ? [] : wanted ? list(wanted) : undefined);
    return c.json({ github: user, metrics, trophies: calculateTrophies(metrics), plugins }, 200, {
      'Cache-Control': cacheHeader(cacheSeconds(c))
    });
  } catch (e) {
    const err = toApiError(e);
    return c.json({ error: { code: err.code, message: err.message } }, err.status as 400);
  }
});

// ---- cards ---------------------------------------------------------------------------------

app.get('/api/:card', async (c) => {
  const query = c.req.query();
  const card = findCard(c.req.param('card'));
  if (!card) {
    const err = notFound(`Unknown card "${c.req.param('card')}". Available: ${cards.map((x) => x.id).join(', ')}`);
    return c.json({ error: { code: err.code, message: err.message } }, 404);
  }

  try {
    const common = parseCommon(query);
    assertAllowed(c, common.username);
    const params = card.parse(query, common);
    const data = await card.load(createClient(c), params, common);
    const cache = cacheHeader(cacheSeconds(c, common.cacheSeconds));

    if (common.format === 'json') {
      return c.json((card.toJSON ? card.toJSON(data, params) : data) as object, 200, { 'Cache-Control': cache });
    }

    const theme = resolveTheme(common.theme, common.colors, { radius: common.radius, font: common.font, hideBorder: common.hideBorder });
    const svg = card.render(data, params, {
      theme,
      common,
      title: (fallback) => (common.hideTitle ? undefined : common.title ?? fallback)
    });
    return c.body(svg, 200, { ...SVG_HEADERS, 'Cache-Control': cache });
  } catch (e) {
    return errorResponse(c, toApiError(e), query);
  }
});

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Not found. See /api/cards for available endpoints.' } }, 404));

export default app;
