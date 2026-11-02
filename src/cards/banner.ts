import { defineCard } from './types';
import { bool, color, int, oneOf } from '../core/params';
import { esc } from '../core/text';
import { frame } from '../svg/frame';

const SHAPES = ['slice', 'shark', 'egg', 'cylinder', 'rect', 'soft'] as const;
const STYLES = ['wave', 'gradient', 'grid', 'terminal', 'aurora', ...SHAPES] as const;
const FILLS = ['gradient', 'solid'] as const;
const ALIGNS = ['center', 'left'] as const;
const WIDTH = 900;

interface Params {
  text: string;
  subtitle: string;
  style: (typeof STYLES)[number];
  height: number;
  size: number;
  align: (typeof ALIGNS)[number];
  border: boolean;
  fill: (typeof FILLS)[number];
  reverse: boolean;
  stroke: number;
  color?: string;
}

/** Outline of a shaped header (the text sits on top). */
function shapePath(style: string, W: number, h: number): string {
  switch (style) {
    case 'slice': return `M0 0 H${W} V${h * 0.78} L0 ${h} Z`;
    case 'shark': return `M0 0 H${W} V${h * 0.72} L${W * 0.62} ${h * 0.72} Q${W * 0.3} ${h * 0.72} 0 ${h} Z`;
    case 'egg': return `M0 0 H${W} V${h * 0.55} Q${W / 2} ${h * 1.45} 0 ${h * 0.55} Z`;
    case 'cylinder': return `M${h / 2} 0 H${W - h / 2} A${h / 2} ${h / 2} 0 0 1 ${W - h / 2} ${h} H${h / 2} A${h / 2} ${h / 2} 0 0 1 ${h / 2} 0 Z`;
    case 'soft': return `M28 0 H${W - 28} Q${W} 0 ${W} 28 V${h - 28} Q${W} ${h} ${W - 28} ${h} H28 Q0 ${h} 0 ${h - 28} V28 Q0 0 28 0 Z`;
    default: return `M0 0 H${W} V${h} H0 Z`;
  }
}

/** Sine wave path across `width`, repeated so it can scroll by exactly one period without a gap. */
function wave(width: number, baseY: number, amp: number, period: number, phase: number, bottom: number): string {
  const pts: string[] = [];
  for (let x = 0; x <= width + period; x += 12) pts.push(`${x} ${(baseY + amp * Math.sin((x / period) * 2 * Math.PI + phase)).toFixed(1)}`);
  return `M${pts.join(' L')} L${width + period} ${bottom} L0 ${bottom}Z`;
}

/** Shrink long text so it always fits the banner. */
const fit = (text: string, size: number, width: number) => Math.max(18, Math.min(size, Math.floor((width - 80) / (Math.max(1, Array.from(text).length) * 0.56))));

export const bannerCard = defineCard<Params, null>({
  id: 'banner',
  aliases: ['header'],
  category: 'decor',
  tags: ['header', 'hero', 'title', 'intro', 'waves', 'terminal'],
  needsUser: false,
  variants: [
    { label: 'Waves', params: { style: 'wave' } },
    { label: 'Gradient', params: { style: 'gradient', bg: '135,7f5af0,2cb67d' } },
    { label: 'Grid', params: { style: 'grid' } },
    { label: 'Terminal', params: { style: 'terminal', theme: 'matrix' } },
    { label: 'Aurora', params: { style: 'aurora', theme: 'dark' } },
    { label: 'Slice', params: { style: 'slice' } },
    { label: 'Shark fin', params: { style: 'shark', fill: 'solid' } },
    { label: 'Egg', params: { style: 'egg', accent2: 'ff7edb' } },
    { label: 'Pill', params: { style: 'cylinder', height: '120' } },
    { label: 'Footer (flipped)', params: { style: 'slice', reverse: 'true', text: 'Thanks for visiting' } }
  ],
  title: 'Banner',
  description: 'A header banner for your README with your own text. No GitHub data needed.',
  params: [
    { name: 'text', type: 'string', description: 'Main text (defaults to "Hi, I\'m <username>")' },
    { name: 'subtitle', type: 'string', description: 'Second line, e.g. "Full-stack developer"' },
    { name: 'style', type: 'enum', options: [...STYLES], default: 'wave', description: 'Look of the banner' },
    { name: 'height', type: 'number', default: 200, min: 100, max: 320, description: 'Height in pixels' },
    { name: 'size', type: 'number', default: 44, min: 20, max: 90, description: 'Font size of the main text' },
    { name: 'align', type: 'enum', options: [...ALIGNS], default: 'center', description: 'Text alignment' },
    { name: 'border', type: 'boolean', default: false, description: 'Draw a border around the banner' },
    { name: 'fill', type: 'enum', options: [...FILLS], default: 'gradient', description: 'Shaped styles: accent→accent2 gradient or one solid accent colour' },
    { name: 'reverse', type: 'boolean', default: false, description: 'Flip the shape upside down (for footers)' },
    { name: 'stroke', type: 'number', default: 0, min: 0, max: 6, description: 'Dark outline around the text (shaped styles)' },
    { name: 'color', type: 'color', description: 'Text colour (shaped styles; default white)' }
  ],
  parse: (q) => ({
    text: (q.text ?? '').slice(0, 80),
    subtitle: (q.subtitle ?? '').slice(0, 120),
    style: oneOf(q.style, STYLES, 'wave'),
    height: int(q.height, 200, 100, 320),
    size: int(q.size, 44, 20, 90),
    align: oneOf(q.align, ALIGNS, 'center'),
    border: bool(q.border, false),
    fill: oneOf(q.fill, FILLS, 'gradient'),
    reverse: bool(q.reverse, false),
    stroke: int(q.stroke, 0, 0, 6),
    color: color(q.color)
  }),
  load: async () => null,
  toJSON: (_d, p) => p,

  render(_data, p, { theme, common }) {
    const text = p.text || (common.username ? `Hi, I'm ${common.username}` : 'Hello, world');
    const h = p.height;
    const size = fit(text, p.size, WIDTH);
    const left = p.align === 'left';
    const x = left ? 60 : WIDTH / 2;
    const anchor = left ? 'start' : 'middle';
    const moving = common.animation;
    const decorTheme = { ...theme, hideBorder: !p.border };
    let body = '';
    let css = '';

    if (p.style === 'wave') {
      const layers = [
        { base: h - 46, amp: 14, period: 380, phase: 0, o: 0.16, dur: 9 },
        { base: h - 34, amp: 12, period: 300, phase: 1.5, o: 0.26, dur: 6.5 },
        { base: h - 22, amp: 9, period: 240, phase: 3, o: 0.42, dur: 4.5 }
      ];
      body += layers
        .map(
          (l, i) => `<g class="w w${i}"><path d="${wave(WIDTH, l.base, l.amp, l.period, l.phase, h)}" class="accent" fill-opacity="${l.o}"/></g>`
        )
        .join('');
      if (moving) css += layers.map((l, i) => `.w${i}{animation:sw${i} ${l.dur}s linear infinite}@keyframes sw${i}{to{transform:translateX(-${l.period}px)}}`).join('');
      body += `<text x="${x}" y="${h * 0.42}" text-anchor="${anchor}" font-size="${size}" font-weight="800" class="fg">${esc(text)}</text>`;
      if (p.subtitle) body += `<text x="${x}" y="${h * 0.42 + size * 0.75}" text-anchor="${anchor}" font-size="${Math.round(size * 0.4)}" class="muted">${esc(p.subtitle)}</text>`;
    } else if (p.style === 'gradient') {
      body +=
        `<defs><linearGradient id="bn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".35"/></linearGradient></defs>` +
        `<rect width="${WIDTH}" height="${h}" fill="url(#bn)" rx="${theme.borderRadius}"/>` +
        `<text x="${x}" y="${h * 0.5}" text-anchor="${anchor}" font-size="${size}" font-weight="800" fill="#fff">${esc(text)}</text>`;
      if (p.subtitle) body += `<text x="${x}" y="${h * 0.5 + size * 0.75}" text-anchor="${anchor}" font-size="${Math.round(size * 0.4)}" fill="#fff" fill-opacity=".85">${esc(p.subtitle)}</text>`;
    } else if (p.style === 'grid') {
      body +=
        `<defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" class="bd"/></pattern></defs>` +
        `<rect width="${WIDTH}" height="${h}" fill="url(#dots)"/>` +
        `<text x="${x}" y="${h * 0.5}" text-anchor="${anchor}" font-size="${size}" font-weight="800" class="fg">${esc(text)}</text>` +
        `<rect x="${left ? 60 : WIDTH / 2 - 40}" y="${h * 0.5 + 14}" width="80" height="5" rx="2.5" class="accent"/>`;
      if (p.subtitle) body += `<text x="${x}" y="${h * 0.5 + 46}" text-anchor="${anchor}" font-size="${Math.round(size * 0.4)}" class="muted">${esc(p.subtitle)}</text>`;
    } else if (p.style === 'aurora') {
      const a2 = theme.style?.accent2 ?? '#a371f7';
      body +=
        `<defs><filter id="au" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="38"/></filter><clipPath id="auc"><rect width="${WIDTH}" height="${h}" rx="${theme.borderRadius}"/></clipPath></defs>` +
        `<g clip-path="url(#auc)"><g filter="url(#au)" opacity=".85"><circle cx="${WIDTH * 0.18}" cy="${h * 0.4}" r="${h * 0.55}" class="accent"/><circle cx="${WIDTH * 0.55}" cy="${h * 0.85}" r="${h * 0.6}" fill="${a2}"/><circle cx="${WIDTH * 0.85}" cy="${h * 0.3}" r="${h * 0.5}" fill="#22d3ee"/></g></g>` +
        `<text x="${x}" y="${h * 0.5}" text-anchor="${anchor}" font-size="${size}" font-weight="800" ${p.color ? `fill="${p.color}"` : 'class="fg"'}>${esc(text)}</text>`;
      if (p.subtitle) body += `<text x="${x}" y="${h * 0.5 + size * 0.75}" text-anchor="${anchor}" font-size="${Math.round(size * 0.4)}" class="muted">${esc(p.subtitle)}</text>`;
    } else if ((SHAPES as readonly string[]).includes(p.style)) {
      const a2 = theme.style?.accent2 ?? '#a371f7';
      const ink = p.color ? `fill="${p.color}"` : 'fill="#fff"';
      const outline = p.stroke ? ` stroke="#000" stroke-opacity=".4" stroke-width="${p.stroke}" paint-order="stroke" stroke-linejoin="round"` : '';
      const ty = p.style === 'egg' ? h * 0.38 : p.style === 'slice' || p.style === 'shark' ? h * 0.42 : h * 0.5;
      body +=
        `<defs><linearGradient id="bs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" stop-color="${a2}"/></linearGradient></defs>` +
        `<g${p.reverse ? ` transform="translate(0 ${h}) scale(1 -1)"` : ''}><path d="${shapePath(p.style, WIDTH, h)}" ${p.fill === 'solid' ? 'class="accent"' : 'fill="url(#bs)"'}/></g>` +
        `<text x="${x}" y="${ty}" text-anchor="${anchor}" font-size="${size}" font-weight="800" ${ink}${outline}>${esc(text)}</text>`;
      if (p.subtitle) body += `<text x="${x}" y="${ty + size * 0.75}" text-anchor="${anchor}" font-size="${Math.round(size * 0.4)}" ${ink} fill-opacity=".88"${outline}>${esc(p.subtitle)}</text>`;
    } else {
      // terminal window with a typed line and a blinking cursor
      const t = fit(text, Math.min(p.size, 36), WIDTH - 60);
      const chars = Array.from(text).length;
      const glyph = t * 0.62;
      const tw = Math.ceil((chars + 2) * glyph) + 8; // width of the whole typed line, prefix included
      const dur = Math.min(3.5, 0.7 + chars * 0.07).toFixed(1);
      body +=
        `<rect x="30" y="20" width="${WIDTH - 60}" height="${h - 40}" rx="10" class="bd" fill-opacity=".45"/>` +
        `<rect x="30" y="20" width="${WIDTH - 60}" height="30" rx="10" class="bd"/>` +
        `<circle cx="54" cy="35" r="6" fill="#ff5f56"/><circle cx="76" cy="35" r="6" fill="#ffbd2e"/><circle cx="98" cy="35" r="6" fill="#27c93f"/>` +
        `<text x="60" y="${h * 0.42}" font-size="16" class="muted">$ whoami</text>` +
        `<clipPath id="ty"><rect x="60" y="${h * 0.42 + 6}" height="${t + 10}" width="${moving ? 0 : tw}">${moving ? `<animate attributeName="width" from="0" to="${tw}" dur="${dur}s" fill="freeze"/>` : ''}</rect></clipPath>` +
        `<text x="60" y="${h * 0.42 + t + 4}" font-size="${t}" font-weight="700" class="accent" clip-path="url(#ty)">&gt; ${esc(text)}</text>` +
        `<rect x="${60 + tw}" y="${h * 0.42 + 8}" width="${Math.round(t * 0.5)}" height="${t}" class="fg${moving ? ' cur' : ''}"${moving ? '' : ' opacity="0"'}>${moving ? `<animate attributeName="x" from="60" to="${60 + tw}" dur="${dur}s" fill="freeze"/>` : ''}</rect>`;
      if (p.subtitle) body += `<text x="60" y="${h * 0.42 + t + 34}" font-size="${Math.max(13, Math.round(t * 0.5))}" class="muted"># ${esc(p.subtitle)}</text>`;
      if (moving) css += '.cur{animation:blink 1s steps(1) infinite}@keyframes blink{50%{opacity:0}}';
    }

    const style = css ? `<style>${css}</style>` : '';
    return frame(style + body, {
      width: WIDTH,
      height: h,
      theme: decorTheme,
      label: `${text}${p.subtitle ? ` - ${p.subtitle}` : ''}`
    });
  }
});
