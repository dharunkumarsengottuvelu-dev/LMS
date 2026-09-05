import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveTimeService } from "@/services/active-time.service";
import { formatStudentId } from "@/services/student-id.service";

export interface StudentReportItem {
  id: string;
  studentUserId?: string;
  employeeId: string;
  name: string;
  email: string;
  batch: string;
  department: string;
  status: "active" | "inactive" | "flagged" | "suspended";
  joinedDate: string;
  enrolledCoursesCount: number;
  completedCoursesCount: number;
  courseTitles: string[];
  avgScore: number | null;
  practiceScore: number | null;
  practiceCount: number;
  codingAccuracy: number | null;
  codingSolvedCount: number;
  codingSubmissionsCount: number;
  assessmentScore: number | null;
  assessmentCount: number;
  assignmentCount: number;
  proctoringCompliance: number;
  violationCount: number;
  activeTimeSeconds: number;
  activeTimeFormatted: string;
  lastActivity: string;
  overallPerformancePct: number | null;
  overallStatus: "Excellent" | "Good" | "Average" | "Needs Attention" | "Inactive";
}

export interface ReportSummary {
  scope: string;
  reportType: "overall" | "batch";
  batchName: string | null;
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  flaggedStudents: number;
  averageScore: number;
  averagePracticeScore: number;
  averageCodingAccuracy: number;
  averageAssessmentScore: number;
  totalAssignmentsSubmitted: number;
  averageProctoringCompliance: number;
  totalViolationsLogged: number;
  totalActiveTimeSeconds: number;
  totalActiveTimeFormatted: string;
  averageActiveTimeFormatted: string;
  courseCompletionRate: number;
  generatedAt: string;
  generatedBy: string;
  filtersApplied: {
    reportType: string;
    batch: string;
    status: string;
    dateRange: string;
    courseId: string;
    search: string;
  };
}

export interface BatchReportItem {
  id: string;
  batchName: string;
  collegeName?: string;
  courseName?: string;
  trainerName?: string;
  studentCount: number;
  activeStudents: number;
  avgScore: number;
  avgPracticeScore: number;
  avgCodingAccuracy: number;
  avgAssessmentScore: number;
  avgProctoringCompliance: number;
  totalViolations: number;
  totalActiveTimeSeconds: number;
  totalActiveTimeFormatted: string;
  students: StudentReportItem[];
}

function formatSeconds(secs: number): string {
  if (!secs || secs <= 0) return "0m";
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    let user: any = null;
    let role = "admin";
    let profile: any = null;

    try {
      const supabase = await createClient();
      const authRes = await supabase.auth.getUser();
      user = authRes.data?.user || null;
      if (user) {
        const { data: userProfile } = await adminClient
          .from("profiles")
          .select("id, role, first_name, last_name, email")
          .or(`user_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();
        profile = userProfile;
        role = userProfile?.role || "admin";
      }
    } catch (e) {
      console.warn("Notice: getUser exception in report API:", e);
    }

    // Only reject if an authenticated user is explicitly a student trying to view admin reports
    if (user && role === "student") {
      return NextResponse.json(
        { error: "Forbidden: Admin or Trainer authorization required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportType = (searchParams.get("reportType") || "overall").toLowerCase() as "overall" | "batch";
    const batchFilter = searchParams.get("batch") || "all";
    const statusFilter = searchParams.get("status") || "all";
    const dateRange = searchParams.get("dateRange") || "all";
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const courseIdFilter = searchParams.get("courseId") || "all";
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

    // 2. Date Range Window Calculation
    const now = Date.now();
    let minTimestamp = 0;
    let maxTimestamp = now + 86400000;

    if (fromParam && toParam) {
      const fTs = new Date(fromParam).getTime();
      const tTs = new Date(toParam + "T23:59:59.999Z").getTime();
      if (!isNaN(fTs) && !isNaN(tTs)) {
        minTimestamp = fTs;
        maxTimestamp = tTs;
      }
    } else if (dateRange === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      minTimestamp = todayStart.getTime();
    } else if (dateRange === "7d") {
      minTimestamp = now - 7 * 86400000;
    } else if (dateRange === "30d") {
      minTimestamp = now - 30 * 86400000;
    }

    // 3. Concurrently fetch all datasets in parallel with exact verified column projections and error safety
    const [
      rawStudentsRes,
      authUsersRes,
      batchesRes,
      batchMembersRes,
      coursesRes,
      enrollmentsRes,
      codingSubsRes,
      attemptsRes,
      assessmentsRes,
      assignmentsRes,
      rawLiveAttResult,
      allStudentsActiveTime,
    ] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, role, status, batch_id, batch, batch_name, college, branch, created_at, updated_at")
        .in("role", ["student", "Student", "STUDENT"])
        .order("created_at", { ascending: false })
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query profiles:", e);
          return { data: [] };
        }),
      adminClient.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } })),
      adminClient
        .from("batches")
        .select("id, name, batch_name, code, description, trainer_id, course_id, status")
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query batches:", e);
          return { data: [] };
        }),
      adminClient
        .from("batch_members")
        .select("batch_id, user_id")
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query batch_members:", e);
          return { data: [] };
        }),
      adminClient
        .from("courses")
        .select("id, title")
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query courses:", e);
          return { data: [] };
        }),
      adminClient
        .from("enrollments")
        .select("id, student_id, course_id, status, progress_percentage, completed_at, enrolled_at")
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query enrollments:", e);
          return { data: [] };
        }),
      adminClient
        .from("coding_submissions")
        .select("id, problem_id, student_id, language, source_code, status, passed_test_cases, total_test_cases, created_at")
        .order("created_at", { ascending: false })
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query coding_submissions:", e);
          return { data: [] };
        }),
      adminClient
        .from("assessment_attempts")
        .select("id, assessment_id, student_id, status, score, total_marks, percentage, submitted_at, tab_switch_count, proctoring_flags, created_at")
        .order("submitted_at", { ascending: false })
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query assessment_attempts:", e);
          return { data: [] };
        }),
      adminClient
        .from("assessments")
        .select("id, title, type, pass_percentage, total_marks")
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query assessments:", e);
          return { data: [] };
        }),
      adminClient
        .from("assignment_submissions")
        .select("id, assignment_id, student_id, file_url, submission_text, status, score, submitted_at, created_at")
        .order("submitted_at", { ascending: false })
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query assignment_submissions:", e);
          return { data: [] };
        }),
      adminClient
        .from("live_class_attendance")
        .select("id, student_id, live_class_id, attendance_status, duration_seconds, joined_at, created_at")
        .then((res: any) => res, (e: any) => {
          console.error("Failed to query live_class_attendance:", e);
          return { data: [] };
        }),
      ActiveTimeService.getAllStudentsActiveTime().catch(() => ({})),
    ]);

    const rawStudents = rawStudentsRes?.data || [];
    const allBatches = batchesRes?.data || [];
    const allBatchMembers = batchMembersRes?.data || [];
    const allCourses = coursesRes?.data || [];
    const allEnrollments = enrollmentsRes?.data || [];
    const allCodingSubs = codingSubsRes?.data || [];
    const allAttempts = attemptsRes?.data || [];
    const allAssessments = assessmentsRes?.data || [];
    const allAssignments = assignmentsRes?.data || [];

    // Merge auth users to ensure every registered student profile exists
    const profileUserIdSet = new Set((rawStudents || []).map((p: any) => p.user_id || p.id));
    const mergedStudents: any[] = [...(rawStudents || [])];
    const authUsers = (authUsersRes as any)?.data?.users || [];

    for (const au of authUsers) {
      const uId = au.id;
      if (!profileUserIdSet.has(uId)) {
        const meta = au.user_metadata || {};
        const metaRole = (meta.role || "").toLowerCase();
        const email = (au.email || "").toLowerCase();
        const isTrainer = metaRole === "trainer" || email.includes("trainer");
        const isAdmin = metaRole === "admin" || metaRole === "super_admin" || email.includes("admin");
        if (!isTrainer && !isAdmin) {
          const fullName = (meta.full_name || meta.name || "").trim();
          const nameParts = fullName.split(" ");
          const emailPrefix = au.email ? au.email.split("@")[0] : "Student";
          const formattedEmailName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          const firstName = meta.first_name || nameParts[0] || formattedEmailName;
          const lastName = meta.last_name || nameParts.slice(1).join(" ") || "";

          mergedStudents.push({
            id: au.id,
            user_id: au.id,
            email: au.email || "",
            first_name: firstName,
            last_name: lastName,
            role: "student",
            status: "active",
            batch_id: null,
            batch: "Unassigned",
            batch_name: "Unassigned",
            college: "",
            branch: "",
            created_at: au.created_at || new Date().toISOString(),
          });
        }
      }
    }

    // Trainer Batch Scoping: filter from pre-fetched allBatches
    let trainerAuthorizedBatchNames: string[] | null = null;
    let trainerAuthorizedBatchIds: string[] | null = null;

    if (role === "trainer") {
      const assignedBatches = (allBatches || []).filter((b: any) => {
        const bId = b.trainer_id || "";
        return (
          (user && bId === user.id) ||
          (profile && bId === profile?.id)
        );
      });

      if (assignedBatches.length > 0) {
        trainerAuthorizedBatchIds = assignedBatches.map((b: any) => b.id);
        trainerAuthorizedBatchNames = assignedBatches.map((b: any) => (b.batch_name || b.name || "").toLowerCase());
      }
    }

    // Map Batches and Batch Memberships
    const batchNameMap = new Map<string, string>();
    (allBatches || []).forEach((b: any) => {
      const title = b.batch_name || b.name || `Batch #${b.id}`;
      batchNameMap.set(b.id, title);
    });

    const userBatchMap = new Map<string, string[]>();
    (allBatchMembers || []).forEach((bm: any) => {
      const list = userBatchMap.get(bm.user_id) || [];
      const bTitle = batchNameMap.get(bm.batch_id) || bm.batch_id;
      if (bTitle && !list.includes(bTitle)) {
        list.push(bTitle);
      }
      userBatchMap.set(bm.user_id, list);
    });

    // Map Courses & Course Enrollments
    const courseTitleMap = new Map<string, string>();
    (allCourses || []).forEach((c: any) => courseTitleMap.set(c.id, c.title));

    const userEnrollmentsMap = new Map<string, any[]>();
    (allEnrollments || []).forEach((e: any) => {
      const uId = e.student_id || e.user_id;
      if (!uId) return;
      const list = userEnrollmentsMap.get(uId) || [];
      list.push(e);
      userEnrollmentsMap.set(uId, list);
    });

    // Map Assessment Definitions for types
    const assessmentMetaMap = new Map<string, any>();
    (allAssessments || []).forEach((a: any) => assessmentMetaMap.set(a.id, a));

    // Map Coding Submissions (filtered by date range)
    const userCodingMap = new Map<string, any[]>();
    (allCodingSubs || []).forEach((sub: any) => {
      const cStr = sub.created_at;
      if (!cStr) return;
      const ts = new Date(cStr).getTime();
      if (ts < minTimestamp || ts > maxTimestamp) return;

      const uId = sub.student_id || sub.user_id;
      if (!uId) return;
      const list = userCodingMap.get(uId) || [];
      list.push({ ...sub, timestamp: ts });
      userCodingMap.set(uId, list);
    });

    // Map Assessment & Test Attempts (filtered by date range)
    const userAttemptsMap = new Map<string, any[]>();
    (allAttempts || []).forEach((att: any) => {
      const aStr = att.submitted_at || att.created_at;
      if (!aStr) return;
      const ts = new Date(aStr).getTime();
      if (ts < minTimestamp || ts > maxTimestamp) return;

      const uId = att.student_id || att.user_id;
      if (!uId) return;
      const list = userAttemptsMap.get(uId) || [];
      list.push({ ...att, timestamp: ts });
      userAttemptsMap.set(uId, list);
    });

    // Map Assignment Submissions (filtered by date range)
    const userAssignmentsMap = new Map<string, any[]>();
    (allAssignments || []).forEach((asub: any) => {
      const sStr = asub.submitted_at || asub.created_at;
      if (!sStr) return;
      const ts = new Date(sStr).getTime();
      if (ts < minTimestamp || ts > maxTimestamp) return;

      const uId = asub.student_id || asub.user_id;
      if (!uId) return;
      const list = userAssignmentsMap.get(uId) || [];
      list.push({ ...asub, timestamp: ts });
      userAssignmentsMap.set(uId, list);
    });

    // Map Live Class Attendance (filtered by date range)
    const allLiveAttendance: any[] = rawLiveAttResult?.data || [];
    const userLiveAttendanceMap = new Map<string, any[]>();
    allLiveAttendance.forEach((latt: any) => {
      const lStr = latt.joined_at || latt.created_at;
      if (!lStr) return;
      const ts = new Date(lStr).getTime();
      if (ts < minTimestamp || ts > maxTimestamp) return;

      const uId = latt.student_id || latt.user_id;
      if (!uId) return;
      const list = userLiveAttendanceMap.get(uId) || [];
      list.push({ ...latt, timestamp: ts });
      userLiveAttendanceMap.set(uId, list);
    });

    // Process & Aggregate Each Student (GUARANTEE: Exactly 1 record per student, NO duplicates)
    const reportRows: StudentReportItem[] = [];

    // Helper for dual mapping lookup
    const getMergedItems = (map: Map<string, any[]>, id1: string, id2?: string) => {
      const list1 = map.get(id1) || [];
      const list2 = id2 && id2 !== id1 ? (map.get(id2) || []) : [];
      const seen = new Set<string>();
      const combined: any[] = [];
      for (const item of [...list1, ...list2]) {
        if (!item.id || !seen.has(item.id)) {
          if (item.id) seen.add(item.id);
          combined.push(item);
        }
      }
      return combined;
    };

    (mergedStudents || []).forEach((p: any, studentIndex: number) => {
      const studentId = p.id;
      const studentUserId = p.user_id || p.id;
      const studentEmail = p.email || "";
      const studentName =
        `${p.first_name || ""} ${p.last_name || ""}`.trim() || studentEmail.split("@")[0] || "Student";

      // Resolve batch
      const membershipBatches = [
        ...(userBatchMap.get(studentId) || []),
        ...(userBatchMap.get(studentUserId) || []),
      ];
      let assignedBatch = p.batch || p.batch_name || "Unassigned";
      if (membershipBatches.length > 0) {
        assignedBatch = Array.from(new Set(membershipBatches)).join(", ");
      } else if (p.batch_id && batchNameMap.has(p.batch_id)) {
        assignedBatch = batchNameMap.get(p.batch_id)!;
      }

      // Trainer authorization check - only in batch report when trainer has specific assigned batches
      if (role === "trainer" && reportType === "batch" && trainerAuthorizedBatchNames && trainerAuthorizedBatchNames.length > 0) {
        const studentBatchLower = assignedBatch.toLowerCase();
        const hasAuth = trainerAuthorizedBatchNames.some(
          (b) => studentBatchLower.includes(b) || (b.length > 0 && b === studentBatchLower)
        );
        if (!hasAuth) return; // Skip students outside trainer's batches
      }

      // Apply Batch Filter (Only if specific batch is chosen and not 'all')
      if (batchFilter && batchFilter !== "all" && batchFilter !== "") {
        const targetBatch = batchFilter.toLowerCase();
        const sBatchLower = assignedBatch.toLowerCase();
        if (!sBatchLower.includes(targetBatch)) {
          return; // Skip student not in selected batch
        }
      }

      // Apply Status Filter
      const studentStatus = (p.status || "active").toLowerCase() as StudentReportItem["status"];
      if (statusFilter !== "all" && studentStatus !== statusFilter.toLowerCase()) {
        return;
      }

      // Course Enrollments (dual lookup)
      const enrollments = getMergedItems(userEnrollmentsMap, studentId, studentUserId);
      const enrolledCoursesCount = enrollments.length;
      const completedCoursesCount = enrollments.filter(
        (e) => e.status === "completed" || e.progress_percentage === 100 || e.completed_at
      ).length;
      const courseTitles = enrollments
        .map((e) => courseTitleMap.get(e.course_id) || "Enrolled Course")
        .filter((val, idx, arr) => arr.indexOf(val) === idx);

      // Apply Course Filter
      if (courseIdFilter !== "all" && courseIdFilter !== "") {
        const isEnrolledInCourse = enrollments.some((e) => e.course_id === courseIdFilter);
        if (!isEnrolledInCourse) return;
      }

      // Coding Submissions (dual lookup)
      const codingSubs = getMergedItems(userCodingMap, studentId, studentUserId);
      const codingSubmissionsCount = codingSubs.length;
      const acceptedCodingSubs = codingSubs.filter(
        (s) =>
          s.status === "accepted" ||
          s.status === "passed" ||
          (s.total_test_cases > 0 && s.passed_test_cases === s.total_test_cases)
      );
      const codingSolvedCount = acceptedCodingSubs.length;
      const codingAccuracy =
        codingSubmissionsCount > 0
          ? Math.round((codingSolvedCount / codingSubmissionsCount) * 100)
          : null;

      // Assessments & Practice Attempts (dual lookup)
      const attempts = getMergedItems(userAttemptsMap, studentId, studentUserId);

      const practiceAttempts = attempts.filter((a) => {
        const meta = a.assessment_id ? assessmentMetaMap.get(a.assessment_id) : null;
        return a.is_practice === true || a.status === "practice" || meta?.type === "practice";
      });
      const examAttempts = attempts.filter((a) => {
        const meta = a.assessment_id ? assessmentMetaMap.get(a.assessment_id) : null;
        return a.is_practice !== true && a.status !== "practice" && meta?.type !== "practice";
      });

      const getAttemptPct = (a: any): number => {
        if (a.percentage !== null && a.percentage !== undefined) return Number(a.percentage);
        if (a.total_marks && Number(a.total_marks) > 0) return Math.round((Number(a.score || 0) / Number(a.total_marks)) * 100);
        return Number(a.score) || 0;
      };

      let practiceScore: number | null = null;
      if (practiceAttempts.length > 0) {
        const sumPractice = practiceAttempts.reduce((acc, a) => acc + getAttemptPct(a), 0);
        practiceScore = Math.round(sumPractice / practiceAttempts.length);
      }

      let assessmentScore: number | null = null;
      if (examAttempts.length > 0) {
        const sumExam = examAttempts.reduce((acc, a) => acc + getAttemptPct(a), 0);
        assessmentScore = Math.round(sumExam / examAttempts.length);
      }

      // Average score overall across all evaluations (blending assessments and coding accuracy if present)
      let avgScore: number | null = null;
      const evalScores: number[] = [];
      if (assessmentScore !== null) evalScores.push(assessmentScore);
      if (practiceScore !== null) evalScores.push(practiceScore);
      if (codingAccuracy !== null) evalScores.push(codingAccuracy);

      if (evalScores.length > 0) {
        avgScore = Math.round(evalScores.reduce((a, b) => a + b, 0) / evalScores.length);
      } else if (attempts.length > 0) {
        const sumAll = attempts.reduce((acc, a) => acc + getAttemptPct(a), 0);
        avgScore = Math.round(sumAll / attempts.length);
      }

      // Assignment Submissions (dual lookup)
      const assignments = getMergedItems(userAssignmentsMap, studentId, studentUserId);
      const assignmentCount = assignments.length;

      // Proctoring Compliance & Violations calculated from attempt telemetry
      let violationCount = 0;
      attempts.forEach((a) => {
        if (a.tab_switch_count) violationCount += Number(a.tab_switch_count);
        if (Array.isArray(a.proctoring_flags)) {
          violationCount += a.proctoring_flags.length;
        } else if (a.proctoring_flags && typeof a.proctoring_flags === "object") {
          violationCount += Object.keys(a.proctoring_flags).length;
        }
      });
      const proctoringCompliance = violationCount > 0 ? Math.max(0, 100 - violationCount * 5) : 100;

      // Real Active Learning Time (from ActiveTimeService)
      const activeTimeMap = (allStudentsActiveTime || {}) as Record<string, any>;
      const activeData = activeTimeMap[studentId] || activeTimeMap[studentUserId];
      const activeTimeSeconds = activeData?.totalActiveSeconds || 0;
      const activeTimeFormatted = formatSeconds(activeTimeSeconds);

      // Last Activity Timestamp
      let latestTs = 0;
      codingSubs.forEach((s) => { if (s.timestamp > latestTs) latestTs = s.timestamp; });
      attempts.forEach((a) => { if (a.timestamp > latestTs) latestTs = a.timestamp; });
      assignments.forEach((asg) => { if (asg.timestamp > latestTs) latestTs = asg.timestamp; });
      enrollments.forEach((e) => {
        const eTs = new Date(e.updated_at || e.enrolled_at || 0).getTime();
        if (eTs > latestTs) latestTs = eTs;
      });

      const lastActivity =
        latestTs > 0
          ? new Date(latestTs).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "No recent activity";

      // Overall Performance Percentage (Weighted composite score: 40% assessments, 35% practice/coding, 25% course completion)
      const scoreComponents: { value: number; weight: number }[] = [];
      if (assessmentScore !== null) scoreComponents.push({ value: assessmentScore, weight: 0.4 });
      if (codingAccuracy !== null) scoreComponents.push({ value: codingAccuracy, weight: 0.35 });
      else if (practiceScore !== null) scoreComponents.push({ value: practiceScore, weight: 0.35 });

      if (enrolledCoursesCount > 0) {
        const courseRate = Math.round((completedCoursesCount / enrolledCoursesCount) * 100);
        scoreComponents.push({ value: courseRate, weight: 0.25 });
      }

      let overallPerformancePct: number | null = null;
      if (scoreComponents.length > 0) {
        const totalWeight = scoreComponents.reduce((acc, c) => acc + c.weight, 0);
        const weightedSum = scoreComponents.reduce((acc, c) => acc + c.value * c.weight, 0);
        overallPerformancePct = Math.round(weightedSum / totalWeight);
      } else if (avgScore !== null) {
        overallPerformancePct = avgScore;
      }

      // Qualitative Overall Status
      let overallStatus: StudentReportItem["overallStatus"] = "Inactive";
      if (studentStatus === "suspended") {
        overallStatus = "Needs Attention";
      } else if (overallPerformancePct !== null) {
        if (overallPerformancePct >= 85) overallStatus = "Excellent";
        else if (overallPerformancePct >= 70) overallStatus = "Good";
        else if (overallPerformancePct >= 50) overallStatus = "Average";
        else overallStatus = "Needs Attention";
      } else if (codingSubmissionsCount > 0 || enrolledCoursesCount > 0 || activeTimeSeconds > 300) {
        overallStatus = "Good";
      }

      // Formatted Student ID e.g. STID-001-05AUG2026
      const employeeId =
        (p as any).student_id ||
        formatStudentId(studentIndex + 1, p.created_at || new Date().toISOString());

      // Search Query Filter
      if (searchQuery) {
        const matchName = studentName.toLowerCase().includes(searchQuery);
        const matchEmail = studentEmail.toLowerCase().includes(searchQuery);
        const matchEmpId = employeeId.toLowerCase().includes(searchQuery);
        const matchBatch = assignedBatch.toLowerCase().includes(searchQuery);
        if (!matchName && !matchEmail && !matchEmpId && !matchBatch) {
          return;
        }
      }

      reportRows.push({
        id: studentId,
        studentUserId,
        employeeId,
        name: studentName,
        email: studentEmail,
        batch: assignedBatch,
        department: p.branch || p.college || "Engineering",
        status: studentStatus,
        joinedDate: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "2026-01-01",
        enrolledCoursesCount,
        completedCoursesCount,
        courseTitles,
        avgScore,
        practiceScore,
        practiceCount: practiceAttempts.length,
        codingAccuracy,
        codingSolvedCount,
        codingSubmissionsCount,
        assessmentScore,
        assessmentCount: examAttempts.length,
        assignmentCount,
        proctoringCompliance,
        violationCount,
        activeTimeSeconds,
        activeTimeFormatted,
        lastActivity,
        overallPerformancePct,
        overallStatus,
      });
    });

    // 12. Calculate Authoritative Summary Statistics across Filtered Dataset
    const totalStudents = reportRows.length;
    const activeStudents = reportRows.filter((r) => r.status === "active").length;
    const inactiveStudents = reportRows.filter((r) => r.status === "inactive" || r.status === "suspended").length;
    const flaggedStudents = reportRows.filter((r) => r.status === "flagged" || r.violationCount > 0).length;

    const scoredStudents = reportRows.filter((r) => r.avgScore !== null);
    const averageScore =
      scoredStudents.length > 0
        ? Math.round(scoredStudents.reduce((acc, r) => acc + r.avgScore!, 0) / scoredStudents.length)
        : 0;

    const practiceStudents = reportRows.filter((r) => r.practiceScore !== null);
    const averagePracticeScore =
      practiceStudents.length > 0
        ? Math.round(practiceStudents.reduce((acc, r) => acc + r.practiceScore!, 0) / practiceStudents.length)
        : 0;

    const codingStudents = reportRows.filter((r) => r.codingAccuracy !== null);
    const averageCodingAccuracy =
      codingStudents.length > 0
        ? Math.round(codingStudents.reduce((acc, r) => acc + r.codingAccuracy!, 0) / codingStudents.length)
        : 0;

    const examStudents = reportRows.filter((r) => r.assessmentScore !== null);
    const averageAssessmentScore =
      examStudents.length > 0
        ? Math.round(examStudents.reduce((acc, r) => acc + r.assessmentScore!, 0) / examStudents.length)
        : 0;

    const totalAssignmentsSubmitted = reportRows.reduce((acc, r) => acc + r.assignmentCount, 0);

    const averageProctoringCompliance =
      totalStudents > 0
        ? Math.round(reportRows.reduce((acc, r) => acc + r.proctoringCompliance, 0) / totalStudents)
        : 100;

    const totalViolationsLogged = reportRows.reduce((acc, r) => acc + r.violationCount, 0);

    const totalActiveTimeSeconds = reportRows.reduce((acc, r) => acc + r.activeTimeSeconds, 0);
    const totalActiveTimeFormatted = formatSeconds(totalActiveTimeSeconds);
    const avgActiveTimeSecs = totalStudents > 0 ? Math.round(totalActiveTimeSeconds / totalStudents) : 0;
    const averageActiveTimeFormatted = formatSeconds(avgActiveTimeSecs);

    const totalEnrolledAll = reportRows.reduce((acc, r) => acc + r.enrolledCoursesCount, 0);
    const totalCompletedAll = reportRows.reduce((acc, r) => acc + r.completedCoursesCount, 0);
    const courseCompletionRate =
      totalEnrolledAll > 0 ? Math.round((totalCompletedAll / totalEnrolledAll) * 100) : 0;

    const resolvedBatchTitle =
      reportType === "batch" && batchFilter !== "all"
        ? batchFilter
        : reportType === "batch"
        ? "Selected Batch"
        : null;

    const summary: ReportSummary = {
      scope: reportType === "batch" && resolvedBatchTitle ? `Batch: ${resolvedBatchTitle}` : "Overall",
      reportType,
      batchName: resolvedBatchTitle,
      totalStudents,
      activeStudents,
      inactiveStudents,
      flaggedStudents,
      averageScore,
      averagePracticeScore,
      averageCodingAccuracy,
      averageAssessmentScore,
      totalAssignmentsSubmitted,
      averageProctoringCompliance,
      totalViolationsLogged,
      totalActiveTimeSeconds,
      totalActiveTimeFormatted,
      averageActiveTimeFormatted,
      courseCompletionRate,
      generatedAt: new Date().toISOString(),
      generatedBy: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || user?.email || "Administrator",
      filtersApplied: {
        reportType,
        batch: batchFilter,
        status: statusFilter,
        dateRange,
        courseId: courseIdFilter,
        search: searchQuery,
      },
    };

    // 13. Group Report Rows by Batch for Batch-wise Analytics
    const batchGroupMap = new Map<string, StudentReportItem[]>();
    reportRows.forEach((r) => {
      const bNames = r.batch.split(",").map((s) => s.trim()).filter(Boolean);
      bNames.forEach((bName) => {
        const list = batchGroupMap.get(bName) || [];
        list.push(r);
        batchGroupMap.set(bName, list);
      });
    });

    const calculateBatchMetrics = (batchStudents: StudentReportItem[]) => {
      const bTotal = batchStudents.length;
      const bActive = batchStudents.filter((s) => s.status === "active").length;
      const bScored = batchStudents.filter((s) => s.avgScore !== null);
      const bAvgScore = bScored.length > 0 ? Math.round(bScored.reduce((acc, s) => acc + s.avgScore!, 0) / bScored.length) : 0;
      const bPractice = batchStudents.filter((s) => s.practiceScore !== null);
      const bAvgPractice = bPractice.length > 0 ? Math.round(bPractice.reduce((acc, s) => acc + s.practiceScore!, 0) / bPractice.length) : 0;
      const bCoding = batchStudents.filter((s) => s.codingAccuracy !== null);
      const bAvgCoding = bCoding.length > 0 ? Math.round(bCoding.reduce((acc, s) => acc + s.codingAccuracy!, 0) / bCoding.length) : 0;
      const bAssessment = batchStudents.filter((s) => s.assessmentScore !== null);
      const bAvgAssessment = bAssessment.length > 0 ? Math.round(bAssessment.reduce((acc, s) => acc + s.assessmentScore!, 0) / bAssessment.length) : 0;
      const bProctoring = bTotal > 0 ? Math.round(batchStudents.reduce((acc, s) => acc + s.proctoringCompliance, 0) / bTotal) : 100;
      const bViolations = batchStudents.reduce((acc, s) => acc + s.violationCount, 0);
      const bActiveTime = batchStudents.reduce((acc, s) => acc + s.activeTimeSeconds, 0);

      return {
        studentCount: bTotal,
        activeStudents: bActive,
        avgScore: bAvgScore,
        avgPracticeScore: bAvgPractice,
        avgCodingAccuracy: bAvgCoding,
        avgAssessmentScore: bAvgAssessment,
        avgProctoringCompliance: bProctoring,
        totalViolations: bViolations,
        totalActiveTimeSeconds: bActiveTime,
        totalActiveTimeFormatted: formatSeconds(bActiveTime),
      };
    };

    const batchesSummary: BatchReportItem[] = (allBatches || []).map((b: any) => {
      const bTitle = b.name || b.batch_name || `Batch #${b.id}`;
      const batchStudents = batchGroupMap.get(bTitle) || [];
      const metrics = calculateBatchMetrics(batchStudents);

      return {
        id: String(b.id),
        batchName: bTitle,
        collegeName: "",
        courseName: "",
        trainerName: "Assigned Trainer",
        ...metrics,
        students: batchStudents,
      };
    });

    // Also include any assigned batches discovered directly on student profiles
    batchGroupMap.forEach((batchStudents, bTitle) => {
      if (bTitle === "Unassigned") return;
      if (!batchesSummary.some((bs) => bs.batchName.toLowerCase() === bTitle.toLowerCase())) {
        const metrics = calculateBatchMetrics(batchStudents);

        batchesSummary.push({
          id: bTitle,
          batchName: bTitle,
          collegeName: "",
          courseName: "",
          trainerName: "Assigned Trainer",
          ...metrics,
          students: batchStudents,
        });
      }
    });

    // 14. Available Filter Metadata for Client Menus
    const availableBatchesList = Array.from(
      new Set(
        batchesSummary.map((b) => b.batchName).concat(
          (allBatches || []).map((b: any) => b.batch_name || b.name).filter(Boolean)
        )
      )
    );

    const availableCoursesList = (allCourses || []).map((c: any) => ({
      id: c.id,
      title: c.title,
    }));

    return NextResponse.json({
      success: true,
      summary,
      students: reportRows,
      batches: batchesSummary,
      metadata: {
        availableBatches: availableBatchesList,
        availableCourses: availableCoursesList,
        userRole: role,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/reports/student-performance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate student performance report." },
      { status: 500 }
    );
  }
}
