import { createClient } from "@/lib/supabase/client";

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  created_by: string;
  deadline: string;
  max_marks: number;
}

export interface StudentSubmissionItem {
  id: string;
  assignment_id?: string;
  student_id?: string;
  studentName: string;
  assignmentTitle: string;
  batch: string;
  submittedAt: string;
  status: "graded" | "pending";
  gradeScore?: number;
  feedback?: string;
}

export class AssignmentService {
  static async getAssignments(): Promise<Assignment[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any).from("assignments").select("*");
      if (!error && data) return data as Assignment[];
    } catch (e) {
      console.error(e);
    }
    return [];
  }

  static async createAssignment(assignment: Partial<Assignment>): Promise<Assignment | null> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any).from("assignments").insert([{
        title: assignment.title,
        description: assignment.description || "Assignment",
        course_id: "00000000-0000-0000-0000-000000000000", // Default UUID for mock
        created_by: "00000000-0000-0000-0000-000000000000",
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
        max_marks: 100
      }]).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  static async getSubmissions(): Promise<StudentSubmissionItem[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("assignment_submissions")
        .select(`*, assignments(title), profiles(first_name, last_name)`);
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          assignment_id: d.assignment_id,
          student_id: d.student_id,
          studentName: `${d.profiles?.first_name || ""} ${d.profiles?.last_name || "Unknown"}`,
          assignmentTitle: d.assignments?.title || "Unknown Assignment",
          batch: "Unknown Batch",
          submittedAt: d.submitted_at,
          status: d.status === "graded" ? "graded" : "pending",
          gradeScore: d.marks,
          feedback: d.feedback
        }));
      }
    } catch (e) {
      console.error(e);
    }
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("enterprise_lms_assignments_v2");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }
}
