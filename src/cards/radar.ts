import { defineCard } from './types';
import { int, list } from '../core/params';
import { esc, truncate } from '../core/text';
import type { LanguageStat } from '../github/client';
import { anim, frame, messageCard } from '../svg/frame';
import { languageShares } from './languages';

interface Params {
  count: number;
  hide: string[];
}

export const radarCard = defineCard<Params, LanguageStat[]>({
  id: 'radar',
  category: 'languages',
  tags: ['tech', 'skills', 'chart'],
  variants: [
    { label: 'Default' }
  ],
  title: 'Tech Stack Radar',
  description: 'Radar chart of the most used languages.',
  params: [
    { name: 'langs_count', type: 'number', default: 6, min: 3, max: 8, description: 'Number of axes' },
    { name: 'hide', type: 'list', description: 'Languages to hide' }
  ],
  parse: (q) => ({ count: int(q.langs_count, 6, 3, 8), hide: list(q.hide) }),
  load: async (client, _p, common) => (await client.getUser(common.username)).languages,
  toJSON: (langs, p) => languageShares(langs, { ...p, by: 'size' }),

  render(langs, p, { theme, common, title, t }) {
    const header = title(t('title.radar'));
    const shares = languageShares(langs, { ...p, by: 'size' });
    if (shares.length < 3) return messageCard('Not enough language data for a radar chart.', theme, { title: header ?? 'Tech Stack Radar' });

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

    const web = [1, 2, 3, 4].map((l) => `<polygon points="${ring((R * l) / 4)}" fill="none" class="sk-bd"/>`).join('');
    const axes = shares
      .map((_, i) => {
        const [x, y] = pt(i, R);
        return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="sk-bd"/>`;
      })
      .join("");
    const points = shares.map((s, i) => pt(i, R * Math.max(Math.sqrt(s.percent / max), 0.15)));
    const dots = points.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="bg sk-accent" stroke-width="2"/>`).join('');
    const labels = shares
      .map((s, i) => {
        const cos = Math.cos(angle(i));
        const anchor = Math.abs(cos) < 0.1 ? 'middle' : cos > 0 ? 'start' : 'end';
        const [x, y] = pt(i, R + 22);
        return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" class="fg" font-size="12" font-weight="600">${esc(truncate(s.name, 14))}</text>`;
      })
      .join('');

    const body = `<g transform="translate(0 10)">${web}${axes}<g${anim(common.animation)}><polygon points="${points.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" class="accent sk-accent" fill-opacity=".35" stroke-width="2"/>${dots}</g>${labels}</g>`;
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
