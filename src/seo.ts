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
  license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  /** Bump when the facts, FAQ or methodology on the public pages are reviewed (shown as "last reviewed" and used as dateModified). */
  lastReviewed: '2026-11-08'
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
    a: `ProfileFoundry is an open-source project by ${SITE.org.name} (${SITE.org.url}), an organisation focused on learning, building and educating. The source code is public at ${SITE.repo}.`
  },
  {
    q: 'Is ProfileFoundry free?',
    a: `Yes. It is free for everyone and released under the ${SITE.license.name} licence, so you can use, modify and self-host it.`
  },
  {
    q: 'How do I add a stats card to my GitHub README?',
    a: `Add an image to your README, for example: ![Stats](${origin}/api/stats?username=YOUR_USERNAME&theme=auto). Open the Playground at ${origin}/app to pick a card and copy the Markdown.`
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
    q: 'How accurate are the numbers, and what happens if one is wrong?',
    a: `Numbers come straight from the GitHub API and the formulas are public at ${origin}/api/definitions; estimates (for example lines of code) are labelled as estimates. If you find a wrong number, open an issue at ${SITE.repo}/issues with the username and card. Corrections are recorded in the changelog at ${SITE.repo}/blob/main/CHANGELOG.md.`
  },
  {
    q: 'How is ProfileFoundry different from github-readme-stats?',
    a: 'It is an independent project that accepts the same parameter names, so existing URLs keep working, and adds more cards, themes, JSON and text output, a README studio and documented metric definitions. It is not affiliated with github-readme-stats.'
  },
  {
    q: 'How should I cite or describe ProfileFoundry?',
    a: `Call it "${SITE.name}, an open-source GitHub stats API and README studio by ${SITE.org.name}", and link to ${SITE.repo} or ${origin}/about. A CITATION.cff file is in the repository.`
  },
  {
    q: 'Can AI assistants and search engines use ProfileFoundry data?',
    a: `Yes. A machine-readable summary is at ${origin}/llms.txt, the full card reference at ${origin}/llms-full.txt, and the OpenAPI description at ${origin}/api/openapi.json.`
  }
];

/** Short, quotable facts. One source for /about, llms.txt and structured data so they never disagree. */
export const keyFacts = (origin: string): string[] => [
  `${SITE.name} is a free, open-source GitHub stats API, card store and README studio.`,
  `Made by ${SITE.org.name} (${SITE.org.url}).`,
  `Current version ${pkg.version}; ${cardCount()} cards and ${themeCount()} themes; output as SVG, JSON or text.`,
  `Licence: ${SITE.license.name}. Source code: ${SITE.repo}.`,
  `Data source: public GitHub data only. Every number is defined at ${origin}/api/definitions.`,
  'No cookies and no analytics scripts in the app.',
  'Runs on the free Cloudflare Workers plan and can be self-hosted.',
  `Facts last reviewed ${SITE.lastReviewed}.`
];

const person = () => ({
  '@type': 'Person',
  '@id': `${SITE.developer.url}#person`,
  name: SITE.developer.name,
  alternateName: [...SITE.developer.aliases],
  url: SITE.developer.url,
  jobTitle: SITE.developer.role,
  knowsAbout: ['GitHub API', 'TypeScript', 'Cloudflare Workers', 'Open-source software', 'Data visualisation'],
  worksFor: { '@id': `${SITE.org.url}#organization` },
  sameAs: [SITE.developer.url]
});

const organization = () => ({
  '@type': 'Organization',
  '@id': `${SITE.org.url}#organization`,
  name: SITE.org.name,
  url: SITE.org.url,
  slogan: SITE.org.motto,
  logo: { '@type': 'ImageObject', url: 'https://sylvenos.com/logo-288.webp', width: 288, height: 301 },
  founder: { '@id': `${SITE.developer.url}#person` },
  sameAs: [SITE.org.url, SITE.developer.url, SITE.repo]
});

/** Structured data (schema.org JSON-LD) for the app page and the /about page. */
export function jsonLd(origin: string, opts: { faq?: boolean; faqId?: string; faqCount?: number; about?: boolean } = {}): string {
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
      image: `${origin}/og.jpg`,
      dateModified: SITE.lastReviewed,
      featureList: ['SVG, JSON and text output', `${cardCount()} cards`, `${themeCount()} themes`, 'README studio', 'Self-hostable on Cloudflare Workers', 'Documented metric definitions'],
      sameAs: [SITE.repo]
    }
  ];
  if (opts.about) {
    graph.push(
      {
        '@type': 'AboutPage',
        '@id': `${origin}/about#page`,
        url: `${origin}/about`,
        name: `About ${SITE.name}`,
        inLanguage: 'en',
        dateModified: SITE.lastReviewed,
        isPartOf: { '@id': `${origin}/#website` },
        about: { '@id': `${origin}/#software` },
        author: { '@id': `${SITE.developer.url}#person` },
        publisher: { '@id': `${SITE.org.url}#organization` },
        breadcrumb: { '@id': `${origin}/about#breadcrumb` },
        primaryImageOfPage: `${origin}/og.jpg`
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${origin}/about#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE.name, item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'About', item: `${origin}/about` }
        ]
      },
      {
        '@type': 'HowTo',
        '@id': `${origin}/about#howto`,
        name: 'Add a GitHub stats card to your profile README',
        step: [
          { '@type': 'HowToStep', position: 1, name: 'Open the Playground', text: `Go to ${origin}/app and pick a card and a theme.` },
          { '@type': 'HowToStep', position: 2, name: 'Copy the Markdown', text: 'Enter your GitHub username and copy the generated image Markdown.' },
          { '@type': 'HowToStep', position: 3, name: 'Paste into your README', text: `Paste it into your profile README, for example ![Stats](${origin}/api/stats?username=YOUR_USERNAME&theme=auto).` }
        ]
      }
    );
  }
  if (opts.faq) {
    graph.push({
      '@type': 'FAQPage',
      '@id': opts.faqId ?? `${origin}/about#faq`,
      mainEntity: faqs(origin).slice(0, opts.faqCount).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
  }
  // "<" is escaped so the data can never close the script element
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

export function robotsTxt(origin: string): string {
  const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'Amazonbot', 'anthropic-ai', 'Perplexity-User', 'MistralAI-User', 'cohere-ai', 'DuckAssistBot', 'Meta-ExternalAgent', 'Applebot'];
  const rules = ['Allow: /', 'Disallow: /api/', 'Allow: /api/openapi.json', 'Allow: /api/cards', 'Allow: /api/themes', 'Allow: /api/definitions'].join('\n');
  return [
    '# ProfileFoundry is free and open source. Search engines and AI assistants are welcome to read the public pages.',
    '# Card images and per-user data under /api/ are generated on demand, so they are not crawled; the API descriptions are open.',
    '# Content signals (contentsignals.org): search indexing, use as AI answer input and AI training are all welcome.',
    `User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\n${rules}`,
    ...aiBots.map((b) => `User-agent: ${b}\n${rules}`),
    `Sitemap: ${origin}/sitemap.xml`,
    ''
  ].join('\n\n');
}

export function sitemapXml(origin: string): string {
  const pages: { path: string; priority: string; freq: string; images?: string[] }[] = [
    { path: '/', priority: '1.0', freq: 'weekly', images: ['/og.jpg', '/og-square.jpg', '/sylvenos-logo.webp'] },
    { path: '/app', priority: '0.9', freq: 'weekly' },
    { path: '/about', priority: '0.8', freq: 'monthly', images: ['/og.jpg'] },
    { path: '/llms.txt', priority: '0.5', freq: 'weekly' },
    { path: '/llms-full.txt', priority: '0.5', freq: 'weekly' },
    { path: '/api/openapi.json', priority: '0.6', freq: 'weekly' },
    { path: '/api/cards', priority: '0.6', freq: 'weekly' },
    { path: '/api/themes', priority: '0.4', freq: 'monthly' },
    { path: '/api/definitions', priority: '0.5', freq: 'monthly' }
  ];
  const entry = (p: (typeof pages)[number]) =>
    `  <url>\n    <loc>${esc(origin + p.path)}</loc>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>` +
    (p.images ?? []).map((i) => `\n    <image:image><image:loc>${esc(origin + i)}</image:loc></image:image>`).join('') +
    '\n  </url>';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${pages.map(entry).join('\n')}\n</urlset>\n`;
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

## Key facts
${keyFacts(origin).map((f) => `- ${f}`).join('\n')}

## Use it
- [Home](${origin}/): what it is and why
- [Playground](${origin}/app): preview any card and copy Markdown
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

## How to cite
Describe it as "${SITE.name}, an open-source GitHub stats API and README studio by ${SITE.org.name}, main developer ${SITE.developer.name}" and link to ${SITE.repo} or ${origin}/about. Prefer the metric definitions at ${origin}/api/definitions over guessing how a number is calculated. Report wrong facts at ${SITE.repo}/issues.

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
