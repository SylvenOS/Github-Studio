import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pkg from '../package.json';
import { calculateTrophies } from './achievements/engine';
import { cards, findCard } from './cards';
import { responseCache } from './core/cache';
import { ApiError, badRequest, notFound, toApiError } from './core/errors';
import { META_CACHE, assertAllowed, cacheHeader, cacheSeconds, jsonError, type Ctx } from './core/http';
import { translator } from './core/i18n';
import { COMMON_PARAMS, background, color, list, parseCommon, username, type Query } from './core/params';
import { GitHubClient } from './github/client';
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
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"
};

const app = new Hono<AppEnv>();

app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], maxAge: 86400 }));
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

/** Card error responses: JSON for `format=json`, otherwise an SVG so READMEs show the reason instead of a broken image. */
function errorResponse(c: Ctx, err: ApiError, query: Query) {
  if (query.format === 'json') return jsonError(c, err);
  const bg = background(query.bg);
  const theme = resolveTheme(query.theme, { bg: bg.color, fg: color(query.fg), muted: color(query.muted), accent: color(query.accent), border: color(query.border) }, { gradient: bg.gradient });
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

// Remaining GitHub API quota per configured token (labels only, never the tokens).
app.get('/api/rate-limit', async (c) => {
  try {
    return c.json({ tokens: await createClient(c).getRateLimits() }, 200, { 'Cache-Control': 'no-store' });
  } catch (e) {
    return jsonError(c, e);
  }
});

// Aggregated developer profile (JSON only): GitHub data + derived metrics + trophies + plugins.
app.get('/api/profile', async (c) => {
  try {
    const login = username(c.req.query('username'));
    assertAllowed(c, login);
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

// README generator: /api/readme (GET/POST) and /api/presets. Registered before the /api/:card catch-all.
app.route('/api', readmeRoutes);

// ---- cards ---------------------------------------------------------------------------------

app.get('/api/:card', async (c) => {
  const query = c.req.query();
  const card = findCard(c.req.param('card'));
  if (!card) {
    return jsonError(c, notFound(`Unknown card "${c.req.param('card')}". Available: ${cards.map((x) => x.id).join(', ')}`));
  }

  try {
    const common = parseCommon(query, card.needsUser !== false);
    if (common.username) assertAllowed(c, common.username);
    const params = card.parse(query, common);
    for (const u of card.users?.(params) ?? []) assertAllowed(c, u);
    const data = await card.load(createClient(c), params, common);
    const cache = cacheHeader(cacheSeconds(c, common.cacheSeconds));

    if (common.format === 'text') {
      if (!card.toText) throw badRequest(`The ${card.id} card has no text format`);
      return c.text(card.toText(data, params), 200, { 'Cache-Control': cache, 'Content-Type': 'text/plain; charset=utf-8' });
    }

    if (common.format === 'json') {
      return c.json((card.toJSON ? card.toJSON(data, params) : data) as object, 200, { 'Cache-Control': cache });
    }

    const theme = resolveTheme(common.theme, common.colors, { radius: common.radius, font: common.font, hideBorder: common.hideBorder, gradient: common.gradient });
    const svg = card.render(data, params, {
      theme,
      common,
      title: (fallback) => (common.hideTitle ? undefined : common.title ?? fallback),
      t: translator(common.locale)
    });
    return c.body(svg, 200, { ...SVG_HEADERS, 'Cache-Control': cache });
  } catch (e) {
    return errorResponse(c, toApiError(e), query);
  }
});

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Not found. See /api/cards for available endpoints.' } }, 404));

export default app;
