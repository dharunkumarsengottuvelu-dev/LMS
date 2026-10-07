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

function toDeterministicUUID(str: string): string {
  if (!str) return "00000000-0000-0000-0000-000000000000";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, "0");
  const hex2 = Math.abs((hash * 31) | 0).toString(16).padStart(8, "0");
  const hex3 = Math.abs((hash * 57) | 0).toString(16).padStart(8, "0");
  const hex4 = Math.abs((hash * 93) | 0).toString(16).padStart(8, "0");
  const full = (hex1 + hex2 + hex3 + hex4).slice(0, 32);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

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
          "id, title, slug, description, difficulty, assessment_id, time_limit_ms, memory_limit_kb, templates, starter_code, sample_test_cases, test_cases, example_cases, constraints, input_format, output_format, points, allowed_languages, default_language"
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

function toDeterministicUUID(str: string): string {
  if (!str) return "00000000-0000-0000-0000-000000000000";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, "0");
  const hex2 = Math.abs((hash * 31) | 0).toString(16).padStart(8, "0");
  const hex3 = Math.abs((hash * 57) | 0).toString(16).padStart(8, "0");
  const hex4 = Math.abs((hash * 93) | 0).toString(16).padStart(8, "0");
  const full = (hex1 + hex2 + hex3 + hex4).slice(0, 32);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

    // Fetch student's submissions & attempts
    const studentFilter = `student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId},student_id.eq.${user.id}`;

    const { data: submissions } = await adminClient
      .from("coding_submissions")
      .select("problem_id, status, score, max_score, created_at")
      .or(studentFilter) as any;

    const completedProblemsMap = new Map<string, any>();
    const attemptedProblemsMap = new Map<string, any>();
    (submissions || []).forEach((sub: any) => {
      attemptedProblemsMap.set(sub.problem_id, sub);
      if (sub.status === "accepted" || sub.status === "passed") {
        completedProblemsMap.set(sub.problem_id, sub);
      }
    });

    const isProblemSolved = (p: any): boolean => {
      if (!p || !p.id) return false;
      const pUUID = toDeterministicUUID(p.id);
      const pSlugUUID = p.slug ? toDeterministicUUID(p.slug) : null;
      return (
        completedProblemsMap.has(p.id) ||
        completedProblemsMap.has(pUUID) ||
        (p.slug && completedProblemsMap.has(p.slug)) ||
        Boolean(pSlugUUID && completedProblemsMap.has(pSlugUUID))
      );
    };

    const isProblemAttempted = (p: any): boolean => {
      if (!p || !p.id) return false;
      const pUUID = toDeterministicUUID(p.id);
      const pSlugUUID = p.slug ? toDeterministicUUID(p.slug) : null;
      return (
        isProblemSolved(p) ||
        attemptedProblemsMap.has(p.id) ||
        attemptedProblemsMap.has(pUUID) ||
        (p.slug && attemptedProblemsMap.has(p.slug)) ||
        Boolean(pSlugUUID && attemptedProblemsMap.has(pSlugUUID))
      );
    };

    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("id, assessment_id, status, score, total_marks, started_at, submitted_at, answers, created_at")
      .or(studentFilter)
      .order("created_at", { ascending: true }) as any;

    const moduleAttemptsMap = new Map<string, any[]>();
    (attempts || []).forEach((att: any) => {
      if (att.assessment_id) {
        const list1 = moduleAttemptsMap.get(att.assessment_id) || [];
        list1.push(att);
        moduleAttemptsMap.set(att.assessment_id, list1);

        const detUUID = toDeterministicUUID(att.assessment_id);
        if (detUUID !== att.assessment_id) {
          const list2 = moduleAttemptsMap.get(detUUID) || [];
          list2.push(att);
          moduleAttemptsMap.set(detUUID, list2);
        }
      }
    });

    // Also query student_practice_submissions
    const practiceSubMap = new Map<string, any>();
    try {
      const { data: practiceSubs } = await adminClient
        .from("student_practice_submissions")
        .select("module_id, status, score, completed_at")
        .eq("track_id", trackId)
        .or(studentFilter) as any;

      (practiceSubs || []).forEach((ps: any) => {
        if (ps.module_id) {
          practiceSubMap.set(ps.module_id, ps);
          practiceSubMap.set(toDeterministicUUID(ps.module_id), ps);
        }
      });
    } catch {}

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
              allowedAttempts: sm.allowedAttempts || 3,
              reattemptEnabled: sm.reattemptEnabled !== false,
              reviewEnabled: sm.reviewEnabled !== false,
              passingMarks: sm.passingMarks || 40,
              completionRule: sm.completionRule || "submit",
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
              if (Array.isArray(safeCq.test_cases)) {
                safeCq.test_cases = safeCq.test_cases.filter((tc: any) => !tc.is_hidden && !tc.isHidden);
              }
              return safeCq;
            });
            const directMcqs = m.mcqQuestions?.length || m.mcqs?.length || 0;
            const mcqsCount = directMcqs;
            const codingCount = combinedCoding.length;
            let modTotalQuestions = mcqsCount + codingCount;
            if (modTotalQuestions === 0) {
              modTotalQuestions = m.questionCount || m.question_count || 1;
            }

            // ─── ADMIN CONFIGURATION AS THE SINGLE SOURCE OF TRUTH ─────
            const allowedAttempts = typeof m.allowedAttempts === "number"
              ? m.allowedAttempts
              : (typeof m.allowed_attempts === "number"
                ? m.allowed_attempts
                : (typeof m.max_attempts === "number" ? m.max_attempts : 3));

            const reattemptEnabled = typeof m.reattemptEnabled === "boolean"
              ? m.reattemptEnabled
              : (typeof m.reattempt_enabled === "boolean" ? m.reattempt_enabled : true);

            const reviewEnabled = typeof m.reviewEnabled === "boolean"
              ? m.reviewEnabled
              : (typeof m.review_enabled === "boolean" ? m.review_enabled : true);

            const passingMarks = typeof m.passingMarks === "number"
              ? m.passingMarks
              : (typeof m.passing_marks === "number" ? m.passing_marks : 40);

            const completionRule = m.completionRule || m.completion_rule || "submit";
            const durationMinutes = typeof m.durationMinutes === "number"
              ? m.durationMinutes
              : (typeof m.duration_minutes === "number" ? m.duration_minutes : 60);

            // ─── ATTEMPT EXTRACTION & STRUCTURING ──────────────────────
            const rawModAttempts = moduleAttemptsMap.get(m.id) || moduleAttemptsMap.get(toDeterministicUUID(m.id)) || [];

            const formattedAttempts = rawModAttempts.map((att: any, attIdx: number) => {
              const isAttCompleted = att.status === "submitted" || att.status === "completed" || att.status === "passed" || att.status === "auto_submitted";
              let attAnswered = 0;
              if (att.answers && typeof att.answers === "object") {
                attAnswered = calculateAnsweredQuestions(att.answers, modTotalQuestions);
              }
              return {
                id: att.id,
                attemptNumber: attIdx + 1,
                status: isAttCompleted ? ("completed" as const) : ("in_progress" as const),
                rawStatus: att.status,
                score: typeof att.score === "number" ? att.score : 0,
                totalMarks: typeof att.total_marks === "number" ? att.total_marks : (m.totalMarks || 100),
                startedAt: att.started_at || att.created_at,
                submittedAt: att.submitted_at || null,
                answeredQuestionsCount: attAnswered,
                totalQuestions: modTotalQuestions,
                answers: att.answers || {},
              };
            });

            // 1. In-progress attempt (Priority)
            const activeAttempt = formattedAttempts.find((a) => a.status === "in_progress") || null;

            // 2. Completed attempts (Read-only historical records)
            const completedAttempts = formattedAttempts.filter((a) => a.status === "completed");
            const latestCompletedAttempt = completedAttempts.length > 0 ? completedAttempts[completedAttempts.length - 1] : null;

            // 3. Attempt counts
            const attemptsUsed = formattedAttempts.length;
            const attemptsRemaining = Math.max(0, allowedAttempts - attemptsUsed);

            // 4. Module completion status
            const practiceSub = practiceSubMap.get(m.id) || practiceSubMap.get(toDeterministicUUID(m.id));
            const isPracticeSubDone = Boolean(practiceSub && (practiceSub.status === "completed" || practiceSub.status === "passed"));

            const meetsCompletionRule = completedAttempts.some((ca) => {
              if (completionRule === "pass") {
                return ca.score >= passingMarks;
              }
              return true; // "submit" rule
            });

            // Module completion is independent from active reattempt
            const isCompleted = isPracticeSubDone || meetsCompletionRule;
            const isInProgress = Boolean(activeAttempt);

            // 5. Action permissions
            const canContinue = Boolean(activeAttempt);
            const canReattempt = Boolean(reattemptEnabled && attemptsRemaining > 0 && !activeAttempt);
            const canReview = Boolean(reviewEnabled && completedAttempts.length > 0);

            // 6. Recommended primary action
            let primaryAction: "start" | "continue" | "review" | "review_and_reattempt" | "completed" = "start";
            if (canContinue) {
              primaryAction = "continue";
            } else if (completedAttempts.length > 0) {
              if (canReview && canReattempt) {
                primaryAction = "review_and_reattempt";
              } else if (canReview) {
                primaryAction = "review";
              } else if (canReattempt) {
                primaryAction = "start";
              } else {
                primaryAction = "completed";
              }
            } else {
              primaryAction = "start";
            }

            // Question answered count for current view: active attempt or latest completed attempt
            let answeredCount = 0;
            if (activeAttempt) {
              answeredCount = activeAttempt.answeredQuestionsCount;
            } else if (latestCompletedAttempt) {
              answeredCount = latestCompletedAttempt.answeredQuestionsCount || modTotalQuestions;
            }

            totalQuestionsAcrossTrack += modTotalQuestions;
            if (isCompleted) {
              completedQuestionsAcrossTrack += modTotalQuestions;
            } else if (activeAttempt) {
              completedQuestionsAcrossTrack += activeAttempt.answeredQuestionsCount;
            }

            const modulePercentage = isCompleted
              ? 100
              : calculateModuleProgress(answeredCount, modTotalQuestions);

            const displayStatus: "not_started" | "in_progress" | "completed" = isCompleted
              ? "completed"
              : isInProgress
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
              durationMinutes,
              totalMarks: m.totalMarks || 100,
              questionCount: modTotalQuestions,
              totalQuestions: modTotalQuestions,
              completedQuestions: answeredCount,
              percentage: modulePercentage,
              status: displayStatus,
              isCompleted,
              isInProgress,
              isSubmitted: completedAttempts.length > 0,
              score: latestCompletedAttempt ? latestCompletedAttempt.score : (isCompleted ? m.totalMarks || 100 : 0),

              // Admin Policy (Source of Truth)
              allowedAttempts,
              reattemptEnabled,
              reviewEnabled,
              passingMarks,
              completionRule,

              // Attempt Tracking
              attempts: formattedAttempts,
              activeAttempt,
              completedAttempts,
              attemptsUsed,
              attemptsRemaining,
              canContinue,
              canReattempt,
              canReview,
              primaryAction,

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
    const completedCount = flatEnrichedModules.filter((m) => m.isCompleted).length;
    const progressPercentage = totalModules > 0
      ? Math.round((completedCount / totalModules) * 100)
      : calculateTrackProgressPercentage(completedQuestionsAcrossTrack, totalQuestionsAcrossTrack);

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
    const {
      action,
      module_id,
      attempt_id,
      score = 0,
      total_marks = 100,
      answers = {},
    } = body;

    const studentProfileId = batchContext.profileId || user.id;

    if (!module_id) {
      return NextResponse.json({ error: "module_id is required" }, { status: 400 });
    }

    const moduleUUID = toDeterministicUUID(module_id);
    const studentFilter = `student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId},student_id.eq.${user.id}`;

    // 1. Fetch practice track to get Admin configuration for this module
    const { data: dbTrack, error: trackError } = await adminClient
      .from("practice_tracks")
      .select("*")
      .eq("id", trackId)
      .maybeSingle();

    if (trackError || !dbTrack) {
      return NextResponse.json({ error: "Practice track not found" }, { status: 404 });
    }

    let meta: any = {};
    if (dbTrack.tags && dbTrack.tags[0]) {
      try { meta = JSON.parse(dbTrack.tags[0]); } catch {}
    }

    const rawSubmodules: any[] = meta.subModules || dbTrack.sub_modules || [];
    let targetModule: any = null;
    for (const sm of rawSubmodules) {
      if (Array.isArray(sm.modules)) {
        const found = sm.modules.find((m: any) => m.id === module_id || toDeterministicUUID(m.id) === moduleUUID);
        if (found) { targetModule = found; break; }
      }
      if (sm.id === module_id || toDeterministicUUID(sm.id) === moduleUUID) {
        targetModule = sm;
        break;
      }
    }

    // Default configuration fallback from Admin definitions
    const allowedAttempts = typeof targetModule?.allowedAttempts === "number"
      ? targetModule.allowedAttempts
      : (typeof targetModule?.allowed_attempts === "number"
        ? targetModule.allowed_attempts
        : (typeof targetModule?.max_attempts === "number" ? targetModule.max_attempts : 3));

    const reattemptEnabled = typeof targetModule?.reattemptEnabled === "boolean"
      ? targetModule.reattemptEnabled
      : (typeof targetModule?.reattempt_enabled === "boolean" ? targetModule.reattempt_enabled : true);

    const durationMinutes = typeof targetModule?.durationMinutes === "number"
      ? targetModule.durationMinutes
      : (typeof targetModule?.duration_minutes === "number" ? targetModule.duration_minutes : 60);

    // 2. Fetch all existing attempts for this student & module
    const { data: existingAttempts } = await adminClient
      .from("assessment_attempts")
      .select("id, status, score, total_marks, answers, started_at, submitted_at, created_at")
      .eq("assessment_id", moduleUUID)
      .or(studentFilter)
      .order("created_at", { ascending: true }) as any;

    const allAttempts = existingAttempts || [];
    const activeAttempt = allAttempts.find((a: any) => a.status === "in_progress") || null;

    // ─────────────────────────────────────────────────────────
    // ACTION: START / REATTEMPT
    // ─────────────────────────────────────────────────────────
    if (action === "start_attempt" || action === "start" || action === "reattempt") {
      // RULE 7: If an in-progress attempt already exists, DO NOT create another attempt. Return existing.
      if (activeAttempt) {
        return NextResponse.json({
          success: true,
          resumed: true,
          message: "Resuming existing active attempt.",
          attempt: {
            id: activeAttempt.id,
            attemptNumber: allAttempts.indexOf(activeAttempt) + 1,
            status: activeAttempt.status,
            answers: activeAttempt.answers || {},
          },
        });
      }

      // RULE 3 & 12: Enforce attempt limits configured by Admin
      if (allAttempts.length >= allowedAttempts) {
        return NextResponse.json(
          {
            error: `Maximum attempt limit reached. You have completed ${allAttempts.length} of ${allowedAttempts} allowed attempts.`,
            allowedAttempts,
            attemptsUsed: allAttempts.length,
          },
          { status: 400 }
        );
      }

      // RULE 11: Enforce reattempt setting configured by Admin
      if (allAttempts.length > 0 && !reattemptEnabled) {
        return NextResponse.json(
          {
            error: "Reattempts are disabled for this practice by the administrator.",
            reattemptEnabled: false,
          },
          { status: 400 }
        );
      }

      // Create NEW attempt
      const attemptNumber = allAttempts.length + 1;
      const newAttemptId = crypto.randomUUID();
      const expiresAt = durationMinutes > 0
        ? new Date(Date.now() + durationMinutes * 60000).toISOString()
        : new Date(Date.now() + 7 * 86400000).toISOString();

      const newAttemptPayload = {
        id: newAttemptId,
        assessment_id: moduleUUID,
        student_id: studentProfileId,
        status: "in_progress",
        score: 0,
        total_marks: typeof total_marks === "number" ? total_marks : (targetModule?.totalMarks || 100),
        answers: {
          _meta: {
            attemptNumber,
            moduleId: module_id,
            trackId,
          },
        },
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await (adminClient.from("assessment_attempts") as any).insert(newAttemptPayload);
      if (insertError) {
        console.error("Failed to create assessment attempt:", insertError);
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        message: `Attempt ${attemptNumber} started.`,
        attempt: {
          id: newAttemptId,
          attemptNumber,
          status: "in_progress",
          answers: newAttemptPayload.answers,
        },
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION: SAVE IN-PROGRESS ANSWERS
    // ─────────────────────────────────────────────────────────
    if (action === "save_progress") {
      const targetAttemptId = attempt_id || activeAttempt?.id;
      if (!targetAttemptId) {
        return NextResponse.json({ error: "No active attempt found to save progress." }, { status: 400 });
      }

      // Verify attempt is in_progress
      const currentAttempt = allAttempts.find((a: any) => a.id === targetAttemptId);
      if (currentAttempt && currentAttempt.status !== "in_progress") {
        return NextResponse.json({ error: "Cannot modify a submitted attempt." }, { status: 400 });
      }

      const mergedAnswers = {
        ...(currentAttempt?.answers || {}),
        ...(answers || {}),
        _meta: {
          ...(currentAttempt?.answers?._meta || {}),
          lastSavedAt: new Date().toISOString(),
        },
      };

      const { error: saveError } = await (adminClient.from("assessment_attempts") as any)
        .update({
          answers: mergedAnswers,
        })
        .eq("id", targetAttemptId)
        .eq("status", "in_progress");

      if (saveError) throw saveError;

      return NextResponse.json({ success: true, message: "Progress saved." });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION: SUBMIT ATTEMPT (Final Submission)
    // ─────────────────────────────────────────────────────────
    // Use target attempt specified by attempt_id, or active in_progress attempt
    const targetAttemptId = attempt_id || activeAttempt?.id;

    if (targetAttemptId) {
      // Verify attempt is not already completed
      const currentAttempt = allAttempts.find((a: any) => a.id === targetAttemptId);
      if (currentAttempt && (currentAttempt.status === "submitted" || currentAttempt.status === "completed")) {
        return NextResponse.json(
          { error: "This attempt has already been submitted and cannot be modified." },
          { status: 400 }
        );
      }

      const finalAnswers = {
        ...(currentAttempt?.answers || {}),
        ...(answers || {}),
        _meta: {
          ...(currentAttempt?.answers?._meta || {}),
          submittedAt: new Date().toISOString(),
        },
      };

      const { error: submitError } = await (adminClient.from("assessment_attempts") as any)
        .update({
          status: "submitted",
          score: typeof score === "number" ? score : 0,
          total_marks: typeof total_marks === "number" ? total_marks : 100,
          answers: finalAnswers,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", targetAttemptId);

      if (submitError) throw submitError;
    } else {
      // Fallback: If no attempt was previously started, insert a completed attempt
      // respecting allowedAttempts
      if (allAttempts.length >= allowedAttempts) {
        return NextResponse.json(
          { error: `Cannot submit. Attempt limit of ${allowedAttempts} reached.` },
          { status: 400 }
        );
      }

      const newAttemptId = crypto.randomUUID();
      const attemptPayload = {
        id: newAttemptId,
        assessment_id: moduleUUID,
        student_id: studentProfileId,
        status: "submitted",
        score: typeof score === "number" ? score : 0,
        total_marks: typeof total_marks === "number" ? total_marks : 100,
        answers: answers || {},
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      };

      await (adminClient.from("assessment_attempts") as any).insert(attemptPayload);
    }

    // Always update student_practice_submissions to record module completion
    const practiceSubPayload = {
      track_id: trackId,
      module_id: module_id,
      student_id: studentProfileId,
      status: "completed",
      score: typeof score === "number" ? score : 0,
      completed_at: new Date().toISOString(),
    };

    try {
      await (adminClient.from("student_practice_submissions") as any).upsert(
        practiceSubPayload,
        { onConflict: "track_id,module_id,student_id" }
      );
    } catch (err) {
      console.warn("Could not upsert into student_practice_submissions:", err);
    }

    return NextResponse.json(
      { success: true, message: "Practice attempt submitted successfully." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("POST /api/student/practices/[id] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
