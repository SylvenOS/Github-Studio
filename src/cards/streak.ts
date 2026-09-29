import { renderSVG } from '../svg/renderer';
import { Theme } from '../themes';

export function renderStreakCard(
  days: { date: string; level: number; count: number }[],
  totalContributions: number,
  theme: Theme,
  username: string,
  animate: boolean = false
): string {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate streaks
  for (const day of days) {
    if (day.level > 0) {
      tempStreak += 1;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }
  
  // Current streak (checking from the end)
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].level > 0) {
      currentStreak += 1;
    } else {
      // If today is 0, we can still have a streak up to yesterday.
      // If yesterday is also 0, streak is 0.
      if (i !== days.length - 1) {
        break;
      }
    }
  }

  const content = `
    <!-- Top Row -->
    <text x="25" y="35" font-weight="600" font-size="16" fill="${theme.accent}" font-family="${theme.fontFamily}">GitHub Streak</text>
    <text x="415" y="35" font-weight="400" font-size="13" fill="${theme.muted}" font-family="${theme.fontFamily}" text-anchor="end">@${username}</text>
    
    <!-- Three Stats -->
    <g transform="translate(25, 80)">
      <!-- Total Contributions -->
      <g transform="translate(0, 0)" class="${animate ? 'fade-in' : ''}">
        <text x="50" y="0" text-anchor="middle" font-weight="700" font-size="28" fill="${theme.foreground}" font-family="${theme.fontFamily}">${totalContributions.toLocaleString()}</text>
        <text x="50" y="22" text-anchor="middle" font-weight="500" font-size="11" fill="${theme.muted}" font-family="${theme.fontFamily}">Total Contribs</text>
      </g>
      
      <!-- Divider -->
      <line x1="120" y1="-15" x2="120" y2="35" stroke="${theme.border}" stroke-width="1" />
      
      <!-- Current Streak -->
      <g transform="translate(150, 0)" class="${animate ? 'fade-in pulse' : ''}">
        <path d="M5.5 0C5.5 0 1.5 3.5 1.5 6.5C1.5 8.7 3.3 10.5 5.5 10.5C7.7 10.5 9.5 8.7 9.5 6.5C9.5 3.5 5.5 0 5.5 0ZM5.5 8.5C4.4 8.5 3.5 7.6 3.5 6.5C3.5 5.2 5.5 2.5 5.5 2.5C5.5 2.5 7.5 5.2 7.5 6.5C7.5 7.6 6.6 8.5 5.5 8.5Z" fill="${theme.accent}" transform="translate(50, -20) scale(1.5)" />
        <text x="35" y="0" text-anchor="end" font-weight="800" font-size="28" fill="${theme.accent}" font-family="${theme.fontFamily}">${currentStreak}</text>
        <text x="50" y="22" text-anchor="middle" font-weight="500" font-size="11" fill="${theme.muted}" font-family="${theme.fontFamily}">Current Streak</text>
      </g>
      
      <!-- Divider -->
      <line x1="270" y1="-15" x2="270" y2="35" stroke="${theme.border}" stroke-width="1" />

      <!-- Longest Streak -->
      <g transform="translate(300, 0)" class="${animate ? 'fade-in' : ''}">
        <text x="45" y="0" text-anchor="middle" font-weight="700" font-size="28" fill="${theme.foreground}" font-family="${theme.fontFamily}">${longestStreak}</text>
        <text x="45" y="22" text-anchor="middle" font-weight="500" font-size="11" fill="${theme.muted}" font-family="${theme.fontFamily}">Longest Streak</text>
      </g>
    </g>
  `;

  return renderSVG(content, {
    width: 440,
    height: 140,
    theme,
    animate
  });
}
