import pkg from '../package.json';
import { cards } from './cards';
import { esc } from './core/text';
import { themes } from './themes';

/** Facts about who makes this project. Everything here is shown publicly (structured data, /about, llms.txt). */
export const SITE = {
  name: 'ProfileFoundry',
  tagline: 'Free, open-source GitHub stats cards, profile designs and a README studio',
  org: { name: 'SylvenOS', url: 'https://sylvenos.com', motto: 'Learn. Build. Educate.' },
  developer: { name: 'Akshay Kurve', aliases: ['Akshay D Kurve', 'Akshay Dhanraj Kurve'], url: 'https://github.com/akshaykurve', role: 'Main developer' },
  repo: 'https://github.com/akshaykurve/github-stats',
  license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' }
} as const;

export interface Faq {
  q: string;
  a: string;
}

const cardCount = () => cards.length;
const themeCount = () => Object.keys(themes).length;

export const faqs = (origin: string): Faq[] => [
  {
    q: 'What is ProfileFoundry?',
    a: `ProfileFoundry is a free, open-source GitHub stats API, card store and README studio by ${SITE.org.name}. It turns GitHub data into SVG cards, JSON and text that you can embed in a profile README, and it offers ${cardCount()} cards and ${themeCount()} colour themes.`
  },
  {
    q: 'Who builds ProfileFoundry?',
    a: `ProfileFoundry is an open-source project by ${SITE.org.name} (${SITE.org.url}). The main developer is ${SITE.developer.name}, also written as ${SITE.developer.aliases.join(' or ')} (${SITE.developer.url}).`
  },
  {
    q: 'Is ProfileFoundry free?',
    a: `Yes. It is free for everyone and released under the ${SITE.license.name} licence, so you can use, modify and self-host it.`
  },
  {
    q: 'How do I add a stats card to my GitHub README?',
    a: `Add an image to your README, for example: ![Stats](${origin}/api/stats?username=YOUR_USERNAME&theme=auto). Open the Playground at ${origin}/ to pick a card and copy the Markdown.`
  },
  {
    q: 'Do I need a GitHub token?',
    a: 'Not to use the hosted cards. If you deploy your own copy, a GitHub token with no scopes is recommended because it unlocks exact data and much higher rate limits; without one the cards still work with limited public data.'
  },
  {
    q: 'Can I host ProfileFoundry myself?',
    a: 'Yes. It runs on the free Cloudflare Workers plan. The deployment guide is in the repository at docs/DEPLOYING.md.'
  },
  {
    q: 'Where does the data come from, and how are numbers calculated?',
    a: `All data comes from public GitHub information. Every number's source and calculation is documented at ${origin}/api/definitions.`
  },
  {
    q: 'Can I move over from github-readme-stats?',
    a: 'Yes. ProfileFoundry understands the parameter names of github-readme-stats, so in most cases you only need to swap the host in your existing image URLs.'
  },
  {
    q: 'Does ProfileFoundry track visitors or store personal data?',
    a: 'The app sets no cookies and has no analytics scripts. The optional view-counter card stores only a number per counter name. The server writes sampled operational logs (card name, username requested, status and timing) through Cloudflare. Light or dark preference is kept in your own browser only.'
  },
  {
    q: 'How do I report a bug or a security problem?',
    a: `Open an issue at ${SITE.repo}/issues for bugs. Report security problems privately as described in SECURITY.md in the repository, never in a public issue.`
  },
  {
    q: 'Can AI assistants and search engines use ProfileFoundry data?',
    a: `Yes. A machine-readable summary is at ${origin}/llms.txt, the full card reference at ${origin}/llms-full.txt, and the OpenAPI description at ${origin}/api/openapi.json.`
  }
];

const person = () => ({
  '@type': 'Person',
  '@id': `${SITE.developer.url}#person`,
  name: SITE.developer.name,
  alternateName: [...SITE.developer.aliases],
  url: SITE.developer.url,
  jobTitle: SITE.developer.role,
  worksFor: { '@id': `${SITE.org.url}#organization` },
  sameAs: [SITE.developer.url]
});

const organization = () => ({
  '@type': 'Organization',
  '@id': `${SITE.org.url}#organization`,
  name: SITE.org.name,
  url: SITE.org.url,
  slogan: SITE.org.motto,
  founder: { '@id': `${SITE.developer.url}#person` },
  sameAs: [SITE.org.url, SITE.developer.url]
});

/** Structured data (schema.org JSON-LD) for the app page and the /about page. */
export function jsonLd(origin: string, opts: { faq?: boolean } = {}): string {
  const graph: object[] = [
    organization(),
    person(),
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      url: `${origin}/`,
      name: SITE.name,
      description: SITE.tagline,
      inLanguage: 'en',
      publisher: { '@id': `${SITE.org.url}#organization` }
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${origin}/#software`,
      name: SITE.name,
      url: `${origin}/`,
      description: `${SITE.tagline}. ${cardCount()} cards, ${themeCount()} themes, SVG, JSON and text output, and a README builder.`,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any (web, Cloudflare Workers)',
      softwareVersion: pkg.version,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: SITE.license.url,
      codeRepository: SITE.repo,
      softwareHelp: { '@type': 'WebPage', url: `${origin}/about` },
      author: { '@id': `${SITE.developer.url}#person` },
      creator: { '@id': `${SITE.developer.url}#person` },
      publisher: { '@id': `${SITE.org.url}#organization` },
      image: `${origin}/og.jpg`
    }
  ];
  if (opts.faq) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${origin}/about#faq`,
      mainEntity: faqs(origin).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
  }
  // "<" is escaped so the data can never close the script element
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

export function robotsTxt(origin: string): string {
  const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'Amazonbot'];
  const rules = ['Allow: /', 'Disallow: /api/', 'Allow: /api/openapi.json', 'Allow: /api/cards', 'Allow: /api/themes', 'Allow: /api/definitions'].join('\n');
  return [
    '# ProfileFoundry is free and open source. Search engines and AI assistants are welcome to read the public pages.',
    '# Card images and per-user data under /api/ are generated on demand, so they are not crawled; the API descriptions are open.',
    `User-agent: *\n${rules}`,
    ...aiBots.map((b) => `User-agent: ${b}\n${rules}`),
    `Sitemap: ${origin}/sitemap.xml`,
    ''
  ].join('\n\n');
}

export function sitemapXml(origin: string): string {
  const urls = ['/', '/about', '/llms.txt', '/llms-full.txt', '/api/openapi.json', '/api/cards', '/api/themes', '/api/definitions'];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(origin + u)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function securityTxt(origin: string): string {
  const expires = new Date(Date.now() + 300 * 86_400_000).toISOString();
  return [
    `Contact: ${SITE.repo}/security/advisories/new`,
    `Expires: ${expires}`,
    `Policy: ${SITE.repo}/blob/main/SECURITY.md`,
    `Canonical: ${origin}/.well-known/security.txt`,
    'Preferred-Languages: en',
    ''
  ].join('\n');
}

/** A short, plain-text summary for AI assistants (see llmstxt.org). */
export function llmsTxt(origin: string): string {
  return `# ${SITE.name}

> ${SITE.tagline}. ${SITE.name} is an open-source project by ${SITE.org.name}; the main developer is ${SITE.developer.name}. It generates SVG cards, JSON and text from public GitHub data for profile READMEs, with ${cardCount()} cards and ${themeCount()} themes. Free for everyone under the ${SITE.license.name} licence.

## Use it
- [Playground](${origin}/): preview any card and copy Markdown
- [How a card URL looks](${origin}/llms-full.txt): every card, its endpoint and options
- Embed example: \`![Stats](${origin}/api/stats?username=USERNAME&theme=auto)\`

## Reference
- [OpenAPI description](${origin}/api/openapi.json)
- [Card list (JSON)](${origin}/api/cards)
- [Themes (JSON)](${origin}/api/themes)
- [Metric definitions: source and calculation of every number](${origin}/api/definitions)
- [About, FAQ and privacy](${origin}/about)

## Project
- [Source code and issues](${SITE.repo})
- [Documentation: adding a card, architecture, deploying](${SITE.repo}/tree/main/docs)
- [Security policy](${SITE.repo}/blob/main/SECURITY.md)
- [License (${SITE.license.name})](${SITE.license.url})

## People and organisation
- [${SITE.org.name}](${SITE.org.url}): ${SITE.org.motto} The open-source organisation behind ${SITE.name}.
- [${SITE.developer.name}](${SITE.developer.url}): ${SITE.developer.role.toLowerCase()} of ${SITE.name}, at ${SITE.org.name}. Also written as ${SITE.developer.aliases.join(' or ')}.
`;
}

/** The full reference: one entry per card with its endpoint, description and options. */
export function llmsFullTxt(origin: string): string {
  const lines: string[] = [llmsTxt(origin), '\n# Cards\n'];
  lines.push('Every card is a GET request: `' + origin + '/api/<card>?username=<github-user>&<options>`. Add `format=json` for data, `theme=<name>` for colours. Common options (colours, size, fonts, card_style, shadow, tone and more) work on every card and are listed at /api/cards.\n');
  for (const c of cards) {
    lines.push(`## ${c.title}\n- Endpoint: \`${origin}/api/${c.id}${c.needsUser === false ? '' : '?username=USERNAME'}\`\n- ${c.description}`);
    if (c.params.length) {
      lines.push('- Options: ' + c.params.map((p) => `\`${p.name}\`${p.options ? ` (${p.options.join('|')})` : ''}`).join(', '));
    }
    lines.push('');
  }
  lines.push('# Themes\n', Object.keys(themes).join(', '), '');
  return lines.join('\n');
}

const css = `:root{--bg:#f6fafd;--fg:#0a1931;--muted:#4a5f78;--line:#d3dfeb;--surface:#fff;--accent:#1a7f4e}@media(prefers-color-scheme:dark){:root{--bg:#0a1931;--fg:#f6fafd;--muted:#a9bbd0;--line:#23406a;--surface:#102746;--accent:#4cc27a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}header,main,footer{max-width:760px;margin:0 auto;padding:0 20px}header{display:flex;align-items:center;gap:14px;padding-top:22px;padding-bottom:22px;border-bottom:1px solid var(--line)}
header a.brand{display:flex;align-items:center;gap:10px;color:var(--fg);font-weight:700;text-decoration:none}header img{width:32px;height:32px;border-radius:8px}header nav{margin-left:auto;display:flex;gap:18px}
h1{font-size:2rem;line-height:1.2;margin:32px 0 8px}h2{font-size:1.35rem;margin:36px 0 10px}p{margin:10px 0}.lead{color:var(--muted);font-size:1.1rem}
dl{margin:0}dt{font-weight:650;margin-top:20px}dd{margin:4px 0 0;color:var(--muted)}code,pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em}pre{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px;overflow:auto}
ul{padding-left:20px}footer{margin-top:48px;padding-top:20px;padding-bottom:40px;border-top:1px solid var(--line);color:var(--muted);font-size:.92rem}`;

/** Server-rendered About / FAQ page: readable by crawlers and AI assistants without running JavaScript. */
export function aboutHtml(origin: string): string {
  const f = faqs(origin);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>About ProfileFoundry - free GitHub stats cards by SylvenOS</title>
<meta name="description" content="ProfileFoundry is a free, open-source GitHub stats API and README studio by SylvenOS, built by Akshay Kurve. Learn what it does, how it works, how to use it and how your data is handled.">
<link rel="canonical" href="${esc(origin)}/about">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ProfileFoundry">
<meta property="og:title" content="About ProfileFoundry - free GitHub stats cards by SylvenOS">
<meta property="og:description" content="Free, open-source stats cards, profile designs and a README studio. Built by Akshay Kurve at SylvenOS.">
<meta property="og:url" content="${esc(origin)}/about">
<meta property="og:image" content="${esc(origin)}/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="author" content="${esc(SITE.developer.name)}">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<style>${css}</style>
<script type="application/ld+json">${jsonLd(origin, { faq: true })}</script>
</head>
<body>
<header>
  <a class="brand" href="/"><img src="/favicon.svg" alt="" width="32" height="32"><span>ProfileFoundry</span></a>
  <nav aria-label="Main"><a href="/">App</a><a href="${esc(SITE.repo)}" rel="noopener">GitHub</a><a href="${esc(SITE.org.url)}" rel="noopener">SylvenOS</a></nav>
</header>
<main>
  <article>
    <h1>ProfileFoundry: free GitHub stats cards and README studio</h1>
    <p class="lead">${esc(SITE.name)} is a free, open-source GitHub stats API, card store and README studio. It creates SVG cards, JSON and text from public GitHub data for your profile README, with ${cardCount()} cards and ${themeCount()} themes.</p>

    <h2>Who makes it</h2>
    <p>${esc(SITE.name)} is an open-source project by <a href="${esc(SITE.org.url)}" rel="noopener">${esc(SITE.org.name)}</a> (${esc(SITE.org.motto)}). The main developer is <a href="${esc(SITE.developer.url)}" rel="noopener author">${esc(SITE.developer.name)}</a> (also written as ${esc(SITE.developer.aliases.join(' or '))}). The code is public under the ${esc(SITE.license.name)} licence at <a href="${esc(SITE.repo)}" rel="noopener">${esc(SITE.repo.replace('https://', ''))}</a>, where you can read every line, open issues and send contributions.</p>

    <h2>What you can do with it</h2>
    <ul>
      <li>Show stats, languages, streaks, contribution graphs, trophies, year in review, repository timelines and more as images in your README.</li>
      <li>Design a whole profile README in the README Studio and export it.</li>
      <li>Read the same data as JSON for your own tools, or self-host everything on Cloudflare Workers.</li>
    </ul>
    <pre><code>![Stats](${esc(origin)}/api/stats?username=YOUR_USERNAME&amp;theme=auto)</code></pre>
    <p><a href="/">Open the Playground</a> to pick a card and copy the Markdown.</p>

    <h2>How the numbers are calculated</h2>
    <p>We document the source and the formula behind every number on the cards at <a href="/api/definitions">/api/definitions</a>. Estimates, such as lines of code, are labelled as estimates.</p>

    <h2>Frequently asked questions</h2>
    <dl>
${f.map((x) => `      <dt>${esc(x.q)}</dt>\n      <dd>${esc(x.a)}</dd>`).join('\n')}
    </dl>

    <h2>For developers and AI assistants</h2>
    <ul>
      <li><a href="/llms.txt">/llms.txt</a> and <a href="/llms-full.txt">/llms-full.txt</a>: plain-text summary and full card reference</li>
      <li><a href="/api/openapi.json">OpenAPI description</a>, <a href="/api/cards">cards</a>, <a href="/api/themes">themes</a></li>
      <li><a href="/.well-known/security.txt">security.txt</a> and the <a href="${esc(SITE.repo)}/blob/main/SECURITY.md" rel="noopener">security policy</a></li>
    </ul>
  </article>
</main>
<footer>
  <p>&copy; 2026 <a href="${esc(SITE.org.url)}" rel="noopener">${esc(SITE.org.name)}</a>. ${esc(SITE.name)} is released under the <a href="${esc(SITE.license.url)}" rel="noopener">${esc(SITE.license.name)} licence</a>. Main developer: <a href="${esc(SITE.developer.url)}" rel="noopener">${esc(SITE.developer.name)}</a>.</p>
</footer>
</body>
</html>`;
}
