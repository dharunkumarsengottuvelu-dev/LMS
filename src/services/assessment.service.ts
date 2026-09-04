import { createClient } from "@/lib/supabase/client";
import type { Assessment, AssessmentAttempt, SubmitAnswersInput, CreateAssessmentInput } from "@/types/assessment";

export interface PracticeSubModule {
  id: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  status?: "not_started" | "in_progress" | "completed";
  score?: number;
}

export interface PracticeTrackItem {
  id: string;
  title: string;
  category: string;
  description: string;
  thumbnail: string;
  assignedBy: "Admin" | "Trainer";
  assignedByName: string;
  subModules: PracticeSubModule[];
  assignedBatches?: string[];
  assignedStudents?: string[];
}

export const INITIAL_MOCK_ASSESSMENTS: Assessment[] = [];
export const INITIAL_MOCK_PRACTICE_TRACKS: PracticeTrackItem[] = [];

export class AssessmentService {
  /**
   * Fetches all assessments/tests from the database
   */
  static async getAssessments(): Promise<Assessment[]> {
    try {
      const res = await fetch("/api/admin/tests", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.tests)) {
          return data.tests.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description || null,
            type: t.type || "mcq",
            course_id: t.course_id || null,
            created_by: t.created_by || "Admin",
            duration_minutes: t.duration_minutes || 60,
            passing_marks: t.passing_marks || 60,
            total_marks: t.total_marks || 100,
            max_attempts: t.max_attempts || 3,
            shuffle_questions: t.shuffle_questions ?? true,
            negative_marking: t.negative_marking ?? false,
            negative_marks_per_wrong: t.negative_marks_per_wrong || 0,
            available_from: t.available_from || t.scheduled_at || new Date().toISOString(),
            expires_at: t.expires_at || null,
            status: t.status || "active",
            instructions: t.instructions || null,
            created_at: t.created_at || new Date().toISOString(),
            updated_at: t.updated_at || new Date().toISOString(),
            question_count: t.question_count || 0,
            attempt_count: t.attempt_count || 0,
          }));
        }
      }

      // Direct Supabase fallback if API route is unavailable
      const supabase = createClient();
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data as unknown as Assessment[];
      }
    } catch (e) {
      console.error("Failed to query assessments from backend:", e);
    }
    return [];
  }

  static async getAssessmentById(id: string): Promise<Assessment | null> {
    try {
      const list = await this.getAssessments();
      const found = list.find((a) => a.id === id);
      if (found) return found;

      const res = await fetch(`/api/student/assessments/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.assessment) return data.assessment;
      }
    } catch (e) {
      console.error("Failed to query assessment by ID:", e);
    }
    return null;
  }

  static async createAssessment(input: CreateAssessmentInput, createdBy: string = "trainer-admin"): Promise<Assessment> {
    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          created_by: createdBy,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.test) return data.test;
      }
    } catch (e) {
      console.error("Error creating assessment via API:", e);
    }

    // Direct Supabase insert fallback
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from("assessments") as any)
        .insert([{
          title: input.title,
          description: input.description,
          type: input.type,
          course_id: input.course_id,
          created_by: createdBy,
          duration_minutes: input.duration_minutes,
          passing_marks: input.passing_marks,
          total_marks: 100,
          status: "active",
        }])
        .select()
        .single();

      if (!error && data) {
        return data as unknown as Assessment;
      }
    } catch (e) {
      console.error("Error inserting assessment in database:", e);
    }

    throw new Error("Failed to create assessment in database");
  }

  static async getPracticeTracks(): Promise<PracticeTrackItem[]> {
    try {
      const res = await fetch("/api/admin/practices", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.tracks)) {
          return data.tracks.map((t: any) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            description: t.description,
            thumbnail: t.thumbnail,
            assignedByName: t.assignedByName,
            assignedBatches: t.assignedBatches || [],
            assignedStudents: t.assignedStudents || [],
            assignedBy: "Admin",
            subModules: Array.isArray(t.subModules) ? t.subModules : [],
          }));
        }
      }

      // Direct query fallback
      const supabase = createClient();
      const { data, error } = await supabase
        .from("practice_tracks")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((t: any) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          description: t.description,
          thumbnail: t.thumbnail,
          assignedByName: t.assigned_by_name,
          assignedBatches: t.assigned_batches || [],
          assignedStudents: t.assigned_students || [],
          assignedBy: "Admin",
          subModules: t.sub_modules?.map((sm: any) => ({
            id: sm.id,
            title: sm.title,
            type: sm.type,
            durationMinutes: sm.duration_minutes,
            totalMarks: sm.total_marks,
            questionCount: sm.question_count,
          })) || [],
        })) as PracticeTrackItem[];
      }
    } catch (e) {
      console.error("Failed to query practice tracks from database:", e);
    }
    return [];
  }

  static async upsertPracticeTrack(track: PracticeTrackItem): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(track),
      });

      if (res.ok) {
        return true;
      }

      const supabase = createClient();
      const payload: any = {
        title: track.title,
        category: track.category,
        description: track.description,
        thumbnail: track.thumbnail || "",
        assigned_by_name: track.assignedByName,
        assigned_batches: track.assignedBatches || [],
        assigned_students: track.assignedStudents || [],
        sub_modules: track.subModules || [],
      };

      if (track.id && !track.id.startsWith("track_")) {
        payload.id = track.id;
      }

      const { data, error } = await (supabase as any)
        .from("practice_tracks")
        .upsert(payload)
        .select()
        .single();

      if (!error && data && track.id.startsWith("track_")) {
        track.id = data.id;
      }
      return !error;
    } catch (e) {
      console.error("Error upserting practice track:", e);
    }
    return false;
  }

  /**
   * Evaluates answers and submits attempt directly to backend API and Supabase database.
   * Zero fake or randomized scores.
   */
  static async submitAttempt(input: SubmitAnswersInput, studentId?: string): Promise<AssessmentAttempt> {
    try {
      const res = await fetch(`/api/student/assessments/${encodeURIComponent(input.attempt_id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: input.answers,
          student_id: studentId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.attempt) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("student-activity-updated"));
          }
          return data.attempt;
        }
      }
    } catch (e) {
      console.error("Error submitting assessment to API:", e);
    }

    throw new Error("Failed to submit assessment to database");
  }

  /**
   * Fetches real student assessment attempts from Supabase database.
   */
  static async getStudentAttempts(studentId?: string): Promise<AssessmentAttempt[]> {
    try {
      const supabase = createClient();
      let query = (supabase as any)
        .from("assessment_attempts")
        .select("*, assessments(title), profiles(first_name, last_name)")
        .order("submitted_at", { ascending: false });

      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          student_id: d.student_id,
          assessment_id: d.assessment_id,
          started_at: d.started_at || new Date().toISOString(),
          submitted_at: d.submitted_at || null,
          expires_at: d.expires_at || new Date().toISOString(),
          status: d.status || "completed",
          answers: d.answers || {},
          score: d.score ?? null,
          total_marks: d.total_marks || 100,
          percentage: typeof d.score === "number" ? Math.round((d.score / (d.total_marks || 100)) * 100) : null,
          passed: typeof d.score === "number" ? d.score >= 50 : null,
          time_taken_seconds: d.time_taken_seconds || null,
          created_at: d.created_at || d.started_at || new Date().toISOString(),
          assessment: d.assessments,
        })) as AssessmentAttempt[];
      }
    } catch (e) {
      console.error("Error fetching assessment attempts from database:", e);
    }
    return [];
  }
}
