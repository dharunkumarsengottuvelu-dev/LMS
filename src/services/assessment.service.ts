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

const LOCAL_STORAGE_KEY_TESTS = "enterprise_lms_assessments_v1";
const LOCAL_STORAGE_KEY_ATTEMPTS = "enterprise_lms_attempts_v1";
const LOCAL_STORAGE_KEY_PRACTICE_TRACKS = "enterprise_lms_practice_tracks_v1";

export class AssessmentService {
  private static getLocalAssessments(): Assessment[] {
    if (typeof window === "undefined") return INITIAL_MOCK_ASSESSMENTS;
    try {
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
        .select("*");
      if (!error && data && data.length > 0) {
        return data as unknown as Assessment[];
      }
    } catch {}
    return this.getLocalAssessments();
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

    const current = this.getLocalAssessments();
    const updated = [newAssessment, ...current];
    this.saveLocalAssessments(updated);
    return newAssessment;
  }

  static getPracticeTracks(): PracticeTrackItem[] {
    if (typeof window === "undefined") return INITIAL_MOCK_PRACTICE_TRACKS;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PRACTICE_TRACKS);
      if (saved) return JSON.parse(saved);
      localStorage.setItem(LOCAL_STORAGE_KEY_PRACTICE_TRACKS, JSON.stringify(INITIAL_MOCK_PRACTICE_TRACKS));
    } catch {}
    return INITIAL_MOCK_PRACTICE_TRACKS;
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

    attempts.push(newAttempt);
    this.saveLocalAttempts(attempts);
    return newAttempt;
  }

  static async getStudentAttempts(studentId: string = "student-1"): Promise<AssessmentAttempt[]> {
    const attempts = this.getLocalAttempts();
    return attempts.filter(a => a.student_id === studentId);
  }
}
