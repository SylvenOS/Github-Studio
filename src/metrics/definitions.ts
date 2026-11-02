/**
 * What every number means: where it comes from and how it is calculated. Served at /api/definitions,
 * shown in the web app next to each card, and mirrored in the README. Keep this honest - when a value
 * is an estimate or depends on the server having a token, say so.
 */
export interface MetricDefinition {
  id: string;
  label: string;
  source: string;
  calculation: string;
  /** Cards that show it. */
  cards: string[];
  /** Needs GITHUB_TOKEN on the server for an exact value. */
  token?: boolean;
  /** An estimate or a derived score, not a raw count. */
  estimate?: boolean;
}

export const DEFINITIONS: MetricDefinition[] = [
  { id: 'stars', label: 'Total stars', source: 'Public repositories owned by the user (forks excluded, up to 300 repos)', calculation: 'Sum of stargazer counts', cards: ['stats', 'profile-card', 'badge', 'design'] },
  { id: 'forks', label: 'Total forks', source: 'Public non-fork repositories owned by the user', calculation: 'Sum of fork counts', cards: ['stats', 'badge'] },
  { id: 'followers', label: 'Followers', source: 'GitHub user profile', calculation: 'Follower count as reported by GitHub', cards: ['stats', 'profile-card', 'design'] },
  { id: 'repos', label: 'Public repositories', source: 'GitHub user profile', calculation: 'Public repositories owned by the user, forks included', cards: ['stats', 'design'] },
  { id: 'contributions', label: 'Contributions (last year)', source: 'GitHub contribution calendar', calculation: 'Sum of daily contribution counts over the last 365 days, exactly as on the profile graph (commits, PRs, issues, reviews, repo creation; private ones only if the user shows them)', cards: ['stats', 'contributions', 'streak', 'design', 'monthly'] },
  { id: 'commits', label: 'Commits', source: 'contributionsCollection (with token) or commit search (without)', calculation: 'With a token: commit contributions in the last 12 months incl. restricted (private) ones. Without: lifetime commits found by search, which misses commits not attributed to the account', cards: ['stats', 'year'], token: true },
  { id: 'prs', label: 'Pull requests', source: 'GitHub pull request data', calculation: 'Lifetime pull requests authored by the user, any state', cards: ['stats', 'badge'] },
  { id: 'external_prs', label: 'Merged PRs into others’ repos', source: 'GitHub search', calculation: 'Pull requests authored by the user, merged, in repositories not owned by the user (author:USER is:pr is:merged -user:USER)', cards: ['impact', 'badge', 'achievements'] },
  { id: 'merge_rate', label: 'PR merge rate', source: 'GitHub pull request data', calculation: 'merged ÷ (merged + closed without merge), lifetime; open PRs are not counted', cards: ['impact', 'badge'], token: true },
  { id: 'repos_contributed', label: 'Repos contributed to', source: 'repositoriesContributedTo', calculation: 'Repositories not owned by the user that received their commits, PRs, issues or reviews in roughly the last year', cards: ['impact', 'achievements'], token: true },
  { id: 'reviews', label: 'Reviews', source: 'contributionsCollection', calculation: 'Pull request reviews submitted in the last 12 months', cards: ['stats', 'impact', 'year'], token: true },
  { id: 'streak', label: 'Streaks', source: 'GitHub contribution calendar', calculation: 'Consecutive days with at least one contribution. Today may still be empty without breaking the current streak', cards: ['streak', 'year', 'design'] },
  { id: 'consistency', label: 'Weekly consistency', source: 'GitHub contribution calendar', calculation: 'Share of weeks in the window with at least one contribution - one day off does not reset it', cards: ['patterns', 'badge'] },
  { id: 'activity_score', label: 'Activity score / grade', source: 'Derived from the metrics above', calculation: 'Weighted blend of contributions, merged external PRs, repos contributed to, consistency, reviews, stars and followers (each against a typical median). Missing factors are skipped. Shown as top-N% or a letter S…C. Not an official GitHub metric and not a measure of skill or code quality', cards: ['stats', 'profile-card', 'badge'], estimate: true },
  { id: 'languages', label: 'Top languages', source: 'Repository languages of owned non-fork repos', calculation: 'With a token: bytes of code per language (GitHub linguist). Without: number of repos per primary language', cards: ['languages', 'tech', 'design'] },
  { id: 'loc', label: 'Estimated lines of code', source: 'Repository language bytes', calculation: 'Bytes per language ÷ typical bytes per line for that language. An estimate, never an exact count', cards: ['code'], token: true, estimate: true },
  { id: 'language_trend', label: 'Language trend', source: 'contributionsCollection per year', calculation: 'Commit contributions per year grouped by the primary language of the repository they went to (up to 25 repos per year, private repos excluded)', cards: ['language-trend'], token: true },
  { id: 'punchcard', label: 'Commit punch card', source: 'Default-branch history of the 10 repos with most of the user’s commits in the last year', calculation: 'Up to 100 commits per repo bucketed by weekday and hour of the author timestamp (the author’s own timezone unless tz is set)', cards: ['punchcard'], token: true },
  { id: 'star_history', label: 'Star history', source: 'Stargazer timestamps (REST, oldest first)', calculation: 'A few evenly spaced pages are sampled; the first star of page N is star #(N-1)·100+1. GitHub lists only the first 40k stargazers, so the tail of bigger repos is a straight line', cards: ['stars'], estimate: true },
  { id: 'repo_health', label: 'Repository health signals', source: 'Repository data', calculation: 'Fixed thresholds, no blended score: last push <30d good, <180d warn; issues closed ≥70% good, ≥40% warn; latest release <180d good, <365d warn; default-branch commits in 30 days ≥10 good, ≥1 warn', cards: ['repo-compare'] },
  { id: 'coding_time', label: 'Coding time', source: 'WakaTime public stats API', calculation: 'Time tracked by WakaTime editor plugins for the chosen range; only visible when the WakaTime profile is public', cards: ['wakatime'] },
  { id: 'views', label: 'Profile views', source: 'This server’s counter (Durable Object)', calculation: 'Number of times the counter image was loaded. GitHub’s image proxy fetches it on every README view; bots and refreshes count too', cards: ['views'], estimate: true }
];
