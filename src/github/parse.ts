import type { CalendarDay, LanguageStat, RepoSummary } from './types';

/**
 * Parses GitHub's server-rendered contribution graph (`/users/:name/contributions`).
 * Cells carry `data-date`/`data-level`; exact counts live in sibling `<tool-tip for="cell-id">` elements.
 */
export function parseContributionHtml(html: string): CalendarDay[] {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>\s*(No|[\d,]+)\s+contributions?\b/g)) {
    counts.set(m[1], m[2] === 'No' ? 0 : Number.parseInt(m[2].replace(/,/g, ''), 10));
  }

  const days = new Map<string, CalendarDay>();
  for (const m of html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = m[0];
    const level = Math.min(4, Number(/data-level="(\d)"/.exec(tag)?.[1] ?? 0)) as CalendarDay['level'];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    const count = (id ? counts.get(id) : undefined) ?? (level > 0 ? 1 : 0);
    days.set(m[1], { date: m[1], count, level });
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 } as const;
export const levelFromEnum = (l: keyof typeof LEVELS): CalendarDay['level'] => LEVELS[l] ?? 0;

/** Merges per-range calendars, removing days that appear in overlapping ranges. */
export function mergeCalendars(parts: CalendarDay[][]): CalendarDay[] {
  const byDate = new Map<string, CalendarDay>();
  for (const part of parts) for (const d of part) byDate.set(d.date, d);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface GqlRepoNode {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  isArchived: boolean;
  pushedAt: string | null;
  primaryLanguage: { name: string; color: string | null } | null;
  languages?: { edges: { size: number; node: { name: string; color: string | null } }[] };
}

/** Folds repository nodes into totals, a most-starred-first list and a per-language size breakdown. */
export function aggregateRepos(nodes: GqlRepoNode[]) {
  const repos: RepoSummary[] = [];
  const langs = new Map<string, LanguageStat>();
  let stars = 0;
  let forks = 0;

  for (const n of nodes) {
    stars += n.stargazerCount;
    forks += n.forkCount;
    repos.push({
      name: n.name,
      description: n.description,
      url: n.url,
      stars: n.stargazerCount,
      forks: n.forkCount,
      language: n.primaryLanguage?.name ?? null,
      languageColor: n.primaryLanguage?.color ?? null,
      archived: n.isArchived,
      pushedAt: n.pushedAt
    });

    for (const e of n.languages?.edges ?? []) {
      const cur = langs.get(e.node.name) ?? { name: e.node.name, color: e.node.color, size: 0, repos: 0 };
      cur.size += e.size;
      langs.set(e.node.name, cur);
    }
    const primary = n.primaryLanguage?.name;
    if (primary) {
      const cur = langs.get(primary) ?? { name: primary, color: n.primaryLanguage!.color, size: 0, repos: 0 };
      cur.repos += 1;
      langs.set(primary, cur);
    }
  }

  repos.sort((a, b) => b.stars - a.stars || b.forks - a.forks);
  const languages = [...langs.values()].sort((a, b) => b.size - a.size || b.repos - a.repos);
  return { repos, languages, stars, forks };
}
