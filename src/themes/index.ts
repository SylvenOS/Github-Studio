export interface Palette {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  border: string;
}

export interface Theme extends Palette {
  name: string;
  fontFamily: string;
  borderRadius: number;
}

/** A theme after query overrides; `dark` is set for `theme=auto` and applied via prefers-color-scheme. */
export interface ResolvedTheme extends Theme {
  dark?: Palette;
  hideBorder?: boolean;
}

const SANS = 'Segoe UI, Helvetica, Arial, sans-serif';

const t = (
  name: string,
  background: string,
  foreground: string,
  muted: string,
  accent: string,
  border: string,
  borderRadius = 6,
  fontFamily = SANS
): [string, Theme] => [name, { name, background, foreground, muted, accent, border, fontFamily, borderRadius }];

export const themes: Record<string, Theme> = Object.fromEntries([
  t('default', '#ffffff', '#24292e', '#586069', '#0366d6', '#e1e4e8'),
  t('dark', '#0d1117', '#c9d1d9', '#8b949e', '#58a6ff', '#30363d'),
  t('github_dark', '#0d1117', '#e6edf3', '#7d8590', '#2f81f7', '#30363d'),
  t('sylven', '#0a0a0a', '#f3f4f6', '#9ca3af', '#8b5cf6', '#27272a', 16, 'Inter, sans-serif'),
  t('dracula', '#282a36', '#f8f8f2', '#6272a4', '#ff79c6', '#44475a', 10),
  t('monokai', '#272822', '#f8f8f2', '#75715e', '#f92672', '#3e3d32'),
  t('radical', '#141321', '#a9fef7', '#fe428e', '#f8d847', '#141321', 10),
  t('tokyonight', '#1a1b26', '#c0caf5', '#565f89', '#7aa2f7', '#292e42', 12),
  t('cyberpunk', '#fdf6e3', '#002b36', '#586e75', '#268bd2', '#eee8d5', 0, 'Courier New, monospace'),
  t('neon', '#000000', '#ffffff', '#a8a8a8', '#39ff14', '#39ff14', 8, 'Inter, sans-serif'),
  t('nord', '#2e3440', '#eceff4', '#81a1c1', '#88c0d0', '#434c5e', 8),
  t('gruvbox', '#282828', '#ebdbb2', '#a89984', '#fabd2f', '#3c3836'),
  t('solarized', '#002b36', '#93a1a1', '#657b83', '#b58900', '#073642'),
  t('catppuccin', '#1e1e2e', '#cdd6f4', '#a6adc8', '#cba6f7', '#313244', 12)
]);

export interface ThemeOverrides {
  bg?: string;
  fg?: string;
  muted?: string;
  accent?: string;
  border?: string;
}

export function resolveTheme(
  name: string,
  overrides: ThemeOverrides = {},
  opts: { radius?: number | null; font?: string; hideBorder?: boolean } = {}
): ResolvedTheme {
  const auto = name === 'auto';
  const base = auto ? themes.default : themes[name] ?? themes.default;
  const apply = (p: Palette): Palette => ({
    background: overrides.bg ?? p.background,
    foreground: overrides.fg ?? p.foreground,
    muted: overrides.muted ?? p.muted,
    accent: overrides.accent ?? p.accent,
    border: overrides.border ?? p.border
  });
  return {
    ...base,
    ...apply(base),
    fontFamily: opts.font ?? base.fontFamily,
    borderRadius: opts.radius ?? base.borderRadius,
    hideBorder: opts.hideBorder,
    dark: auto ? apply(themes.github_dark) : undefined
  };
}
