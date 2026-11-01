import { defineCard } from './types';
import { STATS } from './stats';
import { badRequest } from '../core/errors';
import { list, username } from '../core/params';
import { compact, esc, truncate } from '../core/text';
import { calculateProfileMetrics, type ProfileMetrics } from '../metrics';
import { anim, contentTop, frame, PAD } from '../svg/frame';

interface Params {
  vs: string;
  keys: string[];
}

interface Data {
  a: ProfileMetrics;
  b: ProfileMetrics;
  keys: string[];
}

const DEFAULT_KEYS = ['stars', 'followers', 'repos', 'commits', 'prs', 'contributions'];

export const compareCard = defineCard<Params, Data>({
  id: 'compare',
  aliases: ['versus', 'vs'],
  category: 'overview',
  tags: ['versus', 'compare', 'battle', 'rivalry', 'two users'],
  variants: [{ label: 'Head to head', params: { vs: 'octocat' } }, { label: 'Just reach', params: { vs: 'octocat', metrics: 'stars,followers' } }],
  title: 'Compare',
  description: 'Two GitHub users head to head across stars, followers, commits and more.',
  params: [
    { name: 'vs', type: 'string', description: 'The user to compare with (required)', default: 'octocat' },
    { name: 'metrics', type: 'list', description: `Rows to compare: ${Object.keys(STATS).join(', ')}` }
  ],
  parse: (q) => {
    if (!q.vs) throw badRequest('Missing required parameter: vs (the user to compare with)');
    const keys = list(q.metrics).filter((k) => STATS[k]);
    return { vs: username(q.vs), keys: keys.length ? keys.slice(0, 10) : DEFAULT_KEYS };
  },
  users: (p) => [p.vs],

  async load(client, p, common) {
    const [a, b] = await Promise.all([client.getUser(common.username), client.getUser(p.vs)]);
    return { a: calculateProfileMetrics(a), b: calculateProfileMetrics(b), keys: p.keys };
  },

  toJSON: (d) => ({
    a: d.a.username,
    b: d.b.username,
    rows: d.keys.map((k) => ({ metric: k, a: STATS[k].value(d.a), b: STATS[k].value(d.b) }))
  }),

  render(d, _p, { theme, common, title, t }) {
    const header = title(`${d.a.username} vs ${d.b.username}`);
    const top = contentTop(!!header);
    const width = 480;
    const mid = width / 2;
    const half = mid - PAD - 46; // longest bar
    const rowH = 38;
    let winsA = 0;
    let winsB = 0;

    const rows = d.keys
      .map((k, i) => {
        const va = STATS[k].value(d.a);
        const vb = STATS[k].value(d.b);
        const max = Math.max(va, vb, 1);
        const aWins = va > vb;
        const bWins = vb > va;
        if (aWins) winsA++;
        if (bWins) winsB++;
        const y = top + 26 + i * rowH;
        const wa = Math.max(va ? 3 : 0, (va / max) * half);
        const wb = Math.max(vb ? 3 : 0, (vb / max) * half);
        const cls = (win: boolean, side: 'ser' | 'ser2') => (win ? side : 'bd');
        return (
          `<g${anim(common.animation, i)}>` +
          `<text x="${mid}" y="${y + 9}" text-anchor="middle" class="muted" font-size="11">${esc(t(`stat.${k}` as 'stat.repos'))}</text>` +
          `<rect x="${(mid - 4 - wa).toFixed(1)}" y="${y + 14}" width="${wa.toFixed(1)}" height="10" rx="5" class="${cls(aWins, 'ser')}"/>` +
          `<rect x="${mid + 4}" y="${y + 14}" width="${wb.toFixed(1)}" height="10" rx="5" class="${cls(bWins, 'ser2')}"/>` +
          `<text x="${PAD}" y="${y + 24}" class="${aWins ? 'fg' : 'muted'}" font-size="13" font-weight="${aWins ? 700 : 400}">${compact(va)}</text>` +
          `<text x="${width - PAD}" y="${y + 24}" text-anchor="end" class="${bWins ? 'fg' : 'muted'}" font-size="13" font-weight="${bWins ? 700 : 400}">${compact(vb)}</text></g>`
        );
      })
      .join('');

    const names =
      `<text x="${PAD}" y="${top + 8}" class="fg" font-size="13" font-weight="700">@${esc(truncate(d.a.username, 18))}</text>` +
      `<text x="${width - PAD}" y="${top + 8}" text-anchor="end" class="fg" font-size="13" font-weight="700">@${esc(truncate(d.b.username, 18))}</text>`;

    return frame(names + rows, {
      width,
      height: top + 26 + d.keys.length * rowH + 14,
      theme,
      title: header,
      subtitle: `${winsA} - ${winsB}`,
      label: `${d.a.username} versus ${d.b.username}: ${winsA} to ${winsB}`
    });
  }
});
