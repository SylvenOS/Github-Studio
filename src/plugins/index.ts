/**
 * Third-party data providers merged into `/api/profile`.
 * To add one: implement `Plugin`, append it to `plugins`.
 */
export interface PluginData {
  provider: string;
  data: unknown;
  error?: string;
}

export interface Plugin {
  id: string;
  fetch(username: string, signal: AbortSignal): Promise<unknown>;
}

const getJson = async (url: string, signal: AbortSignal) => {
  const res = await fetch(url, { signal, headers: { 'User-Agent': 'GithubStudio (+https://sylvenos.com)' } });
  if (!res.ok) throw new Error(res.statusText || `HTTP ${res.status}`);
  return res.json() as Promise<any>;
};

export const plugins: Plugin[] = [
  {
    id: 'devto',
    async fetch(username, signal) {
      const articles = await getJson(`https://dev.to/api/articles?username=${encodeURIComponent(username)}`, signal);
      return {
        articleCount: articles.length,
        latestArticle: articles[0]?.title ?? null,
        totalReactions: articles.reduce((a: number, x: any) => a + (x.public_reactions_count ?? 0), 0)
      };
    }
  },
  {
    id: 'wakatime',
    async fetch(username, signal) {
      // requires the user to have public coding activity
      const { data } = await getJson(`https://wakatime.com/api/v1/users/${encodeURIComponent(username)}/stats`, signal);
      return {
        totalHours: Math.round((data.total_seconds / 3600) * 10) / 10,
        languages: (data.languages ?? []).map((l: any) => ({ name: l.name, percent: l.percent }))
      };
    }
  }
];

const PLUGIN_TIMEOUT_MS = 4000;

/** Runs the selected plugins in parallel; a failing plugin never fails the request. */
export async function runPlugins(username: string, ids?: string[]): Promise<Record<string, PluginData>> {
  const selected = ids ? plugins.filter((p) => ids.includes(p.id)) : plugins;
  const results = await Promise.all(
    selected.map(async (p): Promise<[string, PluginData]> => {
      try {
        return [p.id, { provider: p.id, data: await p.fetch(username, AbortSignal.timeout(PLUGIN_TIMEOUT_MS)) }];
      } catch (e) {
        return [p.id, { provider: p.id, data: null, error: e instanceof Error ? e.message : String(e) }];
      }
    })
  );
  return Object.fromEntries(results);
}
