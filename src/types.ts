export interface Env {
  /** Single GitHub token (recommended: enables GraphQL, higher limits, real data). */
  GITHUB_TOKEN?: string;
  /** Comma-separated token pool; requests go to the healthiest token, failing tokens are benched. */
  GITHUB_TOKENS?: string;
  /** Default freshness for cards and GitHub data, in seconds. */
  CACHE_SECONDS?: string;
  /** Comma-separated usernames that will not be served. */
  BLOCKLIST?: string;
  /** Bearer token for admin endpoints (live token quota). Unset = admin endpoints are disabled. */
  ADMIN_TOKEN?: string;
  /** Optional Workers Rate Limiting bindings (see wrangler.toml). Checked only on cache misses. */
  RL_IP?: RateLimit;
  RL_USER?: RateLimit;
  /** Durable Object namespace for the profile view counter (`/api/views`). Optional. */
  VIEWS?: DurableObjectNamespace;
  /** Spotify card (single-account, the deployer's own): app credentials + a long-lived refresh token. */
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  SPOTIFY_REFRESH_TOKEN?: string;
}

export type AppEnv = { Bindings: Env };
