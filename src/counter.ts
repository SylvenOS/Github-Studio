/**
 * Durable Object behind the profile view counter. One instance per counter name gives strongly
 * consistent, atomic increments (KV can't do that), and storage survives deploys.
 *
 * Bound as `VIEWS` in wrangler.toml (SQLite-backed, which the Workers free plan supports).
 */
interface CounterState {
  storage: { get<T>(key: string): Promise<T | undefined>; put<T>(key: string, value: T): Promise<void> };
  blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T>;
}

export class ViewCounter {
  private count: number | undefined;

  constructor(private readonly state: CounterState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (this.count === undefined) {
      await this.state.blockConcurrencyWhile(async () => {
        this.count = (await this.state.storage.get<number>('count')) ?? 0;
      });
    }
    if (url.pathname === '/hit') {
      this.count = (this.count ?? 0) + 1;
      await this.state.storage.put('count', this.count);
    }
    return Response.json({ count: this.count ?? 0 });
  }
}
