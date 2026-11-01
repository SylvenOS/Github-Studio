import { defineCard } from './types';
import { bool, int, oneOf } from '../core/params';
import { esc } from '../core/text';
import { frame } from '../svg/frame';

const MODES = ['cycle', 'stack'] as const;
const ALIGNS = ['left', 'center'] as const;

interface Params {
  lines: string[];
  mode: (typeof MODES)[number];
  size: number;
  speed: number;
  pause: number;
  align: (typeof ALIGNS)[number];
  width: number;
  cursor: boolean;
}

/** Monospace glyph advance, as a share of the font size. */
const GLYPH = 0.6;

export const typingCard = defineCard<Params, null>({
  id: 'typing',
  aliases: ['typewriter', 'typing-svg'],
  category: 'decor',
  tags: ['typing', 'typewriter', 'animated', 'header', 'greeting', 'intro'],
  needsUser: false,
  variants: [
    { label: 'Cycling lines', params: { lines: "Hi there, I'm a developer;I build open source tools;Always learning something new", animation: 'true' } },
    { label: 'Stacked terminal', params: { lines: '$ whoami;> full-stack developer;> coffee-driven', mode: 'stack', align: 'left', theme: 'matrix', animation: 'true' } },
    { label: 'Big centred', params: { lines: 'Welcome to my profile;Thanks for visiting', size: '32', animation: 'true' } },
    { label: 'Static', params: { lines: 'Hello, world' } }
  ],
  title: 'Typing Text',
  description: 'Animated typewriter lines for the top of your README (needs animation=true; otherwise shows a still version). No GitHub data needed.',
  params: [
    { name: 'lines', type: 'string', description: 'Lines separated by ;  e.g. Hi there;I build things' },
    { name: 'mode', type: 'enum', options: [...MODES], default: 'cycle', description: 'Type and erase one line at a time, or stack them' },
    { name: 'size', type: 'number', default: 22, min: 12, max: 48, description: 'Font size' },
    { name: 'speed', type: 'number', default: 14, min: 4, max: 40, description: 'Characters per second' },
    { name: 'pause', type: 'number', default: 1500, min: 200, max: 6000, step: 100, description: 'Pause after each line (ms)' },
    { name: 'align', type: 'enum', options: [...ALIGNS], default: 'center', description: 'Text alignment' },
    { name: 'width', type: 'number', default: 600, min: 200, max: 1200, step: 10, description: 'Canvas width' },
    { name: 'cursor', type: 'boolean', default: true, description: 'Show a blinking cursor' }
  ],
  parse: (q) => ({
    lines: (q.lines ?? "Hi there, I'm a developer;Welcome to my GitHub profile")
      .split(';')
      .map((l) => l.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 6),
    mode: oneOf(q.mode, MODES, 'cycle'),
    size: int(q.size, 22, 12, 48),
    speed: int(q.speed, 14, 4, 40),
    pause: int(q.pause, 1500, 200, 6000),
    align: oneOf(q.align, ALIGNS, 'center'),
    width: int(q.width, 600, 200, 1200),
    cursor: bool(q.cursor, true)
  }),
  load: async () => null,
  toJSON: (_d, p) => ({ lines: p.lines, mode: p.mode }),

  render(_d, p, { theme, common }) {
    const lines = p.lines.length ? p.lines : ['Hello, world'];
    const fs = p.size;
    const lineH = Math.round(fs * 1.45);
    const stack = p.mode === 'stack';
    const height = Math.round((stack ? lines.length : 1) * lineH + fs * 0.9);
    const W = p.width;
    const animate = common.animation;
    const widthOf = (l: string) => Math.ceil(Array.from(l).length * fs * GLYPH);
    const xOf = (l: string) => (p.align === 'center' ? Math.max(4, (W - widthOf(l)) / 2) : 12);
    const baseline = (i: number) => Math.round(fs * 0.45 + (stack ? i : 0) * lineH + fs);
    const text = (l: string, i: number, clip = '') =>
      `<text x="${xOf(l).toFixed(1)}" y="${baseline(i)}" font-size="${fs}" class="accent" font-family="'Fira Code',Consolas,'Courier New',monospace" xml:space="preserve"${clip}>${esc(l)}</text>`;

    if (!animate) {
      // still image: the whole stack, or just the first line
      const shown = stack ? lines : lines.slice(0, 1);
      return frame(shown.map((l, i) => text(l, i)).join(''), { width: W, height, theme: { ...theme, hideBorder: true }, transparent: true, label: lines.join('. ') });
    }

    // timing (seconds): type, hold, erase (cycle mode only) per line
    const slots = lines.map((l) => {
      const type = Math.max(0.3, Array.from(l).length / p.speed);
      return { type, hold: p.pause / 1000, erase: stack ? 0 : Math.max(0.2, type / 2.5) };
    });
    const total = slots.reduce((a, s) => a + s.type + s.hold + s.erase, 0) + (stack ? 1 : 0.3);
    const kt = (t: number) => (Math.min(total, Math.max(0, t)) / total).toFixed(4);

    let at = 0;
    let defs = '';
    let body = '';
    lines.forEach((l, i) => {
      const s = slots[i];
      const w = widthOf(l) + 2;
      const x = xOf(l);
      const t0 = at;
      const t1 = t0 + s.type;
      const t2 = t1 + s.hold;
      const t3 = t2 + s.erase;
      // clip width: hidden -> typing -> full -> erasing -> hidden (stack mode keeps lines until the loop restarts)
      const end = stack ? total - 0.4 : t3;
      const values = `0;0;${w};${w};0;0`;
      const times = `0;${kt(t0)};${kt(t1)};${kt(stack ? end : t2)};${kt(stack ? end + 0.2 : t3)};1`;
      defs += `<clipPath id="tc${i}"><rect x="${x.toFixed(1)}" y="${baseline(i) - fs}" height="${Math.round(fs * 1.3)}" width="0"><animate attributeName="width" values="${values}" keyTimes="${times}" dur="${total.toFixed(2)}s" repeatCount="indefinite"/></rect></clipPath>`;
      body += text(l, i, ` clip-path="url(#tc${i})"`);
      if (p.cursor) {
        const cx = (v: number) => (x + v).toFixed(1);
        body +=
          `<rect x="${cx(0)}" y="${baseline(i) - fs * 0.85}" width="${Math.max(2, Math.round(fs * 0.08))}" height="${Math.round(fs * 1.05)}" class="accent cur" opacity="0">` +
          `<animate attributeName="x" values="${cx(0)};${cx(0)};${cx(w)};${cx(w)};${cx(0)};${cx(0)}" keyTimes="${times}" dur="${total.toFixed(2)}s" repeatCount="indefinite"/>` +
          `<animate attributeName="opacity" values="0;1;1;${stack && i < lines.length - 1 ? 0 : 1};0;0" keyTimes="${times}" dur="${total.toFixed(2)}s" repeatCount="indefinite" calcMode="discrete"/></rect>`;
      }
      at = t3;
    });
    const css = p.cursor ? '<style>@keyframes blink{50%{fill-opacity:0}}.cur{animation:blink 1s step-end infinite}@media (prefers-reduced-motion:reduce){.cur{animation:none}}</style>' : '';
    return frame(`${css}<defs>${defs}</defs>${body}`, { width: W, height, theme: { ...theme, hideBorder: true }, transparent: true, label: lines.join('. ') });
  }
});
