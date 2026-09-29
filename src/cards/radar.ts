import { renderSVG } from '../svg/renderer';
import { Theme } from '../themes';

export function renderRadarCard(languages: { name: string; count: number }[], theme: Theme, username: string, animate: boolean = false): string {
  const width = 480;
  const height = 320;
  const cx = width / 2;
  const cy = height / 2 + 20;
  const radius = 90;
  
  // Use top 5 languages minimum, 8 maximum
  const topLangs = languages.slice(0, Math.min(Math.max(languages.length, 3), 6));
  
  if (topLangs.length < 3) {
    return renderSVG(`
      <text x="${width/2}" y="${height/2}" text-anchor="middle" fill="${theme.muted}" font-family="${theme.fontFamily}">Not enough data for radar chart</text>
    `, { width, height, theme });
  }

  const maxCount = Math.max(...topLangs.map(l => l.count), 1);
  const numPoints = topLangs.length;
  const angleStep = (Math.PI * 2) / numPoints;

  // Background Web
  let webPolygons = '';
  for (let level = 1; level <= 4; level++) {
    const r = radius * (level / 4);
    let points = '';
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points += `${x},${y} `;
    }
    webPolygons += `<polygon points="${points.trim()}" fill="none" stroke="${theme.border}" stroke-width="1" />`;
  }

  // Axes and Labels
  let axes = '';
  let labels = '';
  topLangs.forEach((lang, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const xEdge = cx + radius * Math.cos(angle);
    const yEdge = cy + radius * Math.sin(angle);
    axes += `<line x1="${cx}" y1="${cy}" x2="${xEdge}" y2="${yEdge}" stroke="${theme.border}" stroke-width="1" />`;
    
    const xLabel = cx + (radius + 25) * Math.cos(angle);
    const yLabel = cy + (radius + 20) * Math.sin(angle);
    
    // Adjust text anchor based on x position
    let textAnchor = 'middle';
    if (Math.abs(Math.cos(angle)) > 0.1) {
      textAnchor = Math.cos(angle) > 0 ? 'start' : 'end';
    }

    labels += `<text x="${xLabel}" y="${yLabel}" text-anchor="${textAnchor}" fill="${theme.foreground}" font-size="12" font-family="${theme.fontFamily}" font-weight="600">${lang.name}</text>`;
  });

  // Data Polygon
  let dataPoints = '';
  topLangs.forEach((lang, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const val = lang.count / maxCount;
    // Don't let it go all the way to 0 to keep shape
    const r = radius * Math.max(val, 0.15); 
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    dataPoints += `${x},${y} `;
  });

  const dataPolygon = `
    <polygon points="${dataPoints.trim()}" fill="${theme.accent}66" stroke="${theme.accent}" stroke-width="2" class="${animate ? 'fade-in' : ''}" />
  `;

  // Draw points over data polygon
  let dataDots = '';
  topLangs.forEach((lang, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const val = lang.count / maxCount;
    const r = radius * Math.max(val, 0.15); 
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    dataDots += `<circle cx="${x}" cy="${y}" r="4" fill="${theme.background}" stroke="${theme.accent}" stroke-width="2" class="${animate ? 'fade-in' : ''}" />`;
  });

  const content = `
    <text x="25" y="35" font-weight="600" font-size="18" fill="${theme.accent}" font-family="${theme.fontFamily}">Tech Stack Radar</text>
    <text x="455" y="35" text-anchor="end" font-weight="400" font-size="14" fill="${theme.muted}" font-family="${theme.fontFamily}">@${username}</text>
    
    <g transform="translate(0, 10)">
      ${webPolygons}
      ${axes}
      ${dataPolygon}
      ${dataDots}
      ${labels}
    </g>
  `;

  return renderSVG(content, {
    width,
    height,
    theme,
    animate
  });
}
