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

    // Fetch all profiles & auth users
    const { data: profilesData } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    let authUsers: any[] = [];
    try {
      const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      authUsers = authData?.users || [];
    } catch (e) {
      console.warn("Could not list auth users in courses route:", e);
    }

    const profileUserIdSet = new Set((profilesData || []).map((p: any) => p.user_id));
    const mergedProfiles: any[] = [...(profilesData || [])];

    for (const au of authUsers) {
      if (!profileUserIdSet.has(au.id)) {
        const meta = au.user_metadata || {};
        const fullName = (meta.full_name || meta.name || "").trim();
        const nameParts = fullName.split(" ");
        const emailPrefix = au.email ? au.email.split("@")[0] : "User";
        const formattedEmailName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        const firstName = meta.first_name || nameParts[0] || formattedEmailName;
        const lastName = meta.last_name || nameParts.slice(1).join(" ") || "";
        const role = au.email?.includes("admin")
          ? "admin"
          : au.email?.includes("trainer")
          ? "trainer"
          : (meta.role || "student");

        const newProfile = {
          user_id: au.id,
          first_name: firstName,
          last_name: lastName,
          email: au.email,
          role,
          status: "active",
          created_at: au.created_at || new Date().toISOString(),
          updated_at: au.updated_at || new Date().toISOString(),
        };

        const { data: inserted } = await adminClient
          .from("profiles")
          .insert(newProfile)
          .select("*")
          .maybeSingle();

        if (inserted) {
          mergedProfiles.push(inserted);
        } else {
          mergedProfiles.push({ ...newProfile, id: au.id });
        }
      }
    }

    const studentProfiles = mergedProfiles.filter((p: any) => {
      const r = (p.role || "").toLowerCase();
      const em = (p.email || "").toLowerCase();
      return r === "student" || (!em.includes("admin") && !em.includes("trainer") && r !== "admin" && r !== "trainer");
    });

    const mappedStudents = studentProfiles.map((s: any) => {
      const first = s.first_name || "";
      const last = s.last_name || "";
      const fullName = (first || last) ? `${first} ${last}`.trim() : (s.email?.split("@")[0] || "Student");
      return {
        id: s.id || s.user_id,
        name: fullName,
        email: s.email || "",
        batch: s.batch || s.batch_name || s.batch_id || "General Cohort",
      };
    });

    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, college_name");

    const batchNamesSet = new Set<string>();
    const mappedBatches: any[] = [];

    (batchesData || []).forEach((b: any) => {
      const bName = b.name || b.batch_name;
      if (bName) {
        batchNamesSet.add(bName);
        mappedBatches.push({
          id: b.id,
          name: bName,
          collegeName: b.college_name || "",
        });
      }
    });

    studentProfiles.forEach((s: any) => {
      const sb = s.batch || s.batch_name || s.batch_id;
      if (sb && !batchNamesSet.has(sb)) {
        batchNamesSet.add(sb);
        mappedBatches.push({
          id: sb,
          name: sb,
          collegeName: "Student Cohort",
        });
      }
    });

    if (mappedBatches.length === 0) {
      mappedBatches.push({ id: "General Cohort", name: "General Cohort", collegeName: "All Students" });
    }

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

    const slug = (course.slug || course.title || "course")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const rawAssignedBatches: string[] = course.assignedBatches || course.assigned_batches || [];
    const isCommon: boolean =
      course.isCommon !== undefined
        ? course.isCommon
        : course.is_common !== undefined
        ? course.is_common
        : rawAssignedBatches.length === 0;

    const assignedBatches = isCommon ? [] : rawAssignedBatches;
    const assignedStudents = isCommon ? [] : (course.assignedStudents || course.assigned_students || []);

    const meta = {
      category: course.category || "General",
      instructor: course.instructor || "Lead Technical Trainer",
      durationHours: course.durationHours || 10,
      durationMins: course.durationMins || 0,
      totalLessons: (course.modules || []).reduce((acc: number, m: any) => acc + (m.subModules?.length || m.lessons?.length || 1), 0) || 10,
      modules: course.modules || [],
      isCommon,
      is_common: isCommon,
      assignedBatches,
      assigned_batches: assignedBatches,
      assignedStudents,
      assigned_students: assignedStudents,
      thumbnail: course.thumbnail || course.thumbnail_url || "",
    };

    const payload: any = {
      title: course.title.trim(),
      slug,
      description: course.description || "",
      short_description: (course.description || "").slice(0, 120),
      thumbnail_url:
        course.thumbnail ||
        course.thumbnail_url ||
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
      difficulty: (course.level || course.difficulty || "beginner").toLowerCase(),
      visibility: isCommon ? "public" : "private",
      status: course.status || "published",
      is_common: isCommon,
      assigned_batches: assignedBatches,
      tags: [JSON.stringify(meta)],
      updated_at: new Date().toISOString(),
    };

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      course.id
    );

    let targetCourseId: string | null = isUUID ? course.id : null;

    // If ID is not a direct UUID, check DB by slug or title
    if (!targetCourseId) {
      try {
        const { data: existingBySlug } = await adminClient
          .from("courses")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (existingBySlug?.id) {
          targetCourseId = existingBySlug.id;
        } else {
          const { data: existingByTitle } = await adminClient
            .from("courses")
            .select("id")
            .ilike("title", course.title.trim())
            .maybeSingle();
          if (existingByTitle?.id) {
            targetCourseId = existingByTitle.id;
          }
        }
      } catch (e) {
        console.warn("Course lookup warning:", e);
      }
    }

    let savedCourse: any = null;

    if (targetCourseId) {
      payload.id = targetCourseId;
      const { data, error } = await adminClient
        .from("courses")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();

      if (error) {
        console.warn("Upsert failed, falling back to update:", error);
        const { data: updatedData, error: updateError } = await adminClient
          .from("courses")
          .update(payload)
          .eq("id", targetCourseId)
          .select()
          .single();

        if (updateError) throw updateError;
        savedCourse = updatedData;
      } else {
        savedCourse = data;
      }
    } else {
      const { data, error } = await adminClient
        .from("courses")
        .insert(payload)
        .select()
        .single();

      if (error) {
        // Handle race condition on duplicate slug
        if (error.code === "23505") {
          const { data: retryData, error: retryError } = await adminClient
            .from("courses")
            .update(payload)
            .eq("slug", slug)
            .select()
            .single();
          if (retryError) throw retryError;
          savedCourse = retryData;
        } else {
          throw error;
        }
      } else {
        savedCourse = data;
      }
    }

    return NextResponse.json({ success: true, course: savedCourse });
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
