# Architecture

ProfileFoundry is a single Cloudflare Worker (Hono, TypeScript). There is no build step beyond Wrangler's bundling, and no database apart from one SQLite-backed Durable Object for the view counter.

## Tech stack

| Layer | Choice | Why / where |
|---|---|---|
| Language | TypeScript 5 (strict, ES modules) | Whole project, including the browser script, which is plain ES5 inside a template string |
| Runtime | Cloudflare Workers (`compatibility_date` 2026-06-01) | Free plan is enough; no servers to run |
| Web framework | [Hono](https://hono.dev) 4 | Routing, CORS middleware, `app.route()` for the README routes |
| Output | Hand-written SVG, JSON and text | No browser, canvas or chart library; cards are drawn as strings |
| Image handling | `fast-png`, `jpeg-js` | Reading and writing small raster images for ASCII and image cards |
| Data source | GitHub GraphQL (with token), REST, search and public profile pages (without) | `src/github/` |
| Optional providers | Spotify, WakaTime and similar | Allowlisted outbound fetch in `src/providers/` |
| Storage | Edge cache plus a per-isolate memory cache; one SQLite-backed Durable Object | Only the view counter keeps state |
| Abuse protection | Workers Rate Limiting (`RL_IP`, `RL_USER`) | Only consulted on cache misses |
| Tests | Vitest 4, GitHub mocked in `test/helpers.ts` | Includes injection tests that send hostile input into every option of every card |
| Tooling | Wrangler 4 (`dev`, `deploy`), `tsc --noEmit`, pnpm, GitHub Actions (`.github/workflows/ci.yml`: typecheck, tests, Wrangler dry-run bundle) | Requires Node.js 22.12 or newer |
| Dev-only data | `simple-icons` | `scripts/gen-tech-icons.mjs` generates `src/svg/tech-icons.ts` |

Runtime dependencies are deliberately few: `hono`, `fast-png` and `jpeg-js`.

## System overview

```
                 README / browser / AI assistant / script
                                  |
                                  v
                    Cloudflare edge  (cache, rate limits)
                                  |
                        Worker: src/index.ts (Hono)
      +-----------+---------------+----------------+------------------+
      |           |               |                |                  |
 /api/<card>   /api/readme   /, /about,       /api/cards,        /api/views
 (src/cards)   (src/readme)  /llms.txt ...    /themes,           (Durable Object,
      |                      (src/ui,         /definitions,       src/counter.ts)
      |                       src/seo.ts)     /openapi.json
      v
 core/ (params, cache, i18n, errors)  ->  github/ (client, token pool)  ->  GitHub
      |
      v
 svg/ frame + themes/  ->  SVG / JSON / text response
```

## Where things come from

- **Cards** are the single source of truth. `/api/cards`, `/api/openapi.json`, `/llms-full.txt` and the web app's forms are all generated from the card list, so a new card shows up everywhere without extra work.
- **Numbers** are defined once in `src/metrics/definitions.ts` and served at `/api/definitions`.
- **Search and AI files** (`/about`, `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD) are generated in `src/seo.ts` from the same facts, using the host of the request. See [SEO.md](SEO.md).

## Request flow for a card

```
GET /api/<card>?username=...&theme=...
  1. src/index.ts       find the card, rewrite github-readme-stats parameter names (core/compat.ts)
  2. core/cache.ts      build a canonical cache key (only known options, defaults removed, sorted,
                        prefixed by the app version) and look in the edge cache
  3. rate limits        Workers rate limiting, only on cache misses
  4. card.parse         validate and clamp the card's own options (core/params.ts)
  5. card.load          fetch data through the shared client (github/client.ts)
  6. card.render        draw the SVG with frame() (svg/frame.ts) applying theme and style options
  7. response           Cache-Control, X-Cache, Server-Timing; the edge cache stores the result
```

Errors never break a README: the Worker answers with HTTP 200 and an SVG "message card" that says what went wrong and how to fix it. `format=json` returns a JSON error instead.

## Folder map

| Path | What lives there |
|---|---|
| `src/index.ts` | Hono app, routes, security headers, error and cache handling, the `ViewCounter` export |
| `src/seo.ts` | `/about`, `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, `security.txt` and JSON-LD |
| `src/openapi.ts` | Builds the OpenAPI description from the card list |
| `src/playground.ts` | Assembles the web app page served at `/` |
| `src/types.ts` | Worker environment bindings (`AppEnv`) |
| `src/plugins/` | Optional extra data merged into `/api/profile` |
| `src/cards/` | One file per card, plus `index.ts` (registry) and `types.ts` (the card contract) |
| `src/svg/` | `frame.ts` (card shell, title, generic style options), `icons.ts`, `shield.ts`, `trophy.ts`, `tech-icons.ts`, colours |
| `src/themes/` | Colour themes and the `FrameStyle` options |
| `src/core/` | Query parsing and validation, caching, text helpers, i18n, errors, image handling, ASCII rendering |
| `src/github/` | GitHub client (GraphQL with a token, REST and HTML parsing without), token pool, response parsing and types |
| `src/providers/` | Safe outbound `fetch` for Spotify, WakaTime and similar services |
| `src/designs/` | Whole-profile design systems |
| `src/readme/` | README Studio: presets, spec validation, rendering, `/api/readme` routes |
| `src/achievements/` | Trophy rules |
| `src/metrics/` | Definitions of every number (served at `/api/definitions`) |
| `src/ui/` | The web app: `page.ts`, `styles.ts`, `script.ts` |
| `src/counter.ts` | Durable Object behind `/api/views` |
| `test/` | vitest suites (app, security, SEO, README studio, resilience, per-version feature tests); GitHub is mocked in `test/helpers.ts` |
| `assets/` | Logo, favicon and share-image sources (the served copies are embedded in `src/ui/icons.ts`) |
| `scripts/` | `gen-tech-icons.mjs` builds the technology icon set |
| `docs/` | This documentation |
| `.github/workflows/` | CI |
| `wrangler.toml` | Worker config, rate-limit and Durable Object bindings |

## Key ideas

**A card is a contract.** `CardDefinition` (in `src/cards/types.ts`) describes its options, how to parse them, what to load and how to render. Everything else (docs, OpenAPI, the web app's forms and the Store) is generated from that description.

**One frame for every card.** `frame()` applies the shared style options (`card_style`, `shadow`, `tone`, `border_style`, `padding`, `width`, fonts, weights and so on) so cards only draw their own content.

**Two data paths.** With a `GITHUB_TOKEN` the client uses GraphQL for exact data and high rate limits. Without one it falls back to REST, the search API and parsing public profile pages, so the project still works on a fresh deployment. Multiple tokens can be pooled with `GITHUB_TOKENS`.

**Layered caching.** A per-isolate memory cache sits in front of the edge cache. Both serve stale data if GitHub is down. The cache key includes the app version, so a deploy never serves old error cards.

**Safety by construction.** All user text goes through `esc()`. Options are validated to numbers, enums or hex colours before they can reach CSS. Outbound requests only go to allowlisted hosts with a timeout and a size cap. Redirects are refused. Tokens are never logged or returned.

**CSS-only animation.** Animations are plain CSS inside the SVG and are off by default, so they work in `<img>` tags and honour `prefers-reduced-motion`.

**The web app is one page.** `page.ts` returns static HTML, `styles.ts` the CSS and `script.ts` the ES5 browser code as a template string. It reads `/api/cards`, `/api/themes` and `/api/definitions` at runtime, so new cards need no UI work.

## Limits to keep in mind

- Workers allow 50 sub-requests per invocation on the free plan. The client counts them and stops at its budget.
- Workers reject `fetch(..., { redirect: 'error' })`; use `'manual'` and refuse 3xx.
- SVG responses are capped in size (`MAX_SVG_BYTES` in `src/index.ts`).
- The app's Content-Security-Policy blocks web fonts, so the UI uses system fonts.
