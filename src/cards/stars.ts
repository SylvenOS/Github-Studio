import { defineCard } from './types';
import { badRequest } from '../core/errors';
import { bool, list, oneOf, repoName } from '../core/params';
import { compact, esc, MONTHS, truncate } from '../core/text';
import type { StarHistory } from '../github/client';
import { contentTop, frame, PAD } from '../svg/frame';

const SCALES = ['linear', 'log'] as const;
const MAX_REPOS = 3;
/** Subrequest budget: each repo costs 1 + samples calls. */
const SAMPLE_BUDGET = 24;

interface Params {
  repos: { owner: string; repo: string }[];
  scale: (typeof SCALES)[number];
  area: boolean;
  points: boolean;
  legend: boolean;
}

const owners = (repos: string[]) => repos.map((r) => r.split('/')[0]);

export const starsCard = defineCard<Params, StarHistory[]>({
  id: 'stars',
  aliases: ['star-history', 'stargazers'],
  category: 'repositories',
  needsUser: false,
  tags: ['stars', 'history', 'growth', 'trend', 'stargazers', 'chart', 'repository'],
  variants: [
    { label: 'Area chart' },
    { label: 'Lines with points', params: { area: 'false', points: 'true' } },
    { label: 'Log scale', params: { scale: 'log' } }
  ],
  title: 'Star History',
  description: 'How a repository’s stars grew over time, drawn from sampled stargazer timestamps. Compare up to three repositories. Without `repo`, uses the most-starred repo of `username`.',
  cacheSeconds: 6 * 3600,
  params: [
    { name: 'repo', type: 'list', description: 'Up to 3 repositories, e.g. facebook/react,vuejs/core (default: top repo of username)' },
    { name: 'scale', type: 'enum', options: [...SCALES], default: 'linear', description: 'Y axis scale' },
    { name: 'area', type: 'boolean', default: true, description: 'Fill the area under the line' },
    { name: 'points', type: 'boolean', default: false, description: 'Mark sampled points' },
    { name: 'legend', type: 'boolean', default: true, description: 'Repository legend with totals' }
  ],
  parse(q, common) {
    const names = list(q.repo).slice(0, MAX_REPOS);
    const repos = names.map((full) => {
      const [owner, repo] = full.split('/');
      if (!owner || !repo) throw badRequest('repo must look like owner/name');
      return { owner: owner.trim(), repo: repoName(repo.trim()) };
    });
    if (!repos.length && !common.username) throw badRequest('Pass repo=owner/name (or a username to use their top repository)');
    return { repos, scale: oneOf(q.scale, SCALES, 'linear'), area: bool(q.area, true), points: bool(q.points, false), legend: bool(q.legend, true) };
  },
  users: (p) => owners(p.repos.map((r) => `${r.owner}/${r.repo}`)),

  async load(client, p, common) {
    let repos = p.repos;
    if (!repos.length) {
      const user = await client.getUser(common.username);
      const top = user.repos[0];
      if (!top) throw badRequest(`${common.username} has no public repositories`);
      repos = [{ owner: user.login, repo: top.name }];
    }
    const samples = Math.max(3, Math.min(10, Math.floor(SAMPLE_BUDGET / repos.length) - 1));
    return Promise.all(repos.map((r) => client.getStarHistory(r.owner, r.repo, samples)));
  },

  render(series, p, { theme, title }) {
    const header = title('Star History');
    const top = contentTop(!!header);
    const W = 560;
    const legendH = p.legend ? 24 : 0;
    const chart = { x: PAD + 44, y: top + 10 + legendH, w: W - PAD * 2 - 52, h: 190 };
    const t0 = Math.min(...series.map((s) => Date.parse(s.points[0]?.date ?? s.createdAt)));
    const t1 = Date.now();
    const maxStars = Math.max(1, ...series.map((s) => s.total));
    const xs = (d: string) => chart.x + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * chart.w;
    const ys = (n: number) => {
      const r = p.scale === 'log' ? Math.log10(n + 1) / Math.log10(maxStars + 1) : n / maxStars;
      return chart.y + chart.h - r * chart.h;
    };

    // grid + y labels
    let body = '';
    const ticks = p.scale === 'log'
      ? [1, 10, 100, 1e3, 1e4, 1e5, 1e6].filter((v) => v <= maxStars * 1.01)
      : [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxStars * f));
    for (const v of ticks) {
      const y = ys(v).toFixed(1);
      body += `<line x1="${chart.x}" y1="${y}" x2="${chart.x + chart.w}" y2="${y}" class="sk-bd" stroke-dasharray="3 4" stroke-width="1"/><text x="${chart.x - 8}" y="${Number(y) + 4}" class="label muted" font-size="10.5" text-anchor="end">${compact(v)}</text>`;
    }
    // x labels: ~5 evenly spaced dates
    for (let i = 0; i <= 4; i++) {
      const t = new Date(t0 + ((t1 - t0) * i) / 4);
      const x = chart.x + (chart.w * i) / 4;
      body += `<text x="${x.toFixed(1)}" y="${chart.y + chart.h + 18}" class="label muted" font-size="10.5" text-anchor="${i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}">${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}</text>`;
    }

    const seriesCls = ['ser', 'ser2', 'ser3'];
    const strokeVar = ['var(--s0,var(--accent))', 'var(--s1,#a371f7)', 'var(--s2,#3fb950)'];
    body += `<style>.ser3{fill:var(--s2,#3fb950)}</style>`;
    series.forEach((s, i) => {
      const pts = s.points.map((pt) => [xs(pt.date), ys(pt.count)] as const);
      const line = pts.map(([x, y], j) => `${j ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
      if (p.area && pts.length) {
        body += `<path d="${line} L${pts[pts.length - 1][0].toFixed(1)} ${chart.y + chart.h} L${pts[0][0].toFixed(1)} ${chart.y + chart.h} Z" class="${seriesCls[i]}" fill-opacity="${series.length > 1 ? 0.1 : 0.18}"/>`;
      }
      body += `<path d="${line}" fill="none" stroke="${strokeVar[i]}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (p.points) body += pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" class="${seriesCls[i]}"/>`).join('');
    });

    if (p.legend) {
      let lx = PAD;
      series.forEach((s, i) => {
        const text = `${truncate(s.repo, 30)}  ★ ${compact(s.total)}`;
        body += `<rect x="${lx}" y="${top + 2}" width="10" height="10" rx="2" class="${seriesCls[i]}"/><text x="${lx + 15}" y="${top + 11}" class="fg" font-size="12">${esc(text)}</text>`;
        lx += Math.min(260, Array.from(text).length * 7 + 34);
      });
    }
    const truncated = series.some((s) => s.truncated);
    const footY = chart.y + chart.h + 36;
    if (truncated) body += `<text x="${PAD}" y="${footY}" class="label muted" font-size="10.5">GitHub lists only the first 40k stargazers; the curve after that is a straight line to today’s total.</text>`;

    return frame(body, {
      width: W,
      height: footY + (truncated ? 14 : -6),
      theme,
      title: header,
      subtitle: series.length === 1 ? `★ ${compact(series[0].total)}` : undefined,
      label: `Star history: ${series.map((s) => `${s.repo} has ${s.total} stars`).join(', ')}`
    });
  }
});
