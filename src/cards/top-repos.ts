import { renderSVG } from '../svg/renderer';
import { Theme } from '../themes';
import { GitHubRepository } from '../github/client';

// Simple hash function for language colors
function getLanguageColor(lang: string | null): string {
  if (!lang) return '#8b949e';
  let hash = 0;
  for (let i = 0; i < lang.length; i++) {
    hash = lang.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777215)).toString(16);
  return '#' + '000000'.substring(0, 6 - color.length) + color;
}

export function renderTopReposCard(repos: GitHubRepository[], theme: Theme, animate: boolean = false): string {
  const width = 480;
  const padding = 25;
  const headerHeight = 50;
  const repoHeight = 85;
  const height = headerHeight + (repos.length * repoHeight) + padding;

  let content = `
    <!-- Header -->
    <text x="${padding}" y="35" font-weight="600" font-size="18" fill="${theme.accent}" font-family="${theme.fontFamily}">Top Repositories</text>
  `;

  repos.forEach((repo, index) => {
    const yOffset = headerHeight + (index * repoHeight);
    
    // Truncate description
    let desc = repo.description || 'No description provided.';
    if (desc.length > 60) {
      desc = desc.substring(0, 57) + '...';
    }

    const langColor = getLanguageColor(repo.language);

    content += `
      <g transform="translate(${padding}, ${yOffset})" class="${animate ? 'fade-in' : ''}" style="animation-delay: ${index * 150}ms">
        <rect x="0" y="0" width="${width - padding * 2}" height="75" rx="${theme.borderRadius}" fill="${theme.background}" stroke="${theme.border}" stroke-width="1" />
        
        <!-- Repo Name -->
        <text x="15" y="25" font-weight="600" font-size="14" fill="${theme.foreground}" font-family="${theme.fontFamily}">${repo.name}</text>
        
        <!-- Repo Description -->
        <text x="15" y="45" font-weight="400" font-size="12" fill="${theme.muted}" font-family="${theme.fontFamily}">${desc}</text>
        
        <!-- Language -->
        <circle cx="19" cy="61" r="4" fill="${langColor}" />
        <text x="28" y="65" font-weight="400" font-size="11" fill="${theme.foreground}" font-family="${theme.fontFamily}">${repo.language || 'Unknown'}</text>
        
        <!-- Stars -->
        <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" fill="${theme.muted}" transform="translate(100, 56) scale(0.8)" />
        <text x="115" y="65" font-weight="400" font-size="11" fill="${theme.muted}" font-family="${theme.fontFamily}">${repo.stars.toLocaleString()}</text>
        
        <!-- Forks -->
        <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" fill="${theme.muted}" transform="translate(150, 56) scale(0.8)" />
        <text x="165" y="65" font-weight="400" font-size="11" fill="${theme.muted}" font-family="${theme.fontFamily}">${repo.forks.toLocaleString()}</text>
      </g>
    `;
  });

  return renderSVG(content, {
    width,
    height,
    theme,
    animate
  });
}
