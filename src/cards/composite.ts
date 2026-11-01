import { defineCard, type CardDefinition } from './types';
import { findCard } from './index';
import { badRequest, toApiError } from '../core/errors';
import { translator } from '../core/i18n';
import { int, list, parseCommon, type CommonParams, type Query } from '../core/params';
import { esc } from '../core/text';
import { messageCard } from '../svg/frame';
import { resolveTheme } from '../themes';

interface Params {
  ids: string[];
  columns: number;
  gap: number;
  align: 'top' | 'center';
  query: Query;
}

interface Part {
  id: string;
  query: Query;
  data?: unknown;
  error?: string;
}

const MAX_PARTS = 4;

/** The query a sub-card sees: shared params, plus `<card>.<param>` overrides for that card. */
function subQuery(id: string, aliases: string[], q: Query): Query {
  const out: Query = {};
  for (const [k, v] of Object.entries(q)) if (!k.includes('.')) out[k] = v;
  for (const name of [id, ...aliases]) {
    for (const [k, v] of Object.entries(q)) if (k.startsWith(`${name}.`)) out[k.slice(name.length + 1)] = v;
  }
  return out;
}

const sizeOf = (svg: string) => {
  const m = /<svg[^>]*?\swidth="([\d.]+)"[^>]*?\sheight="([\d.]+)"/.exec(svg);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 480, h: 200 };
};

/** Makes ids and the theme variables of an embedded card local to it, so cards don't clash. */
function scope(svg: string, n: number): string {
  const p = `c${n}-`;
  return svg
    .replace(/<svg /, `<svg id="c${n}" `)
    .replace(/\sid="(?!c\d+")([^"]+)"/g, ` id="${p}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${p}$1"`)
    .replace(/:root\{/g, `#c${n}{`);
}

export const compositeCard = defineCard<Params, Part[]>({
  id: 'composite',
  aliases: ['combo', 'dashboard', 'bundle'],
  category: 'utility',
  tags: ['combine', 'grid', 'dashboard', 'one image', 'layout', 'side by side'],
  variants: [
    { label: 'Stats + languages', params: { cards: 'stats,languages' } },
    { label: 'Streak + patterns', params: { cards: 'streak,patterns' } },
    { label: 'Four-up dashboard', params: { cards: 'stats,languages,streak,activity' } },
    { label: 'Stacked', params: { cards: 'profile-card,impact', columns: '1' } }
  ],
  extraParam: (name) => /^[a-z-]{2,20}\.[a-z_]{1,30}$/.test(name),
  title: 'Composite',
  description: 'Several cards in one image (fewer images = faster README). Customise one card with prefixed params, e.g. stats.layout=compact.',
  params: [
    { name: 'cards', type: 'list', default: 'stats,languages', description: `Up to ${MAX_PARTS} card ids, e.g. stats,languages,streak` },
    { name: 'columns', type: 'number', default: 2, min: 1, max: 4, description: 'Cards per row' },
    { name: 'gap', type: 'number', default: 12, min: 0, max: 48, description: 'Space between cards' },
    { name: 'valign', type: 'enum', options: ['top', 'center'], default: 'top', description: 'Vertical alignment within a row' }
  ],
  parse: (q) => {
    const ids = list(q.cards ?? 'stats,languages').slice(0, MAX_PARTS);
    for (const id of ids) {
      const def = findCard(id);
      if (!def) throw badRequest(`Unknown card "${id}" in cards=`);
      if (def.id === 'composite') throw badRequest('A composite card cannot contain itself');
    }
    return { ids, columns: int(q.columns, 2, 1, 4), gap: int(q.gap, 12, 0, 48), align: q.valign === 'center' ? 'center' : 'top', query: q };
  },
  users: (p) => p.ids.flatMap((id) => (findCard(id)?.id === 'compare' && p.query['compare.vs'] ? [p.query['compare.vs']] : [])),

  // sub-cards load in parallel through the shared client, so one GitHub query serves all of them
  async load(client, p) {
    return Promise.all(
      p.ids.map(async (id): Promise<Part> => {
        const def = findCard(id) as CardDefinition;
        const q = subQuery(def.id, def.aliases ?? [], p.query);
        try {
          const common = parseCommon(q, def.needsUser !== false);
          const params = def.parse(q, common);
          return { id: def.id, query: q, data: await def.load(client, params, common) };
        } catch (e) {
          return { id: def.id, query: q, error: toApiError(e).message };
        }
      })
    );
  },
  toJSON: (parts) => parts.map((x) => ({ card: x.id, error: x.error, data: x.data })),

  render(parts, p, { theme }) {
    const rendered = parts.map((part, i) => {
      const def = findCard(part.id) as CardDefinition;
      let svg: string;
      try {
        if (part.error) throw new Error(part.error);
        const common: CommonParams = parseCommon(part.query, def.needsUser !== false);
        const subTheme = resolveTheme(common.theme, common.colors, { radius: common.radius, font: common.font, hideBorder: common.hideBorder, gradient: common.gradient, style: common.style });
        svg = def.render(part.data, def.parse(part.query, common), {
          theme: subTheme,
          common,
          title: (fallback) => (common.hideTitle ? undefined : common.title ?? fallback),
          t: translator(common.locale)
        });
      } catch (e) {
        svg = messageCard(e instanceof Error ? e.message : 'Could not render this card', theme, { title: def.title });
      }
      return { svg: scope(svg, i), ...sizeOf(svg) };
    });

    // grid layout: column widths and row heights from the cards themselves
    const cols = Math.min(p.columns, rendered.length);
    const colW = Array.from({ length: cols }, (_, c) => Math.max(...rendered.filter((_, i) => i % cols === c).map((r) => r.w)));
    const rows = Math.ceil(rendered.length / cols);
    const rowH = Array.from({ length: rows }, (_, r) => Math.max(...rendered.slice(r * cols, r * cols + cols).map((x) => x.h)));
    const width = colW.reduce((a, w) => a + w, 0) + p.gap * (cols - 1);
    const height = rowH.reduce((a, h) => a + h, 0) + p.gap * (rows - 1);

    const body = rendered
      .map((r, i) => {
        const c = i % cols;
        const row = Math.floor(i / cols);
        const x = colW.slice(0, c).reduce((a, w) => a + w, 0) + p.gap * c;
        const y = rowH.slice(0, row).reduce((a, h) => a + h, 0) + p.gap * row + (p.align === 'center' ? (rowH[row] - r.h) / 2 : 0);
        return r.svg.replace(/<svg /, `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" `);
      })
      .join('');

    const label = `GitHub cards: ${parts.map((x) => findCard(x.id)?.title ?? x.id).join(', ')}`;
    return `<svg width="${Math.round(width)}" height="${Math.round(height)}" viewBox="0 0 ${Math.round(width)} ${Math.round(height)}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}">${body}</svg>`;
  }
});
