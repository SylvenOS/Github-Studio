import { vi } from 'vitest';

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
  avatarUrl: 'https://example.com/a.png',
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

export interface MockOptions {
  calendarDays?: number;
  gaps?: number[];
  userMissing?: boolean;
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
      if (query.includes('contributionsCollection(from')) {
        const days = makeCalendar(opts.calendarDays ?? 60, opts.gaps);
        const user: Record<string, unknown> = {};
        for (const k of Object.keys(variables).filter((k) => /^f\d/.test(k))) {
          user[`r${k.slice(1)}`] = { contributionCalendar: { totalContributions: 0, weeks: [{ contributionDays: days }] } };
        }
        return Response.json({ data: { user } });
      }
      return Response.json({ data: { user: USER_FIXTURE } });
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
    const [, closing, name, , selfClosing] = m;
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
