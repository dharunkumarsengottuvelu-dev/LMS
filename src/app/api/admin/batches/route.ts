import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch batches
    const { data: batchesData, error: batchesError } = await adminClient
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (batchesError) throw batchesError;

    // 2. Fetch batch_members mappings
    const { data: batchMembersData, error: membersError } = await adminClient
      .from("batch_members")
      .select("batch_id, user_id");

    if (membersError) {
      console.warn("Notice: Error fetching batch_members:", membersError.message);
    }

    const batchStudentsMap = new Map<string, string[]>();
    (batchMembersData || []).forEach((bm: any) => {
      const list = batchStudentsMap.get(bm.batch_id) || [];
      if (!list.includes(bm.user_id)) {
        list.push(bm.user_id);
      }
      batchStudentsMap.set(bm.batch_id, list);
    });

    // 3. Also check legacy profiles.batch_id
    const { data: profilesData } = await adminClient
      .from("profiles")
      .select("id, user_id, batch_id, batch_name, first_name, last_name, email, role")
      .eq("role", "student");

    (profilesData || []).forEach((p: any) => {
      if (p.batch_id) {
        const list = batchStudentsMap.get(p.batch_id) || [];
        const identifier = p.id || p.user_id;
        if (!list.includes(identifier)) {
          list.push(identifier);
        }
        batchStudentsMap.set(p.batch_id, list);
      }
    });

    // 4. Fetch trainers for mapping trainer names
    const { data: trainersData } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("role", "trainer");

    const trainerMap = new Map<string, string>();
    (trainersData || []).forEach((t: any) => {
      const name = `${t.first_name || ""} ${t.last_name || ""}`.trim() || t.email?.split("@")[0] || "Trainer";
      trainerMap.set(t.id, name);
    });

    const mappedBatches = (batchesData || []).map((b: any) => {
      const studentIds = batchStudentsMap.get(b.id) || [];
      const trainerName = b.trainer_id ? trainerMap.get(b.trainer_id) || "" : "";

      let meta: any = {};
      try {
        if (b.description && b.description.startsWith("{")) {
          meta = JSON.parse(b.description);
        }
      } catch {}

      const collegeName = meta.collegeName || meta.college_name || "";
      const courseName = meta.courseName || meta.course || meta.courseTrack || "";

      return {
        id: b.id,
        name: b.name || b.batch_name || "Untitled Batch",
        batchName: b.name || b.batch_name || "Untitled Batch",
        code: b.code || `BAT-${b.id.slice(0, 6).toUpperCase()}`,
        collegeName,
        course: courseName,
        courseName,
        trainer: trainerName,
        trainerName: trainerName,
        startDate: b.start_date || "",
        status: b.status || "active",
        studentIds,
        studentCount: studentIds.length,
        createdAt: b.created_at,
      };
    });

    return NextResponse.json({ batches: mappedBatches }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/batches error:", error);
    return NextResponse.json({ error: getErrorMessage(error), batches: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();

    const batchName = (body.name || body.batchName || "").trim();

    // RULE 1 & 4: Batch name is required.
    if (!batchName) {
      return NextResponse.json(
        { error: "Batch name is required." },
        { status: 400 }
      );
    }

    // Resolve trainer_id if a trainer name or ID was provided
    let trainerId: string | null = null;
    const trainerInput = (body.trainer || body.leadTrainer || "").trim();
    if (trainerInput) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trainerInput);
      if (isUUID) {
        trainerId = trainerInput;
      } else {
        const { data: trainerProfile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("role", "trainer")
          .or(`first_name.ilike.%${trainerInput}%,last_name.ilike.%${trainerInput}%`)
          .limit(1)
          .maybeSingle();
        if (trainerProfile) {
          trainerId = trainerProfile.id;
        }
      }
    }

    const collegeInput = body.collegeName || body.college_name || "";
    const courseInput = body.course || body.courseTrack || body.course_name || "";
    const joiningTimeInput = body.joiningTime || body.session || "";

    const descMeta = {
      college_name: collegeInput,
      collegeName: collegeInput,
      course_name: courseInput,
      courseName: courseInput,
      joining_time: joiningTimeInput,
    };

    const payload: Record<string, any> = {
      name: batchName,
      batch_name: batchName,
      code: body.code || `BAT-${Date.now().toString().slice(-4)}`,
      description: JSON.stringify(descMeta),
      start_date: body.startDate || body.start_date || null,
      status: "active",
    };

    if (trainerId) {
      payload.trainer_id = trainerId;
    }

    if (body.courseId) {
      payload.course_id = body.courseId;
    }

    const { data, error } = await adminClient
      .from("batches")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Batch insert error:", error);
      throw error;
    }

    // If initial students provided, add them to batch_members and sync profiles.batch_id
    const studentIds: string[] = body.studentIds || [];
    if (studentIds.length > 0 && data?.id) {
      const memberInserts = studentIds.map((userId) => ({
        batch_id: data.id,
        user_id: userId,
      }));
      await adminClient.from("batch_members").upsert(memberInserts, { onConflict: "batch_id,user_id" });

      for (const sId of studentIds) {
        await adminClient
          .from("profiles")
          .update({
            batch_id: data.id,
            batch_name: batchName,
            batch: batchName,
          })
          .or(`id.eq.${sId},user_id.eq.${sId}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        batch: {
          id: data.id,
          name: data.name || data.batch_name,
          batchName: data.name || data.batch_name,
          code: data.code,
          collegeName: collegeInput,
          course: courseInput,
          courseName: courseInput,
          trainer: trainerInput || "",
          startDate: data.start_date || "",
          status: data.status || "active",
          studentIds,
          studentCount: studentIds.length,
          createdAt: data.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/batches error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing batch ID" }, { status: 400 });
    }

    await adminClient.from("batch_members").delete().eq("batch_id", id);
    const { error } = await adminClient.from("batches").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Batch deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/batches error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
