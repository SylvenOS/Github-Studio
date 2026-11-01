import type { Query } from './params';

/**
 * github-readme-stats compatibility. That project is no longer maintained and its public instance is
 * unreliable; swapping its host for ours should just work. Its parameters are rewritten to ours
 * *before* parsing and cache-keying, so a readme-stats URL and its native equivalent share one cache entry.
 */
const RENAMES: Record<string, string> = {
  bg_color: 'bg',
  text_color: 'fg',
  border_color: 'border',
  border_radius: 'radius',
  custom_title: 'title',
  card_width: 'width',
  exclude_repo: 'exclude',
  langs_count: 'langs_count'
};

/** Accepted for compatibility but meaningless here. */
const IGNORED = new Set(['count_private', 'include_all_commits', 'hide_rank', 'rank_icon', 'show_owner_name', 'disable_animations', 'line_height', 'hide_progress', 'description_lines_count']);

const LANGUAGE_LAYOUTS: Record<string, string> = { normal: 'bar', compact: 'bar', 'donut-vertical': 'donut', pie: 'donut', donut: 'donut' };
const STAT_KEYS: Record<string, string> = { contribs: 'contributions', prs_merged: 'prs' };

export function applyCompat(cardId: string, query: Query): Query {
  const q: Query = {};
  for (const [k, v] of Object.entries(query)) {
    if (k === 'disable_animations') {
      if (v === 'true') q.animation = 'false';
      continue;
    }
    if (IGNORED.has(k)) continue;
    const name = RENAMES[k] ?? k;
    if (q[name] === undefined) q[name] = v; // native names win over aliases
  }
  // readme-stats allows a leading # on colours via %23; ours already accept it, but strip whitespace
  for (const c of ['bg', 'fg', 'border', 'muted', 'accent', 'title_color', 'icon_color']) if (q[c]) q[c] = q[c].trim();

  if (cardId === 'languages' && q.layout && LANGUAGE_LAYOUTS[q.layout]) q.layout = LANGUAGE_LAYOUTS[q.layout];
  if (cardId === 'stats' && q.hide) q.hide = q.hide.split(',').map((s) => STAT_KEYS[s.trim()] ?? s.trim()).join(',');
  if (cardId === 'stats' && q.show) q.show = q.show.split(',').map((s) => STAT_KEYS[s.trim()] ?? s.trim()).join(',');
  return q;
}
