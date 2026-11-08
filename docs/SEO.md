# Search, AI answers and trust: how ProfileFoundry is set up, and what is left to do

This page lists what the project already does for search engines (SEO), answer engines (AEO), generative engines (GEO), AI assistants (LLMO / AI SEO) and trust signals (E-E-A-T), and the steps that only the owners can take. Nobody can guarantee rankings; these are the practices that make the project easy to find, read, quote and trust.

## Already built in

| Area | What is in place | Where |
|---|---|---|
| Crawlable content | Server-rendered landing page at `/` (hero, live example cards, features, SylvenOS section, FAQ with `FAQPage` markup) and `/about` page with real headings, text and a FAQ. The app itself needs JavaScript, so the About page is what crawlers read. `<noscript>` text and one static `h1` on the app page | `src/seo.ts`, `src/ui/page.ts` |
| Page basics | Unique titles and descriptions, canonical URLs per deployment, `lang`, viewport, robots meta with large snippets allowed | `src/ui/page.ts`, `src/seo.ts` |
| Social previews | Open Graph and Twitter card tags with a 1200x630 share image at `/og.jpg` and a 1200x1200 square version at `/og-square.jpg`, both with alt text; they are also listed in the sitemap | `assets/og-image.jpg`, `assets/og-square.jpg` |
| Structured data (JSON-LD) | `Organization` (SylvenOS), `Person` (Akshay Kurve, with alternate names), `WebSite`, `SoftwareApplication` (free, MIT, version, repository), and `FAQPage` on `/about` | `src/seo.ts` |
| Answer engines (AEO) | A question-and-answer FAQ written as short, self-contained answers, marked up as `FAQPage` | `/about` |
| Generative engines and AI assistants (GEO, LLMO) | `/llms.txt` (summary and links) and `/llms-full.txt` (every card, endpoint and option), the OpenAPI description, plain-language definitions of every metric, AI crawlers explicitly allowed in `robots.txt` | `src/seo.ts` |
| Crawling | `robots.txt`, `sitemap.xml`, `X-Robots-Tag: noindex` on generated card images and per-user data, `Link` headers pointing to the OpenAPI and llms.txt | `src/index.ts` |
| E-E-A-T | A named main developer and organisation on every page and in the data, public source code and licence, documented calculations, a security policy and `/.well-known/security.txt`, a privacy answer that matches what the code does, a changelog, `CITATION.cff`, byline, version and last-reviewed date, accuracy and corrections policy, how-to-cite guidance | repository root, `/about`, `/llms.txt` |

Every URL in these files uses the host the request came from, so a self-hosted copy describes itself correctly.

## Still to do (needs the owners)

1. **GitHub repository settings.** Set the About description, website (the live URL or sylvenos.com) and topics, for example: `github-stats`, `github-readme-stats`, `profile-readme`, `readme`, `svg`, `cloudflare-workers`, `hono`, `typescript`, `open-source`. Upload `assets/og-image.jpg` as the social preview image.
2. **Search consoles.** After deploying, verify the site in Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml`.
3. **Link both ways with sylvenos.com.** Publish a ProfileFoundry page on sylvenos.com that links to the live app and the repository, and use the same `Organization` data there (name, URL, and a `sameAs` that includes the GitHub repository). Consider a subdomain such as `stats.sylvenos.com` for the live app so the two sites reinforce each other.
4. **Strengthen the author profile (E-E-A-T).** Add a short real bio for Akshay Kurve (also written Akshay D Kurve or Akshay Dhanraj Kurve) on sylvenos.com or GitHub, and add real profile links (for example LinkedIn) to `SITE.developer` and `sameAs` in `src/seo.ts`. Only add facts that are true and public.
5. **Publish about it.** A launch post, release notes for each version, and an example gallery help people and AI systems find real usage. Keep the version in `package.json` and `CITATION.cff` in step.
6. **Keep answers current.** When cards or behaviour change, bump `SITE.lastReviewed` in `src/seo.ts` (it feeds the visible date and `dateModified`), update `src/seo.ts` (FAQ, llms.txt are generated from the cards) and `docs/` so what assistants quote stays true.
7. **Check your work.** Use Google's Rich Results Test and the Schema Markup Validator on `/about`, and test sharing the URL in Slack, Discord and X to confirm the preview image.

## Rules of thumb

- The developer's name is kept out of visible page text and search snippets on purpose. It appears only in structured data, `llms.txt` and the author meta tag. To show it again, edit `faqs`, `keyFacts` and the page templates in `src/seo.ts` and `src/ui/landing.ts`.

- Say true, specific things in plain language. Do not stuff keywords or add claims you cannot back up (user counts, awards, ratings).
- Keep one name: **ProfileFoundry**, by **SylvenOS**, main developer **Akshay Kurve**.
- Never hide content from users that crawlers can see, or the other way round.
- Do not put promotional links inside generated card images.
