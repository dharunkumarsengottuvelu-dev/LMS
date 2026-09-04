export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  avatar?: string;
  solvedCount: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: string;
  score: number;
  streakDays: number;
  isCurrentUser?: boolean;
}

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [];

let cachedLeaderboard: LeaderboardEntry[] = [];

export class CodingLeaderboardService {
  /**
   * Fetches dynamic cohort rankings strictly from the backend database API
   */
  public static async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch("/api/coding/leaderboard", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Failed to fetch leaderboard, status:", res.status);
        return cachedLeaderboard;
      }

      const data = await res.json();
      if (data && Array.isArray(data.leaderboard)) {
        cachedLeaderboard = data.leaderboard;
        return data.leaderboard;
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
    return cachedLeaderboard;
  }

  /**
   * Synchronous getter returning latest fetched leaderboard or empty array
   */
  public static getLeaderboard(): LeaderboardEntry[] {
    return cachedLeaderboard;
  }
}
