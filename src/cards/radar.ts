import { defineCard } from './types';
import { bool, int, list, oneOf } from '../core/params';
import { esc, truncate } from '../core/text';
import { anim, frame, messageCard } from '../svg/frame';
import { languageShares } from './languages';

const DATA = ['languages', 'activity'] as const;
const GRIDS = ['polygon', 'circle'] as const;
const SCALES = ['sqrt', 'linear'] as const;

interface Params {
  count: number;
  hide: string[];
  data: (typeof DATA)[number];
  levels: number;
  fill: number;
  values: boolean;
  grid: (typeof GRIDS)[number];
  scale: (typeof SCALES)[number];
}

interface Axis {
  name: string;
  percent: number;
}

interface Data {
  kind: Params['data'];
  axes: Axis[];
}

export const radarCard = defineCard<Params, Data>({
  id: 'radar',
  category: 'languages',
  tags: ['tech', 'skills', 'chart'],
  variants: [
    { label: 'Languages' },
    { label: 'Activity overview', params: { data: 'activity' } },
    { label: 'Circular grid with values', params: { grid: 'circle', values: 'true' } },
    { label: 'Solid', params: { fill: '75', levels: '5' } }
  ],
  title: 'Tech Stack Radar',
  description: 'Radar chart of your language mix, or of how your activity splits into commits, pull requests, issues and code review (like GitHub’s activity overview).',
  params: [
    { name: 'langs_count', type: 'number', default: 6, min: 3, max: 8, description: 'Number of axes' },
    { name: 'hide', type: 'list', description: 'Languages to hide' },
    { name: 'data', type: 'enum', options: [...DATA], default: 'languages', description: 'What the axes show' },
    { name: 'levels', type: 'number', default: 4, min: 2, max: 8, description: 'Grid rings' },
    { name: 'fill', type: 'number', default: 35, min: 0, max: 100, step: 5, description: 'Fill opacity of the shape (%)' },
    { name: 'values', type: 'boolean', default: false, description: 'Show percentages next to the labels' },
    { name: 'grid', type: 'enum', options: [...GRIDS], default: 'polygon', description: 'Grid shape' },
    { name: 'scale', type: 'enum', options: [...SCALES], default: 'sqrt', description: 'sqrt keeps small values visible; linear is proportional' }
  ],
  parse: (q) => ({
    count: int(q.langs_count, 6, 3, 8), hide: list(q.hide), data: oneOf(q.data, DATA, 'languages'), levels: int(q.levels, 4, 2, 8),
    fill: int(q.fill, 35, 0, 100), values: bool(q.values, false), grid: oneOf(q.grid, GRIDS, 'polygon'), scale: oneOf(q.scale, SCALES, 'sqrt')
  }),
  async load(client, p, common): Promise<Data> {
    if (p.data === 'activity') {
      const c = await client.getContributions(common.username);
      const parts: [string, number][] = [['Commits', c.commits + c.restricted], ['Pull requests', c.pullRequests], ['Code review', c.reviews], ['Issues', c.issues]];
      const total = parts.reduce((a, [, v]) => a + v, 0) || 1;
      return { kind: 'activity', axes: parts.map(([name, v]) => ({ name, percent: (v / total) * 100 })) };
    }
    const langs = (await client.getUser(common.username)).languages;
    return { kind: 'languages', axes: languageShares(langs, { ...p, by: 'size' }).map(({ name, percent }) => ({ name, percent })) };
  },
  toJSON: (d) => d,

  render(d, p, { theme, common, title, t }) {
    const activity = d.kind === 'activity';
    const header = title(activity ? 'Activity Overview' : t('title.radar'));
    const shares = d.axes;
    if (shares.length < 3 || (activity && shares.every((s) => s.percent === 0))) {
      return messageCard(activity ? 'No contribution activity found for this period.' : 'Not enough language data for a radar chart.', theme, { title: header ?? 'Tech Stack Radar', tone: 'info' });
    }

    const width = 480;
    const height = 320;
    const cx = width / 2;
    const cy = height / 2 + 20;
    const R = 90;
    const n = shares.length;
    const max = Math.max(...shares.map((s) => s.percent));
    // sqrt scale keeps the polygon readable when one language dominates
    const angle = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2;
    const pt = (i: number, r: number): [number, number] => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
    const ring = (r: number) => shares.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");

    const web = Array.from({ length: p.levels }, (_, k) => k + 1)
      .map((l) => (p.grid === 'circle' ? `<circle cx="${cx}" cy="${cy}" r="${((R * l) / p.levels).toFixed(1)}" fill="none" class="sk-bd"/>` : `<polygon points="${ring((R * l) / p.levels)}" fill="none" class="sk-bd"/>`))
      .join('');
    const axes = shares
      .map((_, i) => {
        const [x, y] = pt(i, R);
        return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="sk-bd"/>`;
      })
      .join("");
    const points = shares.map((s, i) => pt(i, R * Math.max(p.scale === 'sqrt' ? Math.sqrt(s.percent / max) : s.percent / max, p.scale === 'sqrt' ? 0.15 : 0.04)));
    const dots = points.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="bg sk-ser" stroke-width="2"/>`).join('');
    const labels = shares
      .map((s, i) => {
        const cos = Math.cos(angle(i));
        const anchor = Math.abs(cos) < 0.1 ? 'middle' : cos > 0 ? 'start' : 'end';
        const [x, y] = pt(i, R + 22);
        return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" class="fg" font-size="12" font-weight="600">${esc(truncate(s.name, 14))}${activity || p.values ? ` <tspan class="muted" font-weight="400">${Math.round(s.percent)}%</tspan>` : ''}</text>`;
      })
      .join('');

    const body = `<g transform="translate(0 10)">${web}${axes}<g${anim(common.animation)}><polygon points="${points.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" class="ser sk-ser" fill-opacity="${(p.fill / 100).toFixed(2)}" stroke-width="2"/>${dots}</g>${labels}</g>`;
    return frame(body, {
      width,
      height,
      theme,
      animate: common.animation,
      title: header,
      subtitle: `@${common.username}`,
      label: `Radar chart of top languages: ${shares.map((s) => s.name).join(', ')}`
    });
  }
});
