export interface GitHubProfile {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string | null;
  followers: number;
  following: number;
  publicRepositories: number;
  pullRequests: number;
  commits: number;
  contributions: number;
  issues: number;
  reviews: number;
}


export interface GitHubRepository {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
}

export class GitHubClient {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  async getProfile(username: string): Promise<GitHubProfile> {
    const headers: Record<string, string> = {
      'User-Agent': 'github-stats-app'
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`https://api.github.com/users/${username}`, { headers });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch user data for ${username}: ${res.statusText}`);
    }
    
    const data = await res.json();

    let pullRequests = 0;
    let commits = 0;
    let contributions = 0;
    let issues = 0;
    let reviews = 0;

    try {
      const prRes = await fetch(`https://api.github.com/search/issues?q=author:${username}+type:pr`, { headers });
      if (prRes.ok) {
        const prData = await prRes.json();
        pullRequests = prData.total_count || 0;
      }

      const issueRes = await fetch(`https://api.github.com/search/issues?q=author:${username}+type:issue`, { headers });
      if (issueRes.ok) {
        const issueData = await issueRes.json();
        issues = issueData.total_count || 0;
      }

      const reviewRes = await fetch(`https://api.github.com/search/issues?q=reviewed-by:${username}`, { headers });
      if (reviewRes.ok) {
        const reviewData = await reviewRes.json();
        reviews = reviewData.total_count || 0;
      }

      const commitRes = await fetch(`https://api.github.com/search/commits?q=author:${username}`, { 
        headers: { ...headers, 'Accept': 'application/vnd.github.cloak-preview+json' } 
      });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        commits = commitData.total_count || 0;
      }

      const profileRes = await fetch(`https://github.com/users/${username}/contributions`);
      if (profileRes.ok) {
        const profileHtml = await profileRes.text();
        const match = profileHtml.match(/([0-9,]+)\s+contributions\s+in\s+the\s+last\s+year/);
        if (match) {
          contributions = parseInt(match[1].replace(/,/g, ''), 10);
        }
      }
    } catch (e) {
      console.error("Failed to fetch extended stats for", username, e);
    }

    return {
      username: data.login,
      name: data.name || data.login,
      avatarUrl: data.avatar_url,
      bio: data.bio || null,
      followers: data.followers,
      following: data.following,
      publicRepositories: data.public_repos,
      pullRequests,
      commits,
      contributions,
      issues,
      reviews
    };
  }

  async getLanguages(username: string): Promise<{ name: string; count: number }[]> {
    const headers: Record<string, string> = {
      'User-Agent': 'gitpulse-app'
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch repos for ${username}`);

    const repos = await res.json();
    const languageCounts: Record<string, number> = {};

    for (const repo of repos) {
      if (repo.language && !repo.fork) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    }

    // Sort by count descending
    return Object.entries(languageCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getContributionsGraph(username: string): Promise<{ date: string; level: number; count: number }[]> {
    const headers: Record<string, string> = {
      'User-Agent': 'gitpulse-app'
    };
    const res = await fetch(`https://github.com/users/${username}/contributions`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch contributions for ${username}`);
    
    const html = await res.text();
    // GitHub's SVG graph uses data-date and data-level attributes on table cells or rects
    const regex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d+)"/g;
    
    const days: { date: string; level: number; count: number }[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      days.push({
        date: match[1],
        level: parseInt(match[2], 10),
        // For accurate count, we'd need to parse the tooltips or other attributes,
        // but level > 0 indicates > 0 contributions.
        count: parseInt(match[2], 10) > 0 ? 1 : 0
      });
    }

    return days.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getRepository(username: string, repo: string): Promise<any> {
    const headers: Record<string, string> = {
      'User-Agent': 'gitpulse-app'
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`https://api.github.com/repos/${username}/${repo}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch repo ${username}/${repo}`);
    
    return await res.json();
  }

  async getTopRepositories(username: string, limit: number = 5): Promise<GitHubRepository[]> {
    const headers: Record<string, string> = {
      'User-Agent': 'gitpulse-app'
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch top repos for ${username}`);
    
    const repos = await res.json();
    
    // Sort by stars descending, then by forks
    const sorted = repos
      .filter((r: any) => !r.fork) // Exclude forks
      .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count || b.forks_count - a.forks_count);
      
    return sorted.slice(0, limit).map((r: any) => ({
      name: r.name,
      description: r.description,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language
    }));
  }
}

