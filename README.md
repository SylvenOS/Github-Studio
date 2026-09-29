# GitPulse

An all-in-one, customisable **GitHub stats API**. It renders crisp SVG cards for READMEs and profiles (stats, profile, ASCII avatar, languages, streaks, heatmap, trophies, activity charts, badges, repo pins) and exposes the same data as JSON. It runs on Cloudflare Workers and is built to be extended: a new card is one file.

```md
![Stats](https://your-worker.workers.dev/api/stats?username=torvalds&theme=auto)
![Languages](https://your-worker.workers.dev/api/languages?username=torvalds&layout=donut)
![Streak](https://your-worker.workers.dev/api/streak?username=torvalds&theme=dracula)
```

Open `/` on your deployment for the web app. It is generated from the API, so new cards, options, themes and presets show up automatically:

- **Playground** - pick a card, tweak every option with live preview, copy Markdown/HTML/URL.
- **Store** - browse every card in every ready-made style (54+), search and filter by category, then *Customize* or add it straight to your README.
- **README Builder** - assemble a whole profile README: start from a preset, then add, reorder (drag or ▲▼), edit and remove blocks. Live preview, editable Markdown, download `README.md`, share link, and **Reset** to go back to the preset.

---

## Quick start

```bash
pnpm install
pnpm dev            # http://localhost:8787
pnpm test           # unit + integration tests (GitHub is mocked)
pnpm typecheck
pnpm deploy         # wrangler deploy
```

### Configuration

Locally, put secrets in `.env` (gitignored; copy `.env.example`). In production use `wrangler secret put <NAME>`.

| Name | Required | Purpose |
|------|----------|---------|
| `GITHUB_TOKEN` | **Recommended** | Any token; no scopes needed for public data. Enables the GraphQL path: real star and language totals, exact daily contributions, and a much higher rate limit. |
| `GITHUB_TOKENS` | No | Comma-separated extra tokens. Requests are spread across all tokens to multiply rate limits. |
| `CACHE_SECONDS` | No | Default cache lifetime (default `1800`). |
| `BLOCKLIST` | No | Comma-separated usernames to refuse. |

Without a token the API still works through a REST and HTML fallback, but it is slower and less accurate, and it hits GitHub's 60 requests/hour unauthenticated limit quickly. `GET /api/health` reports whether a token is configured.

---

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/stats` | Repos, stars, forks, followers, contributions, PRs, issues, reviews (choose which with `hide`/`show`). |
| `/api/profile-card` (`card`, `bio`) | Avatar, bio, key numbers, language bar and an overall grade (S to C) ring. |
| `/api/ascii` (`avatar`) | Your profile picture drawn from characters, optionally animated. `format=text` returns paste-ready plain text. |
| `/api/compare` (`vs`) | Two users head to head (stars, followers, commits, ...). Needs `vs`. |
| `/api/banner` (`header`) | Header banner with your own text: waves, gradient, grid or terminal. No GitHub data needed. |
| `/api/divider` (`separator`) | Themed section separator: wave, dots, line, gradient, dashed, stars. |
| `/api/activity` (`chart`) | Contributions per month, week or weekday as bars, area or line. |
| `/api/badge` (`shield`) | Compact shields-style badge for one number (stars, followers, rank, ...). |
| `/api/languages` (`langs`) | Top languages by bytes of code, as a bar or donut. |
| `/api/streak` | Total contributions, current and longest streak with date ranges (scans up to 15 years). |
| `/api/contributions` (`heatmap`) | Contribution heatmap with real per-day counts. Last 12 months or any calendar year. |
| `/api/top-repos` | Best repositories by stars, forks or recent activity. |
| `/api/repos` (`repo`, `pin`) | Single repository card. Needs `repo`. |
| `/api/radar` | Radar chart of your language mix. |
| `/api/achievements` (`trophies`) | Trophy artwork that levels up from a wooden cup (E) to a winged crown (SSS+), with progress to the next rank. |
| `/api/readme` | **Generates a full profile README** (see below). `GET` with a preset or `spec`, or `POST` a JSON layout. |
| `/api/presets` | README presets with ready-to-edit blocks. |
| `/api/profile` | JSON only: GitHub data, derived metrics, trophies and plugin data (Dev.to, WakaTime). Pick plugins with `plugins=devto,wakatime` or `plugins=none`. |
| `/api/cards` | Machine-readable list of cards and every parameter. |
| `/api/themes` | Theme palettes. |
| `/api/openapi.json` | OpenAPI 3 spec generated from the card registry. |
| `/api/rate-limit` | Remaining GitHub quota per configured token (labels only). |
| `/api/health` | Status and version. |

Every card also supports `format=json` to get the underlying data instead of an image.

### Common parameters (all cards)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `username` | required | GitHub username. |
| `theme` | `default` | `default`, `dark`, `github_dark`, `sylven`, `dracula`, `monokai`, `radical`, `tokyonight`, `cyberpunk`, `neon`, `nord`, `gruvbox`, `solarized`, `catppuccin`, `matrix`, `ocean`, `rose_pine`, `synthwave`, `ayu_light`, `paper`, or **`auto`**. `auto` follows the viewer's light/dark preference. |
| `bg` `fg` `muted` `accent` `border` | theme | Colour overrides as hex without `#` (3, 4, 6 or 8 digits). Invalid values are ignored. `bg` also takes a gradient: `bg=135,0f2027,2c5364`. |
| `locale` | `en` | Labels and titles in `en es fr de pt zh ja ru`. |
| `radius` | theme | Corner radius, 0 to 40. |
| `font` | theme | Font family. |
| `title` | per card | Custom title. |
| `hide_title` / `hide_border` | `false` | Hide the header or border. |
| `animation` | `false` | Turn on animations: fade-ins, ASCII effects and the 3D spin. Off by default; add `animation=true`. Respects `prefers-reduced-motion`. |
| `format` | `svg` | `svg`, `json`, or `text` (ascii card only). |
| `cache_seconds` | `1800` | Browser and CDN cache lifetime, 1800 to 86400. |

### Card parameters

| Card | Parameters |
|------|------------|
| stats | `layout` (`grid`, `compact`, `minimal`), `show_icons`, `hide`, `show`, `compact_numbers`, `footer`. Stat keys: `repos stars forks followers following gists commits contributions prs issues reviews age`. |
| languages | `layout` (`bar`, `donut`), `langs_count` (1–10), `hide`, `by` (`size`, `repos`) |
| radar | `langs_count` (3–8), `hide` |
| streak | `years` (1–15) |
| contributions | `year`, `months` |
| top-repos | `limit` (1–10), `sort` (`stars`, `forks`, `updated`), `exclude`, `skip_archived` |
| repos | `repo` (name, or `auto` = your most-starred repository, the default), `show_owner` |
| achievements | `style` (`trophy`, `badge`), `columns` (1–6), `sort` (`default`, `rank`), `min_rank` (`E`..`SSS+`), `progress`, `hide` (`commits prs contributions repos stars followers issues reviews years`) |
| ascii | `shape` (`flat`, `sphere`, `cylinder`, `coin`), `charset` (`classic dense blocks binary hex alnum text`), `text`, `mode` (`mono`, `color`), `anim` (`scan reveal type wave flicker pulse none`), `speed`, `frames`, `cutout`, `cols` (20–110), `cell`, `contrast`, `invert`, `caption`, `source` (`avatar`, `identicon`) |
| profile-card | `avatar`, `languages` |
| compare | `vs` (required), `metrics` (`repos stars forks followers following gists commits contributions prs issues reviews age`) |
| banner | `text`, `subtitle`, `style` (`wave gradient grid terminal`), `height`, `size`, `align`, `border` |
| divider | `style` (`wave dots line gradient dashed stars`), `height` |
| activity | `by` (`month`, `week`, `weekday`), `style` (`bar`, `area`, `line`), `year` |
| badge | `stat` (`stars followers following repos forks commits prs issues reviews contributions gists years rank top_language`), `label`, `style` (`flat`, `pill`, `for-the-badge`), `color`, `label_color` |

### Errors

- **SVG cards** return an SVG error card with HTTP 200, so READMEs show the reason instead of a broken image. The real error code is in the `X-Card-Error` header. Error cards are cached for 60 seconds.
- **`format=json`** and `/api/profile` return real status codes and `{ "error": { "code", "message" } }`. Codes: `bad_request` (400), `not_found` (404), `rate_limited` (429), `upstream` (502).

---

## README generator

Generate a complete profile `README.md` for any account, then change and place anything you like.

```bash
# a ready-made layout
curl "https://your-worker.workers.dev/api/readme?username=torvalds&preset=showcase&theme=tokyonight" > README.md

# same, as an attachment / with GitHub dark-mode variants / images served from your own domain
.../api/readme?username=torvalds&download=1
.../api/readme?username=torvalds&theme=default&dark=github_dark
.../api/readme?username=torvalds&base=https://stats.example.com
```

**Presets:** `classic`, `minimal`, `showcase`, `hacker`, `dashboard`, `badges`, `ascii`. `GET /api/presets` lists them with their blocks so you can use one as a starting point.

**Fully custom:** describe the layout as JSON and `POST` it to `/api/readme` (or pass it base64url-encoded in `?spec=`). Every card block takes any card plus any of that card's options, so anything you can do in the playground you can put in a README.

```json
{
  "username": "torvalds",
  "theme": "tokyonight",
  "dark": "github_dark",
  "align": "center",
  "params": { "locale": "en", "radius": "12" },
  "blocks": [
    { "type": "card", "card": "banner", "params": { "style": "wave", "text": "Hi, I'm Linus" } },
    { "type": "heading", "text": "About me", "level": 2, "align": "left" },
    { "type": "text", "markdown": "I **build** things. [Say hi](https://example.com)", "align": "center" },
    { "type": "badges", "style": "for-the-badge", "items": [
        { "kind": "tech", "name": "TypeScript" },
        { "kind": "social", "name": "twitter", "handle": "linus" },
        { "kind": "stat", "name": "stars" } ] },
    { "type": "row", "items": [
        { "type": "card", "card": "stats", "params": { "show_icons": "true" } },
        { "type": "card", "card": "languages", "params": { "layout": "donut" } } ] },
    { "type": "card", "card": "streak", "link": "https://github.com/torvalds", "width": 480 },
    { "type": "divider", "style": "dots" },
    { "type": "details", "summary": "More", "blocks": [ { "type": "card", "card": "achievements" } ] },
    { "type": "html", "html": "<p align=\"center\">anything you like</p>" }
  ]
}
```

| Block | Fields |
|-------|--------|
| `card` | `card`, `params`, `align`, `width`, `link`, `alt` |
| `row` | `items` (up to 4 cards, shrunk to sit side by side), `align` |
| `heading` | `text`, `level` (1-6), `align` |
| `text` | `markdown`, `align` |
| `badges` | `items`, `style`, `align`. Item kinds: `stat` (a number from GitPulse), `tech` (any technology), `social` (github, twitter, x, linkedin, youtube, instagram, twitch, discord, mastodon, bluesky, devto, medium, hashnode, stackoverflow, reddit, telegram, npm, kaggle, leetcode, codepen, kofi, sponsor, website, email), `custom` |
| `divider` | `style`, `align` |
| `html` | `html` (used as-is) |
| `details` | `summary`, `open`, `blocks` (collapsible section) |

Top-level fields: `username`, `theme`, `dark` (theme for GitHub dark mode, emitted as `<picture>`), `align`, `params` (applied to every card), `footer`. Input is validated and bounded (max 60 blocks, safe URLs and parameters only); errors come back as `{ "error": { "code", "message" } }`. `format=json` returns `{ spec, markdown, html }`, `format=html` a sandboxed preview.

---

## Gallery

Replace `your-worker.workers.dev` with your deployment and `torvalds` with any username.

### Stats
```md
![Stats](https://your-worker.workers.dev/api/stats?username=torvalds&show_icons=true&theme=dracula)
![Compact](https://your-worker.workers.dev/api/stats?username=torvalds&layout=compact&theme=tokyonight)
![Custom stats](https://your-worker.workers.dev/api/stats?username=torvalds&hide=forks,issues&show=commits,following&compact_numbers=true)
```

### Top languages
```md
![Languages](https://your-worker.workers.dev/api/languages?username=torvalds&theme=github_dark)
![Donut](https://your-worker.workers.dev/api/languages?username=torvalds&layout=donut&langs_count=6&hide=HTML,CSS)
```

### Streak
```md
![Streak](https://your-worker.workers.dev/api/streak?username=torvalds&theme=radical)
```

### Contribution heatmap
```md
![Heatmap](https://your-worker.workers.dev/api/contributions?username=torvalds&theme=auto)
![2024 only](https://your-worker.workers.dev/api/contributions?username=torvalds&year=2024)
```

### Top repositories
```md
![Top repos](https://your-worker.workers.dev/api/top-repos?username=torvalds&limit=5&theme=catppuccin)
![Most forked](https://your-worker.workers.dev/api/top-repos?username=torvalds&sort=forks&exclude=dotfiles&skip_archived=true)
```

### Repository pin
```md
![Repo](https://your-worker.workers.dev/api/repos?username=torvalds&repo=linux&theme=monokai)
```

### Tech stack radar
```md
![Radar](https://your-worker.workers.dev/api/radar?username=torvalds&langs_count=6&theme=nord)
```

### ASCII avatar
```md
![ASCII](https://your-worker.workers.dev/api/ascii?username=torvalds&theme=matrix&charset=alnum&anim=scan&animation=true)
![Your own text](https://your-worker.workers.dev/api/ascii?username=torvalds&charset=text&text=HELLO&mode=color&anim=reveal&animation=true)
```
**3D:** `shape=sphere|cylinder|coin` wraps your avatar around a spinning globe or cylinder, or flips it like a coin. SVG has no real 3D, so the server renders one frame per angle (`frames`, default 20) and plays them back with CSS (`speed` = seconds per turn). Without `animation=true` (the default) you get a still front view.
```md
![Globe](https://your-worker.workers.dev/api/ascii?username=torvalds&shape=sphere&theme=matrix&charset=dense&animation=true)
![Coin](https://your-worker.workers.dev/api/ascii?username=torvalds&shape=coin&theme=github_dark&speed=6&animation=true)
```
For a crisp portrait the server removes a plain photo background (`cutout=false` to keep it), zooms in a little, equalises the histogram and boosts local contrast. On a globe the bare surface is drawn as a latitude/longitude grid so the spin is visible. 3D output is large (about 100-200 KB); `mode=color` caps `frames` at 16.

Paste-ready plain text for a README code block: `/api/ascii?username=torvalds&format=text&charset=dense`

### Profile card, activity and badges
```md
![Profile](https://your-worker.workers.dev/api/profile-card?username=torvalds&theme=tokyonight)
![Activity](https://your-worker.workers.dev/api/activity?username=torvalds&style=area&theme=ocean)
![Stars](https://your-worker.workers.dev/api/badge?username=torvalds&stat=stars)
![Rank](https://your-worker.workers.dev/api/badge?username=torvalds&stat=rank&style=for-the-badge&color=6d28d9)
```

### Achievements
```md
![Trophies](https://your-worker.workers.dev/api/achievements?username=torvalds&theme=dark&columns=3)
![Fewer](https://your-worker.workers.dev/api/achievements?username=torvalds&hide=years,issues&columns=4)
```

### JSON
```text
GET /api/profile?username=torvalds&plugins=none
GET /api/stats?username=torvalds&format=json
GET /api/cards
GET /api/themes
```

### Side by side
```md
<p align="center">
  <img src="https://your-worker.workers.dev/api/stats?username=torvalds&theme=auto" height="180"/>
  <img src="https://your-worker.workers.dev/api/languages?username=torvalds&theme=auto" height="180"/>
</p>
```

Tip: `theme=auto` follows the viewer's light or dark preference.

---

## How it works

```text
request ─► response cache (edge) ─► card registry ─► parse params ─► load ─► render ─► SVG / JSON
                                                         │
                                          GitHubClient (GraphQL, or REST + HTML fallback)
                                                         │
                                        data cache (edge + memory, coalesced in-flight)
```

- **Two-tier caching.** Rendered responses are cached at the edge, and upstream GitHub data is cached separately. Ten cards with ten themes for the same user cost one GitHub query. Concurrent misses are coalesced.
- **Themes are CSS variables.** The colour overrides, `theme=auto` dark mode and 3-digit hex all work without string-building colours into markup, and the heatmap stays small.
- **Everything untrusted is escaped** (names, descriptions, languages) and every parameter is validated. Cards are served with a locked-down CSP.

```text
src/
  index.ts        routes, error handling, caching headers
  cards/          one file per card + registry (index.ts) + contract (types.ts)
  github/         client (GraphQL/REST), parsers, shared types
  metrics/        derived stats (profile metrics, streaks)
  achievements/   trophy definitions and ranking
  themes/         palettes + resolveTheme (overrides, auto)
  svg/            frame (shared chrome), icons, language colours
  plugins/        third-party providers for /api/profile
  core/           params/validation, cache, errors, text helpers
  playground.ts   the UI served at /
```

---

## Extending

**New card.** Create `src/cards/my-card.ts`:

```ts
export const myCard = defineCard<Params, Data>({
  id: 'my-card',
  category: 'overview',                       // grouping in the Store
  tags: ['numbers'],                         // extra Store search keywords
  variants: [{ label: 'Default' }, { label: 'Compact', params: { limit: '3' } }], // ready-made styles
  title: 'My Card',
  description: 'What it shows.',
  params: [{ name: 'limit', type: 'number', default: 5, min: 1, max: 10, description: 'How many' }],
  parse: (q) => ({ limit: int(q.limit, 5, 1, 10) }),
  load: async (client, params, common) => (await client.getUser(common.username)).repos,
  render: (data, params, { theme, common, title }) =>
    frame(/* svg */, { width: 400, height: 120, theme, title: title('My Card') })
});
```

Add it to the array in `src/cards/index.ts`. That's all: the route, `format=json`, caching, error cards, `/api/cards` docs, the playground, the Store (with each variant as its own tile) and the README builder pick it up. Set `needsUser: false` for decorative cards that don't need a GitHub username.

**New README preset.** Add an entry to `readme/presets.ts`; it appears in the builder and at `/api/readme?preset=`. **New social network** - add it to `SOCIALS` in `readme/badges.ts`.

**New stat / trophy / theme / plugin.** Add an entry to `STATS` in `cards/stats.ts`, to `TROPHIES` in `achievements/engine.ts`, to `themes/index.ts`, or to `plugins/index.ts`. Each is a single table entry.

**New GitHub data.** Extend the GraphQL query and `UserData` in `github/`.

---

## Known limits

- With a token, `commits`, `reviews` and `contributions` cover the **last 12 months** (GitHub's contribution window). Without one, `commits` is lifetime (search API). The Commit Machine trophy is ranked on whichever applies.
- Repo-based totals (stars, forks, languages) cover up to 300 of the user's public, non-fork repositories, most-starred first. Private contributions appear only if the user enables them on their profile.
- Language percentages are relative to the languages shown.

---

## Roadmap

- [x] GraphQL client with REST fallback, token pool, two-tier cache
- [x] Card registry, `format=json`, live playground, `theme=auto`
- [x] Stats, languages (bar/donut), streak, heatmap, top repos, repo pin, radar, trophies
- [x] Trophy artwork by rank, ASCII avatar (animated, plain text), profile card, activity chart, badges
- [x] Locales, gradient backgrounds, OpenAPI spec, rate-limit endpoint
- [x] Store with style variants, README generator and visual builder, banner/divider/compare cards
- [ ] Request analytics, profile view counter
- [ ] Contribution timeline and repository-health cards
- [ ] PNG output, theme editor and gallery
- [ ] Plugin cards (WakaTime, Dev.to) rendered as SVG

*Built for the open-source community.*
