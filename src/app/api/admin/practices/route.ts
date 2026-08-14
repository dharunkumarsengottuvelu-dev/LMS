import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch Practice Tracks
    const { data: dbTracks, error: tracksError } = await adminClient
      .from("practice_tracks")
      .select("*")
      .order("created_at", { ascending: false });

    if (tracksError) {
      console.error("Error fetching practice tracks:", tracksError);
    }

    const mappedTracks = (dbTracks || []).map((t: any) => {
      let meta: any = {};
      if (t.tags && t.tags[0]) {
        try {
          meta = JSON.parse(t.tags[0]);
        } catch {}
      }

      return {
        id: t.id,
        title: t.title,
        category: t.category,
        difficulty: t.difficulty || "medium",
        description: meta.description || t.description || "Practice Track",
        thumbnail: meta.thumbnail || t.thumbnail || "",
        assignedByName: meta.assignedByName || t.assigned_by_name || t.assignedByName || "Admin",
        assignedBatches: meta.assignedBatches || t.assigned_batches || t.assignedBatches || [],
        assignedStudents: meta.assignedStudents || t.assigned_students || t.assignedStudents || [],
        subModules: meta.subModules || t.sub_modules || t.subModules || [],
        createdAt: t.created_at
      };
    });

    // 2. Fetch Students
    const { data: studentsData, error: studentsError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("role", "student");

    const mappedStudents = (studentsData || []).map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email?.split("@")[0] || "Student",
      email: s.email,
      batch: s.batch || s.batch_name || "Unassigned Batch"
    }));

    // 3. Fetch Batches
    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name");

    const mappedBatches: string[] = [];
    (batchesData || []).forEach((b: any) => {
      if (b.name && !mappedBatches.includes(b.name)) mappedBatches.push(b.name);
      if (b.batch_name && !mappedBatches.includes(b.batch_name)) mappedBatches.push(b.batch_name);
    });

    return NextResponse.json({
      tracks: mappedTracks,
      students: mappedStudents,
      batches: mappedBatches
    });
  } catch (error) {
    console.error("GET /api/admin/practices error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();
    const { track, tracks } = body;

    const tracksToSave = tracks || (track ? [track] : []);

    for (const t of tracksToSave) {
      const meta = {
        description: t.description || "",
        thumbnail: t.thumbnail || "",
        assignedByName: t.assignedByName || "Admin",
        assignedBatches: t.assignedBatches || [],
        assignedStudents: t.assignedStudents || [],
        subModules: t.subModules || []
      };

      const problemsCount = (t.subModules || []).reduce((acc: number, sm: any) => acc + (sm.questionCount || 1), 0);

      const payload: any = {
        title: t.title,
        category: t.category || "General",
        difficulty: t.difficulty || "medium",
        problems_count: problemsCount,
        tags: [JSON.stringify(meta)]
      };

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
      if (isUUID) {
        payload.id = t.id;
      }

      const { data: savedTrack, error: upsertError } = await adminClient
        .from("practice_tracks")
        .upsert(payload)
        .select()
        .single();

      if (upsertError) {
        console.error("Error upserting practice track:", upsertError);
        throw upsertError;
      }

      const trackId = savedTrack.id;
      if (t.subModules && t.subModules.length > 0) {
        for (const sm of t.subModules) {
          const isSmUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sm.id);
          const smPayload: any = {
            track_id: trackId,
            title: sm.title,
            type: sm.type || "coding",
            duration_minutes: sm.durationMinutes || sm.duration_minutes || 30,
            total_marks: sm.totalMarks || sm.total_marks || 100,
            question_count: sm.questionCount || sm.question_count || 1
          };
          if (isSmUUID) {
            smPayload.id = sm.id;
          }
          await adminClient.from("practice_sub_modules").upsert(smPayload);
        }
      }
    }

    return NextResponse.json({ success: true, message: "Practice tracks saved successfully" });
  } catch (error) {
    console.error("POST /api/admin/practices error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing track ID" }, { status: 400 });
    }

    const { error } = await adminClient
      .from("practice_tracks")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Practice track deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/practices error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
