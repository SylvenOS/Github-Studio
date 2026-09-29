export interface Env {
  /** Single GitHub token (recommended: enables GraphQL, higher limits, real data). */
  GITHUB_TOKEN?: string;
  /** Comma-separated token pool; requests are spread across it to multiply rate limits. */
  GITHUB_TOKENS?: string;
  /** Default browser/edge cache lifetime for cards, in seconds. */
  CACHE_SECONDS?: string;
  /** Comma-separated usernames that will not be served. */
  BLOCKLIST?: string;
}

export type AppEnv = { Bindings: Env };
