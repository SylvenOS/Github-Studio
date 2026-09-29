import type { AsciiGrid } from './ascii';

/**
 * Tiny software 3D renderer for the ASCII avatar. SVG has no real 3D, so each rotation angle is rendered
 * into its own character grid here; the card plays the frames back with CSS.
 *
 * The picture is a square texture. Each output cell is inverse-mapped onto the shape, sampled, and lit
 * (light from the upper left), which is what gives the flat photo depth as it turns.
 */
export const SHAPES = ['flat', 'sphere', 'cylinder', 'coin'] as const;
export type Shape = (typeof SHAPES)[number];

const LIGHT = (() => {
  const v = [-0.45, -0.5, 0.75];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
})();

const hex2 = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');

const GRID_LUM = 150;
const GRID_RGB = '8b98b0';
const STEP = Math.PI / 6; // a line every 30 degrees
const HALF_WIDTH = 0.085; // radians; roughly one character cell so lines don't fall between samples

function onGraticule(lon: number, lat: number): boolean {
  const near = (a: number) => {
    const m = ((a % STEP) + STEP) % STEP;
    return Math.min(m, STEP - m) < HALF_WIDTH;
  };
  return near(lon) || near(lat);
}

function sample(tex: AsciiGrid, u: number, v: number): { lum: number; rgb: string } {
  const x = Math.min(tex.cols - 1, Math.max(0, Math.floor(u * tex.cols)));
  const y = Math.min(tex.rows - 1, Math.max(0, Math.floor(v * tex.rows)));
  return { lum: tex.lum[y * tex.cols + x], rgb: tex.rgb[y * tex.cols + x] };
}

/**
 * Longitude -> texture column. The picture covers the front half (lon -90..90 deg) and is mirrored
 * across the back, so the seam is invisible and a face appears on both sides.
 */
export function longitudeToU(lon: number): number {
  let l = ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; // -pi..pi
  const sign = l < 0 ? -1 : 1;
  l = Math.abs(l);
  return 0.5 + sign * (0.5 - Math.abs(l - Math.PI / 2) / Math.PI);
}

/** One frame of `shape` turned by `angle` radians about the vertical axis, as a cols x rows grid (-1 = empty). */
export function shapeFrame(tex: AsciiGrid, shape: Exclude<Shape, 'flat'>, angle: number, cols: number, rows: number): AsciiGrid {
  const lum: number[] = [];
  const rgb: string[] = [];
  const push = (l: number, color: string, shade: number) => {
    if (l < 0) {
      lum.push(-1);
      rgb.push('000000');
      return;
    }
    lum.push(Math.round(Math.min(255, l * shade)));
    const c = [0, 1, 2].map((i) => Number.parseInt(color.slice(i * 2, i * 2 + 2), 16) * shade);
    rgb.push(hex2(c[0]) + hex2(c[1]) + hex2(c[2]));
  };
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // character cells are ~2x taller than wide, and rows = cols / 2, so this is a square viewport
      const x = ((c + 0.5) / cols) * 2 - 1;
      const y = ((r + 0.5) / rows) * 2 - 1;

      if (shape === 'coin') {
        // a flat square turning about its vertical axis, with a little perspective
        if (Math.abs(cosA) < 0.05) {
          push(-1, '000000', 1);
          continue;
        }
        const s = x / cosA;
        const perspective = 1 + 0.22 * s * sinA;
        const py = y / perspective;
        if (Math.abs(s) > 1 || Math.abs(py) > 1) {
          push(-1, '000000', 1);
          continue;
        }
        const back = cosA < 0;
        const t = sample(tex, back ? 1 - (s + 1) / 2 : (s + 1) / 2, (py + 1) / 2);
        push(t.lum, t.rgb, (back ? 0.62 : 0.7) + 0.3 * Math.abs(cosA));
        continue;
      }

      const d2 = shape === 'sphere' ? x * x + y * y : x * x;
      if (d2 > 1) {
        push(-1, '000000', 1);
        continue;
      }
      const z = Math.sqrt(1 - d2);
      const ny = shape === 'sphere' ? y : 0;
      const shade = 0.42 + 0.58 * Math.max(0, x * LIGHT[0] + ny * LIGHT[1] + z * LIGHT[2]);
      const lon = Math.atan2(x, z) + angle;
      const u = longitudeToU(lon);
      const v = shape === 'sphere' ? 0.5 + Math.asin(y) / Math.PI : (y + 1) / 2;
      const t = sample(tex, u, v);
      if (t.lum >= 0) {
        push(t.lum, t.rgb, shade);
      } else if (onGraticule(lon, shape === 'sphere' ? Math.asin(y) : (y + 1) * (Math.PI / 2))) {
        // where the cut-out portrait leaves the surface bare, draw meridians/parallels so the ball and its spin are visible
        push(GRID_LUM, GRID_RGB, shade);
      } else {
        push(-1, '000000', 1);
      }
    }
  }
  return { cols, rows, lum, rgb };
}
