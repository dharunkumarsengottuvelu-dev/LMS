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

    // 3. Fetch student attempts from all submission & attempt tables
    const studentIds = Array.from(new Set([
      batchContext.profileId,
      batchContext.studentUserId,
      user?.id,
    ].filter(Boolean) as string[]));

    const attemptsMap = new Map<string, any>();

    if (studentIds.length > 0) {
      // Check assessment_submissions table
      try {
        const { data: subData } = await adminClient
          .from("assessment_submissions")
          .select("*")
          .in("student_id", studentIds);

        (subData || []).forEach((sub: any) => {
          const testKey = sub.assessment_id || sub.test_id;
          if (testKey) {
            attemptsMap.set(testKey, {
              ...sub,
              isCompleted: true,
              score: sub.score ?? sub.marks_obtained,
              totalMarks: sub.total_marks ?? sub.max_marks,
              percentage: sub.percentage ?? (sub.total_marks && sub.score ? Math.round((sub.score / sub.total_marks) * 100) : undefined),
            });
          }
        });
      } catch (e) {
        console.warn("Could not query assessment_submissions:", e);
      }

      // Check test_attempts table
      try {
        const { data: testAttData } = await adminClient
          .from("test_attempts")
          .select("*")
          .in("user_id", studentIds);

        (testAttData || []).forEach((att: any) => {
          const testKey = att.test_id || att.assessment_id;
          if (testKey && !attemptsMap.has(testKey)) {
            attemptsMap.set(testKey, {
              ...att,
              isCompleted: att.status === "completed" || att.status === "submitted" || att.score !== undefined,
              score: att.score ?? att.marks_obtained,
              totalMarks: att.total_marks,
              percentage: att.percentage ?? (att.total_marks && att.score ? Math.round((att.score / att.total_marks) * 100) : undefined),
            });
          }
        });
      } catch (e) {
        console.warn("Could not query test_attempts:", e);
      }

      // Check assessment_attempts table
      try {
        const { data: attData } = await adminClient
          .from("assessment_attempts")
          .select("*")
          .in("student_id", studentIds);

        (attData || []).forEach((att: any) => {
          const testKey = att.assessment_id || att.test_id;
          if (testKey && (!attemptsMap.has(testKey) || !attemptsMap.get(testKey).isCompleted)) {
            attemptsMap.set(testKey, {
              ...att,
              isCompleted: att.status === "submitted" || att.status === "completed" || att.score !== undefined,
              score: att.score ?? att.marks_obtained,
              totalMarks: att.total_marks,
              percentage: att.percentage ?? (att.total_marks && att.score ? Math.round((att.score / att.total_marks) * 100) : undefined),
            });
          }
        });
      } catch (e) {
        console.warn("Could not query assessment_attempts:", e);
      }
    }

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
        const isCompleted = Boolean(attempt && (attempt.isCompleted || attempt.status === "submitted" || attempt.status === "completed" || attempt.status === "Submitted" || attempt.status === "Auto-Submitted"));

        let scheduledDisplay = "Available Anytime (On-Demand)";
        if (meta.scheduleMode === "open" || (!meta.date && !meta.startDate && !a.scheduled_at && !a.available_from)) {
          scheduledDisplay = "Open Window (On-Demand)";
        } else if (meta.scheduleMode === "window" && (meta.startDate || meta.endDate)) {
          scheduledDisplay = `Window: ${meta.startDate || "Any"} to ${meta.endDate || "Open"}`;
        } else if (meta.date) {
          scheduledDisplay = `${meta.date}${meta.startTime ? ` • ${meta.startTime}` : ""}`;
        } else if (a.scheduled_at || a.available_from) {
          scheduledDisplay = new Date(a.scheduled_at || a.available_from).toLocaleString();
        }

        const realQuestions = meta.questions || [];
        const totalQCount = realQuestions.length > 0 ? realQuestions.length : (a.total_questions || 0);
        const totalMaxMarks = realQuestions.length > 0 
          ? realQuestions.reduce((sum: number, q: any) => sum + (Number(q.marks) || 1), 0)
          : (a.total_marks || 100);

        const isLive = (a.status === "active" || meta.status === "live" || meta.scheduleMode === "open") && a.status !== "draft";

        const earnedScore = attempt?.score !== undefined ? attempt.score : undefined;
        const calculatedPercentage = attempt?.percentage !== undefined
          ? attempt.percentage
          : earnedScore !== undefined && totalMaxMarks > 0
          ? Math.round((earnedScore / totalMaxMarks) * 100)
          : undefined;

        mappedTests.push({
          id: a.id,
          title: a.title,
          type: a.type === "coding" ? "Coding Assessment" : "Proctored Examination",
          scheduledAt: scheduledDisplay,
          duration: a.duration_minutes || a.duration || meta.duration || 60,
          totalQuestions: totalQCount,
          totalMarks: totalMaxMarks,
          status: isCompleted ? "completed" : isLive ? "live" : "upcoming",
          score: earnedScore,
          percentage: calculatedPercentage,
          maxScore: totalMaxMarks,
          passed: earnedScore !== undefined ? earnedScore >= ((a.pass_percentage ? ((totalMaxMarks * a.pass_percentage) / 100) : totalMaxMarks * 0.5)) : false,
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
