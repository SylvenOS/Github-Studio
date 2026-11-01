import { decode as decodePng } from 'fast-png';
import { decode as decodeJpeg } from 'jpeg-js';

/** Decoded RGBA pixels (8 bits per channel). */
export interface RawImage {
  width: number;
  height: number;
  data: Uint8Array;
}

const MAX_PIXELS = 1024 * 1024;

/** Decodes PNG or JPEG bytes (pure JS, so it runs inside a Worker). Refuses images over ~1 megapixel. */
export function decodeImage(bytes: Uint8Array): RawImage {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    // IHDR width/height live at bytes 16-23: check before allocating anything
    if (bytes.length >= 24) {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (dv.getUint32(16) * dv.getUint32(20) > MAX_PIXELS) throw new Error('Image is too large');
    }
    return fromPng(bytes);
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const img = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 64, maxResolutionInMP: 1.1 });
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
