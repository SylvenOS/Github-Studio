import { defineCard } from './types';
import { bool } from '../core/params';
import { MONTHS, compact, esc, truncate, wrap } from '../core/text';
import { calculateGrade, type Grade } from '../metrics/grade';
import { calculateProfileMetrics, type ProfileMetrics } from '../metrics';
import { anim, contentTop, frame, PAD } from '../svg/frame';
import { icon } from '../svg/icons';
import { languageShares } from './languages';
import type { LanguageShare } from './languages';

interface Params {
  avatar: boolean;
  languages: boolean;
}

interface Data {
  metrics: ProfileMetrics;
  grade: Grade;
  bio: string | null;
  joined: string | null;
  languages: LanguageShare[];
  /** `data:` URI, or null when the picture couldn't be loaded. */
  avatar: string | null;
}


export const profileCard = defineCard<Params, Data>({
  id: 'profile-card',
  category: 'overview',
  tags: ['bio', 'avatar', 'grade', 'about'],
  variants: [
    { label: 'Default' },
    { label: 'No languages', params: { languages: 'false' } }
  ],
  aliases: ['card', 'bio'],
  title: 'GitHub Profile',
  description: 'Profile summary: avatar, bio, key numbers, top languages and an overall grade.',
  params: [
    { name: 'avatar', type: 'boolean', default: true, description: 'Show the profile picture' },
    { name: 'languages', type: 'boolean', default: true, description: 'Show the language bar' }
  ],
  parse: (q) => ({ avatar: bool(q.avatar, true), languages: bool(q.languages, true) }),

  async load(client, p, common) {
    const user = await client.getUser(common.username);
    const metrics = calculateProfileMetrics(user);
    let avatar: string | null = null;
    if (p.avatar) {
      try {
        const a = await client.getAvatar(user.avatarUrl, 200);
        avatar = `data:${a.mime};base64,${a.base64}`;
      } catch {
        /* falls back to an initial */
      }
    }
    return {
      metrics,
      grade: calculateGrade(metrics),
      bio: user.bio,
      joined: user.createdAt,
      languages: languageShares(user.languages, { count: 5, hide: [], by: 'size' }),
      avatar
    };
  },

  toJSON: (d) => ({ ...d, avatar: undefined }),

  render(d, p, { theme, common, title, t }) {
    const header = title(t('title.profile'));
    const top = contentTop(!!header);
    const m = d.metrics;
    const width = 480;
    const animate = common.animation;

    const avatarSize = 84;
    const initial = esc((m.name || m.username).slice(0, 1).toUpperCase());
    const picture = !p.avatar
      ? ''
      : d.avatar
        ? `<clipPath id="av"><circle cx="${PAD + avatarSize / 2}" cy="${top + avatarSize / 2}" r="${avatarSize / 2}"/></clipPath>` +
          `<image href="${d.avatar}" x="${PAD}" y="${top}" width="${avatarSize}" height="${avatarSize}" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>` +
          `<circle cx="${PAD + avatarSize / 2}" cy="${top + avatarSize / 2}" r="${avatarSize / 2}" class="sk-accent" stroke-width="2"/>`
        : `<circle cx="${PAD + avatarSize / 2}" cy="${top + avatarSize / 2}" r="${avatarSize / 2}" class="bd"/>` +
          `<text x="${PAD + avatarSize / 2}" y="${top + avatarSize / 2 + 12}" text-anchor="middle" font-size="34" font-weight="700" class="accent">${initial}</text>`;

    const tx = p.avatar ? PAD + avatarSize + 20 : PAD;
    const bio = d.bio ? wrap(d.bio, p.avatar ? 34 : 50, 2) : [];
    const joined = d.joined ? `${t('misc.joined')} ${MONTHS[new Date(d.joined).getUTCMonth()]} ${new Date(d.joined).getUTCFullYear()}` : '';
    const text =
      `<text x="${tx}" y="${top + 20}" class="fg" font-size="19" font-weight="700">${esc(truncate(m.name, 24))}</text>` +
      `<text x="${tx}" y="${top + 40}" class="muted" font-size="13">@${esc(m.username)}${joined ? ` · ${esc(joined)}` : ''}</text>` +
      bio.map((l, i) => `<text x="${tx}" y="${top + 62 + i * 16}" class="fg" font-size="12">${esc(l)}</text>`).join('');

    // grade ring: the arc length is how far into the top of the distribution the user is
    const cx = width - PAD - 30;
    const cy = top + 32;
    const R = 26;
    const C = 2 * Math.PI * R;
    const filled = Math.max(0.04, 1 - d.grade.percentile / 100) * C;
    const ring =
      `<g${anim(animate)}><circle cx="${cx}" cy="${cy}" r="${R}" class="sk-bd" stroke-width="6"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${R}" class="sk-accent" stroke-width="6" stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>` +
      `<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-size="20" font-weight="800" class="fg">${esc(d.grade.level)}</text>` +
      `<text x="${cx}" y="${cy + 48}" text-anchor="middle" font-size="10" class="muted">${t('misc.top', { n: Math.max(1, Math.round(d.grade.percentile)) })}</text></g>`;

    const statsY = top + avatarSize + 32;
    const items: [string, number, Parameters<typeof icon>[0]][] = [
      [t('stat.followers'), m.followers, 'people'],
      [t('stat.repos'), m.repositories, 'repo'],
      [t('stat.stars'), m.stars, 'star'],
      [t('stat.prs'), m.pullRequests, 'pr']
    ];
    const stats = items
      .map(([label, value, ic], i) => {
        const x = PAD + i * 108;
        return (
          `<g transform="translate(${x} ${statsY})"${anim(animate, i + 1)}>${icon(ic, 0, -12)}` +
          `<text x="20" y="0" class="value fg">${compact(value)}</text><text x="0" y="18" class="label muted">${esc(label)}</text></g>`
        );
      })
      .join('');

    let langs = '';
    let height = statsY + 40;
    if (p.languages && d.languages.length) {
      const y = statsY + 38;
      let x = 0;
      const barW = width - PAD * 2;
      const segs = d.languages
        .map((l) => {
          const w = (l.percent / 100) * barW;
          const seg = `<rect x="${x.toFixed(1)}" width="${w.toFixed(1)}" height="8" fill="${esc(l.color)}"/>`;
          x += w;
          return seg;
        })
        .join('');
      const legend = d.languages
        .slice(0, 4)
        .map((l, i) => `<g transform="translate(${i * 108} 26)"><circle cx="4" cy="-3" r="4" fill="${esc(l.color)}"/><text x="13" y="0" class="muted" font-size="11">${esc(truncate(l.name, 11))} ${Math.round(l.percent)}%</text></g>`)
        .join('');
      langs = `<g transform="translate(${PAD} ${y})"><clipPath id="lb"><rect width="${barW}" height="8" rx="4"/></clipPath><g clip-path="url(#lb)">${segs}</g>${legend}</g>`;
      height = y + 48;
    }

    return frame(picture + text + ring + stats + langs, {
      width,
      height,
      theme,
      title: header,
      label: `${m.name} (@${m.username}): grade ${d.grade.level}, ${m.followers} followers, ${m.stars} stars`
    });
  }
});
