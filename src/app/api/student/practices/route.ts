import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage, getTopicThumbnail } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

import {
  calculateModuleProgress,
  calculateTrackProgressPercentage,
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

    // 3. Map and Filter authorized tracks (Main Modules)
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

      const displayOrder = typeof t.display_order === "number"
        ? t.display_order
        : (typeof meta.display_order === "number" ? meta.display_order : (typeof meta.displayOrder === "number" ? meta.displayOrder : 0));

      return {
        id: t.id,
        name: t.title,
        title: t.title,
        category: t.category,
        difficulty: t.difficulty || "medium",
        description: t.description || meta.description || "",
        thumbnail: getTopicThumbnail(t.title, t.category, meta.thumbnail || t.thumbnail),
        assigned_by_name: meta.assignedByName || t.assigned_by_name || t.assignedByName || "Admin",
        assigned_batches: assignedBatches,
        assigned_students: assignedStudents,
        sub_modules: meta.subModules || t.sub_modules || t.subModules || [],
        is_common: isCommon,
        status: t.status || meta.status || "published",
        display_order: displayOrder,
        created_at: t.created_at,
      };
    });

    // Student rule: Only active/published records matching student batch
    const authorizedTracks = allTracks.filter((track: any) =>
      track.status !== "draft" && track.status !== "inactive" && isContentVisibleToStudent(track, batchContext)
    );

    // Sort Main Modules by display_order
    authorizedTracks.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

    // 4. Calculate student progress for authorized tracks
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
      .select("id, assessment_id, status, score, total_marks, answers, created_at")
      .or(studentFilter)
      .order("created_at", { ascending: true }) as any;

    const moduleAttemptsMap = new Map<string, any[]>();
    (attempts || []).forEach((att: any) => {
      if (att.assessment_id) {
        const list = moduleAttemptsMap.get(att.assessment_id) || [];
        list.push(att);
        moduleAttemptsMap.set(att.assessment_id, list);
      }
    });

    const practiceSubmissionsSet = new Set<string>();
    try {
      const { data: practiceSubs } = await adminClient
        .from("student_practice_submissions")
        .select("module_id, status")
        .or(studentFilter) as any;
      (practiceSubs || []).forEach((ps: any) => {
        if (ps.status === "completed" || ps.status === "passed") {
          practiceSubmissionsSet.add(ps.module_id);
        }
      });
    } catch {}

    // 5. Structure the dynamic 3-level hierarchy: Main Module -> Submodule -> Module
    const mappedTracks = authorizedTracks.map((track: any) => {
      let totalQuestionsAcrossTrack = 0;
      let completedQuestionsAcrossTrack = 0;
      let totalModulesInTrack = 0;
      let completedModulesInTrack = 0;

      const rawSubmodules: any[] = Array.isArray(track.sub_modules) ? track.sub_modules : [];

      // Filter only active submodules (Level 2)
      const activeSubmodules = rawSubmodules
        .filter((sm: any) => sm.status !== "inactive")
        .sort((a: any, b: any) => (a.display_order ?? a.displayOrder ?? 0) - (b.display_order ?? b.displayOrder ?? 0))
        .map((sm: any) => {
          let rawModules: any[] = [];
          if (Array.isArray(sm.modules) && sm.modules.length > 0) {
            rawModules = sm.modules;
          } else if (
            (Array.isArray(sm.mcqQuestions) && sm.mcqQuestions.length > 0) ||
            (Array.isArray(sm.codingQuestions) && sm.codingQuestions.length > 0) ||
            sm.type
          ) {
            rawModules = [
              {
                id: sm.id,
                submodule_id: sm.id,
                name: sm.name || sm.title,
                title: sm.name || sm.title,
                description: sm.description || "",
                status: sm.status || "active",
                display_order: 0,
                type: sm.type || "mixed",
                durationMinutes: typeof sm.durationMinutes === "number" ? sm.durationMinutes : 60,
                totalMarks: sm.totalMarks || 100,
                questionCount: sm.questionCount || 0,
                mcqQuestions: sm.mcqQuestions || [],
                codingQuestions: sm.codingQuestions || [],
              },
            ];
          }

          // Filter only active modules (Level 3)
          const activeModules = rawModules
            .filter((m: any) => m.status !== "inactive")
            .sort((a: any, b: any) => (a.display_order ?? a.displayOrder ?? 0) - (b.display_order ?? b.displayOrder ?? 0))
            .map((m: any) => {
              const directMcqs = m.mcqQuestions?.length || m.mcqs?.length || 0;
              const directCoding = m.codingQuestions?.length || m.codingProblems?.length || 0;
              let qCount = directMcqs + directCoding;
              if (qCount === 0) {
                qCount = m.questionCount || m.question_count || 1;
              }

              const modAttempts = moduleAttemptsMap.get(m.id) || [];
              const completedAttempts = modAttempts.filter((a: any) =>
                a.status === "submitted" || a.status === "completed" || a.status === "passed" || a.status === "auto_submitted"
              );
              const activeAttempt = modAttempts.find((a: any) => a.status === "in_progress");

              const isPracticeSubDone = practiceSubmissionsSet.has(m.id);
              const isAttemptCompleted = completedAttempts.length > 0;
              const isCompleted = isPracticeSubDone || isAttemptCompleted;

              let answeredInActiveAttempt = 0;
              if (activeAttempt && activeAttempt.answers && typeof activeAttempt.answers === "object") {
                answeredInActiveAttempt = calculateAnsweredQuestions(activeAttempt.answers, qCount);
              }

              const codingProblemsList = m.codingQuestions || m.codingProblems || [];
              const solvedProblemsCount = codingProblemsList.filter((p: any) => completedProblemIds.has(p.id)).length;
              if (solvedProblemsCount > 0) {
                answeredInActiveAttempt = Math.max(answeredInActiveAttempt, solvedProblemsCount);
              }

              let completedQuestionsInModule = 0;
              let modStatus: "not_started" | "in_progress" | "completed" = "not_started";

              if (isCompleted) {
                completedQuestionsInModule = qCount;
                modStatus = "completed";
              } else if (activeAttempt || answeredInActiveAttempt > 0) {
                completedQuestionsInModule = Math.min(qCount, answeredInActiveAttempt);
                modStatus = "in_progress";
              }

              totalQuestionsAcrossTrack += qCount;
              completedQuestionsAcrossTrack += completedQuestionsInModule;
              totalModulesInTrack += 1;
              if (isCompleted) {
                completedModulesInTrack += 1;
              }

              const modulePercentage = isCompleted
                ? 100
                : calculateModuleProgress(completedQuestionsInModule, qCount);

              return {
                id: m.id,
                submodule_id: sm.id,
                main_module_id: track.id,
                name: m.name || m.title || "Module",
                title: m.name || m.title || "Module",
                description: m.description || "",
                type: m.type || "mixed",
                durationMinutes: typeof m.durationMinutes === "number" ? m.durationMinutes : 60,
                totalMarks: m.totalMarks || 100,
                questionCount: qCount,
                completedQuestions: completedQuestionsInModule,
                percentage: modulePercentage,
                status: modStatus,
                display_order: m.display_order ?? m.displayOrder ?? 0,
              };
            });

          return {
            id: sm.id,
            main_module_id: track.id,
            name: sm.name || sm.title || "Submodule",
            title: sm.name || sm.title || "Submodule",
            description: sm.description || "",
            status: sm.status || "active",
            display_order: sm.display_order ?? sm.displayOrder ?? 0,
            modules: activeModules,
            moduleCount: activeModules.length,
          };
        });

      const progressPercentage = calculateTrackProgressPercentage(
        completedQuestionsAcrossTrack,
        totalQuestionsAcrossTrack
      );

      return {
        id: track.id,
        name: track.name || track.title,
        title: track.title,
        category: track.category,
        difficulty: track.difficulty,
        description: track.description,
        thumbnail: track.thumbnail,
        assignedByName: track.assigned_by_name,
        assignedBy: "Admin",
        submodules: activeSubmodules,
        subModules: activeSubmodules,
        totalSubmodules: activeSubmodules.length,
        totalModules: totalModulesInTrack,
        completedModules: completedModulesInTrack,
        totalProblems: totalQuestionsAcrossTrack,
        progressPercentage,
        display_order: track.display_order ?? 0,
        createdAt: track.created_at,
      };
    });

    return NextResponse.json({
      tracks: mappedTracks,
      count: mappedTracks.length,
    });
  } catch (error) {
    console.error("GET /api/student/practices error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
