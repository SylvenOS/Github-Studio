import type { RawImage } from './image';

/** A downsampled picture: one entry per character cell. */
export interface AsciiGrid {
  cols: number;
  rows: number;
  /** Brightness 0..255 per cell, or -1 for fully transparent cells. */
  lum: number[];
  /** Average colour per cell as `rrggbb`. */
  rgb: string[];
}

export const CHARSETS = ['classic', 'dense', 'blocks', 'binary', 'hex', 'alnum', 'text'] as const;
export type Charset = (typeof CHARSETS)[number];

/** Density ramps: index 0 = empty, last = darkest ink. Other charsets use opacity for brightness instead. */
const RAMPS: Partial<Record<Charset, string>> = {
  classic: ' .:-=+*#%@',
  dense: ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  blocks: ' ░▒▓█'
};

const POOLS: Partial<Record<Charset, string>> = {
  binary: '01',
  hex: '0123456789ABCDEF',
  alnum: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
};

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** Box-average an image down to cols x rows cells. Character cells are ~2x taller than wide, so rows ≈ cols/2 for a square image. */
export function sampleGrid(img: RawImage, cols: number, rows: number): AsciiGrid {
  const lum: number[] = [];
  const rgb: string[] = [];
  for (let cy = 0; cy < rows; cy++) {
    const y0 = Math.floor((cy * img.height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * img.height) / rows));
    for (let cx = 0; cx < cols; cx++) {
      const x0 = Math.floor((cx * img.width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * img.width) / cols));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * img.width + x) * 4;
          const alpha = img.data[i + 3] / 255;
          r += img.data[i] * alpha;
          g += img.data[i + 1] * alpha;
          b += img.data[i + 2] * alpha;
          a += alpha;
          n++;
        }
      }
      if (a / n < 0.15) {
        lum.push(-1);
        rgb.push('000000');
        continue;
      }
      [r, g, b] = [r / a, g / a, b / a];
      lum.push(Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b));
      rgb.push(hex2(r) + hex2(g) + hex2(b));
    }
  }
  return { cols, rows, lum: autoLevel(lum), rgb };
}

/** Stretch the 5th-95th brightness percentiles to the full range so flat, low-contrast photos still show detail. */
export function autoLevel(lum: number[]): number[] {
  const opaque = lum.filter((l) => l >= 0).sort((a, b) => a - b);
  if (opaque.length < 8) return lum;
  const lo = opaque[Math.floor(opaque.length * 0.05)];
  const hi = opaque[Math.min(opaque.length - 1, Math.floor(opaque.length * 0.95))];
  if (hi - lo < 12) return lum;
  return lum.map((l) => (l < 0 ? l : Math.round(Math.min(255, Math.max(0, ((l - lo) / (hi - lo)) * 255)))));
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic symmetric avatar for users whose picture can't be decoded. */
export function identiconGrid(seed: string, cols: number, rows: number): AsciiGrid {
  const h = hash(seed);
  const on = (x: number, y: number) => (hash(`${seed}:${Math.min(x, 4 - x)}:${y}`) & 1) === 1;
  const hue = h % 360;
  const [r, g, b] = hslToRgb(hue, 0.65, 0.55);
  const color = hex2(r) + hex2(g) + hex2(b);
  const lum: number[] = [];
  const rgb: string[] = [];
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const u = cx / cols;
      const v = cy / rows;
      const inside = Math.hypot(u - 0.5, v - 0.5) < 0.5;
      const filled = inside && on(Math.floor(u * 5), Math.floor(v * 5));
      lum.push(!inside ? -1 : filled ? 210 : 55);
      rgb.push(color);
    }
  }
  return { cols, rows, lum, rgb };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/**
 * Should brightness be flipped so the picture's *background* comes out blank? Looks at the outer ring of
 * cells: a bright backdrop (typical for headshots) means bright must map to sparse, so the subject gets the ink.
 */
export function autoInvert(grid: AsciiGrid): boolean {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (x !== 0 && y !== 0 && x !== grid.cols - 1 && y !== grid.rows - 1) continue;
      const l = grid.lum[y * grid.cols + x];
      if (l >= 0) {
        sum += l;
        n++;
      }
    }
  }
  return n > 0 && sum / n > 128;
}

export interface AsciiOptions {
  charset: Charset;
  text: string;
  /** Percent, 50..200. */
  contrast: number;
  invert: boolean;
  color: boolean;
}

export interface AsciiCell {
  ch: string;
  /** 0 = full strength; 1..5 = opacity step (dim..bright) for constant-density charsets. */
  level: number;
  color: string | null;
}

/** Turns a grid into characters: brightness picks the glyph (density ramps) or its opacity (digits/letters/text). */
export function gridToCells(grid: AsciiGrid, o: AsciiOptions): AsciiCell[][] {
  const ramp = RAMPS[o.charset];
  const pool = o.charset === 'text' ? (o.text.replace(/\s+/g, '') || 'GITHUB') : POOLS[o.charset] ?? '01';
  const c = o.contrast / 100;
  const rows: AsciiCell[][] = [];

  for (let y = 0; y < grid.rows; y++) {
    const row: AsciiCell[] = [];
    for (let x = 0; x < grid.cols; x++) {
      const i = y * grid.cols + x;
      const raw = grid.lum[i];
      let v = raw < 0 ? 0 : Math.min(1, Math.max(0, ((raw / 255 - 0.5) * c + 0.5)));
      if (o.invert && raw >= 0) v = 1 - v;
      const color = o.color ? quantize(grid.rgb[i]) : null;

      if (raw < 0 || v < 0.06) {
        row.push({ ch: ' ', level: 0, color: null });
      } else if (ramp) {
        row.push({ ch: ramp[Math.round(v * (ramp.length - 1))], level: 0, color });
      } else {
        const idx = o.charset === 'text' ? (x + y * 3) % pool.length : hash(`${x},${y}`) % pool.length;
        row.push({ ch: pool[idx], level: Math.max(1, Math.min(5, Math.ceil(v * 5))), color });
      }
    }
    rows.push(row);
  }
  return rows;
}

/** Quantise to 12-bit colour so neighbouring cells merge into runs (much smaller SVG). */
function quantize(rrggbb: string): string {
  return `#${rrggbb[0]}${rrggbb[2]}${rrggbb[4]}`;
}

export const cellsToText = (rows: AsciiCell[][]) => rows.map((r) => r.map((c) => c.ch).join('').trimEnd()).join('\n');

export interface Run {
  x: number;
  text: string;
  level: number;
  color: string | null;
}

/** Merges consecutive cells with the same style; blanks split runs and are dropped. */
export function rowToRuns(row: AsciiCell[]): Run[] {
  const runs: Run[] = [];
  let cur: Run | null = null;
  row.forEach((cell, x) => {
    if (cell.ch === ' ') {
      cur = null;
      return;
    }
    if (cur && cur.level === cell.level && cur.color === cell.color) {
      cur.text += cell.ch;
    } else {
      cur = { x, text: cell.ch, level: cell.level, color: cell.color };
      runs.push(cur);
    }
  });
  return runs;
}
