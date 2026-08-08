import { createClient } from "@/lib/supabase/client";
import type { Assessment, AssessmentAttempt, SubmitAnswersInput, CreateAssessmentInput } from "@/types/assessment";

export const INITIAL_MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: "test-1",
    title: "Full-Stack React & Next.js Proctored Skill Exam",
    description: "Evaluates production expertise in Next.js Server Components, state management, hooks, and security.",
    type: "mcq",
    course_id: "course-1",
    created_by: "trainer-1",
    duration_minutes: 45,
    passing_marks: 70,
    total_marks: 100,
    max_attempts: 3,
    shuffle_questions: true,
    negative_marking: true,
    negative_marks_per_wrong: 1,
    available_from: new Date().toISOString(),
    expires_at: null,
    status: "active",
    instructions: "Strict proctoring enabled. Tab switching, copy-pasting, and multiple displays are monitored.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    question_count: 20,
    attempt_count: 45,
    best_score: 92
  },
  {
    id: "test-2",
    title: "Advanced Data Structures & Algorithms Benchmark",
    description: "Rigorous coding examination testing Array manipulation, Dynamic Programming, and Tree algorithms.",
    type: "coding",
    course_id: "course-2",
    created_by: "trainer-2",
    duration_minutes: 90,
    passing_marks: 60,
    total_marks: 100,
    max_attempts: 2,
    shuffle_questions: false,
    negative_marking: false,
    negative_marks_per_wrong: 0,
    available_from: new Date().toISOString(),
    expires_at: null,
    status: "active",
    instructions: "Submit working code passing all hidden unit tests within time limits.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    question_count: 5,
    attempt_count: 128,
    best_score: 85
  }
];

const LOCAL_STORAGE_KEY_TESTS = "enterprise_lms_assessments_v1";
const LOCAL_STORAGE_KEY_ATTEMPTS = "enterprise_lms_attempts_v1";

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
