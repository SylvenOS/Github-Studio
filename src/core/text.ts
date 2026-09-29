const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/** Escape untrusted text for use in SVG text nodes and attribute values. */
export function esc(value: unknown): string {
  return String(value ?? '')
    // strip characters that are illegal in XML 1.0 and would break the whole image
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);
}

export function truncate(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length > max ? chars.slice(0, Math.max(0, max - 1)).join('') + '…' : s;
}

/** Greedy word wrap; the last line is truncated with an ellipsis if text overflows. */
export function wrap(s: string, width: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  const words = s.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (Array.from(next).length <= width) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = words[i];
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const consumed = lines.join(' ').split(/\s+/).length;
  if (consumed < words.length && lines.length) {
    lines[lines.length - 1] = truncate(lines[lines.length - 1] + ' …', width);
  }
  return lines.map((l) => truncate(l, width));
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2024-03-07" -> "Mar 7" (with the year when it isn't the current one). */
export function shortDate(iso: string | null, now = new Date()): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${y === now.getUTCFullYear() ? '' : `, ${y}`}`;
}

const NUMBER = new Intl.NumberFormat('en-US');
export const fmt = (n: number) => NUMBER.format(Math.round(n || 0));

/** 1234 -> 1.2k, 1_500_000 -> 1.5M */
export function compact(n: number): string {
  n = Math.round(n || 0);
  if (n < 1000) return String(n);
  const units: [number, string][] = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']];
  for (const [size, suffix] of units) {
    if (n >= size) return `${(n / size).toFixed(n / size >= 100 ? 0 : 1).replace(/\.0$/, '')}${suffix}`;
  }
  return String(n);
}
