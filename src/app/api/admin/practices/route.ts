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

    // Deduplicate any duplicate rows created by repeated clicks
    const seenTitles = new Map<string, any>();
    const duplicateIdsToDelete: string[] = [];

    (dbTracks || []).forEach((t: any) => {
      const normalizedTitle = (t.title || "").trim().toLowerCase();
      if (!normalizedTitle) return;

      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.set(normalizedTitle, t);
      } else {
        const existing = seenTitles.get(normalizedTitle);
        const existingSubCount = Array.isArray(existing.sub_modules) ? existing.sub_modules.length : 0;
        const currentSubCount = Array.isArray(t.sub_modules) ? t.sub_modules.length : 0;
        
        // If current has more content, keep current and mark previous as duplicate
        if (currentSubCount > existingSubCount) {
          if (existing.id) duplicateIdsToDelete.push(existing.id);
          seenTitles.set(normalizedTitle, t);
        } else {
          if (t.id) duplicateIdsToDelete.push(t.id);
        }
      }
    });

    // Delete redundant duplicate rows asynchronously if any found
    if (duplicateIdsToDelete.length > 0) {
      try {
        await adminClient
          .from("practice_tracks")
          .delete()
          .in("id", duplicateIdsToDelete);
      } catch (e) {
        console.warn("Duplicate cleanup warning:", e);
      }
    }

    const uniqueTracks = Array.from(seenTitles.values());

    const mappedTracks = uniqueTracks.map((t: any) => {
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

      const assignedStudents =
        t.assigned_students ||
        meta.assignedStudents ||
        meta.assigned_students ||
        [];

      const isCommon =
        t.is_common === true ||
        String(t.is_common) === "true" ||
        meta.isCommon === true ||
        String(meta.isCommon) === "true" ||
        meta.is_common === true ||
        String(meta.is_common) === "true" ||
        (assignedBatches.length === 0 && assignedStudents.length === 0) ||
        assignedBatches.includes("common") ||
        assignedBatches.includes("all");

      return {
        id: t.id,
        title: t.title,
        category: t.category,
        difficulty: t.difficulty || "medium",
        description: meta.description || t.description || "Practice Track",
        thumbnail: meta.thumbnail || t.thumbnail || "",
        assignedByName: meta.assignedByName || t.assigned_by_name || t.assignedByName || "Admin",
        assignedBatches,
        assignedStudents,
        subModules: meta.subModules || t.sub_modules || t.subModules || [],
        isCommon,
        status: t.status || meta.status || "published",
        createdAt: t.created_at,
      };
    });

    // 2. Fetch all profiles & auth users to ensure real students always load
    const { data: profilesData } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    let authUsers: any[] = [];
    try {
      const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      authUsers = authData?.users || [];
    } catch (e) {
      console.warn("Could not list auth users in practices route:", e);
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

    // Filter students
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
        userId: s.user_id || s.id,
        name: fullName,
        email: s.email || "",
        batch: s.batch || s.batch_name || s.batch_id || "General Cohort",
      };
    });

    // 3. Fetch Batches
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

    // Also include any distinct batches assigned to students
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

    // Deduplicate incoming tracksToSave by normalized title
    const seenIncomingTitles = new Set<string>();
    const deduplicatedTracksToSave: any[] = [];
    for (const t of tracksToSave) {
      const norm = (t.title || "").trim().toLowerCase();
      if (!norm) continue;
      if (!seenIncomingTitles.has(norm)) {
        seenIncomingTitles.add(norm);
        deduplicatedTracksToSave.push(t);
      }
    }

    for (const t of deduplicatedTracksToSave) {
      const isCommon: boolean =
        t.isCommon === true ||
        String(t.isCommon) === "true" ||
        t.is_common === true ||
        String(t.is_common) === "true" ||
        (t.assignedBatches || t.assigned_batches || []).length === 0;

      const assignedBatches: string[] = isCommon ? [] : (t.assignedBatches || t.assigned_batches || []);
      const assignedStudentsArray: string[] = isCommon ? [] : (t.assignedStudents || t.assigned_students || []);
      const subModulesArray = t.subModules || t.sub_modules || [];

      const meta = {
        description: t.description || "",
        thumbnail: t.thumbnail || "",
        status: t.status || "published",
        isCommon: isCommon,
        is_common: isCommon,
        assignedBatches: assignedBatches,
        assigned_batches: assignedBatches,
        assignedStudents: assignedStudentsArray,
        assigned_students: assignedStudentsArray,
        assignedByName: t.assignedByName || t.assigned_by_name || "Admin",
        subModules: subModulesArray,
      };

      const payload: any = {
        title: t.title.trim(),
        category: t.category || "General",
        difficulty: t.difficulty || "medium",
        description: t.description || "",
        thumbnail: t.thumbnail || "",
        assigned_batches: assignedBatches,
        assigned_students: assignedStudentsArray,
        is_common: isCommon,
        assigned_by_name: t.assignedByName || t.assigned_by_name || "Admin",
        sub_modules: subModulesArray,
        status: t.status || "published",
        tags: [JSON.stringify(meta)],
      };

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
      let trackId: string | null = isUUID ? t.id : null;

      // Check if a track with this title already exists in DB
      if (t.title) {
        try {
          const { data: existing } = await adminClient
            .from("practice_tracks")
            .select("id")
            .ilike("title", t.title.trim())
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
