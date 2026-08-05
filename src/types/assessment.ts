export type AssessmentType = "mcq" | "coding" | "mixed";
export type AssessmentStatus = "draft" | "active" | "expired" | "archived";
export type QuestionType = "single_choice" | "multiple_choice" | "true_false";
export type AttemptStatus = "in_progress" | "submitted" | "evaluated" | "expired";

export interface Assessment {
  id: string;
  title: string;
  description: string | null;
  type: AssessmentType;
  course_id: string | null;
  created_by: string;
  duration_minutes: number;
  passing_marks: number;
  total_marks: number;
  max_attempts: number;
  shuffle_questions: boolean;
  negative_marking: boolean;
  negative_marks_per_wrong: number;
  available_from: string | null;
  expires_at: string | null;
  status: AssessmentStatus;
  instructions: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  questions?: Question[];
  question_count?: number;
  attempt_count?: number;
  my_attempts?: AssessmentAttempt[];
  best_score?: number;
}

export interface Question {
  id: string;
  assessment_id: string;
  type: QuestionType;
  text: string;
  options: QuestionOption[];
  correct_answers: string[];
  marks: number;
  negative_marks: number;
  explanation: string | null;
  order: number;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  is_correct?: boolean; // Only visible to admin/trainer
}

export interface AssessmentAttempt {
  id: string;
  student_id: string;
  assessment_id: string;
  started_at: string;
  submitted_at: string | null;
  expires_at: string;
  status: AttemptStatus;
  answers: Record<string, string[]>; // questionId -> selectedOptionIds[]
  score: number | null;
  total_marks: number;
  percentage: number | null;
  passed: boolean | null;
  time_taken_seconds: number | null;
  created_at: string;
  assessment?: Assessment;
}

export interface AssessmentAssignment {
  id: string;
  assessment_id: string;
  assigned_to_type: "student" | "batch" | "course";
  assigned_to_id: string;
  assigned_by: string;
  assigned_at: string;
}

export interface CreateAssessmentInput {
  title: string;
  description?: string;
  type: AssessmentType;
  course_id?: string;
  duration_minutes: number;
  passing_marks: number;
  max_attempts?: number;
  shuffle_questions?: boolean;
  negative_marking?: boolean;
  negative_marks_per_wrong?: number;
  available_from?: string;
  expires_at?: string;
  instructions?: string;
}

export interface CreateQuestionInput {
  assessment_id: string;
  type: QuestionType;
  text: string;
  options: Omit<QuestionOption, "is_correct">[];
  correct_answers: string[];
  marks: number;
  negative_marks?: number;
  explanation?: string;
  order: number;
}

export interface SubmitAnswersInput {
  attempt_id: string;
  answers: Record<string, string[]>;
}
