import type { FrameStyle, ResolvedTheme, Palette } from '../themes';
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
  /** Skip the card background and border (dividers and other decor). */
  transparent?: boolean;
}

const vars = (p: Palette) =>
  `--bg:${p.background};--fg:${p.foreground};--muted:${p.muted};--accent:${p.accent};--border:${p.border}`;

const STYLE = `
.bg{fill:var(--bg)}.fg{fill:var(--fg)}.muted{fill:var(--muted)}.accent{fill:var(--accent)}.bd{fill:var(--border)}
.sk-bd{stroke:var(--border)}.sk-accent{stroke:var(--accent)}.sk-fg{stroke:var(--fg)}.sk-bg{stroke:var(--bg)}
.header{font-size:18px;font-weight:600}.value{font-size:16px;font-weight:600}.label{font-size:12px}
.l0{fill:var(--fg);fill-opacity:.1}.l1{fill:var(--accent);fill-opacity:.4}.l2{fill:var(--accent);fill-opacity:.6}
.l3{fill:var(--accent);fill-opacity:.8}.l4{fill:var(--accent)}
.ser{fill:var(--s0,var(--accent))}.ser2{fill:var(--s1,var(--accent))}.sk-ser{stroke:var(--s0,var(--accent))}`;

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

/** CSS for the generic style options. Every value here was validated to a number or hex colour. */
function styleCss(st: FrameStyle): string {
  let css = '';
  const ts = (st.textScale ?? 100) / 100;
  if (st.titleSize || ts !== 1) css += `.header{font-size:${((st.titleSize ?? 18) * (st.titleSize ? 1 : ts)).toFixed(1)}px}`;
  if (ts !== 1) css += `.value{font-size:${(16 * ts).toFixed(1)}px}.label{font-size:${(12 * ts).toFixed(1)}px}`;
  if (st.titleColor) css += `.header{fill:${st.titleColor}}`;
  if (st.valueColor) css += `.value{fill:${st.valueColor}}`;
  if (st.iconColor) css += `.ic{fill:${st.iconColor}}`;
  if (st.chartColors) css += `:root{${st.chartColors.map((c, i) => `--s${i}:${c}`).join(';')}}`;
  if (st.heatColors) css += st.heatColors.map((c, i) => `.l${i}{fill:${c};fill-opacity:1}`).join('');
  if (st.bgOpacity !== undefined && st.bgOpacity < 100) css += `.bgr{fill-opacity:${st.bgOpacity / 100}}`;
  if (st.glow) css += '.header,.accent,.ic{filter:drop-shadow(0 0 3px var(--accent))}';
  return css;
}

/** Scales inline font sizes for `text_scale` (cards set sizes as attributes). */
const scaleFonts = (svg: string, ts: number) =>
  ts === 1 ? svg : svg.replace(/font-size="(\d+(?:\.\d+)?)"/g, (_, n: string) => `font-size="${(Number(n) * ts).toFixed(1)}"`);

/**
 * Wraps card content in the shared SVG chrome: theme variables, background, border, optional header,
 * plus the generic style options (width, padding, title alignment, colours, text scale, glow...).
 */
export function frame(content: string, o: FrameOptions): string {
  const { width, height, theme } = o;
  const st = theme.style ?? {};
  const ts = (st.textScale ?? 100) / 100;
  // padding grows/shrinks the canvas around the card's own layout (designed for 25px)
  const d = (st.padding ?? PAD) - PAD;
  const vw = width + 2 * d;
  const vh = height + 2 * d;
  const outW = st.width ?? vw;
  const outH = Math.round((vh * outW) / vw);
  const bw = theme.hideBorder ? 0 : st.borderWidth ?? 1.5;
  const darkCss = theme.dark ? `@media (prefers-color-scheme:dark){:root{${vars(theme.dark)}}}` : '';
  const border = bw > 0
    ? `<rect x="${bw / 2}" y="${bw / 2}" width="${vw - bw}" height="${vh - bw}" rx="${theme.borderRadius}" fill="none" class="sk-bd" stroke-width="${bw}"/>`
    : '';

  let header = '';
  if (o.title) {
    const align = st.titleAlign ?? 'left';
    const x = align === 'center' ? width / 2 : align === 'right' ? width - PAD : PAD;
    const anchor = align === 'center' ? ' text-anchor="middle"' : align === 'right' ? ' text-anchor="end"' : '';
    header = `<text x="${x}" y="35" class="header accent"${anchor}>${esc(o.title)}</text>`;
    if (o.subtitle && !st.hideSubtitle && align === 'left') {
      header += `<text x="${width - PAD}" y="35" class="label muted" text-anchor="end" font-size="13">${esc(o.subtitle)}</text>`;
    }
  }
  const body = scaleFonts(header + content, ts);
  const inner = d ? `<g transform="translate(${d} ${d})">${body}</g>` : body;

  return (
    `<svg width="${outW}" height="${outH}" viewBox="0 0 ${vw} ${vh}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(o.label ?? o.title ?? 'GitHub card')}">` +
    `<style>:root{${vars(theme)}}${darkCss}text{font-family:${theme.fontFamily.replace(/"/g, "'")}}${STYLE}${styleCss(st)}${o.animate ?? /fade-in|pulse/.test(content) ? ANIMATION : ''}</style>` +
    (o.transparent
      ? ''
      : gradientDef(theme) +
        `<rect x="0" y="0" width="${vw}" height="${vh}" rx="${theme.borderRadius}" ${theme.gradient ? 'fill="url(#bgGrad)" class="bgr"' : 'class="bg bgr"'}/>` +
        border) +
    inner +
    `</svg>`
  );
}

/** Attributes that fade an element in (staggered by index) - only when animating; otherwise nothing, so still cards carry no animation CSS. */
export const anim = (animate: boolean | undefined, i = 0, extra = '') =>
  animate ? ` class="fade-in${extra ? ' ' + extra : ''}" style="--i:${i}"` : '';

/**
 * For elements that already have a class: `class="<base> fade-in"` when animating, else `class="<base>"`.
 * Never combine `anim()` with a literal class attribute - that produces a duplicate attribute (invalid XML).
 */
export const cls = (base: string, animate: boolean | undefined, i = 0) =>
  animate ? ` class="${base} fade-in" style="--i:${i}"` : ` class="${base}"`;

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
