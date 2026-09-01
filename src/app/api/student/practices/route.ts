import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage, getTopicThumbnail } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

import {
  calculateModuleProgress,
  calculateTrackProgressPercentage,
  calculateCompletedModules,
  calculateAnsweredQuestions,
} from "@/lib/practice-progress";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Resolve student batch context
    const batchContext = await getStudentBatchAccess(adminClient, user);

    // 2. Query practice_tracks from database
    const { data: dbTracks } = await adminClient
      .from("practice_tracks")
      .select("*")
      .order("created_at", { ascending: false }) as any;

    // 3. Map and Filter authorized tracks
    const allTracks = (dbTracks || []).map((t: any) => {
      let meta: any = {};
      if (t.tags && t.tags[0]) {
        try {
          meta = JSON.parse(t.tags[0]);
        } catch {}
      }

      const assignedBatches =
        t.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        [];

      const assignedStudents =
        t.assigned_students ||
        meta.assignedStudents ||
        meta.assigned_students ||
        [];

      const isCommon =
        t.is_common === true ||
        String(t.is_common) === "true" ||
        meta.isCommon === true ||
        String(meta.isCommon) === "true" ||
        meta.is_common === true ||
        String(meta.is_common) === "true" ||
        (assignedBatches.length === 0 && assignedStudents.length === 0) ||
        assignedBatches.includes("common") ||
        assignedBatches.includes("all");

      return {
        id: t.id,
        title: t.title,
        category: t.category,
        difficulty: t.difficulty || "medium",
        description: meta.description || t.description || "Practice Track",
        thumbnail: getTopicThumbnail(t.title, t.category, meta.thumbnail || t.thumbnail),
        assigned_by_name: meta.assignedByName || t.assigned_by_name || t.assignedByName || "Admin",
        assigned_batches: assignedBatches,
        assigned_students: assignedStudents,
        sub_modules: meta.subModules || t.sub_modules || t.subModules || [],
        is_common: isCommon,
        status: t.status || meta.status || "published",
        created_at: t.created_at,
      };
    });

    const authorizedTracks = allTracks.filter((track: any) =>
      track.status !== "draft" && isContentVisibleToStudent(track, batchContext)
    );

    // 4. Calculate student progress for authorized tracks across all student identifiers
    const studentFilter = `student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId},student_id.eq.${user.id}`;

    const { data: submissions } = await adminClient
      .from("coding_submissions")
      .select("problem_id, status")
      .or(studentFilter) as any;

    const completedProblemIds = new Set<string>();
    (submissions || []).forEach((sub: any) => {
      if (sub.status === "accepted" || sub.status === "passed") {
        completedProblemIds.add(sub.problem_id);
      }
    });

    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("assessment_id, status, score, total_marks, answers")
      .or(studentFilter) as any;

    const attemptsMap = new Map<string, any>();
    (attempts || []).forEach((att: any) => {
      attemptsMap.set(att.assessment_id, att);
    });

    // 5. Map tracks with real question-weighted module counts and overall progress strictly from Database
    const mappedTracks = authorizedTracks.map((track: any) => {
      let totalQuestionsAcrossTrack = 0;
      let completedQuestionsAcrossTrack = 0;

      const subModules = (track.sub_modules || track.subModules || []).map((sm: any) => {
        const directMcqs = sm.mcqQuestions?.length || sm.mcqs?.length || 0;
        const directCoding = sm.codingQuestions?.length || sm.codingProblems?.length || 0;
        const sectionMcqs = sm.sections?.flatMap((s: any) => s.mcqQuestions || []).length || 0;
        const sectionCoding = sm.sections?.flatMap((s: any) => s.codingQuestions || []).length || 0;
        const mcqsCount = Math.max(directMcqs, sectionMcqs);
        const codingCount = Math.max(
          directCoding,
          sectionCoding,
          (sm.type === "coding" || sm.problemDescription) && (mcqsCount + directCoding + sectionCoding === 0) ? 1 : 0
        );
        let qCount = mcqsCount + codingCount;
        if (qCount === 0) {
          qCount = sm.questionCount || sm.question_count || sm.questions?.length || 1;
        }

        const attempt = attemptsMap.get(sm.id);
        const isAttemptCompleted = Boolean(
          attempt && (attempt.status === "submitted" || attempt.status === "auto_submitted" || attempt.status === "passed")
        );
        const codingProblemsList = sm.codingQuestions || sm.codingProblems || [];
        const solvedProblemsCount = codingProblemsList.filter((p: any) => completedProblemIds.has(p.id)).length;

        let answeredInAttempt = 0;
        if (attempt && attempt.answers && typeof attempt.answers === "object") {
          answeredInAttempt = calculateAnsweredQuestions(attempt.answers, qCount);
        }
        if (solvedProblemsCount > 0) {
          answeredInAttempt = Math.max(answeredInAttempt, solvedProblemsCount);
        }

        let completedQuestionsInModule = 0;
        let isCompleted = false;
        let status: "not_started" | "in_progress" | "completed" = "not_started";

        if (isAttemptCompleted) {
          completedQuestionsInModule = Math.min(qCount, answeredInAttempt);
          if (completedQuestionsInModule >= qCount && qCount > 0) {
            isCompleted = true;
            status = "completed";
          } else {
            status = completedQuestionsInModule > 0 ? "in_progress" : "not_started";
          }
        } else if (solvedProblemsCount > 0) {
          completedQuestionsInModule = Math.min(qCount, solvedProblemsCount);
          if (completedQuestionsInModule >= qCount && qCount > 0) {
            isCompleted = true;
            status = "completed";
          } else {
            status = "in_progress";
          }
        } else if (sm.problemId && completedProblemIds.has(sm.problemId)) {
          isCompleted = true;
          completedQuestionsInModule = qCount;
          status = "completed";
        }

        totalQuestionsAcrossTrack += qCount;
        completedQuestionsAcrossTrack += completedQuestionsInModule;

        const modulePercentage = calculateModuleProgress(completedQuestionsInModule, qCount);

        return {
          id: sm.id,
          title: sm.title,
          type: sm.type || "coding",
          durationMinutes: typeof sm.durationMinutes === "number" ? sm.durationMinutes : (typeof sm.duration_minutes === "number" ? sm.duration_minutes : 0),
          totalMarks: sm.totalMarks || sm.total_marks || 100,
          questionCount: qCount,
          totalQuestions: qCount,
          completedQuestions: completedQuestionsInModule,
          percentage: modulePercentage,
          status,
        };
      });

      const totalSubModules = subModules.length;
      const completedSubModules = calculateCompletedModules(subModules);
      const progressPercentage = calculateTrackProgressPercentage(
        completedQuestionsAcrossTrack,
        totalQuestionsAcrossTrack
      );

      return {
        id: track.id,
        title: track.title,
        category: track.category || "General",
        description: track.description || "Practice Track",
        thumbnail: track.thumbnail || "",
        assignedByName: track.assigned_by_name || track.assignedByName || "Admin",
        subModules,
        totalModules: totalSubModules,
        totalProblems: totalQuestionsAcrossTrack,
        totalQuestions: totalQuestionsAcrossTrack,
        completedProblems: completedQuestionsAcrossTrack,
        completedQuestions: completedQuestionsAcrossTrack,
        completedModules: completedSubModules,
        progressPercentage,
      };
    });

    // Deduplicate tracks by title & id
    const seenTrackKeys = new Set<string>();
    const uniqueTracks = mappedTracks.filter((t: any) => {
      const key = `${t.title}`.trim().toLowerCase();
      if (seenTrackKeys.has(key)) return false;
      seenTrackKeys.add(key);
      return true;
    });

    return NextResponse.json({ tracks: uniqueTracks }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/student/practices Error:", error);
    return NextResponse.json(
      {
        error: getErrorMessage(error),
        tracks: [],
      },
      { status: 500 }
    );
  }
}
