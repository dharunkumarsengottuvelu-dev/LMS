import type { UserProfile } from "./user";
import type { Course } from "./course";
import type { Assessment } from "./assessment";

export type AssignmentSubmissionType = "pdf" | "zip" | "github" | "text";
export type SubmissionStatus = "pending" | "submitted" | "graded" | "returned" | "late";
export type TestType = "mcq" | "coding" | "mixed";
export type TestStatus = "draft" | "scheduled" | "live" | "completed" | "cancelled";

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  created_by: string;
  deadline: string;
  max_marks: number;
  submission_types: AssignmentSubmissionType[];
  instructions: string | null;
  attachments: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  course?: Course;
  creator?: UserProfile;
  my_submission?: AssignmentSubmission;
  submission_count?: number;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string | null;
  github_link: string | null;
  text_content: string | null;
  submitted_at: string;
  status: SubmissionStatus;
  marks: number | null;
  feedback: string | null;
  graded_at: string | null;
  graded_by: string | null;
  // Relations
  student?: UserProfile;
  assignment?: Assignment;
}

export interface Test {
  id: string;
  title: string;
  description: string | null;
  type: TestType;
  course_id: string | null;
  created_by: string;
  scheduled_at: string;
  duration_minutes: number;
  passing_marks: number;
  total_marks: number;
  max_attempts: number;
  eligible_batch_ids: string[];
  eligible_student_ids: string[];
  status: TestStatus;
  auto_submit: boolean;
  shuffle_questions: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  creator?: UserProfile;
  assessment?: Assessment;
  attempt_count?: number;
  my_attempt?: TestAttempt;
}

export interface TestAttempt {
  id: string;
  test_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  expires_at: string;
  score: number | null;
  passed: boolean | null;
  rank: number | null;
  created_at: string;
  test?: Test;
}

export interface Certificate {
  id: string;
  student_id: string;
  course_id: string;
  issued_at: string;
  verification_id: string;
  pdf_url: string | null;
  course?: Course;
  student?: UserProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  type:
    | "assessment_assigned"
    | "test_scheduled"
    | "assignment_deadline"
    | "course_updated"
    | "new_lesson"
    | "result_published"
    | "certificate_issued"
    | "general";
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: UserProfile;
}

export interface CreateAssignmentInput {
  title: string;
  description: string;
  course_id: string;
  deadline: string;
  max_marks: number;
  submission_types: AssignmentSubmissionType[];
  instructions?: string;
}

export interface SubmitAssignmentInput {
  assignment_id: string;
  file_url?: string;
  github_link?: string;
  text_content?: string;
}

export interface GradeAssignmentInput {
  submission_id: string;
  marks: number;
  feedback?: string;
}
