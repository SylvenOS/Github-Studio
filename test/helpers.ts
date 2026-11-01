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
        pushed_at: '2024-05-01T00:00:00Z'
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
