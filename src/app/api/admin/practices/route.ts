import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
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

      const assignedBatches =
        t.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        [];

      const isCommon =
        t.is_common !== undefined
          ? t.is_common
          : meta.isCommon !== undefined
          ? meta.isCommon
          : assignedBatches.length === 0;

      return {
        id: t.id,
        title: t.title,
        category: t.category,
        difficulty: t.difficulty || "medium",
        description: meta.description || t.description || "Practice Track",
        thumbnail: meta.thumbnail || t.thumbnail || "",
        assignedByName: meta.assignedByName || t.assigned_by_name || t.assignedByName || "Admin",
        assignedBatches,
        assignedStudents: meta.assignedStudents || t.assigned_students || [],
        subModules: meta.subModules || t.sub_modules || t.subModules || [],
        isCommon,
        status: t.status || meta.status || "published",
        createdAt: t.created_at,
      };
    });

    // 2. Fetch Students
    const { data: studentsData } = await adminClient
      .from("profiles")
      .select("*")
      .eq("role", "student");

    const mappedStudents = (studentsData || []).map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email?.split("@")[0] || "Student",
      email: s.email,
      batch: s.batch || s.batch_name || "Unassigned Batch",
    }));

    // 3. Fetch Batches
    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, college_name");

    const mappedBatches: any[] = (batchesData || []).map((b: any) => ({
      id: b.id,
      name: b.name || b.batch_name,
      collegeName: b.college_name || "",
    }));

    return NextResponse.json({
      tracks: mappedTracks,
      students: mappedStudents,
      batches: mappedBatches,
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
      const assignedBatches: string[] = t.assignedBatches || t.assigned_batches || [];
      const isCommon: boolean =
        t.isCommon !== undefined ? t.isCommon : assignedBatches.length === 0;

      const meta = {
        description: t.description || "",
        thumbnail: t.thumbnail || "",
        assignedByName: t.assignedByName || "Admin",
        isCommon,
        assignedBatches: isCommon ? [] : assignedBatches,
        assignedStudents: t.assignedStudents || [],
        subModules: t.subModules || [],
        status: t.status || "published",
      };

      const problemsCount = (t.subModules || []).reduce(
        (acc: number, sm: any) => acc + (sm.questionCount || 1),
        0
      );

      const payload: any = {
        title: t.title,
        category: t.category || "General",
        difficulty: t.difficulty || "medium",
        problems_count: problemsCount,
        assigned_batches: isCommon ? [] : assignedBatches,
        is_common: isCommon,
        tags: [JSON.stringify(meta)],
      };

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
      let trackId: string | null = isUUID ? t.id : null;

      if (!trackId && t.title) {
        try {
          const { data: existing } = await adminClient
            .from("practice_tracks")
            .select("id")
            .eq("title", t.title)
            .limit(1);
          if (existing && existing.length > 0 && existing[0]?.id) {
            trackId = existing[0].id;
          }
        } catch (e) {
          console.warn("Track lookup warning:", e);
        }
      }

      let savedTrack: any = null;
      if (trackId) {
        payload.id = trackId;
        const { data, error } = await adminClient
          .from("practice_tracks")
          .upsert(payload, { onConflict: "id" })
          .select()
          .maybeSingle();
        if (error) {
          console.warn("Upsert with ID warning:", error);
          // Fallback to update
          const { data: updatedData } = await adminClient
            .from("practice_tracks")
            .update(payload)
            .eq("id", trackId)
            .select()
            .maybeSingle();
          savedTrack = updatedData;
        } else {
          savedTrack = data;
        }
      } else {
        const { data, error } = await adminClient
          .from("practice_tracks")
          .insert(payload)
          .select()
          .maybeSingle();
        if (error) {
          console.warn("Insert track warning:", error);
        }
        savedTrack = data;
      }

      const finalTrackId = savedTrack?.id || trackId;
      if (finalTrackId && t.subModules && t.subModules.length > 0) {
        for (const sm of t.subModules) {
          const isSmUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sm.id);
          const smPayload: any = {
            track_id: finalTrackId,
            title: sm.title,
            type: sm.type || "coding",
            duration_minutes: sm.durationMinutes || sm.duration_minutes || 30,
            total_marks: sm.totalMarks || sm.total_marks || 100,
            question_count: sm.questionCount || sm.question_count || 1,
          };
          if (isSmUUID) {
            smPayload.id = sm.id;
          }
          try {
            await adminClient.from("practice_sub_modules").upsert(smPayload);
          } catch (smErr) {
            console.warn("Submodule save warning:", smErr);
          }
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

    const { error } = await adminClient.from("practice_tracks").delete().eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Practice track deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/practices error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
