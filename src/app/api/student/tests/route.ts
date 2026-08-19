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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Resolve student batch context
    const batchContext = await getStudentBatchAccess(adminClient, user);

    // 2. Fetch all scheduled/active assessments
    const { data: assessmentsData, error } = await adminClient
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // 3. Fetch student attempts
    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("*")
      .or(`student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId}`) as any;

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

      const assignedBatches =
        a.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        (a.course_id ? [a.course_id] : []);

      const isCommon =
        a.is_common !== undefined
          ? a.is_common
          : meta.isCommon !== undefined
          ? meta.isCommon
          : assignedBatches.length === 0;

      const isVisible = isContentVisibleToStudent(
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

        let scheduledDisplay = "Available Anytime";
        if (meta.scheduleMode === "open" || (!meta.date && !meta.startDate && !a.available_from)) {
          scheduledDisplay = "Open Window (On-Demand)";
        } else if (meta.scheduleMode === "window" && (meta.startDate || meta.endDate)) {
          scheduledDisplay = `Window: ${meta.startDate || "Any"} to ${meta.endDate || "Open"}`;
        } else if (meta.date) {
          scheduledDisplay = `${meta.date}${meta.startTime ? ` • ${meta.startTime}` : ""}`;
        } else if (a.available_from) {
          scheduledDisplay = new Date(a.available_from).toLocaleString();
        }

        mappedTests.push({
          id: a.id,
          title: a.title,
          type: a.type === "coding" ? "Coding Assessment" : "Proctored Examination",
          scheduledAt: scheduledDisplay,
          duration: a.duration_minutes || a.duration || 60,
          totalQuestions: a.total_questions || 10,
          totalMarks: a.total_marks || (a.total_questions || 10) * 10,
          status: isCompleted ? "completed" : a.status === "active" ? "live" : "upcoming",
          score: attempt ? attempt.score : undefined,
          maxScore: a.total_marks || (a.total_questions || 10) * 10,
          passed: attempt ? attempt.score >= (a.passing_marks || 50) : false,
          isCommon,
          assignedBatches,
          proctoring: {
            enabled: true,
            webcamTracking: true,
            tabSwitchLock: true,
            fullscreenLock: true,
            safeExamBrowserRequired: true,
            copyPasteRestricted: true,
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
