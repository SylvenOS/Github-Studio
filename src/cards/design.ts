import { defineCard } from './types';
import { badRequest } from '../core/errors';
import { int, list, oneOf } from '../core/params';
import type { CalendarDay } from '../github/client';
import { buildModel, type ProfileModel } from '../designs/model';
import { DESIGNS, RENDERERS, SIGNATURE_THEME, type DesignId } from '../designs/systems';
import { frame } from '../svg/frame';
import { resolveTheme } from '../themes';

const PARTS = ['stats', 'languages', 'projects', 'activity', 'now', 'links'] as const;
const CHROMES = ['mac', 'windows', 'linux', 'none'] as const;
const AVATARS = ['none', 'photo'] as const;
const SHAPES = ['auto', 'circle', 'rounded', 'square'] as const;

const LABEL: Record<DesignId, string> = {
  terminal: 'Terminal OS', ide: 'Code Studio', editorial: 'Editorial', dashboard: 'Dashboard', blueprint: 'Blueprint',
  retro: 'Retro Arcade', minimal: 'Minimal', glass: 'Glass', poster: 'Poster'
};

interface Params {
  design: DesignId;
  role?: string;
  intro?: string;
  now?: string;
  links: string[];
  skills: string[];
  projects: number;
  hide: string[];
  prompt: string;
  chrome: (typeof CHROMES)[number];
  avatar: (typeof AVATARS)[number];
  shape: (typeof SHAPES)[number];
  scanlines: boolean;
  /** `theme` was given explicitly; otherwise the design's signature palette is used. */
  themed: boolean;
}

const text = (v: string | undefined, max: number, name: string) => {
  const s = (v ?? '').trim();
  if (s.length > max) throw badRequest(`${name} is limited to ${max} characters`);
  return s || undefined;
};

export const designCard = defineCard<Params, ProfileModel>({
  id: 'design',
  aliases: ['profile-design', 'hero', 'identity'],
  category: 'designs',
  tags: ['design system', 'terminal', 'ide', 'vscode', 'editorial', 'dashboard', 'blueprint', 'retro', 'pixel', 'minimal', 'glass', 'glassmorphism', 'poster', 'portfolio', 'hero', 'identity', 'crt', 'neofetch'],
  variants: [
    ...DESIGNS.map((d) => ({ label: LABEL[d], params: { design: d } })),
    { label: 'Terminal with photo', params: { design: 'terminal', avatar: 'photo' } },
    { label: 'Terminal CRT (Windows)', params: { design: 'terminal', scanlines: 'true', chrome: 'windows', glow: 'true' } },
    { label: 'Code Studio (Linux)', params: { design: 'ide', chrome: 'linux' } },
    { label: 'Dashboard with photo', params: { design: 'dashboard', avatar: 'photo' } },
    { label: 'Glass with photo', params: { design: 'glass', avatar: 'photo' } },
    { label: 'Poster with photo', params: { design: 'poster', avatar: 'photo', shape: 'circle' } },
    { label: 'Minimal, light', params: { design: 'minimal', theme: 'default' } }
  ],
  title: 'Profile Design',
  description: 'Your whole profile as one designed piece: identity, work and signals rendered as a terminal, a code editor, an editorial page, a dashboard, a blueprint, a retro arcade screen, a minimal page, a glass dashboard or a poster. Same data, nine design systems; any theme recolors them.',
  params: [
    { name: 'design', type: 'enum', options: [...DESIGNS], default: 'terminal', description: 'Design system' },
    { name: 'role', type: 'string', description: 'Your title, e.g. Backend engineer (max 40)' },
    { name: 'intro', type: 'string', description: 'One or two sentences about you (max 200; default: GitHub bio)' },
    { name: 'now', type: 'string', description: 'What you are building right now (max 90)' },
    { name: 'skills', type: 'list', description: 'Your stack line instead of detected languages, e.g. TypeScript,Go,Postgres' },
    { name: 'links', type: 'list', description: 'Up to 4 short links or handles shown as text, e.g. site.dev,@you' },
    { name: 'projects', type: 'number', default: 4, min: 0, max: 6, description: 'Projects shown (pinned first, else most-starred)' },
    { name: 'hide', type: 'list', description: `Sections to hide: ${PARTS.join(', ')}` },
    { name: 'avatar', type: 'enum', options: [...AVATARS], default: 'none', description: 'Use your real profile photo instead of the monogram' },
    { name: 'shape', type: 'enum', options: [...SHAPES], default: 'auto', description: 'Photo shape (auto = the design’s own)' },
    { name: 'chrome', type: 'enum', options: [...CHROMES], default: 'mac', description: 'Window title bar of the terminal and code designs' },
    { name: 'scanlines', type: 'boolean', default: false, description: 'CRT scanline overlay' },
    { name: 'prompt', type: 'string', description: 'Terminal prompt name (default: username)' }
  ],
  parse(q, common) {
    const prompt = (q.prompt ?? common.username ?? 'dev').trim();
    if (!/^[\w.-]{1,24}$/.test(prompt)) throw badRequest('prompt may only contain letters, digits, ".", "-" and "_" (max 24)');
    return {
      design: oneOf(q.design, DESIGNS, 'terminal'),
      role: text(q.role, 40, 'role'),
      intro: text(q.intro, 200, 'intro'),
      now: text(q.now, 90, 'now'),
      links: list(q.links).slice(0, 4).map((l) => l.slice(0, 40)),
      skills: list(q.skills).slice(0, 6).map((s) => s.slice(0, 24)),
      projects: int(q.projects, 4, 0, 6),
      hide: list(q.hide),
      prompt,
      chrome: oneOf(q.chrome, CHROMES, 'mac'),
      avatar: oneOf(q.avatar, AVATARS, 'none'),
      shape: oneOf(q.shape, SHAPES, 'auto'),
      scanlines: q.scanlines === 'true',
      themed: !!q.theme
    };
  },

  async load(client, p, common) {
    const [user, extended, calendar] = await Promise.all([
      client.getUser(common.username),
      client.getUserExtended(common.username).catch(() => null),
      client.getCalendar(common.username).catch(() => [] as CalendarDay[])
    ]);
    const model = buildModel({ user, extended, calendar, role: p.role, intro: p.intro, now: p.now, links: p.links, projectCount: p.projects });
    if (p.avatar === 'photo') {
      model.avatar = await client.getAvatar(user.avatarUrl, 240).then((a) => `data:${a.mime};base64,${a.base64}`).catch(() => null);
    }
    return model;
  },
  toJSON: ({ avatar: _a, ...m }) => m,

  render(m, p, { theme, common }) {
    // the design's own palette unless the user picked a theme (their colour overrides still apply)
    const t = p.themed
      ? theme
      : resolveTheme(SIGNATURE_THEME[p.design], common.colors, { radius: common.radius, font: common.font, hideBorder: common.hideBorder, gradient: common.gradient, style: common.style });
    const out = RENDERERS[p.design](m, {
      animate: common.animation,
      hide: new Set(p.hide),
      background: t.background,
      prompt: p.prompt,
      chrome: p.chrome,
      avatar: m.avatar ?? null,
      avatarShape: p.shape === 'auto' ? undefined : p.shape,
      skills: p.skills
    });
    // CRT scanlines: a fine dark line pattern over the whole design
    const scan = p.scanlines
      ? `<defs><pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#000" fill-opacity=".22"/></pattern></defs><rect width="${out.width}" height="${out.height}" fill="url(#scan)" pointer-events="none"/>`
      : '';
    return frame(out.body + scan, {
      width: out.width,
      height: out.height,
      theme: t,
      label: `${m.name}${m.role ? `, ${m.role}` : ''}: GitHub profile (${p.design} design) with ${m.stats.stars} stars and ${m.stats.contributions} contributions in the last year`
    });
  }
});
