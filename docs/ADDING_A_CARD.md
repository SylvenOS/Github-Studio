# Adding a card

A card is one file in `src/cards/` that exports a definition. Routing, `format=json`, caching, error cards, the `/api/cards` listing, the OpenAPI document, the Playground and the Store all pick it up automatically.

## 1. Create the file

`src/cards/my-card.ts`:

```ts
import { defineCard } from './types';
import { bool, int, oneOf } from '../core/params';
import { compact, esc } from '../core/text';
import { anim, contentTop, frame, messageCard, PAD } from '../svg/frame';

const STYLES = ['bars', 'dots'] as const;

interface Params {
  style: (typeof STYLES)[number];
  limit: number;
  values: boolean;
}

export const myCard = defineCard<Params, { name: string; stars: number }[]>({
  id: 'my-card',
  aliases: ['mine'],
  category: 'repositories',                     // see CardCategory in types.ts
  tags: ['example', 'stars'],                   // extra Store search words
  variants: [                                   // ready-made looks; the first is the default
    { label: 'Bars' },
    { label: 'Dots', params: { style: 'dots', values: 'true' } }
  ],
  title: 'My Card',
  description: 'One sentence that says what the card shows.',
  params: [                                     // documents every card-specific option
    { name: 'style', type: 'enum', options: [...STYLES], default: 'bars', description: 'Chart style' },
    { name: 'limit', type: 'number', default: 5, min: 1, max: 10, description: 'How many items' },
    { name: 'values', type: 'boolean', default: false, description: 'Print the value on each item' }
  ],
  parse: (q) => ({                              // validate and clamp; fall back to defaults
    style: oneOf(q.style, STYLES, 'bars'),
    limit: int(q.limit, 5, 1, 10),
    values: bool(q.values, false)
  }),
  load: async (client, _p, common) => {
    const user = await client.getUser(common.username);
    return user.repos.map((r) => ({ name: r.name, stars: r.stars }));
  },
  toJSON: (data) => data,

  render(data, p, { theme, common, title }) {
    const header = title('My Card');            // undefined when the user hides the header
    const rows = data.slice(0, p.limit);
    if (!rows.length) return messageCard('No repositories found.', theme, { title: header ?? 'My Card', tone: 'info' });

    const top = contentTop(!!header);
    const width = 480;
    const body = rows
      .map((r, i) => `<g${anim(common.animation, i)}><text x="${PAD}" y="${top + 20 + i * 24}" class="fg" font-size="13">${esc(r.name)}</text>` +
        (p.values ? `<text x="${width - PAD}" y="${top + 20 + i * 24}" class="muted" font-size="12" text-anchor="end">${compact(r.stars)}</text>` : '') + '</g>')
      .join('');

    return frame(body, {
      width,
      height: top + 10 + rows.length * 24 + PAD,
      theme,
      title: header,
      subtitle: `@${common.username}`,
      label: `My card for ${common.username}`      // accessible description
    });
  }
});
```

## 2. Register it

In `src/cards/index.ts` import it and add it to the `cards` array. The order is the order in the Playground list.

## 3. Test it

Add a test to `test/` (copy the pattern at the bottom of `test/v7.test.ts`):

```ts
it('renders my card', async () => {
  mockGitHub();
  for (const style of ['bars', 'dots']) {
    expect(await svgOf(`/api/my-card?username=octo&style=${style}`)).toContain('My Card');
  }
  expect((await (await get('/api/my-card?username=octo&format=json')).json()).length).toBeGreaterThan(0);
});
```

Also test an empty state and an option with a hostile value (such as `<script>`) to prove the card stays well formed.

## 4. Document it

Add a row to the endpoint table and the option table in `README.md`, and a line under `Unreleased` in `CHANGELOG.md`. If the card shows a number people might misread, add its source and calculation to `src/metrics/definitions.ts`.

## Conventions

- **Colours:** use the classes `fg`, `muted`, `accent`, `bd`, `bg` and, for strokes, `sk-fg`, `sk-accent`, `sk-bd`. Do not hard-code hex values, or themes, `tone` and `card_style` will not work. Chart series use `var(--s0)...`.
- **Icons:** use `icon()` from `src/svg/icons.ts`. The class `ic` lets users recolour or hide icons.
- **Text:** put every piece of user or GitHub text through `esc()`. Use `truncate()` and `wrap()` from `src/core/text.ts` for long text.
- **Numbers:** use `compact()` and `fmt()` so `number_format` and `locale` apply.
- **Size:** keep the SVG under the size limit enforced in `src/index.ts`. Cap list lengths in `parse`.
- **Animation:** off by default. Wrap animated elements with `anim()`.
- **Empty and error states:** return `messageCard(...)` rather than throwing when data is simply missing. Throw `badRequest(...)` only for unusable input.
- **Generic options:** do not re-implement `width`, `padding`, `radius`, `card_style`, `shadow` and so on. `frame()` applies them to every card.
- **Other users:** if the card reads other usernames, return them from `users(params)` so the blocklist covers them.
- **Caching:** the default lifetime is fine. Set `cacheSeconds` for slow-changing or expensive data, or `0` for live counters.
- **Extra data sources:** use the provider layer in `src/providers/fetch.ts` (host allowlist, timeout and size cap), never a bare `fetch`.

## Adding a theme

Add a line to the list in `src/themes/index.ts` using `t(name, background, foreground, muted, accent, border)`. It appears in the web app and in `/api/themes`.

## Adding a profile design

Designs live in `src/designs/systems.ts` and follow the model in `src/designs/model.ts`. Add one entry and it shows up in the `design` card and in README Studio.

## Adding a translation

Add the locale to `src/core/i18n.ts` and fill in the `title.*` and `misc.*` keys. Missing keys fall back to English.
