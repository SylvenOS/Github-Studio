import type { FrameStyle, ResolvedTheme, Palette } from '../themes';
import { esc, wrap } from '../core/text';

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
  if (st.titleTransform && st.titleTransform !== 'none') css += `.header{text-transform:${st.titleTransform}}`;
  if (st.titleGradient) css += '.header{fill:url(#titleGrad)}';
  return css;
}

const PATTERNS: Record<string, string> = {
  dots: '<pattern id="bgpat" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" class="fg" fill-opacity=".09"/></pattern>',
  grid: '<pattern id="bgpat" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" class="sk-fg" stroke-opacity=".06"/></pattern>',
  diagonal: '<pattern id="bgpat" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" class="sk-fg" stroke-opacity=".05" stroke-width="3"/></pattern>',
  topo: '<pattern id="bgpat" width="120" height="80" patternUnits="userSpaceOnUse"><path d="M0 40c20-18 40-18 60 0s40 18 60 0M0 60c20-18 40-18 60 0s40 18 60 0M0 20c20-18 40-18 60 0s40 18 60 0" fill="none" class="sk-fg" stroke-opacity=".06"/></pattern>'
};

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
  const cs = o.transparent ? 'default' : st.cardStyle ?? 'default';
  // elevated cards need room for the shadow
  const m = cs === 'elevated' ? 10 : cs === 'neon' ? 6 : 0;
  const outW = st.width ? Math.round((st.width * (vw + 2 * m)) / vw) : vw + 2 * m;
  const outH = Math.round(((vh + 2 * m) * outW) / (vw + 2 * m));
  const bw = theme.hideBorder || cs === 'soft' ? 0 : cs === 'outline' || cs === 'neon' || cs === 'gradient' ? Math.max(2, st.borderWidth ?? 2) : st.borderWidth ?? 1.5;
  const accent2 = st.accent2 ?? '#a371f7';
  const darkCss = theme.dark ? `@media (prefers-color-scheme:dark){:root{${vars(theme.dark)}}}` : '';
  const strokeAttr = cs === 'gradient' ? 'stroke="url(#bdGrad)"' : cs === 'neon' || cs === 'outline' ? 'class="sk-accent"' : 'class="sk-bd"';
  const border = bw > 0
    ? `<rect x="${bw / 2}" y="${bw / 2}" width="${vw - bw}" height="${vh - bw}" rx="${theme.borderRadius}" fill="none" ${strokeAttr} stroke-width="${bw}"${cs === 'neon' ? ' filter="url(#neon)"' : ''}${cs === 'glass' ? ' stroke-opacity=".55"' : ''}/>`
    : '';
  // style defs: gradients, shadow/glow filters, background texture
  let defs = '';
  if (cs === 'gradient' || st.titleGradient) {
    defs += `<linearGradient id="bdGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" stop-color="${accent2}"/></linearGradient>`;
    defs += `<linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" stop-color="${accent2}"/></linearGradient>`;
  }
  if (cs === 'elevated') defs += '<filter id="lift" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity=".22"/></filter>';
  if (cs === 'neon') defs += '<filter id="neon" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  if (cs === 'glass') defs += '<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>';
  const pattern = !o.transparent && st.bgPattern && st.bgPattern !== 'none' ? PATTERNS[st.bgPattern] : '';
  if (pattern) defs += pattern;

  let header = '';
  if (o.title) {
    const align = st.titleAlign ?? 'left';
    const x = align === 'center' ? width / 2 : align === 'right' ? width - PAD : PAD;
    const anchor = align === 'center' ? ' text-anchor="middle"' : align === 'right' ? ' text-anchor="end"' : '';
    header = `<text x="${x}" y="35" class="header accent"${anchor}>${esc(o.title)}</text>`;
    if (o.subtitle && !st.hideSubtitle && align === 'left') {
      header += `<text x="${width - PAD}" y="35" class="label muted" text-anchor="end" font-size="13">${esc(o.subtitle)}</text>`;
    }
    if (st.titleDivider) header += `<line x1="${PAD}" y1="46" x2="${width - PAD}" y2="46" class="sk-bd" stroke-width="1"/>`;
  }
  const body = scaleFonts(header + content, ts);
  const inner = d ? `<g transform="translate(${d} ${d})">${body}</g>` : body;

  const glassBg = cs === 'glass' ? ' fill-opacity=".72"' : '';
  const bgRect = theme.gradient
    ? `<rect x="0" y="0" width="${vw}" height="${vh}" rx="${theme.borderRadius}" fill="url(#bgGrad)" class="bgr"${cs === 'elevated' ? ' filter="url(#lift)"' : ''}/>`
    : `<rect x="0" y="0" width="${vw}" height="${vh}" rx="${theme.borderRadius}" class="bg bgr"${glassBg}${cs === 'elevated' ? ' filter="url(#lift)"' : ''}/>`;
  const extras =
    (cs === 'soft' ? `<rect x="0" y="0" width="${vw}" height="${vh}" rx="${theme.borderRadius}" class="accent" fill-opacity=".06"/>` : '') +
    (pattern ? `<rect x="0" y="0" width="${vw}" height="${vh}" rx="${theme.borderRadius}" fill="url(#bgpat)"/>` : '') +
    (cs === 'glass' ? `<rect x="0" y="0" width="${vw}" height="${vh}" rx="${theme.borderRadius}" fill="url(#sheen)"/>` : '');
  const card =
    (o.transparent ? '' : gradientDef(theme) + bgRect + extras + border) + inner;
  return (
    `<svg width="${outW}" height="${outH}" viewBox="${-m} ${-m} ${vw + 2 * m} ${vh + 2 * m}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(o.label ?? o.title ?? 'GitHub card')}">` +
    `<style>:root{${vars(theme)}}${darkCss}text{font-family:${theme.fontFamily.replace(/"/g, "'")}}${STYLE}${styleCss(st)}${o.animate ?? /fade-in|pulse/.test(content) ? ANIMATION : ''}</style>` +
    (defs ? `<defs>${defs}</defs>` : '') +
    card +
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

export type MessageTone = 'error' | 'warn' | 'info';
const TONE: Record<MessageTone, { color: string; glyph: string }> = {
  error: { color: '#f85149', glyph: '!' },
  warn: { color: '#d29922', glyph: '!' },
  info: { color: '#58a6ff', glyph: 'i' }
};

/** Message card for empty states and errors: a status glyph, a title, the wrapped message and an optional hint. */
export function messageCard(
  message: string,
  theme: ResolvedTheme,
  opts: { title?: string; width?: number; hint?: string; tone?: MessageTone } = {}
): string {
  const width = opts.width ?? 480;
  const tone = TONE[opts.tone ?? 'error'];
  const textX = PAD + 40;
  const lines = wrap(message, Math.floor((width - textX - PAD) / 6.6), 3);
  const hint = opts.hint ? wrap(opts.hint, Math.floor((width - textX - PAD) / 6), 2) : [];
  let y = PAD + 40;
  let body =
    `<circle cx="${PAD + 14}" cy="${PAD + 14}" r="14" fill="${tone.color}" fill-opacity=".15"/>` +
    `<text x="${PAD + 14}" y="${PAD + 19.5}" text-anchor="middle" font-size="16" font-weight="800" fill="${tone.color}">${tone.glyph}</text>` +
    `<text x="${textX}" y="${PAD + 19}" class="fg" font-size="15" font-weight="700">${esc(opts.title ?? 'Something went wrong')}</text>`;
  for (const l of lines) {
    body += `<text x="${textX}" y="${y}" class="fg" font-size="12.5" opacity=".85">${esc(l)}</text>`;
    y += 18;
  }
  for (const l of hint) {
    body += `<text x="${textX}" y="${y + 4}" class="muted" font-size="11.5">${esc(l)}</text>`;
    y += 16;
  }
  return frame(body, { width, height: y + PAD - 6, theme, label: `${opts.title ?? 'Error'}: ${message}` });
}
