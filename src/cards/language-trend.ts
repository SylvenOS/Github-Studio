import { defineCard } from './types';
import { bool, int, list, oneOf } from '../core/params';
import { esc, truncate } from '../core/text';
import type { YearLanguages } from '../github/client';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, PAD } from '../svg/frame';

const LAYOUTS = ['stream', 'bars', 'lines'] as const;
const MODES = ['share', 'absolute'] as const;

interface Params {
  years: number;
  count: number;
  layout: (typeof LAYOUTS)[number];
  exclude: string[];
  mode: (typeof MODES)[number];
  smooth: boolean;
  height: number;
  legend: boolean;
  values: boolean;
}

interface Data {
  years: YearLanguages[];
  /** What was counted: commit contributions (token) or repositories created per year (no token). */
  basis: 'commits' | 'repos';
}

export const languageTrendCard = defineCard<Params, Data>({
  id: 'language-trend',
  aliases: ['lang-trend', 'languages-over-time'],
  category: 'languages',
  tags: ['languages', 'trend', 'history', 'evolution', 'years', 'stack', 'chart'],
  variants: [{ label: 'Stream' }, { label: 'Stacked bars', params: { layout: 'bars' } }, { label: 'Lines', params: { layout: 'lines' } }, { label: 'Absolute volume', params: { mode: 'absolute' } }, { label: 'Angular stream', params: { smooth: 'false' } }, { label: 'Bars with values', params: { layout: 'bars', values: 'true' } }, { label: 'Tall, no legend', params: { height: '260', legend: 'false' } }],
  title: 'Language Trend',
  description: 'How your languages changed year by year: share of commit contributions by the repository’s primary language. Without a server token it uses the languages of the repositories you created each year (labelled on the card).',
  cacheSeconds: 12 * 3600,
  params: [
    { name: 'years', type: 'number', default: 5, min: 2, max: 10, description: 'How many recent years' },
    { name: 'count', type: 'number', default: 6, min: 2, max: 8, description: 'Languages shown (the rest become Other)' },
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'stream', description: 'Chart type' },
    { name: 'exclude', type: 'list', description: 'Languages to leave out, e.g. HTML,CSS' },
    { name: 'mode', type: 'enum', options: [...MODES], default: 'share', description: 'share = each year fills the chart; absolute = taller when you committed more' },
    { name: 'smooth', type: 'boolean', default: true, description: 'Curved edges in the stream layout' },
    { name: 'height', type: 'number', default: 170, min: 90, max: 320, step: 10, description: 'Chart height' },
    { name: 'legend', type: 'boolean', default: true, description: 'Show the language legend' },
    { name: 'values', type: 'boolean', default: false, description: 'Print the share inside the bars (bars layout)' }
  ],
  parse: (q) => ({ years: int(q.years, 5, 2, 10), count: int(q.count, 6, 2, 8), layout: oneOf(q.layout, LAYOUTS, 'stream'), exclude: list(q.exclude).map((s) => s.toLowerCase()), mode: oneOf(q.mode, MODES, 'share'), smooth: bool(q.smooth, true), height: int(q.height, 170, 90, 320), legend: bool(q.legend, true), values: bool(q.values, false) }),

  async load(client, p, common) {
    if (!client.hasToken) {
      // token-less fallback: primary languages of the repositories created each year
      const user = await client.getUser(common.username);
      const now = new Date().getUTCFullYear();
      const years = Array.from({ length: p.years }, (_, i) => now - p.years + 1 + i);
      return {
        basis: 'repos',
        years: years.map((year) => {
          const byLang = new Map<string, { name: string; color: string | null; count: number }>();
          for (const r of user.repos) {
            // older cached repo lists have no createdAt; the last push year is the next best signal
            const when = r.createdAt === undefined ? r.pushedAt : r.createdAt;
            if (!r.language || !when?.startsWith(String(year))) continue;
            const cur = byLang.get(r.language) ?? { name: r.language, color: r.languageColor, count: 0 };
            cur.count++;
            byLang.set(r.language, cur);
          }
          const languages = [...byLang.values()].sort((a, b) => b.count - a.count);
          return { year, languages, total: languages.reduce((a, l) => a + l.count, 0) };
        })
      };
    }
    const ext = await client.getUserExtended(common.username);
    const now = new Date().getUTCFullYear();
    let years = ext.contributionYears.length ? [...ext.contributionYears].sort((a, b) => b - a).slice(0, p.years) : [];
    if (!years.length) years = Array.from({ length: p.years }, (_, i) => now - i);
    return { basis: 'commits', years: await client.getLanguageTrend(common.username, years) };
  },
  toJSON: (d) => ({ basis: d.basis, years: d.years }),

  render(d, p, { theme, common, title }) {
    const header = title('Language Trend');
    const top = contentTop(!!header);
    const W = 560;
    const animate = common.animation;
    let years = d.years.map((y) => ({ ...y, languages: y.languages.filter((l) => !p.exclude.includes(l.name.toLowerCase())) }));
    // empty years at the edges would collapse the chart to zero; keep the span that has data
    const has = (y: (typeof years)[number]) => y.languages.some((l) => l.count > 0);
    while (years.length > 1 && !has(years[0])) years = years.slice(1);
    while (years.length > 1 && !has(years[years.length - 1])) years = years.slice(0, -1);

    // top languages across all years
    const totals = new Map<string, { name: string; color: string | null; count: number }>();
    for (const y of years) for (const l of y.languages) {
      const cur = totals.get(l.name) ?? { ...l, count: 0 };
      cur.count += l.count;
      totals.set(l.name, cur);
    }
    const top_ = [...totals.values()].sort((a, b) => b.count - a.count).slice(0, p.count);
    const hasOther = [...totals.values()].length > top_.length;
    const keys = [...top_.map((l) => l.name), ...(hasOther ? ['Other'] : [])];
    const color = (k: string) => (k === 'Other' ? '#8b949e' : languageColor(k, totals.get(k)?.color));
    const maxSum = Math.max(1, ...years.map((y) => y.languages.reduce((a, l) => a + l.count, 0)));
    const share = years.map((y) => {
      const sum = y.languages.reduce((a, l) => a + l.count, 0);
      const row: Record<string, number> = {};
      for (const k of keys) row[k] = 0;
      for (const l of y.languages) row[keys.includes(l.name) ? l.name : 'Other'] += l.count;
      for (const k of keys) row[k] = sum ? row[k] / (p.mode === 'absolute' ? maxSum : sum) : 0;
      return { year: y.year, sum, row };
    });

    const legendRows = Math.ceil(keys.length / 4);
    const chart = { x: PAD, y: top + 8, w: W - PAD * 2, h: p.height };
    const n = share.length;
    const xAt = (i: number) => (n === 1 ? chart.x + chart.w / 2 : chart.x + (i / (n - 1)) * chart.w);
    let body = '';

    if (!share.some((s) => s.sum)) {
      body += `<text x="${PAD}" y="${top + 30}" class="label muted" font-size="12.5">${d.basis === 'repos' ? 'No public repositories with a language were created in these years.' : 'No public commit contributions with a detectable language in these years.'}</text>`;
      return frame(body, { width: W, height: top + 50, theme, title: header, label: 'Language trend: no data' });
    }

    if (p.layout === 'bars') {
      const step = chart.w / n;
      const bw = Math.min(56, step * 0.6);
      share.forEach((s, i) => {
        let y = chart.y + chart.h;
        const x = chart.x + i * step + (step - bw) / 2;
        keys.forEach((k) => {
          const h = s.row[k] * chart.h;
          if (h <= 0) return;
          y -= h;
          body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${esc(color(k))}"${anim(animate, i)}><title>${esc(`${k} ${Math.round(s.row[k] * 100)}% (${s.year})`)}</title></rect>${p.values && h > 16 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y + h / 2 + 4).toFixed(1)}" font-size="10" font-weight="600" text-anchor="middle" fill="#fff" fill-opacity=".92">${Math.round(s.row[k] * 100)}</text>` : ''}`;
        });
        body += `<text x="${(x + bw / 2).toFixed(1)}" y="${chart.y + chart.h + 16}" class="label muted" font-size="11" text-anchor="middle">${s.year}</text>`;
      });
    } else if (p.layout === 'lines') {
      for (const f of [0, 0.25, 0.5, 0.75, 1]) {
        const y = chart.y + chart.h - f * chart.h;
        body += `<line x1="${chart.x}" y1="${y}" x2="${chart.x + chart.w}" y2="${y}" class="sk-bd" stroke-dasharray="3 4"/>`;
      }
      keys.forEach((k) => {
        const pts = share.map((s, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)} ${(chart.y + chart.h - s.row[k] * chart.h).toFixed(1)}`).join(' ');
        body += `<path d="${pts}" fill="none" stroke="${esc(color(k))}" stroke-width="2.2" stroke-linejoin="round"/>`;
        body += share.map((s, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${(chart.y + chart.h - s.row[k] * chart.h).toFixed(1)}" r="2.6" fill="${esc(color(k))}"/>`).join('');
      });
      share.forEach((s, i) => (body += `<text x="${xAt(i).toFixed(1)}" y="${chart.y + chart.h + 16}" class="label muted" font-size="11" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${s.year}</text>`));
    } else {
      // stream: stacked areas with smooth edges
      const base = share.map(() => 0);
      keys.forEach((k, ki) => {
        const lower = share.map((_, i) => base[i]);
        const upper = share.map((s, i) => (base[i] += s.row[k]));
        const yOf = (v: number) => chart.y + chart.h - v * chart.h;
        const curve = (vals: number[], rev = false) => {
          const idx = vals.map((_, i) => i);
          if (rev) idx.reverse();
          return idx
            .map((i, j) => {
              const x = xAt(i);
              const y = yOf(vals[i]);
              if (j === 0) return `${rev ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
              const pi = idx[j - 1];
              const mx = (xAt(pi) + x) / 2;
              return p.smooth ? `C${mx.toFixed(1)} ${yOf(vals[pi]).toFixed(1)} ${mx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ');
        };
        body += `<path d="${curve(upper)} ${curve(lower, true)} Z" fill="${esc(color(k))}" fill-opacity=".88"${anim(animate, ki)}/>`;
      });
      share.forEach((s, i) => (body += `<text x="${xAt(i).toFixed(1)}" y="${chart.y + chart.h + 16}" class="label muted" font-size="11" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${s.year}</text>`));
    }

    // legend
    const ly = chart.y + chart.h + 38;
    if (!p.legend) {
      return frame(body, { width: W, height: chart.y + chart.h + 32, theme, title: header, subtitle: `${d.basis === 'repos' ? 'repos created · ' : ''}${share[0].year}-${share[share.length - 1].year}`, label: `Language trend of ${common.username}` });
    }
    const colW = (W - PAD * 2) / 4;
    keys.forEach((k, i) => {
      const x = PAD + (i % 4) * colW;
      const y = ly + Math.floor(i / 4) * 20;
      const last = share[share.length - 1];
      body += `<rect x="${x}" y="${y - 9}" width="10" height="10" rx="2" fill="${esc(color(k))}"/><text x="${x + 15}" y="${y}" class="fg" font-size="11.5">${esc(truncate(k, 13))} <tspan class="muted">${Math.round(last.row[k] * 100)}%</tspan></text>`;
    });

    const lead = top_[0]?.name ?? 'unknown';
    return frame(body, {
      width: W,
      height: ly + legendRows * 20 + 4,
      theme,
      title: header,
      subtitle: `${d.basis === 'repos' ? 'repos created · ' : ''}${share[0].year}-${share[share.length - 1].year}`,
      label: `Language trend of ${common.username}, ${share[0].year} to ${share[share.length - 1].year}; most used overall: ${lead}`
    });
  }
});
