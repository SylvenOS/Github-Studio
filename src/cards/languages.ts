import { defineCard } from './types';
import { bool, int, list, oneOf } from '../core/params';
import { esc, truncate } from '../core/text';
import { luminance } from '../designs/model';
import type { LanguageStat } from '../github/client';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, messageCard, PAD } from '../svg/frame';

const LAYOUTS = ['bar', 'donut', 'pie', 'bars', 'chips', 'treemap'] as const;
const BY = ['size', 'repos'] as const;

interface Params {
  layout: (typeof LAYOUTS)[number];
  count: number;
  hide: string[];
  by: (typeof BY)[number];
  decimals: number;
  percentages: boolean;
  centerLabel: boolean;
}

export interface LanguageShare {
  name: string;
  color: string;
  percent: number;
}

/** Top-N languages with percentages that add up to 100% of what is shown. */
export function languageShares(langs: LanguageStat[], p: Pick<Params, 'count' | 'hide' | 'by'>): LanguageShare[] {
  const hidden = new Set(p.hide.map((h) => h.toLowerCase()));
  const weight = (l: LanguageStat) => (p.by === 'repos' || !langs.some((x) => x.size > 0) ? l.repos || l.size : l.size);
  const top = langs
    .filter((l) => !hidden.has(l.name.toLowerCase()) && weight(l) > 0)
    .sort((a, b) => weight(b) - weight(a))
    .slice(0, p.count);
  const total = top.reduce((a, l) => a + weight(l), 0);
  return top.map((l) => ({ name: l.name, color: languageColor(l.name, l.color), percent: (weight(l) / total) * 100 }));
}

export const languagesCard = defineCard<Params, LanguageStat[]>({
  id: 'languages',
  category: 'languages',
  tags: ['tech', 'stack', 'code'],
  variants: [
    { label: 'Bar' },
    { label: 'Donut', params: { layout: 'donut' } },
    { label: 'Top 8', params: { langs_count: '8' } },
    { label: 'By repositories', params: { by: 'repos' } },
    { label: 'Pie', params: { layout: 'pie' } },
    { label: 'Progress bars', params: { layout: 'bars' } },
    { label: 'Chips', params: { layout: 'chips' } },
    { label: 'Treemap', params: { layout: 'treemap', langs_count: '8' } }
  ],
  aliases: ['langs', 'top-langs'],
  title: 'Top Languages',
  description: 'Most used languages across public, non-fork repositories.',
  params: [
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'bar', description: 'Chart style' },
    { name: 'langs_count', type: 'number', default: 5, min: 1, max: 10, description: 'Number of languages' },
    { name: 'hide', type: 'list', description: 'Languages to hide, e.g. HTML,CSS' },
    { name: 'by', type: 'enum', options: [...BY], default: 'size', description: 'Rank by bytes of code or by repository count' },
    { name: 'decimals', type: 'number', default: 1, min: 0, max: 2, description: 'Decimals in percentages' },
    { name: 'percentages', type: 'boolean', default: true, description: 'Show percentages' },
    { name: 'center_label', type: 'boolean', default: true, description: 'Top language in the middle of the donut' }
  ],
  parse: (q) => ({
    layout: oneOf(q.layout, LAYOUTS, 'bar'),
    count: int(q.langs_count, 5, 1, 10),
    hide: list(q.hide),
    by: oneOf(q.by, BY, 'size'),
    decimals: int(q.decimals, 1, 0, 2),
    percentages: bool(q.percentages, true),
    centerLabel: bool(q.center_label, true)
  }),
  load: async (client, _p, common) => (await client.getUser(common.username)).languages,
  toJSON: (langs, p) => languageShares(langs, p),

  render(langs, p, { theme, common, title, t }) {
    const header = title(t('title.languages'));
    const palette = theme.style?.chartColors;
    const shares = languageShares(langs, p).map((s, i) => (palette ? { ...s, color: palette[i % palette.length] } : s));
    const pct = (v: number) => (p.percentages ? `${v.toFixed(p.decimals)}%` : '');
    const subtitle = `@${common.username}`;
    if (!shares.length) return messageCard('No language data available.', theme, { title: header ?? 'Top Languages', tone: 'info' });

    const top = contentTop(!!header);
    const animate = common.animation;
    const width = 440;
    const label = `Top languages: ${shares.map((s) => `${s.name} ${s.percent.toFixed(1)}%`).join(', ')}`;

    if (p.layout === 'donut' || p.layout === 'pie') {
      const r = p.layout === 'pie' ? 30 : 50;
      const C = 2 * Math.PI * r;
      const cx = PAD + 65;
      const cy = top + 65;
      let offset = 0;
      const arcs = shares
        .map((s, i) => {
          const len = (s.percent / 100) * C;
          const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${esc(s.color)}" stroke-width="${p.layout === 'pie' ? 60 : 18}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"${anim(animate, i)}/>`;
          offset += len;
          return seg;
        })
        .join('');
      const centre = p.layout === 'donut' && p.centerLabel
        ? `<text x="${cx}" y="${cy + 2}" class="fg" font-size="18" font-weight="800" text-anchor="middle">${esc(p.percentages ? `${Math.round(shares[0].percent)}%` : '')}</text><text x="${cx}" y="${cy + (p.percentages ? 18 : 5)}" class="muted" font-size="10.5" text-anchor="middle">${esc(truncate(shares[0].name, 12))}</text>`
        : '';
      const legend = shares
        .map(
          (s, i) =>
            `<g transform="translate(200 ${top + 12 + i * 26})"><circle cx="6" cy="-4" r="5" fill="${esc(s.color)}"/>` +
            `<text x="20" y="0" class="fg" font-size="13" font-weight="600">${esc(s.name)}</text>` +
            `<text x="215" y="0" class="label muted" text-anchor="end">${pct(s.percent)}</text></g>`
        )
        .join('');
      const height = top + Math.max(140, shares.length * 26 + 10) + 10;
      return frame(arcs + centre + legend, { width, height, theme, title: header, subtitle, label });
    }

    if (p.layout === 'bars') {
      const max = Math.max(...shares.map((s) => s.percent));
      const rows = shares
        .map((s, i) => {
          const y = top + 10 + i * 36;
          const w = Math.max(4, (s.percent / max) * (width - PAD * 2));
          return (
            `<g${anim(animate, i)}><circle cx="${PAD + 5}" cy="${y - 4}" r="5" fill="${esc(s.color)}"/>` +
            `<text x="${PAD + 16}" y="${y}" class="fg" font-size="13" font-weight="600">${esc(s.name)}</text>` +
            `<text x="${width - PAD}" y="${y}" class="label muted" text-anchor="end">${pct(s.percent)}</text>` +
            `<rect x="${PAD}" y="${y + 8}" width="${width - PAD * 2}" height="8" rx="4" class="bd"/>` +
            `<rect x="${PAD}" y="${y + 8}" width="${w.toFixed(1)}" height="8" rx="4" fill="${esc(s.color)}"/></g>`
          );
        })
        .join('');
      return frame(rows, { width, height: top + shares.length * 36 + 14, theme, title: header, subtitle, label });
    }

    if (p.layout === 'treemap') {
      const W = width - PAD * 2;
      const H = 150;
      const cells: string[] = [];
      // recursive halving along the longer side: simple and readable for up to 10 items
      const place = (items: typeof shares, x: number, y: number, w: number, h: number) => {
        if (!items.length) return;
        if (items.length === 1) {
          const it = items[0];
          const i = shares.indexOf(it);
          const big = w > 70 && h > 34;
          // readable text on any tile colour
          const ink = /^#[0-9a-f]{3,8}$/i.test(it.color) && luminance(it.color) > 0.45 ? '#1b1f24' : '#ffffff';
          cells.push(
            `<g${anim(animate, i)}><rect x="${(x + 1.5).toFixed(1)}" y="${(y + 1.5).toFixed(1)}" width="${Math.max(0, w - 3).toFixed(1)}" height="${Math.max(0, h - 3).toFixed(1)}" rx="6" fill="${esc(it.color)}"/>` +
              (big ? `<text x="${(x + 10).toFixed(1)}" y="${(y + 22).toFixed(1)}" font-size="12.5" font-weight="700" fill="${ink}">${esc(truncate(it.name, Math.max(3, Math.floor(w / 8))))}</text>` : '') +
              (big && h > 50 && p.percentages ? `<text x="${(x + 10).toFixed(1)}" y="${(y + 38).toFixed(1)}" font-size="11" fill="${ink}" fill-opacity=".85">${pct(it.percent)}</text>` : '') +
              `<title>${esc(`${it.name} ${it.percent.toFixed(1)}%`)}</title></g>`
          );
          return;
        }
        const total = items.reduce((a, it) => a + it.percent, 0);
        let acc = 0;
        let cut = 1;
        for (; cut < items.length; cut++) {
          acc += items[cut - 1].percent;
          if (acc >= total / 2) break;
        }
        const a = items.slice(0, cut);
        const b = items.slice(cut);
        const fa = a.reduce((s2, it) => s2 + it.percent, 0) / total;
        if (w >= h) {
          place(a, x, y, w * fa, h);
          place(b, x + w * fa, y, w * (1 - fa), h);
        } else {
          place(a, x, y, w, h * fa);
          place(b, x, y + h * fa, w, h * (1 - fa));
        }
      };
      place(shares, PAD, top + 4, W, H);
      return frame(cells.join(''), { width, height: top + H + PAD + 4, theme, title: header, subtitle, label });
    }

    if (p.layout === 'chips') {
      let x = PAD;
      let y = top + 6;
      const chips = shares
        .map((s, i) => {
          const text = `${s.name} ${pct(s.percent)}`;
          const w = Math.round(Array.from(text).length * 7.2 + 32);
          if (x + w > width - PAD) {
            x = PAD;
            y += 34;
          }
          const chip =
            `<g transform="translate(${x} ${y})"${anim(animate, i)}><rect width="${w}" height="26" rx="13" class="bd" fill-opacity=".6"/>` +
            `<circle cx="15" cy="13" r="5" fill="${esc(s.color)}"/><text x="26" y="17.5" class="fg" font-size="12" font-weight="600">${esc(text)}</text></g>`;
          x += w + 8;
          return chip;
        })
        .join('');
      return frame(chips, { width, height: y + 26 + PAD, theme, title: header, subtitle, label });
    }

    const barW = 360;
    const barY = top + 15;
    let x = 0;
    const segments = shares
      .map((s) => {
        const w = (s.percent / 100) * barW;
        const seg = `<rect x="${x.toFixed(2)}" width="${w.toFixed(2)}" height="12" fill="${esc(s.color)}"/>`;
        x += w;
        return seg;
      })
      .join('');
    const legend = shares
      .map((s, i) => {
        const gx = (i % 2) * 180;
        const gy = Math.floor(i / 2) * 30;
        return (
          `<g transform="translate(${gx} ${gy})"${anim(animate, i)}><circle cx="6" cy="6" r="6" fill="${esc(s.color)}"/>` +
          `<text x="20" y="10" class="fg" font-size="13" font-weight="600">${esc(s.name)}</text>` +
          `<text x="140" y="10" class="label muted" text-anchor="end">${pct(s.percent)}</text></g>`
        );
      })
      .join('');
    const legendY = barY + 40;
    const body =
      `<g transform="translate(40 ${barY})"><clipPath id="bar"><rect width="${barW}" height="12" rx="6"/></clipPath><g clip-path="url(#bar)">${segments}</g></g>` +
      `<g transform="translate(40 ${legendY})">${legend}</g>`;
    return frame(body, {
      width,
      height: legendY + Math.ceil(shares.length / 2) * 30 + 5,
      theme,
      title: header,
      subtitle,
      label
    });
  }
});
