import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  successfulCount: number;
  performancePct: number;
  intensity: 0 | 1 | 2 | 3 | 4 | 5;
  categories: {
    coding: number;
    learning: number;
    practice: number;
    assessment: number;
    session: number;
  };
  details: ActivityDetailItem[];
}

/**
 * Deterministic color intensity calculation based on activity volume AND performance quality.
 *
 * Volume Base:
 *  0 activities  -> Level 0 (Empty/light grey)
 *  1 activity    -> Level 1 (Very light green)
 *  2–3 activities -> Level 2 (Light green)
 *  4–6 activities -> Level 3 (Medium green)
 *  7–10 activities -> Level 4 (Dark green)
 *  10+ activities  -> Level 5 (Strongest/darkest green)
 *
 * Performance Modulation:
 *  - Low performance (< 50% success rate): step down 1 level (minimum 1)
 *  - Moderate performance (50%–89%): maintains base tier
 *  - High / excellent performance (>= 90% with 4+ activities): step up 1 level (maximum 5)
 */
export function calculateHeatmapIntensity(
  count: number,
  successfulCount: number
): 0 | 1 | 2 | 3 | 4 | 5 {
  if (count <= 0) return 0;

  const performancePct = Math.round((successfulCount / count) * 100);

  let tier: number;
  if (count === 1) tier = 1;
  else if (count <= 3) tier = 2;
  else if (count <= 6) tier = 3;
  else if (count <= 10) tier = 4;
  else tier = 5;

  if (performancePct < 50) {
    tier = Math.max(1, tier - 1);
  } else if (performancePct >= 90 && count >= 4) {
    tier = Math.min(5, tier + 1);
  }

  return tier as 0 | 1 | 2 | 3 | 4 | 5;
}

/**
 * Format a Date, timestamp, or ISO string into local YYYY-MM-DD for a specific timezone
 */
function getLocalDateStr(dateOrTs: Date | number | string, timeZone: string): string {
  try {
    const d = typeof dateOrTs === "object" ? dateOrTs : new Date(dateOrTs);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    const d = typeof dateOrTs === "object" ? dateOrTs : new Date(dateOrTs);
    return d.toISOString().slice(0, 10);
  }
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
    const range = searchParams.get("range") || "12m"; // "12m" or "year"
    const targetYearParam = searchParams.get("year");
    const clientTz = searchParams.get("tz") || "Asia/Kolkata";

    const adminClient = createAdminClient();

    // 1. Resolve student profile context
    const batchContext = await getStudentBatchAccess(adminClient, user);
    const studentId = batchContext.profileId || user.id;
    const studentUserId = batchContext.studentUserId || user.id;

    // 2. Define Date Range Window strictly in student's local timezone
    const todayLocalStr = getLocalDateStr(new Date(), clientTz);
    const parts = todayLocalStr.split("-").map(Number);
    const nowY = parts[0] ?? new Date().getFullYear();
    const nowM = parts[1] ?? 1;
    const nowD = parts[2] ?? 1;

    let startDateStr: string;
    let endDateStr: string;

    if (targetYearParam) {
      const yr = parseInt(targetYearParam, 10);
      startDateStr = `${yr}-01-01`;
      endDateStr = yr === nowY ? todayLocalStr : `${yr}-12-31`;
    } else {
      // Past 365 days (52 weeks) ending today
      endDateStr = todayLocalStr;
      const endUtc = new Date(Date.UTC(nowY, nowM - 1, nowD, 23, 59, 59, 999));
      const startUtc = new Date(Date.UTC(nowY, nowM - 1, nowD - 364, 0, 0, 0, 0));
      startDateStr = startUtc.toISOString().slice(0, 10);
    }

    // Map of local date string YYYY-MM-DD -> DayActivityData
    const dayMap = new Map<string, DayActivityData>();

    const getOrCreateDay = (dateStr: string): DayActivityData => {
      let entry = dayMap.get(dateStr);
      if (!entry) {
        entry = {
          date: dateStr,
          count: 0,
          successfulCount: 0,
          performancePct: 0,
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

    // 3. Concurrently fetch all activity datasets in parallel with lean column projections
    const [
      { data: rawProblems },
      { data: rawCodingSubs },
      { data: rawCourses },
      { data: rawEnrollments },
      { data: rawAssessments },
      { data: rawAttempts },
      { data: rawAssignments },
      { data: rawAssignSubs },
      { data: rawLiveAttendance },
      { data: rawLiveClasses },
    ] = await Promise.all([
      adminClient.from("coding_problems").select("id, title, slug"),
      adminClient
        .from("coding_submissions")
        .select("id, problem_id, status, language, score, submitted_at, created_at")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId},user_id.eq.${studentId},user_id.eq.${studentUserId}`)
        .order("created_at", { ascending: false }),
      adminClient.from("courses").select("id, title"),
      adminClient
        .from("enrollments")
        .select("id, course_id, completed_at, updated_at, status, progress_percentage")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId},user_id.eq.${studentId},user_id.eq.${studentUserId}`),
      adminClient.from("assessments").select("id, title, type"),
      adminClient
        .from("assessment_attempts")
        .select("id, assessment_id, is_practice, passed, score, submitted_at, created_at")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId},user_id.eq.${studentId},user_id.eq.${studentUserId}`)
        .order("submitted_at", { ascending: false }),
      adminClient.from("assignments").select("id, title"),
      adminClient
        .from("assignment_submissions")
        .select("id, assignment_id, status, grade, content, file_url, submitted_at, created_at")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId},user_id.eq.${studentId},user_id.eq.${studentUserId}`)
        .order("submitted_at", { ascending: false }),
      adminClient
        .from("live_class_attendance")
        .select("id, live_class_id, attendance_status, duration_seconds, joined_at, created_at")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId}`),
      adminClient.from("live_classes").select("id, title"),
    ]);

    // Map Coding Problems
    const problemNameMap = new Map<string, string>();
    (rawProblems || []).forEach((p: any) => {
      if (p.id) problemNameMap.set(p.id, p.title || p.slug || `Problem #${p.id}`);
      if (p.slug) problemNameMap.set(p.slug, p.title || p.slug);
    });

    // Process Coding Submissions
    (rawCodingSubs || []).forEach((sub: any) => {
      const createdStr = sub.submitted_at || sub.created_at;
      if (!createdStr) return;
      const ts = new Date(createdStr).getTime();
      if (isNaN(ts)) return;

      const dateStr = getLocalDateStr(ts, clientTz);
      if (dateStr < startDateStr || dateStr > endDateStr) return;

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
      if (isAccepted) {
        day.successfulCount += 1;
      }
      day.categories.coding += 1;
      day.details.push({
        id: sub.id || `coding-${ts}`,
        category: "coding",
        title: isAccepted ? `Solved: ${probTitle}` : `Submitted: ${probTitle}`,
        subtitle: `Language: ${(sub.language || "code").toUpperCase()} • Status: ${statusLabel}`,
        status: statusLabel,
        passed: isAccepted,
        timeStr: new Intl.DateTimeFormat("en-US", { timeZone: clientTz, hour: "numeric", minute: "2-digit" }).format(new Date(ts)),
        timestamp: ts,
      });
    });

    // Map Course Titles and process Course Completions
    const courseTitleMap = new Map<string, string>();
    (rawCourses || []).forEach((c: any) => courseTitleMap.set(c.id, c.title));

    (rawEnrollments || []).forEach((enr: any) => {
      const cTitle = courseTitleMap.get(enr.course_id) || "Course";

      // Track ONLY actual Course / Module Completion
      if (enr.completed_at || enr.status === "completed" || enr.progress_percentage === 100) {
        const compDateStr = enr.completed_at || enr.updated_at;
        if (compDateStr) {
          const compTs = new Date(compDateStr).getTime();
          if (!isNaN(compTs)) {
            const dateStr = getLocalDateStr(compTs, clientTz);
            if (dateStr >= startDateStr && dateStr <= endDateStr) {
              const day = getOrCreateDay(dateStr);
              day.count += 1;
              day.successfulCount += 1;
              day.categories.learning += 1;
              day.details.push({
                id: `comp-${enr.id || compTs}`,
                category: "learning",
                title: `Completed Course: ${cTitle}`,
                subtitle: `100% Curriculum Completed`,
                status: "Completed",
                passed: true,
                timeStr: new Intl.DateTimeFormat("en-US", { timeZone: clientTz, hour: "numeric", minute: "2-digit" }).format(new Date(compTs)),
                timestamp: compTs,
              });
            }
          }
        }
      }
    });

    // Map Assessments and process Attempts
    const assessmentTitleMap = new Map<string, { title: string; type: string }>();
    (rawAssessments || []).forEach((a: any) =>
      assessmentTitleMap.set(a.id, { title: a.title, type: a.type || "assessment" })
    );

    (rawAttempts || []).forEach((att: any) => {
      const attDateStr = att.submitted_at || att.created_at;
      if (!attDateStr) return;
      const ts = new Date(attDateStr).getTime();
      if (isNaN(ts)) return;

      const dateStr = getLocalDateStr(ts, clientTz);
      if (dateStr < startDateStr || dateStr > endDateStr) return;

      const day = getOrCreateDay(dateStr);

      const assMeta = assessmentTitleMap.get(att.assessment_id);
      const isPractice = assMeta?.type === "practice" || att.is_practice;
      const title = assMeta?.title || (isPractice ? "Practice Challenge" : "Assessment Exam");
      const passed = att.passed === true || (att.score !== undefined && att.score >= 50);

      day.count += 1;
      if (passed) {
        day.successfulCount += 1;
      }

      if (isPractice) {
        day.categories.practice += 1;
        day.details.push({
          id: att.id || `practice-${ts}`,
          category: "practice",
          title: `Practice: ${title}`,
          subtitle: `Score: ${att.score ?? 0}% • ${passed ? "Passed" : "Attempted"}`,
          status: passed ? "Passed" : "Attempted",
          passed,
          score: att.score,
          timeStr: new Intl.DateTimeFormat("en-US", { timeZone: clientTz, hour: "numeric", minute: "2-digit" }).format(new Date(ts)),
          timestamp: ts,
        });
      } else {
        day.categories.assessment += 1;
        day.details.push({
          id: att.id || `assessment-${ts}`,
          category: "assessment",
          title: `Assessment: ${title}`,
          subtitle: `Score: ${att.score ?? 0} pts • ${passed ? "Passed" : "Submitted"}`,
          status: passed ? "Passed" : "Submitted",
          passed,
          score: att.score,
          timeStr: new Intl.DateTimeFormat("en-US", { timeZone: clientTz, hour: "numeric", minute: "2-digit" }).format(new Date(ts)),
          timestamp: ts,
        });
      }
    });

    // Map Assignments and process Assignment Submissions
    const assignmentTitleMap = new Map<string, string>();
    (rawAssignments || []).forEach((a: any) => assignmentTitleMap.set(a.id, a.title));

    (rawAssignSubs || []).forEach((asub: any) => {
      const subDateStr = asub.submitted_at || asub.created_at;
      if (!subDateStr) return;
      const ts = new Date(subDateStr).getTime();
      if (isNaN(ts)) return;

      const dateStr = getLocalDateStr(ts, clientTz);
      if (dateStr < startDateStr || dateStr > endDateStr) return;

      const day = getOrCreateDay(dateStr);
      const assignTitle = assignmentTitleMap.get(asub.assignment_id) || "Assignment";
      const isGradedOrSubmitted = asub.status === "submitted" || asub.status === "graded" || asub.content || asub.file_url;
      const passed = asub.grade !== undefined ? asub.grade >= 50 : true;

      day.count += 1;
      if (passed && isGradedOrSubmitted) {
        day.successfulCount += 1;
      }
      day.categories.learning += 1;
      day.details.push({
        id: asub.id || `assign-${ts}`,
        category: "learning",
        title: `Submitted Assignment: ${assignTitle}`,
        subtitle: `Status: ${asub.status || "Submitted"}`,
        status: asub.status || "Submitted",
        passed,
        timeStr: new Intl.DateTimeFormat("en-US", { timeZone: clientTz, hour: "numeric", minute: "2-digit" }).format(new Date(ts)),
        timestamp: ts,
      });
    });

    // Map Live Classes and process Attendance
    const liveClassMap = new Map<string, string>();
    (rawLiveClasses || []).forEach((lc: any) => liveClassMap.set(lc.id, lc.title));

    (rawLiveAttendance || []).forEach((att: any) => {
      const isAttended = att.attendance_status === "attended" || (att.duration_seconds && att.duration_seconds >= 300);
      if (!isAttended) return;

      const attDateStr = att.joined_at || att.created_at;
      if (!attDateStr) return;
      const ts = new Date(attDateStr).getTime();
      if (isNaN(ts)) return;

      const dateStr = getLocalDateStr(ts, clientTz);
      if (dateStr < startDateStr || dateStr > endDateStr) return;

      const day = getOrCreateDay(dateStr);
      const classTitle = liveClassMap.get(att.live_class_id) || "Live Learning Session";
      const durationMin = Math.max(1, Math.round((att.duration_seconds || 300) / 60));

      day.count += 1;
      day.successfulCount += 1;
      day.categories.session += 1;
      day.details.push({
        id: att.id || `live-${ts}`,
        category: "session",
        title: `Attended Class: ${classTitle}`,
        subtitle: `Session duration: ${durationMin} mins`,
        status: "Attended",
        passed: true,
        timeStr: new Intl.DateTimeFormat("en-US", { timeZone: clientTz, hour: "numeric", minute: "2-digit" }).format(new Date(ts)),
        timestamp: ts,
      });
    });

    // 9. Calculate Intensity and Performance for each day
    for (const [, day] of dayMap.entries()) {
      if (day.count > 0) {
        day.performancePct = Math.round((day.successfulCount / day.count) * 100);
        day.intensity = calculateHeatmapIntensity(day.count, day.successfulCount);
      } else {
        day.performancePct = 0;
        day.intensity = 0;
      }
      day.details.sort((a, b) => b.timestamp - a.timestamp);
    }

    // 10. Generate Full Calendar Array of Days (Every single day in range)
    const calendarDays: DayActivityData[] = [];
    const sParts = startDateStr.split("-").map(Number);
    const startY = sParts[0] ?? 2025;
    const startM = sParts[1] ?? 1;
    const startD = sParts[2] ?? 1;

    const eParts = endDateStr.split("-").map(Number);
    const endY = eParts[0] ?? 2026;
    const endM = eParts[1] ?? 12;
    const endD = eParts[2] ?? 31;

    const curUtc = new Date(Date.UTC(startY, startM - 1, startD, 0, 0, 0, 0));
    const limitUtc = new Date(Date.UTC(endY, endM - 1, endD, 23, 59, 59, 999));

    while (curUtc.getTime() <= limitUtc.getTime()) {
      const iso = curUtc.toISOString().slice(0, 10);
      const existing = dayMap.get(iso);
      if (existing) {
        calendarDays.push(existing);
      } else {
        calendarDays.push({
          date: iso,
          count: 0,
          successfulCount: 0,
          performancePct: 0,
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
      curUtc.setUTCDate(curUtc.getUTCDate() + 1);
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
    const yesterdayDate = new Date(Date.UTC(nowY, nowM - 1, nowD - 1, 0, 0, 0, 0));
    const yesterdayIso = yesterdayDate.toISOString().slice(0, 10);

    const reversed = [...calendarDays].reverse();
    const todayIndex = reversed.findIndex((d) => d.date === todayLocalStr);
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
        startDate: startDateStr,
        endDate: endDateStr,
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
