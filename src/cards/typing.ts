import { defineCard } from './types';
import { bool, color, int, oneOf } from '../core/params';
import { esc } from '../core/text';
import { frame } from '../svg/frame';

const MODES = ['cycle', 'stack'] as const;
const ALIGNS = ['left', 'center', 'right'] as const;
const CURSORS = ['bar', 'block', 'underscore'] as const;

interface Params {
  lines: string[];
  mode: (typeof MODES)[number];
  size: number;
  speed: number;
  pause: number;
  align: (typeof ALIGNS)[number];
  width: number;
  cursor: boolean;
  cursorStyle: (typeof CURSORS)[number];
  repeat: boolean;
  height: number;
  vcenter: boolean;
  spacing: number;
  color?: string;
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
    { label: 'Type once, then stay', params: { lines: 'Hello!;Welcome to my profile', repeat: 'false', animation: 'true' } },
    { label: 'Block cursor, spaced', params: { lines: 'build. ship. repeat.', cursor_style: 'block', letter_spacing: '4', size: '30', animation: 'true' } },
    { label: 'Tall banner, centred', params: { lines: 'Open to collaborate', height: '140', vcenter: 'true', size: '34', animation: 'true' } },
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
    { name: 'cursor', type: 'boolean', default: true, description: 'Show a blinking cursor' },
    { name: 'cursor_style', type: 'enum', options: [...CURSORS], default: 'bar', description: 'Thin bar, block or underscore' },
    { name: 'repeat', type: 'boolean', default: true, description: 'Loop forever; false types once and keeps the last line' },
    { name: 'height', type: 'number', default: 0, min: 0, max: 400, step: 10, description: 'Fixed canvas height (0 = fit the text)' },
    { name: 'vcenter', type: 'boolean', default: false, description: 'Centre the text vertically when the height is fixed' },
    { name: 'letter_spacing', type: 'number', default: 0, min: -2, max: 12, description: 'Extra space between letters (px)' },
    { name: 'color', type: 'color', description: 'Text colour (default: the theme accent)' }
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
    cursor: bool(q.cursor, true),
    cursorStyle: oneOf(q.cursor_style, CURSORS, 'bar'),
    repeat: bool(q.repeat, true),
    height: int(q.height, 0, 0, 400),
    vcenter: bool(q.vcenter, false),
    spacing: int(q.letter_spacing, 0, -2, 12),
    color: color(q.color)
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
    const widthOf = (l: string) => Math.ceil(Array.from(l).length * (fs * GLYPH + p.spacing));
    const xOf = (l: string) => (p.align === 'center' ? Math.max(4, (W - widthOf(l)) / 2) : p.align === 'right' ? Math.max(4, W - widthOf(l) - 12) : 12);
    const H = Math.max(height, p.height);
    const off = p.vcenter ? (H - height) / 2 : 0;
    const wrap = (inner: string) => (off ? `<g transform="translate(0 ${off.toFixed(1)})">${inner}</g>` : inner);
    const ink = p.color ? `fill="${p.color}"` : 'class="accent"';
    const baseline = (i: number) => Math.round(fs * 0.45 + (stack ? i : 0) * lineH + fs);
    const text = (l: string, i: number, clip = '') =>
      `<text x="${xOf(l).toFixed(1)}" y="${baseline(i)}" font-size="${fs}" ${ink}${p.spacing ? ` letter-spacing="${p.spacing}"` : ''} font-family="'Fira Code',Consolas,'Courier New',monospace" xml:space="preserve"${clip}>${esc(l)}</text>`;

    if (!animate) {
      // still image: the whole stack, or just the first line
      const shown = stack ? lines : lines.slice(0, 1);
      return frame(wrap(shown.map((l, i) => text(l, i)).join('')), { width: W, height: H, theme: { ...theme, hideBorder: true }, transparent: true, label: lines.join('. ') });
    }

    // timing (seconds): type, hold, erase (cycle mode only) per line
    const slots = lines.map((l) => {
      const type = Math.max(0.3, Array.from(l).length / p.speed);
      return { type, hold: p.pause / 1000, erase: stack ? 0 : Math.max(0.2, type / 2.5) };
    });
    const total = slots.reduce((a, s) => a + s.type + s.hold + s.erase, 0) + (stack ? 1 : 0.3);
    const kt = (t: number) => (Math.min(total, Math.max(0, t)) / total).toFixed(4);

    // CSS keyframes (not SMIL), so viewers who prefer reduced motion get a still first line instead
    const pc = (t: number) => `${(Number(kt(t)) * 100).toFixed(2)}%`;
    const dur = `${total.toFixed(2)}s`;
    let at = 0;
    let defs = '';
    let body = '';
    let css = '';
    lines.forEach((l, i) => {
      const s = slots[i];
      const w = widthOf(l) + 2;
      const x = xOf(l);
      const t0 = at;
      const t1 = t0 + s.type;
      const t2 = t1 + s.hold;
      const t3 = t2 + s.erase;
      // reveal: hidden -> typing -> full -> erasing -> hidden (stack mode keeps lines until the loop restarts)
      const end = stack ? total - 0.4 : t3;
      const holdEnd = stack ? end : t2;
      const goneAt = stack ? end + 0.2 : t3;
      // without repeat the final line is typed and then stays
      const keep = !p.repeat && i === lines.length - 1;
      const frames = (from: string, to: string) => (keep ? `0%{transform:${from}}${pc(t0)}{transform:${from}}${pc(t1)}{transform:${to}}100%{transform:${to}}` : `0%{transform:${from}}${pc(t0)}{transform:${from}}${pc(t1)}{transform:${to}}${pc(holdEnd)}{transform:${to}}${pc(goneAt)}{transform:${from}}100%{transform:${from}}`);
      const iter = p.repeat ? 'infinite' : '1 forwards';
      css += `@keyframes tw${i}{${frames('scaleX(0)', 'scaleX(1)')}}.tw${i}{transform-box:fill-box;transform-origin:left center;animation:tw${i} ${dur} linear ${iter}}`;
      defs += `<clipPath id="tc${i}"><rect x="${x.toFixed(1)}" y="${baseline(i) - fs}" height="${Math.round(fs * 1.3)}" width="${w}" class="tw${i}"/></clipPath>`;
      const line = text(l, i, ` clip-path="url(#tc${i})"`);
      // in cycle mode only the first line stays visible when motion is reduced
      body += !stack && i > 0 ? line.replace('class="accent"', 'class="accent tx-rest"') : line;
      if (p.cursor) {
        const lastOpacity = stack && i < lines.length - 1 ? 0 : 1;
        css +=
          `@keyframes cm${i}{${frames('translateX(0px)', `translateX(${w}px)`)}}` +
          `@keyframes co${i}{0%{opacity:0}${pc(t0)}{opacity:1}${keep ? '' : `${pc(holdEnd)}{opacity:${lastOpacity}}${pc(goneAt)}{opacity:0}100%{opacity:0}`}${keep ? '100%{opacity:1}' : ''}}` +
          `.c${i}{opacity:0;animation:cm${i} ${dur} linear ${iter},co${i} ${dur} step-end ${iter},blink 1s step-end infinite}`;
        const cw = p.cursorStyle === 'bar' ? Math.max(2, Math.round(fs * 0.08)) : Math.round(fs * 0.55);
        const ch = p.cursorStyle === 'underscore' ? Math.max(2, Math.round(fs * 0.1)) : Math.round(fs * 1.05);
        const cyy = p.cursorStyle === 'underscore' ? baseline(i) + fs * 0.12 : baseline(i) - fs * 0.85;
        body += `<rect x="${x.toFixed(1)}" y="${cyy.toFixed(1)}" width="${cw}" height="${ch}" class="${p.color ? '' : 'accent '}cur c${i}"${p.color ? ` fill="${p.color}"` : ''} fill-opacity="${p.cursorStyle === 'block' ? 0.7 : 1}"/>`;
      }
      at = t3;
    });
    css += '@keyframes blink{50%{fill-opacity:0}}';
    css += '@media (prefers-reduced-motion:reduce){[class^="tw"]{animation:none;transform:none}.cur{display:none}.tx-rest{display:none}}';
    return frame(`<style>${css}</style><defs>${defs}</defs>${wrap(body)}`, { width: W, height: H, theme: { ...theme, hideBorder: true }, transparent: true, label: lines.join('. ') });
  }
});
