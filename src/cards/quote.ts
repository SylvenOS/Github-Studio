import { defineCard } from './types';
import { badRequest } from '../core/errors';
import { int, oneOf } from '../core/params';
import { esc, wrap } from '../core/text';
import { frame, PAD } from '../svg/frame';

/** Short, well-attributed quotes about programming and craft. Rotates daily unless `index` or `text` is given. */
const QUOTES: { text: string; author: string; topic: 'programming' | 'craft' | 'learning' }[] = [
  { text: 'Programs must be written for people to read, and only incidentally for machines to execute.', author: 'Harold Abelson', topic: 'programming' },
  { text: 'Simplicity is prerequisite for reliability.', author: 'Edsger W. Dijkstra', topic: 'programming' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth', topic: 'programming' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds', topic: 'programming' },
  { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler', topic: 'programming' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson', topic: 'programming' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck', topic: 'craft' },
  { text: 'The best error message is the one that never shows up.', author: 'Thomas Fuchs', topic: 'programming' },
  { text: 'Deleted code is debugged code.', author: 'Jeff Sickel', topic: 'programming' },
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman', topic: 'craft' },
  { text: 'Code is like humor. When you have to explain it, it is bad.', author: 'Cory House', topic: 'programming' },
  { text: 'Testing leads to failure, and failure leads to understanding.', author: 'Burt Rutan', topic: 'learning' },
  { text: 'The most disastrous thing that you can ever learn is your first programming language.', author: 'Alan Kay', topic: 'learning' },
  { text: 'Walking on water and developing software from a specification are easy if both are frozen.', author: 'Edward V. Berard', topic: 'craft' },
  { text: 'It is not enough for code to work.', author: 'Robert C. Martin', topic: 'craft' },
  { text: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.', author: 'Antoine de Saint-Exupéry', topic: 'craft' },
  { text: 'The only way to learn a new programming language is by writing programs in it.', author: 'Dennis Ritchie', topic: 'learning' },
  { text: 'Debugging is twice as hard as writing the code in the first place.', author: 'Brian Kernighan', topic: 'programming' },
  { text: 'In theory, theory and practice are the same. In practice, they are not.', author: 'Jan L. A. van de Snepscheut', topic: 'learning' },
  { text: 'Software is a great combination between artistry and engineering.', author: 'Bill Gates', topic: 'craft' },
  { text: 'Before software can be reusable it first has to be usable.', author: 'Ralph Johnson', topic: 'craft' },
  { text: 'Optimism is an occupational hazard of programming: feedback is the treatment.', author: 'Kent Beck', topic: 'craft' },
  { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci', topic: 'learning' },
  { text: 'Weeks of coding can save you hours of planning.', author: 'Unknown', topic: 'programming' }
];

const LAYOUTS = ['card', 'minimal', 'terminal', 'bubble', 'code', 'big', 'note'] as const;
const TOPICS = ['all', 'programming', 'craft', 'learning'] as const;

interface Params {
  layout: (typeof LAYOUTS)[number];
  text: string;
  author: string;
  width: number;
  size: number;
  italic: boolean;
}

export const quoteCard = defineCard<Params, null>({
  id: 'quote',
  aliases: ['quotes', 'dev-quote'],
  category: 'decor',
  needsUser: false,
  tags: ['quote', 'daily', 'motivation', 'inspiration', 'text'],
  variants: [{ label: 'Card' }, { label: 'Minimal', params: { layout: 'minimal' } }, { label: 'Terminal', params: { layout: 'terminal' } }, { label: 'Speech bubble', params: { layout: 'bubble' } }, { label: 'Code comment', params: { layout: 'code' } }, { label: 'Big type', params: { layout: 'big', size: '20' } }, { label: 'Sticky note', params: { layout: 'note' } }],
  title: 'Dev Quote',
  description: 'A programming quote that changes every day (or your own text). Four layouts.',
  params: [
    { name: 'layout', type: 'enum', options: [...LAYOUTS], default: 'card', description: 'Presentation' },
    { name: 'topic', type: 'enum', options: [...TOPICS], default: 'all', description: 'Topic of the daily quote' },
    { name: 'index', type: 'number', min: 0, max: QUOTES.length - 1, description: 'Pick a specific built-in quote instead of the daily one' },
    { name: 'text', type: 'string', description: 'Your own quote (max 220 characters)' },
    { name: 'author', type: 'string', description: 'Author of your own quote' },
    { name: 'quote_width', type: 'number', default: 520, min: 300, max: 900, step: 10, description: 'Card width' },
    { name: 'size', type: 'number', default: 15, min: 11, max: 32, description: 'Text size' },
    { name: 'italic', type: 'boolean', default: false, description: 'Italic text (minimal, big and note layouts are italic by default)' }
  ],
  cacheSeconds: 3600,
  parse(q) {
    if (q.text && q.text.length > 220) throw badRequest('text is limited to 220 characters');
    const topic = oneOf(q.topic, TOPICS, 'all');
    const pool = topic === 'all' ? QUOTES : QUOTES.filter((x) => x.topic === topic);
    const daily = pool[Math.floor(Date.now() / 86_400_000) % pool.length];
    const picked = q.index !== undefined && q.index !== '' ? QUOTES[int(q.index, 0, 0, QUOTES.length - 1)] : daily;
    return {
      layout: oneOf(q.layout, LAYOUTS, 'card'),
      text: q.text ? q.text.trim() : picked.text,
      author: q.text ? (q.author ?? '').trim().slice(0, 60) : picked.author,
      width: int(q.quote_width, 520, 300, 900),
      size: int(q.size, 15, 11, 32),
      italic: q.italic === 'true'
    };
  },
  load: async () => null,
  toJSON: (_d, p) => ({ text: p.text, author: p.author }),

  render(_d, p, { theme, common, title }) {
    const W = p.width;
    const chars = Math.floor((W - PAD * 2 - (p.layout === 'card' ? 40 : 0)) / (p.size * 0.55));
    const lines = wrap(p.text, chars, 5);
    const header = p.layout === 'card' ? title('') : undefined;
    const top = header ? 55 : PAD;
    const lh = Math.round(p.size * 1.47);
    const label = `“${p.text}”${p.author ? ` - ${p.author}` : ''}`;
    const textLines = (x: number, y: number, extra = '') =>
      lines.map((l, i) => `<text x="${x}" y="${y + i * lh}" class="fg" font-size="${p.size}"${p.italic ? ' font-style="italic"' : ''}${extra}>${esc(l)}</text>`).join('');
    const author = (x: number, y: number, anchor = 'end') => (p.author ? `<text x="${x}" y="${y}" class="muted" font-size="12.5" text-anchor="${anchor}">- ${esc(p.author)}</text>` : '');
    const bodyH = lines.length * lh;

    if (p.layout === 'terminal') {
      const y0 = 58;
      const body =
        `<circle cx="22" cy="18" r="5" fill="#ff5f56"/><circle cx="38" cy="18" r="5" fill="#ffbd2e"/><circle cx="54" cy="18" r="5" fill="#27c93f"/>` +
        `<line x1="0" y1="34" x2="${W}" y2="34" class="sk-bd"/>` +
        `<text x="${PAD}" y="${y0 - 2}" class="accent" font-size="13" font-family="Consolas,'Courier New',monospace">$ fortune --dev</text>` +
        lines.map((l, i) => `<text x="${PAD}" y="${y0 + 24 + i * lh}" class="fg" font-size="14" font-family="Consolas,'Courier New',monospace">${esc(l)}</text>`).join('') +
        (p.author ? `<text x="${PAD}" y="${y0 + 30 + bodyH}" class="muted" font-size="12.5" font-family="Consolas,'Courier New',monospace">    -- ${esc(p.author)}</text>` : '');
      return frame(body, { width: W, height: y0 + bodyH + 54, theme, label });
    }
    if (p.layout === 'code') {
      const mono = "font-family=\"'JetBrains Mono','Fira Code',Consolas,monospace\"";
      const body =
        lines.map((l, i) => `<text x="${PAD}" y="${PAD + 18 + i * lh}" class="muted" font-size="${p.size - 1}" ${mono}>// <tspan class="fg">${esc(l)}</tspan></text>`).join('') +
        (p.author ? `<text x="${PAD}" y="${PAD + 22 + lines.length * lh}" class="accent" font-size="${p.size - 2}" ${mono}>// - ${esc(p.author)}</text>` : '');
      return frame(body, { width: W, height: PAD * 2 + 10 + (lines.length + (p.author ? 1 : 0)) * lh, theme, label });
    }
    if (p.layout === 'big') {
      const fs2 = Math.round(p.size * 1.7);
      const c2 = Math.floor((W - PAD * 2) / (fs2 * 0.55));
      const big = wrap(p.text, c2, 4);
      const lh2 = Math.round(fs2 * 1.3);
      const body =
        `<text x="${PAD}" y="${PAD + 40}" class="accent" font-size="90" font-family="Georgia,serif" opacity=".25">“</text>` +
        big.map((l, i) => `<text x="${W / 2}" y="${PAD + 38 + i * lh2}" class="fg" font-size="${fs2}" font-weight="700" font-style="italic" text-anchor="middle">${esc(l)}</text>`).join('') +
        (p.author ? `<text x="${W / 2}" y="${PAD + 38 + big.length * lh2 + 8}" class="accent" font-size="${Math.round(fs2 * 0.55)}" font-weight="600" text-anchor="middle" letter-spacing="2">${esc(p.author.toUpperCase())}</text>` : '');
      return frame(body, { width: W, height: PAD * 2 + 38 + big.length * lh2 + 24, theme: { ...theme, hideBorder: true }, transparent: true, label });
    }
    if (p.layout === 'note') {
      const h = bodyH + 66;
      const body =
        `<g transform="rotate(-1.2 ${W / 2} ${h / 2 + 10})"><rect x="${PAD}" y="12" width="${W - PAD * 2}" height="${h}" rx="3" fill="#fde68a"/><rect x="${PAD}" y="12" width="${W - PAD * 2}" height="18" rx="3" fill="#f5c542" fill-opacity=".7"/>` +
        lines.map((l, i) => `<text x="${PAD + 16}" y="${58 + i * lh}" font-size="${p.size}" font-style="italic" fill="#3b3320">${esc(l)}</text>`).join('') +
        (p.author ? `<text x="${W - PAD - 16}" y="${58 + bodyH + 8}" font-size="${p.size - 2}" fill="#6b5b2e" text-anchor="end">- ${esc(p.author)}</text>` : '') + '</g>';
      return frame(body, { width: W, height: h + 34, theme: { ...theme, hideBorder: true }, transparent: true, label });
    }
    if (p.layout === 'minimal') {
      const body = textLines(W / 2, PAD + 14, ' text-anchor="middle" font-style="italic"') + author(W / 2, PAD + 16 + bodyH, 'middle');
      return frame(body, { width: W, height: PAD * 2 + bodyH + 18, theme: { ...theme, hideBorder: true }, transparent: true, label });
    }
    if (p.layout === 'bubble') {
      const h = bodyH + 34;
      const body =
        `<path d="M${PAD} ${PAD} h${W - PAD * 2} a12 12 0 0 1 12 12 v${h - 24} a12 12 0 0 1 -12 12 h-${W - PAD * 2 - 60} l-18 16 v-16 h-${30} a12 12 0 0 1 -12 -12 v-${h - 24} a12 12 0 0 1 12 -12 z" class="bd" fill-opacity=".55" transform="translate(-6 0)"/>` +
        textLines(PAD + 12, PAD + 26) +
        author(W - PAD, PAD + h + 30);
      return frame(body, { width: W, height: PAD + h + 44, theme: { ...theme, hideBorder: true }, transparent: true, label });
    }
    const body =
      `<text x="${PAD - 4}" y="${top + 34}" class="accent" font-size="64" font-family="Georgia,serif" opacity=".35">“</text>` +
      textLines(PAD + 36, top + 16) +
      author(W - PAD, top + 22 + bodyH);
    return frame(body, { width: W, height: top + bodyH + 44, theme, title: header, label });
  }
});
