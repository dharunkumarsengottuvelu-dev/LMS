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

const LOCAL_STORAGE_KEY_TESTS = "enterprise_lms_assessments_v2";
const LOCAL_STORAGE_KEY_ATTEMPTS = "enterprise_lms_attempts_v2";
const LOCAL_STORAGE_KEY_PRACTICE_TRACKS = "enterprise_lms_practice_tracks_v2";

export class AssessmentService {
  private static getLocalAssessments(): Assessment[] {
    if (typeof window === "undefined") return INITIAL_MOCK_ASSESSMENTS;
    try {
      localStorage.removeItem("enterprise_lms_assessments_v1");
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TESTS);
      if (saved) return JSON.parse(saved);
      localStorage.setItem(LOCAL_STORAGE_KEY_TESTS, JSON.stringify(INITIAL_MOCK_ASSESSMENTS));
    } catch {}
    return INITIAL_MOCK_ASSESSMENTS;
  }

  private static saveLocalAssessments(data: Assessment[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_TESTS, JSON.stringify(data));
    } catch {}
  }

  private static getLocalAttempts(): AssessmentAttempt[] {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ATTEMPTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }

  private static saveLocalAttempts(attempts: AssessmentAttempt[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ATTEMPTS, JSON.stringify(attempts));
    } catch {}
  }

  static async getAssessments(): Promise<Assessment[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("assessments")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as unknown as Assessment[];
      }
    } catch (e) {
      console.error("Failed to query assessments from Supabase:", e);
    }
    return [];
  }

  static async getAssessmentById(id: string): Promise<Assessment | null> {
    const list = await this.getAssessments();
    return list.find(a => a.id === id) || null;
  }

  static async createAssessment(input: CreateAssessmentInput, createdBy: string = "trainer-admin"): Promise<Assessment> {
    const newAssessment: Assessment = {
      id: `test-${Date.now()}`,
      title: input.title,
      description: input.description || null,
      type: input.type,
      course_id: input.course_id || null,
      created_by: createdBy,
      duration_minutes: input.duration_minutes,
      passing_marks: input.passing_marks,
      total_marks: 100,
      max_attempts: input.max_attempts || 3,
      shuffle_questions: input.shuffle_questions ?? true,
      negative_marking: input.negative_marking ?? false,
      negative_marks_per_wrong: input.negative_marks_per_wrong || 0,
      available_from: input.available_from || new Date().toISOString(),
      expires_at: input.expires_at || null,
      status: "active",
      instructions: input.instructions || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      question_count: 10,
      attempt_count: 0
    };

    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("assessments")
        .insert([{
          title: input.title,
          description: input.description,
          type: input.type,
          course_id: input.course_id,
          created_by: createdBy,
          duration_minutes: input.duration_minutes,
          passing_marks: input.passing_marks,
          total_marks: 100,
          status: "active"
        }])
        .select()
        .single();
      
      if (!error && data) {
        return data as unknown as Assessment;
      }
    } catch (e) {
      console.error(e);
    }

    const current = this.getLocalAssessments();
    const updated = [newAssessment, ...current];
    this.saveLocalAssessments(updated);
    return newAssessment;
  }

  static async getPracticeTracks(): Promise<PracticeTrackItem[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
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
            questionCount: sm.question_count
          })) || []
        })) as PracticeTrackItem[];
      }
    } catch (e) {
      console.error("Failed to query practice tracks from Supabase:", e);
    }
    return [];
  }

  static async upsertPracticeTrack(track: PracticeTrackItem): Promise<boolean> {
    try {
      const supabase = createClient();
      const payload: any = {
        title: track.title,
        category: track.category,
        description: track.description,
        thumbnail: track.thumbnail || "",
        assigned_by_name: track.assignedByName,
        assigned_batches: track.assignedBatches || [],
        assigned_students: track.assignedStudents || [],
        sub_modules: track.subModules || []
      };

      if (track.id && !track.id.startsWith("track_")) {
        payload.id = track.id;
      }

      const { data, error } = await (supabase as any).from("practice_tracks").upsert(payload).select().single();
      
      if (error) {
        console.warn("Notice: practice_tracks table upsert:", error.message);
      } else if (data && track.id.startsWith("track_")) {
        track.id = data.id;
      }
      return true;
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  static savePracticeTracks(tracks: PracticeTrackItem[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PRACTICE_TRACKS, JSON.stringify(tracks));
    } catch {}
  }

  static async submitAttempt(input: SubmitAnswersInput, studentId: string = "student-1"): Promise<AssessmentAttempt> {
    const attempts = this.getLocalAttempts();
    const score = Math.floor(Math.random() * 30) + 70; // 70-100 score range
    const newAttempt: AssessmentAttempt = {
      id: `att-${Date.now()}`,
      student_id: studentId,
      assessment_id: input.attempt_id,
      started_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      submitted_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      status: "submitted",
      answers: input.answers,
      score,
      total_marks: 100,
      percentage: score,
      passed: score >= 70,
      time_taken_seconds: 1200,
      created_at: new Date().toISOString()
    };

    try {
      const supabase = createClient();
      await (supabase as any).from("assessment_attempts").insert([
        {
          status: "submitted",
          answers: input.answers,
          score,
          total_marks: 100,
          percentage: score,
          passed: score >= 70,
          time_taken_seconds: 1200,
          submitted_at: newAttempt.submitted_at,
          expires_at: newAttempt.expires_at,
        },
      ]);
    } catch (e) {
      console.warn("Supabase assessment attempt persistence fallback:", e);
    }

    attempts.push(newAttempt);
    this.saveLocalAttempts(attempts);
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("student-activity-updated"));
      } catch {}
    }
    return newAttempt;
  }

  static async getStudentAttempts(studentId: string = "student-1"): Promise<AssessmentAttempt[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("assessment_attempts")
        .select(`*, assessments(title), profiles(first_name, last_name)`);
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          student_id: d.student_id,
          assessment_id: d.assessment_id,
          status: d.status,
          score: d.score,
          started_at: d.started_at,
          completed_at: d.submitted_at,
          answers: d.answers
        }));
      }
    } catch (e) {
      console.error(e);
    }

    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ATTEMPTS);
      if (saved) return JSON.parse(saved).filter((a: any) => a.student_id === studentId);
    } catch {}
    return [];
  }
}
