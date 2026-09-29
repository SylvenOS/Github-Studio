import { defineCard } from './types';
import { int, oneOf } from '../core/params';
import { frame } from '../svg/frame';

const STYLES = ['wave', 'dots', 'line', 'gradient', 'dashed', 'stars'] as const;
const WIDTH = 900;

interface Params {
  style: (typeof STYLES)[number];
  height: number;
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
    { name: 'height', type: 'number', default: 28, min: 8, max: 80, description: 'Height in pixels' }
  ],
  parse: (q) => ({ style: oneOf(q.style, STYLES, 'wave'), height: int(q.height, 28, 8, 80) }),
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
