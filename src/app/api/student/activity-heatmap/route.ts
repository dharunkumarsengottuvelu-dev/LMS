import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveTimeService } from "@/services/active-time.service";
import { getStudentBatchAccess } from "@/lib/auth/batch-access";

export interface ActivityDetailItem {
  id: string;
  category: "coding" | "learning" | "practice" | "assessment" | "session";
  title: string;
  subtitle?: string;
  status?: string;
  passed?: boolean;
  score?: number;
  timeStr: string;
  timestamp: number;
}

export interface DayActivityData {
  date: string; // YYYY-MM-DD
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  categories: {
    coding: number;
    learning: number;
    practice: number;
    assessment: number;
    session: number;
  };
  details: ActivityDetailItem[];
}

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
    const range = searchParams.get("range") || "12m"; // "12m" or "year" or "all"
    const targetYearParam = searchParams.get("year");

    const adminClient = createAdminClient();

    // 1. Resolve student profile context
    const batchContext = await getStudentBatchAccess(adminClient, user);
    const studentId = batchContext.profileId || user.id;
    const studentUserId = batchContext.studentUserId || user.id;

    // 2. Define Date Range Window (Default: Last 12 months / 365 days ending today)
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let startDate: Date;
    let endDate: Date = today;

    if (targetYearParam) {
      const yr = parseInt(targetYearParam, 10);
      startDate = new Date(yr, 0, 1, 0, 0, 0, 0);
      endDate = new Date(yr, 11, 31, 23, 59, 59, 999);
      if (endDate.getTime() > today.getTime()) {
        endDate = today;
      }
    } else {
      // Past 365 days (52 weeks)
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 364);
      startDate.setHours(0, 0, 0, 0);
    }

    const minTimestamp = startDate.getTime();
    const maxTimestamp = endDate.getTime();

    // Map of date string YYYY-MM-DD -> DayActivityData
    const dayMap = new Map<string, DayActivityData>();

    const getOrCreateDay = (dateStr: string): DayActivityData => {
      let entry = dayMap.get(dateStr);
      if (!entry) {
        entry = {
          date: dateStr,
          count: 0,
          intensity: 0,
          categories: {
            coding: 0,
            learning: 0,
            practice: 0,
            assessment: 0,
            session: 0,
          },
          details: [],
        };
        dayMap.set(dateStr, entry);
      }
      return entry;
    };

    // 3. Fetch Coding Problems for Name Mapping
    const { data: rawProblems } = await adminClient
      .from("coding_problems")
      .select("id, title, slug");
    const problemNameMap = new Map<string, string>();
    (rawProblems || []).forEach((p: any) => {
      if (p.id) problemNameMap.set(p.id, p.title || p.slug || `Problem #${p.id}`);
      if (p.slug) problemNameMap.set(p.slug, p.title || p.slug);
    });

    // 4. Fetch Real Coding Submissions
    const { data: rawCodingSubs } = await adminClient
      .from("coding_submissions")
      .select("*")
      .or(`student_id.eq.${studentId},student_id.eq.${studentUserId},user_id.eq.${studentId},user_id.eq.${studentUserId}`)
      .order("created_at", { ascending: false });

    // Track unique problem solves per day vs attempts
    (rawCodingSubs || []).forEach((sub: any) => {
      const createdStr = sub.submitted_at || sub.created_at;
      if (!createdStr) return;
      const ts = new Date(createdStr).getTime();
      if (ts < minTimestamp || ts > maxTimestamp) return;

      const dateStr = new Date(ts).toISOString().slice(0, 10);
      const day = getOrCreateDay(dateStr);

      const probTitle = problemNameMap.get(sub.problem_id) || sub.problem_id || "Coding Problem";
      const isAccepted = sub.status === "accepted" || sub.status === "passed";
      const statusLabel = isAccepted
        ? "Accepted"
        : sub.status === "wrong_answer"
        ? "Wrong Answer"
        : sub.status === "time_limit_exceeded"
        ? "Time Limit Exceeded"
        : sub.status === "compilation_error"
        ? "Compilation Error"
        : sub.status === "runtime_error"
        ? "Runtime Error"
        : sub.status || "Evaluated";

      day.count += 1;
      day.categories.coding += 1;
      day.details.push({
        id: sub.id || `coding-${ts}`,
        category: "coding",
        title: isAccepted ? `Solved: ${probTitle}` : `Submitted: ${probTitle}`,
        subtitle: `Language: ${(sub.language || "code").toUpperCase()} • Status: ${statusLabel}`,
        status: statusLabel,
        passed: isAccepted,
        timeStr: new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        timestamp: ts,
      });
    });

    // 5. Fetch Real Enrollments & Course Learning Milestones
    const { data: rawCourses } = await adminClient.from("courses").select("id, title");
    const courseTitleMap = new Map<string, string>();
    (rawCourses || []).forEach((c: any) => courseTitleMap.set(c.id, c.title));

    const { data: rawEnrollments } = await adminClient
      .from("enrollments")
      .select("*")
      .or(`student_id.eq.${studentId},student_id.eq.${studentUserId},user_id.eq.${studentId},user_id.eq.${studentUserId}`);

    (rawEnrollments || []).forEach((enr: any) => {
      const cTitle = courseTitleMap.get(enr.course_id) || "Course";

      // A. Enrollment activity
      if (enr.enrolled_at) {
        const enrTs = new Date(enr.enrolled_at).getTime();
        if (enrTs >= minTimestamp && enrTs <= maxTimestamp) {
          const dateStr = new Date(enrTs).toISOString().slice(0, 10);
          const day = getOrCreateDay(dateStr);
          day.count += 1;
          day.categories.learning += 1;
          day.details.push({
            id: `enr-${enr.id || enrTs}`,
            category: "learning",
            title: `Enrolled in Course: ${cTitle}`,
            subtitle: `Progress: ${enr.progress_percentage || 0}%`,
            timeStr: new Date(enrTs).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            timestamp: enrTs,
          });
        }
      }

      // B. Course Completion / Update milestone
      if (enr.completed_at) {
        const compTs = new Date(enr.completed_at).getTime();
        if (compTs >= minTimestamp && compTs <= maxTimestamp) {
          const dateStr = new Date(compTs).toISOString().slice(0, 10);
          const day = getOrCreateDay(dateStr);
          day.count += 1;
          day.categories.learning += 1;
          day.details.push({
            id: `comp-${enr.id || compTs}`,
            category: "learning",
            title: `Completed Course: ${cTitle}`,
            subtitle: `100% Curriculum Completed`,
            passed: true,
            timeStr: new Date(compTs).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            timestamp: compTs,
          });
        }
      } else if (enr.last_accessed_at && enr.last_accessed_at !== enr.enrolled_at) {
        const accessTs = new Date(enr.last_accessed_at).getTime();
        if (accessTs >= minTimestamp && accessTs <= maxTimestamp) {
          const dateStr = new Date(accessTs).toISOString().slice(0, 10);
          const day = getOrCreateDay(dateStr);
          day.count += 1;
          day.categories.learning += 1;
          day.details.push({
            id: `learn-${enr.id || accessTs}`,
            category: "learning",
            title: `Learning Session: ${cTitle}`,
            subtitle: `${enr.completed_lessons || 0} lessons completed (${enr.progress_percentage || 0}%)`,
            timeStr: new Date(accessTs).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            timestamp: accessTs,
          });
        }
      }
    });

    // 6. Fetch Real Assessment & Practice Attempts
    const { data: rawAssessments } = await adminClient.from("assessments").select("id, title, type");
    const assessmentTitleMap = new Map<string, { title: string; type: string }>();
    (rawAssessments || []).forEach((a: any) =>
      assessmentTitleMap.set(a.id, { title: a.title, type: a.type || "assessment" })
    );

    const { data: rawAttempts } = await adminClient
      .from("assessment_attempts")
      .select("*")
      .or(`student_id.eq.${studentId},student_id.eq.${studentUserId},user_id.eq.${studentId},user_id.eq.${studentUserId}`)
      .order("submitted_at", { ascending: false });

    (rawAttempts || []).forEach((att: any) => {
      const attDateStr = att.submitted_at || att.created_at;
      if (!attDateStr) return;
      const ts = new Date(attDateStr).getTime();
      if (ts < minTimestamp || ts > maxTimestamp) return;

      const dateStr = new Date(ts).toISOString().slice(0, 10);
      const day = getOrCreateDay(dateStr);

      const assMeta = assessmentTitleMap.get(att.assessment_id);
      const isPractice = assMeta?.type === "practice" || att.is_practice;
      const title = assMeta?.title || (isPractice ? "Practice Challenge" : "Assessment Exam");
      const passed = att.passed || (att.score !== undefined && att.score >= 50);

      day.count += 1;
      if (isPractice) {
        day.categories.practice += 1;
        day.details.push({
          id: att.id || `practice-${ts}`,
          category: "practice",
          title: `Practice: ${title}`,
          subtitle: `Score: ${att.score ?? 0}% • ${passed ? "Passed" : "Attempted"}`,
          passed,
          score: att.score,
          timeStr: new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          timestamp: ts,
        });
      } else {
        day.categories.assessment += 1;
        day.details.push({
          id: att.id || `assessment-${ts}`,
          category: "assessment",
          title: `Assessment: ${title}`,
          subtitle: `Score: ${att.score ?? 0} pts • ${passed ? "Passed" : "Submitted"}`,
          passed,
          score: att.score,
          timeStr: new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          timestamp: ts,
        });
      }
    });

    // 7. Fetch Real Assignment Submissions
    const { data: rawAssignments } = await adminClient.from("assignments").select("id, title");
    const assignmentTitleMap = new Map<string, string>();
    (rawAssignments || []).forEach((a: any) => assignmentTitleMap.set(a.id, a.title));

    const { data: rawAssignSubs } = await adminClient
      .from("assignment_submissions")
      .select("*")
      .or(`student_id.eq.${studentId},student_id.eq.${studentUserId},user_id.eq.${studentId},user_id.eq.${studentUserId}`)
      .order("submitted_at", { ascending: false });

    (rawAssignSubs || []).forEach((asub: any) => {
      const subDateStr = asub.submitted_at || asub.created_at;
      if (!subDateStr) return;
      const ts = new Date(subDateStr).getTime();
      if (ts < minTimestamp || ts > maxTimestamp) return;

      const dateStr = new Date(ts).toISOString().slice(0, 10);
      const day = getOrCreateDay(dateStr);
      const assignTitle = assignmentTitleMap.get(asub.assignment_id) || "Assignment";

      day.count += 1;
      day.categories.learning += 1;
      day.details.push({
        id: asub.id || `assign-${ts}`,
        category: "learning",
        title: `Submitted Assignment: ${assignTitle}`,
        subtitle: `Status: ${asub.status || "Submitted"}`,
        timeStr: new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        timestamp: ts,
      });
    });

    // 8. Integrate Real-Time Active Sessions from ActiveTimeService
    const studentActiveData = ActiveTimeService.getStudentActiveTime(studentId);
    if (studentActiveData && studentActiveData.sessions) {
      studentActiveData.sessions.forEach((sess) => {
        const startStr = sess.startedAt;
        if (!startStr) return;
        const ts = new Date(startStr).getTime();
        if (ts < minTimestamp || ts > maxTimestamp) return;

        const dateStr = new Date(ts).toISOString().slice(0, 10);
        const day = getOrCreateDay(dateStr);

        const durationMinutes = Math.max(1, Math.round((sess.durationSeconds || 60) / 60));

        // Active session counts towards active day and activity
        day.count += 1;
        day.categories.session += 1;
        day.details.push({
          id: sess.sessionId,
          category: "session",
          title: `Active Platform Session`,
          subtitle: `Active Time: ${durationMinutes} min${durationMinutes > 1 ? "s" : ""}`,
          timeStr: new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          timestamp: ts,
        });
      });
    }

    // 9. Calculate Intensity and sort details by timestamp for each active day
    for (const [, day] of dayMap.entries()) {
      if (day.count <= 0) {
        day.intensity = 0;
      } else if (day.count <= 2) {
        day.intensity = 1;
      } else if (day.count <= 5) {
        day.intensity = 2;
      } else if (day.count <= 10) {
        day.intensity = 3;
      } else {
        day.intensity = 4;
      }
      day.details.sort((a, b) => b.timestamp - a.timestamp);
    }

    // 10. Generate Full Calendar Array of Days (Every single day in range)
    const calendarDays: DayActivityData[] = [];
    let curDate = new Date(startDate);
    while (curDate.getTime() <= endDate.getTime()) {
      const iso = curDate.toISOString().slice(0, 10);
      const existing = dayMap.get(iso);
      if (existing) {
        calendarDays.push(existing);
      } else {
        calendarDays.push({
          date: iso,
          count: 0,
          intensity: 0,
          categories: {
            coding: 0,
            learning: 0,
            practice: 0,
            assessment: 0,
            session: 0,
          },
          details: [],
        });
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    // 11. Calculate Overall Summary Metrics (Total activities, active days, streaks)
    let totalActivities = 0;
    let totalActiveDays = 0;
    let maxStreak = 0;
    let currentStreak = 0;
    let runningStreak = 0;

    calendarDays.forEach((d) => {
      totalActivities += d.count;
      if (d.count > 0) {
        totalActiveDays += 1;
        runningStreak += 1;
        if (runningStreak > maxStreak) {
          maxStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    });

    // Calculate current streak ending today or yesterday
    const todayIso = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().slice(0, 10);

    const reversed = [...calendarDays].reverse();
    const todayIndex = reversed.findIndex((d) => d.date === todayIso);
    const hasToday = todayIndex !== -1 && (reversed[todayIndex]?.count ?? 0) > 0;
    const startIndex = hasToday ? todayIndex : reversed.findIndex((d) => d.date === yesterdayIso);

    if (startIndex !== -1) {
      for (let i = startIndex; i < reversed.length; i++) {
        const item = reversed[i];
        if (item && item.count > 0) {
          currentStreak += 1;
        } else {
          break;
        }
      }
    }

    // 12. Format Available Year Options for Filter
    const availableYears = [2026, 2025];

    return NextResponse.json({
      success: true,
      data: {
        totalActivities,
        totalActiveDays,
        maxStreak,
        currentStreak,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        calendarDays,
        availableYears,
        range,
      },
    });
  } catch (error: any) {
    console.error("GET /api/student/activity-heatmap error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load activity heatmap data." },
      { status: 500 }
    );
  }
}
