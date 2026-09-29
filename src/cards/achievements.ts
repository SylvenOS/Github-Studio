import { defineCard } from './types';
import { int, list } from '../core/params';
import { esc, fmt } from '../core/text';
import { calculateTrophies, trophyIds, type Trophy, type TrophyRank } from '../achievements/engine';
import { calculateProfileMetrics } from '../metrics';
import { anim, contentTop, frame, PAD } from '../svg/frame';

interface Params {
  columns: number;
  hide: string[];
}

const RANK_COLORS: Record<TrophyRank, string> = {
  'SSS+': '#ff003c',
  SSS: '#ff4500',
  SS: '#ff8c00',
  S: '#ffd700',
  A: '#32cd32',
  B: '#1e90ff',
  C: '#9370db',
  D: '#a9a9a9',
  E: '#696969'
};

/** Badge outline; shape gets more elaborate with rank. `bg` is a CSS class so themes apply. */
function badge(rank: TrophyRank, c: string): string {
  const glow = (px: number) => `style="filter:drop-shadow(0 0 ${px}px ${c}88)"`;
  if (rank === 'SSS+' || rank === 'SSS') {
    return (
      `<polygon points="70,10 105,40 90,85 50,85 35,40" class="bg" stroke="${c}" stroke-width="3" ${glow(10)}/>` +
      `<polygon points="70,18 95,43 83,78 57,78 45,43" stroke="${c}" stroke-width="2" opacity=".8"/>` +
      `<circle cx="70" cy="50" r="38" stroke="${c}" stroke-dasharray="4 4" opacity=".5"/>` +
      `<polygon points="70,25 85,48 70,70 55,48" stroke="${c}" stroke-width="1.5"/>`
    );
  }
  if (rank === 'SS' || rank === 'S') {
    return (
      `<path d="M40 20 L70 10 L100 20 L100 50 C100 75 70 90 70 90 C70 90 40 75 40 50 Z" class="bg" stroke="${c}" stroke-width="3.5" ${glow(8)}/>` +
      `<path d="M48 26 L70 18 L92 26 L92 48 C92 68 70 80 70 80 C70 80 48 68 48 48 Z" stroke="${c}" stroke-width="1.5" opacity=".7"/>` +
      `<line x1="70" y1="18" x2="70" y2="80" stroke="${c}" opacity=".4"/>`
    );
  }
  if (rank === 'A' || rank === 'B') {
    return (
      `<polygon points="70,15 100,32 100,68 70,85 40,68 40,32" class="bg" stroke="${c}" stroke-width="3" ${glow(6)}/>` +
      `<polygon points="70,22 92,35 92,65 70,78 48,65 48,35" stroke="${c}" opacity=".6"/>`
    );
  }
  return (
    `<circle cx="70" cy="50" r="35" class="bg" stroke="${c}" stroke-width="3" ${glow(4)}/>` +
    `<circle cx="70" cy="50" r="28" stroke="${c}" opacity=".6"/>` +
    `<circle cx="70" cy="50" r="40" stroke="${c}" stroke-width=".5" stroke-dasharray="2 4"/>`
  );
}

export const achievementsCard = defineCard<Params, Trophy[]>({
  id: 'achievements',
  aliases: ['trophies'],
  title: 'GitHub Achievements',
  description: 'Ranked trophies (E to SSS+) for commits, PRs, stars, followers and more.',
  params: [
    { name: 'columns', type: 'number', default: 3, min: 1, max: 6, description: 'Trophies per row' },
    { name: 'hide', type: 'list', description: `Trophies to hide: ${trophyIds.join(', ')}` }
  ],
  parse: (q) => ({ columns: int(q.columns, 3, 1, 6), hide: list(q.hide) }),
  load: async (client, _p, common) => calculateTrophies(calculateProfileMetrics(await client.getUser(common.username))),
  toJSON: (trophies, p) => trophies.filter((t) => !p.hide.includes(t.id)),

  render(all, p, { theme, common, title }) {
    const header = title('GitHub Achievements');
    const trophies = all.filter((t) => !p.hide.includes(t.id));
    const itemW = 140;
    const itemH = 150;
    const rows = Math.ceil(trophies.length / p.columns);
    const top = contentTop(!!header) - 25;
    const width = p.columns * itemW + PAD * 2 + 10;

    const items = trophies
      .map((t, i) => {
        const x = PAD + 5 + (i % p.columns) * itemW;
        const y = top + Math.floor(i / p.columns) * itemH + 30;
        const c = RANK_COLORS[t.rank];
        return (
          `<g transform="translate(${x} ${y})"${anim(common.animation, i)}>${badge(t.rank, c)}` +
          `<text x="70" y="58" text-anchor="middle" font-size="${t.rank.length > 2 ? 20 : 24}" font-weight="900" fill="${c}">${esc(t.rank)}</text>` +
          `<text x="70" y="115" text-anchor="middle" class="fg" font-size="13" font-weight="700">${esc(t.title)}</text>` +
          `<text x="70" y="135" text-anchor="middle" class="muted" font-size="12">${fmt(t.value)} ${esc(t.type)}</text></g>`
        );
      })
      .join('');

    return frame(items, {
      width,
      height: top + rows * itemH + 45,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `Achievements of ${common.username}: ${trophies.map((t) => `${t.title} ${t.rank}`).join(', ')}`
    });
  }
});
