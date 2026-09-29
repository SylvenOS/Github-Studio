import { renderSVG } from '../svg/renderer';
import { Theme } from '../themes';

function getLanguageColor(lang: string | null): string {
  if (!lang) return '#8b949e';
  let hash = 0;
  for (let i = 0; i < lang.length; i++) {
    hash = lang.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777215)).toString(16);
  return '#' + '000000'.substring(0, 6 - color.length) + color;
}

export function renderLanguagesCard(languages: { name: string; count: number }[], theme: Theme, username: string): string {
  // Let's create a radar or bar chart. Since it's a list, a percentage bar is nice.
  const total = languages.reduce((acc, l) => acc + l.count, 0);
  
  // Top 5 languages
  const topLangs = languages.slice(0, 5);
  
  // Calculate percentages
  const parsedLangs = topLangs.map(l => ({
    name: l.name,
    percent: total > 0 ? (l.count / total) * 100 : 0
  }));

  let barSvg = '';
  let currentX = 0;
  
  parsedLangs.forEach((l, i) => {
    const width = (l.percent / 100) * 360; // total bar width is 360
    barSvg += `<rect x="${currentX}" y="0" width="${width}" height="12" fill="${getLanguageColor(l.name)}" />`;
    currentX += width;
  });

  let legendSvg = '';
  parsedLangs.forEach((l, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col * 180;
    const y = row * 30;
    
    legendSvg += `
      <g transform="translate(${x}, ${y})">
        <circle cx="6" cy="6" r="6" fill="${getLanguageColor(l.name)}" />
        <text x="20" y="10" class="stat-value" font-size="13">${l.name}</text>
        <text x="140" y="10" class="stat-label" text-anchor="end">${l.percent.toFixed(1)}%</text>
      </g>
    `;
  });

  const content = `
    <!-- Header -->
    <text x="25" y="35" class="header">Top Languages</text>
    <text x="415" y="35" class="stat-label" text-anchor="end">@${username}</text>
    
    <!-- Progress Bar -->
    <g transform="translate(40, 70)">
      <clipPath id="barClip">
        <rect x="0" y="0" width="360" height="12" rx="6" />
      </clipPath>
      <g clip-path="url(#barClip)">
        ${barSvg}
      </g>
    </g>

    <!-- Legend -->
    <g transform="translate(40, 110)">
      ${legendSvg}
    </g>
  `;

  return renderSVG(content, {
    width: 440,
    height: 120 + Math.ceil(parsedLangs.length / 2) * 30 + 10,
    theme
  });
}
