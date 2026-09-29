import { Theme } from '../themes';

export interface RenderOptions {
  width: number;
  height: number;
  theme: Theme;
  animate?: boolean;
}

export function renderSVG(content: string, options: RenderOptions): string {
  const { width, height, theme } = options;
  
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .header { font: 600 18px '${theme.fontFamily}'; fill: ${theme.accent}; }
    .stat-value { font: 600 16px '${theme.fontFamily}'; fill: ${theme.foreground}; }
    .stat-label { font: 400 12px '${theme.fontFamily}'; fill: ${theme.muted}; }
    ${options.animate ? `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    .fade-in { animation: fadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
    .fade-in:nth-child(1) { animation-delay: 0.1s; }
    .fade-in:nth-child(2) { animation-delay: 0.2s; }
    .fade-in:nth-child(3) { animation-delay: 0.3s; }
    .fade-in:nth-child(4) { animation-delay: 0.4s; }
    .fade-in:nth-child(5) { animation-delay: 0.5s; }
    .pulse { animation: pulse 2s infinite; }
    ` : ''}
  </style>
  <defs>
    <radialGradient id="cardGrad" cx="0%" cy="0%" r="100%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${theme.background}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.5" />
      <stop offset="100%" stop-color="${theme.border}" stop-opacity="0.8" />
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${theme.borderRadius}" fill="${theme.background}" stroke="url(#borderGrad)" stroke-width="1.5" />
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${theme.borderRadius}" fill="url(#cardGrad)" pointer-events="none" />
  ${content}
</svg>
  `.trim();
}
