import { defineCard } from './types';
import { badRequest } from '../core/errors';
import { bool, list, repoName } from '../core/params';
import { compact, esc, truncate } from '../core/text';
import type { RepoHealth } from '../github/client';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, PAD } from '../svg/frame';

interface Params {
  repos: { owner: string; repo: string }[];
  signals: boolean;
  highlight: boolean;
}

const DAY = 86_400_000;
const ageDays = (iso: string | null) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / DAY) : null);
const ago = (iso: string | null) => {
  const d = ageDays(iso);
  if (d === null) return '-';
  if (d < 1) return 'today';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${(d / 365).toFixed(1).replace(/\.0$/, '')}y ago`;
};

type Level = 'good' | 'warn' | 'bad' | 'none';
/**
 * Health signals with fixed, documented thresholds (no blended score):
 * - activity: last push < 30 days good, < 180 warn, else bad (archived = bad)
 * - issue close rate: closed / (open + closed) >= 70% good, >= 40% warn
 * - releases: latest release < 180 days good, < 365 warn
 * - momentum: default-branch commits in 30 days >= 10 good, >= 1 warn
 */
function signals(r: RepoHealth): { label: string; text: string; level: Level }[] {
  const push = ageDays(r.pushedAt);
  const closeRate = r.openIssues !== null && r.closedIssues !== null && r.openIssues + r.closedIssues > 0 ? r.closedIssues / (r.openIssues + r.closedIssues) : null;
  const rel = r.latestRelease ? ageDays(r.latestRelease.date) : null;
  return [
    { label: 'Activity', text: r.archived ? 'archived' : `pushed ${ago(r.pushedAt)}`, level: r.archived ? 'bad' : push === null ? 'none' : push < 30 ? 'good' : push < 180 ? 'warn' : 'bad' },
    { label: 'Issues closed', text: closeRate === null ? '-' : `${Math.round(closeRate * 100)}%`, level: closeRate === null ? 'none' : closeRate >= 0.7 ? 'good' : closeRate >= 0.4 ? 'warn' : 'bad' },
    { label: 'Latest release', text: r.releases === null ? '-' : r.latestRelease ? `${truncate(r.latestRelease.tag, 12)} · ${ago(r.latestRelease.date)}` : 'none', level: r.releases === null ? 'none' : rel === null ? 'bad' : rel < 180 ? 'good' : rel < 365 ? 'warn' : 'bad' },
    { label: 'Commits (30d)', text: r.commits30d === null ? '-' : compact(r.commits30d), level: r.commits30d === null ? 'none' : r.commits30d >= 10 ? 'good' : r.commits30d >= 1 ? 'warn' : 'bad' }
  ];
}
const LEVEL_COLOR: Record<Level, string> = { good: '#3fb950', warn: '#d29922', bad: '#f85149', none: '#8b949e' };

const ROWS: { label: string; value: (r: RepoHealth) => number | null; fmt?: (r: RepoHealth) => string; better?: 'high' | 'low' }[] = [
  { label: 'Stars', value: (r) => r.stars, better: 'high' },
  { label: 'Forks', value: (r) => r.forks, better: 'high' },
  { label: 'Watchers', value: (r) => r.watchers, better: 'high' },
  { label: 'Open issues', value: (r) => r.openIssues },
  { label: 'Open PRs', value: (r) => r.openPullRequests },
  { label: 'Merged PRs', value: (r) => r.mergedPullRequests, better: 'high' },
  { label: 'Releases', value: (r) => r.releases, better: 'high' },
  { label: 'Language', value: () => null, fmt: (r) => r.language ?? '-' },
  { label: 'License', value: () => null, fmt: (r) => r.license ?? 'none' },
  { label: 'Created', value: () => null, fmt: (r) => (r.createdAt ? r.createdAt.slice(0, 4) : '-') }
];

export const repoCompareCard = defineCard<Params, RepoHealth[]>({
  id: 'repo-compare',
  aliases: ['repo-health', 'repo-vs', 'compare-repos'],
  category: 'repositories',
  needsUser: false,
  tags: ['compare', 'repository', 'health', 'maintenance', 'releases', 'issues', 'pull requests', 'vs'],
  variants: [{ label: 'Comparison' }, { label: 'Numbers only', params: { signals: 'false' } }],
  title: 'Repository Compare & Health',
  description: 'One to three repositories side by side: stars, forks, issues, PRs, releases, language, license, plus health signals (recent activity, issue close rate, release recency, 30-day commits) with documented thresholds. One repo = a health card.',
  cacheSeconds: 3 * 3600,
  params: [
    { name: 'repos', type: 'list', description: '1-3 repositories, e.g. vercel/next.js,remix-run/remix (default: top 2 repos of username; bare names use username as owner)' },
    { name: 'signals', type: 'boolean', default: true, description: 'Show health signals' },
    { name: 'highlight', type: 'boolean', default: true, description: 'Bold the leader in each row' }
  ],
  parse(q, common) {
    const repos = list(q.repos).slice(0, 3).map((full) => {
      const [a, b] = full.split('/');
      const [owner, repo] = b === undefined ? [common.username, a] : [a, b];
      if (!owner || !repo) throw badRequest('repos must look like owner/name,owner/name (bare names need username)');
      return { owner: owner.trim(), repo: repoName(repo.trim()) };
    });
    if (!repos.length && !common.username) throw badRequest('Pass repos=owner/name (up to 3, comma-separated), or a username to compare their top repositories');
    return { repos, signals: bool(q.signals, true), highlight: bool(q.highlight, true) };
  },
  users: (p) => p.repos.map((r) => r.owner),
  async load(client, p, common) {
    let repos = p.repos;
    if (!repos.length) {
      const user = await client.getUser(common.username);
      repos = user.repos.slice(0, 2).map((r) => ({ owner: user.login, repo: r.name }));
      if (!repos.length) throw badRequest(`${common.username} has no public repositories`);
    }
    return client.getRepoHealth(repos);
  },

  render(repos, p, { theme, common, title }) {
    const single = repos.length === 1;
    const header = title(single ? 'Repository Health' : 'Repository Compare');
    const top = contentTop(!!header);
    const animate = common.animation;
    const labelW = 120;
    const colW = single ? 300 : 170;
    const W = PAD * 2 + labelW + colW * repos.length;
    const colX = (i: number) => PAD + labelW + i * colW;
    let body = '';

    // column headers
    repos.forEach((r, i) => {
      const [owner, name] = r.nameWithOwner.split('/');
      body +=
        `<g${anim(animate, i)}><circle cx="${colX(i) + 5}" cy="${top + 8}" r="5" fill="${esc(languageColor(r.language, r.languageColor))}"/>` +
        `<text x="${colX(i) + 16}" y="${top + 12}" class="fg" font-size="14" font-weight="700">${esc(truncate(name ?? r.nameWithOwner, single ? 30 : 16))}</text>` +
        `<text x="${colX(i) + 16}" y="${top + 28}" class="muted" font-size="11">${esc(truncate(owner ?? '', single ? 34 : 20))}</text></g>`;
    });
    let y = top + 46;
    if (single && repos[0].description) {
      body += `<text x="${PAD}" y="${y}" class="muted" font-size="12">${esc(truncate(repos[0].description, 70))}</text>`;
      y += 16;
    }

    ROWS.forEach((row, ri) => {
      const vals = repos.map((r) => row.value(r));
      if (!row.fmt && vals.every((v) => v === null)) return; // no data without a token
      const nums = vals.filter((v): v is number => v !== null);
      const best = row.better && nums.length > 1 && new Set(nums).size > 1 ? Math.max(...nums) : null; // no leader on a tie
      const ry = y + 14;
      if (ri % 2 === 0) body += `<rect x="${PAD - 8}" y="${ry - 15}" width="${W - PAD * 2 + 16}" height="22" rx="4" class="bd" fill-opacity=".35"/>`;
      body += `<text x="${PAD}" y="${ry}" class="label muted" font-size="12">${esc(row.label)}</text>`;
      repos.forEach((r, i) => {
        const v = vals[i];
        const text = row.fmt ? row.fmt(r) : v === null ? '-' : compact(v);
        const lead = p.highlight && best !== null && v === best;
        body += `<text x="${colX(i) + 16}" y="${ry}" class="${lead ? 'accent' : 'fg'}" font-size="12.5"${lead ? ' font-weight="700"' : ''}>${esc(truncate(text, single ? 34 : 18))}</text>`;
      });
      y += 22;
    });

    if (p.signals) {
      y += 10;
      body += `<text x="${PAD}" y="${y + 12}" class="label muted" font-size="11" letter-spacing="1.2">HEALTH SIGNALS</text>`;
      y += 20;
      const all = repos.map(signals);
      all[0].forEach((sig, si) => {
        const ry = y + 14 + si * 22;
        body += `<text x="${PAD}" y="${ry}" class="label muted" font-size="12">${esc(sig.label)}</text>`;
        all.forEach((list_, i) => {
          const s = list_[si];
          body += `<circle cx="${colX(i) + 20}" cy="${ry - 4}" r="4.5" fill="${LEVEL_COLOR[s.level]}"/><text x="${colX(i) + 30}" y="${ry}" class="fg" font-size="12">${esc(truncate(s.text, single ? 32 : 16))}</text>`;
        });
      });
      y += all[0].length * 22 + 4;
    }

    return frame(body, {
      width: W,
      height: y + 18,
      theme,
      title: header,
      label: single ? `Health of ${repos[0].nameWithOwner}` : `Comparison of ${repos.map((r) => r.nameWithOwner).join(', ')}`
    });
  }
});
