import { findCard } from '../cards';
import { esc } from '../core/text';
import { resolveBadge } from './badges';
import type { Align, Block, CardBlock, ReadmeSpec } from './spec';

export interface Rendered {
  /** GitHub-flavoured Markdown (with a little HTML for alignment and side-by-side layout). */
  markdown: string;
  /** The same document as an HTML fragment, for previews. Wrap it in a sandboxed iframe. */
  html: string;
  /** Advice about the result (too many images, several animations...). */
  warnings: string[];
}

interface Part {
  md: string;
  html: string;
}

const both = (s: string): Part => ({ md: s, html: s });

/** Escape for a double-quoted attribute. `&` stays raw so generated URLs read naturally (GitHub accepts it). */
const attr = (s: string) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cardUrl(origin: string, spec: ReadmeSpec, b: CardBlock, theme: string): string {
  const q = new URLSearchParams();
  q.set('username', spec.username);
  if (theme !== 'default') q.set('theme', theme);
  for (const [k, v] of Object.entries({ ...spec.params, ...b.params })) if (k !== 'theme') q.set(k, v);
  // GitHub's image proxy caches by URL; a version token that changes with the README makes edits show up.
  // Our own cache ignores `v` (it isn't a card parameter).
  if (spec.version) q.set('v', spec.version);
  return `${origin}/api/${b.card}?${q.toString().replace(/%2C/gi, ',')}`;
}

/** `fallbackWidth`: e.g. "48%" for cards in a row, so they shrink to sit side by side instead of wrapping. */
function cardImage(origin: string, spec: ReadmeSpec, b: CardBlock, fallbackWidth?: string): string {
  const title = findCard(b.card)?.title ?? b.card;
  const w = b.width ?? fallbackWidth;
  const width = w ? ` width="${w}"` : '';
  const explicit = b.params?.theme;
  const light = cardUrl(origin, spec, b, explicit ?? spec.theme);
  let img = `<img src="${attr(light)}" alt="${attr(b.alt ?? `${title} for @${spec.username}`)}"${width} />`;
  if (spec.dark && !explicit) {
    const dark = cardUrl(origin, spec, b, spec.dark);
    img = `<picture>\n    <source media="(prefers-color-scheme: dark)" srcset="${attr(dark)}">\n    ${img}\n  </picture>`;
  }
  return b.link ? `<a href="${attr(b.link)}">${img}</a>` : img;
}

const wrapAligned = (align: Align, items: string[]) => `<p align="${align}">\n  ${items.join('\n  ')}\n</p>`;

// ---- minimal markdown -> html, for previews of text blocks -----------------------------------

function inline(s: string): string {
  return esc(s)
    // bounded quantifiers keep these linear even on adversarial input (lots of unclosed brackets)
    .replace(/!\[([^\]\n]{0,200})\]\((https?:[^)\s]{1,500})\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]\n]{1,200})\]\((https?:[^)\s]{1,500}|mailto:[^)\s]{1,200})\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*\n]{1,300})\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]{1,300})`/g, '<code>$1</code>');
}

export function markdownToHtml(md: string): string {
  return md
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para.split('\n').filter((l) => l.trim());
      if (!lines.length) return '';
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`;
      const h = /^(#{1,6})\s+(.*)$/.exec(lines[0]);
      if (h && lines.length === 1) return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
      if (/^---+$/.test(lines[0])) return '<hr>';
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}

/** Defence in depth for previews: drop scripts, inline handlers and javascript: URLs from raw HTML blocks. */
export function stripActive(html: string): string {
  return html
    // drop the tags themselves (linear; script bodies become inert text and the preview is sandboxed anyway)
    .replace(/<\/?(script|iframe|frame|frameset|object|embed|meta|base|link|form|style|svg|math)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // only http(s), mailto, fragments and relative paths survive in URL attributes (entities decoded first)
    .replace(/\s(href|src|action|formaction|xlink:href|srcset|poster)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (m, _a: string, v: string) => {
      const raw = v.replace(/^["']|["']$/g, '').replace(/&#x?[0-9a-f]+;?|&[a-z]+;/gi, '').replace(/[\s\u0000-\u001f]/g, '');
      return /^(https?:|mailto:|#|\/|\.|[\w-]+(\/|\.|$))/i.test(raw) && !/^[\w+.-]+:/i.test(raw.replace(/^(https?|mailto):/i, '')) ? m : '';
    });
}

// ---- blocks ----------------------------------------------------------------------------------

function renderBlock(b: Block, spec: ReadmeSpec, origin: string): Part {
  const ctx = { origin, username: spec.username, theme: spec.theme };
  switch (b.type) {
    case 'card':
      return both(wrapAligned(b.align ?? spec.align, [cardImage(origin, spec, b)]));

    case 'row':
      return b.items.length
        ? both(wrapAligned(b.align ?? spec.align, b.items.map((c) => cardImage(origin, spec, c, b.items.length > 1 ? `${Math.floor(96 / b.items.length)}%` : undefined))))
        : both('');

    case 'heading': {
      const level = b.level ?? 2;
      const align = b.align ?? 'left';
      return align === 'left'
        ? { md: `${'#'.repeat(level)} ${b.text}`, html: `<h${level}>${inline(b.text)}</h${level}>` }
        : both(`<h${level} align="${align}">${esc(b.text)}</h${level}>`);
    }

    case 'text': {
      const align = b.align ?? 'left';
      return align === 'left'
        ? { md: b.markdown, html: markdownToHtml(b.markdown) }
        : { md: `<div align="${align}">\n\n${b.markdown}\n\n</div>`, html: `<div style="text-align:${align}">${markdownToHtml(b.markdown)}</div>` };
    }

    case 'badges': {
      const style = b.style ?? 'for-the-badge';
      const items = b.items
        .map((item) => resolveBadge(item, style, ctx))
        .filter((x): x is NonNullable<typeof x> => !!x)
        .map((x) => {
          const img = `<img src="${attr(x.src)}" alt="${attr(x.alt)}" />`;
          return x.href ? `<a href="${attr(x.href)}">${img}</a>` : img;
        });
      return items.length ? both(wrapAligned(b.align ?? spec.align, items)) : both('');
    }

    case 'divider': {
      const q = new URLSearchParams({ style: b.style ?? 'wave' });
      if (spec.theme !== 'default') q.set('theme', spec.theme);
      if (spec.version) q.set('v', spec.version);
      return both(wrapAligned(b.align ?? 'center', [`<img src="${attr(`${origin}/api/divider?${q}`)}" alt="" width="100%" />`]));
    }

    case 'html':
      return { md: b.html, html: stripActive(b.html) };

    case 'details': {
      const inner = b.blocks.map((x) => renderBlock(x, spec, origin));
      const open = b.open ? ' open' : '';
      return {
        md: `<details${open}>\n<summary>${esc(b.summary)}</summary>\n\n${inner.map((p) => p.md).join('\n\n')}\n\n</details>`,
        html: `<details${open}><summary>${esc(b.summary)}</summary>${inner.map((p) => p.html).join('')}</details>`
      };
    }
  }
}

/** Renders a spec to Markdown (what users paste into their profile README) and an HTML preview of it. */
/** Short, stable hash (FNV-1a, base36). */
function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).slice(0, 6);
}

/** Images and animated cards in a README, for the advice in `warnings`. */
function audit(spec: ReadmeSpec): string[] {
  let images = 0;
  let animated = 0;
  const globalAnim = spec.params.animation === 'true';
  const visit = (blocks: Block[]) => {
    for (const b of blocks) {
      const cards = b.type === 'card' ? [b] : b.type === 'row' ? b.items : [];
      for (const c of cards) {
        images++;
        if (globalAnim || c.params?.animation === 'true') animated++;
      }
      if (b.type === 'badges') images += b.items.length;
      if (b.type === 'divider') images++;
      if (b.type === 'details') visit(b.blocks);
    }
  };
  visit(spec.blocks);
  const out: string[] = [];
  if (images > 8) out.push(`${images} images: READMEs load faster with 8 or fewer - consider a composite card or fewer badges.`);
  if (animated > 1) out.push(`${animated} animated cards: one moving element is usually enough (and kinder to readers who prefer less motion).`);
  return out;
}

export function renderReadme(spec: ReadmeSpec, origin: string): Rendered {
  spec = { ...spec, version: shortHash(JSON.stringify({ ...spec, version: undefined })) };
  const parts = spec.blocks.map((b) => renderBlock(b, spec, origin)).filter((p) => p.md.trim());
  if (spec.footer) parts.push(both(`<p align="center"><sub>Generated with <a href="${attr(origin)}">GitPulse</a></sub></p>`));
  return {
    markdown: `${parts.map((p) => p.md).join('\n\n')}\n`,
    html: `<div class="markdown-body">${parts.map((p) => p.html).join('\n')}</div>`,
    warnings: audit(spec)
  };
}
