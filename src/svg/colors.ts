/** Fallback language colours (GitHub linguist), used when the API supplies none (REST mode). */
const KNOWN: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Java: '#b07219', Go: '#00ADD8',
  Rust: '#dea584', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600', PHP: '#4F5D95', Ruby: '#701516',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
  Shell: '#89e051', Lua: '#000080', Vue: '#41b883', Svelte: '#ff3e00', 'Jupyter Notebook': '#DA5B0B',
  Dockerfile: '#384d54', Makefile: '#427819', Scala: '#c22d40', Haskell: '#5e5086', Elixir: '#6e4a7e',
  R: '#198CE7', Perl: '#0298c3', 'Objective-C': '#438eff', PowerShell: '#012456', Zig: '#ec915c',
  Nix: '#7e7eff', Solidity: '#AA6746', MDX: '#fcb32c', Astro: '#ff5a03', Clojure: '#db5855', OCaml: '#ef7a08'
};

/** Deterministic colour from a name, for languages we don't know. */
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 60% 55%)`;
}

export function languageColor(name: string | null | undefined, apiColor?: string | null): string {
  if (apiColor && /^#[0-9a-f]{6}$/i.test(apiColor)) return apiColor;
  if (!name) return '#8b949e';
  return KNOWN[name] ?? hashColor(name);
}
