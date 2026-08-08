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

export const INITIAL_MOCK_PRACTICE_TRACKS: PracticeTrackItem[] = [
  {
    id: "track-1",
    title: "React 19 & Next.js 16 Enterprise Masterclass",
    category: "Frontend Development",
    description: "Complete hands-on practice suite covering Server Components, App Router Navigation, and Custom Middleware.",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
    assignedBy: "Admin",
    assignedByName: "Dharunkumar S",
    assignedBatches: ["Batch 2026-A"],
    assignedStudents: ["std_101", "std_102", "std_105", "student-1"],
    subModules: [
      {
        id: "p1",
        title: "Module 1: React 19 Server Components Architecture",
        type: "mcq",
        durationMinutes: 30,
        totalMarks: 100,
        questionCount: 10,
        status: "completed",
        score: 90,
      },
      {
        id: "p1-m2",
        title: "Module 2: Custom Middleware & JWT Auth Handshake",
        type: "coding",
        durationMinutes: 45,
        totalMarks: 150,
        questionCount: 2,
        status: "in_progress",
      },
      {
        id: "p1-m3",
        title: "Module 3: Fullstack Server Action & PostgreSQL RLS",
        type: "mixed",
        durationMinutes: 60,
        totalMarks: 200,
        questionCount: 8,
        status: "not_started",
      },
    ],
  },
  {
    id: "track-2",
    title: "Data Structures & Algorithms Problem Solving Track",
    category: "Algorithms & Logic",
    description: "Master essential algorithmic problem solving with live code execution and test cases.",
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
    assignedBy: "Trainer",
    assignedByName: "Dr. Arunkumar (Lead Technical Trainer)",
    assignedBatches: ["Batch 2026-A"],
    assignedStudents: ["std_101", "student-1"],
    subModules: [
      {
        id: "p2",
        title: "Module 1: Arrays, Hash Maps & Two Pointer Technique",
        type: "coding",
        durationMinutes: 45,
        totalMarks: 150,
        questionCount: 3,
        status: "in_progress",
      },
      {
        id: "p2-m2",
        title: "Module 2: Dynamic Programming & Recursion Fundamentals",
        type: "coding",
        durationMinutes: 60,
        totalMarks: 200,
        questionCount: 4,
        status: "not_started",
      },
    ],
  },
  {
    id: "track-3",
    title: "Fullstack Architecture & System Design Track",
    category: "System Engineering",
    description: "Architect scalable cloud databases, microservices, and client-side caching.",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
    assignedBy: "Admin",
    assignedByName: "System Admin",
    assignedBatches: ["Batch 2026-A"],
    assignedStudents: ["std_101", "student-1"],
    subModules: [
      {
        id: "p3",
        title: "Module 1: System Architecture & Distributed Cache Strategy",
        type: "mixed",
        durationMinutes: 60,
        totalMarks: 200,
        questionCount: 5,
        status: "completed",
        score: 100,
      },
    ],
  },
];

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
