import { defineCard } from './types';
import { int, list } from '../core/params';
import { compact, esc, fmt, MONTHS, shortDate, truncate } from '../core/text';
import { calendarYearRange, type CalendarDay, type ContributionDetail } from '../github/client';
import { analyzePatterns, type WorkPatterns } from '../metrics/patterns';
import { computeStreaks } from '../metrics/streak';
import { languageColor } from '../svg/colors';
import { anim, cls, frame, PAD } from '../svg/frame';
import { icon, type IconName } from '../svg/icons';

interface Params {
  year: number;
  hide: string[];
}

interface Data {
  year: number;
  partial: boolean;
  /** Commit/PR/review/issue counts need a token; without one they show as "-". */
  detailed: boolean;
  contributions: ContributionDetail;
  patterns: WorkPatterns;
  longestStreak: number;
  months: number[];
}

/** Default: the current year, except in January when last year's review is the interesting one. */
function defaultYear(now = new Date()) {
  return now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
}

const exact = (d: Data, v: () => string) => (d.detailed ? v() : '-');
const TILES: { key: string; label: string; icon: IconName; value: (d: Data) => string }[] = [
  { key: 'commits', label: 'Commits', icon: 'commit', value: (d) => exact(d, () => fmt(d.contributions.commits + d.contributions.restricted)) },
  { key: 'prs', label: 'Pull requests', icon: 'pr', value: (d) => exact(d, () => fmt(d.contributions.pullRequests)) },
  { key: 'reviews', label: 'Reviews', icon: 'review', value: (d) => exact(d, () => fmt(d.contributions.reviews)) },
  { key: 'issues', label: 'Issues', icon: 'issue', value: (d) => exact(d, () => fmt(d.contributions.issues)) },
  { key: 'active', label: 'Active days', icon: 'flame', value: (d) => fmt(d.patterns.activeDays) },
  { key: 'streak', label: 'Longest streak', icon: 'flame', value: (d) => `${d.longestStreak}d` },
  { key: 'best_day', label: 'Best day', icon: 'star', value: (d) => (d.patterns.bestDay ? `${fmt(d.patterns.bestDay.count)} · ${shortDate(d.patterns.bestDay.date, new Date(Date.UTC(d.year, 5)))}` : '-') },
  { key: 'repos', label: 'Repos touched', icon: 'repo', value: (d) => exact(d, () => fmt(Math.max(d.contributions.reposWithCommits, d.contributions.repos?.length ?? 0))) }
];

export const yearCard = defineCard<Params, Data>({
  id: 'year',
  aliases: ['year-in-review', 'wrapped', 'recap'],
  category: 'activity',
  tags: ['year in review', 'wrapped', 'recap', 'annual', 'summary', 'realistic', 'milestones'],
  variants: [{ label: 'Full review' }, { label: 'Numbers only', params: { hide: 'repos_list,languages,months' } }, { label: 'Last year', params: { year: String(new Date().getUTCFullYear() - 1) } }],
  title: 'Year in Review',
  description: 'Your year on GitHub, “wrapped” style: total contributions, commits, PRs, reviews, issues, active days, longest streak, best day, a month-by-month chart, top repositories and languages.',
  cacheSeconds: 6 * 3600,
  params: [
    { name: 'year', type: 'number', min: 2008, description: 'Year to review (default: this year; last year during January)' },
    { name: 'hide', type: 'list', description: `Parts to hide: ${TILES.map((t) => t.key).join(', ')}, months, repos_list, languages` }
  ],
  parse: (q) => ({ year: int(q.year, defaultYear(), 2008, new Date().getUTCFullYear()), hide: list(q.hide) }),

  async load(client, p, common) {
    const range = calendarYearRange(p.year);
    const [contributions, days] = await Promise.all([
      client.getContributions(common.username, range),
      client.getCalendar(common.username, [range]).catch(() => [] as CalendarDay[])
    ]);
    const inYear = days.filter((d) => d.date.startsWith(String(p.year)));
    const months = new Array(12).fill(0);
    for (const d of inYear) months[Number(d.date.slice(5, 7)) - 1] += d.count;
    return {
      year: p.year,
      partial: p.year === new Date().getUTCFullYear(),
      detailed: client.hasToken,
      contributions,
      patterns: analyzePatterns(inYear),
      longestStreak: computeStreaks(inYear).longest.length,
      months
    };
  },
  toJSON: (d) => ({ year: d.year, partial: d.partial, total: d.patterns.total, ...d.contributions, patterns: d.patterns, longestStreak: d.longestStreak, months: d.months }),

  render(d, p, { theme, common }) {
    const W = 720;
    const animate = common.animation;
    const tiles = TILES.filter((t) => !p.hide.includes(t.key));
    const total = d.patterns.total;

    // hero
    let body =
      `<text x="${PAD}" y="${PAD + 14}" class="label muted" font-size="12" letter-spacing="2">@${esc(common.username.toUpperCase())} · ${d.partial ? 'SO FAR' : 'YEAR IN REVIEW'}</text>` +
      `<text x="${PAD}" y="${PAD + 62}" class="accent" font-size="54" font-weight="800">${d.year}</text>` +
      `<text x="${PAD + 175}" y="${PAD + 46}" class="fg" font-size="30" font-weight="700">${esc(fmt(total))}</text>` +
      `<text x="${PAD + 175}" y="${PAD + 64}" class="label muted">contributions${d.partial ? ` through ${shortDate(new Date().toISOString().slice(0, 10))}` : ''}</text>`;

    // months mini chart (right of hero)
    if (!p.hide.includes('months')) {
      const cx = W - PAD - 260;
      const ch = 56;
      const max = Math.max(1, ...d.months);
      const bw = 260 / 12;
      d.months.forEach((m, i) => {
        const h = Math.max(m ? 2 : 0, (m / max) * ch);
        body += `<rect x="${(cx + i * bw + 2).toFixed(1)}" y="${(PAD + 52 - h).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${h.toFixed(1)}" rx="2"${cls('ser', animate, i)}${m === max ? '' : ' fill-opacity=".5"'}><title>${MONTHS[i]}: ${m}</title></rect>`;
        body += `<text x="${(cx + i * bw + bw / 2).toFixed(1)}" y="${PAD + 66}" class="label muted" font-size="9" text-anchor="middle">${MONTHS[i][0]}</text>`;
      });
    }

    // tiles
    let y = PAD + 92;
    const per = 4;
    const colW = (W - PAD * 2) / per;
    tiles.forEach((t, i) => {
      const x = PAD + (i % per) * colW;
      const ty = y + Math.floor(i / per) * 64;
      body +=
        `<g${anim(animate, i)}><rect x="${x}" y="${ty}" width="${colW - 10}" height="54" rx="10" class="bd" fill-opacity=".45"/>` +
        icon(t.icon, x + 12, ty + 12, 'accent', 0.8) +
        `<text x="${x + 32}" y="${ty + 24}" class="fg" font-size="15" font-weight="600">${esc(t.value(d))}</text>` +
        `<text x="${x + 12}" y="${ty + 44}" class="label muted" font-size="11">${esc(t.label)}</text></g>`;
    });
    y += Math.ceil(tiles.length / per) * 64 + 6;

    // top repos + languages side by side
    const repos = (d.contributions.repos ?? []).slice(0, 4);
    const showRepos = !p.hide.includes('repos_list') && repos.length > 0;
    const langMap = new Map<string, { name: string; color: string | null; n: number }>();
    for (const r of d.contributions.repos ?? []) if (r.language) {
      const cur = langMap.get(r.language) ?? { name: r.language, color: r.languageColor, n: 0 };
      cur.n += r.contributions;
      langMap.set(r.language, cur);
    }
    const langs = [...langMap.values()].sort((a, b) => b.n - a.n).slice(0, 5);
    const langSum = langs.reduce((a, l) => a + l.n, 0) || 1;
    const showLangs = !p.hide.includes('languages') && langs.length > 0;

    if (showRepos || showLangs) {
      const colX = showRepos && showLangs ? [PAD, PAD + (W - PAD * 2) * 0.56] : [PAD, PAD];
      let h = 0;
      if (showRepos) {
        body += `<text x="${colX[0]}" y="${y + 14}" class="label muted" font-size="11" letter-spacing="1.5">TOP REPOSITORIES</text>`;
        repos.forEach((r, i) => {
          const ry = y + 38 + i * 22;
          body += `<g${anim(animate, i + 8)}><circle cx="${colX[0] + 5}" cy="${ry - 4}" r="4.5" fill="${esc(languageColor(r.language, r.languageColor))}"/><text x="${colX[0] + 16}" y="${ry}" class="fg" font-size="12.5" font-weight="600">${esc(truncate(r.nameWithOwner, 34))}</text><text x="${colX[0] + 340}" y="${ry}" class="muted" font-size="11.5" text-anchor="end">${compact(r.contributions)}</text></g>`;
        });
        h = Math.max(h, 30 + repos.length * 22);
      }
      if (showLangs) {
        const x0 = showRepos ? colX[1] : PAD;
        const bw = W - PAD - x0;
        body += `<text x="${x0}" y="${y + 14}" class="label muted" font-size="11" letter-spacing="1.5">LANGUAGES</text>`;
        let lx = x0;
        body += `<clipPath id="yl"><rect x="${x0}" y="${y + 26}" width="${bw}" height="8" rx="4"/></clipPath><g clip-path="url(#yl)">`;
        for (const l of langs) {
          const w = (l.n / langSum) * bw;
          body += `<rect x="${lx.toFixed(1)}" y="${y + 26}" width="${w.toFixed(1)}" height="8" fill="${esc(languageColor(l.name, l.color))}"/>`;
          lx += w;
        }
        body += '</g>';
        langs.forEach((l, i) => {
          const ly = y + 54 + i * 18;
          body += `<circle cx="${x0 + 4}" cy="${ly - 4}" r="4" fill="${esc(languageColor(l.name, l.color))}"/><text x="${x0 + 14}" y="${ly}" class="fg" font-size="11.5">${esc(l.name)} <tspan class="muted">${Math.round((l.n / langSum) * 100)}%</tspan></text>`;
        });
        h = Math.max(h, 44 + langs.length * 18);
      }
      y += h + 8;
    }

    return frame(body, {
      width: W,
      height: y + 10,
      theme,
      label: `${common.username}'s ${d.year} on GitHub: ${total} contributions, ${d.contributions.pullRequests} pull requests, longest streak ${d.longestStreak} days`
    });
  }
});
