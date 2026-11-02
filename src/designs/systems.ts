import { compact, esc, fmt, truncate, wrap } from '../core/text';
import { initials, luminance, type ProfileModel } from './model';

export const DESIGNS = ['terminal', 'ide', 'editorial', 'dashboard', 'blueprint', 'retro'] as const;
export type DesignId = (typeof DESIGNS)[number];

/** The palette each design looks best in when no `theme` is given. */
export const SIGNATURE_THEME: Record<DesignId, string> = {
  terminal: 'terminal', ide: 'vscode', editorial: 'editorial', dashboard: 'linear', blueprint: 'blueprint', retro: 'retro'
};

export interface DesignOptions {
  animate: boolean;
  /** Sections to leave out: stats, languages, projects, activity, now, links. */
  hide: Set<string>;
  background: string;
  prompt: string;
}

export interface DesignOutput {
  body: string;
  width: number;
  height: number;
}

const MONO = "'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace";
const t = (x: number, y: number, s: string, attrs = '') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}"${attrs ? ' ' + attrs : ''}>${esc(s)}</text>`;
const show = (o: DesignOptions, part: string) => !o.hide.has(part);

function sparkline(weeks: number[], x: number, y: number, w: number, h: number, cls = 'sk-ser', fill = true): string {
  if (!weeks.length) return '';
  const max = Math.max(1, ...weeks);
  const step = w / Math.max(1, weeks.length - 1);
  const pts = weeks.map((v, i) => [x + i * step, y + h - (v / max) * h] as const);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  return (fill ? `<path d="${line} L${(x + w).toFixed(1)} ${y + h} L${x} ${y + h} Z" class="ser" fill-opacity=".15"/>` : '') +
    `<path d="${line}" fill="none" class="${cls}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function langBar(m: ProfileModel, x: number, y: number, w: number, h = 8, rx = 4): string {
  if (!m.languages.length) return '';
  let cx = x;
  const id = `lb${Math.round(x)}${Math.round(y)}`;
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath><g clip-path="url(#${id})">` +
    m.languages.map((l) => {
      const lw = (l.pct / 100) * w;
      const r = `<rect x="${cx.toFixed(1)}" y="${y}" width="${lw.toFixed(1)}" height="${h}" fill="${esc(l.color)}"/>`;
      cx += lw;
      return r;
    }).join('') + '</g>';
}

const STAT_LIST = (m: ProfileModel): [string, string][] => [
  ['Stars', compact(m.stats.stars)],
  ['Followers', compact(m.stats.followers)],
  ['Contributions (1y)', fmt(m.stats.contributions)],
  ['Pull requests', compact(m.stats.pullRequests)],
  ['Current streak', `${m.streak.current}d`],
  ['Public repos', fmt(m.stats.repos)]
];

// ---- Terminal OS -------------------------------------------------------------------------------

function terminal(m: ProfileModel, o: DesignOptions): DesignOutput {
  const W = 840;
  const font = `font-family="${MONO}"`;
  let b = `<rect x="0" y="0" width="${W}" height="38" class="bd" fill-opacity=".6"/>` +
    `<circle cx="22" cy="19" r="6" fill="#ff5f56"/><circle cx="42" cy="19" r="6" fill="#ffbd2e"/><circle cx="62" cy="19" r="6" fill="#27c93f"/>` +
    t(W / 2, 24, `${m.login}@github: ~`, `class="muted" font-size="12.5" text-anchor="middle" ${font}`);
  const P = (y: number, cmd: string) => `<text x="28" y="${y}" font-size="14" ${font}><tspan class="accent">${esc(o.prompt)}</tspan><tspan class="muted">:~$ </tspan><tspan class="fg">${esc(cmd)}</tspan></text>`;
  let y = 70;
  b += P(y, 'neofetch');
  y += 18;
  // monogram block
  const box = 150;
  b += `<rect x="28" y="${y}" width="${box}" height="${box}" rx="12" class="accent" fill-opacity=".12"/>` +
    `<rect x="28.5" y="${y + 0.5}" width="${box - 1}" height="${box - 1}" rx="12" fill="none" class="sk-accent" stroke-opacity=".5"/>` +
    t(28 + box / 2, y + box / 2 + 22, initials(m.name), `class="accent" font-size="62" font-weight="700" text-anchor="middle" ${font}`);
  const info: [string, string][] = [
    ['user', `${m.name}${m.pronouns ? ` (${m.pronouns})` : ''}`] as [string, string],
    ...(m.role ? [['role', m.role] as [string, string]] : []),
    ...(m.location ? [['location', m.location] as [string, string]] : []),
    ...(m.company ? [['company', m.company] as [string, string]] : []),
    ...(show(o, 'stats') ? [
      ['uptime', `${m.years} year${m.years === 1 ? '' : 's'} on GitHub`] as [string, string],
      ['stars', `${fmt(m.stats.stars)} · followers ${fmt(m.stats.followers)}`] as [string, string],
      ['commits', `${fmt(m.stats.contributions)} contributions (1y) · streak ${m.streak.current}d`] as [string, string]
    ] : []),
    ...(show(o, 'languages') && m.languages.length ? [['stack', m.languages.slice(0, 4).map((l) => l.name).join(', ')] as [string, string]] : [])
  ].slice(0, 8);
  info.forEach(([k, v], i) => {
    const iy = y + 16 + i * 19;
    b += t(210, iy, k, `class="accent" font-weight="700" font-size="13.5" ${font}`) + t(296, iy, truncate(v, 60), `class="fg" font-size="13.5" ${font}`);
  });
  const palette = ['#ff5f56', '#ffbd2e', '#27c93f', '#58a6ff', '#a371f7', '#39c5cf', '#e2e8f0', '#64748b'];
  palette.forEach((c, i) => (b += `<rect x="${210 + i * 24}" y="${y + Math.max(info.length, 6) * 19 + 8}" width="20" height="12" fill="${c}"/>`));
  y += Math.max(box, Math.max(info.length, 6) * 19 + 26) + 28;

  if (m.intro) {
    b += P(y, 'cat about.txt');
    wrap(m.intro, 92, 3).forEach((l, i) => (b += t(28, y + 22 + i * 19, l, `class="fg" font-size="13.5" ${font}`)));
    y += 22 + Math.min(3, wrap(m.intro, 92, 3).length) * 19 + 16;
  }
  if (show(o, 'projects') && m.projects.length) {
    b += P(y, 'ls -l ~/projects');
    m.projects.forEach((p, i) => {
      const py = y + 22 + i * 19;
      b += t(28, py, 'drwxr-xr-x', `class="muted" font-size="13.5" ${font}`) + t(170, py, `★ ${compact(p.stars)}`, `class="muted" font-size="13.5" text-anchor="end" ${font}`) +
        t(190, py, truncate(p.name, 22), `class="accent" font-weight="700" font-size="13.5" ${font}`) + t(390, py, truncate(p.description ?? '', 52), `class="fg" font-size="13.5" ${font}`);
    });
    y += 22 + m.projects.length * 19 + 16;
  }
  if (show(o, 'languages') && m.languages.length) {
    b += P(y, 'gitpulse langs --top');
    m.languages.forEach((l, i) => {
      const ly = y + 22 + i * 19;
      const blocks = Math.round(l.pct / 4);
      b += t(28, ly, truncate(l.name, 16), `class="fg" font-size="13.5" ${font}`);
      for (let c = 0; c < 25; c++) b += `<rect x="${170 + c * 10}" y="${ly - 11}" width="8" height="13" ${c < blocks ? `fill="${esc(l.color)}"` : 'class="muted" fill-opacity=".25"'}/>`;
      b += t(430, ly, `${l.pct.toFixed(1)}%`, `class="muted" font-size="13.5" ${font}`);
    });
    y += 22 + m.languages.length * 19 + 16;
  }
  if (show(o, 'now') && m.now) {
    b += P(y, 'echo $NOW');
    b += t(28, y + 22, m.now, `class="fg" font-size="13.5" ${font}`);
    y += 22 + 19 + 16;
  }
  b += P(y, '');
  b += `<rect x="${28 + (o.prompt.length + 4) * 8.4}" y="${y - 13}" width="9" height="17" class="accent${o.animate ? ' blink' : ''}"/>`;
  if (o.animate) b += '<style>@keyframes blink{50%{opacity:0}}.blink{animation:blink 1s step-end infinite}@media (prefers-reduced-motion:reduce){.blink{animation:none}}</style>';
  return { body: b, width: W, height: y + 24 };
}

// ---- Code Studio (IDE) ---------------------------------------------------------------------------

function ide(m: ProfileModel, o: DesignOptions): DesignOutput {
  const W = 840;
  const light = luminance(o.background) > 0.5;
  const c = light
    ? { key: '#001080', str: '#a31515', num: '#098658', kw: '#0000ff', kw2: '#af00db', com: '#008000', fn: '#795e26', bar: '#007acc' }
    : { key: '#9cdcfe', str: '#ce9178', num: '#b5cea8', kw: '#569cd6', kw2: '#c586c0', com: '#6a9955', fn: '#dcdcaa', bar: '#007acc' };
  const font = `font-family="${MONO}"`;
  const side = 200;
  const act = 44;
  // code lines: array of [indent, tokens]
  type Tok = [string, string];
  const lines: Tok[][] = [];
  const s = (v: string): Tok => [c.str, JSON.stringify(v)];
  const k = (v: string): Tok => [c.key, v];
  const p = (v: string): Tok => ['', v];
  lines.push([[c.com, `// ${m.login}.ts - generated by GitPulse`]]);
  lines.push([[c.kw2, 'import'], p(' { '), [c.fn, 'Developer'], p(' } '), [c.kw2, 'from'], p(' '), s('@github/profile'), p(';')]);
  lines.push([]);
  lines.push([[c.kw, 'const'], p(' '), [c.fn, 'me'], p(': '), [c.fn, 'Developer'], p(' = {')]);
  lines.push([p('  '), k('name'), p(': '), s(m.name), p(',')]);
  if (m.role) lines.push([p('  '), k('role'), p(': '), s(m.role), p(',')]);
  if (m.location) lines.push([p('  '), k('location'), p(': '), s(m.location), p(',')]);
  if (show(o, 'languages') && m.languages.length) lines.push([p('  '), k('stack'), p(': ['), ...m.languages.slice(0, 4).flatMap((l, i): Tok[] => [s(l.name), p(i < Math.min(4, m.languages.length) - 1 ? ', ' : '')]), p('],')]);
  if (show(o, 'now') && m.now) lines.push([p('  '), k('currentlyBuilding'), p(': '), s(truncate(m.now, 46)), p(',')]);
  if (show(o, 'stats')) {
    lines.push([p('  '), k('stats'), p(': {')]);
    lines.push([p('    '), k('stars'), p(': '), [c.num, String(m.stats.stars)], p(', '), k('followers'), p(': '), [c.num, String(m.stats.followers)], p(',')]);
    lines.push([p('    '), k('contributions'), p(': '), [c.num, String(m.stats.contributions)], p(', '), k('streak'), p(': '), [c.num, String(m.streak.current)], p(',')]);
    lines.push([p('  },')]);
  }
  lines.push([p('};')]);
  lines.push([]);
  lines.push([[c.kw2, 'export default'], p(' '), [c.fn, 'me'], p(';')]);

  const top = 36 + 34; // title bar + tabs
  const lh = 20;
  const codeX = act + side + 52;
  let b = `<rect x="0" y="0" width="${W}" height="36" class="bd" fill-opacity=".8"/>` +
    `<circle cx="20" cy="18" r="6" fill="#ff5f56"/><circle cx="40" cy="18" r="6" fill="#ffbd2e"/><circle cx="60" cy="18" r="6" fill="#27c93f"/>` +
    t(W / 2, 23, `${m.login} — Code Studio`, 'class="muted" font-size="12" text-anchor="middle"');
  // activity bar + explorer
  b += `<rect x="0" y="36" width="${act}" height="9999" class="bd" fill-opacity=".45"/>`;
  [0, 1, 2, 3].forEach((i) => (b += `<rect x="13" y="${54 + i * 40}" width="18" height="18" rx="4" class="${i === 0 ? 'accent' : 'muted'}" fill-opacity="${i === 0 ? 0.9 : 0.35}"/>`));
  b += `<rect x="${act}" y="36" width="${side}" height="9999" class="bd" fill-opacity=".22"/>` + t(act + 14, 60, 'EXPLORER', 'class="muted" font-size="10.5" letter-spacing="1.5"');
  const files: [string, string, boolean][] = [
    ['▾ ' + m.login, '', false], ['  README.md', '#519aba', false], [`  ${m.login}.ts`, '#3178c6', true], ['  stats.json', '#cbcb41', false],
    ...(show(o, 'projects') ? [['  ▾ projects', '', false] as [string, string, boolean], ...m.projects.slice(0, 5).map((pr): [string, string, boolean] => [`    ${truncate(pr.name, 18)}`, pr.color, false])] : [])
  ];
  files.forEach(([name, col, active], i) => {
    const fy = 84 + i * 22;
    if (active) b += `<rect x="${act}" y="${fy - 15}" width="${side}" height="22" class="accent" fill-opacity=".14"/>`;
    if (col) b += `<rect x="${act + 14 + (name.length - name.trimStart().length) * 6}" y="${fy - 9}" width="8" height="8" rx="2" fill="${esc(col)}"/>`;
    b += t(act + 26 + (name.length - name.trimStart().length) * 6, fy, name.trim(), `class="${active ? 'fg' : 'muted'}" font-size="12.5"`);
  });
  // tabs
  b += `<rect x="${act + side}" y="36" width="${W - act - side}" height="34" class="bd" fill-opacity=".35"/>`;
  b += `<rect x="${act + side}" y="36" width="150" height="34" class="bg"/><rect x="${act + side}" y="36" width="150" height="2" class="accent"/>` + t(act + side + 16, 58, `${m.login}.ts`, 'class="fg" font-size="12.5"');
  b += t(act + side + 168, 58, 'stats.json', 'class="muted" font-size="12.5"');
  // code
  lines.forEach((ln, i) => {
    const y = top + 26 + i * lh;
    b += t(act + side + 36, y, String(i + 1), `class="muted" font-size="12.5" text-anchor="end" ${font} opacity=".6"`);
    if (!ln.length) return;
    b += `<text x="${codeX}" y="${y}" font-size="13.5" ${font} xml:space="preserve">` + ln.map(([col, txt]) => `<tspan${col ? ` fill="${col}"` : ' class="fg"'}>${esc(txt)}</tspan>`).join('') + '</text>';
  });
  let y = top + 26 + lines.length * lh + 10;
  // bottom panel: terminal with activity sparkline
  if (show(o, 'activity')) {
    const ph = 96;
    b += `<rect x="${act + side}" y="${y}" width="${W - act - side}" height="${ph}" class="bd" fill-opacity=".25"/>` +
      t(act + side + 16, y + 20, 'PROBLEMS', 'class="muted" font-size="10.5" letter-spacing="1"') + t(act + side + 100, y + 20, 'OUTPUT', 'class="muted" font-size="10.5" letter-spacing="1"') +
      t(act + side + 170, y + 20, 'TERMINAL', 'class="fg" font-size="10.5" letter-spacing="1"') +
      `<rect x="${act + side + 170}" y="${y + 26}" width="64" height="1.5" class="accent"/>` +
      t(act + side + 16, y + 46, `$ gitpulse activity --weeks 26   # ${fmt(m.weeks.reduce((a, v) => a + v, 0))} contributions`, `class="fg" font-size="12" ${font}`) +
      sparkline(m.weeks, act + side + 16, y + 56, W - act - side - 40, 30);
    y += ph;
  }
  // status bar
  b += `<rect x="0" y="${y}" width="${W}" height="24" fill="${c.bar}"/>` +
    `<text x="12" y="${y + 16}" fill="#fff" font-size="11.5">⎇ main   ✓ ${esc(compact(m.stats.stars))} stars   ↑ ${esc(compact(m.stats.pullRequests))} PRs   🔥 ${m.streak.current}d streak</text>` +
    `<text x="${W - 12}" y="${y + 16}" fill="#fff" font-size="11.5" text-anchor="end">TypeScript   UTF-8   Ln ${lines.length}, Col 1</text>`;
  return { body: b.replace(/height="9999"/g, `height="${y - 36}"`), width: W, height: y + 24 };
}

// ---- Editorial ---------------------------------------------------------------------------------

function editorial(m: ProfileModel, o: DesignOptions): DesignOutput {
  const W = 840;
  const P = 44;
  const serif = 'font-family="Georgia,\'Times New Roman\',serif"';
  let b = t(P, 52, `${(m.role ?? 'DEVELOPER').toUpperCase()}${m.location ? ` · ${m.location.toUpperCase()}` : ''}`, 'class="accent" font-size="12" letter-spacing="3" font-weight="700"') +
    t(W - P, 52, `VOL. ${new Date().getUTCFullYear()} — GITHUB.COM/${m.login.toUpperCase()}`, 'class="muted" font-size="11" letter-spacing="2" text-anchor="end"') +
    `<line x1="${P}" y1="66" x2="${W - P}" y2="66" class="sk-fg" stroke-width="2"/>` +
    t(P, 136, truncate(m.name, 26), `class="fg" font-size="68" font-weight="700" ${serif} letter-spacing="-1.5"`);
  let y = 172;
  if (m.intro) {
    const ls = wrap(m.intro, 70, 3);
    ls.forEach((l, i) => (b += t(P, y + i * 30, l, `class="fg" font-size="21" ${serif} font-style="italic" opacity=".85"`)));
    y += ls.length * 30 + 10;
  }
  b += `<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" class="sk-bd" stroke-width="1"/>`;
  y += 34;
  const cols = [P, P + 300, P + 560];
  const colTop = y;
  let h = 0;
  if (show(o, 'projects') && m.projects.length) {
    b += t(cols[0], y, 'SELECTED WORK', 'class="accent" font-size="11" letter-spacing="2.5" font-weight="700"');
    m.projects.slice(0, 4).forEach((p, i) => {
      const py = y + 30 + i * 52;
      b += t(cols[0], py, truncate(p.name, 26), `class="fg" font-size="17" font-weight="700" ${serif}`) +
        t(cols[0], py + 18, truncate(p.description ?? `${p.language ?? 'Code'} · ★ ${compact(p.stars)}`, 40), 'class="muted" font-size="12"');
    });
    h = Math.max(h, 30 + Math.min(4, m.projects.length) * 52);
  }
  if (show(o, 'stats')) {
    b += t(cols[1], colTop, 'BY THE NUMBERS', 'class="accent" font-size="11" letter-spacing="2.5" font-weight="700"');
    STAT_LIST(m).slice(0, 4).forEach(([k, v], i) => {
      const sy = colTop + 40 + i * 50;
      b += t(cols[1], sy, v, `class="fg" font-size="30" font-weight="700" ${serif}`) + t(cols[1], sy + 17, k.toLowerCase(), 'class="muted" font-size="12"');
    });
    h = Math.max(h, 40 + 4 * 50);
  }
  if (show(o, 'languages') && m.languages.length) {
    b += t(cols[2], colTop, 'TOOLKIT', 'class="accent" font-size="11" letter-spacing="2.5" font-weight="700"');
    m.languages.forEach((l, i) => {
      const ly = colTop + 30 + i * 30;
      b += t(cols[2], ly, l.name, `class="fg" font-size="16" ${serif}`) + t(W - P, ly, `${Math.round(l.pct)}%`, 'class="muted" font-size="12" text-anchor="end"') +
        `<line x1="${cols[2]}" y1="${ly + 9}" x2="${W - P}" y2="${ly + 9}" class="sk-bd"/>` +
        `<line x1="${cols[2]}" y1="${ly + 9}" x2="${(cols[2] + ((W - P - cols[2]) * l.pct) / 100).toFixed(1)}" y2="${ly + 9}" stroke="${esc(l.color)}" stroke-width="2"/>`;
    });
    h = Math.max(h, 30 + m.languages.length * 30);
  }
  y = colTop + h + 22;
  if (show(o, 'now') && m.now) {
    b += `<rect x="${P}" y="${y}" width="${W - P * 2}" height="44" class="accent" fill-opacity=".08"/>` +
      t(P + 16, y + 28, 'NOW', 'class="accent" font-size="11" letter-spacing="2.5" font-weight="700"') + t(P + 70, y + 28, truncate(m.now, 80), `class="fg" font-size="15" ${serif} font-style="italic"`);
    y += 60;
  }
  b += `<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" class="sk-fg" stroke-width="2"/>`;
  if (show(o, 'links')) b += t(P, y + 24, m.links.join('   ·   '), 'class="muted" font-size="12" letter-spacing="1"');
  return { body: b, width: W, height: y + 44 };
}

// ---- Developer Dashboard ------------------------------------------------------------------------

function dashboard(m: ProfileModel, o: DesignOptions): DesignOutput {
  const W = 840;
  const P = 24;
  const panel = (x: number, y: number, w: number, h: number, title?: string) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" class="bd" fill-opacity=".38"/><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="12" fill="none" class="sk-bd"/>` +
    (title ? t(x + 16, y + 24, title.toUpperCase(), 'class="muted" font-size="10.5" letter-spacing="1.4" font-weight="600"') : '');
  // header
  let b = `<circle cx="${P + 24}" cy="${P + 26}" r="24" class="accent" fill-opacity=".18"/>` + t(P + 24, P + 33, initials(m.name), 'class="accent" font-size="18" font-weight="700" text-anchor="middle"') +
    t(P + 60, P + 22, m.name, 'class="fg" font-size="20" font-weight="700"') +
    t(P + 60, P + 42, [m.role, m.location, `@${m.login}`].filter(Boolean).join(' · '), 'class="muted" font-size="12.5"');
  const pill = m.status ? truncate(m.status, 34) : 'Open source';
  const pw = Math.min(260, Array.from(pill).length * 7 + 34);
  b += `<rect x="${W - P - pw}" y="${P + 12}" width="${pw}" height="26" rx="13" fill="#3fb950" fill-opacity=".14"/><circle cx="${W - P - pw + 14}" cy="${P + 25}" r="4" fill="#3fb950"/>` +
    t(W - P - pw + 26, P + 29.5, pill, 'fill="#3fb950" font-size="12" font-weight="600"');
  let y = P + 66;
  // KPI tiles
  if (show(o, 'stats')) {
    const kpis = STAT_LIST(m).slice(0, 5);
    const kw = (W - P * 2 - 12 * (kpis.length - 1)) / kpis.length;
    kpis.forEach(([k, v], i) => {
      const x = P + i * (kw + 12);
      b += panel(x, y, kw, 76) + t(x + 16, y + 26, k.toUpperCase(), 'class="muted" font-size="9.5" letter-spacing="1.2" font-weight="600"') + t(x + 16, y + 58, v, 'class="fg" font-size="24" font-weight="700"');
    });
    y += 76 + 14;
  }
  // activity + languages
  const leftW = (W - P * 2) * 0.62;
  const rightX = P + leftW + 14;
  const rightW = W - P - rightX;
  const rowH = 168;
  if (show(o, 'activity') || show(o, 'languages')) {
    if (show(o, 'activity')) {
      b += panel(P, y, show(o, 'languages') ? leftW : W - P * 2, rowH, 'Contributions · 26 weeks') +
        t((show(o, 'languages') ? P + leftW : W - P) - 16, y + 24, `${fmt(m.weeks.reduce((a, v) => a + v, 0))} total`, 'class="fg" font-size="12" text-anchor="end" font-weight="600"') +
        sparkline(m.weeks, P + 16, y + 44, (show(o, 'languages') ? leftW : W - P * 2) - 32, rowH - 64);
    }
    if (show(o, 'languages')) {
      const lx = show(o, 'activity') ? rightX : P;
      const lw = show(o, 'activity') ? rightW : W - P * 2;
      b += panel(lx, y, lw, rowH, 'Languages') + langBar(m, lx + 16, y + 40, lw - 32, 8);
      m.languages.forEach((l, i) => {
        const ly = y + 72 + i * 19;
        b += `<circle cx="${lx + 21}" cy="${ly - 4}" r="4" fill="${esc(l.color)}"/>` + t(lx + 32, ly, truncate(l.name, 18), 'class="fg" font-size="12"') + t(lx + lw - 16, ly, `${l.pct.toFixed(1)}%`, 'class="muted" font-size="12" text-anchor="end"');
      });
    }
    y += rowH + 14;
  }
  // projects table
  if (show(o, 'projects') && m.projects.length) {
    const th = 46 + m.projects.length * 30;
    b += panel(P, y, W - P * 2, th, 'Projects');
    b += t(W - P - 210, y + 24, 'LANGUAGE', 'class="muted" font-size="10" letter-spacing="1.2"') + t(W - P - 16, y + 24, 'STARS', 'class="muted" font-size="10" letter-spacing="1.2" text-anchor="end"');
    m.projects.forEach((p, i) => {
      const ry = y + 56 + i * 30;
      if (i) b += `<line x1="${P + 16}" y1="${ry - 20}" x2="${W - P - 16}" y2="${ry - 20}" class="sk-bd"/>`;
      b += `<circle cx="${P + 21}" cy="${ry - 4}" r="4" fill="#3fb950"/>` + t(P + 34, ry, truncate(`${p.owner === m.login ? '' : p.owner + '/'}${p.name}`, 28), 'class="fg" font-size="13" font-weight="600"') +
        t(P + 270, ry, truncate(p.description ?? '', 42), 'class="muted" font-size="12"') +
        `<circle cx="${W - P - 205}" cy="${ry - 4}" r="4" fill="${esc(p.color)}"/>` + t(W - P - 195, ry, p.language ?? '-', 'class="fg" font-size="12"') +
        t(W - P - 16, ry, compact(p.stars), 'class="fg" font-size="12.5" text-anchor="end" font-weight="600"');
    });
    y += th + 14;
  }
  if (show(o, 'now') && m.now) {
    b += panel(P, y, W - P * 2, 46) + t(P + 16, y + 28, 'NOW', 'class="accent" font-size="11" font-weight="700" letter-spacing="1.4"') + t(P + 60, y + 28, truncate(m.now, 90), 'class="fg" font-size="13"');
    y += 60;
  }
  return { body: b, width: W, height: y + P - 14 };
}

// ---- Blueprint ---------------------------------------------------------------------------------

function blueprint(m: ProfileModel, o: DesignOptions): DesignOutput {
  const W = 840;
  const font = `font-family="'Courier New',Consolas,monospace"`;
  const projects = show(o, 'projects') ? m.projects.slice(0, 4) : [];
  const H = 520;
  let b = `<defs><pattern id="bpg" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" class="sk-fg" stroke-opacity=".08"/></pattern>` +
    `<pattern id="bpG" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" class="sk-fg" stroke-opacity=".16"/></pattern></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bpg)"/><rect width="${W}" height="${H}" fill="url(#bpG)"/>` +
    `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" class="sk-fg" stroke-opacity=".7" stroke-width="1.5"/>`;
  // central node
  const cx = 360;
  const cy = 210;
  b += `<circle cx="${cx}" cy="${cy}" r="62" fill="none" class="sk-fg" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="70" fill="none" class="sk-fg" stroke-dasharray="4 5" stroke-opacity=".6"/>` +
    t(cx, cy - 4, truncate(m.name, 16), `class="fg" font-size="15" font-weight="700" text-anchor="middle" ${font}`) +
    t(cx, cy + 16, m.role ? truncate(m.role, 20) : `@${m.login}`, `class="muted" font-size="11" text-anchor="middle" ${font}`);
  // project modules around it, connected with orthogonal lines
  const slots = [[40, 60], [470, 60], [40, 290], [470, 290]];
  projects.forEach((p, i) => {
    const [x, y] = slots[i];
    const w = 190;
    const h = 64;
    const ax = x < cx ? x + w : x;
    const ay = y + h / 2;
    b += `<path d="M${ax} ${ay} H${x < cx ? cx - 100 : cx + 100} V${cy} H${x < cx ? cx - 70 : cx + 70}" fill="none" class="sk-fg" stroke-opacity=".7" stroke-dasharray="6 4"/>` +
      `<circle cx="${ax}" cy="${ay}" r="3" class="fg"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" class="sk-fg" stroke-width="1.2"/>` +
      `<line x1="${x}" y1="${y + 22}" x2="${x + w}" y2="${y + 22}" class="sk-fg" stroke-opacity=".6"/>` +
      t(x + 8, y + 15, `MODULE ${String.fromCharCode(65 + i)}`, `class="muted" font-size="9.5" ${font} letter-spacing="1.5"`) +
      t(x + w - 8, y + 15, `★ ${compact(p.stars)}`, `class="muted" font-size="9.5" text-anchor="end" ${font}`) +
      t(x + 8, y + 40, truncate(p.name, 22), `class="fg" font-size="13" font-weight="700" ${font}`) +
      t(x + 8, y + 56, truncate(p.language ?? p.description ?? '', 26), `class="muted" font-size="10.5" ${font}`);
  });
  // dimension line annotation for contributions
  if (show(o, 'stats')) {
    const y = 412;
    b += `<path d="M70 ${y} H650 M70 ${y - 6} V${y + 6} M650 ${y - 6} V${y + 6}" class="sk-fg" stroke-opacity=".75"/>` +
      `<path d="M78 ${y - 4} L70 ${y} L78 ${y + 4} M642 ${y - 4} L650 ${y} L642 ${y + 4}" fill="none" class="sk-fg"/>` +
      `<rect x="${360 - 120}" y="${y - 10}" width="240" height="20" class="bg"/>` +
      t(360, y + 4, `${fmt(m.stats.contributions)} CONTRIBUTIONS / 12 MO`, `class="fg" font-size="11" text-anchor="middle" ${font} letter-spacing="1"`);
    b += sparkline(m.weeks, 70, y + 18, 580, 34, 'sk-fg', false);
  }
  // title block (bottom right) + materials list (right)
  const tx = 680;
  const rows: [string, string][] = [
    ['PROJECT', `${m.login.toUpperCase()}`],
    ['DRAWN BY', 'GITPULSE'],
    ['STARS', compact(m.stats.stars)],
    ['FOLLOWERS', compact(m.stats.followers)],
    ['STREAK', `${m.streak.current} D`],
    ['DATE', new Date().toISOString().slice(0, 10)],
    ['SHEET', '1 / 1']
  ];
  b += `<rect x="${tx}" y="${H - 28 - rows.length * 22}" width="${W - 14 - tx}" height="${rows.length * 22}" fill="none" class="sk-fg" stroke-width="1.2"/>`;
  rows.forEach(([k, v], i) => {
    const ry = H - 28 - rows.length * 22 + i * 22;
    if (i) b += `<line x1="${tx}" y1="${ry}" x2="${W - 14}" y2="${ry}" class="sk-fg" stroke-opacity=".6"/>`;
    b += t(tx + 6, ry + 15, k, `class="muted" font-size="9" ${font} letter-spacing="1"`) + t(W - 20, ry + 15, truncate(v, 18), `class="fg" font-size="10.5" text-anchor="end" ${font}`);
  });
  if (show(o, 'languages') && m.languages.length) {
    b += t(tx, 40, 'MATERIALS', `class="fg" font-size="11" font-weight="700" ${font} letter-spacing="2"`);
    m.languages.forEach((l, i) => {
      const ly = 64 + i * 26;
      b += `<rect x="${tx}" y="${ly - 10}" width="12" height="12" fill="none" stroke="${esc(l.color)}" stroke-width="2"/>` +
        t(tx + 20, ly, truncate(l.name, 12), `class="fg" font-size="11" ${font}`) + t(W - 26, ly, `${Math.round(l.pct)}%`, `class="muted" font-size="11" text-anchor="end" ${font}`);
    });
  }
  return { body: b, width: W, height: H };
}

// ---- Retro arcade ------------------------------------------------------------------------------

function retro(m: ProfileModel, o: DesignOptions): DesignOutput {
  const W = 840;
  const px = `font-family="'Press Start 2P','Courier New',monospace"`;
  let b = `<rect x="10" y="10" width="${W - 20}" height="9999" fill="none" class="sk-bd" stroke-width="4"/><rect x="18" y="18" width="${W - 36}" height="9998" fill="none" class="sk-accent" stroke-width="2"/>`;
  b += t(W / 2, 62, 'PLAYER 1', `class="accent" font-size="15" text-anchor="middle" ${px} font-weight="700" letter-spacing="4"`) +
    t(W / 2, 104, truncate(m.name.toUpperCase(), 22), `class="fg" font-size="32" text-anchor="middle" ${px} font-weight="700" letter-spacing="2"`) +
    t(W / 2, 132, `${m.role ? m.role.toUpperCase() : 'DEVELOPER'} · LV ${m.years}`, `class="muted" font-size="12" text-anchor="middle" ${px} letter-spacing="2"`);
  let y = 168;
  if (show(o, 'stats')) {
    const scores: [string, string][] = [['HIGH SCORE', fmt(m.stats.stars)], ['XP', fmt(m.stats.contributions)], ['COMBO', `x${m.streak.current}`], ['ALLIES', compact(m.stats.followers)]];
    const cw = (W - 80) / 4;
    scores.forEach(([k, v], i) => {
      const x = 40 + i * cw + cw / 2;
      b += t(x, y, k, `class="accent" font-size="11" text-anchor="middle" ${px} letter-spacing="1.5"`) + t(x, y + 28, v, `class="fg" font-size="20" text-anchor="middle" ${px} font-weight="700"`);
    });
    y += 66;
  }
  if (show(o, 'languages') && m.languages.length) {
    b += t(50, y, 'SKILLS', `class="accent" font-size="12" ${px} letter-spacing="2"`);
    m.languages.forEach((l, i) => {
      const ly = y + 26 + i * 26;
      const cells = Math.max(1, Math.round(l.pct / 5));
      b += t(50, ly, truncate(l.name.toUpperCase(), 12), `class="fg" font-size="11" ${px}`);
      for (let c = 0; c < 20; c++) b += `<rect x="${230 + c * 14}" y="${ly - 11}" width="11" height="12" ${c < cells ? `fill="${esc(l.color)}"` : 'class="bd" fill-opacity=".6"'}/>`;
      b += t(530, ly, `${Math.round(l.pct)}%`, `class="muted" font-size="11" ${px}`);
    });
  }
  if (show(o, 'projects') && m.projects.length) {
    const qx = 590;
    b += t(qx, y, 'QUESTS', `class="accent" font-size="12" ${px} letter-spacing="2"`);
    m.projects.slice(0, 5).forEach((p, i) => {
      const qy = y + 26 + i * 26;
      b += t(qx, qy, `▶ ${truncate(p.name.toUpperCase(), 13)}`, `class="fg" font-size="11" ${px}`) + t(W - 46, qy, `★${compact(p.stars)}`, `class="muted" font-size="10" text-anchor="end" ${px}`);
    });
  }
  y += 26 + Math.max(show(o, 'languages') ? m.languages.length : 0, show(o, 'projects') ? Math.min(5, m.projects.length) : 0) * 26 + 20;
  // pixel heat strip of the last 12 weeks
  if (show(o, 'activity') && m.recentDays.length) {
    const cols = Math.ceil(m.recentDays.length / 7);
    const cs = 13;
    const sx = (W - cols * (cs + 3)) / 2;
    m.recentDays.forEach((lv, i) => (b += `<rect x="${(sx + Math.floor(i / 7) * (cs + 3)).toFixed(1)}" y="${y + (i % 7) * (cs + 3)}" width="${cs}" height="${cs}" class="l${lv}"/>`));
    y += 7 * (cs + 3) + 26;
  }
  b += t(W / 2, y, show(o, 'now') && m.now ? `NOW PLAYING: ${truncate(m.now.toUpperCase(), 40)}` : 'PRESS START', `class="accent${o.animate ? ' blink' : ''}" font-size="13" text-anchor="middle" ${px} letter-spacing="2"`);
  if (o.animate) b += '<style>@keyframes blink{50%{opacity:0}}.blink{animation:blink 1.2s step-end infinite}@media (prefers-reduced-motion:reduce){.blink{animation:none}}</style>';
  y += 34;
  return { body: b.replace('height="9999"', `height="${y - 20}"`).replace('height="9998"', `height="${y - 36}"`), width: W, height: y };
}

export const RENDERERS: Record<DesignId, (m: ProfileModel, o: DesignOptions) => DesignOutput> = { terminal, ide, editorial, dashboard, blueprint, retro };
