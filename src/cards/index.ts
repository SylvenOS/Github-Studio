import type { CardDefinition } from './types';
import { achievementsCard } from './achievements';
import { activityCard } from './activity';
import { asciiCard } from './ascii';
import { badgeCard } from './badge';
import { bannerCard } from './banner';
import { compareCard } from './compare';
import { dividerCard } from './divider';
import { impactCard } from './impact';
import { compositeCard } from './composite';
import { skylineCard } from './skyline';
import { techCard } from './tech';
import { typingCard } from './typing';
import { patternsCard } from './patterns';
import { pinnedCard } from './pinned';
import { contributionsCard } from './contributions';
import { languagesCard } from './languages';
import { profileCard } from './profile';
import { radarCard } from './radar';
import { repoCard } from './repo';
import { statsCard } from './stats';
import { streakCard } from './streak';
import { topReposCard } from './top-repos';
import { codeCard } from './code';
import { designCard } from './design';
import { languageTrendCard } from './language-trend';
import { monthlyCard } from './monthly';
import { punchcardCard } from './punchcard';
import { quoteCard } from './quote';
import { repoCompareCard } from './repo-compare';
import { sponsorsCard } from './sponsors';
import { spotifyCard } from './spotify';
import { starsCard } from './stars';
import { viewsCard } from './views';
import { wakatimeCard } from './wakatime';
import { yearCard } from './year';

/** Register new cards here — that's the only wiring a card needs. */
export const cards: CardDefinition[] = [
  designCard,
  statsCard,
  profileCard,
  impactCard,
  asciiCard,
  languagesCard,
  languageTrendCard,
  codeCard,
  techCard,
  streakCard,
  contributionsCard,
  skylineCard,
  patternsCard,
  punchcardCard,
  monthlyCard,
  yearCard,
  repoCard,
  topReposCard,
  pinnedCard,
  starsCard,
  repoCompareCard,
  radarCard,
  achievementsCard,
  sponsorsCard,
  activityCard,
  compareCard,
  badgeCard,
  viewsCard,
  wakatimeCard,
  spotifyCard,
  compositeCard,
  typingCard,
  quoteCard,
  bannerCard,
  dividerCard
];

const byId = new Map(cards.flatMap((c) => [c.id, ...(c.aliases ?? [])].map((id) => [id, c] as const)));

export const findCard = (id: string) => byId.get(id);
