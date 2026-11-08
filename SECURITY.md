# Security policy

## Supported versions

Only the latest release receives security fixes. Please update before reporting.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private reporting instead:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** and describe the problem.

If that is unavailable, contact the repository owner through their GitHub profile and ask for a private channel.

Please include:

- what the problem is and where (endpoint, option or file),
- steps or a URL that reproduces it,
- the impact you expect (for example script injection, data exposure, request forgery, denial of service),
- your suggested fix, if you have one.

You can expect an acknowledgement within a few days. We will keep you updated, fix the issue, and credit you in the changelog unless you prefer to stay anonymous.

## What is in scope

- Script, SVG or CSS injection through query parameters or GitHub data
- Server-side request forgery through the provider layer (`src/providers/`) or avatar loading
- Leaking secrets such as `GITHUB_TOKEN`, Spotify or WakaTime credentials
- Bypassing the blocklist or rate limits in a way that harms the service
- Cache poisoning

## Out of scope

- Problems that need a leaked token or access to your Cloudflare account
- Rate limiting by GitHub's own API
- Automated scanner output with no demonstrated impact

## For people deploying GitPulse

- Store tokens only as Worker secrets (`wrangler secret put GITHUB_TOKEN`). Never put them in `wrangler.toml`.
- A classic token with **no scopes** is enough; it reads public data only.
- Never commit `.env` or `.dev.vars`; both are gitignored.
- Keep the Workers rate-limit bindings enabled on public deployments.
- Set `ADMIN_TOKEN` only if you use `/api/rate-limit`, and keep it secret.
