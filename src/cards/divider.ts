import { defineCard } from './types';
import { int, oneOf } from '../core/params';
import { esc } from '../core/text';
import { frame } from '../svg/frame';

const STYLES = ['wave', 'dots', 'line', 'gradient', 'dashed', 'stars', 'zigzag', 'pulse', 'blocks', 'diamond', 'label', 'footer', 'header'] as const;
const WIDTH = 900;

interface Params {
  style: (typeof STYLES)[number];
  height: number;
  text: string;
  thickness: number;
}

export const dividerCard = defineCard<Params, null>({
  id: 'divider',
  aliases: ['separator'],
  category: 'decor',
  tags: ['separator', 'line', 'section', 'break'],
  needsUser: false,
  variants: STYLES.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), params: { style: s } })),
  title: 'Divider',
  description: 'A themed separator between README sections. No GitHub data needed.',
  params: [
    { name: 'style', type: 'enum', options: [...STYLES], default: 'wave', description: 'Look of the divider' },
    { name: 'height', type: 'number', default: 28, min: 8, max: 200, description: 'Height in pixels (footer/header waves default to 120)' },
    { name: 'text', type: 'string', description: 'Centre text for style=label, e.g. Projects (max 40)' },
    { name: 'thickness', type: 'number', default: 2, min: 1, max: 8, description: 'Line thickness (line, zigzag, pulse, label, diamond)' }
  ],
  parse: (q) => {
    const style = oneOf(q.style, STYLES, 'wave');
    const big = style === 'footer' || style === 'header';
    return { style, height: int(q.height, big ? 120 : 28, 8, 200), text: (q.text ?? '').trim().slice(0, 40), thickness: int(q.thickness, 2, 1, 8) };
  },
  load: async () => null,
  toJSON: (_d, p) => p,

  render(_data, p, { theme, common }) {
    const h = p.height;
    const mid = h / 2;
    let body = '';
    let css = '';

    switch (p.style) {
      case 'line':
        body = `<rect x="40" y="${mid - 1}" width="${WIDTH - 80}" height="2" rx="1" class="bd"/>`;
        break;
      case 'dashed':
        body = `<line x1="40" y1="${mid}" x2="${WIDTH - 40}" y2="${mid}" class="sk-accent" stroke-width="2" stroke-dasharray="10 8" stroke-linecap="round"/>`;
        if (common.animation) css = '.d{animation:dash 1.2s linear infinite}@keyframes dash{to{stroke-dashoffset:-18}}';
        body = body.replace('<line ', '<line class="sk-accent d" ').replace('class="sk-accent" ', '');
        break;
      case 'dots': {
        const n = 24;
        body = Array.from({ length: n }, (_, i) => {
          const x = 60 + (i * (WIDTH - 120)) / (n - 1);
          const r = 2 + 3 * Math.abs(Math.sin((i / n) * Math.PI));
          return `<circle cx="${x.toFixed(1)}" cy="${mid}" r="${r.toFixed(1)}" class="accent" fill-opacity="${(0.35 + 0.65 * Math.sin((i / (n - 1)) * Math.PI)).toFixed(2)}"/>`;
        }).join('');
        break;
      }
      case 'gradient':
        body =
          `<defs><linearGradient id="dg" x1="0" x2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0"/><stop offset=".5" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>` +
          `<rect x="0" y="${mid - 2}" width="${WIDTH}" height="4" rx="2" fill="url(#dg)"/>`;
        break;
      case 'footer':
      case 'header': {
        // layered filled waves, like a capsule banner footer (or flipped as a header)
        const flip = p.style === 'header';
        const layer = (amp: number, phase: number, base: number, op: number, cls: string) => {
          const pts: string[] = [];
          for (let x = 0; x <= WIDTH + 200; x += 12) pts.push(`${x} ${(base + amp * Math.sin((x / 200) * 2 * Math.PI + phase)).toFixed(1)}`);
          return `<g class="${cls}"><path d="M${pts.join(' L')} L${WIDTH + 200} ${h} L0 ${h}Z" class="accent" fill-opacity="${op}"${flip ? ` transform="translate(0 ${h}) scale(1 -1)"` : ''}/></g>`;
        };
        body = layer(h * 0.12, 0, h * 0.35, 0.25, 'fw1') + layer(h * 0.1, 1.8, h * 0.5, 0.45, 'fw2') + layer(h * 0.08, 3.4, h * 0.66, 0.9, 'fw3');
        if (common.animation) css = '.fw1{animation:fw 9s linear infinite}.fw2{animation:fw 6s linear infinite reverse}.fw3{animation:fw 12s linear infinite}@keyframes fw{to{transform:translateX(-200px)}}@media (prefers-reduced-motion:reduce){.fw1,.fw2,.fw3{animation:none}}';
        break;
      }
      case 'zigzag': {
        const pts: string[] = [];
        for (let x = 40, i = 0; x <= WIDTH - 40; x += 18, i++) pts.push(`${x} ${(mid + (i % 2 ? 1 : -1) * Math.min(h * 0.3, 9)).toFixed(1)}`);
        body = `<polyline points="${pts.join(' ')}" fill="none" class="sk-accent" stroke-width="${p.thickness}" stroke-linejoin="round" stroke-linecap="round"/>`;
        break;
      }
      case 'pulse': {
        const a = Math.min(h * 0.42, 22);
        const d = `M40 ${mid} H${WIDTH * 0.3} l10 -${a * 0.3} l10 ${a * 0.3} H${WIDTH * 0.4} l8 ${a * 0.5} l14 -${a * 2} l14 ${a * 2.4} l8 -${a * 0.9} H${WIDTH * 0.58} l10 -${a * 0.3} l10 ${a * 0.3} H${WIDTH - 40}`;
        body = `<path d="${d}" fill="none" class="sk-accent${common.animation ? ' pl' : ''}" stroke-width="${p.thickness}" stroke-linejoin="round" stroke-linecap="round"${common.animation ? ' stroke-dasharray="900" stroke-dashoffset="900"' : ''}/>`;
        if (common.animation) css = '.pl{animation:pl 3s ease-out infinite}@keyframes pl{to{stroke-dashoffset:0}}@media (prefers-reduced-motion:reduce){.pl{animation:none;stroke-dashoffset:0}}';
        break;
      }
      case 'blocks': {
        const n = 15;
        const sz = Math.min(h - 6, 14);
        const start = WIDTH / 2 - (n * (sz + 6)) / 2;
        body = Array.from({ length: n }, (_, i) => `<rect x="${(start + i * (sz + 6)).toFixed(1)}" y="${(mid - sz / 2).toFixed(1)}" width="${sz}" height="${sz}" rx="3" class="l${[0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 3, 1, 2, 4][i]}"/>`).join('');
        break;
      }
      case 'diamond':
        body =
          `<rect x="40" y="${mid - p.thickness / 2}" width="${WIDTH / 2 - 70}" height="${p.thickness}" rx="1" class="bd"/><rect x="${WIDTH / 2 + 30}" y="${mid - p.thickness / 2}" width="${WIDTH / 2 - 70}" height="${p.thickness}" rx="1" class="bd"/>` +
          `<path d="M${WIDTH / 2} ${mid - 9} L${WIDTH / 2 + 9} ${mid} L${WIDTH / 2} ${mid + 9} L${WIDTH / 2 - 9} ${mid} Z" class="accent"/>`;
        break;
      case 'label': {
        const label = p.text || 'Section';
        const half = Math.min(WIDTH / 2 - 60, (Array.from(label).length * 9.5 + 24) / 2);
        body =
          `<rect x="40" y="${mid - p.thickness / 2}" width="${WIDTH / 2 - half - 52}" height="${p.thickness}" rx="1" class="bd"/><rect x="${WIDTH / 2 + half + 12}" y="${mid - p.thickness / 2}" width="${WIDTH / 2 - half - 52}" height="${p.thickness}" rx="1" class="bd"/>` +
          `<text x="${WIDTH / 2}" y="${mid + 5}" text-anchor="middle" font-size="${Math.min(16, Math.max(11, h * 0.6))}" font-weight="700" letter-spacing="2" class="accent">${esc(label.toUpperCase())}</text>`;
        break;
      }
      case 'stars':
        body =
          `<rect x="40" y="${mid - 0.5}" width="${WIDTH / 2 - 70}" height="1" class="bd"/><rect x="${WIDTH / 2 + 30}" y="${mid - 0.5}" width="${WIDTH / 2 - 70}" height="1" class="bd"/>` +
          [-16, 0, 16].map((dx, i) => `<path d="M0-${6 - Math.abs(i - 1) * 1.5}L1.6-1.6 6 0 1.6 1.6 0 6-1.6 1.6-6 0-1.6-1.6Z" class="accent" transform="translate(${WIDTH / 2 + dx} ${mid})"/>`).join('');
        break;
      default: {
        // wave: two overlapping sines that drift when animated
        const path = (amp: number, phase: number) => {
          const pts: string[] = [];
          for (let x = 0; x <= WIDTH + 120; x += 10) pts.push(`${x} ${(mid + amp * Math.sin((x / 120) * 2 * Math.PI + phase)).toFixed(1)}`);
          return `M${pts.join(' L')}`;
        };
        body =
          `<g class="dw1"><path d="${path(h * 0.28, 0)}" class="sk-accent" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>` +
          `<g class="dw2"><path d="${path(h * 0.2, 2)}" class="sk-accent" stroke-width="1.5" fill="none" stroke-opacity=".45"/></g>`;
        if (common.animation) css = '.dw1{animation:dw 5s linear infinite}.dw2{animation:dw 8s linear infinite reverse}@keyframes dw{to{transform:translateX(-120px)}}';
      }
    }

    return frame(css ? `<style>${css}</style>${body}` : body, { width: WIDTH, height: h, theme, transparent: true, label: 'Section divider' });
  }
});
