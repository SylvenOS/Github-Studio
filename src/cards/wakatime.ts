import { defineCard } from './types';
import { cached } from '../core/cache';
import { badRequest, notFound, upstream } from '../core/errors';
import { bool, int, oneOf } from '../core/params';
import { esc, truncate } from '../core/text';
import { safeJson } from '../providers/fetch';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, PAD } from '../svg/frame';

const RANGES = ['auto', 'last_7_days', 'last_30_days', 'last_6_months', 'last_year', 'all_time'] as const;
const SECTIONS = ['languages', 'editors', 'operating_systems', 'categories', 'projects'] as const;
const LAYOUTS = ['bars', 'compact', 'totals', 'donut'] as const;
const RANGE_LABEL: Record<string, string> = {
  auto: 'public range', last_7_days: 'last 7 days', last_30_days: 'last 30 days', last_6_months: 'last 6 months', last_year: 'last year', all_time: 'all time'
};
const PALETTE = ['#58a6ff', '#a371f7', '#3fb950', '#f78166', '#d29922', '#db61a2', '#39c5cf', '#8b949e'];

interface Item { name: string; percent: number; text: string }
interface Data {
  username: string;
  total: string | null;
  dailyAverage: string | null;
  bestDay: { date: string; text: string } | null;
  items: Item[];
  pending: boolean;
  /** The range WakaTime actually returned (a profile only shares one public range). */
  range: string;
  /** The requested range wasn't public, so the profile's own range is shown. */
  fellBack: boolean;
}

interface Params {
  range: (typeof RANGES)[number];
  section: (typeof SECTIONS)[number];
  layout: (typeof LAYOUTS)[number];
  count: number;
  percent: boolean;
}

export const wakatimeCard = defineCard<Params, Data>({
  id: 'wakatime',
  aliases: ['coding-time', 'waka'],
  category: 'integrations',
  tags: ['wakatime', 'coding time', 'hours', 'editor', 'ide', 'languages', 'productivity', 'integration'],
  variants: [
    { label: 'Languages' },
    { label: 'Editors', params: { section: 'editors' } },
    { label: 'Compact bar', params: { layout: 'compact' } },
    { label: 'Totals only', params: { layout: 'totals' } },
    { label: 'Donut', params: { layout: 'donut', count: '5' } },
    { label: 'Projects', params: { section: 'projects', layout: 'donut' } },
    { label: 'Percentages', params: { percent: 'true' } }
  ],
  title: 'WakaTime Coding Time',
  description: 'Coding time from WakaTime: total, daily average, best day and a breakdown by language, editor, OS, category or project. `username` is your WakaTime username; your stats must be public on wakatime.com.',
  cacheSeconds: 3600,
  params: [
    { name: 'range', type: 'enum', options: [...RANGES], default: 'auto', description: 'Time range (auto = the range your WakaTime profile shares publicly)' },
    { name: 'section', type: 'enum', options: [...SECTIONS], default: 'languages', description: 'Breakdown to show' },
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'bars', description: 'Presentation' },
    { name: 'count', type: 'number', default: 6, min: 1, max: 10, description: 'Rows in the breakdown' },
    { name: 'percent', type: 'boolean', default: false, description: 'Show percentages instead of hours' }
  ],
  parse: (q) => ({
    range: oneOf(q.range, RANGES, 'auto'),
    section: oneOf(q.section, SECTIONS, 'languages'),
    layout: oneOf(q.layout, LAYOUTS, 'bars'),
    count: int(q.count, 6, 1, 10),
    percent: bool(q.percent, false)
  }),

  async load(_client, p, common, { waitUntil }) {
    const user = common.username;
    const get = (range: string) =>
      safeJson<{ data?: any; error?: string }>(
        `https://wakatime.com/api/v1/users/${encodeURIComponent(user)}/stats${range === 'auto' ? '' : `/${range}`}`,
        { hosts: ['wakatime.com'], name: 'WakaTime', maxBytes: 1_000_000 }
      ).catch((e) => {
        if (e?.code === 'not_found') throw notFound('No public WakaTime profile with this username');
        throw e;
      });
    const { raw, fellBack } = await cached(`waka2:${user.toLowerCase()}:${p.range}`, { ttl: 3600, waitUntil }, async () => {
      let res = await get(p.range);
      let fellBack = false;
      // a profile shares exactly one public range; asking for another returns 400 - show the public one instead
      if (res.status === 400 && p.range !== 'auto') {
        res = await get('auto');
        fellBack = true;
      }
      if (res.status === 403 || res.status === 401) throw badRequest('This WakaTime profile is private. Make your stats public on wakatime.com');
      if (res.status >= 400 || !res.data.data) throw upstream(res.data.error ? `WakaTime: ${String(res.data.error).slice(0, 80)}` : `WakaTime responded with ${res.status}`);
      return { raw: res.data.data, fellBack };
    });
    const list = (raw[p.section] ?? []) as any[];
    return {
      username: raw.username ?? user,
      total: raw.human_readable_total_including_other_language ?? raw.human_readable_total ?? null,
      dailyAverage: raw.human_readable_daily_average_including_other_language ?? raw.human_readable_daily_average ?? null,
      bestDay: raw.best_day?.date ? { date: raw.best_day.date, text: raw.best_day.text ?? '' } : null,
      items: list.filter((x) => x && x.name).map((x) => ({ name: String(x.name), percent: Number(x.percent) || 0, text: String(x.text ?? '') })),
      pending: raw.is_up_to_date === false || raw.status === 'pending_update',
      range: String(raw.range ?? p.range),
      fellBack
    };
  },

  render(d, p, { theme, common, title }) {
    const header = title('Coding Time');
    const top = contentTop(!!header);
    const W = 480;
    const animate = common.animation;
    const items = d.items.slice(0, p.count);
    const color = (it: Item, i: number) => (p.section === 'languages' ? languageColor(it.name) : PALETTE[i % PALETTE.length]);
    const sub = `WakaTime · ${RANGE_LABEL[d.range] ?? d.range.replace(/_/g, ' ')}`;

    // totals strip
    const totals = [
      ['Total', d.total ?? '-'],
      ['Daily average', d.dailyAverage ?? '-'],
      ['Best day', d.bestDay ? d.bestDay.text : '-']
    ];
    const colW = (W - PAD * 2) / 3;
    let body = totals
      .map(([k, v], i) => `<g${anim(animate, i)}><text x="${PAD + i * colW}" y="${top + 16}" class="value fg">${esc(truncate(v, 18))}</text><text x="${PAD + i * colW}" y="${top + 34}" class="label muted">${esc(k)}</text></g>`)
      .join('');
    let y = top + 52;
    if (d.pending) {
      body += `<text x="${PAD}" y="${y + 10}" class="label muted" font-size="11">WakaTime is still calculating these stats; numbers may change.</text>`;
      y += 22;
    }

    if (p.layout === 'donut' && items.length) {
      const r = 48;
      const C = 2 * Math.PI * r;
      const cx = PAD + 62;
      const cy = y + 70;
      const sum = items.reduce((a, it) => a + it.percent, 0) || 1;
      let off = 0;
      items.forEach((it, i) => {
        const len = (it.percent / sum) * C;
        body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${esc(color(it, i))}" stroke-width="18" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"${anim(animate, i + 3)}/>`;
        off += len;
      });
      body += `<text x="${cx}" y="${cy + 4}" class="fg" font-size="10.5" font-weight="800" text-anchor="middle">${esc(truncate((d.total ?? '-').replace(/ hrs?/, 'h').replace(/ mins?/, 'm'), 14))}</text><text x="${cx}" y="${cy + 19}" class="muted" font-size="9.5" text-anchor="middle">total</text>`;
      items.forEach((it, i) => {
        const ly = y + 24 + i * 24;
        body += `<g${anim(animate, i + 3)}><circle cx="${PAD + 150}" cy="${ly - 4}" r="5" fill="${esc(color(it, i))}"/><text x="${PAD + 162}" y="${ly}" class="fg" font-size="12.5">${esc(truncate(it.name, 16))}</text><text x="${W - PAD}" y="${ly}" class="muted" font-size="12" text-anchor="end">${esc(p.percent ? `${it.percent.toFixed(1)}%` : truncate(it.text, 14))}</text></g>`;
      });
      y += Math.max(150, items.length * 24 + 30);
    } else if (p.layout !== 'totals') {
      if (!items.length) {
        body += `<text x="${PAD}" y="${y + 18}" class="label muted" font-size="12">No public ${p.section.replace('_', ' ')} data for this range.</text>`;
        y += 30;
      } else if (p.layout === 'compact') {
        let x = PAD;
        const bw = W - PAD * 2;
        const sum = items.reduce((a, it) => a + it.percent, 0) || 1;
        body += `<clipPath id="wk"><rect x="${PAD}" y="${y}" width="${bw}" height="10" rx="5"/></clipPath><g clip-path="url(#wk)">`;
        items.forEach((it, i) => {
          const w = (it.percent / sum) * bw;
          body += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="10" fill="${esc(color(it, i))}"/>`;
          x += w;
        });
        body += '</g>';
        y += 30;
        items.forEach((it, i) => {
          const cx = PAD + (i % 2) * ((W - PAD * 2) / 2);
          const cy = y + Math.floor(i / 2) * 22;
          body += `<g${anim(animate, i + 3)}><circle cx="${cx + 5}" cy="${cy - 4}" r="5" fill="${esc(color(it, i))}"/><text x="${cx + 16}" y="${cy}" class="fg" font-size="12">${esc(truncate(it.name, 16))} <tspan class="muted">${esc(p.percent ? `${it.percent.toFixed(1)}%` : it.text)}</tspan></text></g>`;
        });
        y += Math.ceil(items.length / 2) * 22;
      } else {
        const nameW = 120;
        const valW = 100;
        const bw = W - PAD * 2 - nameW - valW;
        const max = Math.max(...items.map((it) => it.percent), 1);
        items.forEach((it, i) => {
          const ry = y + 14 + i * 26;
          body +=
            `<g${anim(animate, i + 3)}><text x="${PAD}" y="${ry}" class="fg" font-size="12.5">${esc(truncate(it.name, 16))}</text>` +
            `<rect x="${PAD + nameW}" y="${ry - 9}" width="${bw}" height="10" rx="5" class="bd"/>` +
            `<rect x="${PAD + nameW}" y="${ry - 9}" width="${Math.max(4, (it.percent / max) * bw).toFixed(1)}" height="10" rx="5" fill="${esc(color(it, i))}"/>` +
            `<text x="${W - PAD}" y="${ry}" class="muted" font-size="12" text-anchor="end">${esc(p.percent ? `${it.percent.toFixed(1)}%` : truncate(it.text, 14))}</text></g>`;
        });
        y += items.length * 26 + 6;
      }
    }

    return frame(body, { width: W, height: y + 12, theme, title: header, subtitle: sub, label: `WakaTime coding time for ${d.username}: ${d.total ?? 'unknown'} (${RANGE_LABEL[d.range] ?? d.range})` });
  }
});
