import { renderSVG } from '../svg/renderer';
import { ProfileMetrics } from '../metrics';
import { Theme } from '../themes';

export function renderStatsCard(metrics: ProfileMetrics, theme: Theme, animate: boolean = false, layout: string = 'grid', showIcons: boolean = false): string {
  const f = (n: number) => n.toLocaleString();
  const now = new Date();
  const timeStr = `${now.getUTCDate()} ${now.toLocaleString('en-US', { month: 'short' })} ${now.getUTCFullYear()}`;

  let content = '';
  let height = 220;

  if (layout === 'compact') {
    height = 120;
    content = `
      <text x="25" y="35" class="header">GitHub Stats</text>
      <text x="455" y="35" class="stat-label" text-anchor="end">@${metrics.username}</text>
      
      <g transform="translate(25, 75)" class="${animate ? 'fade-in' : ''}">
        ${showIcons ? `<path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 11-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1h-8a1 1 0 00-1 1v6.708A2.486 2.486 0 014.5 9h8V1.5z" fill="${theme.accent}" transform="translate(0, -12)" />` : ''}
        <text x="${showIcons ? '20' : '0'}" y="0" class="stat-value">${f(metrics.repositories)}</text>
        <text x="0" y="20" class="stat-label">Repos</text>
      </g>
      <g transform="translate(135, 75)" class="${animate ? 'fade-in' : ''}">
        ${showIcons ? `<path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" fill="${theme.accent}" transform="translate(0, -12)" />` : ''}
        <text x="${showIcons ? '20' : '0'}" y="0" class="stat-value">${f(metrics.stars)}</text>
        <text x="0" y="20" class="stat-label">Stars</text>
      </g>
      <g transform="translate(245, 75)" class="${animate ? 'fade-in' : ''}">
        <text x="0" y="0" class="stat-value">${f(metrics.pullRequests || 0)}</text>
        <text x="0" y="20" class="stat-label">PRs</text>
      </g>
      <g transform="translate(355, 75)" class="${animate ? 'fade-in' : ''}">
        <text x="0" y="0" class="stat-value">${f(metrics.contributions || 0)}</text>
        <text x="0" y="20" class="stat-label">Contribs</text>
      </g>
    `;
  } else if (layout === 'minimal') {
    height = 80;
    content = `
      <text x="25" y="45" font-weight="600" font-size="14" fill="${theme.accent}" font-family="${theme.fontFamily}">@${metrics.username}</text>
      <g transform="translate(140, 45)" class="${animate ? 'fade-in' : ''}" font-size="14" font-family="${theme.fontFamily}" fill="${theme.foreground}">
        <text x="0" y="0">Repos: <tspan font-weight="bold">${f(metrics.repositories)}</tspan></text>
        <text x="100" y="0">Stars: <tspan font-weight="bold">${f(metrics.stars)}</tspan></text>
        <text x="200" y="0">PRs: <tspan font-weight="bold">${f(metrics.pullRequests || 0)}</tspan></text>
      </g>
    `;
  } else {
    // Default Grid Layout
    content = `
      <!-- Header -->
      <text x="25" y="35" class="header">GitHub Stats</text>
      <text x="455" y="35" class="stat-label" text-anchor="end">@${metrics.username}</text>
      
      <!-- Row 1 -->
      <g transform="translate(25, 75)" class="${animate ? 'fade-in' : ''}">
        ${showIcons ? `<path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 11-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1h-8a1 1 0 00-1 1v6.708A2.486 2.486 0 014.5 9h8V1.5z" fill="${theme.accent}" transform="translate(0, -12)" />` : ''}
        <text x="${showIcons ? '20' : '0'}" y="0" class="stat-value">${f(metrics.repositories)}</text>
        <text x="0" y="20" class="stat-label">Repositories</text>
      </g>
      <g transform="translate(135, 75)" class="${animate ? 'fade-in' : ''}">
        ${showIcons ? `<path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" fill="${theme.accent}" transform="translate(0, -12)" />` : ''}
        <text x="${showIcons ? '20' : '0'}" y="0" class="stat-value">${f(metrics.stars)}</text>
        <text x="0" y="20" class="stat-label">Stars</text>
      </g>
      <g transform="translate(245, 75)" class="${animate ? 'fade-in' : ''}">
        ${showIcons ? `<path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" fill="${theme.accent}" transform="translate(0, -12)" />` : ''}
        <text x="${showIcons ? '20' : '0'}" y="0" class="stat-value">${f(metrics.forks)}</text>
        <text x="0" y="20" class="stat-label">Forks</text>
      </g>
      <g transform="translate(355, 75)" class="${animate ? 'fade-in' : ''}">
        ${showIcons ? `<path d="M12 5.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4-2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM2.617 12.391a.75.75 0 0 1 .158-.293C4.197 10.334 6.002 9.5 8 9.5c1.998 0 3.803.834 5.225 2.598.083.102.131.218.158.293A.25.25 0 0 1 13.146 12.5H2.854a.25.25 0 0 1-.237-.109ZM8 8c-2.348 0-4.502.993-6.237 2.871A1.75 1.75 0 0 0 3 14h10a1.75 1.75 0 0 0 1.237-3.129C12.502 8.993 10.348 8 8 8Z" fill="${theme.accent}" transform="translate(0, -12)" />` : ''}
        <text x="${showIcons ? '20' : '0'}" y="0" class="stat-value">${f(metrics.followers)}</text>
        <text x="0" y="20" class="stat-label">Followers</text>
      </g>

      <!-- Divider 1 -->
      <line x1="25" y1="110" x2="455" y2="110" stroke="${theme.border}" stroke-width="1" class="${animate ? 'fade-in' : ''}" />

      <!-- Row 2 -->
      <g transform="translate(25, 140)" class="${animate ? 'fade-in' : ''}">
        <text x="0" y="0" class="stat-value">${f(metrics.contributions || 0)}</text>
        <text x="0" y="20" class="stat-label">Contributions</text>
      </g>
      <g transform="translate(135, 140)" class="${animate ? 'fade-in' : ''}">
        <text x="0" y="0" class="stat-value">${f(metrics.pullRequests || 0)}</text>
        <text x="0" y="20" class="stat-label">Pull Requests</text>
      </g>
      <g transform="translate(245, 140)" class="${animate ? 'fade-in' : ''}">
        <text x="0" y="0" class="stat-value">${f(metrics.issues || 0)}</text>
        <text x="0" y="20" class="stat-label">Issues</text>
      </g>
      <g transform="translate(355, 140)" class="${animate ? 'fade-in' : ''}">
        <text x="0" y="0" class="stat-value">${f(metrics.reviews || 0)}</text>
        <text x="0" y="20" class="stat-label">Reviews</text>
      </g>

      <!-- Divider 2 -->
      <line x1="25" y1="175" x2="455" y2="175" stroke="${theme.border}" stroke-width="1" />

      <!-- Footer -->
      <text x="25" y="200" class="stat-label">Updated ${timeStr}</text>
      <text x="455" y="200" class="stat-label" text-anchor="end">GitPulse v2.0</text>
    `;
  }

  return renderSVG(content, {
    width: 480,
    height,
    theme,
    animate
  });
}
