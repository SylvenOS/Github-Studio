import type { TrophyRank } from '../achievements/engine';

/**
 * Trophy artwork drawn in a 140x110 box, one design per rank. The look escalates with rank so the
 * level of accomplishment reads at a glance:
 *   E wood · D iron · C bronze · B silver · A gold · S gold + gem + star
 *   SS platinum + laurels · SSS ruby-gold + crown · SSS+ animated rainbow + crown + wings
 */
interface Tier {
  stops: [string, string, string]; // highlight, base, shadow
  ink: string; // colour of the rank letter
  glow?: string;
  gem?: string;
  scale: number;
}

const TIERS: Record<TrophyRank, Tier> = {
  E: { stops: ['#c9a577', '#9c7a4d', '#5e4529'], ink: '#33240f', scale: 0.74 },
  D: { stops: ['#d3d7de', '#9298a3', '#5b606a'], ink: '#23272e', scale: 0.8 },
  C: { stops: ['#f6c08a', '#cd7f32', '#86501d'], ink: '#3f2306', scale: 0.86 },
  B: { stops: ['#ffffff', '#c3c9d3', '#858c98'], ink: '#2a303b', scale: 0.9 },
  A: { stops: ['#fff3b0', '#ffd21f', '#c48f00'], ink: '#5a4100', scale: 0.94 },
  S: { stops: ['#fff3b0', '#ffc800', '#b98300'], ink: '#5a4100', gem: '#22c55e', glow: '#ffd21f', scale: 0.98 },
  SS: { stops: ['#f0fbff', '#7dd3fc', '#0369a1'], ink: '#03324f', gem: '#a78bfa', glow: '#38bdf8', scale: 1 },
  SSS: { stops: ['#ffe1b8', '#ff8a3d', '#b83a06'], ink: '#4d1602', gem: '#ef4444', glow: '#ff6a2b', scale: 1 },
  'SSS+': { stops: ['#ffffff', '#ffd54a', '#ff3d81'], ink: '#3b0764', gem: '#22d3ee', glow: '#ff3d81', scale: 1 }
};

const id = (r: TrophyRank) => r.replace('+', 'p');

/** Gradient definitions for the given ranks. Emit once per SVG, before any `trophyArt`. */
export function trophyDefs(ranks: Iterable<TrophyRank>, animate: boolean): string {
  return [...new Set(ranks)]
    .map((r) => {
      const t = TIERS[r];
      const rainbow = r === 'SSS+';
      const stops = rainbow
        ? ['#ff3d81', '#ffd54a', '#4ade80', '#22d3ee', '#a78bfa', '#ff3d81']
            .map((c, i, a) => `<stop offset="${Math.round((i / (a.length - 1)) * 100)}%" stop-color="${c}"/>`)
            .join('')
        : `<stop offset="0" stop-color="${t.stops[0]}"/><stop offset=".5" stop-color="${t.stops[1]}"/><stop offset="1" stop-color="${t.stops[2]}"/>`;
      const spin =
        rainbow && animate
          ? '<animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="5s" repeatCount="indefinite"/>'
          : '';
      const glow = t.glow
        ? `<radialGradient id="tgl-${id(r)}"><stop offset="0" stop-color="${t.glow}" stop-opacity=".45"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>`
        : '';
      const y = rainbow ? 'x1="0" y1="0" x2="1" y2="1"' : 'x1="0" y1="0" x2="0" y2="1"';
      return `<linearGradient id="tg-${id(r)}" ${y}>${stops}${spin}</linearGradient>${glow}`;
    })
    .join('');
}

const star = (cx: number, cy: number, R: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 ? r : R;
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

const sparkle = (x: number, y: number, s: number, delay: number, animate: boolean) =>
  `<path d="M0-4 1-1 4 0 1 1 0 4-1 1-4 0-1-1Z" fill="#fff" transform="translate(${x} ${y}) scale(${s})">` +
  (animate ? `<animate attributeName="opacity" values="0;1;0" dur="2.2s" begin="${delay}s" repeatCount="indefinite"/>` : '') +
  `</path>`;

/** The trophy for a rank, positioned in a 140x110 box. */
export function trophyArt(rank: TrophyRank, animate: boolean): string {
  const t = TIERS[rank];
  const g = `url(#tg-${id(rank)})`;
  const dark = t.stops[2];
  const light = t.stops[0];
  const top = ['SSS', 'SSS+'].includes(rank);
  const letterSize = rank.length === 4 ? 15 : rank.length === 3 ? 17 : rank.length === 2 ? 20 : 24;

  const glow = t.glow ? `<circle cx="70" cy="52" r="58" fill="url(#tgl-${id(rank)})"/>` : '';

  const wings =
    rank === 'SSS+'
      ? [1, -1]
          .map(
            (s) =>
              `<g transform="translate(70 0) scale(${s} 1) translate(-70 0)"><path d="M40 36C22 14 6 22 4 40c8-2 14 0 20 6-6 0-12 4-14 10 8-4 16-4 22 2-2-6 0-10 4-14z" fill="${g}" opacity=".95"/>` +
              `<path d="M12 44c8 0 14 2 22 8" stroke="#fff" stroke-opacity=".5" fill="none"/></g>`
          )
          .join('')
      : '';

  const laurels =
    rank === 'SS'
      ? [1, -1]
          .map(
            (s) =>
              `<g transform="translate(70 0) scale(${s} 1) translate(-70 0)" fill="#34d399" stroke="#065f46" stroke-width=".8">` +
              [0, 1, 2, 3].map((i) => `<ellipse cx="30" cy="${92 - i * 12}" rx="3.5" ry="7" transform="rotate(${-28 + i * 6} 30 ${92 - i * 12})"/>`).join('') +
              `</g>`
          )
          .join('')
      : '';

  const crown = top
    ? `<path d="M50 14 55 0 63 9 70-3 77 9 85 0 90 14Z" fill="${g}" stroke="${dark}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<circle cx="55" cy="0" r="2.2" fill="${t.gem}"/><circle cx="70" cy="-3" r="2.6" fill="${t.gem}"/><circle cx="85" cy="0" r="2.2" fill="${t.gem}"/>`
    : '';

  const topStar = ['S', 'SS'].includes(rank)
    ? `<polygon points="${star(70, 8, 8, 3.4)}" fill="${g}" stroke="${dark}" stroke-width="1"/>`
    : '';

  const gem = t.gem && !top ? `<circle cx="70" cy="30" r="3.6" fill="${t.gem}" stroke="#fff" stroke-opacity=".7"/>` : '';

  const sparkles =
    rank === 'SSS+' || rank === 'SSS'
      ? sparkle(22, 20, 1, 0, animate) + sparkle(120, 28, 1.2, 0.7, animate) + sparkle(112, 90, 0.9, 1.4, animate) + sparkle(28, 84, 0.8, 0.3, animate)
      : '';

  const body =
    // base + stem
    `<rect x="44" y="98" width="52" height="9" rx="2.5" fill="${g}" stroke="${dark}" stroke-width="1"/>` +
    `<path d="M53 86h34l4 12H49z" fill="${g}" stroke="${dark}" stroke-width="1"/>` +
    `<rect x="63" y="72" width="14" height="15" fill="${g}" stroke="${dark}" stroke-width="1"/>` +
    `<ellipse cx="70" cy="80" rx="11" ry="3.6" fill="${light}" stroke="${dark}" stroke-width=".8"/>` +
    // handles
    `<path d="M41 26C22 26 22 52 44 56" fill="none" stroke="${g}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M99 26c19 0 19 26-3 30" fill="none" stroke="${g}" stroke-width="6" stroke-linecap="round"/>` +
    // bowl
    `<path d="M39 20h62v22c0 20-14 32-31 34C53 74 39 62 39 42z" fill="${g}" stroke="${dark}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<rect x="36" y="16" width="68" height="9" rx="4.5" fill="${g}" stroke="${dark}" stroke-width="1.2"/>` +
    `<path d="M47 32c0 16 6 26 15 33" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/>` +
    gem +
    `<text x="70" y="${rank.length > 2 ? 56 : 58}" text-anchor="middle" font-size="${letterSize}" font-weight="900" fill="${t.ink}" font-family="Georgia, 'Times New Roman', serif">${rank}</text>`;

  const s = t.scale;
  return (
    glow +
    sparkles +
    `<g transform="translate(70 107) scale(${s}) translate(-70 -107)">${wings}${laurels}${body}${crown}${topStar}</g>`
  );
}
