import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
  try {
    const adminClient = createAdminClient();

    const { data: coursesData, error } = await adminClient
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, college_name");

    const mappedBatches: any[] = [];
    (batchesData || []).forEach((b: any) => {
      mappedBatches.push({
        id: b.id,
        name: b.name || b.batch_name,
        collegeName: b.college_name || "",
      });
    });

    const { data: studentsData } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, email, batch, batch_name")
      .eq("role", "student");

    const mappedStudents = (studentsData || []).map((s: any) => ({
      id: s.id,
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email?.split("@")[0] || "Student",
      email: s.email,
      batch: s.batch || s.batch_name || "Unassigned",
    }));

    const mappedCourses = (coursesData || []).map((c: any) => {
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

      return {
        id: c.id,
        title: c.title,
        category: meta.category || (typeof c.category_id === "string" ? c.category_id : "General"),
        level:
          c.difficulty === "beginner"
            ? "Beginner"
            : c.difficulty === "advanced"
            ? "Advanced"
            : "Intermediate",
        status: c.status || "published",
        enrolledStudents: meta.enrolledStudents || 0,
        totalLessons: meta.totalLessons || 10,
        instructor: meta.instructor || "Lead Technical Trainer",
        durationHours: meta.durationHours || 10,
        durationMins: meta.durationMins || 0,
        description: c.description || "",
        thumbnail: c.thumbnail_url || meta.thumbnail || "",
        modules: meta.modules || [],
        isCommon,
        assignedBatches,
        assignedStudents: meta.assignedStudents || [],
      };
    });

    return NextResponse.json({
      courses: mappedCourses,
      batches: mappedBatches,
      students: mappedStudents,
    });
  } catch (error) {
    console.error("GET /api/admin/courses error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();
    const { course } = body;

    if (!course || !course.title) {
      return NextResponse.json({ error: "Missing course title" }, { status: 400 });
    }

    const slug = (course.title || "course")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const assignedBatches: string[] = course.assignedBatches || course.assigned_batches || [];
    const isCommon: boolean =
      course.isCommon !== undefined ? course.isCommon : assignedBatches.length === 0;

    const meta = {
      category: course.category || "General",
      instructor: course.instructor || "Lead Technical Trainer",
      durationHours: course.durationHours || 10,
      durationMins: course.durationMins || 0,
      totalLessons: (course.modules || []).length || 10,
      modules: course.modules || [],
      isCommon,
      assignedBatches: isCommon ? [] : assignedBatches,
      assignedStudents: course.assignedStudents || [],
      thumbnail: course.thumbnail || "",
    };

    const payload: any = {
      title: course.title,
      slug,
      description: course.description || "",
      short_description: (course.description || "").slice(0, 120),
      thumbnail_url:
        course.thumbnail ||
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
      difficulty: (course.level || "beginner").toLowerCase(),
      visibility: isCommon ? "public" : "private",
      status: course.status || "published",
      is_common: isCommon,
      tags: [JSON.stringify(meta)],
    };

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      course.id
    );
    if (isUUID) {
      payload.id = course.id;
    }

    const { data, error } = await adminClient
      .from("courses")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Course upsert error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, course: data });
  } catch (error) {
    console.error("POST /api/admin/courses error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing course ID" }, { status: 400 });
    }

    const { error } = await adminClient.from("courses").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Course deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/courses error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
