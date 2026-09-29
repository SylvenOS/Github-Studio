import { defineCard } from './types';
import { color, oneOf } from '../core/params';
import { badRequest } from '../core/errors';
import { compact, esc, fmt } from '../core/text';
import { calculateGrade } from '../metrics/grade';
import { calculateProfileMetrics } from '../metrics';

const STYLES = ['flat', 'pill', 'for-the-badge'] as const;

/** stat name -> [default label, value]. Add an entry to offer another badge. */
const VALUES: Record<string, (d: Data) => [string, string]> = {
  stars: (d) => ['stars', compact(d.m.stars)],
  followers: (d) => ['followers', compact(d.m.followers)],
  following: (d) => ['following', compact(d.m.following)],
  repos: (d) => ['repos', fmt(d.m.repositories)],
  forks: (d) => ['forks', compact(d.m.forks)],
  commits: (d) => ['commits', compact(d.m.commits)],
  prs: (d) => ['pull requests', compact(d.m.pullRequests)],
  issues: (d) => ['issues', compact(d.m.issues)],
  reviews: (d) => ['reviews', compact(d.m.reviews)],
  contributions: (d) => ['contributions', compact(d.m.contributions)],
  gists: (d) => ['gists', fmt(d.m.gists)],
  years: (d) => ['on GitHub', `${d.m.accountAgeYears}y`],
  rank: (d) => ['rank', d.grade],
  top_language: (d) => ['top language', d.m.topLanguage ?? 'n/a']
};

interface Data {
  m: ReturnType<typeof calculateProfileMetrics>;
  grade: string;
}

interface Params {
  stat: string;
  label?: string;
  style: (typeof STYLES)[number];
  color?: string;
  labelColor?: string;
}

const textWidth = (s: string, size: number) => Math.ceil(Array.from(s).length * size * 0.62);

export const badgeCard = defineCard<Params, Data>({
  id: 'badge',
  category: 'utility',
  tags: ['shield', 'inline', 'number'],
  variants: [
    { label: 'Stars', params: { stat: 'stars' } },
    { label: 'Followers', params: { stat: 'followers' } },
    { label: 'Repositories', params: { stat: 'repos' } },
    { label: 'Rank (big)', params: { stat: 'rank', style: 'for-the-badge' } },
    { label: 'Top language', params: { stat: 'top_language', style: 'pill' } }
  ],
  aliases: ['shield'],
  title: 'Badge',
  description: 'Compact shields-style badge for one number, ideal for inline use in a README.',
  params: [
    { name: 'stat', type: 'enum', options: Object.keys(VALUES), default: 'stars', description: 'Which number to show' },
    { name: 'label', type: 'string', description: 'Custom left-hand label' },
    { name: 'style', type: 'enum', options: [...STYLES], default: 'flat', description: 'Badge shape' },
    { name: 'color', type: 'color', description: 'Value background (hex, no #); defaults to the theme accent' },
    { name: 'label_color', type: 'color', description: 'Label background (hex, no #)' }
  ],
  parse: (q) => {
    const stat = q.stat ?? 'stars';
    if (!VALUES[stat]) throw badRequest(`Unknown stat "${stat}". Available: ${Object.keys(VALUES).join(', ')}`);
    return {
      stat,
      label: q.label?.slice(0, 30),
      style: oneOf(q.style, STYLES, 'flat'),
      color: color(q.color),
      labelColor: color(q.label_color)
    };
  },
  load: async (client, _p, common) => {
    const m = calculateProfileMetrics(await client.getUser(common.username));
    return { m, grade: calculateGrade(m).level };
  },
  toJSON: (d, p) => {
    const [label, value] = VALUES[p.stat](d);
    return { stat: p.stat, label, value };
  },

  render(d, p, { theme }) {
    const [defaultLabel, rawValue] = VALUES[p.stat](d);
    const upper = p.style === 'for-the-badge';
    const label = upper ? (p.label ?? defaultLabel).toUpperCase() : (p.label ?? defaultLabel);
    const value = upper ? rawValue.toUpperCase() : rawValue;
    const h = upper ? 28 : 20;
    const size = upper ? 11 : 11;
    const pad = upper ? 14 : 8;
    const lw = textWidth(label, size) + pad * 2;
    const vw = textWidth(value, size) + pad * 2;
    const w = lw + vw;
    const r = p.style === 'pill' ? h / 2 : upper ? 0 : 3;
    const valueBg = p.color ?? theme.accent;
    const labelBg = p.labelColor ?? '#555555';
    const letter = upper ? 'letter-spacing="1"' : '';
    const ty = h / 2 + 4;

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img" aria-label="${esc(label)}: ${esc(value)}">` +
      `<clipPath id="r"><rect width="${w}" height="${h}" rx="${r}"/></clipPath>` +
      `<g clip-path="url(#r)"><rect width="${lw}" height="${h}" fill="${labelBg}"/><rect x="${lw}" width="${vw}" height="${h}" fill="${valueBg}"/>` +
      (p.style === 'pill' || upper ? '' : `<rect width="${w}" height="${h}" fill="url(#s)"/>`) +
      `</g>` +
      (p.style === 'pill' || upper ? '' : `<linearGradient id="s" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-opacity=".12"/></linearGradient>`) +
      `<g fill="#fff" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${size}" text-anchor="middle" font-weight="${upper ? 700 : 400}" ${letter}>` +
      `<text x="${lw / 2}" y="${ty}">${esc(label)}</text><text x="${lw + vw / 2}" y="${ty}" font-weight="700">${esc(value)}</text></g></svg>`
    );
  }
});
