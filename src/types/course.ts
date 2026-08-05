import type { UserProfile } from "./user";

export type CourseStatus = "draft" | "published" | "archived";
export type CourseVisibility = "public" | "private" | "enrolled_only";
export type CourseDifficulty = "beginner" | "intermediate" | "advanced";
export type LessonType = "video" | "pdf" | "text" | "quiz" | "coding";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  course_count?: number;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string | null;
  thumbnail_url: string | null;
  category_id: string;
  trainer_id: string;
  difficulty: CourseDifficulty;
  visibility: CourseVisibility;
  status: CourseStatus;
  duration_hours: number | null;
  language: string;
  tags: string[];
  what_you_learn: string[];
  requirements: string[];
  created_at: string;
  updated_at: string;
  // Relations
  category?: Category;
  trainer?: UserProfile;
  modules?: Module[];
  enrollment_count?: number;
  rating?: number;
  is_enrolled?: boolean;
  progress?: number;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
  lesson_count?: number;
  duration_minutes?: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  type: LessonType;
  content: string | null;
  video_url: string | null;
  video_duration: number | null;
  pdf_url: string | null;
  order: number;
  is_free_preview: boolean;
  created_at: string;
  updated_at: string;
  resources?: Resource[];
  is_completed?: boolean;
  is_locked?: boolean;
}

export interface Resource {
  id: string;
  lesson_id: string | null;
  course_id: string;
  title: string;
  type: "pdf" | "video" | "link" | "zip" | "image" | "other";
  url: string;
  size_bytes: number | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  status: "active" | "completed" | "dropped";
  progress_percentage: number;
  course?: Course;
  student?: UserProfile;
}

export interface CreateCourseInput {
  title: string;
  description: string;
  short_description?: string;
  category_id: string;
  difficulty: CourseDifficulty;
  visibility: CourseVisibility;
  language?: string;
  tags?: string[];
  what_you_learn?: string[];
  requirements?: string[];
}

export interface CreateModuleInput {
  course_id: string;
  title: string;
  description?: string;
  order: number;
}

export interface CreateLessonInput {
  module_id: string;
  course_id: string;
  title: string;
  type: LessonType;
  content?: string;
  video_url?: string;
  pdf_url?: string;
  order: number;
  is_free_preview?: boolean;
}
