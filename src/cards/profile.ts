import { defineCard } from './types';
import { bool, int, list, oneOf } from '../core/params';
import { MONTHS, compact, emojify, esc, truncate, wrap } from '../core/text';
import { calculateGrade, type Grade } from '../metrics/grade';
import { loadInsights, type ProfileMetrics } from '../metrics';
import { anim, contentTop, frame, PAD } from '../svg/frame';
import { icon, type IconName } from '../svg/icons';
import { languageShares } from './languages';
import type { LanguageShare } from './languages';

const LAYOUTS = ['default', 'centered', 'banner', 'cover'] as const;
const SHAPES = ['circle', 'rounded', 'square'] as const;

/** Numbers the card can show, in the user's order. */
const STAT_DEFS: Record<string, { label: string; icon: IconName; value: (m: ProfileMetrics) => number }> = {
  followers: { label: 'Followers', icon: 'people', value: (m) => m.followers },
  following: { label: 'Following', icon: 'people', value: (m) => m.following },
  repos: { label: 'Repos', icon: 'repo', value: (m) => m.repositories },
  stars: { label: 'Stars', icon: 'star', value: (m) => m.stars },
  forks: { label: 'Forks', icon: 'fork', value: (m) => m.forks },
  prs: { label: 'Pull requests', icon: 'pr', value: (m) => m.pullRequests },
  issues: { label: 'Issues', icon: 'issue', value: (m) => m.issues },
  contributions: { label: 'Contributions', icon: 'commit', value: (m) => m.contributions },
  commits: { label: 'Commits', icon: 'commit', value: (m) => m.commits },
  reviews: { label: 'Reviews', icon: 'review', value: (m) => m.reviews }
};
const DEFAULT_STATS = ['followers', 'repos', 'stars', 'prs'];

interface Params {
  avatar: boolean;
  languages: boolean;
  details: boolean;
  grade: boolean;
  layout: (typeof LAYOUTS)[number];
  stats: string[];
  shape: (typeof SHAPES)[number];
  bioLines: number;
  links: boolean;
  chips: boolean;
}

interface Data {
  metrics: ProfileMetrics;
  grade: Grade;
  bio: string | null;
  joined: string | null;
  languages: LanguageShare[];
  /** `data:` URI, or null when the picture couldn't be loaded. */
  avatar: string | null;
  /** company · location · pronouns, in display order. */
  details: string[];
  status: string | null;
  links: string[];
  hireable: boolean;
}

export const profileCard = defineCard<Params, Data>({
  id: 'profile-card',
  category: 'overview',
  tags: ['bio', 'avatar', 'grade', 'about', 'intro'],
  variants: [
    { label: 'Default' },
    { label: 'Centered', params: { layout: 'centered' } },
    { label: 'Wide banner', params: { layout: 'banner' } },
    { label: 'Cover', params: { layout: 'cover' } },
    { label: 'Cover, rounded photo', params: { layout: 'cover', shape: 'rounded', accent2: 'ff7edb' } },
    { label: 'No languages', params: { languages: 'false' } },
    { label: 'Contributor numbers', params: { stats: 'contributions,prs,reviews,stars' } }
  ],
  aliases: ['card', 'bio'],
  title: 'GitHub Profile',
  description: 'Profile summary: avatar, bio, details, links, your choice of numbers, top languages and the activity score. Default, centered or wide banner layout.',
  params: [
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'default', description: 'Arrangement' },
    { name: 'stats', type: 'list', description: `Numbers to show (up to 5): ${Object.keys(STAT_DEFS).join(', ')}` },
    { name: 'avatar', type: 'boolean', default: true, description: 'Show the profile picture' },
    { name: 'shape', type: 'enum', options: [...SHAPES], default: 'circle', description: 'Avatar shape' },
    { name: 'bio_lines', type: 'number', default: 2, min: 0, max: 4, description: 'Lines of bio' },
    { name: 'languages', type: 'boolean', default: true, description: 'Show the language bar' },
    { name: 'details', type: 'boolean', default: true, description: 'Show company, location, pronouns and status' },
    { name: 'links', type: 'boolean', default: true, description: 'Show website and X/Twitter handle' },
    { name: 'chips', type: 'boolean', default: true, description: 'Show an Open to work chip (cover layout)' },
    { name: 'grade', type: 'boolean', default: true, description: 'Show the activity score ring' }
  ],
  parse: (q) => {
    const stats = list(q.stats).filter((k) => STAT_DEFS[k]).slice(0, 5);
    return {
      avatar: bool(q.avatar, true),
      languages: bool(q.languages, true),
      details: bool(q.details, true),
      grade: bool(q.grade, true),
      layout: oneOf(q.layout, LAYOUTS, 'default'),
      stats: stats.length ? stats : DEFAULT_STATS,
      shape: oneOf(q.shape, SHAPES, 'circle'),
      bioLines: int(q.bio_lines, 2, 0, 4),
      links: bool(q.links, true),
      chips: bool(q.chips, true)
    };
  },

  async load(client, p, common) {
    const { user, extended, metrics } = await loadInsights(client, common.username);
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
      bio: emojify(user.bio) || null,
      joined: user.createdAt,
      languages: languageShares(user.languages, { count: 5, hide: [], by: 'size' }),
      avatar,
      details: [user.company, user.location, extended?.pronouns].filter((x): x is string => !!x).map((x) => x.replace(/^@/, '')),
      status: extended?.status?.message ? `${extended.status.emoji && /^:\w+:$/.test(extended.status.emoji) ? '' : extended.status.emoji ?? ''} ${extended.status.message}`.trim() : null,
      hireable: !!extended?.hireable,
      links: [user.website?.replace(/^https?:\/\//, '').replace(/\/$/, ''), user.twitter ? `@${user.twitter}` : null].filter((x): x is string => !!x)
    };
  },

  toJSON: (d) => ({ ...d, avatar: undefined }),

  render(d, p, { theme, common, title, t }) {
    const m = d.metrics;
    const animate = common.animation;
    const palette = theme.style?.chartColors;
    const languages = palette ? d.languages.map((l, i) => ({ ...l, color: palette[i % palette.length] })) : d.languages;
    const joined = d.joined ? `${t('misc.joined')} ${MONTHS[new Date(d.joined).getUTCMonth()]} ${new Date(d.joined).getUTCFullYear()}` : '';
    const detailLine = p.details ? [...d.details, ...(d.status ? [d.status] : [])].join(' · ') : '';
    const linkLine = p.links ? d.links.join('   ') : '';
    const label = `${m.name} (@${m.username}): grade ${d.grade.level}, ${m.followers} followers, ${m.stars} stars`;

    const avatarAt = (x: number, y: number, size: number) => {
      if (!p.avatar) return '';
      const r = p.shape === 'circle' ? size / 2 : p.shape === 'rounded' ? size / 5 : 0;
      const clip = `<clipPath id="av"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}"/></clipPath>`;
      return d.avatar
        ? clip + `<image href="${esc(d.avatar)}" x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>` +
            `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="none" class="sk-accent" stroke-width="2"/>`
        : `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" class="bd"/>` +
            `<text x="${x + size / 2}" y="${y + size / 2 + size * 0.15}" text-anchor="middle" font-size="${Math.round(size * 0.4)}" font-weight="700" class="accent">${esc((m.name || m.username).slice(0, 1).toUpperCase())}</text>`;
    };
    const ringAt = (cx: number, cy: number, R = 26) => {
      if (!p.grade) return '';
      const C = 2 * Math.PI * R;
      const filled = Math.max(0.04, 1 - d.grade.percentile / 100) * C;
      return (
        `<g${anim(animate)}><circle cx="${cx}" cy="${cy}" r="${R}" class="sk-bd" stroke-width="6"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${R}" class="sk-accent" stroke-width="6" stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>` +
        `<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-size="20" font-weight="800" class="fg">${esc(d.grade.level)}</text>` +
        `<text x="${cx}" y="${cy + R + 22}" text-anchor="middle" font-size="10" class="muted">${t('misc.top', { n: Math.max(1, Math.round(d.grade.percentile)) })}</text></g>`
      );
    };
    const statsRow = (x0: number, y: number, w: number, center = false) => {
      const cw = w / p.stats.length;
      return p.stats
        .map((k, i) => {
          const s = STAT_DEFS[k];
          const x = x0 + i * cw;
          const tx = center ? x + cw / 2 : x;
          const anchor = center ? ' text-anchor="middle"' : '';
          return (
            `<g${anim(animate, i + 1)}>` +
            (center ? '' : icon(s.icon, x, y - 12)) +
            `<text x="${center ? tx : x + 20}" y="${y}" class="value fg"${anchor}>${compact(s.value(m))}</text>` +
            `<text x="${tx}" y="${y + 18}" class="label muted"${anchor}>${esc(truncate(s.label, Math.floor(cw / 6.4)))}</text></g>`
          );
        })
        .join('');
    };
    const langBar = (x0: number, y: number, barW: number, legendCols = 4) => {
      if (!p.languages || !languages.length) return '';
      let x = 0;
      const segs = languages.map((l) => {
        const w = (l.percent / 100) * barW;
        const seg = `<rect x="${x.toFixed(1)}" width="${w.toFixed(1)}" height="8" fill="${esc(l.color)}"/>`;
        x += w;
        return seg;
      }).join('');
      const legend = languages
        .slice(0, legendCols)
        .map((l, i) => `<g transform="translate(${((i * barW) / legendCols).toFixed(1)} 26)"><circle cx="4" cy="-3" r="4" fill="${esc(l.color)}"/><text x="13" y="0" class="muted" font-size="11">${esc(truncate(l.name, 11))} ${Math.round(l.percent)}%</text></g>`)
        .join('');
      return `<g transform="translate(${x0} ${y})"><clipPath id="lb"><rect width="${barW}" height="8" rx="4"/></clipPath><g clip-path="url(#lb)">${segs}</g>${legend}</g>`;
    };

    // ---- centered
    if (p.layout === 'centered') {
      const W = 420;
      const header = title('');
      let y = header ? 55 : PAD;
      let body = avatarAt(W / 2 - 44, y, 88);
      y += p.avatar ? 112 : 18;
      body += `<text x="${W / 2}" y="${y}" class="fg" font-size="20" font-weight="700" text-anchor="middle">${esc(truncate(m.name, 28))}</text>`;
      body += `<text x="${W / 2}" y="${y + 20}" class="muted" font-size="12.5" text-anchor="middle">@${esc(m.username)}${joined ? ` · ${esc(joined)}` : ''}</text>`;
      y += 20;
      if (detailLine) body += `<text x="${W / 2}" y="${(y += 18)}" class="muted" font-size="11.5" text-anchor="middle">${esc(truncate(detailLine, 56))}</text>`;
      for (const l of d.bio && p.bioLines ? wrap(d.bio, 52, p.bioLines) : []) body += `<text x="${W / 2}" y="${(y += 18)}" class="fg" font-size="12.5" text-anchor="middle">${esc(l)}</text>`;
      if (linkLine) body += `<text x="${W / 2}" y="${(y += 18)}" class="accent" font-size="11.5" text-anchor="middle">${esc(truncate(linkLine, 56))}</text>`;
      y += 22;
      body += `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" class="sk-bd"/>`;
      body += statsRow(PAD, y + 30, W - PAD * 2, true);
      y += 56;
      if (p.languages && languages.length) {
        body += langBar(PAD, y + 4, W - PAD * 2, 3);
        y += 44;
      }
      if (p.grade) body += `<text x="${W / 2}" y="${y + 6}" class="muted" font-size="11" text-anchor="middle">Activity score <tspan class="accent" font-weight="800">${esc(d.grade.level)}</tspan> · top ${Math.max(1, Math.round(d.grade.percentile))}%</text>`;
      return frame(body, { width: W, height: y + (p.grade ? 26 : 8), theme, title: header, label });
    }

    // ---- banner: wide, avatar left, info middle, numbers right
    if (p.layout === 'banner') {
      const W = 760;
      const size = 120;
      let body = avatarAt(PAD, PAD, size);
      const tx = p.avatar ? PAD + size + 24 : PAD;
      let y = PAD + 26;
      body += `<text x="${tx}" y="${y}" class="fg" font-size="24" font-weight="800">${esc(truncate(m.name, 26))}</text>`;
      body += `<text x="${tx}" y="${(y += 22)}" class="muted" font-size="13">@${esc(m.username)}${joined ? ` · ${esc(joined)}` : ''}</text>`;
      if (detailLine) body += `<text x="${tx}" y="${(y += 20)}" class="muted" font-size="12">${esc(truncate(detailLine, 46))}</text>`;
      for (const l of d.bio && p.bioLines ? wrap(d.bio, 46, p.bioLines) : []) body += `<text x="${tx}" y="${(y += 19)}" class="fg" font-size="13">${esc(l)}</text>`;
      if (linkLine) body += `<text x="${tx}" y="${(y += 20)}" class="accent" font-size="12">${esc(truncate(linkLine, 46))}</text>`;
      // right column: numbers stacked 2 per row + ring
      const rx = W - PAD - 230;
      body += `<line x1="${rx - 18}" y1="${PAD}" x2="${rx - 18}" y2="${PAD + size}" class="sk-bd"/>`;
      p.stats.slice(0, 4).forEach((k, i) => {
        const s = STAT_DEFS[k];
        const x = rx + (i % 2) * 112;
        const sy = PAD + 22 + Math.floor(i / 2) * 52;
        body += `<g${anim(animate, i)}>${icon(s.icon, x, sy - 12)}<text x="${x + 20}" y="${sy}" class="value fg">${compact(s.value(m))}</text><text x="${x}" y="${sy + 18}" class="label muted">${esc(s.label)}</text></g>`;
      });
      const contentH = Math.max(size, y - PAD + 8);
      let h = PAD + contentH;
      if (p.languages && languages.length) {
        body += langBar(PAD, h + 16, W - PAD * 2, 5);
        h += 58;
      }
      if (p.grade) body += ringAt(W - PAD - 30, PAD + 32, 24).replace(/<text[^>]*>top[^<]*<\/text>/i, '');
      return frame(body, { width: W, height: h + PAD - 8, theme, label });
    }

    // ---- cover: gradient strip with an overlapping photo
    if (p.layout === 'cover') {
      const W = 480;
      const coverH = 76;
      const r = Math.min(theme.borderRadius, 24);
      const accent2 = theme.style?.accent2 ?? '#a371f7';
      let body =
        `<defs><linearGradient id="cvg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" stop-color="${accent2}"/></linearGradient>` +
        `<clipPath id="cvc"><path d="M0 ${coverH} V${r} Q0 0 ${r} 0 H${W - r} Q${W} 0 ${W} ${r} V${coverH} Z"/></clipPath></defs>` +
        `<rect x="0" y="0" width="${W}" height="${coverH}" fill="url(#cvg)" fill-opacity=".85" clip-path="url(#cvc)"/>`;
      const size = 76;
      const ax = PAD;
      const ay = coverH - 34;
      body += p.avatar ? `<circle cx="${ax + size / 2}" cy="${ay + size / 2}" r="${size / 2 + 4}" class="bg"/>` + avatarAt(ax, ay, size) : '';
      const tx = p.avatar ? ax + size + 16 : PAD;
      body += `<text x="${tx}" y="${coverH + 24}" class="fg" font-size="20" font-weight="800">${esc(truncate(m.name, 24))}</text>`;
      body += `<text x="${tx}" y="${coverH + 44}" class="muted" font-size="12.5">@${esc(m.username)}${joined ? ` · ${esc(joined)}` : ''}</text>`;
      if (p.chips && d.hireable) body += `<rect x="${W - PAD - 108}" y="${coverH + 10}" width="108" height="24" rx="12" fill="#3fb950" fill-opacity=".16"/><circle cx="${W - PAD - 94}" cy="${coverH + 22}" r="4" fill="#3fb950"/><text x="${W - PAD - 84}" y="${coverH + 26.5}" font-size="11.5" font-weight="600" fill="#3fb950">Open to work</text>`;
      let y = coverH + 70;
      if (detailLine) body += `<text x="${PAD}" y="${y}" class="muted" font-size="12">${esc(truncate(detailLine, 66))}</text>`;
      if (detailLine) y += 20;
      for (const l of d.bio && p.bioLines ? wrap(d.bio, 62, p.bioLines) : []) { body += `<text x="${PAD}" y="${y}" class="fg" font-size="12.5">${esc(l)}</text>`; y += 18; }
      if (linkLine) { body += `<text x="${PAD}" y="${y}" class="accent" font-size="12">${esc(truncate(linkLine, 66))}</text>`; y += 18; }
      y += 22;
      body += statsRow(PAD, y, W - PAD * 2 - (p.grade ? 60 : 0));
      if (p.grade) body += ringAt(W - PAD - 28, y - 6, 22).replace(/<text[^>]*>top[^<]*<\/text>/i, '');
      y += 14;
      if (p.languages && languages.length) { body += langBar(PAD, y + 20, W - PAD * 2); y += 70; } else y += 24;
      return frame(body, { width: W, height: y, theme, label });
    }

    // ---- default
    const header = title(t('title.profile'));
    const top = contentTop(!!header);
    const width = 480;
    const avatarSize = 84;
    const tx = p.avatar ? PAD + avatarSize + 20 : PAD;
    const info = [detailLine, linkLine].filter(Boolean);
    const bioTop = top + 62 + info.length * 16;
    const bio = d.bio && p.bioLines ? wrap(d.bio, p.avatar ? 34 : 50, Math.max(0, Math.min(p.bioLines, 3 - info.length))) : [];
    const text =
      `<text x="${tx}" y="${top + 20}" class="fg" font-size="19" font-weight="700">${esc(truncate(m.name, 24))}</text>` +
      `<text x="${tx}" y="${top + 40}" class="muted" font-size="13">@${esc(m.username)}${joined ? ` · ${esc(joined)}` : ''}</text>` +
      info.map((l, i) => `<text x="${tx}" y="${top + 58 + i * 16}" class="${l === linkLine ? 'accent' : 'muted'}" font-size="11.5">${esc(truncate(l, p.grade ? 40 : 52))}</text>`).join('') +
      bio.map((l, i) => `<text x="${tx}" y="${bioTop + i * 16}" class="fg" font-size="12">${esc(l)}</text>`).join('');
    const textBottom = Math.max(top + avatarSize, bioTop + bio.length * 16 - 10);
    const statsY = textBottom + 32;
    let height = statsY + 40;
    let langs = '';
    if (p.languages && languages.length) {
      langs = langBar(PAD, statsY + 38, width - PAD * 2);
      height = statsY + 38 + 48;
    }
    return frame(avatarAt(PAD, top, avatarSize) + text + ringAt(width - PAD - 30, top + 32) + statsRow(PAD, statsY, width - PAD * 2) + langs, {
      width,
      height,
      theme,
      title: header,
      label
    });
  }
});
