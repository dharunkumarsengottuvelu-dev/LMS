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

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";

    const adminClient = createAdminClient();

    // 1. Resolve student profile & batch context
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    const studentId = profile?.id || user.id;
    const studentUserId = user.id;
    const batchContext = await getStudentBatchAccess(adminClient, user);

    // 2. Fetch all authorized courses
    const { data: rawCourses } = await adminClient
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    // Fetch enrollments / lesson progress if existing
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("*")
      .or(`user_id.eq.${studentId},user_id.eq.${studentUserId}`);

    const enrollmentMap = new Map<string, any>();
    (enrollments || []).forEach((e: any) => enrollmentMap.set(e.course_id, e));

    // Map and filter authorized courses
    const studentCourses: any[] = [];
    let completedCoursesCount = 0;

    (rawCourses || []).forEach((c: any) => {
      let meta: any = {};
      if (c.tags && c.tags[0]) {
        try {
          meta = JSON.parse(c.tags[0]);
        } catch {}
      }

      const assignedBatches =
        c.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        [];

      const isCommon =
        c.is_common !== undefined
          ? c.is_common
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
        const enroll = enrollmentMap.get(c.id);
        const rawMods = meta.modules || [];
        const totalLessons = rawMods.length > 0
          ? rawMods.reduce((acc: number, m: any) => acc + (m.subModules?.length || 1), 0)
          : 0;

        const completedLessons = enroll?.completed_lessons || 0;
        const progress = enroll?.progress_percentage !== undefined
          ? enroll.progress_percentage
          : totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

        if (progress === 100) {
          completedCoursesCount++;
        }

        const normalizedModules = rawMods.map((m: any, mIdx: number) => {
          const subCount = m.subModules?.length || 1;
          const isModCompleted = progress >= Math.round(((mIdx + 1) / Math.max(1, rawMods.length)) * 100);
          return {
            id: m.id || `mod_${mIdx + 1}`,
            title: m.title || `Module ${mIdx + 1}`,
            completed: isModCompleted,
            completedAt: isModCompleted ? (c.updated_at || c.created_at) : undefined,
            subLessonsCount: subCount,
            completedLessonsCount: isModCompleted ? subCount : 0,
          };
        });

        studentCourses.push({
          id: c.id,
          title: c.title,
          category: meta.category || "Technical Training",
          progress,
          completedLessons,
          totalLessons: Math.max(1, totalLessons),
          totalModules: rawMods.length,
          completedModules: normalizedModules.filter((m: any) => m.completed).length,
          lastAccessed: c.updated_at ? new Date(c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
          status: progress === 100 ? "Completed" : progress > 0 ? "In Progress" : "Not Started",
          modules: normalizedModules,
        });
      }
    });

    // 3. Fetch real assessment attempts
    const { data: dbAttempts } = await adminClient
      .from("assessment_attempts")
      .select("*")
      .or(`student_id.eq.${studentId},student_id.eq.${studentUserId},user_id.eq.${studentId},user_id.eq.${studentUserId}`)
      .order("submitted_at", { ascending: false });

    // Fetch assessment metadata to match titles
    const { data: dbAssessments } = await adminClient.from("assessments").select("*");
    const assessmentMap = new Map<string, any>();
    (dbAssessments || []).forEach((a: any) => assessmentMap.set(a.id, a));

    // Fetch practice tracks metadata
    const { data: dbTracks } = await adminClient.from("practice_tracks").select("*");
    const practiceSubMap = new Map<string, any>();
    (dbTracks || []).forEach((t: any) => {
      let meta: any = {};
      if (t.tags && t.tags[0]) {
        try {
          meta = JSON.parse(t.tags[0]);
        } catch {}
      }
      (meta.subModules || t.sub_modules || []).forEach((sm: any) => {
        practiceSubMap.set(sm.id, { ...sm, trackTitle: t.title });
      });
    });

    // 4. Fetch assignment submissions
    const { data: dbSubmissions } = await adminClient
      .from("assignment_submissions")
      .select("*")
      .or(`user_id.eq.${studentId},user_id.eq.${studentUserId}`)
      .order("submitted_at", { ascending: false });

    // 5. Build dynamic attempts and activities list
    let totalTimeSpentSeconds = 0;
    const assessmentLogs: any[] = [];
    const completedModuleLogs: any[] = [];

    (dbAttempts || []).forEach((att: any) => {
      const timeTaken = typeof att.time_taken_seconds === "number" ? att.time_taken_seconds : 0;
      totalTimeSpentSeconds += timeTaken;

      const assessMeta = assessmentMap.get(att.assessment_id);
      const practiceMeta = practiceSubMap.get(att.assessment_id);
      const isPractice = Boolean(practiceMeta) || att.type === "practice" || att.type === "coding";

      const title = practiceMeta?.title || assessMeta?.title || "Assessment";
      const courseTitle = practiceMeta?.trackTitle || assessMeta?.course_id || "Technical Curriculum";
      const score = typeof att.score === "number" ? att.score : 0;
      const totalMarks = typeof att.total_marks === "number" && att.total_marks > 0 ? att.total_marks : 100;
      const pct = Math.min(100, Math.round((score / totalMarks) * 100));

      const submittedAt = att.submitted_at || att.created_at;
      const dateStr = submittedAt ? new Date(submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent";
      const timeStr = submittedAt ? new Date(submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      const fullTimestamp = `${dateStr}${timeStr ? `, ${timeStr}` : ""}`;

      const violations = att.violations ?? att.tab_switches ?? 0;

      assessmentLogs.push({
        id: att.id,
        assessmentTitle: title,
        type: isPractice ? "Coding Lab Practice" : "Proctored Exam",
        completedDate: fullTimestamp,
        date: dateStr,
        submittedAt: submittedAt ? new Date(submittedAt).getTime() : 0,
        scoreObtained: `${score} / ${totalMarks} (${pct}%)`,
        rawScore: pct,
        violations: `${violations} Flags`,
        evaluation: pct >= 50 ? (pct >= 85 ? "Passed (Distinction)" : "Passed") : "Evaluated",
        status: att.status || "Evaluated",
      });

      if (att.status === "submitted" || att.status === "evaluated" || pct >= 50) {
        completedModuleLogs.push({
          id: `mod_att_${att.id}`,
          title,
          type: isPractice ? "practice" : "assessment",
          courseTitle,
          timestamp: fullTimestamp,
          date: dateStr,
          submittedAt: submittedAt ? new Date(submittedAt).getTime() : 0,
          score: pct,
          status: "Completed",
        });
      }
    });

    (dbSubmissions || []).forEach((sub: any) => {
      const submittedAt = sub.submitted_at || sub.created_at;
      const dateStr = submittedAt ? new Date(submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent";
      const timeStr = submittedAt ? new Date(submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      const fullTimestamp = `${dateStr}${timeStr ? `, ${timeStr}` : ""}`;

      assessmentLogs.push({
        id: `sub_${sub.id}`,
        assessmentTitle: sub.assignment_title || "Assignment Submission",
        type: "Assignment",
        completedDate: fullTimestamp,
        date: dateStr,
        submittedAt: submittedAt ? new Date(submittedAt).getTime() : 0,
        scoreObtained: sub.grade !== undefined && sub.grade !== null ? `${sub.grade} Marks` : "Submitted",
        rawScore: typeof sub.grade === "number" ? sub.grade : 100,
        violations: "0 Flags",
        evaluation: sub.status === "graded" ? "Graded" : "Submitted",
        status: sub.status || "Submitted",
      });
    });

    // 6. Build login activities from auth user records
    const loginActivities: any[] = [];
    if (user.last_sign_in_at) {
      const lastLogin = new Date(user.last_sign_in_at);
      loginActivities.push({
        id: "auth-login-current",
        timestamp: `${lastLogin.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${lastLogin.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        date: lastLogin.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: lastLogin.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ipAddress: "Current Session IP",
        device: "Desktop / Browser",
        browser: "Current Browser",
        duration: "Active Session",
        status: "Active",
      });
    }

    if (user.created_at) {
      const createdDate = new Date(user.created_at);
      loginActivities.push({
        id: "auth-account-created",
        timestamp: `${createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        date: createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ipAddress: "Authentication Gateway",
        device: "Registered Account",
        browser: "Secure Auth",
        duration: "Session Logged",
        status: "Completed",
      });
    }

    // 7. Calculate real day-wise daily time spent chart
    const daysCount = range === "7d" ? 7 : range === "14d" ? 14 : range === "30d" ? 30 : 7;
    const now = Date.now();
    const dailyTimeSpent: Array<{ day: string; label: string; minutes: number; display: string; height: number }> = [];

    // Calculate maximum minutes across days to scale chart dynamically
    const dayMap = new Map<string, number>();

    // Aggregate attempt seconds per day
    (dbAttempts || []).forEach((att: any) => {
      if (att.submitted_at || att.created_at) {
        const d = new Date(att.submitted_at || att.created_at).toISOString().slice(0, 10);
        const mins = Math.round((att.time_taken_seconds || 1800) / 60);
        dayMap.set(d, (dayMap.get(d) || 0) + mins);
      }
    });

    let maxDayMinutes = 1;
    for (let i = daysCount - 1; i >= 0; i--) {
      const dObj = new Date(now - i * 86400000);
      const iso = dObj.toISOString().slice(0, 10);
      const mins = dayMap.get(iso) || 0;
      if (mins > maxDayMinutes) maxDayMinutes = mins;
    }

    for (let i = daysCount - 1; i >= 0; i--) {
      const dObj = new Date(now - i * 86400000);
      const iso = dObj.toISOString().slice(0, 10);
      const dayLabel = dObj.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      const mins = dayMap.get(iso) || 0;
      const height = mins > 0 ? Math.min(100, Math.max(8, Math.round((mins / maxDayMinutes) * 100))) : 4;
      const display = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

      dailyTimeSpent.push({
        day: dayLabel,
        label: dayLabel,
        minutes: mins,
        display,
        height,
      });
    }

    const totalActivitiesCount = assessmentLogs.length + completedModuleLogs.length;

    return NextResponse.json({
      reports: {
        totalCoursesEnrolled: studentCourses.length,
        completedCoursesCount,
        activitiesCompletedCount: totalActivitiesCount,
        totalTimeSpentSeconds,
        courses: studentCourses,
        dailyTimeSpent,
        loginActivities,
        completedModuleLogs,
        assessmentLogs,
      },
    });
  } catch (error) {
    console.error("GET /api/student/reports error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
