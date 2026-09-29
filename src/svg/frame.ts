import type { ResolvedTheme, Palette } from '../themes';
import { esc } from '../core/text';

export const PAD = 25;

/** Y coordinate where card content starts, given whether the header is shown. */
export const contentTop = (hasHeader: boolean) => (hasHeader ? 55 : PAD);

export interface FrameOptions {
  width: number;
  height: number;
  theme: ResolvedTheme;
  animate?: boolean;
  /** Header text (left) and subtitle (right). Header is skipped when `title` is empty. */
  title?: string;
  subtitle?: string;
  /** Accessible description of the card. */
  label?: string;
}

const vars = (p: Palette) =>
  `--bg:${p.background};--fg:${p.foreground};--muted:${p.muted};--accent:${p.accent};--border:${p.border}`;

const STYLE = `
.bg{fill:var(--bg)}.fg{fill:var(--fg)}.muted{fill:var(--muted)}.accent{fill:var(--accent)}.bd{fill:var(--border)}
.sk-bd{stroke:var(--border)}.sk-accent{stroke:var(--accent)}.sk-fg{stroke:var(--fg)}.sk-bg{stroke:var(--bg)}
.header{font-size:18px;font-weight:600}.value{font-size:16px;font-weight:600}.label{font-size:12px}
.l0{fill:var(--fg);fill-opacity:.1}.l1{fill:var(--accent);fill-opacity:.4}.l2{fill:var(--accent);fill-opacity:.6}
.l3{fill:var(--accent);fill-opacity:.8}.l4{fill:var(--accent)}`;

const ANIMATION = `
@keyframes fadeIn{from{opacity:0;translate:0 8px}to{opacity:1;translate:0 0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
.fade-in{opacity:0;animation:fadeIn .7s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--i,0)*90ms)}
.pulse{animation:pulse 2s infinite}
@media (prefers-reduced-motion:reduce){.fade-in{opacity:1;animation:none}.pulse{animation:none}}`;

function gradientDef(theme: ResolvedTheme): string {
  const g = theme.gradient;
  if (!g) return '';
  const rad = ((g.angle - 90) * Math.PI) / 180;
  const [dx, dy] = [Math.cos(rad) * 50, Math.sin(rad) * 50];
  const stops = g.stops
    .map((c, i) => `<stop offset="${Math.round((i / (g.stops.length - 1)) * 100)}%" stop-color="${esc(c)}"/>`)
    .join('');
  return `<defs><linearGradient id="bgGrad" x1="${50 - dx}%" y1="${50 - dy}%" x2="${50 + dx}%" y2="${50 + dy}%">${stops}</linearGradient></defs>`;
}

/** Wraps card content in the shared SVG chrome: theme variables, border, optional header. */
export function frame(content: string, o: FrameOptions): string {
  const { width, height, theme } = o;
  const darkCss = theme.dark ? `@media (prefers-color-scheme:dark){:root{${vars(theme.dark)}}}` : '';
  const border = theme.hideBorder
    ? ''
    : `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${theme.borderRadius}" fill="none" class="sk-bd" stroke-width="1.5"/>`;
  const header = o.title
    ? `<text x="${PAD}" y="35" class="header accent">${esc(o.title)}</text>` +
      (o.subtitle
        ? `<text x="${width - PAD}" y="35" class="label muted" text-anchor="end" font-size="13">${esc(o.subtitle)}</text>`
        : '')
    : '';

  return (
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(o.label ?? o.title ?? 'GitHub card')}">` +
    `<style>:root{${vars(theme)}}${darkCss}text{font-family:${theme.fontFamily.replace(/"/g, "'")}}${STYLE}${o.animate ?? /fade-in|pulse/.test(content) ? ANIMATION : ''}</style>` +
    gradientDef(theme) +
    `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${theme.borderRadius}" ${theme.gradient ? 'fill="url(#bgGrad)"' : 'class="bg"'}/>` +
    border +
    header +
    content +
    `</svg>`
  );
}

/** Attributes that fade an element in (staggered by index) when animating. */
export const anim = (animate: boolean | undefined, i = 0, extra = '') =>
  animate
    ? ` class="fade-in${extra ? ' ' + extra : ''}" style="--i:${i}"`
    : extra
      ? ` class="${extra}"`
      : '';

/** Small message card used for empty states and errors. */
export function messageCard(message: string, theme: ResolvedTheme, opts: { title?: string; width?: number } = {}): string {
  const width = opts.width ?? 440;
  return frame(`<text x="${PAD}" y="80" class="label muted" font-size="13">${esc(message)}</text>`, {
    width,
    height: 110,
    theme,
    title: opts.title ?? 'Something went wrong',
    label: message
  });
}
