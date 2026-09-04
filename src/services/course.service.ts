import type { Course, CreateCourseInput } from "@/types/course";

export const INITIAL_MOCK_COURSES: Course[] = [];

export class CourseService {
  /**
   * Fetches all courses from the authoritative backend API / Supabase DB
   */
  static async getCourses(): Promise<Course[]> {
    try {
      const res = await fetch("/api/admin/courses", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.courses)) {
          return data.courses;
        }
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.error("Failed to query courses from API:", err);
    }
    return [];
  }

  /**
   * Fetches a course by slug from the backend API
   */
  static async getCourseBySlug(slug: string): Promise<Course | null> {
    try {
      const res = await fetch(`/api/student/courses/${encodeURIComponent(slug)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.course) return data.course;
      }

      // Fallback: search courses list if slug endpoint was not matched directly
      const courses = await this.getCourses();
      const found = courses.find((c) => c.slug === slug || c.id === slug);
      if (found) return found;
    } catch (err) {
      console.error("Failed to query course by slug:", err);
    }
    return null;
  }

  /**
   * Creates a new course via the authoritative /api/admin/courses POST endpoint
   */
  static async createCourse(input: CreateCourseInput, trainerId: string = "trainer-admin"): Promise<Course> {
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          trainer_id: trainerId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create course on server");
      }

      const data = await res.json();
      if (data?.course) {
        return data.course;
      }
    } catch (err) {
      console.error("Error creating course in database:", err);
      throw err;
    }

    throw new Error("Failed to create course in database");
  }

  /**
   * Updates an existing course via /api/admin/courses
   */
  static async updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...updates,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.course) return data.course;
      }
    } catch (err) {
      console.error("Failed to update course in database:", err);
      throw err;
    }
    throw new Error("Failed to update course in database");
  }

  /**
   * Deletes a course from the database via DELETE /api/admin/courses?id=
   */
  static async deleteCourse(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/courses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (err) {
      console.error("Failed to delete course from database:", err);
      return false;
    }
  }
}
