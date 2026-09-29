import { Hono } from 'hono';
import { GitHubClient } from './github/client';
import { calculateProfileMetrics } from './metrics';
import { parseCardConfig } from './config/parser';
import { renderStatsCard } from './cards/stats';
import { renderLanguagesCard } from './cards/languages';
import { renderStreakCard } from './cards/streak';
import { renderContributionsCard } from './cards/contributions';
import { renderRepoCard } from './cards/repo';
import { renderTopReposCard } from './cards/top-repos';
import { renderRadarCard } from './cards/radar';
import { calculateTrophies } from './achievements/engine';
import { renderTrophiesCard } from './achievements/renderer';
import { themes } from './themes';
import { PluginEngine } from './plugins';

const app = new Hono();
const plugins = new PluginEngine();

function getGitHubClient(c: any) {
  const token = (c.env?.GITHUB_TOKEN) || (typeof process !== 'undefined' ? process.env?.GITHUB_TOKEN : undefined);
  return new GitHubClient(token);
}

// Serve Live Playground
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitPulse - Live Playground</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; display: flex; height: 100vh; margin: 0; }
        .sidebar { width: 320px; background: #161b22; padding: 20px; border-right: 1px solid #30363d; overflow-y: auto; }
        .preview { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #010409; padding: 40px; }
        h1 { font-size: 24px; margin-top: 0; color: #58a6ff; }
        .form-group { margin-bottom: 15px; }
        label { display: block; font-size: 14px; margin-bottom: 5px; font-weight: 600; }
        input[type="text"], select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #30363d; background: #0d1117; color: #c9d1d9; box-sizing: border-box; margin-bottom: 5px; }
        .toggle-group { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
        input[type="checkbox"] { margin: 0; }
        .url-bar { width: 100%; max-width: 800px; padding: 12px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; font-family: monospace; color: #8b949e; margin-bottom: 30px; word-break: break-all; }
        .image-container { box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 10px; overflow: hidden; background: #fff; }
        .hint { font-size: 12px; color: #8b949e; }
    </style>
</head>
<body>
    <div class="sidebar">
        <h1>GitPulse API</h1>
        
        <div class="form-group">
            <label>GitHub Username</label>
            <input type="text" id="username" value="torvalds" placeholder="e.g. torvalds">
        </div>

        <div class="form-group">
            <label>Widget Type</label>
            <select id="widget">
                <option value="stats">Stats Overview</option>
                <option value="languages">Top Languages</option>
                <option value="streak">Contribution Streak</option>
                <option value="achievements">Trophies</option>
                <option value="contributions">Contributions Heatmap</option>
                <option value="repos">Repository Pin</option>
                <option value="top-repos">Top Repositories</option>
                <option value="radar">Tech Stack Radar</option>
            </select>
        </div>
        
        <div class="form-group" id="repoGroup" style="display:none;">
            <label>Repository Name</label>
            <input type="text" id="repo" value="linux" placeholder="e.g. react">
        </div>

        <div class="form-group">
            <label>Theme</label>
            <select id="theme">
                <option value="default">Default Dark</option>
                <option value="dark">True Black</option>
                <option value="sylven">Sylven (Purple)</option>
                <option value="dracula">Dracula</option>
                <option value="monokai">Monokai</option>
                <option value="radical">Radical</option>
                <option value="tokyonight">Tokyo Night</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="neon">Neon</option>
            </select>
        </div>

        <div class="form-group">
            <label>Layout Structure</label>
            <select id="layout">
                <option value="grid">Grid (Default)</option>
                <option value="compact">Compact</option>
                <option value="minimal">Minimal</option>
            </select>
        </div>

        <div class="form-group toggle-group">
            <input type="checkbox" id="animation" checked>
            <label style="margin:0;">Enable CSS Animations</label>
        </div>

        <div class="form-group toggle-group">
            <input type="checkbox" id="show_icons">
            <label style="margin:0;">Show SVG Icons</label>
        </div>
    </div>
    
    <div class="preview">
        <div class="url-bar" id="urlDisplay">/api/stats?username=torvalds</div>
        <div class="image-container">
            <img id="previewImg" src="/api/stats?username=torvalds" alt="Preview">
        </div>
    </div>

    <script>
        const inputs = ['username', 'widget', 'repo', 'theme', 'layout', 'animation', 'show_icons'];
        const widget = document.getElementById('widget');
        const repoGroup = document.getElementById('repoGroup');
        const previewImg = document.getElementById('previewImg');
        const urlDisplay = document.getElementById('urlDisplay');

        function updatePreview() {
            const username = document.getElementById('username').value;
            if (!username) return;

            const w = widget.value;
            let url = \`/api/\${w}?username=\${encodeURIComponent(username)}\`;
            
            if (w === 'repos') {
                const repo = document.getElementById('repo').value || 'repo';
                url += \`&repo=\${encodeURIComponent(repo)}\`;
            }

            const theme = document.getElementById('theme').value;
            if (theme !== 'default') url += \`&theme=\${theme}\`;
            
            const layout = document.getElementById('layout').value;
            if (layout !== 'grid') url += \`&layout=\${layout}\`;
            
            if (!document.getElementById('animation').checked) url += '&animation=false';
            if (document.getElementById('show_icons').checked) url += '&show_icons=true';

            urlDisplay.innerText = url;
            previewImg.src = url;
        }

        widget.addEventListener('change', (e) => {
            repoGroup.style.display = e.target.value === 'repos' ? 'block' : 'none';
            updatePreview();
        });

        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', updatePreview);
            document.getElementById(id).addEventListener('change', updatePreview);
        });
        
        // Initial load
        updatePreview();
    </script>
</body>
</html>
  `);
});

// v0.1 - Health
app.get('/api/health', (c) => c.json({ status: 'ok', version: '2.0.0' }));

// v0.2 to v0.8 - Stats Card
app.get('/api/stats', async (c) => {
  const query = c.req.query();
  const config = parseCardConfig(query);

  if (!config.username) return c.json({ error: 'Username is required' }, 400);

  try {
    const github = getGitHubClient(c);
    const profile = await github.getProfile(config.username);
    const metrics = calculateProfileMetrics(profile);
    
    let theme = { ...(themes[config.theme] || themes.default) };
    if (config.radius !== null) theme.borderRadius = config.radius;
    if (config.customization?.background) theme.background = config.customization.background;
    if (config.customization?.foreground) theme.foreground = config.customization.foreground;
    if (config.customization?.accent) theme.accent = config.customization.accent;
    if (config.customization?.border) theme.border = config.customization.border;
    if (config.customization?.muted) theme.muted = config.customization.muted;

    const svg = renderStatsCard(metrics, theme, config.animation, config.layout, config.showIcons);

    return c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=1800'
    });
  } catch (error: any) {
    console.error('Stats Endpoint Error:', error);
    return c.json({ error: error.message || 'Failed to generate card' }, 500);
  }
});

// v1.1 - Achievements Endpoint
app.get('/api/achievements', async (c) => {
  const query = c.req.query();
  const config = parseCardConfig(query);

  if (!config.username) return c.json({ error: 'Username is required' }, 400);

  try {
    const github = getGitHubClient(c);
    const profile = await github.getProfile(config.username);
    const metrics = calculateProfileMetrics(profile);
    const trophies = calculateTrophies(metrics);

    // If 'json' is requested, return JSON, otherwise SVG
    if (query.format === 'json') {
      return c.json(trophies);
    }

    let theme = { ...(themes[config.theme] || themes.default) };
    if (config.radius !== null) theme.borderRadius = config.radius;
    if (config.customization?.background) theme.background = config.customization.background;
    if (config.customization?.foreground) theme.foreground = config.customization.foreground;
    if (config.customization?.accent) theme.accent = config.customization.accent;
    if (config.customization?.border) theme.border = config.customization.border;
    if (config.customization?.muted) theme.muted = config.customization.muted;

    const svg = renderTrophiesCard(trophies, theme);

    return c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=1800'
    });
  } catch (error) {
    return c.json({ error: 'Failed to generate trophies' }, 500);
  }
});

// v1.x - Languages Endpoint
app.get('/api/languages', async (c) => {
  const query = c.req.query();
  const config = parseCardConfig(query);

  if (!config.username) return c.json({ error: 'Username is required' }, 400);

  try {
    const github = getGitHubClient(c);
    const languages = await github.getLanguages(config.username);
    
    let theme = { ...(themes[config.theme] || themes.default) };
    if (config.radius !== null) theme.borderRadius = config.radius;
    if (config.customization?.background) theme.background = config.customization.background;
    if (config.customization?.foreground) theme.foreground = config.customization.foreground;
    if (config.customization?.accent) theme.accent = config.customization.accent;
    if (config.customization?.border) theme.border = config.customization.border;
    if (config.customization?.muted) theme.muted = config.customization.muted;

    const svg = renderLanguagesCard(languages, theme, config.username);

    return c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=1800'
    });
  } catch (error) {
    return c.json({ error: 'Failed to generate languages card' }, 500);
  }
});

// v1.x - Streak Endpoint
app.get('/api/streak', async (c) => {
  const query = c.req.query();
  const config = parseCardConfig(query);

  if (!config.username) return c.json({ error: 'Username is required' }, 400);

  try {
    const github = getGitHubClient(c);
    // Fetch both profile (for total contributions) and graph (for streaks)
    const [profile, graph] = await Promise.all([
      github.getProfile(config.username),
      github.getContributionsGraph(config.username)
    ]);
    const metrics = calculateProfileMetrics(profile);
    
    let theme = { ...(themes[config.theme] || themes.default) };
    if (config.radius !== null) theme.borderRadius = config.radius;
    if (config.customization?.background) theme.background = config.customization.background;
    if (config.customization?.foreground) theme.foreground = config.customization.foreground;
    if (config.customization?.accent) theme.accent = config.customization.accent;
    if (config.customization?.border) theme.border = config.customization.border;
    if (config.customization?.muted) theme.muted = config.customization.muted;

    const svg = renderStreakCard(graph, metrics.contributions, theme, config.username, config.animation);

    return c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=1800'
    });
  } catch (error) {
    return c.json({ error: 'Failed to generate streak card' }, 500);
  }
});

// v1.x - Contributions Graph Endpoint
app.get('/api/contributions', async (c) => {
  const query = c.req.query();
  const config = parseCardConfig(query);

  if (!config.username) return c.json({ error: 'Username is required' }, 400);

  try {
    const github = getGitHubClient(c);
    const graph = await github.getContributionsGraph(config.username);
    
    let theme = { ...(themes[config.theme] || themes.default) };
    if (config.radius !== null) theme.borderRadius = config.radius;
    if (config.customization?.background) theme.background = config.customization.background;
    if (config.customization?.foreground) theme.foreground = config.customization.foreground;
    if (config.customization?.accent) theme.accent = config.customization.accent;
    if (config.customization?.border) theme.border = config.customization.border;
    if (config.customization?.muted) theme.muted = config.customization.muted;

    const svg = renderContributionsCard(graph, theme, config.username);

    return c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=1800'
    });
  } catch (error) {
    return c.json({ error: 'Failed to generate contributions card' }, 500);
  }
});

// v1.x - Repo Card Endpoint
app.get('/api/repos', async (c) => {
  const query = c.req.query();
  const config = parseCardConfig(query);

  if (!config.username) return c.json({ error: 'Username is required' }, 400);
  if (!config.repo) return c.json({ error: 'Repo parameter is required (e.g. &repo=github-stats)' }, 400);

  try {
    const github = getGitHubClient(c);
    const repo = await github.getRepository(config.username, config.repo);
    
    let theme = { ...(themes[config.theme] || themes.default) };
    if (config.radius !== null) theme.borderRadius = config.radius;
    if (config.customization?.background) theme.background = config.customization.background;
    if (config.customization?.foreground) theme.foreground = config.customization.foreground;
    if (config.customization?.accent) theme.accent = config.customization.accent;
    if (config.customization?.border) theme.border = config.customization.border;
    if (config.customization?.muted) theme.muted = config.customization.muted;

    const svg = renderRepoCard(repo, theme, config.animation);

    return c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=1800'
    });
  } catch (error) {
    console.error('Repo Endpoint Error:', error);
    return c.json({ error: 'Failed to generate repo card' }, 500);
  }
});

// v2.x - Top Repos Endpoint
app.get('/api/top-repos', async (c) => {
  const query = c.req.query();
  const config = parseCardConfig(query);
  const limit = parseInt(query.limit || '5', 10);

  if (!config.username) return c.json({ error: 'Username is required' }, 400);

  try {
    const github = getGitHubClient(c);
    const repos = await github.getTopRepositories(config.username, limit);
    
    let theme = { ...(themes[config.theme] || themes.default) };
    if (config.radius !== null) theme.borderRadius = config.radius;
    if (config.customization?.background) theme.background = config.customization.background;
    if (config.customization?.foreground) theme.foreground = config.customization.foreground;
    if (config.customization?.accent) theme.accent = config.customization.accent;
    if (config.customization?.border) theme.border = config.customization.border;
    if (config.customization?.muted) theme.muted = config.customization.muted;

    const svg = renderTopReposCard(repos, theme, config.animation);

    return c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=1800'
    });
  } catch (error: any) {
    console.error('Top Repos Error:', error);
    return c.json({ error: error.message || 'Failed to generate top repos card' }, 500);
  }
});

// v2.x - Radar Endpoint
app.get('/api/radar', async (c) => {
  const query = c.req.query();
  const config = parseCardConfig(query);

  if (!config.username) return c.json({ error: 'Username is required' }, 400);

  try {
    const github = getGitHubClient(c);
    const languages = await github.getLanguages(config.username);
    
    let theme = { ...(themes[config.theme] || themes.default) };
    if (config.radius !== null) theme.borderRadius = config.radius;
    if (config.customization?.background) theme.background = config.customization.background;
    if (config.customization?.foreground) theme.foreground = config.customization.foreground;
    if (config.customization?.accent) theme.accent = config.customization.accent;
    if (config.customization?.border) theme.border = config.customization.border;
    if (config.customization?.muted) theme.muted = config.customization.muted;

    const svg = renderRadarCard(languages, theme, config.username, config.animation);

    return c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=1800'
    });
  } catch (error: any) {
    console.error('Radar Error:', error);
    return c.json({ error: error.message || 'Failed to generate radar card' }, 500);
  }
});

// v1.6 & v2.0 - Developer Profile Platform Endpoint
app.get('/api/profile', async (c) => {
  const username = c.req.query('username');
  if (!username) return c.json({ error: 'Username is required' }, 400);

  try {
    const github = getGitHubClient(c);
    const profile = await github.getProfile(username);
    const metrics = calculateProfileMetrics(profile);
    const devTo = await plugins.fetchDevToData(username);
    const wakatime = await plugins.fetchWakaTimeData(username);

    return c.json({
      github: profile,
      metrics,
      plugins: {
        devTo,
        wakatime
      }
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

export default app;
