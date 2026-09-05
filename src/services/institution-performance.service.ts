import { createAdminClient } from "@/lib/supabase/admin";
import { formatStudentId } from "@/services/student-id.service";
import { ActiveTimeService } from "@/services/active-time.service";

export interface InstitutionBatchItem {
  id: string;
  name: string;
  batchName: string;
  code: string;
  trainerName: string;
  startDate: string;
  studentCount: number;
  status: string;
  createdAt: string;
}

export interface StudentBatchPerformanceRow {
  studentId: string; // Database UUID
  employeeId: string; // Official Student ID e.g. STID-001-05AUG2026
  studentName: string;
  email: string;
  learning: number | null; // Course progress %
  skillLab: number | null; // Practice track %
  codeLab: number | null; // Coding accuracy %
  assess: number | null; // Assessment score %
  overall: number | null; // Composite score %
  progress: number | null; // Overall learning progress %
  status: "Excellent" | "Good" | "Average" | "Needs Attention" | "Inactive";
  accountStatus: string;
  enrolledCoursesCount: number;
  codingSolvedCount: number;
  assessmentCount: number;
  lastActivity: string;
}

export interface StudentDetailedPerformance {
  studentId: string;
  employeeId: string;
  studentName: string;
  email: string;
  batchId: string;
  batchName: string;
  joinedDate: string;
  accountStatus: string;
  overall: number | null;
  overallStatus: "Excellent" | "Good" | "Average" | "Needs Attention" | "Inactive";
  learning: number | null;
  skillLab: number | null;
  codeLab: number | null;
  assess: number | null;
  attendance: {
    attendedCount: number;
    totalClasses: number;
    rate: number | null;
  };
  activity: {
    activeTimeSeconds: number;
    activeTimeFormatted: string;
    lastActivity: string;
  };
  courses: {
    id: string;
    title: string;
    progress: number;
    status: string;
  }[];
  recentAssessments: {
    id: string;
    title: string;
    score: number;
    totalMarks: number;
    percentage: number;
    submittedAt: string;
  }[];
  recentCoding: {
    id: string;
    problemId: string;
    language: string;
    status: string;
    passedTestCases: number;
    totalTestCases: number;
    submittedAt: string;
  }[];
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

export class InstitutionPerformanceService {
  /**
   * Resolves the authenticated user's institution details.
   */
  static async resolveInstitution(userId: string, role: string): Promise<{
    institutionId: string;
    name: string;
    code: string;
    email: string;
    phone: string;
    address: string;
    college: string;
    isPlatformAdmin: boolean;
  }> {
    const adminClient = createAdminClient();
    const isPlatformAdmin = role === "admin" || role === "super_admin";

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, user_id, email, first_name, last_name, college, branch, phone, bio, role")
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    const collegeName = profile?.college?.trim() || "";
    const name = collegeName || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "Institution Partner");
    const code = profile?.branch?.trim() || (profile?.id ? `INST-${profile.id.slice(0, 6).toUpperCase()}` : "INST-001");
    const email = profile?.email || "";
    const phone = profile?.phone || "";
    const address = profile?.bio || "";

    return {
      institutionId: profile?.id || userId,
      name,
      code,
      email,
      phone,
      address,
      college: collegeName,
      isPlatformAdmin,
    };
  }

  /**
   * Fetches only batches assigned to this institution.
   */
  static async getAssignedBatches(institutionInfo: {
    institutionId: string;
    college: string;
    code: string;
    isPlatformAdmin: boolean;
  }): Promise<InstitutionBatchItem[]> {
    const adminClient = createAdminClient();

    // 1. Query all batches
    const { data: batchesData, error: bErr } = await adminClient
      .from("batches")
      .select("id, name, batch_name, code, description, trainer_id, start_date, status, created_at")
      .order("created_at", { ascending: false });

    if (bErr || !batchesData) {
      return [];
    }

    // 2. Query batch_members mapping
    const { data: batchMembersData } = await adminClient
      .from("batch_members")
      .select("batch_id, user_id");

    const batchStudentSet = new Map<string, Set<string>>();
    (batchMembersData || []).forEach((bm: any) => {
      const set = batchStudentSet.get(bm.batch_id) || new Set<string>();
      set.add(bm.user_id);
      batchStudentSet.set(bm.batch_id, set);
    });

    // Also include profiles.batch_id mapping
    const { data: studentProfiles } = await adminClient
      .from("profiles")
      .select("id, user_id, batch_id, college")
      .eq("role", "student");

    const collegeStudentIds = new Set<string>();
    (studentProfiles || []).forEach((sp: any) => {
      if (sp.batch_id) {
        const set = batchStudentSet.get(sp.batch_id) || new Set<string>();
        set.add(sp.id);
        if (sp.user_id) set.add(sp.user_id);
        batchStudentSet.set(sp.batch_id, set);
      }
      if (institutionInfo.college && sp.college && sp.college.toLowerCase() === institutionInfo.college.toLowerCase()) {
        collegeStudentIds.add(sp.id);
        if (sp.user_id) collegeStudentIds.add(sp.user_id);
      }
    });

    // 3. Fetch trainer names
    const { data: trainersData } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("role", "trainer");

    const trainerMap = new Map<string, string>();
    (trainersData || []).forEach((t: any) => {
      const tName = `${t.first_name || ""} ${t.last_name || ""}`.trim() || t.email?.split("@")[0] || "Lead Trainer";
      trainerMap.set(t.id, tName);
    });

    // 4. Try querying institution_batches table if it exists
    let mappedBatchIdsFromTable = new Set<string>();
    try {
      const { data: ibData } = await adminClient
        .from("institution_batches")
        .select("batch_id")
        .eq("institution_id", institutionInfo.institutionId);

      if (ibData && ibData.length > 0) {
        ibData.forEach((r: any) => mappedBatchIdsFromTable.add(r.batch_id));
      }
    } catch {
      // Table may not exist yet, fallback to college & code matching
    }

    // Filter batches strictly for this institution
    const assigned = batchesData.filter((b: any) => {
      if (institutionInfo.isPlatformAdmin) return true; // Platform admin sees all batches

      // A. Direct link via institution_batches table
      if (mappedBatchIdsFromTable.has(b.id)) return true;

      // B. Batch code matches institution code prefix
      if (institutionInfo.code && b.code && b.code.toUpperCase().includes(institutionInfo.code.toUpperCase())) {
        return true;
      }

      // C. Batch description matches institution name or code
      const desc = (b.description || "").toLowerCase();
      if (institutionInfo.college && desc.includes(institutionInfo.college.toLowerCase())) {
        return true;
      }

      // D. Batch contains students belonging to this institution's college
      if (collegeStudentIds.size > 0) {
        const studentsInBatch = batchStudentSet.get(b.id);
        if (studentsInBatch) {
          for (const sId of studentsInBatch) {
            if (collegeStudentIds.has(sId)) return true;
          }
        }
      }

      return false;
    });

    return assigned.map((b: any) => {
      const studentSet = batchStudentSet.get(b.id) || new Set<string>();
      return {
        id: b.id,
        name: b.name || b.batch_name || "Untitled Batch",
        batchName: b.name || b.batch_name || "Untitled Batch",
        code: b.code || `B-${b.id.slice(0, 6).toUpperCase()}`,
        trainerName: b.trainer_id ? trainerMap.get(b.trainer_id) || "Lead Trainer" : "Unassigned",
        startDate: b.start_date ? new Date(b.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not specified",
        studentCount: studentSet.size,
        status: b.status || "active",
        createdAt: b.created_at || new Date().toISOString(),
      };
    });
  }

  /**
   * Verifies if a batch belongs to the authenticated institution.
   */
  static async verifyBatchAccess(batchId: string, institutionInfo: {
    institutionId: string;
    college: string;
    code: string;
    isPlatformAdmin: boolean;
  }): Promise<boolean> {
    if (institutionInfo.isPlatformAdmin) return true;
    const assignedBatches = await this.getAssignedBatches(institutionInfo);
    return assignedBatches.some((b) => b.id === batchId);
  }

  /**
   * Verifies if a student belongs to one of the Institution's assigned batches.
   */
  static async verifyStudentAccess(studentId: string, institutionInfo: {
    institutionId: string;
    college: string;
    code: string;
    isPlatformAdmin: boolean;
  }): Promise<boolean> {
    if (institutionInfo.isPlatformAdmin) return true;
    const assignedBatches = await this.getAssignedBatches(institutionInfo);
    const assignedBatchIds = new Set(assignedBatches.map((b) => b.id));

    if (assignedBatchIds.size === 0) return false;

    const adminClient = createAdminClient();
    // Check batch_members
    const { data: bm } = await adminClient
      .from("batch_members")
      .select("batch_id")
      .eq("user_id", studentId);

    if (bm && bm.some((m: any) => assignedBatchIds.has(m.batch_id))) {
      return true;
    }

    // Check profiles.batch_id
    const { data: profile } = await adminClient
      .from("profiles")
      .select("batch_id, college")
      .or(`id.eq.${studentId},user_id.eq.${studentId}`)
      .maybeSingle();

    if (profile?.batch_id && assignedBatchIds.has(profile.batch_id)) {
      return true;
    }

    // Check if college matches
    if (institutionInfo.college && profile?.college && profile.college.toLowerCase() === institutionInfo.college.toLowerCase()) {
      return true;
    }

    return false;
  }

  /**
   * Authoritative calculation of Batch Performance for all students in a batch.
   */
  static async getBatchPerformance(batchId: string, searchQuery?: string): Promise<{
    batch: { id: string; name: string; code: string; studentCount: number };
    students: StudentBatchPerformanceRow[];
  }> {
    const adminClient = createAdminClient();

    // 1. Fetch batch metadata
    const { data: batchData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, code")
      .eq("id", batchId)
      .maybeSingle();

    const batchName = batchData?.name || batchData?.batch_name || `Batch #${batchId.slice(0, 6)}`;
    const batchCode = batchData?.code || `B-${batchId.slice(0, 6).toUpperCase()}`;

    // 2. Fetch all student IDs for this batch
    const { data: members } = await adminClient
      .from("batch_members")
      .select("user_id")
      .eq("batch_id", batchId);

    const { data: directProfiles } = await adminClient
      .from("profiles")
      .select("id, user_id")
      .eq("batch_id", batchId);

    const studentIdSet = new Set<string>();
    (members || []).forEach((m: any) => { if (m.user_id) studentIdSet.add(m.user_id); });
    (directProfiles || []).forEach((p: any) => {
      if (p.id) studentIdSet.add(p.id);
      if (p.user_id) studentIdSet.add(p.user_id);
    });

    if (studentIdSet.size === 0) {
      return {
        batch: { id: batchId, name: batchName, code: batchCode, studentCount: 0 },
        students: [],
      };
    }

    const studentIds = Array.from(studentIdSet);

    // 3. Concurrently query real database datasets in parallel
    const [
      profilesRes,
      enrollmentsRes,
      codingSubsRes,
      attemptsRes,
      assessmentsRes,
      activeTimeMap,
    ] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, role, status, created_at")
        .in("id", studentIds),
      adminClient
        .from("enrollments")
        .select("id, student_id, course_id, status, progress_percentage, completed_at, enrolled_at")
        .in("student_id", studentIds),
      adminClient
        .from("coding_submissions")
        .select("id, problem_id, student_id, status, passed_test_cases, total_test_cases, created_at")
        .in("student_id", studentIds),
      adminClient
        .from("assessment_attempts")
        .select("id, assessment_id, student_id, status, score, total_marks, percentage, submitted_at, created_at")
        .in("student_id", studentIds),
      adminClient
        .from("assessments")
        .select("id, title, type, total_marks"),
      ActiveTimeService.getAllStudentsActiveTime().catch(() => ({})),
    ]);

    const studentProfiles = profilesRes?.data || [];
    const allEnrollments = enrollmentsRes?.data || [];
    const allCodingSubs = codingSubsRes?.data || [];
    const allAttempts = attemptsRes?.data || [];
    const allAssessments = assessmentsRes?.data || [];

    const assessmentMetaMap = new Map<string, any>();
    allAssessments.forEach((a: any) => assessmentMetaMap.set(a.id, a));

    // Map enrollments by student
    const enrollmentsByStudent = new Map<string, any[]>();
    allEnrollments.forEach((e: any) => {
      const sId = e.student_id;
      const list = enrollmentsByStudent.get(sId) || [];
      list.push(e);
      enrollmentsByStudent.set(sId, list);
    });

    // Map coding submissions by student
    const codingByStudent = new Map<string, any[]>();
    allCodingSubs.forEach((cs: any) => {
      const sId = cs.student_id;
      const list = codingByStudent.get(sId) || [];
      list.push(cs);
      codingByStudent.set(sId, list);
    });

    // Map assessment attempts by student
    const attemptsByStudent = new Map<string, any[]>();
    allAttempts.forEach((att: any) => {
      const sId = att.student_id;
      const list = attemptsByStudent.get(sId) || [];
      list.push(att);
      attemptsByStudent.set(sId, list);
    });

    // 4. Compute performance for each student
    const rows: StudentBatchPerformanceRow[] = [];

    studentProfiles.forEach((p: any, idx: number) => {
      const sId = p.id;
      const sUserId = p.user_id || p.id;
      const studentName = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email?.split("@")[0] || "Student";
      const email = p.email || "";

      // Check search filter if provided
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const employeeIdTmp = formatStudentId(idx + 1, p.created_at || new Date().toISOString());
        const matchName = studentName.toLowerCase().includes(q);
        const matchEmail = email.toLowerCase().includes(q);
        const matchId = employeeIdTmp.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId) {
          return;
        }
      }

      // Merge multi-id lookups
      const enrollments = [
        ...(enrollmentsByStudent.get(sId) || []),
        ...(sUserId !== sId ? (enrollmentsByStudent.get(sUserId) || []) : []),
      ];

      const codingSubs = [
        ...(codingByStudent.get(sId) || []),
        ...(sUserId !== sId ? (codingByStudent.get(sUserId) || []) : []),
      ];

      const attempts = [
        ...(attemptsByStudent.get(sId) || []),
        ...(sUserId !== sId ? (attemptsByStudent.get(sUserId) || []) : []),
      ];

      // A. Learning (Course Progress & Completion)
      let learningScore: number | null = null;
      let progressPct: number | null = null;
      const enrolledCoursesCount = enrollments.length;
      if (enrolledCoursesCount > 0) {
        const completedCourses = enrollments.filter(
          (e) => e.status === "completed" || e.progress_percentage === 100 || e.completed_at
        ).length;
        learningScore = Math.round((completedCourses / enrolledCoursesCount) * 100);

        const totalProgress = enrollments.reduce((acc, e) => acc + (Number(e.progress_percentage) || 0), 0);
        progressPct = Math.round(totalProgress / enrolledCoursesCount);
      }

      // B. Code Lab (Accuracy & Solved Count)
      let codeLabScore: number | null = null;
      const codingSubmissionsCount = codingSubs.length;
      const acceptedSubs = codingSubs.filter(
        (s) =>
          s.status === "accepted" ||
          s.status === "passed" ||
          (s.total_test_cases > 0 && s.passed_test_cases === s.total_test_cases)
      );
      const codingSolvedCount = acceptedSubs.length;
      if (codingSubmissionsCount > 0) {
        codeLabScore = Math.round((codingSolvedCount / codingSubmissionsCount) * 100);
      }

      // C. Skill Lab & Assess
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

      let skillLabScore: number | null = null;
      if (practiceAttempts.length > 0) {
        const sumPractice = practiceAttempts.reduce((acc, a) => acc + getAttemptPct(a), 0);
        skillLabScore = Math.round(sumPractice / practiceAttempts.length);
      }

      let assessScore: number | null = null;
      if (examAttempts.length > 0) {
        const sumExam = examAttempts.reduce((acc, a) => acc + getAttemptPct(a), 0);
        assessScore = Math.round(sumExam / examAttempts.length);
      }

      // D. Authoritative Overall Weighted Score
      // 40% assess, 35% coding/skill, 25% learning
      const scoreComponents: { value: number; weight: number }[] = [];
      if (assessScore !== null) scoreComponents.push({ value: assessScore, weight: 0.4 });
      if (codeLabScore !== null) scoreComponents.push({ value: codeLabScore, weight: 0.35 });
      else if (skillLabScore !== null) scoreComponents.push({ value: skillLabScore, weight: 0.35 });
      if (learningScore !== null) scoreComponents.push({ value: learningScore, weight: 0.25 });

      let overallScore: number | null = null;
      if (scoreComponents.length > 0) {
        const totalWeight = scoreComponents.reduce((acc, c) => acc + c.weight, 0);
        const weightedSum = scoreComponents.reduce((acc, c) => acc + c.value * c.weight, 0);
        overallScore = Math.round(weightedSum / totalWeight);
      }

      // E. Qualitative Status
      const studentAccountStatus = p.status || "active";
      let overallStatus: StudentBatchPerformanceRow["status"] = "Inactive";
      if (studentAccountStatus === "suspended") {
        overallStatus = "Needs Attention";
      } else if (overallScore !== null) {
        if (overallScore >= 85) overallStatus = "Excellent";
        else if (overallScore >= 70) overallStatus = "Good";
        else if (overallScore >= 50) overallStatus = "Average";
        else overallStatus = "Needs Attention";
      } else if (codingSubmissionsCount > 0 || enrolledCoursesCount > 0) {
        overallStatus = "Good";
      }

      // Formatted Student ID
      const employeeId = (p as any).student_id || formatStudentId(idx + 1, p.created_at || new Date().toISOString());

      // Last activity
      let latestTs = 0;
      codingSubs.forEach((s) => {
        const ts = new Date(s.created_at || 0).getTime();
        if (ts > latestTs) latestTs = ts;
      });
      attempts.forEach((a) => {
        const ts = new Date(a.submitted_at || a.created_at || 0).getTime();
        if (ts > latestTs) latestTs = ts;
      });
      enrollments.forEach((e) => {
        const ts = new Date(e.enrolled_at || 0).getTime();
        if (ts > latestTs) latestTs = ts;
      });

      const lastActivity = latestTs > 0
        ? new Date(latestTs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "No recent activity";

      rows.push({
        studentId: sId,
        employeeId,
        studentName,
        email,
        learning: learningScore,
        skillLab: skillLabScore,
        codeLab: codeLabScore,
        assess: assessScore,
        overall: overallScore,
        progress: progressPct,
        status: overallStatus,
        accountStatus: studentAccountStatus,
        enrolledCoursesCount,
        codingSolvedCount,
        assessmentCount: examAttempts.length,
        lastActivity,
      });
    });

    return {
      batch: { id: batchId, name: batchName, code: batchCode, studentCount: rows.length },
      students: rows,
    };
  }

  /**
   * Authoritative detailed performance for an individual student.
   */
  static async getIndividualStudentPerformance(studentId: string): Promise<StudentDetailedPerformance | null> {
    const adminClient = createAdminClient();

    // 1. Fetch student profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, user_id, email, first_name, last_name, role, status, batch_id, batch_name, created_at")
      .or(`id.eq.${studentId},user_id.eq.${studentId}`)
      .maybeSingle();

    if (!profile) {
      return null;
    }

    const sId = profile.id;
    const sUserId = profile.user_id || profile.id;
    const studentName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email?.split("@")[0] || "Student";
    const email = profile.email || "";

    // 2. Fetch batch info
    let batchId = profile.batch_id || "";
    let batchName = profile.batch_name || "";

    if (!batchId) {
      const { data: bm } = await adminClient
        .from("batch_members")
        .select("batch_id")
        .eq("user_id", sId)
        .limit(1)
        .maybeSingle();
      if (bm) batchId = bm.batch_id;
    }

    if (batchId && !batchName) {
      const { data: b } = await adminClient
        .from("batches")
        .select("name, batch_name")
        .eq("id", batchId)
        .maybeSingle();
      batchName = b?.name || b?.batch_name || `Batch #${batchId.slice(0, 6)}`;
    }

    // 3. Parallel fetch of student records
    const [
      enrollmentsRes,
      coursesRes,
      codingSubsRes,
      attemptsRes,
      assessmentsRes,
      liveAttRes,
      activeTimeMap,
    ] = await Promise.all([
      adminClient
        .from("enrollments")
        .select("id, course_id, status, progress_percentage, completed_at, enrolled_at")
        .or(`student_id.eq.${sId},student_id.eq.${sUserId}`),
      adminClient.from("courses").select("id, title"),
      adminClient
        .from("coding_submissions")
        .select("id, problem_id, language, status, passed_test_cases, total_test_cases, created_at")
        .or(`student_id.eq.${sId},student_id.eq.${sUserId}`)
        .order("created_at", { ascending: false })
        .limit(20),
      adminClient
        .from("assessment_attempts")
        .select("id, assessment_id, status, score, total_marks, percentage, submitted_at, created_at")
        .or(`student_id.eq.${sId},student_id.eq.${sUserId}`)
        .order("submitted_at", { ascending: false })
        .limit(20),
      adminClient.from("assessments").select("id, title, type, total_marks"),
      adminClient
        .from("live_class_attendance")
        .select("id, attendance_status, duration_seconds, joined_at")
        .or(`student_id.eq.${sId},student_id.eq.${sUserId}`),
      ActiveTimeService.getAllStudentsActiveTime().catch(() => ({})),
    ]);

    const enrollments = enrollmentsRes?.data || [];
    const courses = coursesRes?.data || [];
    const codingSubs = codingSubsRes?.data || [];
    const attempts = attemptsRes?.data || [];
    const assessments = assessmentsRes?.data || [];
    const liveAttendance = liveAttRes?.data || [];

    const courseMap = new Map<string, string>();
    courses.forEach((c: any) => courseMap.set(c.id, c.title));

    const assessMap = new Map<string, any>();
    assessments.forEach((a: any) => assessMap.set(a.id, a));

    // Learning
    let learningScore: number | null = null;
    if (enrollments.length > 0) {
      const completed = enrollments.filter((e) => e.status === "completed" || e.progress_percentage === 100).length;
      learningScore = Math.round((completed / enrollments.length) * 100);
    }

    // Code Lab
    let codeLabScore: number | null = null;
    if (codingSubs.length > 0) {
      const accepted = codingSubs.filter(
        (s) => s.status === "accepted" || s.status === "passed" || (s.total_test_cases > 0 && s.passed_test_cases === s.total_test_cases)
      ).length;
      codeLabScore = Math.round((accepted / codingSubs.length) * 100);
    }

    // Skill Lab & Assess
    const practiceAttempts = attempts.filter((a: any) => {
      const meta = a.assessment_id ? assessMap.get(a.assessment_id) : null;
      return a.is_practice === true || a.status === "practice" || meta?.type === "practice";
    });
    const examAttempts = attempts.filter((a: any) => {
      const meta = a.assessment_id ? assessMap.get(a.assessment_id) : null;
      return a.is_practice !== true && a.status !== "practice" && meta?.type !== "practice";
    });

    const getAttemptPct = (a: any): number => {
      if (a.percentage !== null && a.percentage !== undefined) return Number(a.percentage);
      if (a.total_marks && Number(a.total_marks) > 0) return Math.round((Number(a.score || 0) / Number(a.total_marks)) * 100);
      return Number(a.score) || 0;
    };

    let skillLabScore: number | null = null;
    if (practiceAttempts.length > 0) {
      const sum = practiceAttempts.reduce((acc, a) => acc + getAttemptPct(a), 0);
      skillLabScore = Math.round(sum / practiceAttempts.length);
    }

    let assessScore: number | null = null;
    if (examAttempts.length > 0) {
      const sum = examAttempts.reduce((acc, a) => acc + getAttemptPct(a), 0);
      assessScore = Math.round(sum / examAttempts.length);
    }

    // Overall Score
    const scoreComponents: { value: number; weight: number }[] = [];
    if (assessScore !== null) scoreComponents.push({ value: assessScore, weight: 0.4 });
    if (codeLabScore !== null) scoreComponents.push({ value: codeLabScore, weight: 0.35 });
    else if (skillLabScore !== null) scoreComponents.push({ value: skillLabScore, weight: 0.35 });
    if (learningScore !== null) scoreComponents.push({ value: learningScore, weight: 0.25 });

    let overallScore: number | null = null;
    if (scoreComponents.length > 0) {
      const totalWeight = scoreComponents.reduce((acc, c) => acc + c.weight, 0);
      const weightedSum = scoreComponents.reduce((acc, c) => acc + c.value * c.weight, 0);
      overallScore = Math.round(weightedSum / totalWeight);
    }

    let overallStatus: StudentDetailedPerformance["overallStatus"] = "Inactive";
    if (profile.status === "suspended") {
      overallStatus = "Needs Attention";
    } else if (overallScore !== null) {
      if (overallScore >= 85) overallStatus = "Excellent";
      else if (overallScore >= 70) overallStatus = "Good";
      else if (overallScore >= 50) overallStatus = "Average";
      else overallStatus = "Needs Attention";
    } else if (codingSubs.length > 0 || enrollments.length > 0) {
      overallStatus = "Good";
    }

    // Attendance
    const attendedCount = liveAttendance.filter((l) => l.attendance_status === "present" || (l.duration_seconds && l.duration_seconds > 60)).length;
    const totalClasses = liveAttendance.length;
    const attendanceRate = totalClasses > 0 ? Math.round((attendedCount / totalClasses) * 100) : null;

    // Active Time
    const activeMap = (activeTimeMap || {}) as Record<string, any>;
    const studentActive = activeMap[sId] || activeMap[sUserId];
    const activeSeconds = studentActive?.totalActiveSeconds || 0;
    const activeFormatted = formatSeconds(activeSeconds);

    let latestTs = 0;
    codingSubs.forEach((s) => {
      const ts = new Date(s.created_at || 0).getTime();
      if (ts > latestTs) latestTs = ts;
    });
    attempts.forEach((a) => {
      const ts = new Date(a.submitted_at || a.created_at || 0).getTime();
      if (ts > latestTs) latestTs = ts;
    });

    const lastActivity = latestTs > 0
      ? new Date(latestTs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "No recent activity";

    const employeeId = (profile as any).student_id || formatStudentId(1, profile.created_at || new Date().toISOString());

    return {
      studentId: sId,
      employeeId,
      studentName,
      email,
      batchId: batchId || "unassigned",
      batchName: batchName || "Unassigned",
      joinedDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not available",
      accountStatus: profile.status || "active",
      overall: overallScore,
      overallStatus,
      learning: learningScore,
      skillLab: skillLabScore,
      codeLab: codeLabScore,
      assess: assessScore,
      attendance: {
        attendedCount,
        totalClasses,
        rate: attendanceRate,
      },
      activity: {
        activeTimeSeconds: activeSeconds,
        activeTimeFormatted: activeFormatted,
        lastActivity,
      },
      courses: enrollments.map((e) => ({
        id: e.course_id,
        title: courseMap.get(e.course_id) || "Enrolled Course",
        progress: Number(e.progress_percentage) || 0,
        status: e.status || "enrolled",
      })),
      recentAssessments: examAttempts.slice(0, 5).map((a) => {
        const meta = assessMap.get(a.assessment_id);
        const tMarks = Number(a.total_marks || meta?.total_marks || 100);
        const pct = getAttemptPct(a);
        return {
          id: a.id,
          title: meta?.title || "Assessment Evaluation",
          score: Number(a.score || 0),
          totalMarks: tMarks,
          percentage: pct,
          submittedAt: a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Submitted",
        };
      }),
      recentCoding: codingSubs.slice(0, 5).map((c) => ({
        id: c.id,
        problemId: c.problem_id,
        language: c.language || "code",
        status: c.status || "submitted",
        passedTestCases: Number(c.passed_test_cases || 0),
        totalTestCases: Number(c.total_test_cases || 0),
        submittedAt: c.created_at ? new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Submitted",
      })),
    };
  }

  /**
   * Aggregated Executive Overview for all assigned batches of an institution.
   */
  static async getOverviewMetrics(institutionInfo: {
    institutionId: string;
    college: string;
    code: string;
    isPlatformAdmin: boolean;
  }): Promise<{
    totalBatches: number;
    totalStudents: number;
    averagePerformance: number | null;
    activeLearnerRate: number | null;
    batches: InstitutionBatchItem[];
  }> {
    const batches = await this.getAssignedBatches(institutionInfo);
    if (batches.length === 0) {
      return {
        totalBatches: 0,
        totalStudents: 0,
        averagePerformance: null,
        activeLearnerRate: null,
        batches: [],
      };
    }

    let totalStudents = 0;
    const allPerfRows: StudentBatchPerformanceRow[] = [];

    for (const b of batches) {
      const { students } = await this.getBatchPerformance(b.id);
      totalStudents += students.length;
      allPerfRows.push(...students);
    }

    const studentsWithPerf = allPerfRows.filter((s) => s.overall !== null);
    const avgPerf = studentsWithPerf.length > 0
      ? Math.round(studentsWithPerf.reduce((acc, s) => acc + (s.overall || 0), 0) / studentsWithPerf.length)
      : null;

    const activeStudents = allPerfRows.filter((s) => s.status !== "Inactive").length;
    const activeRate = allPerfRows.length > 0 ? Math.round((activeStudents / allPerfRows.length) * 100) : null;

    return {
      totalBatches: batches.length,
      totalStudents,
      averagePerformance: avgPerf,
      activeLearnerRate: activeRate,
      batches,
    };
  }
}
