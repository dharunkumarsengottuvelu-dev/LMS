import { createClient } from "@/lib/supabase/client";
import type { Course, Module, Lesson, Enrollment, CreateCourseInput } from "@/types/course";

// Clean initial courses array (Ready for dynamic authoring and assignment)
export const INITIAL_MOCK_COURSES: Course[] = [];

export class CourseService {

  static async getCourses(): Promise<Course[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("courses")
        .select("*, category:categories(*)");
      
      if (error) {
        console.error("Supabase getCourses error:", error);
        return [];
      }
      return data as unknown as Course[];
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      return [];
    }
  }

  static async getCourseBySlug(slug: string): Promise<Course | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("courses")
        .select("*, modules(*, lessons(*))")
        .eq("slug", slug)
        .single();
      
      if (error) {
        console.error("Supabase getCourseBySlug error:", error);
        return null;
      }
      return data as unknown as Course;
    } catch (err) {
      console.error("Failed to fetch course by slug:", err);
      return null;
    }
  }

  static async createCourse(input: CreateCourseInput, trainerId: string = "trainer-admin"): Promise<Course> {
    const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    try {
      const supabase = createClient();
      const { data, error } = await supabase
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
        }] as any)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as unknown as Course;
    } catch (err) {
      console.error("Failed to create course:", err);
      throw err;
    }
  }

  static async updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from("courses") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
        
      if (error) {
        throw new Error(error.message);
      }
      return data as unknown as Course;
    } catch (err) {
      console.error("Failed to update course:", err);
      throw err;
    }
  }

  static async deleteCourse(id: string): Promise<boolean> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", id);
        
      if (error) {
        throw new Error(error.message);
      }
      return true;
    } catch (err) {
      console.error("Failed to delete course:", err);
      throw err;
    }
  }
}
