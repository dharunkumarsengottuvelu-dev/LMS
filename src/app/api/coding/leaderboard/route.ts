import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminClient = createAdminClient();

    // 1. Fetch all coding submissions
    const { data: submissions, error: subsErr } = await adminClient
      .from("coding_submissions")
      .select("id, problem_id, student_id, status, created_at")
      .order("created_at", { ascending: false });

    if (subsErr) throw subsErr;

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({
        success: true,
        leaderboard: [],
      });
    }

    // 2. Fetch all problems to map difficulty
    const { data: problems } = await adminClient
      .from("coding_problems")
      .select("id, slug, difficulty");

    const problemDiffMap = new Map<string, string>();
    (problems || []).forEach((p: any) => {
      problemDiffMap.set(p.id, p.difficulty || "medium");
      if (p.slug) problemDiffMap.set(p.slug, p.difficulty || "medium");
    });

    // 3. Fetch student profiles
    const studentIds = Array.from(new Set(submissions.map((s: any) => s.student_id).filter(Boolean)));
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, avatar_url")
      .in("id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.id, p);
      if (p.user_id) profileMap.set(p.user_id, p);
    });

    // Current user's profile ID
    let currentProfileId: string | null = null;
    if (user) {
      const { data: curProf } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      currentProfileId = curProf?.id || user.id;
    }

    // 4. Group and calculate statistics
    const statsMap = new Map<
      string,
      {
        studentId: string;
        name: string;
        avatar?: string;
        solvedProblemIds: Set<string>;
        easySolved: number;
        mediumSolved: number;
        hardSolved: number;
        totalSubmissions: number;
        acceptedSubmissions: number;
        score: number;
        dates: Set<string>;
      }
    >();

    submissions.forEach((sub: any) => {
      const sId = sub.student_id;
      if (!sId) return;

      let stat = statsMap.get(sId);
      if (!stat) {
        const prof = profileMap.get(sId);
        const name = prof
          ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || prof.email?.split("@")[0] || "Learner"
          : "Learner";

        stat = {
          studentId: sId,
          name,
          avatar: prof?.avatar_url,
          solvedProblemIds: new Set<string>(),
          easySolved: 0,
          mediumSolved: 0,
          hardSolved: 0,
          totalSubmissions: 0,
          acceptedSubmissions: 0,
          score: 0,
          dates: new Set<string>(),
        };
        statsMap.set(sId, stat);
      }

      stat.totalSubmissions++;
      if (sub.created_at) {
        stat.dates.add(sub.created_at.slice(0, 10));
      }

      const isAccepted = sub.status === "accepted" || sub.status === "passed";
      if (isAccepted && !stat.solvedProblemIds.has(sub.problem_id)) {
        stat.solvedProblemIds.add(sub.problem_id);
        stat.acceptedSubmissions++;

        const diff = problemDiffMap.get(sub.problem_id) || "medium";
        if (diff === "easy") {
          stat.easySolved++;
          stat.score += 100;
        } else if (diff === "medium") {
          stat.mediumSolved++;
          stat.score += 150;
        } else if (diff === "hard") {
          stat.hardSolved++;
          stat.score += 250;
        }
      }
    });

    const entries: LeaderboardEntry[] = Array.from(statsMap.values()).map((s) => {
      const rate =
        s.totalSubmissions > 0
          ? ((s.acceptedSubmissions / s.totalSubmissions) * 100).toFixed(1) + "%"
          : "0.0%";

      // Calculate streak
      const sortedDates = Array.from(s.dates).sort().reverse();
      let streak = 0;
      if (sortedDates.length > 0) {
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prevStr = sortedDates[i - 1];
          const currStr = sortedDates[i];
          if (!prevStr || !currStr) break;
          const prev = new Date(prevStr).getTime();
          const curr = new Date(currStr).getTime();
          if (prev - curr <= 86400000 * 1.5) {
            streak++;
          } else {
            break;
          }
        }
      }

      return {
        rank: 1,
        studentId: s.studentId,
        name: s.name,
        avatar: s.avatar,
        solvedCount: s.solvedProblemIds.size,
        easySolved: s.easySolved,
        mediumSolved: s.mediumSolved,
        hardSolved: s.hardSolved,
        acceptanceRate: rate,
        score: s.score,
        streakDays: streak,
        isCurrentUser: currentProfileId ? s.studentId === currentProfileId : false,
      };
    });

    // Sort descending by score, then solvedCount
    entries.sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount);

    // Assign ranks
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return NextResponse.json({
      success: true,
      leaderboard: entries,
    });
  } catch (error: any) {
    console.error("GET /api/coding/leaderboard error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate leaderboard." },
      { status: 500 }
    );
  }
}
