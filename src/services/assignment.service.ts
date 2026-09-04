import { createClient } from "@/lib/supabase/client";

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id?: string;
  created_by?: string;
  deadline?: string;
  due_date?: string;
  max_marks?: number;
  max_score?: number;
  assigned_batches?: string[];
  status?: string;
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
      const res = await fetch("/api/admin/assignments", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.assignments)) {
          return data.assignments.map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description || "",
            course_id: a.course_id,
            created_by: a.created_by,
            deadline: a.due_date || a.deadline || a.created_at,
            due_date: a.due_date || a.deadline,
            max_marks: a.max_score || a.max_marks || 100,
            max_score: a.max_score || 100,
            status: a.status || "published",
          }));
        }
      }

      const supabase = createClient();
      const { data, error } = await (supabase as any).from("assignments").select("*");
      if (!error && Array.isArray(data)) return data as Assignment[];
    } catch (e) {
      console.error("Error fetching assignments from database:", e);
    }
    return [];
  }

  static async createAssignment(assignment: Partial<Assignment>): Promise<Assignment | null> {
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: assignment.title,
          description: assignment.description,
          due_date: assignment.due_date || assignment.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
          max_score: assignment.max_marks || assignment.max_score || 100,
          assigned_batches: assignment.assigned_batches || [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.assignment) return data.assignment;
      }
    } catch (e) {
      console.error("Error creating assignment via API:", e);
    }

    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("assignments")
        .insert([{
          title: assignment.title,
          description: assignment.description || "Assignment",
          due_date: assignment.due_date || assignment.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
          max_score: assignment.max_marks || assignment.max_score || 100,
          status: "published",
        }])
        .select()
        .single();

      if (!error && data) return data;
    } catch (e) {
      console.error("Error inserting assignment into database:", e);
    }
    return null;
  }

  static async getSubmissions(): Promise<StudentSubmissionItem[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("assignment_submissions")
        .select("*, assignments(title), profiles(first_name, last_name, batch, batch_name)")
        .order("submitted_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          assignment_id: d.assignment_id,
          student_id: d.student_id,
          studentName: d.profiles
            ? `${d.profiles.first_name || ""} ${d.profiles.last_name || ""}`.trim() || "Student"
            : "Student",
          assignmentTitle: d.assignments?.title || "Assignment",
          batch: d.profiles?.batch || d.profiles?.batch_name || "Unassigned",
          submittedAt: d.submitted_at || d.created_at,
          status: d.status === "graded" ? "graded" : "pending",
          gradeScore: d.score,
          feedback: d.feedback,
        }));
      }
    } catch (e) {
      console.error("Error fetching assignment submissions from database:", e);
    }
    return [];
  }
}
