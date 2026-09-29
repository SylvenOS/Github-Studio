import { defineCard } from './types';
import { bool, int, list, oneOf } from '../core/params';
import { compact, esc, fmt } from '../core/text';
import { RANKS, calculateTrophies, overallRank, trophyIds, type Trophy, type TrophyRank } from '../achievements/engine';
import { calculateProfileMetrics } from '../metrics';
import { anim, contentTop, frame, PAD } from '../svg/frame';
import { trophyArt, trophyDefs } from '../svg/trophy';

const STYLES = ['trophy', 'badge'] as const;
const SORTS = ['default', 'rank'] as const;

interface Params {
  columns: number;
  hide: string[];
  style: (typeof STYLES)[number];
  sort: (typeof SORTS)[number];
  minRank: TrophyRank;
  progress: boolean;
}

const RANK_COLORS: Record<TrophyRank, string> = {
  'SSS+': '#ff003c', SSS: '#ff4500', SS: '#ff8c00', S: '#ffd700', A: '#32cd32', B: '#1e90ff', C: '#9370db', D: '#a9a9a9', E: '#696969'
};

/** Shield/hexagon outline whose shape gets more elaborate with rank (the `badge` style). */
function badge(rank: TrophyRank): string {
  const c = RANK_COLORS[rank];
  const glow = (px: number) => `style="filter:drop-shadow(0 0 ${px}px ${c}88)"`;
  const text = `<text x="70" y="58" text-anchor="middle" font-size="${rank.length > 2 ? 20 : 24}" font-weight="900" fill="${c}">${rank}</text>`;
  let shape: string;
  if (rank === 'SSS+' || rank === 'SSS') {
    shape =
      `<polygon points="70,10 105,40 90,85 50,85 35,40" class="bg" stroke="${c}" stroke-width="3" ${glow(10)}/>` +
      `<polygon points="70,18 95,43 83,78 57,78 45,43" stroke="${c}" stroke-width="2" opacity=".8"/>` +
      `<circle cx="70" cy="50" r="38" stroke="${c}" stroke-dasharray="4 4" opacity=".5"/>`;
  } else if (rank === 'SS' || rank === 'S') {
    shape =
      `<path d="M40 20 L70 10 L100 20 L100 50 C100 75 70 90 70 90 C70 90 40 75 40 50 Z" class="bg" stroke="${c}" stroke-width="3.5" ${glow(8)}/>` +
      `<path d="M48 26 L70 18 L92 26 L92 48 C92 68 70 80 70 80 C70 80 48 68 48 48 Z" stroke="${c}" stroke-width="1.5" opacity=".7"/>`;
  } else if (rank === 'A' || rank === 'B') {
    shape =
      `<polygon points="70,15 100,32 100,68 70,85 40,68 40,32" class="bg" stroke="${c}" stroke-width="3" ${glow(6)}/>` +
      `<polygon points="70,22 92,35 92,65 70,78 48,65 48,35" stroke="${c}" opacity=".6"/>`;
  } else {
    shape =
      `<circle cx="70" cy="50" r="35" class="bg" stroke="${c}" stroke-width="3" ${glow(4)}/>` +
      `<circle cx="70" cy="50" r="28" stroke="${c}" opacity=".6"/>`;
  }
  return shape + text;
}

export function selectTrophies(all: Trophy[], p: Pick<Params, 'hide' | 'sort' | 'minRank'>): Trophy[] {
  const min = RANKS.indexOf(p.minRank);
  const shown = all.filter((t) => !p.hide.includes(t.id) && t.level - 1 >= min);
  return p.sort === 'rank' ? [...shown].sort((a, b) => b.level - a.level || b.progress - a.progress) : shown;
}

export const achievementsCard = defineCard<Params, Trophy[]>({
  id: 'achievements',
  category: 'achievements',
  tags: ['trophies', 'rank', 'level', 'gamification'],
  variants: [
    { label: 'Trophies' },
    { label: 'Shield badges', params: { style: 'badge' } },
    { label: 'Highest ranks', params: { sort: 'rank', min_rank: 'S' } },
    { label: 'Compact row', params: { columns: '5', progress: 'false' } }
  ],
  aliases: ['trophies'],
  title: 'GitHub Achievements',
  description: 'Trophies that grow from a wooden cup (E) to a winged crown (SSS+) as you level up.',
  params: [
    { name: 'style', type: 'enum', options: [...STYLES], default: 'trophy', description: 'Trophy artwork or shield badges' },
    { name: 'columns', type: 'number', default: 3, min: 1, max: 6, description: 'Trophies per row' },
    { name: 'sort', type: 'enum', options: [...SORTS], default: 'default', description: 'Keep order or show highest rank first' },
    { name: 'min_rank', type: 'enum', options: [...RANKS], default: 'E', description: 'Hide trophies below this rank' },
    { name: 'progress', type: 'boolean', default: true, description: 'Show progress toward the next rank' },
    { name: 'hide', type: 'list', description: `Trophies to hide: ${trophyIds.join(', ')}` }
  ],
  parse: (q) => ({
    columns: int(q.columns, 3, 1, 6),
    hide: list(q.hide),
    style: oneOf(q.style, STYLES, 'trophy'),
    sort: oneOf(q.sort, SORTS, 'default'),
    minRank: oneOf(q.min_rank, RANKS, 'E'),
    progress: bool(q.progress, true)
  }),
  load: async (client, _p, common) => calculateTrophies(calculateProfileMetrics(await client.getUser(common.username))),
  toJSON: (trophies, p) => ({ overall: overallRank(trophies), trophies: selectTrophies(trophies, p) }),

  render(all, p, { theme, common, title, t }) {
    const header = title(t('title.achievements'));
    const trophies = selectTrophies(all, p);
    const overall = overallRank(all);
    const itemW = 140;
    const itemH = p.progress ? 175 : 160;
    const rows = Math.ceil(trophies.length / p.columns) || 1;
    const top = contentTop(!!header) - 15;
    const width = Math.max(p.columns * itemW + PAD * 2 + 10, 320);
    const offsetX = (width - p.columns * itemW) / 2;
    const defs = p.style === 'trophy' ? `<defs>${trophyDefs(trophies.map((x) => x.rank), common.animation)}</defs>` : '';

    const items = trophies
      .map((tr, i) => {
        const x = offsetX + (i % p.columns) * itemW;
        const y = top + Math.floor(i / p.columns) * itemH + 14;
        const art = p.style === 'trophy' ? `<g transform="translate(0 8)">${trophyArt(tr.rank, common.animation)}</g>` : badge(tr.rank);
        const bar = p.progress
          ? `<rect x="25" y="150" width="90" height="4" rx="2" class="bd"/>` +
            `<rect x="25" y="150" width="${(90 * tr.progress).toFixed(1)}" height="4" rx="2" fill="${RANK_COLORS[tr.rank]}"/>` +
            `<text x="70" y="168" text-anchor="middle" class="muted" font-size="10">${tr.next === null ? 'MAX' : `${t('misc.next')}: ${compact(tr.next)}`}</text>`
          : '';
        return (
          `<g transform="translate(${x} ${y})"${anim(common.animation, i)}>${art}` +
          `<text x="70" y="128" text-anchor="middle" class="fg" font-size="12.5" font-weight="700">${esc(tr.title)}</text>` +
          `<text x="70" y="145" text-anchor="middle" class="muted" font-size="11">${fmt(tr.value)} ${esc(tr.type)}</text>${bar}</g>`
        );
      })
      .join('');

    return frame(defs + items, {
      width,
      height: top + rows * itemH + 40,
      theme,
      title: header,
      subtitle: `${t('misc.overall')}: ${overall.rank} · @${common.username}`,
      label: `Achievements of ${common.username}, overall rank ${overall.rank}: ${trophies.map((x) => `${x.title} ${x.rank}`).join(', ')}`
    });
  }
});
