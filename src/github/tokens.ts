/**
 * Health of the GitHub token pool, tracked per isolate. Requests go to the token with the most
 * remaining quota; tokens that are invalid (401) or rate-limited (403/429, secondary limits) are
 * benched until their reset time, so one bad token never fails requests.
 */
export interface TokenState {
  token: string;
  label: string;
  remaining: number;
  resetAt: number;
  downUntil: number;
  failures: number;
}

const states = new Map<string, TokenState>();

export function poolFor(tokens: string[]): TokenState[] {
  return tokens.map((token, i) => {
    let s = states.get(token);
    if (!s) {
      s = { token, label: `token-${i + 1}`, remaining: 5000, resetAt: 0, downUntil: 0, failures: 0 };
      states.set(token, s);
    }
    return s;
  });
}

/** Healthiest available token, excluding ones already tried for this request. Undefined if all are benched. */
export function pick(pool: TokenState[], exclude: Set<TokenState>): TokenState | undefined {
  const now = Date.now();
  const ok = pool.filter((t) => !exclude.has(t) && t.downUntil <= now && (t.remaining > 25 || t.resetAt <= now));
  if (!ok.length) return undefined;
  ok.sort((a, b) => b.remaining - a.remaining);
  // spread load between the two healthiest tokens
  return ok[Math.floor(Math.random() * Math.min(2, ok.length))];
}

/** Records quota headers and benches the token on auth / rate-limit failures. */
export function observe(t: TokenState, res: Response) {
  const now = Date.now();
  const rem = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (rem !== null && rem !== '') t.remaining = Number(rem);
  if (reset) t.resetAt = Number(reset) * 1000;
  if (res.status === 401) {
    t.downUntil = now + 3_600_000;
    t.failures++;
  } else if (res.status === 429 || (res.status === 403 && (t.remaining === 0 || res.headers.has('retry-after')))) {
    const retry = Number(res.headers.get('retry-after'));
    t.downUntil = Number.isFinite(retry) && retry > 0 ? now + retry * 1000 : Math.max(t.resetAt, now + 60_000);
    t.failures++;
  } else if (res.ok) {
    t.failures = 0;
  }
}

/** Marks a token exhausted after a GraphQL `RATE_LIMITED` error (HTTP 200). */
export function benchUntilReset(t: TokenState) {
  t.remaining = 0;
  t.downUntil = Math.max(t.resetAt, Date.now() + 60_000);
}

/** Public-safe summary (never the token values). */
export function poolStatus(tokens: string[]) {
  const now = Date.now();
  return poolFor(tokens).map((t) => ({
    label: t.label,
    healthy: t.downUntil <= now,
    remaining: t.remaining,
    resetAt: t.resetAt ? new Date(t.resetAt).toISOString() : null
  }));
}

export function resetTokenStates() {
  states.clear();
}
