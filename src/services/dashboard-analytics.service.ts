import { createAdminClient } from "@/lib/supabase/admin";

export interface LearningActivityOverviewData {
  activeStudentsToday: number;
  studentsOnlineNow: number;
  coursesInProgress: number;
  lessonsCompletedToday: number;
  practiceSessionsToday: number;
  codingSubmissionsToday: {
    total: number;
    accepted: number;
    failed: number;
  };
  testAttemptsToday: number;
  averageStudyTimeFormatted: string;
  averageStudyTimeSeconds: number;
  sevenDayActivity: {
    day: string;
    date: string;
    activeStudents: number;
    lessonsCompleted: number;
    practiceSessions: number;
    codingSubmissions: number;
    testAttempts: number;
  }[];
}

export interface TopPerformingStudent {
  id: string;
  name: string;
  email: string;
  performanceScore: number;
  completedAssessments: number;
  courseProgressAvg: number;
  rank: number;
}

export interface StudentsNeedingAttention {
  totalCount: number;
  reasons: {
    label: string;
    count: number;
    description: string;
  }[];
  sampleStudents: {
    id: string;
    name: string;
    email: string;
    reason: string;
  }[];
}

export interface StudentEngagementAndProgressData {
  topStudents: TopPerformingStudent[];
  studentsNeedingAttention: StudentsNeedingAttention;
  courseCompletionRate: {
    ratePct: number;
    completedCount: number;
    totalEnrollments: number;
  };
  assessmentPassRate: {
    ratePct: number;
    passedCount: number;
    totalAttempts: number;
  };
  averageStudentProgressPct: number;
  mostActiveCourse: {
    id: string;
    title: string;
    learnerCount: number;
    avgProgress: number;
  } | null;
  mostPracticedSkill: {
    skill: string;
    submissionsCount: number;
    hasEnoughData: boolean;
  };
  mostAttemptedAssessment: {
    id: string;
    title: string;
    attemptCount: number;
    passRatePct: number;
  } | null;
  inactiveStudents: {
    count: number;
    thresholdDays: number;
    totalStudents: number;
  };
  sevenDayProgressTrend: {
    day: string;
    date: string;
    avgProgress: number;
    completionsCount: number;
  }[];
}

export interface DashboardAnalyticsPayload {
  activityOverview: LearningActivityOverviewData;
  studentEngagement: StudentEngagementAndProgressData;
  generatedAt: string;
}

function formatStudyTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export class DashboardAnalyticsService {
  public static async getAnalytics(): Promise<DashboardAnalyticsPayload> {
    const admin = createAdminClient();

    const now = new Date();
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const onlineWindowStart = new Date(now.getTime() - 3 * 60 * 1000).toISOString(); // 3 minutes for online heartbeat

    // 1. Parallel fetch of all primary datasets to eliminate N+1 queries
    const [
      studentsRes,
      heartbeatsRes,
      enrollmentsRes,
      codingSubsRes,
      attemptsRes,
      coursesRes,
      assessmentsRes,
      codingProblemsRes,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role, status, created_at")
        .eq("role", "student"),
      admin
        .from("notifications")
        .select("id, user_id, message, metadata, created_at")
        .eq("type", "session_heartbeat")
        .gte("created_at", sevenDaysAgo.toISOString()),
      admin
        .from("enrollments")
        .select("id, student_id, course_id, status, progress_percentage, enrolled_at, completed_at, updated_at"),
      admin
        .from("coding_submissions")
        .select("id, student_id, problem_id, status, created_at")
        .gte("created_at", sevenDaysAgo.toISOString()),
      admin
        .from("assessment_attempts")
        .select("id, student_id, assessment_id, status, score, total_marks, percentage, started_at, submitted_at, created_at")
        .gte("created_at", sevenDaysAgo.toISOString()),
      admin
        .from("courses")
        .select("id, title, status"),
      admin
        .from("assessments")
        .select("id, title, passing_marks, total_marks, status"),
      admin
        .from("coding_problems")
        .select("id, title, category, topic_tags"),
    ]);

    const students = studentsRes.data || [];
    const heartbeats = heartbeatsRes.data || [];
    const enrollments = enrollmentsRes.data || [];
    const codingSubs = codingSubsRes.data || [];
    const attempts = attemptsRes.data || [];
    const courses = coursesRes.data || [];
    const assessments = assessmentsRes.data || [];
    const codingProblems = codingProblemsRes.data || [];

    // Map student IDs (both profile id and user_id)
    const studentProfileMap = new Map<string, any>();
    const studentUserToProfileMap = new Map<string, string>();
    students.forEach((s) => {
      studentProfileMap.set(s.id, s);
      if (s.user_id) {
        studentUserToProfileMap.set(s.user_id, s.id);
        studentProfileMap.set(s.user_id, s);
      }
    });

    // --- METRIC 1: ACTIVE STUDENTS TODAY ---
    const activeStudentIdsToday = new Set<string>();

    // Activity from heartbeats today
    heartbeats.forEach((h: any) => {
      const meta = h.metadata || {};
      const createdAt = h.created_at || "";
      const lastHeartbeat = meta.lastHeartbeatAt || createdAt;
      if (lastHeartbeat >= todayStart || createdAt >= todayStart) {
        if (h.user_id) activeStudentIdsToday.add(h.user_id);
      }
    });

    // Activity from coding submissions today
    codingSubs.forEach((c: any) => {
      if (c.created_at && c.created_at >= todayStart) {
        if (c.student_id) activeStudentIdsToday.add(c.student_id);
      }
    });

    // Activity from assessment attempts today
    attempts.forEach((a: any) => {
      const atTime = a.submitted_at || a.created_at || a.started_at;
      if (atTime && atTime >= todayStart) {
        if (a.student_id) activeStudentIdsToday.add(a.student_id);
      }
    });

    // Activity from enrollments updated today
    enrollments.forEach((e: any) => {
      if (e.updated_at && e.updated_at >= todayStart) {
        if (e.student_id) activeStudentIdsToday.add(e.student_id);
      }
    });

    const activeStudentsToday = activeStudentIdsToday.size;

    // --- METRIC 2: STUDENTS ONLINE NOW ---
    // Heartbeat received in the last 3 minutes and session is not closed
    const onlineStudentsSet = new Set<string>();
    heartbeats.forEach((h: any) => {
      const meta = h.metadata || {};
      const isClosed = !!meta.isClosed;
      const lastHb = meta.lastHeartbeatAt || h.created_at;
      if (!isClosed && lastHb && lastHb >= onlineWindowStart) {
        if (h.user_id) onlineStudentsSet.add(h.user_id);
      }
    });
    const studentsOnlineNow = onlineStudentsSet.size;

    // --- METRIC 3: COURSES IN PROGRESS ---
    // Courses with active enrollment, progress > 0 and < 100, and not completed
    const inProgressCourseIds = new Set<string>();
    enrollments.forEach((e: any) => {
      const progress = Number(e.progress_percentage || 0);
      const isCompleted = e.status === "completed" || !!e.completed_at || progress >= 100;
      if (!isCompleted && progress > 0 && e.status === "active") {
        if (e.course_id) inProgressCourseIds.add(e.course_id);
      }
    });
    const coursesInProgress = inProgressCourseIds.size;

    // --- METRIC 4: LESSONS COMPLETED TODAY ---
    let lessonsCompletedToday = 0;
    enrollments.forEach((e: any) => {
      if (e.updated_at && e.updated_at >= todayStart) {
        // If course completed today, count as completion
        if (e.completed_at && e.completed_at >= todayStart) {
          lessonsCompletedToday += 1;
        }
      }
    });
    // Add completed coding submissions today as completed modules/lessons
    const codingCompletedToday = codingSubs.filter(
      (c: any) => (c.status === "accepted" || c.status === "passed") && c.created_at >= todayStart
    ).length;
    lessonsCompletedToday += codingCompletedToday;

    // --- METRIC 5: PRACTICE SESSIONS TODAY ---
    const practiceSessionsToday = codingSubs.filter((c: any) => c.created_at >= todayStart).length;

    // --- METRIC 6: CODING SUBMISSIONS (TODAY) ---
    const codingSubsToday = codingSubs.filter((c: any) => c.created_at >= todayStart);
    const codingTotalToday = codingSubsToday.length;
    const codingAcceptedToday = codingSubsToday.filter(
      (c: any) => c.status === "accepted" || c.status === "passed"
    ).length;
    const codingFailedToday = codingTotalToday - codingAcceptedToday;

    // --- METRIC 7: TEST ATTEMPTS TODAY ---
    const testAttemptsToday = attempts.filter((a: any) => {
      const atTime = a.submitted_at || a.created_at || a.started_at;
      return atTime && atTime >= todayStart;
    }).length;

    // --- METRIC 8: AVERAGE STUDY TIME ---
    let totalTodayStudySeconds = 0;
    const activeStudentDurationMap = new Map<string, number>();

    heartbeats.forEach((h: any) => {
      const meta = h.metadata || {};
      const lastHb = meta.lastHeartbeatAt || h.created_at;
      if (lastHb && lastHb >= todayStart) {
        const dur = Number(meta.durationSeconds || 0);
        if (dur > 0 && h.user_id) {
          activeStudentDurationMap.set(h.user_id, (activeStudentDurationMap.get(h.user_id) || 0) + dur);
          totalTodayStudySeconds += dur;
        }
      }
    });

    const activeCountForStudyTime = activeStudentDurationMap.size || (activeStudentsToday > 0 ? activeStudentsToday : 1);
    const averageStudyTimeSeconds = activeStudentDurationMap.size > 0
      ? Math.round(totalTodayStudySeconds / activeCountForStudyTime)
      : 0;
    const averageStudyTimeFormatted = formatStudyTime(averageStudyTimeSeconds);

    // --- METRIC 9: 7-DAY ACTIVITY CHART ---
    const sevenDayActivity = Array.from({ length: 7 }, (_, idx) => {
      const i = 6 - idx;
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStartIso = new Date(d.setHours(0, 0, 0, 0)).toISOString();
      const dayEndIso = new Date(d.setHours(23, 59, 59, 999)).toISOString();
      const dayLabel = d.toLocaleDateString("en", { weekday: "short" });
      const dateStr = dayStartIso.slice(0, 10);

      // Active students on this specific day
      const dayStudents = new Set<string>();
      heartbeats.forEach((h: any) => {
        const meta = h.metadata || {};
        const t = meta.lastHeartbeatAt || h.created_at;
        if (t >= dayStartIso && t <= dayEndIso && h.user_id) {
          dayStudents.add(h.user_id);
        }
      });
      codingSubs.forEach((c: any) => {
        if (c.created_at >= dayStartIso && c.created_at <= dayEndIso && c.student_id) {
          dayStudents.add(c.student_id);
        }
      });
      attempts.forEach((a: any) => {
        const t = a.submitted_at || a.created_at;
        if (t >= dayStartIso && t <= dayEndIso && a.student_id) {
          dayStudents.add(a.student_id);
        }
      });

      const dayCoding = codingSubs.filter(
        (c: any) => c.created_at >= dayStartIso && c.created_at <= dayEndIso
      ).length;

      const dayAttempts = attempts.filter((a: any) => {
        const t = a.submitted_at || a.created_at;
        return t >= dayStartIso && t <= dayEndIso;
      }).length;

      const dayLessonsCompleted = enrollments.filter(
        (e: any) => e.completed_at && e.completed_at >= dayStartIso && e.completed_at <= dayEndIso
      ).length + codingSubs.filter(
        (c: any) => (c.status === "accepted" || c.status === "passed") && c.created_at >= dayStartIso && c.created_at <= dayEndIso
      ).length;

      return {
        day: dayLabel,
        date: dateStr,
        activeStudents: dayStudents.size,
        lessonsCompleted: dayLessonsCompleted,
        practiceSessions: dayCoding,
        codingSubmissions: dayCoding,
        testAttempts: dayAttempts,
      };
    });

    // =========================================================================
    // SECTION 2: STUDENT ENGAGEMENT & PROGRESS
    // =========================================================================

    // Student performance aggregation map
    const studentScoreMap = new Map<string, { totalScorePct: number; count: number }>();
    attempts.forEach((a: any) => {
      const sId = a.student_id;
      if (!sId) return;
      const totalMarks = Number(a.total_marks) || 100;
      const score = Number(a.score) || 0;
      const pct = a.percentage !== null && a.percentage !== undefined
        ? Number(a.percentage)
        : Math.round((score / (totalMarks || 1)) * 100);

      const curr = studentScoreMap.get(sId) || { totalScorePct: 0, count: 0 };
      curr.totalScorePct += pct;
      curr.count += 1;
      studentScoreMap.set(sId, curr);
    });

    // Student enrollment progress aggregation map
    const studentProgressMap = new Map<string, { totalProgress: number; count: number; completedCount: number }>();
    enrollments.forEach((e: any) => {
      const sId = e.student_id;
      if (!sId) return;
      const prog = Number(e.progress_percentage || 0);
      const isComp = e.status === "completed" || !!e.completed_at || prog >= 100;

      const curr = studentProgressMap.get(sId) || { totalProgress: 0, count: 0, completedCount: 0 };
      curr.totalProgress += prog;
      curr.count += 1;
      if (isComp) curr.completedCount += 1;
      studentProgressMap.set(sId, curr);
    });

    // 1. Top Performing Students
    const studentPerformanceList: TopPerformingStudent[] = [];
    students.forEach((stu) => {
      const id = stu.id;
      const userId = stu.user_id;
      const scoreRecord = studentScoreMap.get(id) || (userId ? studentScoreMap.get(userId) : null);
      const progRecord = studentProgressMap.get(id) || (userId ? studentProgressMap.get(userId) : null);

      const avgAssessment = scoreRecord && scoreRecord.count > 0
        ? Math.round(scoreRecord.totalScorePct / scoreRecord.count)
        : null;

      const avgProg = progRecord && progRecord.count > 0
        ? Math.round(progRecord.totalProgress / progRecord.count)
        : null;

      if (avgAssessment !== null || avgProg !== null) {
        // Composite score based on actual assessments and course progress
        const finalScore = avgAssessment !== null && avgProg !== null
          ? Math.round(avgAssessment * 0.6 + avgProg * 0.4)
          : avgAssessment !== null
          ? avgAssessment
          : avgProg!;

        const fullName = [stu.first_name, stu.last_name].filter(Boolean).join(" ") || stu.email?.split("@")[0] || "Student Candidate";

        studentPerformanceList.push({
          id: stu.id,
          name: fullName,
          email: stu.email || "",
          performanceScore: finalScore,
          completedAssessments: scoreRecord?.count || 0,
          courseProgressAvg: avgProg || 0,
          rank: 0,
        });
      }
    });

    // Sort descending by performance score
    studentPerformanceList.sort((a, b) => b.performanceScore - a.performanceScore);
    const topStudents = studentPerformanceList.slice(0, 5).map((s, idx) => ({
      ...s,
      rank: idx + 1,
    }));

    // 2. Students Needing Attention (Defined thresholds)
    // Low progress: < 20% on enrollments
    // Low assessment: avg score < 40%
    // Inactivity: no activity > 7 days
    const attentionLowProgress: any[] = [];
    const attentionLowScore: any[] = [];
    const attentionInactive: any[] = [];

    // Calculate last active for each student
    const studentLastActiveMap = new Map<string, string>();
    heartbeats.forEach((h: any) => {
      const meta = h.metadata || {};
      const t = meta.lastHeartbeatAt || h.created_at;
      if (t && h.user_id) {
        const curr = studentLastActiveMap.get(h.user_id);
        if (!curr || t > curr) studentLastActiveMap.set(h.user_id, t);
      }
    });
    codingSubs.forEach((c: any) => {
      if (c.created_at && c.student_id) {
        const curr = studentLastActiveMap.get(c.student_id);
        if (!curr || c.created_at > curr) studentLastActiveMap.set(c.student_id, c.created_at);
      }
    });
    attempts.forEach((a: any) => {
      const t = a.submitted_at || a.created_at;
      if (t && a.student_id) {
        const curr = studentLastActiveMap.get(a.student_id);
        if (!curr || t > curr) studentLastActiveMap.set(a.student_id, t);
      }
    });

    students.forEach((stu) => {
      const id = stu.id;
      const userId = stu.user_id;
      const scoreRecord = studentScoreMap.get(id) || (userId ? studentScoreMap.get(userId) : null);
      const progRecord = studentProgressMap.get(id) || (userId ? studentProgressMap.get(userId) : null);
      const lastActive = studentLastActiveMap.get(id) || (userId ? studentLastActiveMap.get(userId) : null);

      const fullName = [stu.first_name, stu.last_name].filter(Boolean).join(" ") || stu.email?.split("@")[0] || "Student Candidate";

      // Check low score
      if (scoreRecord && scoreRecord.count > 0) {
        const avg = scoreRecord.totalScorePct / scoreRecord.count;
        if (avg < 40) {
          attentionLowScore.push({ id: stu.id, name: fullName, email: stu.email, reason: `Low Assessment Score (${Math.round(avg)}%)` });
        }
      }

      // Check low progress on active enrollments
      if (progRecord && progRecord.count > 0) {
        const avgP = progRecord.totalProgress / progRecord.count;
        if (avgP < 20) {
          attentionLowProgress.push({ id: stu.id, name: fullName, email: stu.email, reason: `Low Course Progress (${Math.round(avgP)}%)` });
        }
      }

      // Check inactivity (> 7 days or never active)
      if (!lastActive || new Date(lastActive) < sevenDaysAgo) {
        attentionInactive.push({ id: stu.id, name: fullName, email: stu.email, reason: "Inactive for 7+ days" });
      }
    });

    const uniqueAttentionStudentIds = new Set<string>([
      ...attentionLowProgress.map((s) => s.id),
      ...attentionLowScore.map((s) => s.id),
      ...attentionInactive.map((s) => s.id),
    ]);

    const studentsNeedingAttention: StudentsNeedingAttention = {
      totalCount: uniqueAttentionStudentIds.size,
      reasons: [
        {
          label: "Inactive Learners",
          count: attentionInactive.length,
          description: "No learning activity or heartbeat in 7+ days",
        },
        {
          label: "Low Course Progress",
          count: attentionLowProgress.length,
          description: "Enrolled with under 20% progress",
        },
        {
          label: "Low Assessment Score",
          count: attentionLowScore.length,
          description: "Scoring below 40% on attempted evaluations",
        },
      ],
      sampleStudents: [...attentionLowScore, ...attentionLowProgress, ...attentionInactive].slice(0, 5),
    };

    // 3. Course Completion Rate
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(
      (e: any) => e.status === "completed" || !!e.completed_at || Number(e.progress_percentage || 0) >= 100
    ).length;
    const courseCompletionRate = {
      ratePct: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
      completedCount: completedEnrollments,
      totalEnrollments,
    };

    // 4. Assessment Pass Rate
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter((a: any) => {
      const totalMarks = Number(a.total_marks) || 100;
      const score = Number(a.score) || 0;
      const pct = a.percentage !== null && a.percentage !== undefined
        ? Number(a.percentage)
        : Math.round((score / (totalMarks || 1)) * 100);
      return pct >= 50;
    }).length;

    const assessmentPassRate = {
      ratePct: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
      passedCount: passedAttempts,
      totalAttempts,
    };

    // 5. Average Student Progress across active enrollments
    const activeEnrollments = enrollments.filter((e: any) => e.status === "active");
    const totalProgressSum = activeEnrollments.reduce((acc: number, e: any) => acc + Number(e.progress_percentage || 0), 0);
    const averageStudentProgressPct = activeEnrollments.length > 0
      ? Math.round(totalProgressSum / activeEnrollments.length)
      : 0;

    // 6. Most Active Course
    const courseEnrollmentCountMap = new Map<string, { count: number; totalProgress: number }>();
    enrollments.forEach((e: any) => {
      if (!e.course_id) return;
      const curr = courseEnrollmentCountMap.get(e.course_id) || { count: 0, totalProgress: 0 };
      curr.count += 1;
      curr.totalProgress += Number(e.progress_percentage || 0);
      courseEnrollmentCountMap.set(e.course_id, curr);
    });

    let topCourseId: string | null = null;
    let topCourseCount = 0;
    let topCourseAvgProgress = 0;

    courseEnrollmentCountMap.forEach((val, cId) => {
      if (val.count > topCourseCount) {
        topCourseCount = val.count;
        topCourseId = cId;
        topCourseAvgProgress = Math.round(val.totalProgress / (val.count || 1));
      }
    });

    const topCourseRow = topCourseId ? courses.find((c: any) => c.id === topCourseId) : null;
    const mostActiveCourse = topCourseRow
      ? {
          id: topCourseRow.id,
          title: topCourseRow.title,
          learnerCount: topCourseCount,
          avgProgress: topCourseAvgProgress,
        }
      : courses[0]
      ? {
          id: courses[0].id,
          title: courses[0].title,
          learnerCount: 0,
          avgProgress: 0,
        }
      : null;

    // 7. Most Practiced Skill
    const skillCountMap = new Map<string, number>();
    const problemCategoryMap = new Map<string, string>();
    codingProblems.forEach((p: any) => {
      const cat = p.category || (p.topic_tags && p.topic_tags[0]) || "";
      if (cat) problemCategoryMap.set(p.id, cat);
    });

    codingSubs.forEach((c: any) => {
      const skill = problemCategoryMap.get(c.problem_id);
      if (skill) {
        skillCountMap.set(skill, (skillCountMap.get(skill) || 0) + 1);
      }
    });

    let topSkill = "";
    let topSkillCount = 0;
    skillCountMap.forEach((count, skill) => {
      if (count > topSkillCount) {
        topSkillCount = count;
        topSkill = skill;
      }
    });

    const mostPracticedSkill = {
      skill: topSkill || "Not enough data",
      submissionsCount: topSkillCount,
      hasEnoughData: topSkillCount > 0,
    };

    // 8. Most Attempted Assessment
    const assessmentAttemptsMap = new Map<string, { count: number; passed: number }>();
    attempts.forEach((a: any) => {
      if (!a.assessment_id) return;
      const totalMarks = Number(a.total_marks) || 100;
      const score = Number(a.score) || 0;
      const pct = a.percentage !== null && a.percentage !== undefined
        ? Number(a.percentage)
        : Math.round((score / (totalMarks || 1)) * 100);

      const curr = assessmentAttemptsMap.get(a.assessment_id) || { count: 0, passed: 0 };
      curr.count += 1;
      if (pct >= 50) curr.passed += 1;
      assessmentAttemptsMap.set(a.assessment_id, curr);
    });

    let topAssessmentId: string | null = null;
    let topAssessmentAttempts = 0;
    let topAssessmentPassed = 0;

    assessmentAttemptsMap.forEach((val, aId) => {
      if (val.count > topAssessmentAttempts) {
        topAssessmentAttempts = val.count;
        topAssessmentId = aId;
        topAssessmentPassed = val.passed;
      }
    });

    const topAssessmentRow = topAssessmentId
      ? assessments.find((a: any) => a.id === topAssessmentId)
      : null;

    const mostAttemptedAssessment = topAssessmentRow
      ? {
          id: topAssessmentRow.id,
          title: topAssessmentRow.title,
          attemptCount: topAssessmentAttempts,
          passRatePct: topAssessmentAttempts > 0 ? Math.round((topAssessmentPassed / topAssessmentAttempts) * 100) : 0,
        }
      : null;

    // 9. Inactive Students (Threshold: 7+ days without meaningful activity)
    const inactiveStudents = {
      count: attentionInactive.length,
      thresholdDays: 7,
      totalStudents: students.length,
    };

    // 10. 7-Day Progress Trend
    const sevenDayProgressTrend = Array.from({ length: 7 }, (_, idx) => {
      const i = 6 - idx;
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStartIso = new Date(d.setHours(0, 0, 0, 0)).toISOString();
      const dayEndIso = new Date(d.setHours(23, 59, 59, 999)).toISOString();
      const dayLabel = d.toLocaleDateString("en", { weekday: "short" });
      const dateStr = dayStartIso.slice(0, 10);

      const completionsOnDay = enrollments.filter(
        (e: any) => e.completed_at && e.completed_at >= dayStartIso && e.completed_at <= dayEndIso
      ).length;

      // Attempts score average on day
      const dayAttempts = attempts.filter((a: any) => {
        const t = a.submitted_at || a.created_at;
        return t >= dayStartIso && t <= dayEndIso;
      });

      let dayAvg = 0;
      if (dayAttempts.length > 0) {
        const sum = dayAttempts.reduce((acc, a) => {
          const totalMarks = Number(a.total_marks) || 100;
          const score = Number(a.score) || 0;
          return acc + (a.percentage !== null && a.percentage !== undefined ? Number(a.percentage) : Math.round((score / totalMarks) * 100));
        }, 0);
        dayAvg = Math.round(sum / dayAttempts.length);
      } else {
        dayAvg = averageStudentProgressPct;
      }

      return {
        day: dayLabel,
        date: dateStr,
        avgProgress: dayAvg,
        completionsCount: completionsOnDay,
      };
    });

    return {
      activityOverview: {
        activeStudentsToday,
        studentsOnlineNow,
        coursesInProgress,
        lessonsCompletedToday,
        practiceSessionsToday,
        codingSubmissionsToday: {
          total: codingTotalToday,
          accepted: codingAcceptedToday,
          failed: codingFailedToday,
        },
        testAttemptsToday,
        averageStudyTimeFormatted,
        averageStudyTimeSeconds,
        sevenDayActivity,
      },
      studentEngagement: {
        topStudents,
        studentsNeedingAttention,
        courseCompletionRate,
        assessmentPassRate,
        averageStudentProgressPct,
        mostActiveCourse,
        mostPracticedSkill,
        mostAttemptedAssessment,
        inactiveStudents,
        sevenDayProgressTrend,
      },
      generatedAt: now.toISOString(),
    };
  }
}
