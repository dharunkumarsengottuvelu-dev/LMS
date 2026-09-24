import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminSession } from "../_auth";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin", "trainer"]);
    if (auth.errorResponse) return auth.errorResponse;

    const { adminClient } = auth;
    if (!adminClient) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    // 1. Fetch courses lookup
    const { data: coursesData } = await adminClient
      .from("courses")
      .select("id, title");

    const courseMap = new Map<string, string>();
    (coursesData || []).forEach((c: any) => {
      courseMap.set(c.id, c.title);
    });

    // 2. Fetch modules
    const { data: modulesData, error: mErr } = await adminClient
      .from("modules")
      .select("*")
      .order("order_index", { ascending: true });

    if (mErr) {
      console.error("Error fetching modules:", mErr);
      throw mErr;
    }

    // 3. Fetch lessons to attach or aggregate
    const { data: lessonsData } = await adminClient
      .from("lessons")
      .select("*")
      .order("order_index", { ascending: true });

    const lessonsByModule = new Map<string, any[]>();
    (lessonsData || []).forEach((l: any) => {
      if (l.module_id) {
        const list = lessonsByModule.get(l.module_id) || [];
        list.push(l);
        lessonsByModule.set(l.module_id, list);
      }
    });

    const mappedModules = (modulesData || []).map((m: any) => {
      let meta: any = {};
      if (m.description && m.description.startsWith("{")) {
        try {
          meta = JSON.parse(m.description);
        } catch {}
      }

      const modLessons = lessonsByModule.get(m.id) || [];
      const courseTitle = courseMap.get(m.course_id) || meta.courseTitle || "Enterprise Course";

      return {
        id: m.id,
        courseId: m.course_id,
        courseTitle,
        title: m.title,
        duration: meta.duration || (m.duration_minutes ? `${m.duration_minutes} mins` : "45 mins"),
        type: meta.type || m.type || "video",
        sequenceOrder: m.order_index ?? 0,
        contentSummary: meta.summary || (!m.description?.startsWith("{") ? m.description : "") || "Structured learning module.",
        assignedBatches: meta.assignedBatches || [],
        assignedStudents: meta.assignedStudents || [],
        videoUrl: meta.videoUrl || "",
        notes: meta.notes || "",
        practiceDescription: meta.practiceDescription || "",
        practiceTestCases: meta.practiceTestCases || "",
        practiceStarterCode: meta.practiceStarterCode || "",
        quizQuestions: meta.quizQuestions || "",
        lessons: modLessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          duration: `${l.duration_minutes || 15} mins`,
          videoUrl: l.video_url,
          content: l.content,
          order: l.order_index,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      modules: mappedModules,
      courses: (coursesData || []).map((c: any) => ({ id: c.id, title: c.title })),
    });
  } catch (error) {
    console.error("GET /api/admin/modules error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin", "trainer"]);
    if (auth.errorResponse) return auth.errorResponse;

    const { adminClient } = auth;
    if (!adminClient) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    const body = await request.json();
    const title = (body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Module title is required" }, { status: 400 });
    }

    // Resolve or find course_id
    let courseId = body.courseId;
    if (!courseId && body.courseTitle) {
      const { data: matchedCourse } = await adminClient
        .from("courses")
        .select("id")
        .ilike("title", `%${body.courseTitle.trim()}%`)
        .maybeSingle();

      if (matchedCourse) {
        courseId = matchedCourse.id;
      }
    }

    // If still no course, pick first course or create a default course
    if (!courseId) {
      const { data: firstCourse } = await adminClient
        .from("courses")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (firstCourse) {
        courseId = firstCourse.id;
      } else {
        const { data: newCourse } = await adminClient
          .from("courses")
          .insert({
            title: body.courseTitle || "Core Curriculum",
            slug: "core-curriculum-" + Date.now(),
            description: "Core Curriculum Modules",
            category: "Technical Training",
            difficulty: "intermediate",
            status: "published",
          })
          .select("id")
          .single();
        courseId = newCourse?.id;
      }
    }

    const meta = {
      courseTitle: body.courseTitle || "Enterprise Course",
      duration: body.duration || "45 mins",
      type: body.type || "video",
      summary: body.contentSummary || "",
      assignedBatches: body.assignedBatches || [],
      assignedStudents: body.assignedStudents || [],
      videoUrl: body.videoUrl || "",
      notes: body.notes || "",
      practiceDescription: body.practiceDescription || "",
      practiceTestCases: body.practiceTestCases || "",
      practiceStarterCode: body.practiceStarterCode || "",
      quizQuestions: body.quizQuestions || "",
    };

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id || "");

    const payload: any = {
      course_id: courseId,
      title,
      description: JSON.stringify(meta),
      order_index: body.sequenceOrder ?? 0,
      updated_at: new Date().toISOString(),
    };

    if (isUUID) {
      payload.id = body.id;
    }

    const { data, error } = await adminClient
      .from("modules")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error upserting module:", error);
      throw error;
    }

    // Also persist lesson if lesson fields provided
    if (data?.id && (body.videoUrl || body.notes || body.type)) {
      await adminClient
        .from("lessons")
        .upsert({
          module_id: data.id,
          title: `${title} - Lesson`,
          type: body.type === "quiz" ? "mcq" : body.type || "video",
          content: body.notes || body.contentSummary || "",
          video_url: body.videoUrl || null,
          duration_minutes: parseInt(body.duration || "30", 10) || 30,
          order_index: 0,
          updated_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      module: {
        id: data.id,
        courseId,
        courseTitle: meta.courseTitle,
        title: data.title,
        duration: meta.duration,
        type: meta.type,
        sequenceOrder: data.order_index,
        contentSummary: meta.summary,
        assignedBatches: meta.assignedBatches,
        assignedStudents: meta.assignedStudents,
        videoUrl: meta.videoUrl,
        notes: meta.notes,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/modules error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin", "trainer"]);
    if (auth.errorResponse) return auth.errorResponse;

    const { adminClient } = auth;
    if (!adminClient) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing module ID" }, { status: 400 });
    }

    // Delete lessons under this module
    await adminClient.from("lessons").delete().eq("module_id", id);
    const { error } = await adminClient.from("modules").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Module and lessons deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/modules error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
