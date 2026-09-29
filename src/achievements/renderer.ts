import { Trophy, TrophyRank } from './engine';
import { Theme } from '../themes';
import { renderSVG } from '../svg/renderer';

function getRankColor(rank: TrophyRank): string {
  switch (rank) {
    case 'SSS+': return '#ff003c'; // Vibrant Red
    case 'SSS': return '#ff4500';  // OrangeRed
    case 'SS': return '#ff8c00';   // DarkOrange
    case 'S': return '#ffd700';    // Gold
    case 'A': return '#32cd32';    // LimeGreen
    case 'B': return '#1e90ff';    // DodgerBlue
    case 'C': return '#9370db';    // MediumPurple
    case 'D': return '#a9a9a9';    // DarkGray
    case 'E':
    default:
      return '#696969';            // DimGray
  }
}

function getTrophyShape(rank: TrophyRank, color: string, bg: string): string {
  if (rank === 'SSS+' || rank === 'SSS') {
    // Intricate Diamond / Starburst
    return `
      <polygon points="70,10 105,40 90,85 50,85 35,40" fill="${bg}" stroke="${color}" stroke-width="3" filter="drop-shadow(0 0 10px ${color}88)" />
      <polygon points="70,18 95,43 83,78 57,78 45,43" fill="none" stroke="${color}" stroke-width="2" opacity="0.8" />
      <circle cx="70" cy="50" r="38" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="4 4" opacity="0.5" />
      <polygon points="70,25 85,48 70,70 55,48" fill="none" stroke="${color}" stroke-width="1.5" />
    `;
  } else if (rank === 'SS' || rank === 'S') {
    // Elegant Shield
    return `
      <path d="M40 20 L70 10 L100 20 L100 50 C100 75 70 90 70 90 C70 90 40 75 40 50 Z" fill="${bg}" stroke="${color}" stroke-width="3.5" filter="drop-shadow(0 0 8px ${color}66)" />
      <path d="M48 26 L70 18 L92 26 L92 48 C92 68 70 80 70 80 C70 80 48 68 48 48 Z" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.7" />
      <line x1="70" y1="18" x2="70" y2="80" stroke="${color}" stroke-width="1" opacity="0.4" />
    `;
  } else if (rank === 'A' || rank === 'B') {
    // Classic Hexagon
    return `
      <polygon points="70,15 100,32 100,68 70,85 40,68 40,32" fill="${bg}" stroke="${color}" stroke-width="3" filter="drop-shadow(0 0 6px ${color}55)" />
      <polygon points="70,22 92,35 92,65 70,78 48,65 48,35" fill="none" stroke="${color}" stroke-width="1" opacity="0.6" />
    `;
  } else {
    // Modern Circle
    return `
      <circle cx="70" cy="50" r="35" fill="${bg}" stroke="${color}" stroke-width="3" filter="drop-shadow(0 0 4px ${color}44)" />
      <circle cx="70" cy="50" r="28" fill="none" stroke="${color}" stroke-width="1" opacity="0.6" />
      <circle cx="70" cy="50" r="40" fill="none" stroke="${color}" stroke-width="0.5" stroke-dasharray="2 4" />
    `;
  }
}

export function renderTrophiesCard(trophies: Trophy[], theme: Theme): string {
  const padding = 30;
  const itemWidth = 140;
  const itemHeight = 150;
  const cols = 3;
  const rows = Math.ceil(trophies.length / cols);
  const width = cols * itemWidth + padding * 2;
  const height = rows * itemHeight + padding * 2 + 20;

  let trophiesSvg = '';
  
  trophies.forEach((trophy, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = padding + col * itemWidth;
    const y = padding + row * itemHeight + 30;
    const color = getRankColor(trophy.rank);
    
    trophiesSvg += `
      <g transform="translate(${x}, ${y})">
        ${getTrophyShape(trophy.rank, color, theme.background)}
        
        <!-- Rank Text -->
        <text x="70" y="58" text-anchor="middle" font-weight="900" font-size="24" fill="${color}" font-family="${theme.fontFamily}">${trophy.rank}</text>
        
        <!-- Trophy Title -->
        <text x="70" y="115" text-anchor="middle" font-weight="700" font-size="13" fill="${theme.foreground}" font-family="${theme.fontFamily}">${trophy.title}</text>
        
        <!-- Value -->
        <text x="70" y="135" text-anchor="middle" font-weight="500" font-size="12" fill="${theme.muted}" font-family="${theme.fontFamily}">${trophy.value.toLocaleString()} ${trophy.type}</text>
      </g>
    `;
  });

  const content = `
    <!-- Filters for Glows -->
    <defs>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${theme.accent}" />
        <stop offset="100%" stop-color="${theme.foreground}" />
      </linearGradient>
    </defs>

    <text x="${padding + 10}" y="45" font-weight="800" font-size="22" fill="url(#headerGrad)" font-family="${theme.fontFamily}">GitHub Achievements</text>
    
    <g>
      ${trophiesSvg}
    </g>
  `;

  return renderSVG(content, { width, height, theme });
}
