import type { Block, CardBlock } from './spec';

export interface Preset {
  id: string;
  title: string;
  description: string;
  /** Theme the preset looks best with (users can still override it). */
  theme?: string;
  build(username: string): Block[];
}

const card = (id: string, params: Record<string, string> = {}, extra: Partial<CardBlock> = {}): CardBlock => ({ type: 'card', card: id, params, ...extra });
const row = (...items: CardBlock[]): Block => ({ type: 'row', items });
const divider = (style = 'wave'): Block => ({ type: 'divider', style });

/** Starting points for the README builder and `GET /api/readme?preset=`. Add one here to offer it everywhere. */
export const PRESETS: Preset[] = [
  // ---- design systems: one visual identity across every image ----
  {
    id: 'terminal-os',
    title: 'Design: Terminal OS',
    description: 'Your profile as a live terminal: neofetch-style identity, projects and languages, then matching stats, punch card and heatmap.',
    theme: 'terminal',
    build: () => [
      card('design', { design: 'terminal', role: 'Software engineer', now: 'shipping side projects' }),
      row(card('stats', { show_icons: 'true', rank: 'letter' }), card('punchcard', { shape: 'heat' })),
      card('contributions', { shape: 'square' }),
      card('quote', { layout: 'terminal' })
    ]
  },
  {
    id: 'code-studio',
    title: 'Design: Code Studio',
    description: 'An IDE window with your profile as code, an activity terminal and a status bar, followed by language trends and pinned work.',
    theme: 'vscode',
    build: () => [
      card('design', { design: 'ide', role: 'Full-stack developer', now: 'building developer tools' }),
      row(card('language-trend', { layout: 'bars' }), card('code')),
      card('pinned')
    ]
  },
  {
    id: 'editorial',
    title: 'Design: Editorial',
    description: 'A magazine-style front page: big serif name, selected work, the numbers that matter and your toolkit. Calm and professional.',
    theme: 'editorial',
    build: () => [
      card('design', { design: 'editorial', role: 'Engineer & writer' }),
      card('year'),
      row(card('impact', { count: '3' }), card('patterns'))
    ]
  },
  {
    id: 'dev-dashboard',
    title: 'Design: Developer Dashboard',
    description: 'A Linear-style dashboard: KPI tiles, activity, languages and a project table, then monthly trends and repository health.',
    theme: 'linear',
    build: () => [
      card('design', { design: 'dashboard', role: 'Engineering lead' }),
      row(card('monthly'), card('punchcard')),
      card('repo-compare')
    ]
  },
  {
    id: 'blueprint',
    title: 'Design: Blueprint',
    description: 'An engineering drawing: your projects as modules wired to you, a dimensioned contribution line and a title block. For system thinkers.',
    theme: 'blueprint',
    build: () => [
      card('design', { design: 'blueprint', role: 'Systems engineer' }),
      row(card('stats', { layout: 'compact' }), card('languages', { layout: 'bars' })),
      card('skyline', { stats: 'true' })
    ]
  },
  {
    id: 'retro',
    title: 'Design: Retro Arcade',
    description: 'Player 1 has entered the game: high score, XP, skills as health bars and projects as quests, plus trophies and a typing header.',
    theme: 'retro',
    build: (u) => [
      card('typing', { lines: `INSERT COIN;PLAYER ${u.toUpperCase()} READY`, align: 'center' }),
      card('design', { design: 'retro' }),
      card('achievements'),
      card('contributions', { shape: 'square' })
    ]
  },
  {
    id: 'analyst',
    title: 'Data-driven analyst',
    description: 'Realistic analytics only: year in review, monthly trend vs last year, commit punch card, language trend and code volume.',
    build: () => [card('year'), row(card('monthly'), card('punchcard')), row(card('language-trend'), card('code'))]
  },
  {
    id: 'recruiter',
    title: 'Minimal recruiter',
    description: 'Calm and scannable: a typed intro, realistic impact, one stats image and your pinned work. Adapts to light/dark.',
    theme: 'auto',
    build: (u) => [
      card('typing', { lines: `Hi, I'm ${u};I build reliable software in the open`, align: 'left', size: '20' }),
      card('impact', { count: '3' }),
      card('composite', { cards: 'stats,languages', 'languages.layout': 'donut' }),
      card('pinned')
    ]
  },
  {
    id: 'maximal',
    title: 'Maximal showcase',
    description: 'Everything at once: header waves, typing intro, tech grid, stats, streak, 3D skyline, snake heatmap, trophies, pins and a footer wave.',
    build: (u) => [
      { type: 'divider', style: 'header' },
      card('typing', { lines: `Hi there, I'm ${u};Welcome to my corner of GitHub;Thanks for stopping by`, animation: 'true' }),
      card('tech'),
      card('composite', { cards: 'stats,languages', 'stats.show_icons': 'true', 'languages.layout': 'donut' }),
      row(card('streak'), card('patterns')),
      card('skyline'),
      card('contributions', { effect: 'snake' }),
      card('achievements'),
      card('pinned'),
      { type: 'divider', style: 'footer' }
    ]
  },
  {
    id: 'classic',
    title: 'Classic',
    description: 'Banner, stats and languages side by side, streak, heatmap, trophies and top repositories.',
    build: (u) => [
      card('banner', { style: 'wave', text: `Hi there, I'm ${u}`, subtitle: 'Welcome to my GitHub profile' }),
      row(card('stats', { show_icons: 'true' }), card('languages', { layout: 'donut' })),
      card('streak'),
      card('contributions'),
      card('achievements'),
      card('top-repos', { limit: '3' })
    ]
  },
  {
    id: 'minimal',
    title: 'Minimal',
    description: 'Just the essentials: compact stats, languages and your streak.',
    build: () => [row(card('stats', { layout: 'compact' }), card('languages')), card('streak')]
  },
  {
    id: 'showcase',
    title: 'Showcase',
    description: 'Profile card with a flipping ASCII avatar, then stats, activity, trophies and projects.',
    build: (u) => [
      card('banner', { style: 'gradient', bg: '135,7f5af0,2cb67d', text: u, subtitle: 'Building things in the open' }),
      row(card('profile-card'), card('ascii', { shape: 'coin', charset: 'dense', animation: 'true', cols: '40' })),
      row(card('stats', { show_icons: 'true' }), card('streak')),
      card('activity', { style: 'area' }),
      card('achievements'),
      row(card('top-repos', { limit: '3' }), card('radar')),
      card('contributions')
    ]
  },
  {
    id: 'hacker',
    title: 'Hacker',
    description: 'Terminal banner and Matrix-style ASCII avatar. Pairs with the matrix theme.',
    theme: 'matrix',
    build: (u) => [
      card('banner', { style: 'terminal', text: u, subtitle: 'open source · coffee · code' }),
      card('ascii', { charset: 'alnum', animation: 'true' }),
      row(card('stats'), card('languages')),
      card('streak'),
      card('contributions')
    ]
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Dense grid of everything: stats, languages, streak, activity, heatmap, trophies.',
    build: () => [
      row(card('stats', { show_icons: 'true' }), card('languages')),
      row(card('streak'), card('activity')),
      card('contributions'),
      card('achievements', { columns: '5', progress: 'false' })
    ]
  },
  {
    id: 'badges',
    title: 'Badges',
    description: 'Compact profile built from shields: numbers, a tech-stack row and social links to fill in.',
    build: (u) => [
      card('banner', { style: 'grid', text: u }),
      {
        type: 'badges',
        items: [
          { kind: 'stat', name: 'stars' },
          { kind: 'stat', name: 'followers' },
          { kind: 'stat', name: 'repos' },
          { kind: 'stat', name: 'rank' }
        ]
      },
      { type: 'heading', text: 'Tech stack', level: 3, align: 'center' },
      { type: 'badges', items: [{ kind: 'tech', name: 'TypeScript' }, { kind: 'tech', name: 'Python' }, { kind: 'tech', name: 'Go' }, { kind: 'tech', name: 'Docker' }] },
      { type: 'heading', text: 'Find me', level: 3, align: 'center' },
      { type: 'badges', items: [{ kind: 'social', name: 'github', handle: u }] },
      card('streak')
    ]
  },
  {
    id: 'ascii',
    title: 'ASCII hero',
    description: 'A spinning ASCII globe of your avatar on top, with the key numbers underneath.',
    build: (u) => [
      card('ascii', { shape: 'sphere', charset: 'dense', animation: 'true' }),
      { type: 'heading', text: u, level: 2, align: 'center' },
      row(card('stats'), card('languages')),
      divider('dots'),
      card('streak')
    ]
  }
];

export const findPreset = (id: string) => PRESETS.find((p) => p.id === id);
