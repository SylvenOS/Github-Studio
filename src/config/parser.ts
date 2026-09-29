import { themes } from '../themes';

export interface CardConfig {
  username: string;
  repo?: string;
  theme: string;
  layout: string;
  showIcons: boolean;
  animation: boolean;
  radius: number | null;
  customization: {
    background?: string;
    foreground?: string;
    accent?: string;
    border?: string;
    muted?: string;
  };
}

export function parseCardConfig(query: Record<string, string>): CardConfig {
  // In a real app, use Zod for validation
  return {
    username: query.username || '',
    repo: query.repo,
    theme: themes[query.theme] ? query.theme : 'default',
    layout: query.layout || 'grid',
    showIcons: query.show_icons === 'true',
    animation: query.animation !== 'false', // Defaults to true
    radius: query.radius ? parseInt(query.radius, 10) : null,
    customization: {
      background: query.bg ? `#${query.bg}` : undefined,
      foreground: query.fg ? `#${query.fg}` : undefined,
      accent: query.accent ? `#${query.accent}` : undefined,
      border: query.border ? `#${query.border}` : undefined,
      muted: query.muted ? `#${query.muted}` : undefined,
    }
  };
}
