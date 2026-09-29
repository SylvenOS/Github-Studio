import type { CommonParams, ParamDoc, Query } from '../core/params';
import type { Translate } from '../core/i18n';
import type { GitHubClient } from '../github/client';
import type { ResolvedTheme } from '../themes';

export type CardCategory = 'overview' | 'activity' | 'languages' | 'repositories' | 'achievements' | 'art' | 'decor' | 'utility';

/** A ready-made style of a card: what the store shows and what the README builder inserts. */
export interface CardVariant {
  label: string;
  /** Query parameters that produce this look (merged over the user's own settings). */
  params?: Record<string, string>;
}

export interface RenderContext {
  theme: ResolvedTheme;
  common: CommonParams;
  /** Header text for the card: the user's `title`, else the default; undefined when hidden. */
  title(fallback: string): string | undefined;
  /** Translates labels into the request's `locale`. */
  t: Translate;
}

/**
 * A card = the contract for one endpoint (`/api/<id>`).
 * Add a new card by creating a definition and registering it in `cards/index.ts`; routing,
 * `format=json`, caching, error cards, `/api/cards` metadata and the playground all come for free.
 */
export interface CardDefinition<P = any, D = any> {
  id: string;
  aliases?: string[];
  /** Grouping in the store. */
  category: CardCategory;
  /** Extra search keywords for the store. */
  tags?: string[];
  /** Ready-made styles shown in the store; the first is the default look. */
  variants?: CardVariant[];
  /** `false` for decorative cards that don't need a GitHub username (banner, divider). Default true. */
  needsUser?: boolean;
  title: string;
  description: string;
  /** Card-specific query parameters (common ones are documented centrally). */
  params: ParamDoc[];
  /** Validate and normalise card-specific query params. Throw `badRequest` on invalid input. */
  parse(query: Query, common: CommonParams): P;
  /** Other GitHub users this request touches (besides `username`), so the blocklist can cover them. */
  users?(params: P): string[];
  /** Fetch everything the card needs. Results must be JSON-serialisable. */
  load(client: GitHubClient, params: P, common: CommonParams): Promise<D>;
  render(data: D, params: P, ctx: RenderContext): string;
  /** Shape returned for `format=json`. Defaults to the loaded data. */
  toJSON?(data: D, params: P): unknown;
  /** Plain-text rendering for `format=text` (cards that have one, e.g. ascii). */
  toText?(data: D, params: P): string;
}

export const defineCard = <P, D>(card: CardDefinition<P, D>): CardDefinition<P, D> => card;
