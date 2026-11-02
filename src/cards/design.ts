import { defineCard } from './types';
import { badRequest } from '../core/errors';
import { int, list, oneOf } from '../core/params';
import type { CalendarDay } from '../github/client';
import { buildModel, type ProfileModel } from '../designs/model';
import { DESIGNS, RENDERERS, SIGNATURE_THEME, type DesignId } from '../designs/systems';
import { frame } from '../svg/frame';
import { resolveTheme } from '../themes';

const PARTS = ['stats', 'languages', 'projects', 'activity', 'now', 'links'] as const;

interface Params {
  design: DesignId;
  role?: string;
  intro?: string;
  now?: string;
  links: string[];
  projects: number;
  hide: string[];
  prompt: string;
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
  tags: ['design system', 'terminal', 'ide', 'vscode', 'editorial', 'dashboard', 'blueprint', 'retro', 'pixel', 'portfolio', 'hero', 'identity'],
  variants: DESIGNS.map((d) => ({ label: { terminal: 'Terminal OS', ide: 'Code Studio', editorial: 'Editorial', dashboard: 'Dashboard', blueprint: 'Blueprint', retro: 'Retro Arcade' }[d], params: { design: d } })),
  title: 'Profile Design',
  description: 'Your whole profile as one designed piece: identity, work and signals rendered as a terminal, a code editor, an editorial page, a dashboard, an engineering blueprint or a retro arcade screen. Same data, six design systems; any theme recolors them.',
  cacheSeconds: 3 * 3600,
  params: [
    { name: 'design', type: 'enum', options: [...DESIGNS], default: 'terminal', description: 'Design system' },
    { name: 'role', type: 'string', description: 'Your title, e.g. Backend engineer (max 40)' },
    { name: 'intro', type: 'string', description: 'One or two sentences about you (max 200; default: GitHub bio)' },
    { name: 'now', type: 'string', description: 'What you are building right now (max 90)' },
    { name: 'links', type: 'list', description: 'Up to 4 short links or handles shown as text, e.g. site.dev,@you' },
    { name: 'projects', type: 'number', default: 4, min: 0, max: 6, description: 'Projects shown (pinned first, else most-starred)' },
    { name: 'hide', type: 'list', description: `Sections to hide: ${PARTS.join(', ')}` },
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
      projects: int(q.projects, 4, 0, 6),
      hide: list(q.hide),
      prompt,
      themed: !!q.theme
    };
  },

  async load(client, p, common) {
    const [user, extended, calendar] = await Promise.all([
      client.getUser(common.username),
      client.getUserExtended(common.username).catch(() => null),
      client.getCalendar(common.username).catch(() => [] as CalendarDay[])
    ]);
    return buildModel({ user, extended, calendar, role: p.role, intro: p.intro, now: p.now, links: p.links, projectCount: p.projects });
  },

  render(m, p, { theme, common }) {
    // the design's own palette unless the user picked a theme (their colour overrides still apply)
    const t = p.themed
      ? theme
      : resolveTheme(SIGNATURE_THEME[p.design], common.colors, { radius: common.radius, font: common.font, hideBorder: common.hideBorder, gradient: common.gradient, style: common.style });
    const out = RENDERERS[p.design](m, { animate: common.animation, hide: new Set(p.hide), background: t.background, prompt: p.prompt });
    return frame(out.body, {
      width: out.width,
      height: out.height,
      theme: t,
      label: `${m.name}${m.role ? `, ${m.role}` : ''}: GitHub profile (${p.design} design) with ${m.stats.stars} stars and ${m.stats.contributions} contributions in the last year`
    });
  }
});
