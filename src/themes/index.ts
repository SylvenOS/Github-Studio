export interface Theme {
  name: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  border: string;
  fontFamily: string;
  borderRadius: number;
}

export const themes: Record<string, Theme> = {
  default: {
    name: 'default',
    background: '#ffffff',
    foreground: '#24292e',
    muted: '#586069',
    accent: '#0366d6',
    border: '#e1e4e8',
    fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif',
    borderRadius: 6
  },
  dark: {
    name: 'dark',
    background: '#0d1117',
    foreground: '#c9d1d9',
    muted: '#8b949e',
    accent: '#58a6ff',
    border: '#30363d',
    fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif',
    borderRadius: 6
  },
  sylven: {
    name: 'sylven',
    background: '#0a0a0a',
    foreground: '#f3f4f6',
    muted: '#9ca3af',
    accent: '#8b5cf6', // A nice purple
    border: '#27272a',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 16
  },
  dracula: {
    name: 'dracula',
    background: '#282a36',
    foreground: '#f8f8f2',
    muted: '#6272a4',
    accent: '#ff79c6',
    border: '#44475a',
    fontFamily: 'Segoe UI, sans-serif',
    borderRadius: 10
  },
  monokai: {
    name: 'monokai',
    background: '#272822',
    foreground: '#f8f8f2',
    muted: '#75715e',
    accent: '#f92672',
    border: '#3e3d32',
    fontFamily: 'Segoe UI, sans-serif',
    borderRadius: 6
  },
  radical: {
    name: 'radical',
    background: '#141321',
    foreground: '#a9fef7',
    muted: '#fe428e',
    accent: '#f8d847',
    border: '#141321',
    fontFamily: 'Segoe UI, sans-serif',
    borderRadius: 10
  },
  tokyonight: {
    name: 'tokyonight',
    background: '#1a1b26',
    foreground: '#c0caf5',
    muted: '#565f89',
    accent: '#7aa2f7',
    border: '#292e42',
    fontFamily: 'Segoe UI, sans-serif',
    borderRadius: 12
  },
  cyberpunk: {
    name: 'cyberpunk',
    background: '#fdf6e3',
    foreground: '#002b36',
    muted: '#586e75',
    accent: '#268bd2',
    border: '#eee8d5',
    fontFamily: 'Courier New, monospace',
    borderRadius: 0
  },
  neon: {
    name: 'neon',
    background: '#000000',
    foreground: '#ffffff',
    muted: '#a8a8a8',
    accent: '#39ff14',
    border: '#39ff14',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 8
  }
};
