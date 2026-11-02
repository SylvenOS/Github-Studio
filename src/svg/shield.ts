import { esc } from '../core/text';

export const SHIELD_STYLES = ['flat', 'flat-square', 'plastic', 'pill', 'for-the-badge', 'social'] as const;
export type ShieldStyle = (typeof SHIELD_STYLES)[number];

export interface ShieldOptions {
  label: string;
  value: string;
  style: ShieldStyle;
  labelColor: string;
  valueColor: string;
  /** A 24x24 simple-icons path and its fill colour. */
  logo?: { path: string; color: string };
  /** 0.5-3, scales the whole badge. */
  scale?: number;
}

const textWidth = (s: string, size: number, spacing = 0) => Math.ceil(Array.from(s).length * (size * 0.62 + spacing));

/** A shields.io-style badge as a standalone SVG document (no theme needed). */
export function shield(o: ShieldOptions): string {
  const upper = o.style === 'for-the-badge';
  const social = o.style === 'social';
  const label = upper ? o.label.toUpperCase() : o.label;
  const value = upper ? o.value.toUpperCase() : o.value;
  const h = upper ? 28 : 20;
  const size = 11;
  const pad = upper ? 14 : 8;
  const spacing = upper ? 1 : 0;
  const logoSize = upper ? 14 : 12;
  const logoW = o.logo ? logoSize + 5 : 0;
  const lw = (label ? textWidth(label, size, spacing) + pad * 2 : o.logo ? pad : 0) + logoW;
  const vw = textWidth(value, size, spacing) + pad * 2;
  const gap = social ? 6 : 0;
  const w = lw + gap + vw;
  const r = o.style === 'pill' ? h / 2 : o.style === 'flat' ? 3 : o.style === 'plastic' ? 4 : social ? 3 : 0;
  const ty = h / 2 + 4;
  const font = `font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${size}" text-anchor="middle"`;
  const scale = Math.max(0.5, Math.min(3, o.scale ?? 1));
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(`${label}: ${value}`)}"><title>${esc(`${label}: ${value}`)}</title>`;

  const logo = o.logo
    ? `<path d="${o.logo.path}" fill="${esc(o.logo.color)}" transform="translate(${pad - 1} ${(h - logoSize) / 2}) scale(${(logoSize / 24).toFixed(3)})"/>`
    : '';
  const labelX = o.logo ? lw - (label ? (textWidth(label, size, spacing) + pad * 2) / 2 : 0) : lw / 2;

  if (social) {
    return (
      open +
      `<rect x="0.5" y="0.5" width="${lw - 1}" height="${h - 1}" rx="${r}" fill="#fcfcfc" stroke="#d5d5d5"/>` +
      `<rect x="${lw + gap + 0.5}" y="0.5" width="${vw - 1}" height="${h - 1}" rx="${r}" fill="#fff" stroke="#d5d5d5"/>` +
      `<path d="M${lw + gap} ${h / 2 - 4} l-4 4 4 4" fill="#fff" stroke="#d5d5d5"/><rect x="${lw + gap - 1}" y="${h / 2 - 3}" width="2" height="6" fill="#fff"/>` +
      (o.logo ? `<path d="${o.logo.path}" fill="#333" transform="translate(${pad - 1} ${(h - logoSize) / 2}) scale(${(logoSize / 24).toFixed(3)})"/>` : '') +
      `<g ${font} fill="#333" font-weight="700"><text x="${labelX}" y="${ty}">${esc(label)}</text><text x="${lw + gap + vw / 2}" y="${ty}" font-weight="400">${esc(value)}</text></g></svg>`
    );
  }

  const sheen =
    o.style === 'plastic'
      ? `<linearGradient id="s" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>`
      : o.style === 'flat'
        ? `<linearGradient id="s" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-opacity=".12"/></linearGradient>`
        : '';
  return (
    open +
    `<clipPath id="r"><rect width="${w}" height="${h}" rx="${r}"/></clipPath>` +
    sheen +
    `<g clip-path="url(#r)"><rect width="${lw}" height="${h}" fill="${esc(o.labelColor)}"/><rect x="${lw}" width="${vw}" height="${h}" fill="${esc(o.valueColor)}"/>${sheen ? `<rect width="${w}" height="${h}" fill="url(#s)"/>` : ''}</g>` +
    logo +
    `<g fill="#fff" ${font} font-weight="${upper ? 700 : 400}"${upper ? ' letter-spacing="1"' : ''}>` +
    (label ? `<text x="${labelX}" y="${ty}">${esc(label)}</text>` : '') +
    `<text x="${lw + vw / 2}" y="${ty}" font-weight="700">${esc(value)}</text></g></svg>`
  );
}
