import { defineCard } from './types';
import { badRequest } from '../core/errors';
import { oneOf } from '../core/params';
import { esc, fmt, WEEKDAYS } from '../core/text';
import { cls, contentTop, frame, PAD } from '../svg/frame';

const SHAPES = ['circle', 'square', 'heat'] as const;
const STARTS = ['sun', 'mon'] as const;

interface Params {
  tz: number | null;
  shape: (typeof SHAPES)[number];
  weekStart: (typeof STARTS)[number];
}

interface Data {
  /** [weekday 0=Sun][hour] commit counts. */
  grid: number[][];
  total: number;
}

/** Author-local weekday + hour from a git timestamp ("2024-05-01T23:10:00+05:30"), or shifted to a fixed UTC offset. */
export function bucket(ts: string, tz: number | null): [number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(ts);
  if (!m) return null;
  if (tz === null) {
    const dow = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
    return [dow, +m[4]];
  }
  const t = Date.parse(ts);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t + tz * 3_600_000);
  return [d.getUTCDay(), d.getUTCHours()];
}

function persona(byHour: number[]): string {
  const total = byHour.reduce((a, b) => a + b, 0) || 1;
  const share = (from: number, to: number) => byHour.slice(from, to).reduce((a, b) => a + b, 0) / total;
  if (share(0, 5) + share(22, 24) > 0.3) return 'Night owl';
  if (share(5, 10) > 0.35) return 'Early bird';
  if (share(9, 18) > 0.65) return 'Nine-to-fiver';
  if (share(18, 22) > 0.35) return 'Evening coder';
  return 'All-day coder';
}

export const punchcardCard = defineCard<Params, Data>({
  id: 'punchcard',
  aliases: ['punch-card', 'commit-hours', 'rhythm'],
  category: 'activity',
  tags: ['punch card', 'hours', 'time of day', 'night owl', 'early bird', 'rhythm', 'commits', 'realistic'],
  variants: [{ label: 'Classic dots' }, { label: 'Heat grid', params: { shape: 'heat' } }, { label: 'Monday first', params: { week_start: 'mon' } }],
  title: 'Commit Punch Card',
  description: 'When you commit, by weekday and hour, from up to 1,000 recent commits on the default branches you contributed to most. Uses each commit’s own timezone unless `tz` is set. Needs a token on the server.',
  cacheSeconds: 6 * 3600,
  params: [
    { name: 'tz', type: 'number', min: -12, max: 14, step: 0.25, description: 'Show times at this UTC offset in hours (default: each commit’s own local time)' },
    { name: 'shape', type: 'enum', options: [...SHAPES], default: 'circle', description: 'Dot style' },
    { name: 'week_start', type: 'enum', options: [...STARTS], default: 'sun', description: 'First row' }
  ],
  parse(q) {
    let tz: number | null = null;
    if (q.tz !== undefined && q.tz !== '') {
      const n = Number(q.tz);
      if (!Number.isFinite(n) || n < -12 || n > 14) throw badRequest('tz must be a UTC offset in hours between -12 and 14');
      tz = Math.round(n * 4) / 4;
    }
    return { tz, shape: oneOf(q.shape, SHAPES, 'circle'), weekStart: oneOf(q.week_start, STARTS, 'sun') };
  },

  async load(client, p, common) {
    const times = await client.getCommitTimes(common.username);
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    let total = 0;
    for (const t of times) {
      const b = bucket(t, p.tz);
      if (!b) continue;
      grid[b[0]][b[1]]++;
      total++;
    }
    return { grid, total };
  },

  render(d, p, { theme, common, title }) {
    const header = title('Commit Punch Card');
    const top = contentTop(!!header);
    const animate = common.animation;
    const cell = 19;
    const left = PAD + 34;
    const W = left + 24 * cell + PAD;
    const order = p.weekStart === 'mon' ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    const max = Math.max(1, ...d.grid.flat());
    const byHour = Array.from({ length: 24 }, (_, h) => d.grid.reduce((a, row) => a + row[h], 0));
    const byDay = d.grid.map((row) => row.reduce((a, b) => a + b, 0));
    const peakHour = byHour.indexOf(Math.max(...byHour));
    const peakDay = byDay.indexOf(Math.max(...byDay));

    let body = '';
    order.forEach((dow, r) => {
      const y = top + 14 + r * cell;
      body += `<text x="${PAD}" y="${y + 4}" class="label muted" font-size="10.5">${WEEKDAYS[dow]}</text>`;
      for (let h = 0; h < 24; h++) {
        const v = d.grid[dow][h];
        const cx = left + h * cell + cell / 2;
        const f = v / max;
        if (p.shape === 'heat') {
          const level = v === 0 ? 0 : Math.min(4, 1 + Math.floor(f * 3.999));
          body += `<rect x="${(cx - cell / 2 + 1.5).toFixed(1)}" y="${(y - cell / 2 + 1.5).toFixed(1)}" width="${cell - 3}" height="${cell - 3}" rx="3" class="l${level}"><title>${WEEKDAYS[dow]} ${h}:00 - ${v}</title></rect>`;
        } else if (v === 0) {
          body += `<circle cx="${cx.toFixed(1)}" cy="${y}" r="1.2" class="muted" fill-opacity=".35"/>`;
        } else {
          const r0 = Math.max(2, Math.sqrt(f) * (cell / 2 - 1.5));
          body += p.shape === 'square'
            ? `<rect x="${(cx - r0).toFixed(1)}" y="${(y - r0).toFixed(1)}" width="${(r0 * 2).toFixed(1)}" height="${(r0 * 2).toFixed(1)}" rx="1.5"${cls('ser', animate, h)}><title>${WEEKDAYS[dow]} ${h}:00 - ${v}</title></rect>`
            : `<circle cx="${cx.toFixed(1)}" cy="${y}" r="${r0.toFixed(1)}"${cls('ser', animate, h)}><title>${WEEKDAYS[dow]} ${h}:00 - ${v}</title></circle>`;
        }
      }
    });
    const axisY = top + 14 + 7 * cell + 4;
    for (let h = 0; h < 24; h += 3) body += `<text x="${(left + h * cell + cell / 2).toFixed(1)}" y="${axisY}" class="label muted" font-size="10" text-anchor="middle">${h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}</text>`;

    const sy = axisY + 24;
    const summary = d.total
      ? `${persona(byHour)} · busiest ${WEEKDAYS[peakDay]} around ${String(peakHour).padStart(2, '0')}:00 · ${fmt(d.total)} commits`
      : 'No recent public commits found on default branches.';
    body += `<text x="${PAD}" y="${sy}" class="fg" font-size="12.5" font-weight="600">${esc(summary)}</text>`;
    const zone = p.tz === null ? 'local time of each commit' : `UTC${p.tz >= 0 ? '+' : '−'}${Math.abs(p.tz)}`;

    return frame(body, {
      width: W,
      height: sy + 16,
      theme,
      title: header,
      subtitle: zone,
      label: `Commit punch card for ${common.username}: ${summary}`
    });
  }
});
