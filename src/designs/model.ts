import type { CalendarDay, UserData, UserExtended } from '../github/client';
import { computeStreaks } from '../metrics/streak';
import { languageColor } from '../svg/colors';
import { emojify } from '../core/text';

/**
 * The content of a profile design, independent of how it is drawn. Every design system renders this
 * same model, so identity (who), work (what) and signals (numbers) stay consistent across styles.
 */
export interface ProfileModel {
  login: string;
  name: string;
  role: string | null;
  intro: string | null;
  now: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  pronouns: string | null;
  status: string | null;
  links: string[];
  years: number;
  stats: { stars: number; followers: number; repos: number; contributions: number; pullRequests: number; reviews: number };
  streak: { current: number; longest: number };
  languages: { name: string; color: string; pct: number }[];
  projects: { name: string; owner: string; description: string | null; stars: number; language: string | null; color: string }[];
  /** Contribution totals for the last 26 weeks, oldest first. */
  weeks: number[];
  /** Up to 4 recent contribution levels per day for the last 12 weeks (heat strip). */
  recentDays: number[];
}

export interface ModelInput {
  user: UserData;
  extended: UserExtended | null;
  calendar: CalendarDay[];
  role?: string;
  intro?: string;
  now?: string;
  links: string[];
  projectCount: number;
}

export function buildModel(i: ModelInput): ProfileModel {
  const { user, extended, calendar } = i;
  const totalLang = user.languages.slice(0, 5).reduce((a, l) => a + l.size, 0) || 1;
  const pinned = extended?.pinned ?? [];
  const projects = (pinned.length ? pinned.map((p) => ({ name: p.name, owner: p.owner, description: emojify(p.description) || null, stars: p.stars, language: p.language, color: languageColor(p.language, p.languageColor) }))
    : user.repos.map((r) => ({ name: r.name, owner: user.login, description: emojify(r.description) || null, stars: r.stars, language: r.language, color: languageColor(r.language, r.languageColor) }))
  ).slice(0, i.projectCount);
  const weeks: number[] = [];
  const recent = calendar.slice(-26 * 7);
  for (let w = 0; w < recent.length; w += 7) weeks.push(recent.slice(w, w + 7).reduce((a, d) => a + d.count, 0));
  const streaks = computeStreaks(calendar);
  const created = user.createdAt ? Date.parse(user.createdAt) : NaN;
  const status = extended?.status ? [extended.status.emoji && !/^:\w+:$/.test(extended.status.emoji) ? extended.status.emoji : '', extended.status.message ?? ''].join(' ').trim() : '';
  return {
    login: user.login,
    name: user.name || user.login,
    role: i.role || null,
    intro: i.intro || emojify(user.bio) || null,
    now: i.now || null,
    location: user.location,
    company: user.company,
    website: user.website,
    pronouns: extended?.pronouns ?? null,
    status: status || null,
    links: i.links.length ? i.links : [user.website, user.twitter ? `@${user.twitter}` : null, `github.com/${user.login}`].filter((x): x is string => !!x).slice(0, 3),
    years: Number.isFinite(created) ? Math.max(0, Math.floor((Date.now() - created) / (365.25 * 86_400_000))) : 0,
    stats: { stars: user.stars, followers: user.followers, repos: user.publicRepos, contributions: user.contributions, pullRequests: user.pullRequests, reviews: user.reviews },
    streak: { current: streaks.current.length, longest: streaks.longest.length },
    languages: user.languages.slice(0, 5).map((l) => ({ name: l.name, color: languageColor(l.name, l.color), pct: (l.size / totalLang) * 100 })),
    projects,
    weeks,
    recentDays: calendar.slice(-12 * 7).map((d) => d.level)
  };
}

/** Relative luminance of a #rgb/#rrggbb colour (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 || h.length === 4 ? h.slice(0, 3).split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return 0;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]!.toUpperCase()).join('') || '?';
