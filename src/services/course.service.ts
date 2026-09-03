import { createClient } from "@/lib/supabase/client";
import type { Course, Module, Lesson, Enrollment, CreateCourseInput } from "@/types/course";

// Clean initial courses array (Ready for dynamic authoring and assignment)
export const INITIAL_MOCK_COURSES: Course[] = [];

const LOCAL_STORAGE_KEY = "enterprise_lms_courses_v2";

export class CourseService {
  static getLocalCourses(): Course[] {
    if (typeof window === "undefined") return INITIAL_MOCK_COURSES;
    try {
      localStorage.removeItem("enterprise_lms_courses_v1");
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_COURSES));
    } catch {
      // Fallback if localStorage throws
    }
    return INITIAL_MOCK_COURSES;
  }

  static saveLocalCourses(courses: Course[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(courses));
    } catch {
      // Ignore write errors
    }
  }

  static async getCourses(): Promise<Course[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && Array.isArray(data)) {
        return data as unknown as Course[];
      }
    } catch (err) {
      console.error("Failed to query courses from Supabase:", err);
    }
    return [];
  }

  static async getCourseBySlug(slug: string): Promise<Course | null> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("courses")
        .select("*, modules(*, lessons(*))")
        .eq("slug", slug)
        .maybeSingle();
      
      if (!error && data) {
        return data as unknown as Course;
      }
    } catch (err) {
      console.error("Failed to query course by slug from Supabase:", err);
    }
    return null;
  }

  static async createCourse(input: CreateCourseInput, trainerId: string = "trainer-admin"): Promise<Course> {
    const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: input.title,
      slug,
      description: input.description,
      short_description: input.short_description || input.description.slice(0, 120),
      thumbnail_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
      category_id: input.category_id,
      trainer_id: trainerId,
      difficulty: input.difficulty,
      visibility: input.visibility,
      status: "published",
      duration_hours: 10,
      language: input.language || "English",
      tags: input.tags || ["New"],
      what_you_learn: input.what_you_learn || [],
      requirements: input.requirements || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rating: 5.0,
      enrollment_count: 1,
      modules: []
    };

    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("courses")
        .insert([{
          title: input.title,
          slug,
          description: input.description,
          category_id: input.category_id,
          trainer_id: trainerId,
          difficulty: input.difficulty,
          visibility: input.visibility,
          status: "published"
        }])
        .select()
        .single();

      if (!error && data) {
        return data as unknown as Course;
      }
    } catch {
      // Fallback to local store
    }

    const currentCourses = this.getLocalCourses();
    const updated = [newCourse, ...currentCourses];
    this.saveLocalCourses(updated);
    return newCourse;
  }

  static async updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
    const courses = this.getLocalCourses();
    const index = courses.findIndex(c => c.id === id);
    if (index !== -1 && courses[index]) {
      const existing = courses[index];
      const updatedCourse: Course = {
        ...existing,
        ...updates,
        id: existing.id,
        updated_at: new Date().toISOString(),
      };
      courses[index] = updatedCourse;
      this.saveLocalCourses(courses);
      return updatedCourse;
    }
    throw new Error("Course not found");
  }

  static async deleteCourse(id: string): Promise<boolean> {
    const courses = this.getLocalCourses();
    const filtered = courses.filter(c => c.id !== id);
    this.saveLocalCourses(filtered);
    return true;
  }
}
