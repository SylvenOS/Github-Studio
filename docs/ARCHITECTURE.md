# Architecture

GitPulse is a single Cloudflare Worker (Hono, TypeScript). There is no build step beyond Wrangler's bundling, and no database apart from one SQLite-backed Durable Object for the view counter.

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
| `src/index.ts` | Hono app, routes, error and cache handling, the `ViewCounter` export |
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
| `test/` | vitest suites; GitHub is mocked in `test/helpers.ts` |
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
