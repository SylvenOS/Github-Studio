import { defineCard } from './types';
import { bool, int, list, oneOf } from '../core/params';
import { esc } from '../core/text';
import { frame, messageCard, PAD, contentTop, anim } from '../svg/frame';
import { TECH_ALIASES, TECH_ICONS } from '../svg/tech-icons';

const STYLES = ['tile', 'plain', 'mono', 'outline'] as const;

interface Params {
  icons: string[];
  size: number;
  perLine: number;
  gap: number;
  style: (typeof STYLES)[number];
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

export const techCard = defineCard<Params, string[]>({
  id: 'tech',
  aliases: ['skills', 'stack', 'icons'],
  category: 'languages',
  tags: ['skills', 'icons', 'stack', 'logos', 'tools', 'frameworks', 'skillicons'],
  needsUser: false,
  variants: [
    { label: 'Tiles (auto from languages)' },
    { label: 'Web stack tiles', params: { icons: 'ts,react,nextjs,tailwind,node,postgres,docker,vercel' } },
    { label: 'Plain logos with labels', params: { icons: 'python,django,fastapi,redis,docker,linux,git,githubactions', style: 'plain', labels: 'true' } },
    { label: 'Mono outline', params: { icons: 'go,rust,kubernetes,terraform,grafana,prometheus', style: 'outline' } },
    { label: 'Bare row', params: { icons: 'js,ts,react,vue,svelte,angular', hide_title: 'true', hide_border: 'true', bg_opacity: '0' } }
  ],
  title: 'Tech Stack',
  description: `Logo grid of the tools you use, as a single image (${Object.keys(TECH_ICONS).length} icons). Leave \`icons\` empty to use your top languages.`,
  params: [
    { name: 'icons', type: 'list', description: 'Comma-separated, e.g. ts,react,docker,postgres (empty = your top languages)' },
    { name: 'style', type: 'enum', options: [...STYLES], default: 'tile', description: 'Brand-coloured tiles, plain logos, theme-coloured, or outlined' },
    { name: 'size', type: 'number', default: 40, min: 20, max: 80, description: 'Icon size in px' },
    { name: 'per_line', type: 'number', default: 8, min: 2, max: 16, description: 'Icons per row' },
    { name: 'gap', type: 'number', default: 12, min: 4, max: 30, description: 'Space between icons' },
    { name: 'labels', type: 'boolean', default: false, description: 'Show names under the icons' }
  ],
  parse: (q) => ({
    icons: list(q.icons).slice(0, 40),
    style: oneOf(q.style, STYLES, 'tile'),
    size: int(q.size, 40, 20, 80),
    perLine: int(q.per_line, 8, 2, 16),
    gap: int(q.gap, 12, 4, 30),
    labels: bool(q.labels, false)
  }),
  async load(client, p, common) {
    if (p.icons.length || !common.username) return p.icons;
    return (await client.getUser(common.username)).languages.slice(0, 12).map((l) => l.name);
  },
  toJSON: (names) => names.map((n) => ({ name: n, icon: resolveIcon(n) ?? null })),

  render(names, p, { theme, common, title }) {
    const header = title('Tech Stack');
    const slugs = [...new Set(names.map(resolveIcon).filter((s): s is string => !!s))];
    if (!slugs.length) return messageCard('Add some icons, e.g. icons=ts,react,docker,postgres', theme, { title: header ?? 'Tech Stack' });

    const s = p.size;
    const labelH = p.labels ? Math.round(12 + s * 0.12) : 0;
    const cols = Math.min(p.perLine, slugs.length);
    const top = header ? contentTop(true) : PAD - 5;
    const darkBg = luminance(theme.background.length > 5 ? theme.background : '#ffffff') < 0.45;

    const items = slugs
      .map((slug, i) => {
        const icon = TECH_ICONS[slug];
        const x = PAD + (i % cols) * (s + p.gap);
        const y = top + Math.floor(i / cols) * (s + p.gap + labelH);
        const brand = `#${icon.h}`;
        const lightBrand = luminance(icon.h) > 0.6;
        let g: string;
        if (p.style === 'tile') {
          const inner = s * 0.6;
          g = `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${(s * 0.22).toFixed(1)}" fill="${brand}"/>` +
            `<path d="${icon.p}" fill="${lightBrand ? '#111' : '#fff'}" transform="translate(${(x + (s - inner) / 2).toFixed(1)} ${(y + (s - inner) / 2).toFixed(1)}) scale(${(inner / 24).toFixed(3)})"/>`;
        } else if (p.style === 'outline') {
          const inner = s * 0.56;
          g = `<rect x="${x + 0.75}" y="${y + 0.75}" width="${s - 1.5}" height="${s - 1.5}" rx="${(s * 0.22).toFixed(1)}" fill="none" class="sk-bd" stroke-width="1.5"/>` +
            `<path d="${icon.p}" class="fg ic" transform="translate(${(x + (s - inner) / 2).toFixed(1)} ${(y + (s - inner) / 2).toFixed(1)}) scale(${(inner / 24).toFixed(3)})"/>`;
        } else {
          // plain: brand colour unless it would vanish into the background; mono: theme colour
          const fill = p.style === 'mono' ? ' class="accent ic"' : (darkBg ? luminance(icon.h) < 0.12 : luminance(icon.h) > 0.9) ? ' class="fg ic"' : ` fill="${brand}"`;
          g = `<path d="${icon.p}"${fill} transform="translate(${x} ${y}) scale(${(s / 24).toFixed(3)})"/>`;
        }
        const label = p.labels ? `<text x="${x + s / 2}" y="${y + s + labelH - 2}" text-anchor="middle" class="muted" font-size="${Math.max(9, Math.round(s * 0.24))}">${esc(icon.t)}</text>` : '';
        return `<g${anim(common.animation, i)}><title>${esc(icon.t)}</title>${g}${label}</g>`;
      })
      .join('');

    const rows = Math.ceil(slugs.length / cols);
    const gridW = cols * (s + p.gap) - p.gap;
    return frame(items, {
      width: Math.max(gridW + PAD * 2, header ? 240 : 0),
      height: top + rows * (s + p.gap + labelH) - p.gap + PAD - 5,
      theme,
      title: header,
      label: `Tech stack: ${slugs.map((x) => TECH_ICONS[x].t).join(', ')}`
    });
  }
});
