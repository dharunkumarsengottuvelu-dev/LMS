import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Resolve student batch context
    const batchContext = await getStudentBatchAccess(adminClient, user);

    // 2. Fetch courses
    const { data: coursesData, error } = await adminClient
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // 3. Query enrollments from database for student
    const studentFilter = `student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId},student_id.eq.${user.id}`;
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("course_id, progress_percentage, status")
      .or(studentFilter) as any;

    const enrollmentMap = new Map<string, any>();
    (enrollments || []).forEach((e: any) => {
      enrollmentMap.set(e.course_id, e);
    });

    // 4. Map courses and extract visibility meta
    const allCourses = (coursesData || []).map((c: any) => {
      let meta: any = {};
      if (c.tags && c.tags[0]) {
        try {
          meta = JSON.parse(c.tags[0]);
        } catch {}
      }

      const assignedBatches =
        c.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        [];

      const isCommon =
        c.is_common !== undefined
          ? c.is_common
          : meta.isCommon !== undefined
          ? meta.isCommon
          : assignedBatches.length === 0;

      const enrollment = enrollmentMap.get(c.id) || enrollmentMap.get(c.slug);
      const totalLessons = (meta.modules || []).reduce((acc: number, m: any) => acc + ((m.lessons || []).length || 1), 0) || 10;
      const progress = enrollment?.progress_percentage ?? (enrollment?.status === "completed" ? 100 : 0);
      const completedLessons = Math.round((progress / 100) * totalLessons);

      return {
        id: c.id,
        slug: c.slug || c.id,
        title: c.title,
        category: meta.category || "Technical Training",
        difficulty:
          c.difficulty === "beginner"
            ? "Beginner"
            : c.difficulty === "advanced"
            ? "Advanced"
            : "Intermediate",
        progress,
        completedLessons,
        totalLessons,
        instructor: meta.instructor || "Lead Technical Trainer",
        thumbnail:
          c.thumbnail_url ||
          meta.thumbnail ||
          "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
        description: c.description || "",
        modules: meta.modules || [],
        isCommon,
        assignedBatches,
        assignedStudents: meta.assignedStudents || [],
      };
    });

    // 4. Filter only authorized courses (Common OR Student's Batches)
    const authorizedCourses = allCourses.filter((course: any) =>
      isContentVisibleToStudent(course, batchContext)
    );

    return NextResponse.json({ courses: authorizedCourses }, { status: 200 });
  } catch (error) {
    console.error("GET /api/student/courses error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error), courses: [] },
      { status: 500 }
    );
  }
}
