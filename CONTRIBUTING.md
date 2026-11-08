# Contributing to GithubStudio

Thanks for wanting to help. GithubStudio is a stats API, card store and README builder that runs on Cloudflare Workers. Small fixes, new cards, new themes, translations and doc improvements are all welcome.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security problems privately, following [SECURITY.md](SECURITY.md), never in a public issue.

## Ways to contribute

- **Report a bug** with the [bug template](.github/ISSUE_TEMPLATE/bug_report.yml). Include the card URL that misbehaves.
- **Suggest a card or option** with the [feature template](.github/ISSUE_TEMPLATE/feature_request.yml).
- **Add a card, theme, design or translation.** See [docs/ADDING_A_CARD.md](docs/ADDING_A_CARD.md).
- **Improve the docs.** Typos and unclear sentences count as real contributions.
- **Review pull requests** and help triage issues.

If you plan a big change (a new subsystem, a new data provider, a redesign), open an issue first so we can agree on the approach before you spend time on it.

## Set up

You need Node.js 22 or newer and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/akshaykurve/github-stats.git
cd github-stats
pnpm install
cp .env.example .env     # then add your own GITHUB_TOKEN (see below)
pnpm dev                 # http://localhost:8787
```

### GitHub token

Most cards work without a token, but with limited data and a low rate limit. For full data create a **classic personal access token with no scopes** at <https://github.com/settings/tokens> and put it in `.env` as `GITHUB_TOKEN`.

> **Never commit `.env`.** It is gitignored. Do not paste tokens into issues, pull requests, screenshots or tests.

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm dev` | Local Worker with live reload |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm test` | Whole test suite (vitest, no network needed) |
| `pnpm test:watch` | Tests in watch mode |
| `npx wrangler deploy --dry-run` | Confirm the Worker still bundles |

Tests run against mocked GitHub responses (`test/helpers.ts`). They never call GitHub, so they need no token.

## Making a change

1. Fork the repository and create a branch from `main`: `git checkout -b feat/short-description`.
2. Make the change, with a test (see below).
3. Run `pnpm typecheck && pnpm test`. Both must pass.
4. If you changed how a card looks, render it and check it in **light and dark** and at a **narrow width**. Attach a screenshot to the pull request.
5. Update `README.md` if you added or changed a card, an option or an endpoint, and add a line to [CHANGELOG.md](CHANGELOG.md) under `Unreleased`.
6. Open a pull request using the template. Keep it focused: one topic per pull request.

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org): `feat: add repo timeline card`, `fix(streak): count today when empty`, `docs: explain token setup`. Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

## Tests

- Put tests in `test/`. Reuse `mockGitHub()` and `testEnv()` from `test/helpers.ts`.
- Every new card needs a test that renders it (and each layout or style it offers) and checks the SVG is well formed with `assertWellFormedSvg`.
- Every new query option needs a test, including one with hostile input (see below).
- A bug fix needs a test that fails without the fix.

## Rules every card and option must follow

These keep the project safe and its output consistent.

- **Escape all user text.** Anything that comes from a query string or from GitHub (names, bios, descriptions) must go through `esc()` before it reaches SVG. Never put user text into CSS or attribute values unescaped.
- **Validate every option** with the helpers in `src/core/params.ts` (`int`, `num`, `bool`, `oneOf`, `list`, `color`). Clamp numbers, restrict enums, and fall back to the default instead of throwing, unless the input can't be used at all.
- **Animation is off by default.** Use `anim()` and honour `common.animation`. Anything that moves must respect `prefers-reduced-motion`.
- **Use theme colours, not hard-coded ones.** Use the CSS classes (`fg`, `muted`, `accent`, `bd`, `bg`) so every theme, `card_style` and `tone` works.
- **No new dependencies without discussion.** The Worker bundle must stay small. The web app UI is plain ES5 inside one template string (see below), so no frameworks.
- **Respect rate limits.** Fetch in parallel, reuse the shared client in `src/github/client.ts`, and keep each card under the sub-request budget (50 on the free Workers plan).
- **Be honest about data.** If a number is estimated, say so on the card or in the option description.
- **Secrets stay in the environment.** Never log or return a token.

## Working on the web app UI

The app is served from `src/ui/page.ts` (markup), `src/ui/styles.ts` (CSS) and `src/ui/script.ts` (browser code). The script is one JavaScript template literal, so inside `script.ts`:

- write plain **ES5** (`var`, `function`),
- **never use backticks or `${`**; use string concatenation,
- only build DOM with the `el()` helper, and use `innerHTML` only for static strings.

Check changes at 360, 768 and 1280 px wide, and in both light and dark mode. Use real colour tokens from `styles.ts` (`--accent`, `--surface`, ...) instead of new hex values.

## Pull request checklist

- [ ] `pnpm typecheck` and `pnpm test` pass
- [ ] New or changed behaviour has tests
- [ ] User text is escaped and options are validated
- [ ] Visual changes checked in light and dark, with a screenshot
- [ ] `README.md` and `CHANGELOG.md` updated
- [ ] No secrets, `.env` files or generated build output committed

## Review and releases

A maintainer will review your pull request, usually within a few days. Expect questions or requested changes; that is normal and not a rejection. Releases follow [Semantic Versioning](https://semver.org). Bump `version` in `package.json` when a release changes card output, because cached cards are keyed by version.

## Licence

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE), the same as the project.

## Getting help

Open a [discussion or question issue](.github/ISSUE_TEMPLATE/question.yml). Please include what you tried and what you expected.
