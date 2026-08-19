import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    // 1. Fetch attempts for this assessment
    const { data: attempts, error: attemptsError } = await adminClient
      .from("assessment_attempts")
      .select("*")
      .eq("assessment_id", id)
      .order("created_at", { ascending: false });

    if (attemptsError) {
      console.warn("Notice: Querying assessment_attempts:", attemptsError.message);
    }

    // 2. Fetch profiles to attach student names, emails, and batches
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, role, department, year, college_name");

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => {
      if (p.id) profileMap.set(p.id, p);
      if (p.user_id) profileMap.set(p.user_id, p);
    });

    const mappedSubmissions = (attempts || []).map((att: any) => {
      const student = profileMap.get(att.student_id) || {};
      const fullName =
        [student.first_name, student.last_name].filter(Boolean).join(" ") ||
        student.email?.split("@")[0] ||
        "Student Candidate";
      const rollNo = student.department
        ? `${student.department.toUpperCase()}-${student.year || "2026"}`
        : `STU-${(att.student_id || "").slice(0, 6).toUpperCase()}`;
      const answers = att.answers || {};
      const violations = answers.violationsCount || answers.proctoringViolations || 0;
      const integrity = violations === 0 ? "Clean" : violations <= 2 ? "Minor Alerts" : "Flagged";

      const totalMarks = Number(att.total_marks) || 100;
      const score = Number(att.score) || 0;
      const percentage = att.percentage !== null && att.percentage !== undefined
        ? Number(att.percentage)
        : Math.round((score / (totalMarks || 1)) * 100);

      return {
        id: att.id,
        name: fullName,
        rollNo: rollNo,
        email: student.email || "student@college.edu",
        batch: student.department ? `${student.department.toUpperCase()} Cohort` : "General Cohort",
        status:
          att.status === "submitted"
            ? "Submitted"
            : att.status === "in_progress"
            ? "In Progress"
            : "Auto-Submitted",
        score: score,
        totalMarks: totalMarks,
        percentage: percentage,
        violations: violations,
        integrity: integrity,
        timeSpent: att.time_taken_seconds ? `${Math.round(att.time_taken_seconds / 60)} mins` : "Completed",
        submittedAt: att.submitted_at
          ? new Date(att.submitted_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })
          : "Active",
      };
    });

    return NextResponse.json({
      submissions: mappedSubmissions,
      totalCount: mappedSubmissions.length,
    });
  } catch (error) {
    console.error("GET /api/admin/tests/[id]/submissions error:", error);
    return NextResponse.json({ error: getErrorMessage(error), submissions: [], totalCount: 0 }, { status: 500 });
  }
}
