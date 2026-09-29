import { renderSVG } from '../svg/renderer';
import { Theme } from '../themes';

export function renderContributionsCard(
  days: { date: string; level: number; count: number }[],
  theme: Theme,
  username: string
): string {
  const boxSize = 10;
  const gap = 3;
  const columns = Math.ceil(days.length / 7);
  const width = 40 + columns * (boxSize + gap) + 20;
  const height = 60 + 7 * (boxSize + gap) + 30;
  
  let rectsSvg = '';
  
  // To draw correctly, we assume the days array is sorted chronologically.
  // The first day might not be a Sunday. Let's find the day of the week of the first day.
  const firstDay = new Date(days[0].date);
  let currentDayOfWeek = firstDay.getUTCDay();
  let currentWeek = 0;
  
  for (const day of days) {
    const x = currentWeek * (boxSize + gap);
    const y = currentDayOfWeek * (boxSize + gap);
    
    // Determine color based on level
    let fill = theme.border;
    if (day.level === 1) fill = `${theme.accent}66`; // 40%
    if (day.level === 2) fill = `${theme.accent}99`; // 60%
    if (day.level === 3) fill = `${theme.accent}CC`; // 80%
    if (day.level === 4) fill = `${theme.accent}`;   // 100%
    if (day.level === 0) fill = `${theme.foreground}1A`; // 10%

    rectsSvg += `<rect x="${x}" y="${y}" width="${boxSize}" height="${boxSize}" rx="2" fill="${fill}" />`;
    
    currentDayOfWeek++;
    if (currentDayOfWeek > 6) {
      currentDayOfWeek = 0;
      currentWeek++;
    }
  }

  const content = `
    <!-- Top Row -->
    <text x="25" y="35" font-weight="600" font-size="16" fill="${theme.accent}" font-family="${theme.fontFamily}">Contribution Graph</text>
    <text x="${width - 25}" y="35" font-weight="400" font-size="13" fill="${theme.muted}" font-family="${theme.fontFamily}" text-anchor="end">@${username}</text>
    
    <!-- Graph -->
    <g transform="translate(25, 60)">
      ${rectsSvg}
    </g>
  `;

  return renderSVG(content, { width, height, theme });
}
