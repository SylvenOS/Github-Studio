import { encode } from 'fast-png';
import { vi } from 'vitest';

/** 32x32 RGBA PNG: a bright disc on a transparent background, warm-to-cool left to right. */
export function makeAvatarPng(): Uint8Array {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5);
      const i = (y * size + x) * 4;
      const inside = d < 14;
      data.set([255 - x * 6, 80 + y * 4, 60 + x * 6, inside ? 255 : 0], i);
    }
  }
  return encode({ width: size, height: size, data, channels: 4, depth: 8 });
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const LEVELS = ['FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'] as const;

/** `n` consecutive days ending today; days listed in `gaps` (days ago) have no contributions. */
export function makeCalendar(n: number, gaps: number[] = []) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const ago = n - 1 - i;
    const count = gaps.includes(ago) ? 0 : (i % 5) + 1;
    return {
      date: iso(new Date(now - ago * 86_400_000)),
      contributionCount: count,
      contributionLevel: count === 0 ? 'NONE' : LEVELS[count % 4]
    };
  });
}

const repoNode = (name: string, stars: number, lang: string, color: string) => ({
  name,
  description: `The ${name} project <script>alert(1)</script>`,
  url: `https://github.com/octo/${name}`,
  stargazerCount: stars,
  forkCount: Math.floor(stars / 10),
  isArchived: false,
  pushedAt: '2024-05-01T00:00:00Z',
  primaryLanguage: { name: lang, color },
  languages: {
    edges: [
      { size: stars * 100 + 1, node: { name: lang, color } },
      { size: 500, node: { name: 'Shell', color: '#89e051' } }
    ]
  }
});

export const USER_FIXTURE = {
  login: 'octo',
  name: 'Octo Cat <b>',
  avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
  bio: null,
  createdAt: '2019-03-01T00:00:00Z',
  followers: { totalCount: 1234 },
  following: { totalCount: 5 },
  gists: { totalCount: 2 },
  all: { totalCount: 40 },
  pullRequests: { totalCount: 321 },
  issues: { totalCount: 45 },
  contributionsCollection: {
    totalCommitContributions: 800,
    totalPullRequestReviewContributions: 60,
    restrictedContributionsCount: 12,
    contributionCalendar: { totalContributions: 1500 }
  },
  repositories: {
    nodes: [
      repoNode('alpha', 5000, 'TypeScript', '#3178c6'),
      repoNode('beta', 300, 'Rust', '#dea584'),
      repoNode('gamma', 12, 'Python', '#3572A5'),
      repoNode('delta', 0, 'Go', '#00ADD8')
    ],
    pageInfo: { hasNextPage: false, endCursor: null }
  }
};

export const EXTENDED_FIXTURE = {
  pronouns: 'they/them',
  isHireable: true,
  status: { emoji: '🚀', message: 'Shipping things' },
  socialAccounts: { nodes: [{ provider: 'TWITTER', url: 'https://twitter.com/octo', displayName: '@octo' }] },
  starredRepositories: { totalCount: 120 },
  sponsors: { totalCount: 4 },
  sponsoring: { totalCount: 2 },
  organizations: { nodes: [{ login: 'acme', name: 'Acme', avatarUrl: 'https://avatars.githubusercontent.com/u/9' }, { login: 'rustlang', name: 'Rust', avatarUrl: 'https://avatars.githubusercontent.com/u/8' }] },
  repositoryDiscussions: { totalCount: 6 },
  repositoryDiscussionComments: { totalCount: 14 },
  mergedPRs: { totalCount: 250 },
  closedPRs: { totalCount: 50 },
  closedIssues: { totalCount: 30 },
  repositoriesContributedTo: { totalCount: 18 },
  pinnedItems: {
    nodes: [
      { name: 'alpha', description: 'The alpha project', url: 'https://github.com/octo/alpha', stargazerCount: 5000, forkCount: 500, owner: { login: 'octo' }, primaryLanguage: { name: 'TypeScript', color: '#3178c6' } },
      { name: 'cool-lib', description: 'An org library <b>bold</b>', url: 'https://github.com/acme/cool-lib', stargazerCount: 900, forkCount: 40, owner: { login: 'acme' }, primaryLanguage: { name: 'Rust', color: '#dea584' } },
      { name: 'gamma', description: null, url: 'https://github.com/octo/gamma', stargazerCount: 12, forkCount: 1, owner: { login: 'octo' }, primaryLanguage: null }
    ]
  },
  contributionsCollection: { totalPullRequestContributions: 120, totalIssueContributions: 30, contributionYears: [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019] }
};

const repoRef = (nameWithOwner: string, stars: number, lang: string, n: number) => ({
  repository: { nameWithOwner, owner: { login: nameWithOwner.split('/')[0] }, isPrivate: false, stargazerCount: stars, primaryLanguage: { name: lang, color: '#3178c6' } },
  contributions: { totalCount: n }
});

export const CONTRIB_FIXTURE = {
  user: {
    contributionsCollection: {
      totalCommitContributions: 800, totalPullRequestContributions: 120, totalIssueContributions: 30, totalPullRequestReviewContributions: 60,
      restrictedContributionsCount: 12, totalRepositoriesWithContributedCommits: 25, totalRepositoriesWithContributedPullRequests: 14,
      totalRepositoriesWithContributedIssues: 9, totalRepositoriesWithContributedPullRequestReviews: 7,
      pullRequestContributionsByRepository: [repoRef('vercel/next.js', 130000, 'TypeScript', 12), repoRef('octo/alpha', 5000, 'TypeScript', 40), repoRef('rust-lang/rust', 100000, 'Rust', 3)],
      commitContributionsByRepository: [repoRef('vercel/next.js', 130000, 'TypeScript', 30), repoRef('denoland/deno', 95000, 'Rust', 5)]
    }
  },
  ext: { issueCount: 42 }
};

/** Two pinned repos as GitHub renders them on a profile page (trimmed). */
export const PROFILE_HTML = '<ol><li class="pinned-item-list-item"><div class="pinned-item-list-item-content"><a href="/octo/alpha" class="Link text-bold"><span class="repo">alpha</span></a><p class="pinned-item-desc color-fg-muted">Fast :zap: things &amp; more</p><span class="repo-language-color" style="background-color: #3178c6"></span><span itemprop="programmingLanguage">TypeScript</span><a href="/octo/alpha/stargazers" class="pinned-item-meta"> 1.2k </a><a href="/octo/alpha/forks" class="pinned-item-meta"> 34 </a></div></li><li class="pinned-item-list-item"><div class="pinned-item-list-item-content"><a href="/acme/tool" class="Link text-bold"><span class="repo">tool</span></a><p class="pinned-item-desc"></p></div></li></ol>';

export const COMMIT_TIMES_FIXTURE = {
  contributionsCollection: {
    commitContributionsByRepository: [
      { repository: { isPrivate: false, defaultBranchRef: { target: { history: { nodes: [
        { authoredDate: '2026-03-03T23:15:00+05:30' }, { authoredDate: '2026-03-03T23:45:00+05:30' }, { authoredDate: '2026-03-04T09:00:00-07:00' }, { authoredDate: '2026-03-05T14:10:00Z' }
      ] } } } } },
      { repository: { isPrivate: true, defaultBranchRef: { target: { history: { nodes: [{ authoredDate: '2026-03-06T03:00:00Z' }] } } } } }
    ]
  }
};

export const SPONSORS_FIXTURE = {
  list: { totalCount: 30, nodes: [
    { __typename: 'User', login: 'alice', name: 'Alice Doe', avatarUrl: 'https://avatars.githubusercontent.com/u/11' },
    { __typename: 'Organization', login: 'acme', name: 'Acme <Inc>', avatarUrl: 'https://avatars.githubusercontent.com/u/12' },
    { __typename: 'User', login: 'bob', name: null, avatarUrl: 'https://avatars.githubusercontent.com/u/13' }
  ] }
};

export const repoHealthNode = (nameWithOwner: string) => ({
  nameWithOwner, description: 'A <great> repo', stargazerCount: nameWithOwner.length * 100, forkCount: 40, watchers: { totalCount: 9 },
  isArchived: false, createdAt: '2019-01-01T00:00:00Z', pushedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(), licenseInfo: { spdxId: 'MIT' },
  primaryLanguage: { name: 'TypeScript', color: '#3178c6' }, openIssues: { totalCount: 10 }, closedIssues: { totalCount: 90 },
  openPRs: { totalCount: 4 }, mergedPRs: { totalCount: 300 },
  releases: { totalCount: 12, nodes: [{ tagName: 'v2.0.0', publishedAt: new Date(Date.now() - 40 * 86_400_000).toISOString() }] },
  defaultBranchRef: { target: { history: { totalCount: 25 } } }
});

export const WAKATIME_FIXTURE = {
  username: 'octo', human_readable_total: '21 hrs 5 mins', human_readable_daily_average: '3 hrs 1 min', is_up_to_date: true,
  best_day: { date: '2026-10-30', text: '6 hrs 2 mins' },
  languages: [{ name: 'TypeScript', percent: 61.2, text: '12 hrs 54 mins' }, { name: 'Rust', percent: 25.1, text: '5 hrs 18 mins' }, { name: 'Markdown <md>', percent: 13.7, text: '2 hrs 53 mins' }],
  editors: [{ name: 'VS Code', percent: 90, text: '19 hrs' }, { name: 'Neovim', percent: 10, text: '2 hrs' }]
};

export const SPOTIFY_TRACK = {
  name: 'Song & <Dance>', duration_ms: 200000, artists: [{ name: 'The Band' }],
  album: { name: 'Album', images: [{ url: 'https://i.scdn.co/image/abc', width: 64 }] },
  external_urls: { spotify: 'https://open.spotify.com/track/1' }
};

/** In-memory stand-in for the VIEWS Durable Object namespace. */
export function fakeViews() {
  const counts = new Map<string, number>();
  return {
    idFromName: (name: string) => name,
    get: (id: string) => ({
      fetch: async (url: string) => {
        if (String(url).endsWith('/hit')) counts.set(id, (counts.get(id) ?? 0) + 1);
        return Response.json({ count: counts.get(id) ?? 0 });
      }
    })
  };
}

/** Worker env for tests: a token, Spotify credentials and a fake view-counter binding. */
export const testEnv = () => ({ GITHUB_TOKEN: 'test-token', SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret', SPOTIFY_REFRESH_TOKEN: 'refresh', VIEWS: fakeViews() });

export interface MockOptions {
  calendarDays?: number;
  gaps?: number[];
  userMissing?: boolean;
  avatarFails?: boolean;
}

/** Stubs global fetch with GitHub GraphQL + REST responses. Returns the mock for call assertions. */
export function mockGitHub(opts: MockOptions = {}) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/graphql')) {
      if (opts.userMissing) {
        return Response.json({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'nope' }] });
      }
      const { query, variables } = JSON.parse(String(init?.body));
      if (/user\(login:\$login\)\{ id \}/.test(query)) return Response.json({ data: { user: { id: 'U_1' } } });
      if (query.includes('authoredDate')) return Response.json({ data: { user: COMMIT_TIMES_FIXTURE } });
      if (query.includes('list:sponsors') || query.includes('list:sponsoring')) return Response.json({ data: { user: SPONSORS_FIXTURE } });
      if (query.includes('openPRs:')) {
        const data: Record<string, unknown> = {};
        for (const k of Object.keys(variables).filter((k) => /^o\d/.test(k))) data[`r${k.slice(1)}`] = repoHealthNode(`${variables[k]}/${variables[`n${k.slice(1)}`]}`);
        return Response.json({ data });
      }
      const years = [...String(query).matchAll(/y(\d{4}):contributionsCollection/g)].map((m) => m[1]);
      if (years.length) {
        const user: Record<string, unknown> = {};
        years.forEach((y, i) => (user[`y${y}`] = { commitContributionsByRepository: [
          { repository: { isPrivate: false, primaryLanguage: { name: 'TypeScript', color: '#3178c6' } }, contributions: { totalCount: 50 + i * 20 } },
          { repository: { isPrivate: false, primaryLanguage: { name: i % 2 ? 'Rust' : 'Go', color: null } }, contributions: { totalCount: 30 } },
          { repository: { isPrivate: true, primaryLanguage: { name: 'Secret', color: null } }, contributions: { totalCount: 999 } }
        ] }));
        return Response.json({ data: { user } });
      }
      if (query.includes('contributionsCollection(from') && !query.includes('ContributionsByRepository')) {
        const days = makeCalendar(opts.calendarDays ?? 60, opts.gaps);
        const user: Record<string, unknown> = {};
        for (const k of Object.keys(variables).filter((k) => /^f\d/.test(k))) {
          user[`r${k.slice(1)}`] = { contributionCalendar: { totalContributions: 0, weeks: [{ contributionDays: days }] } };
        }
        return Response.json({ data: { user } });
      }
      if (query.includes('pinnedItems')) return Response.json({ data: { user: EXTENDED_FIXTURE } });
      if (query.includes('ContributionsByRepository')) return Response.json({ data: CONTRIB_FIXTURE });
      return Response.json({ data: { user: USER_FIXTURE } });
    }
    if (url.startsWith('https://avatars.githubusercontent.com/')) {
      if (opts.avatarFails) return new Response('nope', { status: 500 });
      return new Response(makeAvatarPng(), { headers: { 'content-type': 'image/png' } });
    }
    if (url === 'https://github.com/octo') return new Response(PROFILE_HTML, { headers: { 'content-type': 'text/html' } });
    if (/\/repos\/octo\/[\w.-]+\/languages$/.test(url)) return Response.json({ TypeScript: 30000, CSS: 2000 });
    if (url.includes('wakatime.com/api/v1/users/narrow/stats/')) return Response.json({ error: "Time range not matching user's public stats range." }, { status: 400 });
    if (url === 'https://wakatime.com/api/v1/users/narrow/stats') return Response.json({ data: { ...WAKATIME_FIXTURE, range: 'last_30_days' } });
    if (url.includes('/search/issues') && url.includes('sort=updated')) return Response.json({ items: [{ title: 'Fix <b>crash</b> on startup', repository_url: 'https://api.github.com/repos/vercel/next.js', html_url: 'https://github.com/vercel/next.js/pull/1', pull_request: { merged_at: '2026-10-01T10:00:00Z' } }, { title: 'Docs: typo', repository_url: 'https://api.github.com/repos/rust-lang/rust', html_url: 'https://github.com/rust-lang/rust/pull/2', closed_at: '2026-09-20T10:00:00Z' }] });
    if (url.includes('/search/commits?q=author')) return Response.json({ items: [{ commit: { author: { date: '2026-03-03T08:00:00+02:00' } } }, { commit: { author: { date: '2026-03-04T21:30:00-05:00' } } }] });
    if (url.includes('/stargazers')) {
      const page = Number(new URL(url).searchParams.get('page') ?? 1);
      return Response.json(Array.from({ length: page === 50 ? 37 : 100 }, (_, i) => ({ starred_at: new Date(Date.UTC(2020, 0, 1) + (page * 100 + i) * 3_600_000 * 8).toISOString() })));
    }
    if (url.startsWith('https://wakatime.com/api/v1/users/')) {
      if (url.includes('/users/private/')) return new Response('{}', { status: 403 });
      return Response.json({ data: WAKATIME_FIXTURE });
    }
    if (url === 'https://accounts.spotify.com/api/token') return Response.json({ access_token: 'sp-token', expires_in: 3600 });
    if (url.startsWith('https://api.spotify.com/v1/me/player/currently-playing')) return Response.json({ is_playing: true, progress_ms: 60000, item: SPOTIFY_TRACK });
    if (url.startsWith('https://api.spotify.com/v1/me/player/recently-played')) return Response.json({ items: [{ track: SPOTIFY_TRACK }] });
    if (url.startsWith('https://i.scdn.co/')) return new Response(makeAvatarPng(), { headers: { 'content-type': 'image/png' } });
    if (url.includes('/rate_limit')) {
      return Response.json({ resources: { core: { limit: 5000, remaining: 4321, reset: 1900000000 } } });
    }
    if (url.includes('/repos/octo/alpha')) {
      return Response.json({
        owner: { login: 'octo' },
        name: 'alpha',
        description: 'A long description '.repeat(6),
        html_url: 'https://github.com/octo/alpha',
        stargazers_count: 5000,
        forks_count: 500,
        subscribers_count: 50,
        open_issues_count: 7,
        language: 'TypeScript',
        license: { spdx_id: 'MIT' },
        topics: ['a'],
        size: 100,
        archived: false,
        fork: false,
        pushed_at: '2024-05-01T00:00:00Z',
        created_at: '2020-01-01T00:00:00Z',
        full_name: 'octo/alpha'
      });
    }
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Cheap XML well-formedness check: tags must nest and close properly. */
export function assertWellFormedSvg(svg: string) {
  if (!svg.startsWith('<svg')) throw new Error('Not an SVG document');
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g)) {
    const [, closing, name, attrs, selfClosing] = m;
    // browsers refuse to render an SVG image with a duplicate attribute or a raw `&`/`<` inside a value
    const seen = new Set<string>();
    for (const a of attrs.matchAll(/\s([\w:-]+)=("[^"]*"|'[^']*')/g)) {
      if (seen.has(a[1])) throw new Error(`Duplicate attribute "${a[1]}" on <${name}>`);
      seen.add(a[1]);
      if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(a[2]) || a[2].slice(1, -1).includes('<')) throw new Error(`Unescaped character in ${a[1]} on <${name}>`);
    }
    if (selfClosing) continue;
    if (closing) {
      const open = stack.pop();
      if (open !== name) throw new Error(`Mismatched </${name}>, expected </${open}>`);
    } else {
      stack.push(name);
    }
  }
  if (stack.length) throw new Error(`Unclosed tags: ${stack.join(', ')}`);
  if (/<script/i.test(svg)) throw new Error('Unescaped <script> in output');
}
