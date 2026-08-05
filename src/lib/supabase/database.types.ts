export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          bio: string | null;
          phone: string | null;
          date_of_birth: string | null;
          gender: string | null;
          location: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          website_url: string | null;
          skills: string[];
          role: "admin" | "trainer" | "student";
          status: "active" | "suspended" | "pending";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      courses: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          short_description: string | null;
          thumbnail_url: string | null;
          category_id: string;
          trainer_id: string;
          difficulty: "beginner" | "intermediate" | "advanced";
          visibility: "public" | "private" | "enrolled_only";
          status: "draft" | "published" | "archived";
          duration_hours: number | null;
          language: string;
          tags: string[];
          what_you_learn: string[];
          requirements: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["courses"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          color: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          order: number;
          is_locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["modules"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["modules"]["Insert"]>;
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          course_id: string;
          title: string;
          type: "video" | "pdf" | "text" | "quiz" | "coding";
          content: string | null;
          video_url: string | null;
          video_duration: number | null;
          pdf_url: string | null;
          order: number;
          is_free_preview: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lessons"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["lessons"]["Insert"]>;
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          enrolled_at: string;
          completed_at: string | null;
          status: "active" | "completed" | "dropped";
          progress_percentage: number;
        };
        Insert: Omit<Database["public"]["Tables"]["enrollments"]["Row"], "enrolled_at">;
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Insert"]>;
      };
      assessments: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: "mcq" | "coding" | "mixed";
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
          status: "draft" | "active" | "expired" | "archived";
          instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assessments"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["assessments"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          is_read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_student_progress: {
        Args: { p_student_id: string; p_course_id: string };
        Returns: {
          completed_lessons: number;
          total_lessons: number;
          progress_percentage: number;
        };
      };
    };
    Enums: {
      user_role: "admin" | "trainer" | "student";
      user_status: "active" | "suspended" | "pending";
      course_status: "draft" | "published" | "archived";
      lesson_type: "video" | "pdf" | "text" | "quiz" | "coding";
    };
  };
};
