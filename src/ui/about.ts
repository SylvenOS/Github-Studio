import pkg from '../../package.json';
import { cards } from '../cards';
import { esc } from '../core/text';
import { SITE, faqs, jsonLd, keyFacts } from '../seo';
import { themes } from '../themes';
import { HEAD_SCRIPT, ICONS, PAGE_CSS, UI_SCRIPT, faqItem, footerHtml, headerHtml, icon } from './landing';

/** Extra styles for the About page, on top of the landing page's design system. */
const EXTRA_CSS = `.hero.page{padding:56px 0 64px}.hero.page .wrap{display:block}.hero.page h1{max-width:820px}.hero.page .lead{max-width:700px;margin-bottom:18px}
.meta{color:#9db3a5;font-size:.92rem}.meta a{color:#c9dccf}
.facts .card{display:flex;gap:12px;align-items:flex-start;padding:18px 20px}.facts .card svg{flex:none;color:var(--accent);margin-top:3px}.facts .card p{margin:0;color:var(--fg)}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:20px}
.links a.card{display:block;color:var(--fg);text-decoration:none}.links a.card h3{display:flex;align-items:center;justify-content:space-between;gap:8px}.links a.card h3 svg{color:var(--accent);flex:none}
.links a.card code{color:var(--accent)}
.card code,.prose code{background:var(--surface-2);padding:2px 6px;border-radius:6px}.alt .card code{background:var(--bg)}
.prose{max-width:760px}.prose p+p{margin-top:12px}.prose p{color:var(--muted)}`;

const linkCard = (href: string, title: string, text: string, external = false) =>
  `<a class="card" href="${esc(href)}"${external ? ' rel="noopener"' : ''}><h3>${esc(title)}${icon(ICONS.arrow, 18)}</h3><p>${text}</p></a>`;

/** Server-rendered About / FAQ page: readable by crawlers and AI assistants without running JavaScript. */
export function aboutHtml(origin: string): string {
  const f = faqs(origin);
  const o = esc(origin);
  const n = cards.length;
  const t = Object.keys(themes).length;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>About ProfileFoundry - free GitHub stats cards by SylvenOS</title>
<meta name="description" content="ProfileFoundry is a free, open-source GitHub stats API and README studio by SylvenOS. Learn what it does, how it works, how to use it and how your data is handled.">
<link rel="canonical" href="${o}/about">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#07100c">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ProfileFoundry">
<meta property="og:title" content="About ProfileFoundry - free GitHub stats cards by SylvenOS">
<meta property="og:description" content="Free, open-source stats cards, profile designs and a README studio. An open-source project by SylvenOS.">
<meta property="og:url" content="${o}/about">
<meta property="og:image" content="${o}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="ProfileFoundry: sample GitHub stats, languages and streak cards next to the logo">
<meta property="og:image" content="${o}/og-square.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${o}/og.jpg">
<meta name="author" content="${esc(SITE.developer.name)}">
<link rel="alternate" type="text/markdown" href="/llms.txt" title="llms.txt">
<style>${PAGE_CSS}${EXTRA_CSS}</style>
<script>${HEAD_SCRIPT}</script>
<script type="application/ld+json">${jsonLd(origin, { faq: true, about: true })}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${headerHtml(`<a class="opt" href="/">Home</a><a class="opt" href="#how">How it works</a><a class="opt" href="#faq">FAQ</a><a class="opt" href="${esc(SITE.repo)}" rel="noopener">GitHub</a>`)}

<div class="hero page">
  <div class="wrap">
    <div>
      <span class="eyebrow"><img src="/sylvenos-logo.webp" alt="" width="18" height="19">About the project</span>
      <h1>ProfileFoundry: free GitHub stats cards and README studio</h1>
      <p class="lead">${esc(SITE.name)} is a free, open-source GitHub stats API, card store and README studio. It creates SVG cards, JSON and text from public GitHub data for your profile README, with ${n} cards and ${t} themes.</p>
      <p class="meta">By <a href="${esc(SITE.org.url)}" rel="noopener">${esc(SITE.org.name)}</a> &middot; version ${esc(pkg.version)} &middot; last reviewed <time datetime="${SITE.lastReviewed}">${SITE.lastReviewed}</time></p>
    </div>
  </div>
</div>

<main id="main">
  <article>
  <section>
    <div class="wrap">
      <div class="head"><span class="kicker">At a glance</span><h2>Key facts</h2></div>
      <div class="grid facts">
${keyFacts(origin)
  .map((x) => `        <div class="card">${icon(ICONS.check, 20)}<p>${esc(x)}</p></div>`)
  .join('\n')}
      </div>
    </div>
  </section>

  <section class="alt" id="who">
    <div class="wrap">
      <div class="syl">
        <img class="logo" src="/sylvenos-logo.webp" alt="SylvenOS logo" width="148" height="155" loading="lazy">
        <div>
          <h2 class="word" style="font-size:2rem">Sylven<span>OS</span></h2>
          <span class="motto">${esc(SITE.org.motto)}</span>
          <p>${esc(SITE.name)} is an open-source project by <a href="${esc(SITE.org.url)}" rel="noopener" style="color:#43d36b">${esc(SITE.org.name)}</a>. The code is public under the ${esc(SITE.license.name)} licence at <a href="${esc(SITE.repo)}" rel="noopener" style="color:#43d36b">${esc(SITE.repo.replace('https://', ''))}</a>, where you can read every line, open issues and send contributions.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="how">
    <div class="wrap">
      <div class="head"><span class="kicker">Use it</span><h2>What you can do with it</h2></div>
      <div class="grid">
        <div class="card"><h3>Show your work</h3><p>Stats, languages, streaks, contribution graphs, trophies, year in review, repository timelines and more as images in your README.</p></div>
        <div class="card"><h3>Design a profile</h3><p>Build a whole profile README in the README Studio and export it.</p></div>
        <div class="card"><h3>Use the data</h3><p>Read the same data as JSON for your own tools, or self-host everything on Cloudflare Workers.</p></div>
      </div>
      <pre class="code" tabindex="0" aria-label="Example Markdown"><code>![Stats](${o}/api/stats?username=YOUR_USERNAME&amp;theme=auto)</code></pre>
      <p class="note"><a class="btn primary" href="/app" style="margin-top:6px">Open the Playground</a></p>
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <div class="two">
        <div class="card"><h3>How the numbers are calculated</h3><p>We document the source and the formula behind every number on the cards at <a href="/api/definitions">/api/definitions</a>. Estimates, such as lines of code, are labelled as estimates.</p></div>
        <div class="card"><h3>Accuracy, sources and corrections</h3><p>All data comes from the public GitHub API. We do not invent, rank or sell data, and we say when a figure is an estimate. Each release is described in the <a href="${esc(SITE.repo)}/blob/main/CHANGELOG.md" rel="noopener">changelog</a>, and automated tests run against every card. If something is wrong, <a href="${esc(SITE.repo)}/issues" rel="noopener">open an issue</a>; fixes are recorded in the changelog.</p></div>
        <div class="card"><h3>How to cite</h3><p>Describe it as &ldquo;${esc(SITE.name)}, an open-source GitHub stats API and README studio by ${esc(SITE.org.name)}&rdquo; and link to <a href="${esc(SITE.repo)}" rel="noopener">the repository</a> or this page. A <code>CITATION.cff</code> file is in the repository.</p></div>
      </div>
    </div>
  </section>

  <section id="faq">
    <div class="wrap">
      <div class="head center" style="text-align:center"><span class="kicker">FAQ</span><h2>Frequently asked questions</h2></div>
      <div class="faq">
${f.map((x) => faqItem(x.q, x.a)).join('\n')}
      </div>
    </div>
  </section>

  <section class="alt">
    <div class="wrap links">
      <div class="head"><span class="kicker">Machine-readable</span><h2>For developers and AI assistants</h2></div>
      <div class="grid">
        ${linkCard('/llms.txt', 'llms.txt', 'Plain-text summary for AI assistants.')}
        ${linkCard('/llms-full.txt', 'llms-full.txt', 'Every card, its endpoint and options.')}
        ${linkCard('/api/openapi.json', 'OpenAPI description', 'The whole API in one JSON file.')}
        ${linkCard('/api/cards', 'Cards', 'The card list as JSON.')}
        ${linkCard('/api/themes', 'Themes', 'Every theme as JSON.')}
        ${linkCard(`${SITE.repo}/blob/main/SECURITY.md`, 'Security policy', 'How to report a problem privately. Also at <code>/.well-known/security.txt</code>.', true)}
      </div>
    </div>
  </section>
  </article>

  <div class="final">
    <div class="wrap">
      <h2>Ready to try it?</h2>
      <p>Type your username and see every card with your own data.</p>
      <div class="btns"><a class="btn primary" href="/app">Open the playground</a><a class="btn ghost" href="/">Back to home</a></div>
    </div>
  </div>
</main>

${footerHtml()}
<script>${UI_SCRIPT}</script>
</body>
</html>`;
}
