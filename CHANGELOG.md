# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com) and the project uses [Semantic Versioning](https://semver.org).

## [Unreleased]

### Changed
- The project is now called **GithubStudio** (previously ProfileFoundry). The live site moves to https://githubstudio.sylvenos.com. The Worker is now named `githubstudio` (previously `profilefoundry-api`); deploying under the new name creates a new Worker, so the views counter starts from zero. Exported files are now `githubstudio.config.json` and `.github/workflows/githubstudio.yml`.

## [1.0.0] - 2026-11-08

First release as **ProfileFoundry** by SylvenOS. Version numbering restarts at 1.0.0 with the new name; releases up to 5.3.0 were published as GitPulse.

### Added (search, AI and trust)
- The landing page was redesigned (sticky header, hero with live README preview, feature icons, step guide, FAQ, accessible focus states, 44px touch targets, reduced-motion support, no layout shift) and now shows the SylvenOS logo (`/sylvenos-logo.webp`). Visible text and snippets credit SylvenOS only; the developer is named in structured data, `llms.txt` and the author meta tag. Copyright years are generated from the current date.
- The `/about` page uses the same design as the landing page: theme toggle, SylvenOS logo, key facts, FAQ, machine-readable links and scroll animations.
- `llms.txt` and `llms-full.txt` are now complete references for AI assistants and agents: every card with all of its options, the common options, themes, metric definitions, other endpoints, the README generator and presets, compatibility rules, data sources and limits, reliability, self-hosting settings, architecture, privacy and security, the full FAQ and step-by-step guidance for agents. They are generated from the code, so they stay current, and are served as `text/plain` so browsers display them.
- The main developer's bio, titles, expertise, notable projects, profile links (LinkedIn, X, DEV, Medium, npm and more) and engineering approach are in `llms.txt`, `llms-full.txt` and the `Person` structured data, not in visible page text.
- A landing page at `/` (hero, live example cards, features, how it works, SylvenOS branding and credit, FAQ). The Playground, Store and README Studio moved to `/app`; old `/#tab=...` share links are forwarded to `/app`.
- Crawlable `/about` page with FAQ, author and organisation details, privacy answer and links for developers.
- Structured data (JSON-LD) naming SylvenOS and Akshay Kurve (with the name variants Akshay D Kurve and Akshay Dhanraj Kurve), the software, the website and a FAQ.
- `/llms.txt`, `/llms-full.txt`, `/robots.txt` (AI crawlers welcome), `/sitemap.xml`, `/.well-known/security.txt` and a social share image at `/og.jpg`.
- Canonical URL, Open Graph and Twitter tags, one static `h1` and `noscript` text on the app page; `X-Robots-Tag: noindex` on generated card responses.
- Share images that show real sample cards: 1200x630 at `/og.jpg` and square 1200x1200 at `/og-square.jpg` (source files in `assets/`); the sitemap now lists them with change hints and priorities.
- E-E-A-T and AI-search upgrades: key facts, byline, version and last-reviewed date, an accuracy and corrections section and a how-to-cite section on `/about` and in `llms.txt`; `AboutPage`, `BreadcrumbList` and `HowTo` structured data; three more FAQ answers; more AI crawlers and a `Content-Signal` line in `robots.txt`.
- `docs/ARCHITECTURE.md` now has a tech stack table, a system overview diagram and a fuller folder map.
- `CITATION.cff` and `docs/SEO.md` (what is built in and what the owners still need to do).

### Security
- Dependencies updated to current releases of their stable major lines; `pnpm audit` reports no known vulnerabilities (production or dev).
- The app page now pins its single inline script by SHA-256 hash in the Content-Security-Policy (no `unsafe-inline` for scripts).
- Added `Permissions-Policy`, `Cross-Origin-Opener-Policy` and `Strict-Transport-Security` headers.
- Request and provider response bodies are size-capped while streaming, and `ADMIN_TOKEN` is compared in constant time.
- New automated injection tests send hostile input into every option of every card.
- Requires Node.js 22.12 or newer (Node 20 is end-of-life); Worker `compatibility_date` moved to 2026-06-01.

### Added
- MIT `LICENSE`.

### Changed
- New ProfileFoundry logo and favicon (a root node branching into rising data nodes, in the SylvenOS palette), served at `/favicon.svg` and `/apple-touch-icon.png`; source files in `assets/`.
- The project is now called **ProfileFoundry** (previously GitPulse). Worker name is `profilefoundry-api`; exported config and workflow files are `profilefoundry.config.json` and `.github/workflows/profilefoundry.yml`.

## [5.3.0]

### Added
- **Repository Timeline** card (`/api/repo-timeline`): repositories, stars or forks by creation year as bars, line, area, dots or lollipops.
- Card-wide style options for every card: `title_weight`, `value_weight`, `title_font`, `letter_spacing`, `border_style`, `margin`, `shadow`, `tone`, `card_opacity`, `hide_icons`, `subtitle_color`.
- **Match system theme** switch in the web app (`theme=auto`).
- `X-Cache` and `Server-Timing` response headers on cards.

### Changed
- Playground preview follows the app's light/dark toggle for the default and `auto` themes.
- Responsive web app: cards scale to fit, the page scrolls normally on small screens, and there are tuned layouts for laptops and very wide displays.
- Option help text no longer shows raw markdown backticks.

### Fixed
- Contribution graph legend overlapped the summary on short date ranges.
- 3D skyline title was clipped on short date ranges.
- Monthly trend showed "+∞" when the previous period was empty; it now shows "new".
- Playground showed nothing when the preview request failed; it now says so.

## [5.2.0]

Redesigned web app, nine profile designs, upgraded stat cards and token-less GitHub fallbacks. See the git history for details.
