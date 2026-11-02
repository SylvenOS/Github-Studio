import { defineCard } from './types';
import { color, oneOf } from '../core/params';
import { badRequest } from '../core/errors';
import { compact, esc, fmt } from '../core/text';
import { calculateGrade } from '../metrics/grade';
import { calculateProfileMetrics, loadInsights } from '../metrics';
import { SHIELD_STYLES, shield } from '../svg/shield';
import { TECH_ICONS } from '../svg/tech-icons';
import { resolveIcon } from './tech';

const REALISTIC = new Set(['rank', 'external_prs', 'collaborations', 'consistency', 'merge_rate']);


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
  rank: (d) => ['activity score', d.grade],
  external_prs: (d) => ['merged PRs (external)', compact(d.m.externalMergedPRs ?? 0)],
  collaborations: (d) => ['repos contributed to', compact(d.m.reposContributedTo ?? 0)],
  consistency: (d) => ['consistency', `${Math.round(d.m.consistency ?? 0)}%`],
  merge_rate: (d) => ['PR merge rate', `${Math.round(d.m.mergeRate ?? 0)}%`],
  top_language: (d) => ['top language', d.m.topLanguage ?? 'n/a']
};

interface Data {
  m: ReturnType<typeof calculateProfileMetrics>;
  grade: string;
}

interface Params {
  stat: string;
  label?: string;
  style: (typeof SHIELD_STYLES)[number];
  color?: string;
  labelColor?: string;
  logo?: string;
  logoColor?: string;
  scale: number;
}

export const badgeCard = defineCard<Params, Data>({
  id: 'badge',
  category: 'utility',
  tags: ['shield', 'inline', 'number'],
  variants: [
    { label: 'Stars', params: { stat: 'stars' } },
    { label: 'Followers', params: { stat: 'followers' } },
    { label: 'Repositories', params: { stat: 'repos' } },
    { label: 'Rank (big)', params: { stat: 'rank', style: 'for-the-badge' } },
    { label: 'Top language', params: { stat: 'top_language', style: 'pill' } },
    { label: 'Social style', params: { stat: 'followers', style: 'social', logo: 'github' } },
    { label: 'Plastic with logo', params: { stat: 'stars', style: 'plastic', logo: 'github', color: 'dfb317' } },
    { label: 'Flat square, big', params: { stat: 'repos', style: 'flat-square', scale: '160' } },
    { label: 'For the badge + logo', params: { stat: 'contributions', style: 'for-the-badge', logo: 'github' } }
  ],
  aliases: ['shield'],
  title: 'Badge',
  description: 'Compact shields-style badge for one number, ideal for inline use in a README.',
  params: [
    { name: 'stat', type: 'enum', options: Object.keys(VALUES), default: 'stars', description: 'Which number to show' },
    { name: 'label', type: 'string', description: 'Custom left-hand label' },
    { name: 'style', type: 'enum', options: [...SHIELD_STYLES], default: 'flat', description: 'flat, flat-square, plastic, pill, for-the-badge or social' },
    { name: 'color', type: 'color', description: 'Value background (hex, no #); defaults to the theme accent' },
    { name: 'label_color', type: 'color', description: 'Label background (hex, no #)' },
    { name: 'logo', type: 'string', description: 'Brand logo before the label, e.g. github, typescript, rust (any bundled tech icon)' },
    { name: 'logo_color', type: 'color', description: 'Logo colour (default white)' },
    { name: 'scale', type: 'number', default: 100, min: 50, max: 300, step: 10, description: 'Badge size in percent' }
  ],
  parse: (q) => {
    const stat = q.stat ?? 'stars';
    if (!VALUES[stat]) throw badRequest(`Unknown stat "${stat}". Available: ${Object.keys(VALUES).join(', ')}`);
    return {
      stat,
      label: q.label?.slice(0, 30),
      style: oneOf(q.style, SHIELD_STYLES, 'flat'),
      logo: q.logo?.slice(0, 30),
      logoColor: color(q.logo_color),
      scale: Math.max(50, Math.min(300, Number.parseInt(q.scale ?? '100', 10) || 100)),
      color: color(q.color),
      labelColor: color(q.label_color)
    };
  },
  load: async (client, p, common) => {
    // only the realistic stats need the extra data; plain numbers stay a single cached query
    const m = REALISTIC.has(p.stat) ? (await loadInsights(client, common.username)).metrics : calculateProfileMetrics(await client.getUser(common.username));
    return { m, grade: calculateGrade(m).level };
  },
  toJSON: (d, p) => {
    const [label, value] = VALUES[p.stat](d);
    return { stat: p.stat, label, value };
  },

  render(d, p, { theme }) {
    const [defaultLabel, value] = VALUES[p.stat](d);
    const slug = p.logo ? resolveIcon(p.logo) : undefined;
    return shield({
      label: p.label ?? defaultLabel,
      value,
      style: p.style,
      labelColor: p.labelColor ?? '#555555',
      valueColor: p.color ?? theme.accent,
      logo: slug ? { path: TECH_ICONS[slug].p, color: p.logoColor ?? '#ffffff' } : undefined,
      scale: p.scale / 100
    });
  }
});
