import { describe, expect, it } from 'vitest';
import { determineRank } from '../src/achievements/engine';
import { layoutDays } from '../src/cards/contributions';
import { languageShares } from '../src/cards/languages';
import { bool, color, int, parseCommon, username } from '../src/core/params';
import { compact, esc, truncate, wrap } from '../src/core/text';
import { aggregateRepos, mergeCalendars, parseContributionHtml } from '../src/github/parse';
import { computeStreaks } from '../src/metrics/streak';
import { resolveTheme } from '../src/themes';

const day = (date: string, count: number) => ({ date, count, level: (count ? 2 : 0) as 0 | 2 });

describe('text helpers', () => {
  it('escapes XML and strips illegal control chars', () => {
    expect(esc('<a href="x">&\'</a>\u0000')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
  });
  it('truncates by code point', () => {
    expect(truncate('hello world', 6)).toBe('hello…');
    expect(truncate('short', 10)).toBe('short');
  });
  it('wraps to max lines with ellipsis', () => {
    const lines = wrap('one two three four five six seven eight', 12, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(wrap('tiny', 20, 2)).toEqual(['tiny']);
  });
  it('compacts numbers', () => {
    expect([999, 1000, 1234, 15_400, 1_500_000].map(compact)).toEqual(['999', '1k', '1.2k', '15.4k', '1.5M']);
  });
});

describe('param parsing', () => {
  it('validates usernames', () => {
    expect(username('octo-cat')).toBe('octo-cat');
    for (const bad of ['', '-x', 'x-', 'a--b', 'a'.repeat(40), '<svg>', 'a b']) expect(() => username(bad)).toThrow();
  });
  it('accepts only real hex colours', () => {
    expect(color('fff')).toBe('#fff');
    expect(color('#00ff00aa')).toBe('#00ff00aa');
    expect(color('red')).toBeUndefined();
    expect(color('fff;}</style>')).toBeUndefined();
  });
  it('clamps numbers and parses booleans', () => {
    expect(int('999', 5, 1, 10)).toBe(10);
    expect(int('abc', 5, 1, 10)).toBe(5);
    expect(bool('true', false)).toBe(true);
    expect(bool(undefined, true)).toBe(true);
  });
  it('sanitises font and falls back for unknown themes', () => {
    const c = parseCommon({ username: 'octo', font: 'Fira Code;}</style><script>', theme: 'nope' });
    expect(c.font).not.toMatch(/[;<>{}]/);
    expect(c.theme).toBe('default');
  });
});

describe('themes', () => {
  it('applies overrides and adds a dark palette for auto', () => {
    const t = resolveTheme('auto', { accent: '#f00' }, { radius: 20 });
    expect(t.accent).toBe('#f00');
    expect(t.borderRadius).toBe(20);
    expect(t.dark?.background).toBeDefined();
    expect(resolveTheme('dracula').dark).toBeUndefined();
  });
});

describe('streaks', () => {
  it('finds longest and current streaks', () => {
    const s = computeStreaks([
      day('2024-01-01', 1), day('2024-01-02', 2), day('2024-01-03', 0),
      day('2024-01-04', 1), day('2024-01-05', 1), day('2024-01-06', 1)
    ]);
    expect(s.total).toBe(6);
    expect(s.longest).toEqual({ length: 3, start: '2024-01-04', end: '2024-01-06' });
    expect(s.current).toEqual({ length: 3, start: '2024-01-04', end: '2024-01-06' });
  });
  it('does not break the current streak when today is still empty', () => {
    const s = computeStreaks([day('2024-01-01', 1), day('2024-01-02', 1), day('2024-01-03', 0)]);
    expect(s.current.length).toBe(2);
  });
  it('breaks the streak when yesterday is also empty', () => {
    const s = computeStreaks([day('2024-01-01', 1), day('2024-01-02', 0), day('2024-01-03', 0)]);
    expect(s.current.length).toBe(0);
    expect(computeStreaks([]).longest.length).toBe(0);
  });
});

describe('GitHub parsing', () => {
  it('reads exact counts from the contribution graph markup', () => {
    const html = `
      <td data-ix="0" data-date="2024-01-07" id="contribution-day-component-0-0" data-level="1" class="ContributionCalendar-day"></td>
      <tool-tip for="contribution-day-component-0-0" class="sr-only">1 contribution on January 7th.</tool-tip>
      <td data-ix="1" data-date="2024-01-08" id="contribution-day-component-1-0" data-level="0" class="ContributionCalendar-day"></td>
      <tool-tip for="contribution-day-component-1-0">No contributions on January 8th.</tool-tip>
      <td data-date="2024-01-09" id="contribution-day-component-2-0" data-level="4"></td>
      <tool-tip for="contribution-day-component-2-0">1,204 contributions on January 9th.</tool-tip>`;
    expect(parseContributionHtml(html).map((d) => [d.date, d.count, d.level])).toEqual([
      ['2024-01-07', 1, 1],
      ['2024-01-08', 0, 0],
      ['2024-01-09', 1204, 4]
    ]);
  });
  it('merges overlapping calendars without duplicating days', () => {
    const merged = mergeCalendars([
      [day('2024-01-02', 1), day('2024-01-01', 1)],
      [day('2024-01-02', 5), day('2024-01-03', 1)]
    ]);
    expect(merged.map((d) => d.date)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
  });
  it('aggregates repos into totals and language sizes', () => {
    const node = (name: string, stars: number, lang: string) => ({
      name, description: null, url: '', stargazerCount: stars, forkCount: 1, isArchived: false, pushedAt: null,
      primaryLanguage: { name: lang, color: '#111111' },
      languages: { edges: [{ size: 100 * stars, node: { name: lang, color: '#111111' } }] }
    });
    const r = aggregateRepos([node('a', 1, 'Go'), node('b', 9, 'Rust'), node('c', 3, 'Go')]);
    expect(r.stars).toBe(13);
    expect(r.repos[0].name).toBe('b');
    expect(r.languages.map((l) => [l.name, l.size, l.repos])).toEqual([['Rust', 900, 1], ['Go', 400, 2]]);
  });
});

describe('card logic', () => {
  it('computes language shares that sum to 100 and honours hide', () => {
    const langs = [
      { name: 'TS', color: null, size: 600, repos: 1 },
      { name: 'HTML', color: null, size: 300, repos: 5 },
      { name: 'Go', color: null, size: 100, repos: 1 }
    ];
    const all = languageShares(langs, { count: 5, hide: [], by: 'size' });
    expect(all.reduce((a, l) => a + l.percent, 0)).toBeCloseTo(100);
    expect(languageShares(langs, { count: 5, hide: ['html'], by: 'size' }).map((l) => l.name)).toEqual(['TS', 'Go']);
    expect(languageShares(langs, { count: 1, hide: [], by: 'repos' })[0].name).toBe('HTML');
  });
  it('lays out days into Sunday-first columns', () => {
    const cells = layoutDays([day('2024-01-06', 1), day('2024-01-07', 1), day('2024-01-08', 1)]); // Sat, Sun, Mon
    expect(cells.map((c) => [c.col, c.dow])).toEqual([[0, 6], [1, 0], [1, 1]]);
  });
  it('ranks values against thresholds', () => {
    const t = [10, 100, 500, 1000, 2000, 5000, 10000, 20000];
    expect([0, 10, 100, 25000].map((v) => determineRank(v, t))).toEqual(['E', 'D', 'C', 'SSS+']);
  });
});
