import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const batchContext = await getStudentBatchAccess(adminClient, user);

    // Fetch course by id or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let course: any = null;

    if (isUUID) {
      const { data } = await adminClient.from("courses").select("*").eq("id", id).maybeSingle();
      course = data;
    }

    if (!course) {
      const cleanSlug = id.trim().toLowerCase();
      const { data } = await adminClient
        .from("courses")
        .select("*")
        .or(`slug.ilike.${cleanSlug},id.eq.${id}`)
        .maybeSingle();
      course = data;
    }

    if (!course) {
      // Fallback lookup by title converted to slug or exact title
      const titleSearch = id.replace(/-/g, " ").trim();
      const { data } = await adminClient
        .from("courses")
        .select("*")
        .ilike("title", titleSearch)
        .maybeSingle();
      course = data;
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    let meta: any = {};
    if (course.tags && course.tags[0]) {
      try {
        meta = JSON.parse(course.tags[0]);
      } catch {}
    }

    const assignedBatches =
      course.assigned_batches ||
      meta.assignedBatches ||
      meta.assigned_batches ||
      [];

    const assignedStudents =
      course.assigned_students ||
      meta.assignedStudents ||
      meta.assigned_students ||
      [];

    const isCommon =
      course.is_common === true ||
      String(course.is_common) === "true" ||
      meta.isCommon === true ||
      String(meta.isCommon) === "true" ||
      meta.is_common === true ||
      String(meta.is_common) === "true" ||
      (assignedBatches.length === 0 && assignedStudents.length === 0);

    // Rule 8 & 21: Server-side authorization check
    const isAuthorized = isContentVisibleToStudent(
      {
        is_common: isCommon,
        isCommon: isCommon,
        assigned_batches: assignedBatches,
        assigned_students: assignedStudents,
      },
      batchContext
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Access Denied. You do not have permission to view this course." },
        { status: 403 }
      );
    }

    const modules = meta.modules || [];
    const totalLessons = modules.reduce((acc: number, m: any) => acc + (m.subModules?.length || m.lessons?.length || 1), 0) || 10;

    return NextResponse.json({
      course: {
        id: course.id,
        slug: course.slug || course.id,
        title: course.title,
        description: course.description,
        difficulty:
          course.difficulty === "beginner"
            ? "Beginner"
            : course.difficulty === "advanced"
            ? "Advanced"
            : "Intermediate",
        thumbnail: course.thumbnail_url || meta.thumbnail || "",
        category: meta.category || (typeof course.category_id === "string" ? course.category_id : "General"),
        instructor: meta.instructor || "Lead Technical Trainer",
        durationHours: meta.durationHours || 10,
        totalLessons,
        modules,
        isCommon,
        assignedBatches,
        assignedStudents,
      },
    });
  } catch (error) {
    console.error("GET /api/student/courses/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
