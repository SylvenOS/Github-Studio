import pkg from '../package.json';
import { cards } from './cards';
import { esc } from './core/text';
import { themes } from './themes';

/** Facts about who makes this project. Everything here is shown publicly (structured data, /about, llms.txt). */
export const SITE = {
  name: 'GithubStudio',
  tagline: 'Free, open-source GitHub stats cards, profile designs and a README studio',
  org: { name: 'SylvenOS', url: 'https://sylvenos.com', motto: 'Learn. Build. Educate.' },
  developer: {
    name: 'Akshay Kurve',
    aliases: ['Akshay D Kurve', 'Akshay Dhanraj Kurve'],
    url: 'https://github.com/akshaykurve',
    role: 'Main developer',
    /** Personal site, the source of the facts below. Machine-readable files and structured data only; not shown in page text. */
    site: 'https://akshaykurve.com',
    titles: 'Software Engineer, System Designer and Engineering Manager',
    bio: 'Akshay Kurve (Akshay Dhanraj Kurve) is a software engineer, system designer and engineering manager who builds scalable backend systems, APIs, developer tools and production-ready software. He is a founding member of SylvenOS, where he leads the open-source developer community, and a full stack developer at SIF360, working on enterprise fintech applications. He previously led a 20-person team building SaaS platforms as an engineering manager at Nofinite, and he writes technical content for developers.',
    profiles: [
      'https://akshaykurve.com',
      'https://github.com/akshaykurve',
      'https://www.linkedin.com/in/akshaykurve',
      'https://x.com/akshaykurve_',
      'https://dev.to/akshaykurve',
      'https://medium.com/@akshaykurve',
      'https://www.npmjs.com/~akshaykurve'
    ],
    expertise: {
      Languages: 'JavaScript, TypeScript, HTML5, CSS3, SQL, GraphQL',
      Frontend: 'React, Next.js, Tailwind CSS, Material UI, Chakra UI, Radix UI, Framer Motion, React Hook Form, Zod, Zustand',
      Backend: 'Node.js, Express.js, Fastify, GraphQL, REST APIs, WebSockets, Socket.IO, JWT',
      Databases: 'MySQL, Redis, database design, DataLoader',
      Architecture: 'System design, microservices, monorepos (Nx), distributed systems, performance optimisation',
      'Cloud and DevOps': 'Docker, Cloudflare, Vercel, GitHub Actions, CI/CD, Linux',
      AI: 'Generative AI, LLM applications, AI agents, prompt engineering',
      Leadership: 'Engineering management, technical leadership, mentorship, code review, sprint planning'
    },
    projects: [
      { name: 'SylvenOS website', url: 'https://sylvenos.com', text: 'Official website of the SylvenOS open-source community, built with Next.js.' },
      { name: 'SIF360 platform', url: 'https://sif360.com', text: 'Fintech applications for fund analytics and portfolio dashboards.' },
      { name: 'Nofinite Docs v3', url: 'https://opensource.nofinite.com', text: 'Third generation of the Nofinite documentation platform.' },
      { name: 'Real-time chat application', url: 'https://github.com/nofinitehq', text: 'Microservices chat platform using Next.js, Fastify, GraphQL and Socket.IO.' },
      { name: 'ThemeGenie', url: 'https://themegenie.netlify.app', text: 'Developer tool that generates themes and design tokens.' },
      { name: 'FaviForge', url: 'https://faviforge.netlify.app', text: 'Favicon and web app manifest generator.' }
    ],
    /** The engineering principles stated on the developer's site, and how this project follows each. */
    approach: [
      { title: 'Build for production', principle: 'Every project should be production-ready, maintainable, scalable and able to serve real users, not just demos.', here: 'Layered caching with stale-if-error, a token pool with health checks, bounded work per request, rate limiting, structured logs, strict security headers and a large automated test suite including injection tests.' },
      { title: 'Architecture before code', principle: 'Good architecture reduces complexity over time: design the system and clear APIs before implementing.', here: 'A card is one contract (options, parse, load, render); the API, OpenAPI file, docs, web app forms and AI files are all generated from it. One shared frame draws every card.' },
      { title: 'Developer experience matters', principle: 'Clean code, documentation, automation and reusable components.', here: 'Documented metrics, an OpenAPI description, guides for adding a card and deploying, a one-command deploy, and parameter names compatible with github-readme-stats.' },
      { title: 'Learn. Build. Share.', principle: 'Share knowledge, build in public and collaborate through open source.', here: 'MIT licensed, public repository, public changelog and security policy, built by SylvenOS in the open.' }
    ]
  },
  repo: 'https://github.com/akshaykurve/github-stats',
  /** The official hosted instance. Pages and files still build their URLs from the request host. */
  live: 'https://githubstudio.sylvenos.com',
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
    q: 'What is GithubStudio?',
    a: `GithubStudio is a free, open-source GitHub stats API, card store and README studio by ${SITE.org.name}. It turns GitHub data into SVG cards, JSON and text that you can embed in a profile README, and it offers ${cardCount()} cards and ${themeCount()} colour themes.`
  },
  {
    q: 'Who builds GithubStudio?',
    a: `GithubStudio is an open-source project by ${SITE.org.name} (${SITE.org.url}), an organisation focused on learning, building and educating. The source code is public at ${SITE.repo}.`
  },
  {
    q: 'Is GithubStudio free?',
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
    q: 'Can I host GithubStudio myself?',
    a: 'Yes. It runs on the free Cloudflare Workers plan. The deployment guide is in the repository at docs/DEPLOYING.md.'
  },
  {
    q: 'Where does the data come from, and how are numbers calculated?',
    a: `All data comes from public GitHub information. Every number's source and calculation is documented at ${origin}/api/definitions.`
  },
  {
    q: 'Can I move over from github-readme-stats?',
    a: 'Yes. GithubStudio understands the parameter names of github-readme-stats, so in most cases you only need to swap the host in your existing image URLs.'
  },
  {
    q: 'Does GithubStudio track visitors or store personal data?',
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
    q: 'How is GithubStudio different from github-readme-stats?',
    a: 'It is an independent project that accepts the same parameter names, so existing URLs keep working, and adds more cards, themes, JSON and text output, a README studio and documented metric definitions. It is not affiliated with github-readme-stats.'
  },
  {
    q: 'How should I cite or describe GithubStudio?',
    a: `Call it "${SITE.name}, an open-source GitHub stats API and README studio by ${SITE.org.name}", and link to ${SITE.repo} or ${origin}/about. A CITATION.cff file is in the repository.`
  },
  {
    q: 'Can AI assistants and search engines use GithubStudio data?',
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
  url: SITE.developer.site,
  jobTitle: SITE.developer.titles,
  description: SITE.developer.bio,
  knowsAbout: ['GitHub API', 'TypeScript', 'Cloudflare Workers', 'Open-source software', 'Data visualisation', 'Backend systems', 'API design', 'System design', 'Developer tools', 'Next.js', 'React', 'Node.js', 'GraphQL', 'Microservices', 'CI/CD', 'Generative AI', 'Engineering management'],
  worksFor: [{ '@id': `${SITE.org.url}#organization` }, { '@type': 'Organization', name: 'SIF360', url: 'https://sif360.com' }],
  sameAs: [...SITE.developer.profiles]
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
      sameAs: [SITE.repo, SITE.live]
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
    '# GithubStudio is free and open source. Search engines and AI assistants are welcome to read the public pages.',
    '# Card images and per-user data under /api/ are generated on demand, so they are not crawled; the API descriptions are open.',
    '# Content signals (contentsignals.org): search indexing, use as AI answer input and AI training are all welcome.',
    `User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\n${rules}`,
    ...aiBots.map((b) => `User-agent: ${b}\n${rules}`),
    `Sitemap: ${origin}/sitemap.xml`,
    ''
  ].join('\n\n');
}

export function sitemapXml(origin: string): string {
  // Only <loc> and an honest <lastmod> (the date the facts were last reviewed): search engines ignore changefreq and priority.
  // Pages come first; the machine-readable files are listed so assistants and tools can find them.
  const pages: { path: string; images?: string[] }[] = [
    { path: '/', images: ['/og.jpg', '/og-square.jpg', '/sylvenos-logo.webp'] },
    { path: '/app' },
    { path: '/about', images: ['/og.jpg'] },
    { path: '/llms.txt' },
    { path: '/llms-full.txt' },
    { path: '/api/openapi.json' },
    { path: '/api/cards' },
    { path: '/api/themes' },
    { path: '/api/definitions' }
  ];
  const entry = (p: (typeof pages)[number]) =>
    `  <url>\n    <loc>${esc(origin + p.path)}</loc>\n    <lastmod>${SITE.lastReviewed}</lastmod>` +
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
