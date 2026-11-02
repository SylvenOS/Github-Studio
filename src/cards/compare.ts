import { defineCard } from './types';
import { STATS } from './stats';
import { badRequest } from '../core/errors';
import { bool, list, oneOf, username } from '../core/params';
import { compact, esc, truncate } from '../core/text';
import { calculateProfileMetrics, type ProfileMetrics } from '../metrics';
import { anim, contentTop, frame, PAD } from '../svg/frame';

const LAYOUTS = ['bars', 'table'] as const;

interface Params {
  vs: string;
  keys: string[];
  layout: (typeof LAYOUTS)[number];
  avatars: boolean;
}

interface Data {
  a: ProfileMetrics;
  b: ProfileMetrics;
  keys: string[];
  avatarA: string | null;
  avatarB: string | null;
}

const DEFAULT_KEYS = ['stars', 'followers', 'repos', 'commits', 'prs', 'contributions'];

export const compareCard = defineCard<Params, Data>({
  id: 'compare',
  aliases: ['versus', 'vs'],
  category: 'overview',
  tags: ['versus', 'compare', 'battle', 'rivalry', 'two users'],
  variants: [{ label: 'Head to head', params: { vs: 'octocat' } }, { label: 'Table', params: { vs: 'octocat', layout: 'table' } }, { label: 'Just reach', params: { vs: 'octocat', metrics: 'stars,followers' } }, { label: 'No avatars', params: { vs: 'octocat', avatars: 'false' } }],
  title: 'Compare',
  description: 'Two GitHub users head to head across stars, followers, commits and more.',
  params: [
    { name: 'vs', type: 'string', description: 'The user to compare with', default: 'octocat' },
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'bars', description: 'Mirrored bars or a table' },
    { name: 'avatars', type: 'boolean', default: true, description: 'Show both profile pictures' },
    { name: 'metrics', type: 'list', description: `Rows to compare: ${Object.keys(STATS).join(', ')}` }
  ],
  parse: (q, common) => {
    const vs = username(q.vs || 'octocat');
    if (common.username && vs.toLowerCase() === common.username.toLowerCase()) throw badRequest('Pick a different user for vs');
    const keys = list(q.metrics).filter((k) => STATS[k]);
    return { vs, keys: keys.length ? keys.slice(0, 10) : DEFAULT_KEYS, layout: oneOf(q.layout, LAYOUTS, 'bars'), avatars: bool(q.avatars, true) };
  },
  users: (p) => [p.vs],

  async load(client, p, common) {
    const [a, b] = await Promise.all([client.getUser(common.username), client.getUser(p.vs)]);
    const pic = (url: string) => (p.avatars ? client.getAvatar(url, 96).then((x) => `data:${x.mime};base64,${x.base64}`).catch(() => null) : Promise.resolve(null));
    const [avatarA, avatarB] = await Promise.all([pic(a.avatarUrl), pic(b.avatarUrl)]);
    return { a: calculateProfileMetrics(a), b: calculateProfileMetrics(b), keys: p.keys, avatarA, avatarB };
  },

  toJSON: (d) => ({
    a: d.a.username,
    b: d.b.username,
    rows: d.keys.map((k) => ({ metric: k, a: STATS[k].value(d.a), b: STATS[k].value(d.b) }))
  }),

  render(d, p, { theme, common, title, t }) {
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

    const face = (uri: string | null, x: number, id: string) =>
      uri ? `<clipPath id="${id}"><circle cx="${x}" cy="${top - 2}" r="13"/></clipPath><image href="${esc(uri)}" x="${x - 13}" y="${top - 15}" width="26" height="26" clip-path="url(#${id})"/>` : '';
    const offA = p.avatars && d.avatarA ? 32 : 0;
    const offB = p.avatars && d.avatarB ? 32 : 0;
    const names =
      face(d.avatarA, PAD + 13, 'ca') + face(d.avatarB, width - PAD - 13, 'cb') +
      `<text x="${PAD + offA}" y="${top + 3}" class="fg" font-size="13" font-weight="700">@${esc(truncate(d.a.username, 16))}</text>` +
      `<text x="${width - PAD - offB}" y="${top + 3}" text-anchor="end" class="fg" font-size="13" font-weight="700">@${esc(truncate(d.b.username, 16))}</text>`;

    const lead = winsA === winsB ? 'Even match' : `@${winsA > winsB ? d.a.username : d.b.username} leads ${Math.max(winsA, winsB)}-${Math.min(winsA, winsB)}`;
    if (p.layout === 'table') {
      let tb = '';
      d.keys.forEach((k, i) => {
        const va = STATS[k].value(d.a);
        const vb = STATS[k].value(d.b);
        const y = top + 40 + i * 26;
        tb +=
          (i % 2 === 0 ? `<rect x="${PAD - 8}" y="${y - 17}" width="${width - PAD * 2 + 16}" height="26" rx="5" class="bd" fill-opacity=".35"/>` : '') +
          `<text x="${PAD}" y="${y}" class="${va > vb ? 'accent' : 'fg'}" font-size="13" font-weight="${va > vb ? 700 : 400}">${compact(va)}${va > vb ? ' ◂' : ''}</text>` +
          `<text x="${mid}" y="${y}" class="muted" font-size="11.5" text-anchor="middle">${esc(t(`stat.${k}` as 'stat.repos'))}</text>` +
          `<text x="${width - PAD}" y="${y}" class="${vb > va ? 'accent' : 'fg'}" font-size="13" font-weight="${vb > va ? 700 : 400}" text-anchor="end">${vb > va ? '▸ ' : ''}${compact(vb)}</text>`;
      });
      const ty = top + 40 + d.keys.length * 26;
      tb += `<text x="${mid}" y="${ty + 10}" class="fg" font-size="12.5" font-weight="700" text-anchor="middle">${esc(lead)}</text>`;
      return frame(names + tb, { width, height: ty + 30, theme, title: header, subtitle: `${winsA} - ${winsB}`, label: `${d.a.username} versus ${d.b.username}: ${winsA} to ${winsB}` });
    }
    const footY = top + 26 + d.keys.length * rowH + 12;
    return frame(names + rows + `<text x="${mid}" y="${footY}" class="fg" font-size="12.5" font-weight="700" text-anchor="middle">${esc(lead)}</text>`, {
      width,
      height: footY + 18,
      theme,
      title: header,
      subtitle: `${winsA} - ${winsB}`,
      label: `${d.a.username} versus ${d.b.username}: ${winsA} to ${winsB}`
    });
  }
});
