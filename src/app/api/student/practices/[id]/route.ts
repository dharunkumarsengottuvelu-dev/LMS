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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
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

    // 2. Fetch Practice Track (Main Module)
    const { data: dbTrack, error: trackError } = await adminClient
      .from("practice_tracks")
      .select("*")
      .eq("id", trackId)
      .single() as any;

    if (trackError || !dbTrack) {
      return NextResponse.json({ error: "Practice track not found" }, { status: 404 });
    }

    let meta: any = {};
    if (dbTrack.tags && dbTrack.tags[0]) {
      try {
        meta = JSON.parse(dbTrack.tags[0]);
      } catch {}
    }

    const assignedBatches =
      dbTrack.assigned_batches ||
      meta.assignedBatches ||
      meta.assigned_batches ||
      [];

    const assignedStudents =
      dbTrack.assigned_students ||
      meta.assignedStudents ||
      meta.assigned_students ||
      [];

    const isCommon =
      dbTrack.is_common === true ||
      String(dbTrack.is_common) === "true" ||
      meta.isCommon === true ||
      String(meta.isCommon) === "true" ||
      meta.is_common === true ||
      String(meta.is_common) === "true" ||
      (assignedBatches.length === 0 && assignedStudents.length === 0) ||
      assignedBatches.includes("common") ||
      assignedBatches.includes("all");

    const track = {
      id: dbTrack.id,
      title: dbTrack.title,
      category: dbTrack.category,
      difficulty: dbTrack.difficulty || "medium",
      description: meta.description || dbTrack.description || "",
      thumbnail: getTopicThumbnail(dbTrack.title, dbTrack.category, meta.thumbnail || dbTrack.thumbnail),
      assigned_by_name: meta.assignedByName || dbTrack.assigned_by_name || dbTrack.assignedByName || "Admin",
      assigned_batches: assignedBatches,
      assigned_students: assignedStudents,
      sub_modules: meta.subModules || dbTrack.sub_modules || dbTrack.subModules || [],
      is_common: isCommon,
      status: dbTrack.status || meta.status || "published",
      created_at: dbTrack.created_at,
    };

    // Server-side authorization check
    const isAuthorized = isContentVisibleToStudent(track, batchContext);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Access Denied. You do not belong to the assigned batch for this practice track." },
        { status: 403 }
      );
    }

    // 3. Fetch SubModules & their coding problems / questions
    const rawSubmodules: any[] = Array.isArray(track.sub_modules) ? track.sub_modules : [];

    // Collect all module IDs for problem and submission lookups
    const allModuleIds: string[] = [];
    rawSubmodules.forEach((sm: any) => {
      if (Array.isArray(sm.modules) && sm.modules.length > 0) {
        sm.modules.forEach((m: any) => { if (m.id) allModuleIds.push(m.id); });
      } else if (sm.id) {
        allModuleIds.push(sm.id);
      }
    });

    let codingProblemsMap: Record<string, any[]> = {};
    if (allModuleIds.length > 0) {
      const { data: codingProblems } = await adminClient
        .from("coding_problems")
        .select(
          "id, title, slug, description, difficulty, assessment_id, time_limit_ms, memory_limit_kb, templates, sample_test_cases"
        )
        .in("assessment_id", allModuleIds) as any;

      if (codingProblems) {
        codingProblems.forEach((cp: any) => {
          if (!codingProblemsMap[cp.assessment_id]) {
            codingProblemsMap[cp.assessment_id] = [];
          }
          const list = codingProblemsMap[cp.assessment_id];
          if (list) {
            list.push(cp);
          }
        });
      }
    }

    // Fetch student's submissions & attempts
    const studentFilter = `student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId},student_id.eq.${user.id}`;

    const { data: submissions } = await adminClient
      .from("coding_submissions")
      .select("problem_id, status, score, max_score, created_at")
      .or(studentFilter) as any;

    const completedProblemsMap = new Map<string, any>();
    (submissions || []).forEach((sub: any) => {
      if (sub.status === "accepted" || sub.status === "passed") {
        completedProblemsMap.set(sub.problem_id, sub);
      }
    });

    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("assessment_id, status, score, total_marks, submitted_at, answers")
      .or(studentFilter) as any;

    const attemptsMap = new Map<string, any>();
    (attempts || []).forEach((att: any) => {
      if (att.status === "submitted" || att.status === "auto_submitted" || att.status === "passed") {
        attemptsMap.set(att.assessment_id, att);
      }
    });

    let totalQuestionsAcrossTrack = 0;
    let completedQuestionsAcrossTrack = 0;
    const flatEnrichedModules: any[] = [];

    // Filter only active submodules and active modules
    const activeSubmodules = rawSubmodules
      .filter((sm: any) => sm.status !== "inactive")
      .sort((a: any, b: any) => (a.display_order ?? a.displayOrder ?? 0) - (b.display_order ?? b.displayOrder ?? 0))
      .map((sm: any, smIdx: number) => {
        let rawModules: any[] = [];
        if (Array.isArray(sm.modules) && sm.modules.length > 0) {
          rawModules = sm.modules;
        } else {
          // Legacy flat submodule with questions
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

        const activeModules = rawModules
          .filter((m: any) => m.status !== "inactive")
          .sort((a: any, b: any) => (a.display_order ?? a.displayOrder ?? 0) - (b.display_order ?? b.displayOrder ?? 0))
          .map((m: any, mIdx: number) => {
            const problems = codingProblemsMap[m.id] || [];
            const rawCombinedCoding = m.codingQuestions && m.codingQuestions.length > 0 ? m.codingQuestions : problems;
            const combinedCoding = rawCombinedCoding.map((cq: any) => {
              const { hidden_test_cases, hiddenTestCases, ...safeCq } = cq;
              return safeCq;
            });
            const directMcqs = m.mcqQuestions?.length || m.mcqs?.length || 0;
            const mcqsCount = directMcqs;
            const codingCount = combinedCoding.length;
            let modTotalQuestions = mcqsCount + codingCount;
            if (modTotalQuestions === 0) {
              modTotalQuestions = m.questionCount || m.question_count || 1;
            }

            const attempt = attemptsMap.get(m.id);
            const isAttemptCompleted = Boolean(
              attempt && (attempt.status === "submitted" || attempt.status === "auto_submitted" || attempt.status === "passed")
            );
            const solvedCodingCount = combinedCoding.filter((p: any) => completedProblemsMap.has(p.id)).length;

            let answeredInAttempt = 0;
            if (attempt && attempt.answers && typeof attempt.answers === "object") {
              answeredInAttempt = calculateAnsweredQuestions(attempt.answers, modTotalQuestions);
            }
            if (solvedCodingCount > 0) {
              answeredInAttempt = Math.max(answeredInAttempt, solvedCodingCount);
            }

            let modCompletedQuestions = 0;
            let isCompleted = false;
            let isInProgress = false;

            if (isAttemptCompleted) {
              modCompletedQuestions = Math.min(modTotalQuestions, answeredInAttempt);
              if (modCompletedQuestions >= modTotalQuestions && modTotalQuestions > 0) {
                isCompleted = true;
              } else {
                isInProgress = modCompletedQuestions > 0;
              }
            } else if (solvedCodingCount > 0) {
              modCompletedQuestions = Math.min(modTotalQuestions, solvedCodingCount);
              if (modCompletedQuestions >= modTotalQuestions && modTotalQuestions > 0) {
                isCompleted = true;
              } else {
                isInProgress = true;
              }
            } else if (attempt && attempt.status === "in_progress") {
              isInProgress = true;
              modCompletedQuestions = Math.min(modTotalQuestions, answeredInAttempt);
            }

            totalQuestionsAcrossTrack += modTotalQuestions;
            completedQuestionsAcrossTrack += modCompletedQuestions;

            const modulePercentage = calculateModuleProgress(modCompletedQuestions, modTotalQuestions);
            const status: "not_started" | "in_progress" | "completed" = isCompleted
              ? "completed"
              : isInProgress || isAttemptCompleted
              ? "in_progress"
              : "not_started";

            const enrichedMod = {
              id: m.id,
              submodule_id: sm.id,
              main_module_id: track.id,
              subModuleNumber: `${smIdx + 1}.${mIdx + 1}`,
              name: m.name || m.title || `Module ${mIdx + 1}`,
              title: m.name || m.title || `Module ${mIdx + 1}`,
              description: m.description || "",
              type: m.type || "mixed",
              durationMinutes: typeof m.durationMinutes === "number" ? m.durationMinutes : 60,
              totalMarks: m.totalMarks || 100,
              questionCount: modTotalQuestions,
              totalQuestions: modTotalQuestions,
              completedQuestions: modCompletedQuestions,
              percentage: modulePercentage,
              status,
              isCompleted,
              isInProgress,
              isSubmitted: isAttemptCompleted,
              score: attempt ? attempt.score : isCompleted ? m.totalMarks || 100 : 0,
              mcqQuestions: m.mcqQuestions || [],
              codingQuestions: combinedCoding,
              codingProblems: combinedCoding,
            };

            flatEnrichedModules.push(enrichedMod);
            return enrichedMod;
          });

        return {
          id: sm.id,
          main_module_id: track.id,
          name: sm.name || sm.title || `Submodule ${smIdx + 1}`,
          title: sm.name || sm.title || `Submodule ${smIdx + 1}`,
          description: sm.description || "",
          status: sm.status || "active",
          display_order: sm.display_order ?? sm.displayOrder ?? 0,
          modules: activeModules,
          moduleCount: activeModules.length,
        };
      });

    const totalModules = flatEnrichedModules.length;
    const completedCount = flatEnrichedModules.filter((m) => m.status === "completed").length;
    const progressPercentage = calculateTrackProgressPercentage(
      completedQuestionsAcrossTrack,
      totalQuestionsAcrossTrack
    );

    return NextResponse.json(
      {
        track: {
          id: track.id,
          name: track.title,
          title: track.title,
          category: track.category || "General",
          description: track.description || "",
          thumbnail: track.thumbnail || "",
          assignedByName: track.assigned_by_name || "Admin",
          submodules: activeSubmodules,
          subModules: flatEnrichedModules,
          totalSubmodules: activeSubmodules.length,
          totalSubModules: activeSubmodules.length,
          totalModules,
          completedCount,
          completedModules: completedCount,
          totalQuestions: totalQuestionsAcrossTrack,
          completedQuestions: completedQuestionsAcrossTrack,
          progressPercentage,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("GET /api/student/practices/[id] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const batchContext = await getStudentBatchAccess(adminClient, user);
    const body = await request.json();
    const { module_id, score, total_marks, answers } = body;

    const studentProfileId = batchContext.profileId || user.id;

    if (module_id) {
      const attemptPayload = {
        assessment_id: module_id,
        student_id: studentProfileId,
        status: "submitted",
        score: typeof score === "number" ? score : 0,
        total_marks: typeof total_marks === "number" ? total_marks : 100,
        answers: answers || {},
        submitted_at: new Date().toISOString(),
      };

      try {
        await (adminClient.from("assessment_attempts") as any).upsert(
          attemptPayload,
          { onConflict: "assessment_id,student_id" }
        );
      } catch {
        await (adminClient.from("assessment_attempts") as any).insert(attemptPayload);
      }

      if (batchContext.studentUserId && batchContext.studentUserId !== studentProfileId) {
        try {
          await (adminClient.from("assessment_attempts") as any).upsert(
            { ...attemptPayload, student_id: batchContext.studentUserId },
            { onConflict: "assessment_id,student_id" }
          );
        } catch {}
      }

      // Also record in student_practice_submissions per user request
      const practiceSubPayload = {
        track_id: trackId,
        module_id: module_id,
        student_id: studentProfileId,
        status: "completed",
        score: typeof score === "number" ? score : 0,
        completed_at: new Date().toISOString()
      };
      
      try {
        await (adminClient.from("student_practice_submissions") as any).upsert(
          practiceSubPayload,
          { onConflict: "track_id,module_id,student_id" }
        );
      } catch (err) {
        console.warn("Could not insert into student_practice_submissions:", err);
      }
    }

    return NextResponse.json(
      { success: true, message: "Practice completed successfully." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("POST /api/student/practices/[id] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
