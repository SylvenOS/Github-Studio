# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com) and the project uses [Semantic Versioning](https://semver.org).

## [Unreleased]

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
