import { defineCard } from './types';
import {
  CHARSETS, autoInvert, cellsToText, cutout, gridToCells, identiconGrid, rowToRuns, sampleGrid,
  type AsciiCell, type AsciiGrid, type Charset
} from '../core/ascii';
import { SHAPES, shapeFrame, type Shape } from '../core/ascii3d';
import { decodeImage } from '../core/image';
import { bool, int, oneOf } from '../core/params';
import { esc } from '../core/text';
import { cls, frame, PAD } from '../svg/frame';

const ANIMS = ['scan', 'reveal', 'type', 'wave', 'flicker', 'pulse', 'none'] as const;
const MODES = ['mono', 'color'] as const;
const INVERTS = ['auto', 'true', 'false'] as const;
const SOURCES = ['avatar', 'identicon'] as const;
const TEXTURE = 96; // square texture size used for the 3D shapes

interface Params {
  charset: Charset;
  text: string;
  cols: number;
  cell: number;
  mode: (typeof MODES)[number];
  anim: (typeof ANIMS)[number];
  invert: (typeof INVERTS)[number];
  contrast: number;
  caption: boolean;
  source: (typeof SOURCES)[number];
  shape: Shape;
  frames: number;
  speed: number;
  cutout: boolean;
}

interface Data {
  /** Flat: the sampled picture. 3D shapes: a square texture. */
  grid: AsciiGrid;
  /** From the untouched photo's border, so a bright backdrop still ends up blank when it couldn't be cut out. */
  invert: boolean;
  /** The backdrop was removed, so polarity can simply follow the theme. */
  cut: boolean;
}

/** Animations for the flat picture are per-row CSS driven by `--i` (row index) and `--d` (row duration). */
const ANIM_CSS: Record<string, string> = {
  scan: '.r{animation:sc 4s linear infinite;animation-delay:calc(var(--i)*60ms)}@keyframes sc{0%{opacity:.4}8%{opacity:1}18%{opacity:.4}100%{opacity:.4}}',
  reveal: '.r{opacity:0;animation:rv .5s ease-out forwards;animation-delay:calc(var(--i)*70ms)}@keyframes rv{to{opacity:1}}',
  wave: '.r{animation:wv 3s ease-in-out infinite;animation-delay:calc(var(--i)*120ms)}@keyframes wv{0%,100%{transform:translateX(-2px)}50%{transform:translateX(2px)}}',
  flicker: '.r{animation:fl var(--d) linear infinite}@keyframes fl{0%,40%,60%,100%{opacity:1}50%{opacity:.45}}',
  pulse: '.art{animation:pu 3s ease-in-out infinite}@keyframes pu{0%,100%{opacity:1}50%{opacity:.55}}'
};

const opts = (p: Params, username: string, invert: boolean) => ({
  charset: p.charset,
  text: p.text || username,
  contrast: p.contrast,
  invert,
  color: p.mode === 'color'
});

/** `light`: whether the card's background is light (dark ink), when known. With a cut-out subject, ink polarity just follows the theme. */
const resolveInvert = (data: Data, p: Params, light?: boolean) =>
  p.invert !== 'auto' ? p.invert === 'true' : data.cut && light !== undefined ? light : data.invert;

const isLight = (background: string) => {
  const n = Number.parseInt(background.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 > 0.55;
};

/** 3D shapes: negate the photo up front (if needed) so the lighting still reads as light, not as ink. */
function texture(data: Data, p: Params, light?: boolean): AsciiGrid {
  const invert = resolveInvert(data, p, light);
  return invert ? { ...data.grid, lum: data.grid.lum.map((l) => (l < 0 ? l : 255 - l)) } : data.grid;
}

function cellsAt(data: Data, p: Params, username: string, angle: number, light?: boolean): AsciiCell[][] {
  if (p.shape === 'flat') return gridToCells(data.grid, opts(p, username, resolveInvert(data, p, light)));
  const rows = Math.round(p.cols / 2);
  return gridToCells(shapeFrame(texture(data, p, light), p.shape, angle, p.cols, rows), opts(p, username, false));
}

/** One `<text>` per row; runs of same-styled characters are positioned explicitly so no font or whitespace metrics matter. */
function rowSvg(row: AsciiCell[], i: number, cw: number, lh: number, blocks: boolean): string {
  const runs = rowToRuns(row);
  if (!runs.length) return '';
  const inner = runs
    .map((r) => {
      const fill = r.color ? ` fill="${r.color}"` : '';
      const cls = r.level ? ` class="o${r.level}"` : '';
      const adjust = blocks ? ' lengthAdjust="spacingAndGlyphs"' : '';
      return `<tspan x="${r.x * cw}" textLength="${r.text.length * cw}"${adjust}${fill}${cls}>${esc(r.text)}</tspan>`;
    })
    .join('');
  return `<text y="${(i * lh + lh * 0.78).toFixed(1)}">${inner}</text>`;
}

export const asciiCard = defineCard<Params, Data>({
  id: 'ascii',
  category: 'art',
  tags: ['avatar', 'portrait', '3d', 'text', 'matrix'],
  variants: [
    { label: 'Classic' },
    { label: 'Matrix', params: { theme: 'matrix', charset: 'alnum' } },
    { label: 'Colour portrait', params: { charset: 'dense', mode: 'color' } },
    { label: 'Your text', params: { charset: 'text' } },
    { label: 'Binary', params: { charset: 'binary', theme: 'ocean' } },
    { label: 'Spinning globe', params: { shape: 'sphere', charset: 'dense', animation: 'true' } },
    { label: 'Flipping coin', params: { shape: 'coin', charset: 'dense', animation: 'true' } },
    { label: 'Cylinder', params: { shape: 'cylinder', charset: 'dense', animation: 'true' } }
  ],
  aliases: ['avatar'],
  title: 'ASCII Avatar',
  description:
    'Your profile picture drawn with characters (letters, digits, blocks or your own text) - flat and animated, or wrapped on a spinning 3D globe, cylinder or coin. `format=text` returns paste-ready plain text.',
  params: [
    { name: 'shape', type: 'enum', options: [...SHAPES], default: 'flat', description: '3D: spin the avatar on a sphere, cylinder or coin' },
    { name: 'charset', type: 'enum', options: [...CHARSETS], default: 'classic', description: 'Density ramps (classic, dense, blocks) or digits/letters/text shaded by brightness' },
    { name: 'text', type: 'string', description: 'Your own text for charset=text (defaults to the username)' },
    { name: 'mode', type: 'enum', options: [...MODES], default: 'mono', description: 'Theme colour or the avatar’s own colours' },
    { name: 'anim', type: 'enum', options: [...ANIMS], default: 'scan', description: 'Flat: animation style. 3D: anything but `none` spins it' },
    { name: 'speed', type: 'number', default: 8, min: 2, max: 30, description: '3D: seconds per full rotation' },
    { name: 'frames', type: 'number', default: 20, min: 8, max: 48, description: '3D: frames per rotation (smoothness vs file size)' },
    { name: 'cutout', type: 'boolean', default: true, description: 'Remove a plain photo background so only you are drawn (3D globes show a grid where it was)' },
    { name: 'cols', type: 'number', default: 80, min: 20, max: 110, description: 'Characters per row (detail). 3D defaults to 64' },
    { name: 'cell', type: 'number', default: 6, min: 4, max: 12, description: 'Pixel width of one character' },
    { name: 'contrast', type: 'number', default: 130, min: 50, max: 250, description: 'Contrast percent' },
    { name: 'invert', type: 'enum', options: [...INVERTS], default: 'auto', description: 'Swap light and dark (auto keeps the photo’s background blank)' },
    { name: 'caption', type: 'boolean', default: true, description: 'Show @username under the art' },
    { name: 'source', type: 'enum', options: [...SOURCES], default: 'avatar', description: 'Use the avatar or a generated identicon' }
  ],
  parse: (q) => {
    const shape = oneOf(q.shape, SHAPES, 'flat');
    const mode = oneOf(q.mode, MODES, 'mono');
    // colour + 3D multiplies the SVG size by the frame count, so keep it modest
    const cols = int(q.cols, shape === 'flat' ? 80 : 64, 20, mode === 'color' && shape !== 'flat' ? 72 : 110);
    return {
      shape,
      mode,
      cols,
      charset: oneOf(q.charset, CHARSETS, 'classic'),
      text: (q.text ?? '').replace(/[^\p{L}\p{N}_.!#@$%&*+=-]/gu, '').slice(0, 40),
      cell: int(q.cell, 6, 4, 12),
      anim: oneOf(q.anim, ANIMS, 'scan'),
      invert: oneOf(q.invert, INVERTS, 'auto'),
      contrast: int(q.contrast, 130, 50, 250),
      caption: bool(q.caption, true),
      source: oneOf(q.source, SOURCES, 'avatar'),
      frames: Math.min(int(q.frames, 20, 8, 48), mode === 'color' ? 16 : 48),
      speed: int(q.speed, 8, 2, 30),
      cutout: bool(q.cutout, true)
    };
  },

  async load(client, p, common) {
    const user = await client.getUser(common.username);
    const flat = p.shape === 'flat';
    if (p.source === 'avatar') {
      try {
        const { base64 } = await client.getAvatar(user.avatarUrl);
        const img = decodeImage(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
        // keep the picture's aspect ratio (characters are ~2x taller than wide)
        const crop = flat ? 0.06 : 0.1; // zoom in a little: avatars have slack around the head
        const rows = Math.max(8, Math.round((p.cols * img.height) / img.width / 2));
        const grid = flat ? sampleGrid(img, p.cols, rows, crop) : sampleGrid(img, TEXTURE, TEXTURE, crop);
        const invert = autoInvert(grid);
        // a cut-out portrait reads best on every shape: on a globe/cylinder the bare surface becomes a graticule
        const cut = p.cutout ? cutout(grid) : grid;
        return { grid: cut, invert, cut: cut !== grid };
      } catch (e) {
        console.error('avatar decode failed, using identicon', e);
      }
    }
    return { grid: flat ? identiconGrid(user.login, p.cols, Math.round(p.cols / 2)) : identiconGrid(user.login, TEXTURE, TEXTURE), invert: false, cut: false };
  },

  toJSON: (d, p) => ({ shape: p.shape, cols: p.cols, text: cellsToText(cellsAt(d, p, '', 0)) }),
  toText: (d, p) => cellsToText(cellsAt(d, p, '', 0)),

  render(data, p, { theme, common, title }) {
    const header = common.title ? title(common.title) : undefined; // art is frameless unless a title is asked for
    const light = isLight(theme.background);
    const cw = p.cell;
    const lh = cw * 2;
    const cols = p.shape === 'flat' ? data.grid.cols : p.cols;
    const rows = p.shape === 'flat' ? data.grid.rows : Math.round(p.cols / 2);
    const artW = cols * cw;
    const top = header ? 55 : 22;
    const width = artW + PAD * 2;
    const height = top + rows * lh + (p.caption ? 40 : 18);
    const moving = common.animation && p.anim !== 'none';
    const kind = moving ? p.anim : 'none';
    const fontSize = (cw / 0.6).toFixed(1);
    const blocks = p.charset === 'blocks';
    const soft = ['binary', 'hex', 'alnum', 'text'].includes(p.charset);
    const opacities = soft ? '.o1{fill-opacity:.22}.o2{fill-opacity:.4}.o3{fill-opacity:.6}.o4{fill-opacity:.8}.o5{fill-opacity:1}' : '';
    const base = `.art text{font-family:'Courier New',Consolas,monospace;font-size:${fontSize}px;fill:var(--accent);white-space:pre}${opacities}`;
    const reduced = '@media (prefers-reduced-motion:reduce){.r,.art,.fr{animation:none!important;opacity:1!important}}';
    let art: string;

    if (p.shape === 'flat') {
      const cells = cellsAt(data, p, common.username, 0, light);
      const body = cells
        .map((row, i) => {
          const svg = rowSvg(row, i, cw, lh, blocks);
          const d = (1.6 + ((i * 7) % 9) * 0.35).toFixed(2);
          return svg ? `<g class="r" style="--i:${i};--d:${d}s">${svg}</g>` : '';
        })
        .join('');
      const clip =
        kind === 'type'
          ? `<clipPath id="typeClip"><rect x="0" y="-4" height="${rows * lh + 8}" width="0"><animate attributeName="width" from="0" to="${artW}" dur="${Math.min(4, 1 + cols / 40).toFixed(1)}s" fill="freeze"/></rect></clipPath>`
          : '';
      art =
        `<style>${base}${ANIM_CSS[kind] ?? ''}${reduced}</style>${clip}` +
        `<g class="art" transform="translate(${PAD} ${top})"${kind === 'type' ? ' clip-path="url(#typeClip)"' : ''}>${body}</g>`;
    } else {
      // 3D: pre-render one frame per angle and flip through them with CSS (SVG has no real 3D)
      const count = moving ? p.frames : 1;
      const frames = Array.from({ length: count }, (_, k) => {
        const cells = cellsAt(data, p, common.username, (2 * Math.PI * k) / count, light);
        return `<g class="fr" style="--k:${k}">${cells.map((row, i) => rowSvg(row, i, cw, lh, blocks)).join('')}</g>`;
      }).join('');
      const play =
        count > 1
          ? `.fr{visibility:hidden;animation:fr ${p.speed}s linear infinite;animation-delay:calc(var(--k)*${(p.speed / count).toFixed(3)}s)}` +
            `@keyframes fr{0%{visibility:visible}${(100 / count).toFixed(3)}%{visibility:hidden}100%{visibility:hidden}}` +
            '@media (prefers-reduced-motion:reduce){.fr{visibility:hidden}.fr:first-child{visibility:visible}}'
          : '.fr{visibility:visible}';
      art = `<style>${base}${play}</style><g class="art" transform="translate(${PAD} ${top})">${frames}</g>`;
    }

    const caption = p.caption
      ? `<text x="${width / 2}" y="${height - 16}" text-anchor="middle"${cls('muted', common.animation && kind !== 'none', 1)} font-size="12">@${esc(common.username)}</text>`
      : '';

    return frame(art + caption, { width, height, theme, title: header, label: `ASCII art avatar of ${common.username}` });
  }
});
