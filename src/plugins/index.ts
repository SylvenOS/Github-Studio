// v1.6 Plugins Architecture

export interface PluginData {
  provider: string;
  data: any;
  error?: string;
}

export class PluginEngine {
  async fetchDevToData(username: string): Promise<PluginData> {
    try {
      const res = await fetch(`https://dev.to/api/articles?username=${username}`);
      if (!res.ok) {
        return { provider: 'dev.to', data: null, error: res.statusText };
      }
      const articles = await res.json();
      return { 
        provider: 'dev.to', 
        data: { 
          articleCount: articles.length,
          latestArticle: articles.length > 0 ? articles[0].title : null
        } 
      };
    } catch (e) {
      return { provider: 'dev.to', data: null, error: String(e) };
    }
  }

  async fetchWakaTimeData(username: string): Promise<PluginData> {
    try {
      // WakaTime requires the user to have their coding activity public.
      const res = await fetch(`https://wakatime.com/api/v1/users/${username}/stats`);
      if (!res.ok) {
        return { provider: 'wakatime', data: null, error: res.statusText };
      }
      const stats = await res.json();
      return { 
        provider: 'wakatime', 
        data: { 
          totalHours: stats.data.total_seconds / 3600,
          languages: stats.data.languages.map((l: any) => ({ name: l.name, percent: l.percent }))
        } 
      };
    } catch (e) {
      return { provider: 'wakatime', data: null, error: String(e) };
    }
  }
}
