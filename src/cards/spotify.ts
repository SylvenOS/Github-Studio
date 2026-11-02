import { defineCard } from './types';
import { upstream } from '../core/errors';
import { bool, oneOf } from '../core/params';
import { esc, truncate } from '../core/text';
import { imageDataUri, safeFetch, safeJson } from '../providers/fetch';
import { frame, PAD } from '../svg/frame';
import type { Env } from '../types';

const LAYOUTS = ['card', 'compact', 'bar'] as const;
const SHOW = ['auto', 'now', 'recent'] as const;

interface Track {
  title: string;
  artist: string;
  album: string;
  url: string | null;
  cover: string | null;
  playing: boolean;
  progress: number | null;
}

interface Params {
  layout: (typeof LAYOUTS)[number];
  show: (typeof SHOW)[number];
  cover: boolean;
  equalizer: boolean;
}

// access tokens live for an hour; keep one per isolate (never written to any shared cache)
let access: { token: string; until: number; key: string } | undefined;

async function accessToken(env: Env): Promise<string> {
  const key = env.SPOTIFY_CLIENT_ID ?? '';
  if (access && access.key === key && access.until > Date.now() + 30_000) return access.token;
  const res = await safeFetch('https://accounts.spotify.com/api/token', {
    hosts: ['accounts.spotify.com'],
    name: 'Spotify',
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(env.SPOTIFY_REFRESH_TOKEN ?? '')}`
  });
  if (!res.ok) throw upstream('Spotify rejected the configured credentials');
  const j = (await res.json()) as { access_token: string; expires_in: number };
  access = { token: j.access_token, until: Date.now() + j.expires_in * 1000, key };
  return j.access_token;
}

const API = { hosts: ['api.spotify.com'], name: 'Spotify' };

function toTrack(item: any, playing: boolean, progress: number | null): Track | null {
  if (!item) return null;
  const images: { url: string; width: number }[] = item.album?.images ?? item.images ?? [];
  const small = [...images].sort((a, b) => a.width - b.width).find((i) => i.width >= 64) ?? images[0];
  return {
    title: item.name ?? 'Unknown',
    artist: (item.artists ?? []).map((a: any) => a.name).join(', ') || item.show?.name || '',
    album: item.album?.name ?? item.show?.name ?? '',
    url: item.external_urls?.spotify ?? null,
    cover: small?.url ?? null,
    playing,
    progress: progress !== null && item.duration_ms ? Math.min(1, progress / item.duration_ms) : null
  };
}

export const spotifyCard = defineCard<Params, Track | null>({
  id: 'spotify',
  aliases: ['now-playing', 'music'],
  category: 'integrations',
  needsUser: false,
  tags: ['spotify', 'music', 'now playing', 'recently played', 'integration'],
  variants: [{ label: 'Card' }, { label: 'Compact', params: { layout: 'compact' } }, { label: 'Progress bar', params: { layout: 'bar' } }],
  title: 'Spotify Now Playing',
  description: 'What the server owner is listening to on Spotify right now, or their last played track. Needs SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN on the server (one account per deployment).',
  cacheSeconds: 60,
  params: [
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'card', description: 'Presentation' },
    { name: 'show', type: 'enum', options: [...SHOW], default: 'auto', description: 'auto = now playing, else last played' },
    { name: 'cover', type: 'boolean', default: true, description: 'Show album art' },
    { name: 'equalizer', type: 'boolean', default: true, description: 'Animated equalizer while playing (only with animation=true)' }
  ],
  parse: (q) => ({ layout: oneOf(q.layout, LAYOUTS, 'card'), show: oneOf(q.show, SHOW, 'auto'), cover: bool(q.cover, true), equalizer: bool(q.equalizer, true) }),

  async load(_client, p, _common, { env }) {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
      throw upstream('Spotify is not configured on this server');
    }
    const token = await accessToken(env);
    const headers = { Authorization: `Bearer ${token}` };
    let track: Track | null = null;
    if (p.show !== 'recent') {
      const res = await safeFetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode', { ...API, headers });
      if (res.status === 200) {
        const j = (await res.json()) as any;
        if (j?.item && j.is_playing) track = toTrack(j.item, true, j.progress_ms ?? null);
      } else if (res.status >= 400 && res.status !== 404) throw upstream(`Spotify responded with ${res.status}`);
    }
    if (!track && p.show !== 'now') {
      const { data } = await safeJson<any>('https://api.spotify.com/v1/me/player/recently-played?limit=1', { ...API, headers });
      track = toTrack(data?.items?.[0]?.track, false, null);
    }
    if (track?.cover && p.cover) {
      track.cover = await imageDataUri(track.cover, { hosts: ['i.scdn.co'], name: 'Spotify', maxBytes: 300_000 });
    } else if (track) track.cover = null;
    return track;
  },

  render(t, p, { theme, common }) {
    const animate = common.animation;
    const status = t ? (t.playing ? 'Now playing' : 'Last played') : 'Not playing';
    const label = t ? `${status} on Spotify: ${t.title} by ${t.artist}` : 'Not playing anything on Spotify';
    const green = '#1DB954';
    const logo = (x: number, y: number, s = 1) =>
      `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="8" cy="8" r="8" fill="${green}"/><path d="M4 6.2c2.7-.8 5.6-.6 8 .7M4.5 8.6c2.2-.6 4.5-.4 6.5.6M5 10.9c1.7-.4 3.4-.3 5 .5" stroke="#000" stroke-width="1.2" stroke-linecap="round" fill="none"/></g>`;
    const eq = (x: number, y: number) =>
      t?.playing && p.equalizer && animate
        ? `<style>@keyframes eq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}.eqb{transform-box:fill-box;transform-origin:bottom;animation:eq 1s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.eqb{animation:none}}</style>` +
          [0, 1, 2, 3].map((i) => `<rect x="${x + i * 5}" y="${y - 12}" width="3" height="12" fill="${green}" class="eqb" style="animation-delay:${(i * 0.18).toFixed(2)}s"/>`).join('')
        : '';

    if (p.layout === 'compact') {
      const W = 420;
      const body =
        logo(14, 12) +
        `<text x="40" y="25" class="fg" font-size="13" font-weight="600">${esc(t ? truncate(`${t.title} · ${t.artist}`, 46) : status)}</text>` +
        eq(W - 34, 26);
      return frame(body, { width: W, height: 40, theme, label });
    }

    const W = 460;
    const art = 92;
    const hasArt = !!t?.cover;
    const x = PAD + (hasArt ? art + 16 : 0);
    let body = '';
    if (hasArt) body += `<clipPath id="sp"><rect x="${PAD}" y="${PAD}" width="${art}" height="${art}" rx="8"/></clipPath><image href="${esc(t!.cover)}" x="${PAD}" y="${PAD}" width="${art}" height="${art}" clip-path="url(#sp)" preserveAspectRatio="xMidYMid slice"/>`;
    body +=
      logo(x, PAD) +
      `<text x="${x + 24}" y="${PAD + 12}" class="label muted" font-size="11.5" font-weight="600">${esc(status.toUpperCase())}</text>` +
      eq(W - PAD - 18, PAD + 14) +
      `<text x="${x}" y="${PAD + 42}" class="fg" font-size="17" font-weight="700">${esc(truncate(t?.title ?? 'Nothing right now', hasArt ? 30 : 40))}</text>` +
      `<text x="${x}" y="${PAD + 63}" class="muted" font-size="13">${esc(truncate(t?.artist ?? '', 42))}</text>` +
      `<text x="${x}" y="${PAD + 82}" class="muted" font-size="11.5" opacity=".8">${esc(truncate(t?.album ?? '', 46))}</text>`;
    if (p.layout === 'bar' && t?.progress !== null && t?.progress !== undefined) {
      const bw = W - PAD - x;
      body += `<rect x="${x}" y="${PAD + art - 6}" width="${bw}" height="4" rx="2" class="bd"/><rect x="${x}" y="${PAD + art - 6}" width="${(bw * t.progress).toFixed(1)}" height="4" rx="2" fill="${green}"/>`;
    }
    return frame(body, { width: W, height: art + PAD * 2, theme, label });
  }
});
