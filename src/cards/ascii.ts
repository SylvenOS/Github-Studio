import { defineCard } from './types';
import { CHARSETS, autoInvert, cellsToText, gridToCells, identiconGrid, rowToRuns, sampleGrid, type AsciiCell, type AsciiGrid, type Charset } from '../core/ascii';
import { decodeImage } from '../core/image';
import { bool, int, oneOf } from '../core/params';
import { esc } from '../core/text';
import { anim, frame, PAD } from '../svg/frame';

const ANIMS = ['scan', 'reveal', 'type', 'wave', 'flicker', 'pulse', 'none'] as const;
const MODES = ['mono', 'color'] as const;
const INVERTS = ['auto', 'true', 'false'] as const;
const SOURCES = ['avatar', 'identicon'] as const;

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
}

/** Animations are per-row CSS driven by `--i` (row index) and `--d` (row-specific duration). */
const ANIM_CSS: Record<string, string> = {
  scan: '.r{animation:sc 4s linear infinite;animation-delay:calc(var(--i)*60ms)}@keyframes sc{0%{opacity:.4}8%{opacity:1}18%{opacity:.4}100%{opacity:.4}}',
  reveal: '.r{opacity:0;animation:rv .5s ease-out forwards;animation-delay:calc(var(--i)*70ms)}@keyframes rv{to{opacity:1}}',
  wave: '.r{animation:wv 3s ease-in-out infinite;animation-delay:calc(var(--i)*120ms)}@keyframes wv{0%,100%{transform:translateX(-2px)}50%{transform:translateX(2px)}}',
  flicker: '.r{animation:fl var(--d) linear infinite}@keyframes fl{0%,40%,60%,100%{opacity:1}50%{opacity:.45}}',
  pulse: '.art{animation:pu 3s ease-in-out infinite}@keyframes pu{0%,100%{opacity:1}50%{opacity:.55}}'
};

const resolveInvert = (grid: AsciiGrid, p: Params) => (p.invert === 'auto' ? autoInvert(grid) : p.invert === 'true');

function cellsFor(grid: AsciiGrid, p: Params, invert: boolean, username: string): AsciiCell[][] {
  return gridToCells(grid, { charset: p.charset, text: p.text || username, contrast: p.contrast, invert, color: p.mode === 'color' });
}

export const asciiCard = defineCard<Params, AsciiGrid>({
  id: 'ascii',
  aliases: ['avatar'],
  title: 'ASCII Avatar',
  description: 'Your profile picture drawn with characters (letters, digits, blocks or your own text), optionally animated. `format=text` returns paste-ready plain text.',
  params: [
    { name: 'charset', type: 'enum', options: [...CHARSETS], default: 'classic', description: 'Characters used: density ramps (classic, dense, blocks) or digits/letters/text shaded by brightness' },
    { name: 'text', type: 'string', description: 'Your own text for charset=text (defaults to the username)' },
    { name: 'mode', type: 'enum', options: [...MODES], default: 'mono', description: 'Theme colour or the avatar’s own colours' },
    { name: 'anim', type: 'enum', options: [...ANIMS], default: 'scan', description: 'Animation style' },
    { name: 'cols', type: 'number', default: 56, min: 20, max: 100, description: 'Characters per row (detail)' },
    { name: 'cell', type: 'number', default: 6, min: 4, max: 12, description: 'Pixel width of one character' },
    { name: 'contrast', type: 'number', default: 130, min: 50, max: 250, description: 'Contrast percent' },
    { name: 'invert', type: 'enum', options: [...INVERTS], default: 'auto', description: 'Swap light and dark (auto keeps the photo’s background blank)' },
    { name: 'caption', type: 'boolean', default: true, description: 'Show @username under the art' },
    { name: 'source', type: 'enum', options: [...SOURCES], default: 'avatar', description: 'Use the avatar or a generated identicon' }
  ],
  parse: (q) => ({
    charset: oneOf(q.charset, CHARSETS, 'classic'),
    text: (q.text ?? '').replace(/[^\p{L}\p{N}_.!#@$%&*+=-]/gu, '').slice(0, 40),
    cols: int(q.cols, 56, 20, 100),
    cell: int(q.cell, 6, 4, 12),
    mode: oneOf(q.mode, MODES, 'mono'),
    anim: oneOf(q.anim, ANIMS, 'scan'),
    invert: oneOf(q.invert, INVERTS, 'auto'),
    contrast: int(q.contrast, 130, 50, 250),
    caption: bool(q.caption, true),
    source: oneOf(q.source, SOURCES, 'avatar')
  }),

  async load(client, p, common) {
    const user = await client.getUser(common.username);
    const rows = Math.round(p.cols / 2);
    if (p.source === 'avatar') {
      try {
        const { base64 } = await client.getAvatar(user.avatarUrl);
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const img = decodeImage(bytes);
        // keep the picture's aspect ratio (characters are ~2x taller than wide)
        const r = Math.max(8, Math.round((p.cols * img.height) / img.width / 2));
        return sampleGrid(img, p.cols, r);
      } catch (e) {
        console.error('avatar decode failed, using identicon', e);
      }
    }
    return identiconGrid(user.login, p.cols, rows);
  },

  toJSON: (grid, p) => ({ cols: grid.cols, rows: grid.rows, text: cellsToText(cellsFor(grid, p, resolveInvert(grid, p), '')) }),
  toText: (grid, p) => cellsToText(cellsFor(grid, p, resolveInvert(grid, p), '')),

  render(grid, p, { theme, common, title }) {
    const header = common.title ? title(common.title) : undefined; // art is frameless unless a title is asked for
    const invert = resolveInvert(grid, p);
    const cells = cellsFor(grid, p, invert, common.username);
    const cw = p.cell;
    const lh = cw * 2;
    const artW = grid.cols * cw;
    const top = header ? 55 : 22;
    const width = artW + PAD * 2;
    const height = top + grid.rows * lh + (p.caption ? 40 : 18);
    const kind = common.animation ? p.anim : 'none';
    const fontSize = (cw / 0.6).toFixed(1);
    const soft = p.charset === 'binary' || p.charset === 'hex' || p.charset === 'alnum' || p.charset === 'text';

    const rows = cells
      .map((row, i) => {
        const runs = rowToRuns(row);
        if (!runs.length) return '';
        const inner = runs
          .map((r) => {
            const fill = r.color ? ` fill="${r.color}"` : '';
            const cls = r.level ? ` class="o${r.level}"` : '';
            return `<tspan x="${r.x * cw}" textLength="${r.text.length * cw}"${p.charset === 'blocks' ? ' lengthAdjust="spacingAndGlyphs"' : ''}${fill}${cls}>${esc(r.text)}</tspan>`;
          })
          .join('');
        const d = (1.6 + ((i * 7) % 9) * 0.35).toFixed(2);
        return `<g class="r" style="--i:${i};--d:${d}s"><text y="${(i * lh + lh * 0.78).toFixed(1)}">${inner}</text></g>`;
      })
      .join('');

    // opacity steps for constant-density charsets; ink colour follows the theme unless colour mode overrides it
    const opacities = soft ? '.o1{fill-opacity:.22}.o2{fill-opacity:.4}.o3{fill-opacity:.6}.o4{fill-opacity:.8}.o5{fill-opacity:1}' : '';
    const clip =
      kind === 'type'
        ? `<clipPath id="typeClip"><rect x="0" y="-4" height="${grid.rows * lh + 8}" width="0"><animate attributeName="width" from="0" to="${artW}" dur="${Math.min(4, 1 + grid.cols / 40).toFixed(1)}s" fill="freeze"/></rect></clipPath>`
        : '';

    const art =
      `<style>.art text{font-family:'Courier New',Consolas,monospace;font-size:${fontSize}px;fill:var(--accent);white-space:pre}` +
      `${opacities}${ANIM_CSS[kind] ?? ''}@media (prefers-reduced-motion:reduce){.r,.art{animation:none!important;opacity:1!important}}</style>` +
      clip +
      `<g class="art" transform="translate(${PAD} ${top})"${kind === 'type' ? ' clip-path="url(#typeClip)"' : ''}>${rows}</g>`;

    const caption = p.caption
      ? `<text x="${width / 2}" y="${height - 16}" text-anchor="middle" class="muted" font-size="12"${anim(common.animation && kind !== 'none', 1)}>@${esc(common.username)}</text>`
      : '';

    return frame(art + caption, {
      width,
      height,
      theme,
      title: header,
      label: `ASCII art avatar of ${common.username}`
    });
  }
});
