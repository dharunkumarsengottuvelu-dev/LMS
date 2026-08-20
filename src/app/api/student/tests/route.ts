import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminClient = createAdminClient();

    // 1. Resolve student batch context if user is logged in
    let batchContext: any = {
      profile: null,
      profileId: "",
      studentUserId: "",
      studentEmail: "",
      studentFullName: "Student",
      batchIds: [],
      batchNames: [],
      allTargetIdentifiers: new Set<string>(),
    };

    if (user) {
      batchContext = await getStudentBatchAccess(adminClient, user);
    } else {
      // Fallback to first student profile for public/demo evaluation if no cookie
      const { data: fallbackProfile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .limit(1)
        .maybeSingle();

      if (fallbackProfile) {
        batchContext = {
          profile: fallbackProfile,
          profileId: fallbackProfile.id,
          studentUserId: fallbackProfile.user_id || fallbackProfile.id,
          studentEmail: fallbackProfile.email || "",
          studentFullName: `${fallbackProfile.first_name || ""} ${fallbackProfile.last_name || ""}`.trim(),
          batchIds: fallbackProfile.batch_id ? [String(fallbackProfile.batch_id)] : [],
          batchNames: fallbackProfile.batch ? [String(fallbackProfile.batch)] : [],
          allTargetIdentifiers: new Set<string>([
            String(fallbackProfile.id).toLowerCase(),
            String(fallbackProfile.email || "").toLowerCase(),
            String(fallbackProfile.batch || "").toLowerCase(),
          ]),
        };
      }
    }

    // 2. Fetch all scheduled/active assessments
    const { data: assessmentsData, error } = await adminClient
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to query assessments:", error);
    }

    // 3. Fetch student attempts
    let attempts: any[] = [];
    if (batchContext.profileId || batchContext.studentUserId) {
      const { data: attData } = await adminClient
        .from("assessment_attempts")
        .select("*")
        .or(`student_id.eq.${batchContext.profileId || "00000000-0000-0000-0000-000000000000"},student_id.eq.${batchContext.studentUserId || "00000000-0000-0000-0000-000000000000"}`) as any;
      attempts = attData || [];
    }

    const attemptsMap = new Map<string, any>();
    (attempts || []).forEach((att: any) => {
      attemptsMap.set(att.assessment_id, att);
    });

    const mappedTests: any[] = [];

    (assessmentsData || []).forEach((a: any) => {
      let meta: any = {};
      if (a.tags && a.tags[0]) {
        try {
          meta = JSON.parse(a.tags[0]);
        } catch {}
      }

      const rawAssignedBatches =
        a.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        (a.course_id ? [a.course_id] : []);

      const assignedBatches = Array.isArray(rawAssignedBatches)
        ? rawAssignedBatches
        : rawAssignedBatches
        ? [rawAssignedBatches]
        : [];

      const isCommon =
        a.is_common === true ||
        meta.isCommon === true ||
        String(a.is_common) === "true" ||
        String(meta.isCommon) === "true" ||
        assignedBatches.length === 0 ||
        assignedBatches.includes("Common (All Batches)") ||
        assignedBatches.includes("all") ||
        assignedBatches.includes("common");

      const isVisible = isCommon || isContentVisibleToStudent(
        {
          is_common: isCommon,
          assigned_batches: assignedBatches,
          assigned_students: meta.assignedStudents || [],
        },
        batchContext
      );

      if (isVisible) {
        const attempt = attemptsMap.get(a.id);
        const isCompleted = attempt && attempt.status === "submitted";

        let scheduledDisplay = "Available Anytime (On-Demand)";
        if (meta.scheduleMode === "open" || (!meta.date && !meta.startDate && !a.available_from)) {
          scheduledDisplay = "Open Window (On-Demand)";
        } else if (meta.scheduleMode === "window" && (meta.startDate || meta.endDate)) {
          scheduledDisplay = `Window: ${meta.startDate || "Any"} to ${meta.endDate || "Open"}`;
        } else if (meta.date) {
          scheduledDisplay = `${meta.date}${meta.startTime ? ` • ${meta.startTime}` : ""}`;
        } else if (a.available_from) {
          scheduledDisplay = new Date(a.available_from).toLocaleString();
        }

        const realQuestions = meta.questions || [];
        const totalQCount = realQuestions.length > 0 ? realQuestions.length : (a.total_questions || 0);
        const totalMaxMarks = realQuestions.length > 0 
          ? realQuestions.reduce((sum: number, q: any) => sum + (Number(q.marks) || 1), 0)
          : (a.total_marks || 100);

        const isLive = (a.status === "active" || meta.status === "live" || meta.scheduleMode === "open") && a.status !== "draft";

        mappedTests.push({
          id: a.id,
          title: a.title,
          type: a.type === "coding" ? "Coding Assessment" : "Proctored Examination",
          scheduledAt: scheduledDisplay,
          duration: a.duration_minutes || a.duration || meta.duration || 60,
          totalQuestions: totalQCount,
          totalMarks: totalMaxMarks,
          status: isCompleted ? "completed" : isLive ? "live" : "upcoming",
          score: attempt ? attempt.score : undefined,
          maxScore: totalMaxMarks,
          passed: attempt ? attempt.score >= (a.passing_marks || 50) : false,
          isCommon,
          assignedBatches,
          proctoring: {
            enabled: Boolean(meta.secWebcam || meta.secFullscreen || meta.secTabSwitch || meta.secCopyPaste),
            webcamTracking: meta.secWebcam ?? true,
            tabSwitchLock: meta.secTabSwitch ?? true,
            fullscreenLock: meta.secFullscreen ?? true,
            safeExamBrowserRequired: meta.secSEB ?? false,
            copyPasteRestricted: meta.secCopyPaste ?? true,
            assignedBy: "Admin",
            assignedByName: "System Admin",
          },
        });
      }
    });

    return NextResponse.json({ tests: mappedTests }, { status: 200 });
  } catch (error) {
    console.error("GET /api/student/tests error:", error);
    return NextResponse.json({ error: getErrorMessage(error), tests: [] }, { status: 500 });
  }
}
