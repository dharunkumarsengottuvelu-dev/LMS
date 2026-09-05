import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";
import { ActiveTimeService } from "@/services/active-time.service";

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
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const isCustom = Boolean(fromParam && toParam);

    const adminClient = createAdminClient();

    // 1. Resolve student profile & batch context
    const batchContext = await getStudentBatchAccess(adminClient, user);
    const studentId = batchContext.profileId || user.id;
    const studentUserId = batchContext.studentUserId || user.id;

    // Determine timestamp threshold for range
    const now = Date.now();
    let minTimestamp = 0;
    let maxTimestamp = Infinity;

    if (isCustom && fromParam && toParam) {
      minTimestamp = new Date(fromParam).getTime();
      maxTimestamp = new Date(toParam + "T23:59:59.999Z").getTime();
    } else if (range === "7d") {
      minTimestamp = now - 7 * 86400000;
    } else if (range === "14d") {
      minTimestamp = now - 14 * 86400000;
    } else if (range === "30d") {
      minTimestamp = now - 30 * 86400000;
    }

    // 2. Concurrently fetch all datasets in parallel with lean column projections
    const [
      { data: rawCourses },
      { data: enrollments },
      { data: rawTracks },
      { data: rawAttempts },
      { data: rawAssessments },
      { data: rawSubmissions },
      { data: rawCodingSubmissions },
      { data: rawCodingProblems },
      { data: rawLiveClasses },
      { data: rawLiveAttendance },
      realActiveTime,
    ] = await Promise.all([
      adminClient
        .from("courses")
        .select("id, title, updated_at, tags, assigned_batches, is_common")
        .order("created_at", { ascending: false }),
      adminClient
        .from("enrollments")
        .select("id, course_id, completed_lessons, progress_percentage, created_at, updated_at")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId}`),
      adminClient
        .from("practice_tracks")
        .select("id, title, description, tags, assigned_batches, is_common, sub_modules")
        .order("created_at", { ascending: false }),
      adminClient
        .from("assessment_attempts")
        .select("id, assessment_id, is_practice, passed, score, time_taken_seconds, submitted_at, created_at")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId}`)
        .order("submitted_at", { ascending: false }),
      adminClient
        .from("assessments")
        .select("id, title, duration_minutes, total_marks, passing_marks, tags, assigned_batches, is_common")
        .order("created_at", { ascending: false }),
      adminClient
        .from("assignment_submissions")
        .select("id, assignment_id, status, grade, submitted_at, created_at")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId}`)
        .order("submitted_at", { ascending: false }),
      adminClient
        .from("coding_submissions")
        .select("id, problem_id, status, language, score, execution_time_ms, submitted_at, created_at")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId}`)
        .order("created_at", { ascending: false }),
      adminClient
        .from("coding_problems")
        .select("id, title, difficulty, description, created_at")
        .order("created_at", { ascending: true }),
      adminClient
        .from("live_classes")
        .select("id, title, description, scheduled_date, start_time, end_time, status, meeting_link, assigned_batches, is_common")
        .order("scheduled_date", { ascending: false }),
      adminClient
        .from("live_class_attendance")
        .select("id, live_class_id, joined_at, duration_minutes, status")
        .or(`student_id.eq.${studentId},student_id.eq.${studentUserId}`),
      ActiveTimeService.getStudentActiveTime(studentId).catch(() => null),
    ]);

    const enrollmentMap = new Map<string, any>();
    (enrollments || []).forEach((e: any) => enrollmentMap.set(e.course_id, e));

    const coursesList: any[] = [];
    let completedCoursesCount = 0;

    (rawCourses || []).forEach((c: any) => {
      let meta: any = {};
      if (c.tags && c.tags[0]) {
        try {
          meta = JSON.parse(c.tags[0]);
        } catch {}
      }

      const assignedBatches = c.assigned_batches || meta.assignedBatches || meta.assigned_batches || [];
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

        if (progress === 100) completedCoursesCount++;

        const modules = rawMods.map((m: any, mIdx: number) => {
          const subCount = m.subModules?.length || 1;
          const isModCompleted = progress >= Math.round(((mIdx + 1) / Math.max(1, rawMods.length)) * 100);
          const startStr = isModCompleted || progress > 0
            ? (enroll?.created_at ? new Date(enroll.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Started")
            : "Not Started";
          const compStr = isModCompleted
            ? (c.updated_at ? new Date(c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Completed")
            : null;

          return {
            id: m.id || `mod_${mIdx + 1}`,
            title: m.title || `Module ${mIdx + 1}`,
            completed: isModCompleted,
            startedAt: startStr,
            completedAt: compStr,
            attemptsCount: isModCompleted ? 1 : 0,
            status: isModCompleted ? "Completed" : progress > 0 ? "In Progress" : "Not Started",
            subLessonsCount: subCount,
            completedLessonsCount: isModCompleted ? subCount : 0,
          };
        });

        coursesList.push({
          id: c.id,
          title: c.title,
          category: meta.category || "Technical Course",
          progress,
          completedLessons,
          totalLessons: Math.max(1, totalLessons),
          totalModules: rawMods.length,
          completedModules: modules.filter((m: any) => m.completed).length,
          startDate: enroll?.created_at ? new Date(enroll.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Enrolled",
          completedDate: progress === 100 && (enroll?.updated_at || c.updated_at) ? new Date(enroll?.updated_at || c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
          lastAccessed: c.updated_at ? new Date(c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
          status: progress === 100 ? "Completed" : progress > 0 ? "In Progress" : "Not Started",
          modules,
        });
      }
    });

    // 3. Process Practice Tracks (Skill Lab)
    const attemptsMap = new Map<string, any[]>();
    (rawAttempts || []).forEach((att: any) => {
      const list = attemptsMap.get(att.assessment_id) || [];
      list.push(att);
      attemptsMap.set(att.assessment_id, list);
    });

    const practicesList: any[] = [];
    let completedPracticesCount = 0;

    (rawTracks || []).forEach((t: any) => {
      let meta: any = {};
      if (t.tags && t.tags[0]) {
        try {
          meta = JSON.parse(t.tags[0]);
        } catch {}
      }

      const assignedBatches = t.assigned_batches || meta.assignedBatches || meta.assigned_batches || [];
      const isCommon =
        t.is_common !== undefined
          ? t.is_common
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
        const subModules = meta.subModules || t.sub_modules || [];
        let completedSubs = 0;

        const mappedSubs = subModules.map((sm: any, smIdx: number) => {
          const subAttempts = attemptsMap.get(sm.id) || [];
          const bestAttempt = subAttempts[0];
          const isDone = subAttempts.length > 0 && ((bestAttempt?.score ?? 0) >= 50 || bestAttempt?.passed);
          const hasAttempted = subAttempts.length > 0;
          if (isDone) completedSubs++;

          const startedAtStr = hasAttempted
            ? new Date(subAttempts[subAttempts.length - 1].created_at || subAttempts[subAttempts.length - 1].submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "Not Started";
          const completedAtStr = bestAttempt?.submitted_at
            ? new Date(bestAttempt.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : isDone
            ? "Completed"
            : null;

          return {
            id: sm.id || `sm_${smIdx + 1}`,
            title: sm.title || `Challenge ${smIdx + 1}`,
            description: sm.description || "Interactive problem",
            difficulty: sm.difficulty || "Medium",
            completed: isDone,
            attemptsCount: subAttempts.length,
            startedAt: startedAtStr,
            completedAt: completedAtStr,
            score: bestAttempt?.score !== undefined ? Math.round(bestAttempt.score) : undefined,
            status: isDone ? "Completed" : hasAttempted ? "In Progress" : "Not Started",
            submittedTimestamp: bestAttempt?.submitted_at ? new Date(bestAttempt.submitted_at).getTime() : 0,
          };
        });

        const trackProgress = subModules.length > 0 ? Math.round((completedSubs / subModules.length) * 100) : 0;
        if (trackProgress === 100) completedPracticesCount++;

        practicesList.push({
          id: t.id,
          title: t.title,
          description: t.description || "Skill Lab Track",
          totalChallenges: subModules.length,
          completedChallenges: completedSubs,
          progress: trackProgress,
          status: trackProgress === 100 ? "Completed" : trackProgress > 0 ? "In Progress" : "Not Started",
          challenges: mappedSubs,
        });
      }
    });

    const skillLabList = [...practicesList];

    // Process Code Lab Problem Solving Challenges
    const codeLabList: any[] = [];
    let completedCodingCount = 0;

    if (rawCodingProblems && rawCodingProblems.length > 0) {
      const codingSubMap = new Map<string, any[]>();
      (rawCodingSubmissions || []).forEach((cs: any) => {
        const list = codingSubMap.get(cs.problem_id) || [];
        list.push(cs);
        codingSubMap.set(cs.problem_id, list);
      });

      rawCodingProblems.forEach((cp: any, idx: number) => {
        const subs = codingSubMap.get(cp.id) || [];
        const bestSub = subs.find((s: any) => s.status === "accepted") || subs[0];
        const isDone = subs.some((s: any) => s.status === "accepted");
        if (isDone) completedCodingCount++;

        const startedAtStr = subs.length > 0
          ? new Date(subs[subs.length - 1].created_at || subs[subs.length - 1].submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Not Started";
        const completedAtStr = isDone && bestSub?.created_at
          ? new Date(bestSub.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : isDone
          ? "Completed"
          : null;

        codeLabList.push({
          id: cp.id,
          title: cp.title || `Coding Problem ${idx + 1}`,
          description: cp.description || "Interactive coding challenge",
          difficulty: cp.difficulty ? cp.difficulty.charAt(0).toUpperCase() + cp.difficulty.slice(1) : "Medium",
          completed: isDone,
          attemptsCount: subs.length,
          startedAt: startedAtStr,
          completedAt: completedAtStr,
          score: isDone ? 100 : subs.length > 0 ? 50 : undefined,
          status: isDone ? "Solved" : subs.length > 0 ? "In Progress" : "Not Started",
          language: bestSub?.language || "Python",
          submittedTimestamp: bestSub?.created_at ? new Date(bestSub.created_at).getTime() : 0,
        });
      });

      const prog = Math.round((completedCodingCount / Math.max(1, rawCodingProblems.length)) * 100);
      if (prog === 100) completedPracticesCount++;

      practicesList.push({
        id: "code-lab-track",
        title: "Code Lab Practice Track",
        description: "Core algorithms, data structures & coding challenges",
        totalChallenges: rawCodingProblems.length,
        completedChallenges: completedCodingCount,
        progress: prog,
        status: prog === 100 ? "Completed" : prog > 0 ? "In Progress" : "Not Started",
        challenges: codeLabList,
      });
    }

    // 4. Process Assessments
    const assessmentsList: any[] = [];
    let completedAssessmentsCount = 0;

    (rawAssessments || []).forEach((a: any) => {
      let meta: any = {};
      if (a.tags && a.tags[0]) {
        try {
          meta = JSON.parse(a.tags[0]);
        } catch {}
      }

      const assignedBatches = a.assigned_batches || meta.assignedBatches || meta.assigned_batches || [];
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
        const attList = attemptsMap.get(a.id) || [];
        const bestAtt = attList[0];
        const isAttempted = attList.length > 0;
        if (isAttempted) completedAssessmentsCount++;

        const score = bestAtt?.score !== undefined ? bestAtt.score : 0;
        const totalMarks = bestAtt?.total_marks || a.total_marks || 100;
        const pct = Math.min(100, Math.round((score / totalMarks) * 100));

        const startedAtStr = isAttempted
          ? new Date(attList[attList.length - 1].created_at || attList[attList.length - 1].submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : "Not Started";
        const completedAtStr = bestAtt?.submitted_at
          ? new Date(bestAtt.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : isAttempted
          ? "Submitted"
          : "Pending";

        assessmentsList.push({
          id: a.id,
          title: a.title,
          type: a.type === "mcq" ? "Multiple Choice Exam" : "Proctored Coding Exam",
          totalMarks,
          durationMinutes: a.duration_minutes || a.duration || 60,
          attempted: isAttempted,
          attemptsCount: attList.length,
          startedAt: startedAtStr,
          completedDate: completedAtStr,
          scoreObtained: isAttempted ? `${score} / ${totalMarks} (${pct}%)` : "Not Attempted",
          rawScore: isAttempted ? pct : 0,
          status: isAttempted ? (pct >= 50 ? "Completed (Passed)" : "Submitted (Needs Retake)") : "Not Started",
          evaluation: isAttempted ? (pct >= 50 ? (pct >= 85 ? "Passed (Distinction)" : "Passed") : "Evaluated") : "Pending",
          integrityViolations: bestAtt ? `${bestAtt.violations || bestAtt.tab_switches || 0} Flags` : "0 Flags",
          submittedTimestamp: bestAtt?.submitted_at ? new Date(bestAtt.submitted_at).getTime() : 0,
        });
      }
    });

    // 5. Process Live Classes
    const liveAttendanceMap = new Map<string, any>();
    (rawLiveAttendance || []).forEach((la: any) => {
      liveAttendanceMap.set(la.live_class_id, la);
    });

    const liveClassesList: any[] = [];
    let attendedLiveClassesCount = 0;

    (rawLiveClasses || []).forEach((lc: any) => {
      let meta: any = {};
      if (lc.tags && lc.tags[0]) {
        try {
          meta = JSON.parse(lc.tags[0]);
        } catch {}
      }

      const assignedBatches = lc.assigned_batches || meta.assignedBatches || meta.assigned_batches || [];
      const isCommon =
        lc.is_common !== undefined
          ? lc.is_common
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
        const att = liveAttendanceMap.get(lc.id);
        const hasAttended = !!att;
        if (hasAttended) attendedLiveClassesCount++;

        const startStr = lc.start_time || "10:00 AM";
        const endStr = lc.end_time || "11:30 AM";
        const dateStr = lc.scheduled_date
          ? new Date(lc.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Scheduled";

        liveClassesList.push({
          id: lc.id,
          title: lc.title || "Live Lecture Session",
          description: lc.description || "Interactive virtual classroom session",
          scheduledDate: dateStr,
          timeWindow: `${startStr} - ${endStr}`,
          status: lc.status || (hasAttended ? "Completed" : "Scheduled"),
          attended: hasAttended,
          attendanceStatus: hasAttended ? "Attended" : "Absent",
          durationMinutes: att?.duration_minutes || 60,
          meetingLink: lc.meeting_link || "",
        });
      }
    });

    // 6. Calculate total active time spent and day-by-day distribution with detailed activity breakdown
    let totalTimeSpentSeconds = 0;
    const dayMap = new Map<string, number>();
    const dayActivitiesMap = new Map<
      string,
      {
        assessmentsCount: number;
        codingCount: number;
        courseModulesCount: number;
        assignmentsCount: number;
        loginsCount: number;
      }
    >();

    const getOrCreateDayAct = (iso: string) => {
      if (!dayActivitiesMap.has(iso)) {
        dayActivitiesMap.set(iso, {
          assessmentsCount: 0,
          codingCount: 0,
          courseModulesCount: 0,
          assignmentsCount: 0,
          loginsCount: 0,
        });
      }
      return dayActivitiesMap.get(iso)!;
    };

    // A. Assessment Attempts
    (rawAttempts || []).forEach((att: any) => {
      const timeTaken = typeof att.time_taken_seconds === "number" && att.time_taken_seconds > 0 ? att.time_taken_seconds : 1800;
      totalTimeSpentSeconds += timeTaken;

      if (att.submitted_at || att.created_at) {
        const ts = new Date(att.submitted_at || att.created_at).getTime();
        if (range === "all" || (ts >= minTimestamp && ts <= maxTimestamp)) {
          const iso = new Date(ts).toISOString().slice(0, 10);
          const mins = Math.round(timeTaken / 60);
          dayMap.set(iso, (dayMap.get(iso) || 0) + mins);
          const act = getOrCreateDayAct(iso);
          act.assessmentsCount++;
        }
      }
    });

    // B. Assignment Submissions
    (rawSubmissions || []).forEach((sub: any) => {
      const timeTaken = 2400; // 40 mins per project submission
      totalTimeSpentSeconds += timeTaken;

      if (sub.submitted_at || sub.created_at) {
        const ts = new Date(sub.submitted_at || sub.created_at).getTime();
        if (range === "all" || (ts >= minTimestamp && ts <= maxTimestamp)) {
          const iso = new Date(ts).toISOString().slice(0, 10);
          const mins = Math.round(timeTaken / 60);
          dayMap.set(iso, (dayMap.get(iso) || 0) + mins);
          const act = getOrCreateDayAct(iso);
          act.assignmentsCount++;
        }
      }
    });

    // C. Coding Challenge Submissions
    (rawCodingSubmissions || []).forEach((cSub: any) => {
      const timeTaken = 1200; // 20 mins per coding challenge run
      totalTimeSpentSeconds += timeTaken;

      if (cSub.created_at) {
        const ts = new Date(cSub.created_at).getTime();
        if (range === "all" || (ts >= minTimestamp && ts <= maxTimestamp)) {
          const iso = new Date(ts).toISOString().slice(0, 10);
          const mins = Math.round(timeTaken / 60);
          dayMap.set(iso, (dayMap.get(iso) || 0) + mins);
          const act = getOrCreateDayAct(iso);
          act.codingCount++;
        }
      }
    });

    // D. Completed Course Modules Progress
    coursesList.forEach((course: any) => {
      const moduleCount = course.completedModules || 0;
      if (moduleCount > 0) {
        const courseTime = moduleCount * 2400; // 40 mins per module completed
        totalTimeSpentSeconds += courseTime;

        const ts = course.lastAccessed && course.lastAccessed !== "Recent" ? new Date(course.lastAccessed).getTime() : now;
        if (range === "all" || (ts >= minTimestamp && ts <= maxTimestamp)) {
          const iso = new Date(ts).toISOString().slice(0, 10);
          const mins = Math.round(courseTime / 60);
          dayMap.set(iso, (dayMap.get(iso) || 0) + mins);
          const act = getOrCreateDayAct(iso);
          act.courseModulesCount += moduleCount;
        }
      }
    });

    // E. Real-time Active Session Tracking & LMS Usage (pre-fetched concurrently)
    if (realActiveTime && realActiveTime.totalActiveSeconds > 0) {
      totalTimeSpentSeconds = realActiveTime.totalActiveSeconds;
    }

    if (realActiveTime && realActiveTime.dailyBreakdown) {
      for (const [isoDate, activeSecs] of Object.entries(realActiveTime.dailyBreakdown)) {
        const ts = new Date(isoDate).getTime();
        if (range === "all" || (ts >= minTimestamp && ts <= maxTimestamp)) {
          const mins = Math.round(Number(activeSecs) / 60);
          dayMap.set(isoDate, (dayMap.get(isoDate) || 0) + mins);
          const act = getOrCreateDayAct(isoDate);
          act.loginsCount = Math.max(act.loginsCount, 1);
        }
      }
    }

    // Generate daily time spent chart with detailed day metadata
    const dailyTimeSpent: Array<{
      day: string;
      label: string;
      fullDate: string;
      minutes: number;
      display: string;
      height: number;
      activities: {
        assessmentsCount: number;
        codingCount: number;
        courseModulesCount: number;
        assignmentsCount: number;
        loginsCount: number;
      };
    }> = [];

    if (isCustom && fromParam && toParam) {
      const startD = new Date(fromParam);
      const endD = new Date(toParam);
      const totalSpanDays = Math.max(1, Math.min(31, Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1));

      let maxDayMinutes = 1;
      for (let i = 0; i < totalSpanDays; i++) {
        const dObj = new Date(startD.getTime() + i * 86400000);
        const iso = dObj.toISOString().slice(0, 10);
        const mins = dayMap.get(iso) || 0;
        if (mins > maxDayMinutes) maxDayMinutes = mins;
      }

      for (let i = 0; i < totalSpanDays; i++) {
        const dObj = new Date(startD.getTime() + i * 86400000);
        const iso = dObj.toISOString().slice(0, 10);
        const dayLabel = dObj.toLocaleDateString("en-US", { day: "numeric", month: "short" });
        const fullDate = dObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        const mins = dayMap.get(iso) || 0;
        const height = mins > 0 ? Math.min(100, Math.max(8, Math.round((mins / maxDayMinutes) * 100))) : 4;
        const display = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
        const act = dayActivitiesMap.get(iso) || { assessmentsCount: 0, codingCount: 0, courseModulesCount: 0, assignmentsCount: 0, loginsCount: mins > 0 ? 1 : 0 };

        dailyTimeSpent.push({
          day: dayLabel,
          label: dayLabel,
          fullDate,
          minutes: mins,
          display,
          height,
          activities: act,
        });
      }
    } else {
      const daysCount = range === "7d" ? 7 : range === "14d" ? 14 : range === "30d" ? 30 : 7;
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
        const fullDate = dObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        const mins = dayMap.get(iso) || 0;
        const height = mins > 0 ? Math.min(100, Math.max(8, Math.round((mins / maxDayMinutes) * 100))) : 4;
        const display = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
        const act = dayActivitiesMap.get(iso) || { assessmentsCount: 0, codingCount: 0, courseModulesCount: 0, assignmentsCount: 0, loginsCount: mins > 0 ? 1 : 0 };

        dailyTimeSpent.push({
          day: dayLabel,
          label: dayLabel,
          fullDate,
          minutes: mins,
          display,
          height,
          activities: act,
        });
      }
    }

    // 7. Login Activities
    const loginActivities: any[] = [];
    if (user.last_sign_in_at) {
      const lastLogin = new Date(user.last_sign_in_at);
      loginActivities.push({
        id: "auth-current",
        timestamp: `${lastLogin.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${lastLogin.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        date: lastLogin.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        device: "Desktop / Chrome Browser",
        duration: "Active Session",
        status: "Active",
      });
    }

    if (user.created_at) {
      const created = new Date(user.created_at);
      loginActivities.push({
        id: "auth-created",
        timestamp: `${created.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        date: created.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        device: "Initial Registration / Portal Access",
        duration: "Completed",
        status: "Completed",
      });
    }

    // Total submissions count
    const totalSubmissionsCount = (rawAttempts || []).length + (rawSubmissions || []).length + (rawCodingSubmissions || []).length;

    return NextResponse.json({
      reports: {
        summary: {
          enrolledCoursesCount: coursesList.length,
          completedCoursesCount,
          learningCount: coursesList.length,
          completedLearningCount: completedCoursesCount,
          skillLabCount: skillLabList.length,
          completedSkillLabCount: skillLabList.reduce((acc: number, p: any) => acc + (p.completedChallenges || 0), 0),
          codeLabCount: codeLabList.length,
          completedCodeLabCount: completedCodingCount,
          practicesCount: skillLabList.length + (codeLabList.length > 0 ? 1 : 0),
          completedPracticesCount: completedCodingCount + completedPracticesCount,
          assessmentsCount: assessmentsList.length,
          completedAssessmentsCount,
          liveClassesCount: liveClassesList.length,
          attendedLiveClassesCount,
          totalSubmissionsCount,
          totalTimeSpentSeconds,
        },
        learningList: coursesList,
        coursesList,
        skillLabList,
        codeLabList,
        practicesList,
        assessmentsList,
        liveClassesList,
        dailyTimeSpent,
        loginActivities,
      },
    });
  } catch (error) {
    console.error("GET /api/student/reports Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
