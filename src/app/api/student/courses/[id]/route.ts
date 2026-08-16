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
    let query = adminClient.from("courses").select("*");
    if (isUUID) {
      query = query.or(`id.eq.${id},slug.eq.${id}`);
    } else {
      query = query.eq("slug", id);
    }

    const { data: course, error } = await query.maybeSingle();

    if (error || !course) {
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

    const isCommon =
      course.is_common !== undefined
        ? course.is_common
        : meta.isCommon !== undefined
        ? meta.isCommon
        : assignedBatches.length === 0;

    // Rule 8 & 21: Server-side authorization check
    const isAuthorized = isContentVisibleToStudent(
      {
        is_common: isCommon,
        assigned_batches: assignedBatches,
        assigned_students: meta.assignedStudents || [],
      },
      batchContext
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Access Denied. You do not have permission to view this course." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      course: {
        id: course.id,
        slug: course.slug || course.id,
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        thumbnail: course.thumbnail_url || meta.thumbnail || "",
        modules: meta.modules || [],
        isCommon,
        assignedBatches,
      },
    });
  } catch (error) {
    console.error("GET /api/student/courses/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
