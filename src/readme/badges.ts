import { languageColor } from '../svg/colors';
import type { BadgeItem } from './spec';

export interface Social {
  label: string;
  color: string;
  logo: string;
  /** Builds the link from the user's handle. */
  url: (handle: string) => string;
}

/** Supported networks for `{ kind: 'social', name, handle }`. Add an entry to support another. */
export const SOCIALS: Record<string, Social> = {
  github: { label: 'GitHub', color: '181717', logo: 'github', url: (h) => `https://github.com/${h}` },
  twitter: { label: 'Twitter', color: '1DA1F2', logo: 'twitter', url: (h) => `https://twitter.com/${h}` },
  x: { label: 'X', color: '000000', logo: 'x', url: (h) => `https://x.com/${h}` },
  linkedin: { label: 'LinkedIn', color: '0A66C2', logo: 'linkedin', url: (h) => `https://linkedin.com/in/${h}` },
  youtube: { label: 'YouTube', color: 'FF0000', logo: 'youtube', url: (h) => `https://youtube.com/@${h}` },
  instagram: { label: 'Instagram', color: 'E4405F', logo: 'instagram', url: (h) => `https://instagram.com/${h}` },
  twitch: { label: 'Twitch', color: '9146FF', logo: 'twitch', url: (h) => `https://twitch.tv/${h}` },
  discord: { label: 'Discord', color: '5865F2', logo: 'discord', url: (h) => `https://discord.gg/${h}` },
  mastodon: { label: 'Mastodon', color: '6364FF', logo: 'mastodon', url: (h) => h },
  bluesky: { label: 'Bluesky', color: '0285FF', logo: 'bluesky', url: (h) => `https://bsky.app/profile/${h}` },
  devto: { label: 'DEV', color: '0A0A0A', logo: 'devdotto', url: (h) => `https://dev.to/${h}` },
  medium: { label: 'Medium', color: '12100E', logo: 'medium', url: (h) => `https://medium.com/@${h}` },
  hashnode: { label: 'Hashnode', color: '2962FF', logo: 'hashnode', url: (h) => `https://${h}.hashnode.dev` },
  stackoverflow: { label: 'Stack Overflow', color: 'F58025', logo: 'stackoverflow', url: (h) => `https://stackoverflow.com/users/${h}` },
  reddit: { label: 'Reddit', color: 'FF4500', logo: 'reddit', url: (h) => `https://reddit.com/u/${h}` },
  telegram: { label: 'Telegram', color: '26A5E4', logo: 'telegram', url: (h) => `https://t.me/${h}` },
  npm: { label: 'npm', color: 'CB3837', logo: 'npm', url: (h) => `https://npmjs.com/~${h}` },
  kaggle: { label: 'Kaggle', color: '20BEFF', logo: 'kaggle', url: (h) => `https://kaggle.com/${h}` },
  leetcode: { label: 'LeetCode', color: 'FFA116', logo: 'leetcode', url: (h) => `https://leetcode.com/${h}` },
  codepen: { label: 'CodePen', color: '000000', logo: 'codepen', url: (h) => `https://codepen.io/${h}` },
  kofi: { label: 'Ko-fi', color: 'FF5E5B', logo: 'kofi', url: (h) => `https://ko-fi.com/${h}` },
  sponsor: { label: 'Sponsor', color: 'EA4AAA', logo: 'githubsponsors', url: (h) => `https://github.com/sponsors/${h}` },
  website: { label: 'Website', color: '4285F4', logo: 'googlechrome', url: (h) => h },
  email: { label: 'Email', color: 'D14836', logo: 'gmail', url: (h) => `mailto:${h}` }
};

/** Networks where the "handle" is really a full https URL. */
const URL_HANDLES = new Set(['website', 'mastodon']);
const HANDLE = /^[\w.@+~\-/%]{1,120}$/;

/** simple-icons slugs and brand colours for technologies whose name doesn't map directly. */
const TECH: Record<string, { slug: string; color?: string }> = {
  'node.js': { slug: 'nodedotjs', color: '339933' }, nodejs: { slug: 'nodedotjs', color: '339933' },
  'next.js': { slug: 'nextdotjs', color: '000000' }, nextjs: { slug: 'nextdotjs', color: '000000' },
  'vue.js': { slug: 'vuedotjs', color: '4FC08D' }, vue: { slug: 'vuedotjs', color: '4FC08D' },
  'nuxt.js': { slug: 'nuxtdotjs', color: '00DC82' }, 'c++': { slug: 'cplusplus', color: '00599C' }, 'c#': { slug: 'csharp', color: '512BD4' },
  '.net': { slug: 'dotnet', color: '512BD4' }, html: { slug: 'html5', color: 'E34F26' }, html5: { slug: 'html5', color: 'E34F26' },
  css: { slug: 'css3', color: '1572B6' }, css3: { slug: 'css3', color: '1572B6' }, javascript: { slug: 'javascript', color: 'F7DF1E' },
  typescript: { slug: 'typescript', color: '3178C6' }, python: { slug: 'python', color: '3776AB' }, java: { slug: 'openjdk', color: 'ED8B00' },
  go: { slug: 'go', color: '00ADD8' }, golang: { slug: 'go', color: '00ADD8' }, rust: { slug: 'rust', color: '000000' }, react: { slug: 'react', color: '61DAFB' },
  angular: { slug: 'angular', color: 'DD0031' }, svelte: { slug: 'svelte', color: 'FF3E00' }, tailwind: { slug: 'tailwindcss', color: '06B6D4' },
  tailwindcss: { slug: 'tailwindcss', color: '06B6D4' }, docker: { slug: 'docker', color: '2496ED' }, kubernetes: { slug: 'kubernetes', color: '326CE5' },
  postgres: { slug: 'postgresql', color: '4169E1' }, postgresql: { slug: 'postgresql', color: '4169E1' }, mysql: { slug: 'mysql', color: '4479A1' },
  mongodb: { slug: 'mongodb', color: '47A248' }, redis: { slug: 'redis', color: 'DC382D' }, graphql: { slug: 'graphql', color: 'E10098' },
  aws: { slug: 'amazonwebservices', color: '232F3E' }, linux: { slug: 'linux', color: 'FCC624' }, git: { slug: 'git', color: 'F05032' },
  cloudflare: { slug: 'cloudflare', color: 'F38020' }, swift: { slug: 'swift', color: 'F05138' }, kotlin: { slug: 'kotlin', color: '7F52FF' },
  php: { slug: 'php', color: '777BB4' }, ruby: { slug: 'ruby', color: 'CC342D' }, flutter: { slug: 'flutter', color: '02569B' }
};

const enc = (s: string) => encodeURIComponent(s.replace(/-/g, '--').replace(/_/g, '__').replace(/ /g, '_'));

/** Black text on light badge colours, white on dark. */
function logoColor(hex: string): string {
  const n = Number.parseInt(hex.padEnd(6, '0').slice(0, 6), 16);
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 > 0.62 ? 'black' : 'white';
}

export function shieldUrl(label: string, message: string | undefined, color: string, style: string, logo?: string): string {
  const path = message ? `${enc(label)}-${enc(message)}-${color}` : `${enc(label)}-${color}`;
  const qs = new URLSearchParams({ style });
  if (logo) {
    qs.set('logo', logo);
    qs.set('logoColor', logoColor(color));
  }
  return `https://img.shields.io/badge/${path}?${qs}`;
}

export interface ResolvedBadge {
  alt: string;
  src: string;
  href?: string;
}

/** Turns a badge item into an image URL (and link). Returns null when the item is unusable. */
export function resolveBadge(item: BadgeItem, style: string, ctx: { origin: string; username: string; theme: string }): ResolvedBadge | null {
  if (item.kind === 'stat') {
    if (!item.name) return null;
    const qs = new URLSearchParams({ username: ctx.username, stat: item.name, style: style === 'for-the-badge' ? 'for-the-badge' : 'flat' });
    if (ctx.theme !== 'default') qs.set('theme', ctx.theme);
    if (item.color) qs.set('color', item.color);
    return { alt: item.name, src: `${ctx.origin}/api/badge?${qs}`, href: `https://github.com/${ctx.username}` };
  }

  if (item.kind === 'social') {
    const net = SOCIALS[(item.name ?? '').toLowerCase()];
    if (!net) return null;
    const handle = (item.handle ?? '').trim();
    const href = URL_HANDLES.has((item.name ?? '').toLowerCase())
      ? item.url ?? (/^https?:\/\/[^\s"'<>]+$/i.test(handle) ? handle : undefined)
      : item.url ?? (HANDLE.test(handle) ? net.url(handle) : undefined);
    const color = item.color ?? net.color;
    return { alt: net.label, src: shieldUrl(item.label ?? net.label, item.message, color, style, item.logo ?? net.logo), href };
  }

  if (item.kind === 'tech') {
    const name = (item.name ?? '').trim();
    if (!name) return null;
    const known = TECH[name.toLowerCase()];
    const lang = languageColor(name);
    const color = item.color ?? known?.color ?? (/^#[0-9a-f]{6}$/i.test(lang) ? lang.slice(1) : '555555');
    const slug = item.logo ?? known?.slug ?? name.toLowerCase().replace(/\+/g, 'plus').replace(/#/g, 'sharp').replace(/[^a-z0-9]/g, '');
    return { alt: name, src: shieldUrl(item.label ?? name, item.message, color, style, slug), href: item.url };
  }

  // custom
  if (!item.label) return null;
  return { alt: item.label, src: shieldUrl(item.label, item.message, item.color ?? '555555', style, item.logo), href: item.url };
}
