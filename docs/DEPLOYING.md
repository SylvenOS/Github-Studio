# Deploying to Cloudflare Workers

GithubStudio runs on the free Workers plan. This guide takes you from a clone to a live URL.

## Before you start

- A free [Cloudflare account](https://dash.cloudflare.com/sign-up).
- Node.js 22 or newer and pnpm.
- A GitHub personal access token (**classic, no scopes**) from <https://github.com/settings/tokens>. It is optional but strongly recommended: without it the app falls back to limited public data and low rate limits.

## Steps

```bash
pnpm install
npx wrangler login                    # opens the browser once
pnpm typecheck && pnpm test           # make sure everything is green
npx wrangler deploy --dry-run         # confirm it bundles

npx wrangler secret put GITHUB_TOKEN  # paste the token when asked
pnpm deploy                           # wrangler deploy
```

Wrangler prints your URL, for example `https://profilefoundry-api.<your-subdomain>.workers.dev`. Open it for the web app, and check `/api/health`.

The worker name comes from `name` in `wrangler.toml`; change it first if you want a different subdomain.

## Configuration

Secrets are set with `npx wrangler secret put <NAME>`. Never put them in `wrangler.toml`.

| Name | Purpose |
|---|---|
| `GITHUB_TOKEN` | Recommended. Enables GraphQL, exact data and high rate limits |
| `GITHUB_TOKENS` | Optional comma-separated extra tokens; requests go to the healthiest one |
| `BLOCKLIST` | Optional usernames to refuse, comma-separated |
| `ADMIN_TOKEN` | Optional bearer token for live quota at `/api/rate-limit` |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` | Optional, enables `/api/spotify` for your own account |

`CACHE_SECONDS` in `wrangler.toml` sets the default cache lifetime (minimum 1800).

For local development copy `.env.example` to `.env`. It is gitignored. Do not commit it.

## What is bound for you

- **Rate limiting** (`RL_IP`, `RL_USER`) protects the free quota of GitHub and Workers. Remove the `[[ratelimits]]` blocks in `wrangler.toml` to turn it off.
- **Durable Object** `ViewCounter` stores the profile view counter in SQLite and works on the free plan. Remove the `[[durable_objects.bindings]]` and `[[migrations]]` blocks to disable `/api/views`.

## Custom domain

In the Cloudflare dashboard open **Workers & Pages**, pick the worker, then **Settings > Domains & Routes** and add your domain. Then use that domain in the README URLs.

## Updating

```bash
git pull
pnpm install
pnpm typecheck && pnpm test
pnpm deploy
```

Cached cards are keyed by the version in `package.json`, so bump the version when a release changes how cards look. The new version then ignores stale cache entries.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Cards say "Needs a GitHub token" | That card needs GraphQL. Set `GITHUB_TOKEN` as a secret |
| Cards say "Taking a short break" | GitHub rate limit. Add a token, or more tokens with `GITHUB_TOKENS` |
| The views card says it is not set up | The `ViewCounter` Durable Object binding or migration is missing |
| The Spotify card says it is not enabled | The three Spotify secrets are not set |
| The WakaTime card is empty | Make the WakaTime profile public (no secret is needed) |
| An old look keeps showing | Browser or GitHub image-proxy cache. Wait, or add `&v=2` to the URL |
| `wrangler deploy` fails on the migration | The migration tag in `wrangler.toml` was changed. Keep `v1` and add new tags for new classes |

Logs: `npx wrangler tail` streams one structured line per card request (sampled).
