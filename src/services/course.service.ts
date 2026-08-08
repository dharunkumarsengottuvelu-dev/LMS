import { createClient } from "@/lib/supabase/client";
import type { Course, Module, Lesson, Enrollment, CreateCourseInput } from "@/types/course";

// Initial mock data used if Supabase is disconnected or empty
export const INITIAL_MOCK_COURSES: Course[] = [
  {
    id: "course-1",
    title: "Full-Stack Web Development Mastery (Next.js 16 & React)",
    slug: "full-stack-web-development-mastery",
    description: "Master modern full-stack development using Next.js 16, TypeScript, TailwindCSS, and PostgreSQL/Supabase. Learn server components, SSR, and API architectures.",
    short_description: "Modern full-stack web development with Next.js, React, and Supabase.",
    thumbnail_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
    category_id: "cat-web-dev",
    trainer_id: "trainer-1",
    difficulty: "intermediate",
    visibility: "public",
    status: "published",
    duration_hours: 42,
    language: "English",
    tags: ["Next.js", "React", "TypeScript", "TailwindCSS", "Supabase"],
    what_you_learn: [
      "Build production-grade Next.js App Router applications",
      "Implement server actions, middleware, and OWASP security",
      "Deploy scalable serverless web applications to Vercel"
    ],
    requirements: ["Basic knowledge of HTML, CSS, and JavaScript ES6+"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rating: 4.9,
    enrollment_count: 1420,
    modules: [
      {
        id: "mod-1",
        course_id: "course-1",
        title: "Module 1: Next.js 16 & Modern Frontend Fundamentals",
        description: "Deep dive into App Router architecture, Server & Client Components.",
        order: 1,
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            module_id: "mod-1",
            course_id: "course-1",
            title: "Lesson 1: Introduction to Next.js 16 App Router",
            type: "video",
            content: "Learn how Next.js 16 handles server routing and layouts.",
            video_url: "https://www.youtube.com/embed/Sklc_poWXJ4",
            video_duration: 18,
            pdf_url: null,
            order: 1,
            is_free_preview: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_completed: true,
            is_locked: false
          },
          {
            id: "les-2",
            module_id: "mod-1",
            course_id: "course-1",
            title: "Lesson 2: Server & Client Component Architecture",
            type: "video",
            content: "Understanding state boundary split between server and browser.",
            video_url: "https://www.youtube.com/embed/Sklc_poWXJ4",
            video_duration: 25,
            pdf_url: null,
            order: 2,
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_completed: false,
            is_locked: false
          }
        ]
      }
    ]
  },
  {
    id: "course-2",
    title: "Data Structures & Algorithms in C++ / Java",
    slug: "data-structures-algorithms-masterclass",
    description: "Complete DSA preparation course covering Arrays, Trees, Graphs, Dynamic Programming, and System Design concepts for FAANG & MNC interviews.",
    short_description: "Master algorithms, complexity analysis, and coding interview techniques.",
    thumbnail_url: "https://images.unsplash.com/photo-1516116211223-4c714120353a?w=800&auto=format&fit=crop&q=80",
    category_id: "cat-dsa",
    trainer_id: "trainer-2",
    difficulty: "advanced",
    visibility: "public",
    status: "published",
    duration_hours: 60,
    language: "English",
    tags: ["DSA", "C++", "Java", "Algorithms", "Problem Solving"],
    what_you_learn: [
      "Solve complex algorithmic problems with optimal space/time complexity",
      "Master Dynamic Programming, Graphs, and Binary Search Trees",
      "Pass MNC and FAANG technical coding rounds"
    ],
    requirements: ["Basic knowledge of C++ or Java programming"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rating: 4.8,
    enrollment_count: 2890,
    modules: []
  }
];

const LOCAL_STORAGE_KEY = "enterprise_lms_courses_v1";

export class CourseService {
  private static getLocalCourses(): Course[] {
    if (typeof window === "undefined") return INITIAL_MOCK_COURSES;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_COURSES));
    } catch {
      // Fallback if localStorage throws
    }
    return INITIAL_MOCK_COURSES;
  }

  private static saveLocalCourses(courses: Course[]) {
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
        .select("*, category:categories(*)");
      
      if (!error && data && data.length > 0) {
        return data as unknown as Course[];
      }
    } catch {
      // Supabase connection unconfigured or failed, fallback to local persistence store
    }
    return this.getLocalCourses();
  }

  static async getCourseBySlug(slug: string): Promise<Course | null> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("courses")
        .select("*, modules(*, lessons(*))")
        .eq("slug", slug)
        .single();
      
      if (!error && data) {
        return data as unknown as Course;
      }
    } catch {
      // Fallback
    }
    const courses = this.getLocalCourses();
    return courses.find(c => c.slug === slug || c.id === slug) || null;
  }

  static async createCourse(input: CreateCourseInput, trainerId: string = "trainer-admin"): Promise<Course> {
    const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: input.title,
      slug,
      description: input.description,
      short_description: input.short_description || input.description.slice(0, 120),
      thumbnail_url: "https://images.unsplash.com/photo-1516116211223-4c714120353a?w=800&auto=format&fit=crop&q=80",
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
