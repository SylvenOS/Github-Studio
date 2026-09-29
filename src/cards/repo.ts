import { renderSVG } from '../svg/renderer';
import { Theme } from '../themes';

export function renderRepoCard(repo: any, theme: Theme, animate: boolean = false): string {
  const f = (n: number) => n.toLocaleString();
  
  // Truncate description if too long
  let desc = repo.description || 'No description provided.';
  if (desc.length > 70) {
    desc = desc.substring(0, 67) + '...';
  }

  const content = `
    <g class="${animate ? 'fade-in' : ''}">
      <!-- Repo Name -->
      <text x="25" y="35" font-weight="700" font-size="20" fill="${theme.accent}" font-family="${theme.fontFamily}">${repo.name}</text>
      
      <!-- Description -->
      <text x="25" y="65" font-weight="400" font-size="14" fill="${theme.foreground}" font-family="${theme.fontFamily}">${desc}</text>
      
      <!-- Bottom Row Stats -->
      <g transform="translate(25, 105)">
        <!-- Language Color Dot & Text -->
        <circle cx="5" cy="-4" r="5" fill="${theme.accent}" />
        <text x="15" y="0" font-size="12" fill="${theme.muted}" font-family="${theme.fontFamily}">${repo.language || 'Unknown'}</text>
        
        <!-- Stars -->
        <g transform="translate(100, 0)">
          <text x="0" y="0" font-size="12" fill="${theme.muted}" font-family="${theme.fontFamily}">⭐ ${f(repo.stargazers_count)}</text>
        </g>
        
        <!-- Forks -->
        <g transform="translate(160, 0)">
          <text x="0" y="0" font-size="12" fill="${theme.muted}" font-family="${theme.fontFamily}">🍴 ${f(repo.forks_count)}</text>
        </g>

        <!-- Size -->
        <g transform="translate(220, 0)">
          <text x="0" y="0" font-size="12" fill="${theme.muted}" font-family="${theme.fontFamily}">📦 ${f(repo.size)} KB</text>
        </g>
      </g>
    </g>
  `;

  return renderSVG(content, {
    width: 400,
    height: 140,
    theme,
    animate
  });
}
