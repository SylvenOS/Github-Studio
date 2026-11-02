import { defineCard } from './types';
import { badRequest } from '../core/errors';
import { int, list, oneOf } from '../core/params';
import { compact, esc, fmt, truncate } from '../core/text';
import type { LanguageStat } from '../github/client';
import { languageColor } from '../svg/colors';
import { anim, contentTop, frame, PAD } from '../svg/frame';

/**
 * Typical bytes per line of source, from sampling large open-source codebases. Used only to turn GitHub's
 * language byte counts into a *rough* line estimate - the card labels it as such.
 */
const BYTES_PER_LINE: Record<string, number> = {
  c: 30, 'c++': 32, 'c#': 36, go: 28, java: 38, javascript: 32, typescript: 34, python: 31, ruby: 27, rust: 33, php: 34,
  kotlin: 36, swift: 34, scala: 36, shell: 28, html: 45, css: 26, scss: 26, vue: 36, dart: 35, lua: 28, haskell: 30,
  elixir: 30, clojure: 34, 'jupyter notebook': 120, markdown: 60, tex: 45, r: 30, perl: 30, zig: 30, nix: 30
};
const DEFAULT_BPL = 33;
/** Repositories measured without a token (each costs one REST call). */
const SAMPLE = 10;
const LAYOUTS = ['bars', 'tiles'] as const;

interface Data {
  languages: LanguageStat[];
  /** Number of repositories measured when it isn't all of them (token-less mode). */
  sampled: number | null;
}

interface Params {
  count: number;
  exclude: string[];
  layout: (typeof LAYOUTS)[number];
}

const lines = (l: LanguageStat) => l.size / (BYTES_PER_LINE[l.name.toLowerCase()] ?? DEFAULT_BPL);

function bytes(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export const codeCard = defineCard<Params, Data>({
  id: 'code',
  aliases: ['loc', 'lines-of-code', 'code-volume'],
  category: 'languages',
  tags: ['lines of code', 'loc', 'bytes', 'size', 'volume', 'languages'],
  variants: [{ label: 'Bars' }, { label: 'Tiles', params: { layout: 'tiles' } }],
  title: 'Code Volume',
  description: 'How much code lives in your public repositories: bytes per language from GitHub, with an estimated line count (bytes ÷ typical bytes per line). Estimates are labelled as such. Without a server token, your 10 most recently pushed repos are measured.',
  params: [
    { name: 'count', type: 'number', default: 6, min: 1, max: 10, description: 'Languages shown' },
    { name: 'exclude', type: 'list', description: 'Languages to leave out, e.g. HTML,Jupyter Notebook' },
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'bars', description: 'Presentation' }
  ],
  parse: (q) => ({ count: int(q.count, 6, 1, 10), exclude: list(q.exclude).map((s) => s.toLowerCase()), layout: oneOf(q.layout, LAYOUTS, 'bars') }),
  async load(client, _p, common) {
    const user = await client.getUser(common.username);
    if (user.source === 'graphql') return { languages: user.languages, sampled: null };
    // token-less: language bytes of the most recently pushed repositories via REST (one call each)
    const recent = [...user.repos].sort((a, b) => (b.pushedAt ?? '').localeCompare(a.pushedAt ?? '')).slice(0, SAMPLE).map((r) => r.name);
    if (!recent.length) throw badRequest(`${common.username} has no public repositories`);
    return { languages: await client.getLanguageBytes(user.login, recent), sampled: recent.length };
  },
  toJSON: (d, p) =>
    d.languages.filter((l) => !p.exclude.includes(l.name.toLowerCase())).map((l) => ({ name: l.name, bytes: l.size, estimatedLines: Math.round(lines(l)) })),

  render(d, p, { theme, common, title }) {
    const header = title('Code Volume');
    const top = contentTop(!!header);
    const W = 480;
    const animate = common.animation;
    const langs = d.languages.filter((l) => !p.exclude.includes(l.name.toLowerCase()));
    const shown = langs.slice(0, p.count);
    const totalBytes = langs.reduce((a, l) => a + l.size, 0);
    const totalLines = langs.reduce((a, l) => a + lines(l), 0);

    let body =
      `<text x="${PAD}" y="${top + 22}" class="accent" font-size="28" font-weight="700">≈ ${esc(compact(totalLines))}</text>` +
      `<text x="${PAD}" y="${top + 42}" class="label muted">estimated lines of code · ${esc(bytes(totalBytes))} in ${fmt(langs.length)} languages</text>`;
    let y = top + 62;

    if (p.layout === 'tiles') {
      const colW = (W - PAD * 2) / 3;
      shown.forEach((l, i) => {
        const x = PAD + (i % 3) * colW;
        const ty = y + Math.floor(i / 3) * 54;
        body +=
          `<g${anim(animate, i)}><rect x="${x}" y="${ty}" width="${colW - 8}" height="46" rx="8" class="bd" fill-opacity=".5"/>` +
          `<rect x="${x}" y="${ty}" width="4" height="46" rx="2" fill="${esc(languageColor(l.name, l.color))}"/>` +
          `<text x="${x + 12}" y="${ty + 19}" class="fg" font-size="12.5" font-weight="600">${esc(truncate(l.name, 14))}</text>` +
          `<text x="${x + 12}" y="${ty + 36}" class="muted" font-size="11">≈ ${esc(compact(lines(l)))} lines · ${esc(bytes(l.size))}</text></g>`;
      });
      y += Math.ceil(shown.length / 3) * 54;
    } else {
      const max = Math.max(1, ...shown.map((l) => l.size));
      const nameW = 120;
      const valW = 128;
      const bw = W - PAD * 2 - nameW - valW;
      shown.forEach((l, i) => {
        const ry = y + 12 + i * 24;
        body +=
          `<g${anim(animate, i)}><text x="${PAD}" y="${ry}" class="fg" font-size="12.5">${esc(truncate(l.name, 15))}</text>` +
          `<rect x="${PAD + nameW}" y="${ry - 9}" width="${Math.max(3, (l.size / max) * bw).toFixed(1)}" height="10" rx="3" fill="${esc(languageColor(l.name, l.color))}"/>` +
          `<text x="${W - PAD}" y="${ry}" class="muted" font-size="11.5" text-anchor="end">≈ ${esc(compact(lines(l)))} · ${esc(bytes(l.size))}</text></g>`;
      });
      y += shown.length * 24 + 4;
    }
    const basis = d.sampled ? `your ${d.sampled} latest repos` : 'your public repos';
    body += `<text x="${PAD}" y="${y + 12}" class="label muted" font-size="10">Bytes from GitHub (${basis}). Lines are estimated, not counted.</text>`;
    return frame(body, {
      width: W,
      height: y + 26,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `Roughly ${Math.round(totalLines)} lines of code (estimated) across ${langs.length} languages`
    });
  }
});
