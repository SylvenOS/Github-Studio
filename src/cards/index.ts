import type { CardDefinition } from './types';
import { achievementsCard } from './achievements';
import { activityCard } from './activity';
import { asciiCard } from './ascii';
import { badgeCard } from './badge';
import { contributionsCard } from './contributions';
import { languagesCard } from './languages';
import { profileCard } from './profile';
import { radarCard } from './radar';
import { repoCard } from './repo';
import { statsCard } from './stats';
import { streakCard } from './streak';
import { topReposCard } from './top-repos';

/** Register new cards here — that's the only wiring a card needs. */
export const cards: CardDefinition[] = [
  statsCard,
  profileCard,
  asciiCard,
  languagesCard,
  streakCard,
  contributionsCard,
  repoCard,
  topReposCard,
  radarCard,
  achievementsCard,
  activityCard,
  badgeCard
];

const byId = new Map(cards.flatMap((c) => [c.id, ...(c.aliases ?? [])].map((id) => [id, c] as const)));

export const findCard = (id: string) => byId.get(id);
