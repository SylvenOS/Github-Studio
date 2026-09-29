import { defineCard } from './types';
import { int } from '../core/params';
import { fmt } from '../core/text';
import { calendarYearRange } from '../github/client';
import { computeStreaks, type StreakStats } from '../metrics/streak';
import { anim, contentTop, frame } from '../svg/frame';
import { icon } from '../svg/icons';

interface Params {
  years: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2024-03-07" -> "Mar 7" (with year when not the current one). */
export function shortDate(iso: string | null, now = new Date()): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${y === now.getUTCFullYear() ? '' : `, ${y}`}`;
}

const range = (s: { start: string | null; end: string | null }) =>
  s.start ? (s.start === s.end ? shortDate(s.start) : `${shortDate(s.start)} - ${shortDate(s.end)}`) : '-';

export const streakCard = defineCard<Params, StreakStats>({
  id: 'streak',
  title: 'GitHub Streak',
  description: 'Total contributions plus current and longest daily streaks.',
  params: [{ name: 'years', type: 'number', default: 10, min: 1, max: 15, description: 'How many years of history to scan' }],
  parse: (q) => ({ years: int(q.years, 10, 1, 15) }),

  async load(client, p, common) {
    const user = await client.getUser(common.username);
    const now = new Date();
    const joined = user.createdAt ? new Date(user.createdAt).getUTCFullYear() : now.getUTCFullYear();
    const first = Math.max(joined, now.getUTCFullYear() - p.years + 1);
    const ranges = Array.from({ length: now.getUTCFullYear() - first + 1 }, (_, i) => calendarYearRange(first + i, now));
    return computeStreaks(await client.getCalendar(common.username, ranges));
  },

  render(s, _p, { theme, common, title }) {
    const header = title('GitHub Streak');
    const top = contentTop(!!header);
    const animate = common.animation;
    const y = top + 25;
    const col = (cx: number, value: string, label: string, sub: string, i: number, hot = false) =>
      `<g${anim(animate, i, hot ? 'pulse' : '')}>` +
      `<text x="${cx}" y="${y}" text-anchor="middle" font-size="28" font-weight="${hot ? 800 : 700}" class="${hot ? 'accent' : 'fg'}">${value}</text>` +
      `<text x="${cx}" y="${y + 22}" text-anchor="middle" font-size="11" font-weight="500" class="muted">${label}</text>` +
      `<text x="${cx}" y="${y + 38}" text-anchor="middle" font-size="10" class="muted">${sub}</text></g>`;

    const body =
      col(75, fmt(s.total), 'Total Contributions', s.firstDate ? `${shortDate(s.firstDate)} - Present` : '', 0) +
      `<line x1="145" y1="${y - 20}" x2="145" y2="${y + 40}" class="sk-bd"/>` +
      icon('flame', 212, y - 48, 'accent', 1.1) +
      col(220, String(s.current.length), 'Current Streak', range(s.current), 1, true) +
      `<line x1="295" y1="${y - 20}" x2="295" y2="${y + 40}" class="sk-bd"/>` +
      col(365, String(s.longest.length), 'Longest Streak', range(s.longest), 2);

    return frame(body, {
      width: 440,
      height: y + 55,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `${common.username}: ${s.current.length} day current streak, ${s.longest.length} day longest streak`
    });
  }
});
