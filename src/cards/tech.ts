import { defineCard } from './types';
import { bool, int, list, oneOf } from '../core/params';
import { esc, truncate } from '../core/text';
import { frame, messageCard, PAD, contentTop, anim } from '../svg/frame';
import { TECH_ALIASES, TECH_ICONS } from '../svg/tech-icons';

const STYLES = ['tile', 'plain', 'mono', 'outline'] as const;
const SHAPES = ['rounded', 'circle', 'square'] as const;
const ALIGNS = ['left', 'center', 'right'] as const;

interface Group {
  title: string;
  icons: string[];
}

interface Params {
  icons: string[];
  groups: Group[];
  size: number;
  perLine: number;
  gap: number;
  style: (typeof STYLES)[number];
  shape: (typeof SHAPES)[number];
  align: (typeof ALIGNS)[number];
  shadow: boolean;
  labels: boolean;
}

/** GitHub language names that don't match an icon slug directly. */
const LANGUAGE_SLUGS: Record<string, string> = { 'jupyter notebook': 'jupyter', dockerfile: 'docker', shell: 'gnubash', 'c#': 'dotnet', java: 'openjdk', vue: 'vuedotjs', html: 'html5', scss: 'sass', hcl: 'terraform' };

/** Name, alias or slug -> slug, or undefined if we don't bundle that icon. */
export function resolveIcon(name: string): string | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  const candidates = [n, LANGUAGE_SLUGS[n], TECH_ALIASES[n], n.replace(/[\s.]/g, ''), n.replace(/\./g, 'dot').replace(/\s/g, ''), n.replace(/\+/g, 'plus')];
  return candidates.find((c) => c && TECH_ICONS[c]);
}

const luminance = (hex: string) => {
  const n = Number.parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

/** `Frontend:ts,react;DevOps:docker,git` -> groups (at most 6 groups, 16 icons each). */
function parseGroups(raw: string | undefined): Group[] {
  if (!raw) return [];
  return raw
    .split(';')
    .slice(0, 6)
    .map((part) => {
      const i = part.indexOf(':');
      return i < 0 ? { title: '', icons: part.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 16) } : { title: part.slice(0, i).trim().slice(0, 30), icons: part.slice(i + 1).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 16) };
    })
    .filter((g) => g.icons.length);
}

export const techCard = defineCard<Params, string[]>({
  id: 'tech',
  aliases: ['skills', 'stack', 'icons'],
  category: 'languages',
  tags: ['skills', 'icons', 'stack', 'logos', 'tools', 'frameworks', 'skillicons', 'groups'],
  needsUser: false,
  variants: [
    { label: 'Tiles (auto from languages)' },
    { label: 'Web stack tiles', params: { icons: 'ts,react,nextjs,tailwind,node,postgres,docker,vercel' } },
    { label: 'Grouped by area', params: { groups: 'Frontend:ts,react,nextjs,tailwind;Backend:node,go,postgres,redis;DevOps:docker,kubernetes,githubactions,terraform', style: 'tile', per_line: '4', size: '36' } },
    { label: 'Circle tiles with shadow', params: { icons: 'python,django,fastapi,redis,docker,linux', shape: 'circle', shadow: 'true' } },
    { label: 'Plain logos with labels', params: { icons: 'python,django,fastapi,redis,docker,linux,git,githubactions', style: 'plain', labels: 'true' } },
    { label: 'Mono outline', params: { icons: 'go,rust,kubernetes,terraform,grafana,prometheus', style: 'outline' } },
    { label: 'Centered rows', params: { icons: 'js,ts,react,vue,svelte,angular,node,deno,bun', align: 'center', per_line: '5' } },
    { label: 'Bare row', params: { icons: 'js,ts,react,vue,svelte,angular', hide_title: 'true', hide_border: 'true', bg_opacity: '0' } }
  ],
  title: 'Tech Stack',
  description: `Logo grid of the tools you use, as a single image (${Object.keys(TECH_ICONS).length} icons). Leave \`icons\` empty to use your top languages, or organise them into named groups.`,
  params: [
    { name: 'icons', type: 'list', description: 'Comma-separated, e.g. ts,react,docker,postgres (empty = your top languages)' },
    { name: 'groups', type: 'string', description: 'Named sections instead of icons, e.g. Frontend:ts,react;Backend:node,go;DevOps:docker,git' },
    { name: 'style', type: 'enum', options: [...STYLES], default: 'tile', description: 'Brand-coloured tiles, plain logos, theme-coloured, or outlined' },
    { name: 'shape', type: 'enum', options: [...SHAPES], default: 'rounded', description: 'Tile shape (tile and outline styles)' },
    { name: 'size', type: 'number', default: 40, min: 20, max: 80, description: 'Icon size in px' },
    { name: 'per_line', type: 'number', default: 8, min: 2, max: 16, description: 'Icons per row' },
    { name: 'gap', type: 'number', default: 12, min: 4, max: 30, description: 'Space between icons' },
    { name: 'align', type: 'enum', options: [...ALIGNS], default: 'left', description: 'Alignment of each row' },
    { name: 'shadow', type: 'boolean', default: false, description: 'Soft shadow under tiles' },
    { name: 'labels', type: 'boolean', default: false, description: 'Show names under the icons' }
  ],
  parse: (q) => ({
    icons: list(q.icons).slice(0, 40),
    groups: parseGroups(q.groups),
    style: oneOf(q.style, STYLES, 'tile'),
    shape: oneOf(q.shape, SHAPES, 'rounded'),
    size: int(q.size, 40, 20, 80),
    perLine: int(q.per_line, 8, 2, 16),
    gap: int(q.gap, 12, 4, 30),
    align: oneOf(q.align, ALIGNS, 'left'),
    shadow: bool(q.shadow, false),
    labels: bool(q.labels, false)
  }),
  async load(client, p, common) {
    if (p.groups.length) return p.groups.flatMap((g) => g.icons);
    if (p.icons.length || !common.username) return p.icons;
    return (await client.getUser(common.username)).languages.slice(0, 12).map((l) => l.name);
  },
  toJSON: (names, p) => (p.groups.length ? p.groups.map((g) => ({ title: g.title, icons: g.icons.map((n) => ({ name: n, icon: resolveIcon(n) ?? null })) })) : names.map((n) => ({ name: n, icon: resolveIcon(n) ?? null }))),

  render(names, p, { theme, common, title }) {
    const header = title('Tech Stack');
    const groups: { title: string; slugs: string[] }[] = p.groups.length
      ? p.groups.map((g) => ({ title: g.title, slugs: [...new Set(g.icons.map(resolveIcon).filter((s): s is string => !!s))] })).filter((g) => g.slugs.length)
      : [{ title: '', slugs: [...new Set(names.map(resolveIcon).filter((s): s is string => !!s))] }];
    const all = groups.flatMap((g) => g.slugs);
    if (!all.length) return messageCard('Add some icons, e.g. icons=ts,react,docker,postgres', theme, { title: header ?? 'Tech Stack', tone: 'info' });

    const s = p.size;
    const labelH = p.labels ? Math.round(12 + s * 0.12) : 0;
    const cols = Math.min(p.perLine, Math.max(...groups.map((g) => g.slugs.length)));
    const top = header ? contentTop(true) : PAD - 5;
    const darkBg = luminance(theme.background.length > 5 ? theme.background : '#ffffff') < 0.45;
    const gridW = cols * (s + p.gap) - p.gap;
    const radius = p.shape === 'circle' ? s / 2 : p.shape === 'square' ? 3 : s * 0.22;
    let idx = 0;

    const cell = (slug: string, x: number, y: number, i: number): string => {
      const icon = TECH_ICONS[slug];
      const brand = `#${icon.h}`;
      const lightBrand = luminance(icon.h) > 0.6;
      let g: string;
      if (p.style === 'tile') {
        const inner = s * 0.6;
        g = `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${radius.toFixed(1)}" fill="${brand}"${p.shadow ? ' filter="url(#tsh)"' : ''}/>` +
          `<path d="${icon.p}" fill="${lightBrand ? '#111' : '#fff'}" transform="translate(${(x + (s - inner) / 2).toFixed(1)} ${(y + (s - inner) / 2).toFixed(1)}) scale(${(inner / 24).toFixed(3)})"/>`;
      } else if (p.style === 'outline') {
        const inner = s * 0.56;
        g = `<rect x="${x + 0.75}" y="${y + 0.75}" width="${s - 1.5}" height="${s - 1.5}" rx="${radius.toFixed(1)}" fill="none" class="sk-bd" stroke-width="1.5"${p.shadow ? ' filter="url(#tsh)"' : ''}/>` +
          `<path d="${icon.p}" class="fg ic" transform="translate(${(x + (s - inner) / 2).toFixed(1)} ${(y + (s - inner) / 2).toFixed(1)}) scale(${(inner / 24).toFixed(3)})"/>`;
      } else {
        // plain: brand colour unless it would vanish into the background; mono: theme colour
        const fill = p.style === 'mono' ? ' class="accent ic"' : (darkBg ? luminance(icon.h) < 0.12 : luminance(icon.h) > 0.9) ? ' class="fg ic"' : ` fill="${brand}"`;
        g = `<path d="${icon.p}"${fill} transform="translate(${x} ${y}) scale(${(s / 24).toFixed(3)})"/>`;
      }
      const label = p.labels ? `<text x="${x + s / 2}" y="${y + s + labelH - 2}" text-anchor="middle" class="muted" font-size="${Math.max(9, Math.round(s * 0.24))}">${esc(icon.t)}</text>` : '';
      return `<g${anim(common.animation, i)}><title>${esc(icon.t)}</title>${g}${label}</g>`;
    };

    let body = '';
    let y = top;
    groups.forEach((g, gi) => {
      if (g.title) {
        body += `<text x="${PAD}" y="${y + 12}" class="muted" font-size="11" font-weight="700" letter-spacing="1.5">${esc(truncate(g.title.toUpperCase(), 30))}</text>`;
        y += 24;
      }
      const rows = Math.ceil(g.slugs.length / cols);
      for (let r = 0; r < rows; r++) {
        const inRow = g.slugs.slice(r * cols, r * cols + cols);
        const rowW = inRow.length * (s + p.gap) - p.gap;
        const off = p.align === 'center' ? (gridW - rowW) / 2 : p.align === 'right' ? gridW - rowW : 0;
        inRow.forEach((slug, k) => {
          body += cell(slug, PAD + off + k * (s + p.gap), y + r * (s + p.gap + labelH), idx++);
        });
      }
      y += rows * (s + p.gap + labelH) - p.gap + (gi < groups.length - 1 ? 18 : 0);
    });
    const defs = p.shadow ? '<defs><filter id="tsh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#000" flood-opacity=".28"/></filter></defs>' : '';
    const titleW = header ? 240 : 0;
    return frame(defs + body, {
      width: Math.max(gridW + PAD * 2, titleW),
      height: y + PAD - 5,
      theme,
      title: header,
      label: `Tech stack: ${all.map((x) => TECH_ICONS[x].t).join(', ')}`
    });
  }
});
