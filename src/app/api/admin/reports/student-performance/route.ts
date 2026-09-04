import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveTimeService } from "@/services/active-time.service";

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Role verification (Admin, Superadmin, Trainer)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, role, first_name, last_name, email")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const role = profile?.role || "student";
    if (role !== "admin" && role !== "superadmin" && role !== "trainer") {
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

    // 3. Trainer Batch Scoping: Trainers can only view batches they are assigned to
    let trainerAuthorizedBatchNames: string[] | null = null;
    let trainerAuthorizedBatchIds: string[] | null = null;

    if (role === "trainer") {
      const trainerName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim().toLowerCase();
      const trainerEmail = (profile?.email || user.email || "").toLowerCase();

      const { data: rawBatches } = await adminClient.from("batches").select("*");
      const assignedBatches = (rawBatches || []).filter((b: any) => {
        const bLead = (b.lead_trainer || b.trainer_name || "").toLowerCase();
        const bEmail = (b.trainer_email || "").toLowerCase();
        const bId = b.trainer_id || "";
        return (
          bId === user.id ||
          bId === profile?.id ||
          bEmail === trainerEmail ||
          (trainerName.length > 0 && bLead.includes(trainerName))
        );
      });

      trainerAuthorizedBatchIds = assignedBatches.map((b: any) => b.id);
      trainerAuthorizedBatchNames = assignedBatches.map((b: any) => (b.batch_name || b.name || "").toLowerCase());
    }

    // 4. Query All Student Profiles
    const { data: rawStudents, error: studentsErr } = await adminClient
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (studentsErr) throw studentsErr;

    // 5. Query Batches and Batch Memberships
    const { data: allBatches } = await adminClient.from("batches").select("*");
    const batchNameMap = new Map<string, string>();
    (allBatches || []).forEach((b: any) => {
      const title = b.batch_name || b.name || `Batch #${b.id}`;
      batchNameMap.set(b.id, title);
    });

    const { data: allBatchMembers } = await adminClient.from("batch_members").select("batch_id, user_id");
    const userBatchMap = new Map<string, string[]>();
    (allBatchMembers || []).forEach((bm: any) => {
      const list = userBatchMap.get(bm.user_id) || [];
      const bTitle = batchNameMap.get(bm.batch_id) || bm.batch_id;
      if (bTitle && !list.includes(bTitle)) {
        list.push(bTitle);
      }
      userBatchMap.set(bm.user_id, list);
    });

    // 6. Query Courses & Course Enrollments
    const { data: allCourses } = await adminClient.from("courses").select("id, title");
    const courseTitleMap = new Map<string, string>();
    (allCourses || []).forEach((c: any) => courseTitleMap.set(c.id, c.title));

    const { data: allEnrollments } = await adminClient.from("enrollments").select("*");
    const userEnrollmentsMap = new Map<string, any[]>();
    (allEnrollments || []).forEach((e: any) => {
      const uId = e.student_id || e.user_id;
      if (!uId) return;
      const list = userEnrollmentsMap.get(uId) || [];
      list.push(e);
      userEnrollmentsMap.set(uId, list);
    });

    // 7. Query Coding Submissions (filtered by date range)
    const { data: allCodingSubs } = await adminClient
      .from("coding_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    const userCodingMap = new Map<string, any[]>();
    (allCodingSubs || []).forEach((sub: any) => {
      const cStr = sub.submitted_at || sub.created_at;
      if (!cStr) return;
      const ts = new Date(cStr).getTime();
      if (ts < minTimestamp || ts > maxTimestamp) return;

      const uId = sub.student_id || sub.user_id;
      if (!uId) return;
      const list = userCodingMap.get(uId) || [];
      list.push({ ...sub, timestamp: ts });
      userCodingMap.set(uId, list);
    });

    // 8. Query Assessment & Test Attempts (filtered by date range)
    const { data: allAttempts } = await adminClient
      .from("assessment_attempts")
      .select("*")
      .order("submitted_at", { ascending: false });

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

    // 9. Query Assignment Submissions (filtered by date range)
    const { data: allAssignments } = await adminClient
      .from("assignment_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });

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

    // 10. Query Live Class Attendance (filtered by date range)
    let allLiveAttendance: any[] = [];
    try {
      const { data: rawLiveAtt } = await adminClient.from("live_class_attendance").select("*");
      allLiveAttendance = rawLiveAtt || [];
    } catch {}

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

    // 11. Process & Aggregate Each Student (GUARANTEE: Exactly 1 record per student, NO duplicates)
    const reportRows: StudentReportItem[] = [];

    (rawStudents || []).forEach((p: any) => {
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
        assignedBatch = membershipBatches.join(", ");
      } else if (p.batch_id && batchNameMap.has(p.batch_id)) {
        assignedBatch = batchNameMap.get(p.batch_id)!;
      }

      // Trainer authorization check
      if (role === "trainer" && trainerAuthorizedBatchNames) {
        const studentBatchLower = assignedBatch.toLowerCase();
        const hasAuth = trainerAuthorizedBatchNames.some(
          (b) => studentBatchLower.includes(b) || (b.length > 0 && b === studentBatchLower)
        );
        if (!hasAuth) return; // Skip students outside trainer's batches
      }

      // Apply Batch Filter (Overall vs. Batch Report)
      const isBatchMode = reportType === "batch" || (batchFilter !== "all" && batchFilter !== "");
      if (isBatchMode) {
        const targetBatch = (reportType === "batch" && batchFilter !== "all" ? batchFilter : batchFilter).toLowerCase();
        if (targetBatch && targetBatch !== "all") {
          const sBatchLower = assignedBatch.toLowerCase();
          if (!sBatchLower.includes(targetBatch)) {
            return; // Skip student not in selected batch
          }
        }
      }

      // Apply Status Filter
      const studentStatus = (p.status || "active").toLowerCase() as StudentReportItem["status"];
      if (statusFilter !== "all" && studentStatus !== statusFilter.toLowerCase()) {
        return;
      }

      // Course Enrollments
      const enrollments = [
        ...(userEnrollmentsMap.get(studentId) || []),
        ...(userEnrollmentsMap.get(studentUserId) || []),
      ];
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

      // Coding Submissions
      const codingSubs = [
        ...(userCodingMap.get(studentId) || []),
        ...(userCodingMap.get(studentUserId) || []),
      ];
      const codingSubmissionsCount = codingSubs.length;
      const acceptedCodingSubs = codingSubs.filter(
        (s) => s.status === "accepted" || s.status === "passed"
      );
      const codingSolvedCount = acceptedCodingSubs.length;
      const codingAccuracy =
        codingSubmissionsCount > 0
          ? Math.round((codingSolvedCount / codingSubmissionsCount) * 100)
          : null;

      // Assessments & Practice Attempts
      const attempts = [
        ...(userAttemptsMap.get(studentId) || []),
        ...(userAttemptsMap.get(studentUserId) || []),
      ];

      const practiceAttempts = attempts.filter((a) => a.is_practice === true || a.type === "practice");
      const examAttempts = attempts.filter((a) => a.is_practice !== true && a.type !== "practice");

      let practiceScore: number | null = null;
      if (practiceAttempts.length > 0) {
        const sumPractice = practiceAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
        practiceScore = Math.round(sumPractice / practiceAttempts.length);
      }

      let assessmentScore: number | null = null;
      if (examAttempts.length > 0) {
        const sumExam = examAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
        assessmentScore = Math.round(sumExam / examAttempts.length);
      }

      // Average score overall across all evaluations
      let avgScore: number | null = null;
      if (attempts.length > 0) {
        const sumAll = attempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
        avgScore = Math.round(sumAll / attempts.length);
      } else if (p.avg_score !== undefined && p.avg_score !== null && p.avg_score > 0) {
        avgScore = Math.round(p.avg_score);
      }

      // Assignment Submissions
      const assignments = [
        ...(userAssignmentsMap.get(studentId) || []),
        ...(userAssignmentsMap.get(studentUserId) || []),
      ];
      const assignmentCount = assignments.length;

      // Proctoring Compliance & Violations
      let proctoringCompliance = p.proctoring_compliance ?? 100;
      let violationCount = p.violation_count ?? 0;
      attempts.forEach((a) => {
        if (a.violations) violationCount += Number(a.violations);
        if (a.tab_switches) violationCount += Number(a.tab_switches);
      });
      if (violationCount > 0) {
        proctoringCompliance = Math.max(0, 100 - violationCount * 5);
      }

      // Real Active Learning Time (from ActiveTimeService)
      const activeData = ActiveTimeService.getStudentActiveTime(studentId);
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
          : p.last_sign_in_at
          ? new Date(p.last_sign_in_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "No recent activity";

      // Overall Performance Percentage (Weighted composite score: 40% assessments, 35% practice/coding, 25% course completion)
      let scoreComponents: { value: number; weight: number }[] = [];
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

      // Search Query Filter
      if (searchQuery) {
        const matchName = studentName.toLowerCase().includes(searchQuery);
        const matchEmail = studentEmail.toLowerCase().includes(searchQuery);
        const matchEmpId = (p.employee_id || "").toLowerCase().includes(searchQuery);
        const matchBatch = assignedBatch.toLowerCase().includes(searchQuery);
        if (!matchName && !matchEmail && !matchEmpId && !matchBatch) {
          return;
        }
      }

      reportRows.push({
        id: studentId,
        studentUserId,
        employeeId: p.employee_id || `STU-${studentId.slice(0, 5).toUpperCase()}`,
        name: studentName,
        email: studentEmail,
        batch: assignedBatch,
        department: p.department || "Engineering",
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
      generatedBy: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || user.email || "Administrator",
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
        collegeName: b.college_name || "",
        courseName: b.course_name || "",
        trainerName: b.lead_trainer || b.trainer_name || "Unassigned",
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
          trainerName: "Unassigned",
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
