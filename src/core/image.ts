import { decode as decodePng } from 'fast-png';
import { decode as decodeJpeg } from 'jpeg-js';

/** Decoded RGBA pixels (8 bits per channel). */
export interface RawImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Decodes PNG or JPEG bytes (pure JS, so it runs inside a Worker). */
export function decodeImage(bytes: Uint8Array): RawImage {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return fromPng(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const img = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 64 });
    return { width: img.width, height: img.height, data: img.data as unknown as Uint8Array };
  }
  throw new Error('Unsupported image format');
}

function fromPng(bytes: Uint8Array): RawImage {
  const png = decodePng(bytes);
  const { width, height, channels, depth } = png;
  const shift = depth === 16 ? 8 : 0;
  const src = png.data as ArrayLike<number>;
  const palette = (png as { palette?: number[][] }).palette;
  const out = new Uint8Array(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const at = (k: number) => Number(src[i * channels + k]) >> shift;
    let r: number, g: number, b: number, a = 255;
    if (palette && channels === 1) {
      [r, g, b] = palette[at(0)] ?? [0, 0, 0];
      a = palette[at(0)]?.[3] ?? 255;
    } else if (channels === 1 || channels === 2) {
      r = g = b = at(0);
      if (channels === 2) a = at(1);
    } else {
      [r, g, b] = [at(0), at(1), at(2)];
      if (channels === 4) a = at(3);
    }
    out.set([r, g, b, a], i * 4);
  }
  return { width, height, data: out };
}
