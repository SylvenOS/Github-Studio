<p align="center"><img src="assets/logo.svg" alt="ProfileFoundry logo" width="112"></p>

# ProfileFoundry

An all-in-one, customisable **GitHub stats API and profile design studio**. It renders crisp SVG cards for READMEs and profiles - whole-profile designs (terminal, code editor, editorial, dashboard, blueprint, retro arcade), year in review, monthly trends, a commit punch card, star history, repository comparison and health, language trends, WakaTime, Spotify, a views counter, realistic impact stats, work patterns, pinned repos, a 3D contribution skyline, tech-stack icon grids, typing headers, composites, stats, languages, streaks, heatmaps (with a snake), trophies, ASCII avatars and more - and exposes the same data as JSON. It runs on Cloudflare Workers, is built to survive heavy traffic and GitHub outages, and is built to be extended: a new card is one file.

**Coming from github-readme-stats?** That project is no longer maintained. Swap the host in your existing URLs (`/api?username=`, `/api/top-langs`, `/api/pin`) - its parameter names (`bg_color`, `text_color`, `border_radius`, `custom_title`, `card_width`, `hide_rank`, `exclude_repo`, `disable_animations`...) and favourite themes (`onedark`, `transparent`, `highcontrast`) are understood.

```md
![Stats](https://your-worker.workers.dev/api/stats?username=torvalds&theme=auto)
![Languages](https://your-worker.workers.dev/api/languages?username=torvalds&layout=donut)
![Streak](https://your-worker.workers.dev/api/streak?username=torvalds&theme=dracula)
```

Open `/` on your deployment for the web app. It is generated from the API, so new cards, options, themes and presets show up automatically:

- **Playground** - a three-pane workbench: pick one of 35 cards on the left (search or browse by category), see it live in the middle, and tune it on the right. Each card offers one-click **Looks**, then searchable options grouped into Look, Content and Details. Copy Markdown, HTML or the URL from the preview.
- **Store** - browse every card in every ready-made style (90+), search and filter by category, then *Customize* or add it straight to your README.
- **README Studio** - assemble a whole profile README. Pick a **design system** (Terminal OS, Code Studio, Editorial, Dashboard, Blueprint, Retro Arcade, Minimal, Glass, Poster) or a preset, then add, reorder (drag or ▲▼), edit and remove blocks. Live preview in light/dark and desktop/mobile width, every image is checked for errors, editable Markdown, share link, **save/open the design as JSON**, and **Export ZIP** (see *Self-hosted mode*).
- **Metric definitions** - every number's source and calculation, next to each card and at `/api/definitions`.

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
| `ADMIN_TOKEN` | No | Bearer token that unlocks live token quota at `/api/rate-limit`. |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` | No | Enables `/api/spotify` for **your own** Spotify account (see *Spotify setup*). |
| `VIEWS` binding | No | Durable Object for the views counter, already declared in `wrangler.toml`. |

Without a token the API still works through REST, search and the public profile page: pinned repos, the punch card, code volume (your 10 latest repos), language trend (by repository creation year), merge rate, public orgs and yearly commit/PR/issue/review counts all have token-less paths, labelled on the card where the basis differs. Only the sponsors wall strictly needs a token. Token-less mode is slower and hits GitHub's 60 requests/hour unauthenticated limit quickly, so a token is still recommended. `GET /api/health` reports whether a token is configured.

---

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/design` (`hero`, `identity`) | **Your whole profile as one designed image**: identity, projects, stats, languages and activity as a `terminal`, `ide`, `editorial`, `dashboard`, `blueprint` or `retro` design. Uses the design's own palette unless you pass `theme`. |
| `/api/stats` | Repos, stars, forks, followers, contributions, PRs, issues, reviews (choose which with `hide`/`show`), optional activity-score ring (`rank=letter` or `percentile`). |
| `/api/year` (`wrapped`, `recap`) | **Year in review**: contributions, commits, PRs, reviews, issues, active days, longest streak, best day, months, top repos and languages. |
| `/api/monthly` (`trend`) | Contributions per month with last year as a ghost series, plus year-to-date change. |
| `/api/punchcard` (`rhythm`) | Commit punch card (weekday × hour) with a night-owl / early-bird summary. Needs a token. |
| `/api/stars` (`star-history`) | Star history of up to 3 repositories (sampled stargazer timestamps). |
| `/api/repo-timeline` (`timeline`) | Repositories, stars or forks by creation year as bars, line, area, dots or lollipops, with cumulative growth, grid, value labels and best-year highlight. |
| `/api/repo-compare` (`repo-health`) | 1-3 repositories side by side with health signals (activity, issue close rate, release recency, 30-day commits). |
| `/api/language-trend` | Share of commits by language, year by year (stream, stacked bars or lines). Needs a token. |
| `/api/code` (`loc`) | Code volume: bytes per language and an estimated line count, clearly labelled as an estimate. Needs a token. |
| `/api/sponsors` | Sponsors wall (or who you sponsor) with avatars. Needs a token. |
| `/api/views` (`visitors`) | Profile views counter. Live, never cached. Needs the `VIEWS` Durable Object. |
| `/api/wakatime` | WakaTime coding time: total, daily average, best day, languages/editors/OS/projects. `username` = your WakaTime username (public profile). |
| `/api/spotify` (`now-playing`) | What you're playing on Spotify now, or the last track. Deployer's own account. |
| `/api/quote` | Daily programming quote or your own, in four layouts. |
| `/api/impact` | **Realistic** collaboration stats: PRs merged into other people's repos, merge rate, repos contributed to, reviews, accepted discussion answers, organizations, top external projects. |
| `/api/patterns` | Work patterns: active days, weekly consistency, average per active day, busiest weekday, weekend share, best day, longest break, weekday chart. |
| `/api/pinned` | Your actual pinned repositories (including org repos), grid or list. |
| `/api/skyline` | Isometric 3D contribution skyline. |
| `/api/tech` | Tech-stack logo grid as one image (120+ logos; auto from your languages). |
| `/api/typing` | Animated typewriter lines (no GitHub data needed). |
| `/api/composite` | Several cards in one image (fewer images = faster README). |
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
| `/api/definitions` | Source and calculation of every metric (data transparency). |
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
| `theme` | `default` | `default`, `dark`, `github_dark`, `sylven`, `dracula`, `monokai`, `radical`, `tokyonight`, `cyberpunk`, `neon`, `nord`, `gruvbox`, `solarized`, `catppuccin`, `matrix`, `ocean`, `rose_pine`, `synthwave`, `ayu_light`, `paper`, `onedark`, `transparent`, `highcontrast`, or **`auto`**. `auto` follows the viewer's light/dark preference. |
| `bg` `fg` `muted` `accent` `border` | theme | Colour overrides as hex without `#` (3, 4, 6 or 8 digits). Invalid values are ignored. `bg` also takes a gradient: `bg=135,0f2027,2c5364`. |
| `title_color` `value_color` `icon_color` | theme | Colours of the title, the big numbers and the icons. |
| `chart_colors` | theme | Up to 10 comma-separated hex colours for chart series (languages, activity, radar, compare). |
| `heat_colors` | theme | Five comma-separated hex colours for heatmap levels (empty → most); also used by the 3D skyline. |
| `bg_opacity` | `100` | Background opacity % (0 = transparent card). |
| `width` | card | Card width in px, 200-1600: the whole card scales. |
| `padding` | `25` | Inner padding, 8-60. |
| `border_width` | `1.5` | Border thickness, 0-6. |
| `title_align` / `hide_subtitle` | `left` / `false` | Title alignment (left, center, right); hide the @username. |
| `title_size` / `text_scale` | `18` / `100` | Title font size; all text size in % (70-150). |
| `number_format` | `auto` | `full` (12,345), `compact` (12.3k) or as designed. Numbers follow `locale`. |
| `glow` | `false` | Neon glow on titles and accents. |
| `locale` | `en` | Labels, titles and number formatting in `en es fr de pt zh ja ru`. |
| `radius` | theme | Corner radius, 0 to 40. |
| `font` | theme | Font family. |
| `title` | per card | Custom title. |
| `hide_title` / `hide_border` | `false` | Hide the header or border. |
| `animation` | `false` | Turn on animations: fade-ins, ASCII effects and the 3D spin. Off by default; add `animation=true`. Respects `prefers-reduced-motion`. |
| `format` | `svg` | `svg`, `json`, or `text` (ascii card only). |
| `cache_seconds` | `1800` | Browser and CDN cache lifetime, 1800 to 86400. |

### Card styles (every card)

| Option | Values |
|--------|--------|
| `card_style` | `default`, `glass` (translucent with sheen), `elevated` (soft shadow), `outline`, `neon` (glowing accent border), `gradient` (accent → `accent2` border), `soft` (tinted, borderless) |
| `bg_pattern` | `none`, `dots`, `grid`, `diagonal`, `topo` |
| `title_gradient`, `accent2` | Gradient title from `accent` to `accent2` |
| `title_transform`, `title_divider` | Upper/lower-case titles; a line under the header |
| `title_weight`, `value_weight` | `normal`, `medium`, `bold`, `black` for the title and the big numbers |
| `title_font`, `letter_spacing` | A separate font for the title; extra spacing in px (-1 to 4) |
| `border_style`, `margin` | `solid`, `dashed`, `dotted` border; transparent space around the card |
| `shadow`, `tone`, `card_opacity` | `none`/`soft`/`strong` shadow; `grayscale`, `sepia`, `vivid`, `faded`; whole-card opacity % |
| `hide_icons`, `subtitle_color` | Remove every icon; colour of the @username |

They combine with themes, gradients (`bg=135,c1,c2`), every colour override, width, padding, radius and text scale.

### Card parameters

| Card | Parameters |
|------|------------|
| design | `design` (`terminal ide editorial dashboard blueprint retro minimal glass poster`), `role`, `intro` (default: bio), `now`, `skills` (your stack line), `links`, `projects` (0–6), `hide` (`stats languages projects activity now links`), `avatar` (`photo` uses your real picture), `shape` (`auto circle rounded square`), `chrome` (`mac windows linux none`), `scanlines` (CRT effect), `prompt` |
| year | `year`, `hide` (`commits prs reviews issues active streak best_day repos months repos_list languages`), `layout` (`full compact story`), `columns` (2–6), `headline` |
| monthly | `year`, `compare`, `layout` (`bars`, `line`), `values`, `goal`, `diff` (green/red against last year) |
| punchcard | `tz` (UTC offset in hours; default = each commit's own timezone), `shape` (`circle`, `square`, `heat`), `week_start`, `hours` (`12h 24h`), `highlight`, `legend` |
| stars | `repo` (up to 3, `owner/name`; bare name = `username`'s repo; default = top repo), `scale` (`linear`, `log`), `area`, `points`, `legend`, `period` (`all 1y 2y 5y`), `milestones` |
| repo-timeline | `metric` (repos/stars/forks), `style` (bars/line/area/dots/lollipop), `years`, `cumulative`, `archived`, `empty`, `values`, `grid`, `axis`, `highlight`, `summary`, `height`, `gap`, `round`, `labels` |
| repo-compare | `repos` (1–3; default = `username`'s top 2), `signals`, `highlight`, `rows` (pick which), `bars` |
| language-trend | `years` (2–10), `count` (2–8), `layout` (`stream`, `bars`, `lines`), `exclude`, `mode` (`share absolute`), `smooth`, `height`, `legend`, `values` |
| code | `count`, `exclude`, `layout` (`bars tiles stack`), `unit` (`both lines bytes`), `total` |
| sponsors | `mode` (`sponsors`, `sponsoring`), `count` (1–60), `size`, `per_line`, `names`, `shape` (`circle rounded square`), `layout` (`wall list stack`), `cta` |
| views | `style` (`badge flat pill plastic for-the-badge social digits card`), `label`, `key` (separate counter, e.g. a repo), `base`, `abbreviated`, `count` (`false` = read only), `color`, `label_color`, `logo`, `scale` |
| wakatime | `range` (`auto` = your public range, `last_7_days last_30_days last_6_months last_year all_time`; falls back to your public range if another isn't shared), `section` (`languages editors operating_systems categories projects`), `layout` (`bars compact totals donut`), `count`, `percent` |
| spotify | `layout` (`card compact bar`), `show` (`auto now recent`), `cover`, `equalizer`, `bar` (`none progress waves`), `backdrop` (blurred album art), `size` (`small medium large`) |
| quote | `layout` (`card minimal terminal bubble`), `topic`, `index`, `text`, `author`, `quote_width`, `layout` also `code big note`, `size`, `italic` |
| stats | `layout` (`grid classic tiles row compact minimal`), `columns` (1–6), `show_icons`, `hide`, `show`, `sort` (`default value`), `highlight`, `labels` (`full short none`), `compact_numbers`, `rank` (`none letter percentile badge stars bar`; readme-stats `hide_rank=false` maps here), `ring_color`, `sparkline`, `dividers`, `footer`, `footer_text`. Stat keys: `repos stars forks followers following gists commits contributions prs issues reviews age`. |
| languages | `layout` (`bar`, `donut`, `pie`, `bars`, `chips`, `treemap`), `langs_count` (1–10), `hide`, `by` (`size`, `repos`), `decimals` (0–2), `percentages`, `center_label`, `min_percent`, `other` (group the rest), `order` (`size name`), `legend` |
| radar | `data` (`languages`, `activity`), `langs_count` (3–8), `hide`, `levels` (2–8), `fill` (0–100), `values`, `grid` (`polygon`, `circle`), `scale` (`sqrt`, `linear`) |
| streak | `layout` (`classic`, `ring`, `cards`, `compact`, `week`), `mode` (`daily`, `weekly`), `exclude_days` (e.g. `sat,sun` never break a streak), `hide` (`total current longest`), `dates`, `years` (1–15) |
| contributions | `year`, `view` (`heatmap bars`), `shape` (`square round circle`), `cell` (6–18), `gap` (1–6), `week_start` (`sun mon`), `months`, `weekdays`, `legend`, `highlight` (`none best today both`), `summary`, `effect` (`none snake wave`; with `animation=true`) |
| skyline | `year`, `height` (20–140), `cell` (6–16), `stats` |
| patterns | `year`, `week_start`, `hide` (`active consistency average busiest weekend best break`), `chart` (`bars radial none`), `values`, `icons` |
| impact | `count` (0–6 external projects), `orgs`, `hide` (`external merge_rate repos reviews answers orgs`), `columns` (2–6), `tiles`, `recent` (0–6 latest merged PRs) |
| pinned | `layout` (`grid`, `list`), `count` (1–6), `columns` (1–3), `descriptions`, `owner`, `fallback` (show top repos when nothing is pinned) |
| tech | `icons` (e.g. `ts,react,docker`; empty = your languages), `groups` (named sections: `Frontend:ts,react;DevOps:docker,git`), `style` (`tile plain mono outline`), `shape` (`rounded circle square`), `size`, `per_line`, `gap`, `align` (`left center right`), `shadow`, `labels` |
| typing | `lines` (separated by `;`), `mode` (`cycle stack`), `size`, `speed`, `pause`, `align` (`left center right`), `width`, `height`, `vcenter`, `cursor`, `cursor_style` (`bar block underscore`), `repeat` (`false` types once), `letter_spacing`, `color` |
| composite | `cards` (up to 4 ids), `columns`, `gap`, `valign`; per-card options with a prefix, e.g. `stats.layout=compact` |
| top-repos | `layout` (`list`, `grid`, `table`, `ranked`), `limit` (1–10), `sort` (`stars`, `forks`, `updated`), `language`, `min_stars`, `exclude`, `skip_archived`, `descriptions`, `updated` |
| repos | `repo` (name, `owner/name`, or `auto` = your most-starred), `layout` (`default`, `detailed`, `compact`), `show_owner`, `topics`, `description_lines` |
| achievements | `style` (`trophy`, `badge`), `columns` (1–6), `sort` (`default`, `rank`), `min_rank` (`E`..`SSS+`), `progress`, `hide` (`commits prs contributions repos stars followers issues reviews years external collaborations consistency answers orgs sponsors`), `style` also `list`, `show`, `rows`, `gap`, `names`, `values` |
| ascii | `shape` (`flat`, `sphere`, `cylinder`, `coin`), `charset` (`classic dense blocks binary hex alnum text`), `text`, `mode` (`mono`, `color`), `anim` (`scan reveal type wave flicker pulse none`), `speed`, `frames`, `cutout`, `cols` (20–110), `cell`, `contrast`, `invert`, `caption`, `source` (`avatar`, `identicon`), `brightness` (±50); `charset` also `braille minimal dots geometric retro math custom` (`custom` takes your ramp in `text`) |
| profile-card | `layout` (`default`, `centered`, `banner`), `stats` (up to 5 of `followers following repos stars forks prs issues contributions commits reviews`), `avatar`, `shape` (`circle rounded square`), `bio_lines`, `languages`, `details`, `links`, `grade`, `layout` also `cover` (gradient cover + Open to work chip), `chips` |
| compare | `vs` (default `octocat`), `layout` (`bars`, `table`), `avatars`, `metrics` (`repos stars forks followers following gists commits contributions prs issues reviews age`) |
| banner | `text`, `subtitle`, `style` (`wave gradient grid terminal aurora slice shark egg cylinder rect soft`), `height`, `size`, `align`, `border`, `fill` (`gradient solid`), `reverse` (flip for footers), `stroke`, `color` |
| divider | `style` (`wave dots line gradient dashed stars zigzag pulse blocks diamond label footer header`), `height`, `text` (for `label`), `thickness` |
| activity | `by` (`month week weekday`), `style` (`bar area line step lollipop`), `year`, `bar_radius`, `line_width`, `grid`, `height`, `smooth`, `peak`, `average`, `values` |
| badge | `stat` (`stars followers following repos forks commits prs issues reviews contributions gists years rank top_language external_prs collaborations consistency merge_rate`), `label`, `style` (`flat flat-square plastic pill for-the-badge social`), `color`, `label_color`, `logo` (any bundled tech icon), `logo_color`, `scale` |

### Errors

- **SVG cards** return an SVG error card with HTTP 200, so READMEs show the reason instead of a broken image. The real error code is in the `X-Card-Error` header. Error cards are cached briefly for outages (1-2 min), an hour for unknown users and a day for invalid parameters.
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

**Design presets:** `terminal-os`, `code-studio`, `editorial`, `dev-dashboard`, `blueprint`, `retro` - each pairs the matching profile design with cards in the same palette. **Other presets:** `analyst`, `recruiter`, `maximal`, `classic`, `minimal`, `showcase`, `hacker`, `dashboard`, `badges`, `ascii`. `GET /api/presets` lists them with their blocks so you can use one as a starting point.

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
| `badges` | `items`, `style`, `align`. Item kinds: `stat` (a number from ProfileFoundry), `tech` (any technology), `social` (github, twitter, x, linkedin, youtube, instagram, twitch, discord, mastodon, bluesky, devto, medium, hashnode, stackoverflow, reddit, telegram, npm, kaggle, leetcode, codepen, kofi, sponsor, website, email), `custom` |
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

### Design systems

Content, style and layout are independent: one profile model (identity, work, signals) is drawn by six design systems, and every design takes any theme and colour override. The new palettes (`terminal`, `vscode`, `editorial`, `blueprint`, `retro`, `linear`) work on every card, so a whole README can share one identity.

```md
![me](https://your-worker.workers.dev/api/design?username=you&design=terminal&role=Backend%20engineer&now=building%20a%20database)
```

### Self-hosted mode (Export ZIP)

**Export ZIP** in the README Studio downloads:

- `README.md` pointing at `./assets/*.svg` (no third-party image host needed),
- `README.live.md` served live from your deployment,
- `assets/` with every rendered SVG,
- `.github/workflows/profilefoundry.yml`, a GitHub Action that refreshes the assets twice a day and keeps the old file if a card fails,
- `profilefoundry.config.json`, which reopens the design with **Open config**.

Live-only cards (views counter, Spotify) always stay live.

---

## Realistic metrics

Vanity numbers (raw commit counts, repo counts, account age) are easy to game. ProfileFoundry leans on stats that reflect real collaboration:

- **Activity score** (`profile-card`, `badge?stat=rank`): one 12-month window for every input, so it's the same with or without a server token. Weighs PRs merged into other people's repos, repos contributed to, weekly consistency, reviews, contributions, stars and followers. Missing data renormalises the weights instead of lowering the score. It's an activity indicator, not a measure of code quality.
- **Trophies v2**: Open Sourcerer (external merged PRs), Collaborator, Consistent, Answerer, Team Player, Sponsored. Seniority/volume trophies (years, repo count, orgs) are shown but don't count towards the overall rank.
- **Impact** and **Work patterns** cards (above).

## Data transparency

Every metric has a documented source and calculation at `GET /api/definitions` (also shown under each card in the Playground). Estimates (lines of code, star history between samples, the activity score, view counts) are marked as such; token-only values are flagged. No metric is presented as more precise than it is.

## Integrations setup

**Views counter.** `wrangler.toml` declares a SQLite-backed Durable Object (`VIEWS`, free plan friendly). Every image load counts once and the response is `no-store`, so GitHub's proxy always fetches the live number. Use `key=` for separate counters and `base=` to carry over an old count.

**WakaTime.** Make your stats public on wakatime.com (Profile → *Display coding activity/languages publicly*), then use `/api/wakatime?username=<wakatime-username>`.

**Spotify setup** (one account per deployment):

1. Create an app at developer.spotify.com and add a redirect URI such as `http://127.0.0.1:8888/callback`.
2. Authorize once with scopes `user-read-currently-playing user-read-recently-played` and exchange the code for a refresh token.
3. Set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` and `SPOTIFY_REFRESH_TOKEN` as secrets.

Access tokens stay in memory only. The card is cached for 60 seconds.

## Reliability, scale and security

Built to sit in thousands of READMEs behind GitHub's image proxy:

- **Versioned cache** - cached cards are keyed by app version, so a deploy never serves a stale error card from the previous release.
- **Canonical cache keys** - only parameters a card understands are part of the key, defaults and order are ignored, usernames are lower-cased. Random junk parameters can't bust the cache or force re-renders.
- **Stale-while-revalidate + stale-if-error** - GitHub data has a soft TTL (fresh) and a 7-day hard TTL. Stale data is served instantly while refreshing in the background, and if GitHub is down or rate-limiting, the last good data keeps being served. Unknown users are cached negatively.
- **Token pool health** - requests go to the token with the most remaining quota; revoked (401) or rate-limited (403/429, secondary limits) tokens are benched until reset and the request is retried on another token, with jittered backoff and a 9 s overall deadline.
- **Bounded work per request** - at most 30 GitHub calls per card (Workers allows 50 subrequests on the free plan), past calendar years batched into one query and cached for a month, ASCII 3D capped by a cell budget, rendered SVGs capped at 2.5 MB, avatars capped at 1 MB / 1 megapixel.
- **Rate limiting** (optional, `wrangler.toml`) - Workers Rate Limiting on cache misses only: per IP for normal clients, per username for GitHub's camo proxy (which uses a few shared IPs).
- **External providers** - WakaTime, Spotify and album art go through one fetcher with an https host allowlist, no redirects, timeouts and size caps.
- **Motion** - all animations are CSS (including the typing header and snake), so `prefers-reduced-motion` stops them; animation stays off unless `animation=true`.
- **Security** - every parameter is validated to numbers, enums or hex colours before reaching SVG/CSS; all text is escaped; SVGs and pages ship strict CSPs; the README HTML preview is sandboxed, strips active content and never includes raw HTML blocks when served by GET; the avatar fetch is host-allowlisted without redirects; `/api/rate-limit` shows live quota only with `ADMIN_TOKEN`; tokens never appear in responses or logs.
- **Observability** - one structured JSON log line per card request (card, user, cache hit/miss, status, ms, GitHub calls), sampled via `[observability]`; `/api/health` reports token health and cache counters (503 when every token is benched).

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
  metrics/        derived stats (profile metrics, streaks, patterns, grade, definitions)
  designs/        profile model + the six design systems
  providers/      safe fetcher for non-GitHub providers
  counter.ts      Durable Object behind /api/views
  achievements/   trophy definitions and ranking
  themes/         palettes + resolveTheme (overrides, auto)
  svg/            frame (shared chrome), icons, language colours
  plugins/        third-party providers for /api/profile
  core/           params/validation, cache (SWR, canonical keys), compat, errors, i18n, text helpers
  github/tokens.ts token-pool health
  readme/         README generator (spec, presets, renderer, routes)
  ui/             the web app served at / (playground, store, builder)
  scripts/        gen-tech-icons.mjs (bundled simple-icons subset)
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
- [x] Realistic impact & work-pattern stats, pinned repos, activity score v2, trophies v2
- [x] 3D skyline, tech icon grid, typing header, composite card, snake/wave heatmaps, footer waves
- [x] Unified customization (size, padding, colours per element, heat/chart palettes, glow, number formats)
- [x] github-readme-stats compatibility, canonical caching, stale-if-error, token health, rate limiting
- [x] Profile design systems (terminal, IDE, editorial, dashboard, blueprint, retro) with matching palettes and presets
- [x] Year in review, monthly trend, commit punch card, language trend, code volume
- [x] Star history, repository compare & health, sponsors wall, views counter
- [x] WakaTime and Spotify cards, daily quote, letter-grade ring, CSS-only motion
- [x] README Studio: design picker, image validation, mobile preview, config save/open, ZIP export with GitHub Action
- [x] Metric definitions endpoint
- [ ] Historical snapshots (follower/star growth for any user) - needs scheduled storage
- [ ] PNG output, theme editor and community gallery
- [ ] More providers (Dev.to, Stack Overflow, npm) as SVG cards

*Built for the open-source community.*

---

## Logo

The code is released under the [MIT License](LICENSE), so you can use, change and share it freely. The ProfileFoundry name and logo (`assets/`) are the exception: they are SylvenOS marks. You may use them to refer to this project, for example when linking to it or writing about it, but please do not use them to suggest your own fork or product is the official one or is endorsed by SylvenOS. If you fork the project, give it your own name and logo.

## License

[MIT](LICENSE) &copy; 2026 SylvenOS.

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then see [docs/ADDING_A_CARD.md](docs/ADDING_A_CARD.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DEPLOYING.md](docs/DEPLOYING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md) and report vulnerabilities as described in [SECURITY.md](SECURITY.md). Changes are listed in [CHANGELOG.md](CHANGELOG.md).
