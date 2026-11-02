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

export const CHARSETS = ['classic', 'dense', 'blocks', 'braille', 'minimal', 'dots', 'geometric', 'retro', 'math', 'custom', 'binary', 'hex', 'alnum', 'text'] as const;
export type Charset = (typeof CHARSETS)[number];

/** Density ramps: index 0 = empty, last = darkest ink. Other charsets use opacity for brightness instead. */
const RAMPS: Partial<Record<Charset, string>> = {
  classic: ' .:-=+*#%@',
  dense: ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  blocks: ' ░▒▓█',
  braille: ' ⠁⠃⠇⡇⣇⣧⣷⣿',
  minimal: ' .oO@',
  dots: ' ·•●',
  geometric: ' ▫▪◻◼■',
  retro: ' .:;ox%#@',
  math: ' .,+-×÷=≈≠∞'
};

/** User ramp for charset=custom: light to dark, at most 24 distinct characters, always starting with a blank. */
function customRamp(text: string): string | undefined {
  const chars = [...new Set(Array.from(text.replace(/s+/g, '')))].slice(0, 24);
  return chars.length >= 2 ? ` ${chars.join('')}` : undefined;
}

const POOLS: Partial<Record<Charset, string>> = {
  binary: '01',
  hex: '0123456789ABCDEF',
  alnum: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
};

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/**
 * Box-average an image down to cols x rows cells. Character cells are ~2x taller than wide, so rows ≈ cols/2 for a
 * square image. `crop` trims that fraction off every side first (zooms in on the subject).
 * Brightness is then tuned for legibility: auto-levels, histogram equalisation, local contrast and a light sharpen.
 */
export function sampleGrid(img: RawImage, cols: number, rows: number, crop = 0): AsciiGrid {
  const ox = Math.floor(img.width * crop);
  const oy = Math.floor(img.height * crop);
  const w = img.width - ox * 2;
  const h = img.height - oy * 2;
  const lum: number[] = [];
  const rgb: string[] = [];
  for (let cy = 0; cy < rows; cy++) {
    const y0 = oy + Math.floor((cy * h) / rows);
    const y1 = Math.max(y0 + 1, oy + Math.floor(((cy + 1) * h) / rows));
    for (let cx = 0; cx < cols; cx++) {
      const x0 = ox + Math.floor((cx * w) / cols);
      const x1 = Math.max(x0 + 1, ox + Math.floor(((cx + 1) * w) / cols));
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
  const tuned = equalize(autoLevel(lum), 0.6);
  return sharpen(localContrast({ cols, rows, lum: tuned, rgb }, Math.max(2, Math.round(cols / 10)), 0.75), 0.5);
}

/** Blend the brightness histogram toward uniform so faces use the whole character ramp instead of bunching in the mid-tones. */
export function equalize(lum: number[], blend = 0.6): number[] {
  const hist = new Array(256).fill(0);
  let total = 0;
  for (const l of lum) {
    if (l >= 0) {
      hist[Math.min(255, l)]++;
      total++;
    }
  }
  if (total < 8) return lum;
  const cdf: number[] = [];
  let run = 0;
  for (let i = 0; i < 256; i++) {
    run += hist[i];
    cdf.push((run / total) * 255);
  }
  return lum.map((l) => (l < 0 ? l : Math.round(l * (1 - blend) + cdf[Math.min(255, l)] * blend)));
}

/** Large-radius unsharp mask: lifts each cell against its wider surroundings so eyes, brows and jawlines stand out. */
export function localContrast(grid: AsciiGrid, radius: number, amount: number): AsciiGrid {
  const { cols, rows, lum } = grid;
  const out = lum.slice();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const l = lum[y * cols + x];
      if (l < 0) continue;
      let sum = 0;
      let n = 0;
      for (let ny = Math.max(0, y - radius); ny <= Math.min(rows - 1, y + radius); ny++) {
        for (let nx = Math.max(0, x - radius); nx <= Math.min(cols - 1, x + radius); nx++) {
          const v = lum[ny * cols + nx];
          if (v >= 0) {
            sum += v;
            n++;
          }
        }
      }
      out[y * cols + x] = Math.round(Math.min(255, Math.max(0, l + amount * (l - sum / n))));
    }
  }
  return { ...grid, lum: out };
}

/** Unsharp mask on brightness: pushes each cell away from its neighbourhood average so features (eyes, edges) stay legible at low resolution. */
export function sharpen(grid: AsciiGrid, amount = 0.9): AsciiGrid {
  const { cols, rows, lum } = grid;
  const out = lum.slice();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const l = lum[y * cols + x];
      if (l < 0) continue;
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const v = lum[ny * cols + nx];
          if (v >= 0) {
            sum += v;
            n++;
          }
        }
      }
      out[y * cols + x] = Math.round(Math.min(255, Math.max(0, l + amount * (l - sum / n))));
    }
  }
  return { ...grid, lum: out };
}

const channel = (hex: string, i: number) => Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);

/**
 * Removes a plain backdrop: flood-fills inwards from the border across cells that match the backdrop colour.
 * The backdrop colour comes from the top/left/right edges only (the bottom usually shows shoulders and clothes).
 * Leaves the grid untouched when those edges aren't roughly one colour or the fill would eat the subject.
 */
export function cutout(grid: AsciiGrid, tolerance = 52): AsciiGrid {
  const { cols, rows } = grid;
  const dist = (i: number, ref: number[]) =>
    Math.hypot(channel(grid.rgb[i], 0) - ref[0], channel(grid.rgb[i], 1) - ref[1], channel(grid.rgb[i], 2) - ref[2]);

  const edge: number[] = [];
  const border: number[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (grid.lum[i] < 0) continue;
      const onBorder = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      if (onBorder) border.push(i);
      if (y === 0 || ((x === 0 || x === cols - 1) && y < rows * 0.75)) edge.push(i);
    }
  }
  if (edge.length < 8) return grid;

  const median = (c: number) => edge.map((i) => channel(grid.rgb[i], c)).sort((a, b) => a - b)[Math.floor(edge.length / 2)];
  const ref = [median(0), median(1), median(2)];
  const spread = edge.reduce((a, i) => a + dist(i, ref), 0) / edge.length;
  if (spread > tolerance) return grid; // not one flat-ish colour

  const seen = new Set<number>();
  const queue = border.filter((i) => dist(i, ref) <= tolerance);
  queue.forEach((i) => seen.add(i));
  while (queue.length) {
    const i = queue.pop()!;
    const x = i % cols;
    const y = (i - x) / cols;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = ny * cols + nx;
      if (seen.has(j) || grid.lum[j] < 0 || dist(j, ref) > tolerance) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  const fraction = seen.size / (cols * rows);
  if (fraction < 0.05 || fraction > 0.75) return grid;
  return { ...grid, lum: grid.lum.map((l, i) => (seen.has(i) ? -1 : l)) };
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
  /** -50..50 percentage points added to every cell's brightness. */
  brightness?: number;
}

export interface AsciiCell {
  ch: string;
  /** 0 = full strength; 1..5 = opacity step (dim..bright) for constant-density charsets. */
  level: number;
  color: string | null;
}

/** Turns a grid into characters: brightness picks the glyph (density ramps) or its opacity (digits/letters/text). */
export function gridToCells(grid: AsciiGrid, o: AsciiOptions): AsciiCell[][] {
  const ramp = o.charset === 'custom' ? customRamp(o.text) ?? RAMPS.classic : RAMPS[o.charset];
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
      if (o.brightness && raw >= 0) v = Math.min(1, Math.max(0, v + o.brightness / 100));
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
