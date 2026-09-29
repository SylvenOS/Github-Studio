import type { CommonParams, ParamDoc, Query } from '../core/params';
import type { GitHubClient } from '../github/client';
import type { ResolvedTheme } from '../themes';

export interface RenderContext {
  theme: ResolvedTheme;
  common: CommonParams;
  /** Header text for the card: the user's `title`, else the default; undefined when hidden. */
  title(fallback: string): string | undefined;
}

/**
 * A card = the contract for one endpoint (`/api/<id>`).
 * Add a new card by creating a definition and registering it in `cards/index.ts`; routing,
 * `format=json`, caching, error cards, `/api/cards` metadata and the playground all come for free.
 */
export interface CardDefinition<P = any, D = any> {
  id: string;
  aliases?: string[];
  title: string;
  description: string;
  /** Card-specific query parameters (common ones are documented centrally). */
  params: ParamDoc[];
  /** Validate and normalise card-specific query params. Throw `badRequest` on invalid input. */
  parse(query: Query, common: CommonParams): P;
  /** Fetch everything the card needs. Results must be JSON-serialisable. */
  load(client: GitHubClient, params: P, common: CommonParams): Promise<D>;
  render(data: D, params: P, ctx: RenderContext): string;
  /** Shape returned for `format=json`. Defaults to the loaded data. */
  toJSON?(data: D, params: P): unknown;
}

export const defineCard = <P, D>(card: CardDefinition<P, D>): CardDefinition<P, D> => card;
