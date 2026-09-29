import { ProfileMetrics } from '../metrics';

export type TrophyRank = 'SSS+' | 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type TrophyType = 'commits' | 'prs' | 'contributions' | 'repos' | 'stars' | 'followers';

export interface Trophy {
  id: string;
  type: TrophyType;
  title: string;
  description: string;
  rank: TrophyRank;
  value: number;
}

// Logic for mapping a value to a rank based on category thresholds
function determineRank(value: number, thresholds: number[]): TrophyRank {
  const ranks: TrophyRank[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'SSS+'];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) {
      return ranks[i + 1] || 'SSS+';
    }
  }
  return 'E';
}

export function calculateTrophies(metrics: ProfileMetrics): Trophy[] {
  // Thresholds for [D, C, B, A, S, SS, SSS, SSS+]
  return [
    {
      id: "total_commits",
      type: "commits",
      title: "Commit Machine",
      description: "Total number of commits",
      value: metrics.commits,
      rank: determineRank(metrics.commits, [10, 100, 500, 1000, 2000, 5000, 10000, 20000])
    },
    {
      id: "total_prs",
      type: "prs",
      title: "PR Creator",
      description: "Total pull requests opened",
      value: metrics.pullRequests,
      rank: determineRank(metrics.pullRequests, [1, 10, 50, 100, 250, 500, 1000, 2000])
    },
    {
      id: "total_contributions",
      type: "contributions",
      title: "Open Source Contributor",
      description: "Total yearly contributions",
      value: metrics.contributions,
      rank: determineRank(metrics.contributions, [50, 200, 500, 1000, 2000, 4000, 8000, 10000])
    },
    {
      id: "total_repos",
      type: "repos",
      title: "Repository Builder",
      description: "Public repositories created",
      value: metrics.repositories,
      rank: determineRank(metrics.repositories, [1, 5, 10, 25, 50, 100, 200, 500])
    },
    {
      id: "total_stars",
      type: "stars",
      title: "Stargazer",
      description: "Stars earned across repositories",
      value: metrics.stars,
      rank: determineRank(metrics.stars, [10, 50, 100, 500, 1000, 5000, 10000, 50000])
    },
    {
      id: "total_followers",
      type: "followers",
      title: "Influencer",
      description: "Total GitHub followers",
      value: metrics.followers,
      rank: determineRank(metrics.followers, [5, 20, 50, 100, 500, 1000, 5000, 10000])
    }
  ];
}
