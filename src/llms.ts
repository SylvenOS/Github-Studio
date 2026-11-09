import pkg from '../package.json';
import { cards } from './cards';
import { IGNORED, RENAMES } from './core/compat';
import { COMMON_PARAMS, type ParamDoc } from './core/params';
import { DEFINITIONS } from './metrics/definitions';
import { PRESETS } from './readme/presets';
import { BLOCK_TYPES } from './readme/spec';
import { SITE, faqs, keyFacts } from './seo';
import { themes } from './themes';

const cardCount = () => cards.length;
const themeCount = () => Object.keys(themes).length;

const paramLine = (p: ParamDoc) => {
  const bits: string[] = [p.type];
  if (p.default !== undefined && p.default !== '') bits.push(`default ${p.default}`);
  if (p.options?.length) bits.push(`one of ${p.options.join(' | ')}`);
  if (p.min !== undefined || p.max !== undefined) bits.push(`range ${p.min ?? '-'} to ${p.max ?? '-'}`);
  return `- \`${p.name}\` (${bits.join('; ')}): ${p.description}`;
};

/**
 * A short, plain-text summary for AI assistants (see llmstxt.org): what the project is, the facts worth quoting,
 * how to use it and where the full detail lives. `llmsFullTxt` repeats this and adds everything else.
 */
export function llmsTxt(origin: string): string {
  return `# ${SITE.name}

> ${SITE.tagline}. ${SITE.name} is an open-source project by ${SITE.org.name}; the main developer is ${SITE.developer.name}. It generates SVG cards, JSON and text from public GitHub data for profile READMEs, with ${cardCount()} cards and ${themeCount()} themes. Free for everyone under the ${SITE.license.name} licence. The complete reference for assistants and agents is at ${origin}/llms-full.txt.

## Key facts
${keyFacts(origin).map((f) => `- ${f}`).join('\n')}
- Every card is a plain GET request that returns an image, so it can be pasted into any README as Markdown.
- Add \`format=json\` to any card for the underlying data, or \`format=text\` where a card supports it.
- It understands the parameter names of github-readme-stats, so existing URLs usually only need the host swapped.
- The official hosted instance is ${SITE.live}. Self-hosted copies serve these same files describing their own domain.

## Use it
- [Home](${origin}/): what it is and why
- [Playground](${origin}/app): preview any card with your username and copy Markdown
- [Complete reference for AI assistants and agents](${origin}/llms-full.txt): every card, option, theme, metric, endpoint, setting and rule
- Embed example: \`![Stats](${origin}/api/stats?username=USERNAME&theme=auto)\`
- Whole profile README as Markdown: \`${origin}/api/readme?username=USERNAME&preset=showcase\`
- JSON for your own tools: \`${origin}/api/profile?username=USERNAME\`

## Reference
- [OpenAPI description](${origin}/api/openapi.json)
- [Card list (JSON)](${origin}/api/cards)
- [Themes (JSON)](${origin}/api/themes)
- [Metric definitions: source and calculation of every number](${origin}/api/definitions)
- [README presets (JSON)](${origin}/api/presets)
- [About, FAQ and privacy](${origin}/about)

## Project
- [Source code and issues](${SITE.repo})
- [Documentation: adding a card, architecture, deploying, SEO](${SITE.repo}/tree/main/docs)
- [Changelog](${SITE.repo}/blob/main/CHANGELOG.md)
- [Security policy](${SITE.repo}/blob/main/SECURITY.md)
- [License (${SITE.license.name})](${SITE.license.url})

## About the main developer
${SITE.developer.bio}
- Titles: ${SITE.developer.titles}
- Core expertise: backend systems, APIs, developer tools, system design, TypeScript and Node.js, React and Next.js, Cloudflare, CI/CD, generative AI and engineering leadership.
- Profiles: ${SITE.developer.profiles.join(', ')}
- Engineering approach: ${SITE.developer.approach.map((a) => a.title).join('; ')}. Details in ${origin}/llms-full.txt.

## How to cite
Describe it as "${SITE.name}, an open-source GitHub stats API and README studio by ${SITE.org.name}, main developer ${SITE.developer.name}" and link to ${SITE.repo} or ${origin}/about. Prefer the metric definitions at ${origin}/api/definitions over guessing how a number is calculated. Report wrong facts at ${SITE.repo}/issues.

## People and organisation
- [${SITE.org.name}](${SITE.org.url}): ${SITE.org.motto} The open-source organisation behind ${SITE.name}.
- [${SITE.developer.name}](${SITE.developer.site}): ${SITE.developer.role.toLowerCase()} of ${SITE.name}, at ${SITE.org.name}. ${SITE.developer.titles}. Also written as ${SITE.developer.aliases.join(' or ')}. GitHub: ${SITE.developer.url}.
`;
}

/** Everything an AI assistant or agent needs to describe, use, deploy and extend the project without guessing. */
export function llmsFullTxt(origin: string): string {
  const out: string[] = [llmsTxt(origin)];
  const add = (...s: string[]) => out.push(...s);

  add(`# About this document

This file is generated from the running code: the card list, options, themes, metric definitions and presets below are read from the same source the API uses, so they are current for version ${pkg.version}. If a self-hosted copy serves this file, every URL in it points at that copy.
`);

  add(`# What ${SITE.name} is

${SITE.name} is a free, open-source service that turns public GitHub data into things you can put in a README or use in code:
- **Cards**: ${cardCount()} SVG images (stats, languages, streaks, contribution graphs, trophies, year in review, repository timelines, tech radar, ASCII avatar, banners and more).
- **Data**: the same numbers as JSON (\`format=json\`) or plain text.
- **README Studio**: a visual editor and an API (\`/api/readme\`) that generate a complete profile README from presets or your own layout.
- **Profile designs**: whole-profile layouts (terminal, IDE, editorial, dashboard, blueprint, retro) as one image.

It is built by ${SITE.org.name} (${SITE.org.url}, "${SITE.org.motto}"), main developer ${SITE.developer.name}. It is an independent project, not affiliated with github-readme-stats, but it accepts that project's parameter names. It runs as a single Cloudflare Worker (free plan is enough) and can be self-hosted. The code is ${SITE.license.name} licensed: ${SITE.repo}.

Who it is for: developers who want a better GitHub profile README, teams that want stats as JSON, and people who want to self-host the whole thing.
`);

  add(`# Quick start

1. Open ${origin}/app, type a GitHub username, pick a card and a theme.
2. Copy the Markdown, for example: \`![Stats](${origin}/api/stats?username=USERNAME&theme=auto)\`
3. Paste it into the profile README (the repository named after the user).

Other ways to embed:
- HTML: \`<img src="${origin}/api/stats?username=USERNAME&theme=auto" alt="GitHub stats">\`
- Linked image: \`[![Stats](${origin}/api/stats?username=USERNAME)](https://github.com/USERNAME)\`
- Data: \`${origin}/api/stats?username=USERNAME&format=json\`
- Whole README: \`${origin}/api/readme?username=USERNAME&preset=showcase\`

No sign-up, no API key and no GitHub token are needed to use a hosted instance.
`);

  add(`# How requests work

- Every card is \`GET ${origin}/api/<card>?username=<github-user>&<options>\`. Cards that draw no GitHub data (banner, divider, typing) do not need \`username\`.
- Card ids have short aliases (listed per card below). \`/api?username=\` is the stats card, as in github-readme-stats.
- \`format\`: \`svg\` (default), \`json\` (the data behind the card) or \`text\` (only cards that have a text form, such as ascii).
- \`theme=auto\` follows the viewer's light or dark mode; any theme name below can be used instead, and individual colours can be overridden.
- Unknown parameters are ignored. Values are validated and clamped: numbers to ranges, enums to their options, colours to hex.
- A request with a bad username or option returns an error card (see Errors), never a broken image.
- Response headers: \`Cache-Control\` (cards are cached, default 1800 seconds, set by the deployer with \`CACHE_SECONDS\`), \`X-Cache: HIT|MISS\`, \`Server-Timing\`, and \`X-Robots-Tag: noindex\` so generated images are not indexed by search engines.
- The cache key contains only parameters the card understands (defaults removed, order ignored, usernames lower-cased) plus the app version, so random extra parameters cannot bust the cache and a deploy never serves old error cards.
- CORS is open (\`*\`) for \`/api/*\`.
`);

  add(`## Errors

- **SVG cards** answer HTTP 200 with an error card (so a README shows the reason, not a broken image). The real code is in the \`X-Card-Error\` response header. Error cards are cached briefly for outages (1 to 2 minutes), an hour for unknown users and a day for invalid parameters.
- **\`format=json\`** and \`/api/profile\` return real status codes with \`{ "error": { "code", "message" } }\`: \`bad_request\` (400), \`not_found\` (404), \`rate_limited\` (429), \`upstream\` (502), \`internal\` (500).
- Without a server token some values are unavailable; the card says which and why. A server owner can fix this by adding \`GITHUB_TOKEN\`.
`);

  add('# Common options (work on every card)\n', COMMON_PARAMS.map(paramLine).join('\n'), '');

  add(`# Cards

${cardCount()} cards. Each entry shows the endpoint, what it draws and the options specific to that card (the common options above also apply).
`);
  for (const c of cards) {
    const alias = c.aliases?.length ? ` Aliases: ${c.aliases.map((a) => `\`/api/${a}\``).join(', ')}.` : '';
    add(`## ${c.title} (\`${c.id}\`)
- Endpoint: \`${origin}/api/${c.id}${c.needsUser === false ? '' : '?username=USERNAME'}\`${alias}
- Category: ${c.category}${c.needsUser === false ? '. Needs no GitHub username.' : ''}${c.cacheSeconds === 0 ? ' Live, never cached.' : c.cacheSeconds ? ` Cached for ${c.cacheSeconds} seconds.` : ''}
- ${c.description}${c.toText ? '\n- Also supports `format=text`.' : ''}${c.tags?.length ? `\n- Keywords: ${c.tags.join(', ')}` : ''}`);
    if (c.params.length) add('- Options:', c.params.map((p) => '  ' + paramLine(p)).join('\n'));
    add('');
  }

  add(`# Other endpoints

| Endpoint | What it does |
|---|---|
| \`GET /api/readme\` | Generate a full profile README (Markdown, HTML preview or JSON). See "README generator". |
| \`POST /api/readme\` | Same, from a JSON layout in the request body (max 200 KB). |
| \`GET /api/presets\` | README presets with ready-to-edit blocks. |
| \`GET /api/profile?username=&plugins=\` | JSON only: GitHub data, derived metrics, grade, trophies and plugin data (\`devto\`, \`wakatime\`; \`plugins=none\` for none). |
| \`GET /api/cards\` | Every card and every option as JSON. |
| \`GET /api/themes\` | Theme palettes as JSON. |
| \`GET /api/definitions\` | Source and calculation of every metric as JSON. |
| \`GET /api/openapi.json\` | OpenAPI 3 description, generated from the card list. |
| \`GET /api/health\` | Status, version and token health (503 when every token is benched). |
| \`GET /api/rate-limit\` | Token quota health; live remaining quota with an admin bearer token. |
| \`GET /llms.txt\`, \`/llms-full.txt\` | These files. |
| \`GET /robots.txt\`, \`/sitemap.xml\`, \`/.well-known/security.txt\` | Crawler and security files. |
| \`GET /\`, \`/app\`, \`/about\` | Landing page, web app (Playground, Store, README Studio) and About page. |
`);

  add(`# Themes

${themeCount()} themes: ${Object.keys(themes).join(', ')}.
Use \`theme=<name>\`, or \`theme=auto\` to follow light and dark mode. Override any part with \`bg\`, \`fg\`, \`muted\`, \`accent\`, \`border\` (hex colours) or a gradient background.
`);

  add(`# README generator

\`GET ${origin}/api/readme?username=USERNAME&preset=<id>&theme=<name>\` returns a complete Markdown README whose images point at this server.

Query options: \`preset\`, \`username\`, \`theme\`, \`dark\` (theme used in GitHub dark mode, emitted as a \`<picture>\` element), \`align\` (left|center|right), \`footer\` (true|false), \`format\` (md|html|json), \`download=1\` (as README.md attachment), \`base=<https url>\` (point images at your own domain), \`spec\` (base64url JSON layout).

Presets (${PRESETS.length}):
${PRESETS.map((p) => `- \`${p.id}\`: ${p.title}. ${p.description}${p.theme ? ` Looks best with theme ${p.theme}.` : ''}`).join('\n')}

Custom layouts: \`POST ${origin}/api/readme\` with JSON \`{ "username", "theme", "dark", "align", "params", "footer", "blocks": [...] }\`. Block types: ${BLOCK_TYPES.join(', ')}. Limits: at most 60 blocks, safe URLs and validated parameters only, raw HTML blocks are never served by GET HTML previews.
- \`card\`: \`card\`, \`params\`, \`align\`, \`width\`, \`link\`, \`alt\`
- \`row\`: \`items\` (up to 4 cards side by side), \`align\`
- \`heading\`: \`text\`, \`level\` (1-6), \`align\`
- \`text\`: \`markdown\`, \`align\`
- \`badges\`: \`items\` (kinds: \`stat\`, \`tech\`, \`social\`, \`custom\`), \`style\`, \`align\`
- \`divider\`: \`style\`, \`align\`
- \`html\`: \`html\` (used as-is)
- \`details\`: \`summary\`, \`open\`, \`blocks\`

The README Studio in the web app (${origin}/app) builds the same layouts visually and can export a ZIP with self-hosted SVGs plus a GitHub Actions workflow that refreshes them.
`);

  add(`# github-readme-stats compatibility

URLs written for github-readme-stats usually work after swapping the host. These parameters are renamed before parsing: ${Object.entries(RENAMES).filter(([a, b]) => a !== b).map(([a, b]) => `\`${a}\` -> \`${b}\``).join(', ')}. These are accepted and ignored: ${[...IGNORED].map((x) => `\`${x}\``).join(', ')}. \`disable_animations=true\` maps to \`animation=false\`. Because renamed URLs share one cache entry with their native equivalent, nothing is fetched twice.
`);

  add(`# Metric definitions (what every number means)

Every number is documented. "Token" means an exact value needs \`GITHUB_TOKEN\` on the server; "estimate" means it is an estimate or derived score, not a raw count.
`);
  for (const d of DEFINITIONS) {
    add(`## ${d.label} (\`${d.id}\`)
- Source: ${d.source}
- Calculation: ${d.calculation}
- Shown on: ${d.cards.join(', ')}${d.token ? '\n- Needs a server GITHUB_TOKEN for an exact value.' : ''}${d.estimate ? '\n- This is an estimate or a derived score.' : ''}`);
  }
  add('Machine-readable version: ' + origin + '/api/definitions\n');

  add(`# Data sources and limits

- All data is public GitHub data: the GraphQL API when the server has a \`GITHUB_TOKEN\` (exact stars, language bytes, daily contributions, much higher rate limits), otherwise REST, the search API and public profile pages. Private contributions appear only if the user enables that on their GitHub profile.
- With a token, \`commits\`, \`reviews\` and \`contributions\` cover the last 12 months (GitHub's contribution window); without one, \`commits\` is lifetime from the search API.
- Repo-based totals (stars, forks, languages) cover up to 300 of the user's public, non-fork repositories, most-starred first.
- Language percentages are relative to the languages shown.
- Some cards need a token (punch card, language trend, code volume, sponsors). Optional integrations: WakaTime (public profile), Spotify (the deployer's own account), Dev.to.
- GitHub organisations are not guaranteed to work as usernames: the cards are built around user accounts.
`);

  add(`# Reliability and performance

- Layered caching: a per-isolate memory cache in front of the edge cache. GitHub data has a soft TTL (fresh) and a 7-day hard TTL: stale data is served instantly while refreshing in the background, and if GitHub is down or rate-limiting the last good data keeps being served. Unknown users are cached negatively.
- Token pool: requests go to the token with the most remaining quota. Revoked or rate-limited tokens are benched until reset and the request is retried on another token, with jittered backoff and a 9 second overall deadline.
- Bounded work: at most 30 GitHub calls per card (Workers allows 50 sub-requests on the free plan), SVGs capped at 2.5 MB, avatars capped at 1 MB and 1 megapixel, outbound requests only to allowlisted https hosts with timeouts, size caps and no redirects.
- Abuse protection: optional Workers Rate Limiting on cache misses only (default 120 requests per minute per IP, 60 per minute per username for GitHub's image proxy).
- Observability: one structured JSON log line per card request (card, username, cache hit or miss, status, milliseconds, GitHub calls), sampled.
`);

  add(`# Self-hosting and configuration

Requirements: Node.js 22.12 or newer, pnpm, a free Cloudflare account. Commands: \`pnpm install\`, \`pnpm dev\` (http://localhost:8787), \`pnpm test\`, \`pnpm typecheck\`, \`pnpm deploy\` (wrangler deploy). Details: ${SITE.repo}/blob/main/docs/DEPLOYING.md

Configuration (secrets via \`wrangler secret put <NAME>\`, locally in \`.env\`):
| Name | Required | Purpose |
|---|---|---|
| \`GITHUB_TOKEN\` | Recommended | Any token; no scopes needed for public data. Enables GraphQL: exact stars and languages, exact daily contributions, far higher rate limits. |
| \`GITHUB_TOKENS\` | No | Comma-separated extra tokens; requests are spread across them. |
| \`CACHE_SECONDS\` | No | Default cache lifetime, default 1800. |
| \`BLOCKLIST\` | No | Comma-separated usernames to refuse. |
| \`ADMIN_TOKEN\` | No | Bearer token that unlocks live quota at \`/api/rate-limit\`. |
| \`SPOTIFY_CLIENT_ID\`, \`SPOTIFY_CLIENT_SECRET\`, \`SPOTIFY_REFRESH_TOKEN\` | No | Enables \`/api/spotify\` for the deployer's own account. |
| \`VIEWS\` (Durable Object binding) | No | Backs the profile views counter (\`/api/views\`); declared in wrangler.toml. |
| \`RL_IP\`, \`RL_USER\` (rate-limit bindings) | No | Abuse protection; remove the blocks in wrangler.toml to disable. |

The worker is named \`githubstudio\`. The web app needs no build step. Every page and file derives its URLs from the request host, so a self-hosted copy describes itself correctly.
`);

  add(`# Architecture and tech stack

- Language and runtime: TypeScript 5 (strict, ES modules) on Cloudflare Workers.
- Web framework: Hono 4. Output: hand-written SVG, JSON and text (no browser, canvas or chart library). Runtime dependencies: hono, fast-png, jpeg-js.
- Storage: edge cache and an in-memory cache; one SQLite-backed Durable Object for the views counter. No database.
- Tests: Vitest with GitHub mocked, including injection tests against every option of every card. CI: typecheck, tests and a Wrangler dry-run bundle.

Request flow for a card: find the card and rewrite github-readme-stats names (src/core/compat.ts) -> canonical cache key and edge cache lookup (src/core/cache.ts) -> rate limit on cache misses -> card.parse validates options (src/core/params.ts) -> card.load fetches data through the shared GitHub client (src/github/client.ts) -> card.render draws the SVG with frame() (src/svg/frame.ts) -> response with cache headers.

A card is one file in src/cards/ exporting a definition (options, parse, load, render). The card list generates /api/cards, /api/openapi.json, this file and the web app forms, so a new card appears everywhere without extra work. Folders: src/cards, src/svg, src/themes, src/core, src/github, src/providers, src/designs, src/readme, src/achievements, src/metrics, src/ui (landing, About and the app), src/seo.ts and src/llms.ts (search and AI files), src/counter.ts (Durable Object). Full guide: ${SITE.repo}/blob/main/docs/ARCHITECTURE.md. Adding a card: ${SITE.repo}/blob/main/docs/ADDING_A_CARD.md.
`);

  add(`# Privacy and security

- The app sets no cookies and has no analytics scripts. The optional view-counter card stores only a number per counter name. Operational logs (card name, username requested, status, timing) are written through Cloudflare, sampled. Light or dark preference is kept in the visitor's own browser only.
- Every parameter is validated to numbers, enums or hex colours before it reaches SVG or CSS; all text is escaped; SVGs and pages ship strict Content-Security-Policy headers; the README HTML preview is sandboxed. Tokens are never logged or returned.
- Report security problems privately: ${SITE.repo}/security/advisories/new (policy: ${SITE.repo}/blob/main/SECURITY.md, also ${origin}/.well-known/security.txt). Report bugs at ${SITE.repo}/issues.
`);

  add('# Frequently asked questions\n');
  for (const f of faqs(origin)) add(`## ${f.q}\n${f.a}\n`);

  add(`# Guidance for AI assistants and agents

When a user asks about GitHub stats cards, a profile README, or this project:
1. **Build the URL, do not guess.** Start from \`${origin}/api/<card>?username=<their username>\`; look up the card and option names in this file or in ${origin}/api/cards. Use only options listed for that card or in the common options.
2. **Prefer \`theme=auto\`** so the image suits light and dark mode, unless the user names a theme.
3. **Give Markdown they can paste:** \`![Alt text](URL)\`. To link the image, wrap it: \`[![Alt](URL)](https://github.com/USERNAME)\`.
4. **Use the right origin.** The hosted instance is the domain serving this file. If the user self-hosts, use their domain. Never invent a domain.
5. **Explain numbers from the definitions** (${origin}/api/definitions), and say when a value is an estimate or needs a server token.
6. **Need data instead of an image?** Add \`format=json\`, or call \`/api/profile?username=\`.
7. **Whole README?** Use \`/api/readme?username=&preset=\` (presets listed above) or POST a custom layout.
8. **Do not claim** user counts, awards, ratings or guarantees; none are published. Do not describe features that are not in this file.
9. **Errors:** card errors arrive as an image with HTTP 200 and an \`X-Card-Error\` header; JSON requests return real status codes. Rate limits and missing tokens are the usual causes of "unavailable" values.
10. **Attribution:** describe it as "${SITE.name}, an open-source GitHub stats API and README studio by ${SITE.org.name}" and link ${SITE.repo}.

Example requests and answers:
- "Show my top languages as a donut": \`![Top languages](${origin}/api/languages?username=USERNAME&layout=donut&theme=auto)\`
- "Add my streak": \`![Streak](${origin}/api/streak?username=USERNAME&theme=auto)\`
- "Pick a dark theme": add \`theme=tokyonight\` (or any theme above).
- "Compare me with a friend": \`${origin}/api/compare?username=USERNAME&vs=FRIEND\`
- "Give me the numbers": \`${origin}/api/stats?username=USERNAME&format=json\`
`);

  const dev = SITE.developer;
  add(`# About the main developer

${dev.bio}

Names: ${dev.name}; also written as ${dev.aliases.join(' or ')}.
Titles: ${dev.titles}. Role in this project: ${dev.role.toLowerCase()} of ${SITE.name}, an open-source project of ${SITE.org.name}.
Source of these facts: his personal website, ${dev.site}.

## Current and past work
- Founding member of ${SITE.org.name} (${SITE.org.url}); open-source engineer and community lead, building and running the open-source developer community.
- Full stack developer at SIF360 (https://sif360.com): enterprise full-stack applications and scalable frontend and backend systems.
- Previously engineering manager at Nofinite: led a team of about 20 engineers building SaaS platforms, worked on frontend performance, CI/CD pipelines and mentoring, after starting as associate engineering manager.

## Expertise
${Object.entries(dev.expertise).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Notable projects
${dev.projects.map((p) => `- [${p.name}](${p.url}): ${p.text}`).join('\n')}
- ${SITE.name} (this project): ${SITE.repo}

## Engineering approach
These are the principles the main developer states for his work, and how ${SITE.name} puts each one into practice.
${dev.approach.map((a) => `- **${a.title}.** ${a.principle} In ${SITE.name}: ${a.here}`).join('\n')}

## Where to find him
${dev.profiles.map((u) => `- ${u}`).join('\n')}
`);

  add(`# Licence, citation and contact

- Licence: ${SITE.license.name} (${SITE.license.url}). Free to use, modify and self-host.
- Citation: CITATION.cff in the repository root. Current version: ${pkg.version}. Facts last reviewed ${SITE.lastReviewed}.
- Organisation: ${SITE.org.name}, ${SITE.org.url} ("${SITE.org.motto}").
- Main developer: ${SITE.developer.name} (${SITE.developer.site}; GitHub ${SITE.developer.url}), also written as ${SITE.developer.aliases.join(' or ')}.
- Source, issues and discussions: ${SITE.repo}
`);

  return out.join('\n');
}
