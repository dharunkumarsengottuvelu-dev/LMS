import { SubmissionService } from "@/services/submission.service";
import { CodingProblemsService } from "@/services/coding-problems.service";

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

// Clean initial leaderboard - no fake static users
export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [];

export class CodingLeaderboardService {
  /**
   * Generates dynamic cohort rankings strictly based on real student submissions
   */
  public static getLeaderboard(): LeaderboardEntry[] {
    const submissions = SubmissionService.getStudentSubmissions();
    if (!submissions || submissions.length === 0) {
      return [];
    }

    const allProblems = CodingProblemsService.getAllProblems();
    const problemDifficultyMap = new Map<string, string>();
    allProblems.forEach((p) => {
      problemDifficultyMap.set(p.id, p.difficulty || "easy");
      if (p.slug) problemDifficultyMap.set(p.slug, p.difficulty || "easy");
    });

    // Group submissions by student
    const studentMap = new Map<
      string,
      {
        studentId: string;
        name: string;
        solvedProblemIds: Set<string>;
        easySolved: number;
        mediumSolved: number;
        hardSolved: number;
        totalSubmissions: number;
        acceptedSubmissions: number;
        score: number;
      }
    >();

    submissions.forEach((sub) => {
      const studentId = sub.student_id || "current-user";
      const studentName = (sub as any).student_name || "Current Learner";

      let record = studentMap.get(studentId);
      if (!record) {
        record = {
          studentId,
          name: studentName,
          solvedProblemIds: new Set<string>(),
          easySolved: 0,
          mediumSolved: 0,
          hardSolved: 0,
          totalSubmissions: 0,
          acceptedSubmissions: 0,
          score: 0,
        };
        studentMap.set(studentId, record);
      }

      record.totalSubmissions++;

      if (sub.status === "accepted" && !record.solvedProblemIds.has(sub.problem_id)) {
        record.solvedProblemIds.add(sub.problem_id);
        record.acceptedSubmissions++;

        const diff = problemDifficultyMap.get(sub.problem_id) || "easy";
        if (diff === "easy") {
          record.easySolved++;
          record.score += 100;
        } else if (diff === "medium") {
          record.mediumSolved++;
          record.score += 150;
        } else if (diff === "hard") {
          record.hardSolved++;
          record.score += 250;
        }
      }
    });

    if (studentMap.size === 0) {
      return [];
    }

    const list: LeaderboardEntry[] = Array.from(studentMap.values()).map((s) => {
      const rate =
        s.totalSubmissions > 0
          ? ((s.acceptedSubmissions / s.totalSubmissions) * 100).toFixed(1) + "%"
          : "0.0%";

      return {
        rank: 1,
        studentId: s.studentId,
        name: s.name,
        solvedCount: s.solvedProblemIds.size,
        easySolved: s.easySolved,
        mediumSolved: s.mediumSolved,
        hardSolved: s.hardSolved,
        acceptanceRate: rate,
        score: s.score,
        streakDays: s.solvedProblemIds.size > 0 ? 1 : 0,
        isCurrentUser: true,
      };
    });

    // Sort descending by score, then solvedCount
    list.sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount);

    // Assign 1-indexed ranks
    list.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return list;
  }
}
