import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { dispatchBatchNotification } from "@/lib/notifications/dispatcher";
import { randomUUID } from "crypto";
import {
  validateModuleMarks,
  calculateQuestionWeightsSum,
  calculateSubmoduleTotalMarks,
  calculateMainModuleTotalMarks,
} from "@/lib/practice-progress";

// Helper to normalize the 3-level hierarchy: Main Module -> Submodule -> Module
function normalizeSubmodules(rawSubmodules: any[], mainModuleId: string): any[] {
  if (!Array.isArray(rawSubmodules)) return [];

  return rawSubmodules.map((sm: any, smIdx: number) => {
    const smId = sm.id || randomUUID();
    const smName = (sm.name || sm.title || `Submodule ${smIdx + 1}`).trim();
    const smStatus = sm.status === "inactive" ? "inactive" : "active";
    const smOrder = typeof sm.display_order === "number" ? sm.display_order : (typeof sm.displayOrder === "number" ? sm.displayOrder : smIdx);

    let childModules: any[] = [];

    if (Array.isArray(sm.modules) && sm.modules.length > 0) {
      childModules = sm.modules.map((m: any, mIdx: number) => {
        const mId = m.id || randomUUID();
        const mName = (m.name || m.title || `Module ${mIdx + 1}`).trim();
        const mStatus = m.status === "inactive" ? "inactive" : "active";
        const mOrder = typeof m.display_order === "number" ? m.display_order : (typeof m.displayOrder === "number" ? m.displayOrder : mIdx);
        const mcqs = Array.isArray(m.mcqQuestions) ? m.mcqQuestions : (Array.isArray(m.mcqs) ? m.mcqs : []);
        const coding = Array.isArray(m.codingQuestions) ? m.codingQuestions : (Array.isArray(m.codingProblems) ? m.codingProblems : []);
        const qCount = m.questionCount || (mcqs.length + coding.length) || 0;

        return {
          id: mId,
          submodule_id: smId,
          submoduleId: smId,
          main_module_id: mainModuleId,
          mainModuleId: mainModuleId,
          name: mName,
          title: mName,
          description: m.description || "",
          status: mStatus,
          display_order: mOrder,
          displayOrder: mOrder,
          type: m.type || "mixed",
          durationMinutes: typeof m.durationMinutes === "number" ? m.durationMinutes : (typeof m.duration_minutes === "number" ? m.duration_minutes : 60),
          totalMarks: typeof m.totalMarks === "number" ? m.totalMarks : (typeof m.total_marks === "number" ? m.total_marks : 100),
          questionCount: qCount,
          allowedAttempts: typeof m.allowedAttempts === "number" ? m.allowedAttempts : (typeof m.allowed_attempts === "number" ? m.allowed_attempts : (typeof m.max_attempts === "number" ? m.max_attempts : 3)),
          reattemptEnabled: typeof m.reattemptEnabled === "boolean" ? m.reattemptEnabled : (typeof m.reattempt_enabled === "boolean" ? m.reattempt_enabled : true),
          reviewEnabled: typeof m.reviewEnabled === "boolean" ? m.reviewEnabled : (typeof m.review_enabled === "boolean" ? m.review_enabled : true),
          passingMarks: typeof m.passingMarks === "number" ? m.passingMarks : (typeof m.passing_marks === "number" ? m.passing_marks : 40),
          completionRule: m.completionRule || m.completion_rule || "submit",
          mcqSectionTitle: m.mcqSectionTitle || m.mcq_section_title || "Section 1: MCQs",
          codingSectionTitle: m.codingSectionTitle || m.coding_section_title || "Section 2: Coding",
          mcqQuestions: mcqs,
          codingQuestions: coding,
          created_at: m.created_at || new Date().toISOString(),
          updated_at: m.updated_at || new Date().toISOString(),
        };
      });
    } else if (
      (Array.isArray(sm.mcqQuestions) && sm.mcqQuestions.length > 0) ||
      (Array.isArray(sm.codingQuestions) && sm.codingQuestions.length > 0) ||
      sm.type
    ) {
      // Legacy flat submodule has practice questions: Wrap into Level 3 Module to preserve content
      const mId = randomUUID();
      const mcqs = Array.isArray(sm.mcqQuestions) ? sm.mcqQuestions : [];
      const coding = Array.isArray(sm.codingQuestions) ? sm.codingQuestions : [];
      childModules = [
        {
          id: mId,
          submodule_id: smId,
          submoduleId: smId,
          main_module_id: mainModuleId,
          mainModuleId: mainModuleId,
          name: smName,
          title: smName,
          description: sm.description || "",
          status: smStatus,
          display_order: 0,
          displayOrder: 0,
          type: sm.type || "mixed",
          durationMinutes: typeof sm.durationMinutes === "number" ? sm.durationMinutes : 60,
          totalMarks: typeof sm.totalMarks === "number" ? sm.totalMarks : 100,
          questionCount: mcqs.length + coding.length || sm.questionCount || 0,
          allowedAttempts: typeof sm.allowedAttempts === "number" ? sm.allowedAttempts : 3,
          reattemptEnabled: typeof sm.reattemptEnabled === "boolean" ? sm.reattemptEnabled : true,
          reviewEnabled: typeof sm.reviewEnabled === "boolean" ? sm.reviewEnabled : true,
          passingMarks: typeof sm.passingMarks === "number" ? sm.passingMarks : 40,
          completionRule: sm.completionRule || "submit",
          mcqQuestions: mcqs,
          codingQuestions: coding,
          created_at: sm.created_at || new Date().toISOString(),
          updated_at: sm.updated_at || new Date().toISOString(),
        },
      ];
    }

    // Sort child modules by display_order
    childModules.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const smTotalMarks = calculateSubmoduleTotalMarks({ modules: childModules });

    return {
      id: smId,
      main_module_id: mainModuleId,
      mainModuleId: mainModuleId,
      name: smName,
      title: smName,
      description: sm.description || "",
      status: smStatus,
      display_order: smOrder,
      displayOrder: smOrder,
      totalMarks: smTotalMarks,
      total_marks: smTotalMarks,
      modules: childModules,
      created_at: sm.created_at || new Date().toISOString(),
      updated_at: sm.updated_at || new Date().toISOString(),
    };
  });
}

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch Practice Tracks (Main Modules) from Database
    const { data: dbTracks, error: tracksError } = await adminClient
      .from("practice_tracks")
      .select("*")
      .order("created_at", { ascending: false });

    if (tracksError) {
      console.error("Error fetching practice tracks:", tracksError);
    }

    // Deduplicate any duplicate rows created previously
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
        
        if (currentSubCount > existingSubCount) {
          if (existing.id) duplicateIdsToDelete.push(existing.id);
          seenTitles.set(normalizedTitle, t);
        } else {
          if (t.id) duplicateIdsToDelete.push(t.id);
        }
      }
    });

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

    const mappedTracks = uniqueTracks.map((t: any, idx: number) => {
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

      const displayOrder = typeof t.display_order === "number"
        ? t.display_order
        : (typeof meta.display_order === "number" ? meta.display_order : (typeof meta.displayOrder === "number" ? meta.displayOrder : idx));

      const rawSubmodules = meta.subModules || t.sub_modules || t.subModules || [];
      const normalizedHierarchy = normalizeSubmodules(rawSubmodules, t.id);
      normalizedHierarchy.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      const status = t.status === "inactive" || t.status === "draft" ? "inactive" : "active";
      const trackTotalMarks = calculateMainModuleTotalMarks({ submodules: normalizedHierarchy });

      return {
        id: t.id,
        name: t.title,
        title: t.title,
        category: t.category || "General",
        difficulty: t.difficulty || "medium",
        description: t.description || meta.description || "",
        thumbnail: meta.thumbnail || t.thumbnail || "",
        assignedByName: t.assigned_by_name || meta.assignedByName || "Admin",
        assignedBatches,
        assignedStudents,
        submodules: normalizedHierarchy,
        subModules: normalizedHierarchy,
        totalMarks: trackTotalMarks,
        total_marks: trackTotalMarks,
        isCommon,
        status,
        display_order: displayOrder,
        displayOrder,
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
      };
    });

    // Sort main modules by display_order
    mappedTracks.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    // 2. Fetch profiles & auth users for batch/student assignments
    const { data: profilesData } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const studentProfiles = (profilesData || []).filter((p: any) => {
      const r = (p.role || "").toLowerCase();
      const em = (p.email || "").toLowerCase();
      return r === "student";
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
        batch: s.batch_name || s.batch || s.batch_id || "Unassigned",
      };
    });

    // 3. Fetch Batches & Members
    const { data: batchMembersData } = await adminClient
      .from("batch_members")
      .select("batch_id, user_id");

    const batchMemberCounts: Record<string, number> = {};
    (batchMembersData || []).forEach((bm: any) => {
      batchMemberCounts[bm.batch_id] = (batchMemberCounts[bm.batch_id] || 0) + 1;
    });

    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, code, description, status")
      .order("created_at", { ascending: false });

    const mappedBatches: any[] = (batchesData || []).map((b: any) => {
      let meta: any = {};
      try {
        if (b.description && b.description.startsWith("{")) {
          meta = JSON.parse(b.description);
        }
      } catch {}
      return {
        id: b.id,
        name: b.name || b.batch_name || "Untitled Batch",
        collegeName: meta.collegeName || meta.college_name || "",
        studentCount: batchMemberCounts[b.id] || 0,
      };
    });

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
    const { action } = body;

    // ─────────────────────────────────────────────────────────
    // ACTION 1: CREATE MAIN MODULE
    // ─────────────────────────────────────────────────────────
    if (action === "create_main_module") {
      const name = (body.name || body.title || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Main Module name is required" }, { status: 400 });
      }

      const description = (body.description || "").trim();
      const status = body.status === "inactive" ? "inactive" : "active";
      const displayOrder = typeof body.display_order === "number" ? body.display_order : (typeof body.displayOrder === "number" ? body.displayOrder : 0);
      const isCommon = body.isCommon !== undefined ? Boolean(body.isCommon) : true;
      const assignedBatches = Array.isArray(body.assignedBatches) ? body.assignedBatches : [];
      const assignedStudents = Array.isArray(body.assignedStudents) ? body.assignedStudents : [];

      const meta = {
        description,
        status,
        display_order: displayOrder,
        displayOrder,
        isCommon,
        assignedBatches,
        assignedStudents,
        assignedByName: body.assignedByName || "Admin",
      };

      const payload: any = {
        title: name,
        category: body.category || "General",
        difficulty: body.difficulty || "medium",
        description,
        status: status === "active" ? "published" : "draft",
        assigned_batches: assignedBatches,
        assigned_students: assignedStudents,
        is_common: isCommon,
        assigned_by_name: body.assignedByName || "Admin",
        sub_modules: [],
        tags: [JSON.stringify(meta)],
      };

      const { data: inserted, error: insertError } = await adminClient
        .from("practice_tracks")
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        message: "Main Module created successfully",
        main_module: {
          id: inserted.id,
          name: inserted.title,
          title: inserted.title,
          description: inserted.description,
          status,
          display_order: displayOrder,
          submodules: [],
          created_at: inserted.created_at,
          updated_at: inserted.updated_at,
        },
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION 2: UPDATE MAIN MODULE
    // ─────────────────────────────────────────────────────────
    if (action === "update_main_module") {
      const id = body.id;
      if (!id) {
        return NextResponse.json({ error: "Main Module ID is required" }, { status: 400 });
      }

      const name = (body.name || body.title || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Main Module name is required" }, { status: 400 });
      }

      // Verify Main Module exists
      const { data: existing, error: existError } = await adminClient
        .from("practice_tracks")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (existError || !existing) {
        return NextResponse.json({ error: "Main Module not found" }, { status: 404 });
      }

      const description = body.description !== undefined ? body.description.trim() : existing.description;
      const status = body.status === "inactive" ? "inactive" : "active";
      const displayOrder = typeof body.display_order === "number" ? body.display_order : (typeof body.displayOrder === "number" ? body.displayOrder : 0);

      let existingMeta: any = {};
      if (existing.tags && existing.tags[0]) {
        try { existingMeta = JSON.parse(existing.tags[0]); } catch {}
      }

      const meta = {
        ...existingMeta,
        description,
        status,
        display_order: displayOrder,
        displayOrder,
      };

      if (body.assignedBatches !== undefined) meta.assignedBatches = body.assignedBatches;
      if (body.assignedStudents !== undefined) meta.assignedStudents = body.assignedStudents;
      if (body.isCommon !== undefined) meta.isCommon = Boolean(body.isCommon);

      const updatePayload: any = {
        title: name,
        description,
        status: status === "active" ? "published" : "draft",
        tags: [JSON.stringify(meta)],
        updated_at: new Date().toISOString(),
      };

      if (body.assignedBatches !== undefined) updatePayload.assigned_batches = body.assignedBatches;
      if (body.assignedStudents !== undefined) updatePayload.assigned_students = body.assignedStudents;
      if (body.isCommon !== undefined) updatePayload.is_common = Boolean(body.isCommon);

      const { data: updated, error: updateError } = await adminClient
        .from("practice_tracks")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: "Main Module updated successfully",
        main_module: {
          id: updated.id,
          name: updated.title,
          title: updated.title,
          description: updated.description,
          status,
          display_order: displayOrder,
          updated_at: updated.updated_at,
        },
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION 3: CREATE SUBMODULE (Level 2)
    // ─────────────────────────────────────────────────────────
    if (action === "create_submodule") {
      const mainModuleId = body.main_module_id || body.mainModuleId;
      if (!mainModuleId) {
        return NextResponse.json({ error: "Parent Main Module ID is required" }, { status: 400 });
      }

      const name = (body.name || body.title || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Submodule name is required" }, { status: 400 });
      }

      // Verify parent Main Module exists
      const { data: mainTrack, error: mainError } = await adminClient
        .from("practice_tracks")
        .select("*")
        .eq("id", mainModuleId)
        .maybeSingle();

      if (mainError || !mainTrack) {
        return NextResponse.json({ error: "Parent Main Module not found" }, { status: 404 });
      }

      let meta: any = {};
      if (mainTrack.tags && mainTrack.tags[0]) {
        try { meta = JSON.parse(mainTrack.tags[0]); } catch {}
      }

      const currentSubmodules = normalizeSubmodules(meta.subModules || mainTrack.sub_modules || [], mainTrack.id);
      const newSubmoduleId = randomUUID();
      const status = body.status === "inactive" ? "inactive" : "active";
      const displayOrder = typeof body.display_order === "number" ? body.display_order : (typeof body.displayOrder === "number" ? body.displayOrder : currentSubmodules.length);

      const newSubmodule = {
        id: newSubmoduleId,
        main_module_id: mainModuleId,
        mainModuleId: mainModuleId,
        name,
        title: name,
        description: (body.description || "").trim(),
        status,
        display_order: displayOrder,
        displayOrder,
        modules: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      currentSubmodules.push(newSubmodule);
      currentSubmodules.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      meta.subModules = currentSubmodules;

      const { error: updateError } = await adminClient
        .from("practice_tracks")
        .update({
          sub_modules: currentSubmodules,
          tags: [JSON.stringify(meta)],
          updated_at: new Date().toISOString(),
        })
        .eq("id", mainModuleId);

      if (updateError) throw updateError;

      // Also sync to practice_submodules table if it exists
      try {
        await adminClient.from("practice_submodules").insert({
          id: newSubmoduleId,
          main_module_id: mainModuleId,
          name,
          description: body.description || "",
          status,
          display_order: displayOrder,
        });
      } catch (e) {
        // Safe fallback if table migration not executed yet
      }

      return NextResponse.json({
        success: true,
        message: "Submodule created successfully",
        submodule: newSubmodule,
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION 4: UPDATE SUBMODULE (Level 2)
    // ─────────────────────────────────────────────────────────
    if (action === "update_submodule") {
      const mainModuleId = body.main_module_id || body.mainModuleId;
      const submoduleId = body.id || body.submodule_id || body.submoduleId;

      if (!mainModuleId || !submoduleId) {
        return NextResponse.json({ error: "Main Module ID and Submodule ID are required" }, { status: 400 });
      }

      const name = (body.name || body.title || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Submodule name is required" }, { status: 400 });
      }

      const { data: mainTrack, error: mainError } = await adminClient
        .from("practice_tracks")
        .select("*")
        .eq("id", mainModuleId)
        .maybeSingle();

      if (mainError || !mainTrack) {
        return NextResponse.json({ error: "Parent Main Module not found" }, { status: 404 });
      }

      let meta: any = {};
      if (mainTrack.tags && mainTrack.tags[0]) {
        try { meta = JSON.parse(mainTrack.tags[0]); } catch {}
      }

      const currentSubmodules = normalizeSubmodules(meta.subModules || mainTrack.sub_modules || [], mainTrack.id);
      const subIdx = currentSubmodules.findIndex((s) => s.id === submoduleId);

      if (subIdx === -1) {
        return NextResponse.json({ error: "Submodule does not belong to this Main Module" }, { status: 404 });
      }

      const targetSub = currentSubmodules[subIdx];
      const status = body.status === "inactive" ? "inactive" : "active";
      const displayOrder = typeof body.display_order === "number" ? body.display_order : (typeof body.displayOrder === "number" ? body.displayOrder : targetSub.display_order);

      const updatedSubmodule = {
        ...targetSub,
        name,
        title: name,
        description: body.description !== undefined ? body.description.trim() : targetSub.description,
        status,
        display_order: displayOrder,
        displayOrder,
        updated_at: new Date().toISOString(),
      };

      currentSubmodules[subIdx] = updatedSubmodule;
      currentSubmodules.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      meta.subModules = currentSubmodules;

      const { error: updateError } = await adminClient
        .from("practice_tracks")
        .update({
          sub_modules: currentSubmodules,
          tags: [JSON.stringify(meta)],
          updated_at: new Date().toISOString(),
        })
        .eq("id", mainModuleId);

      if (updateError) throw updateError;

      try {
        await adminClient.from("practice_submodules").update({
          name,
          description: updatedSubmodule.description,
          status,
          display_order: displayOrder,
          updated_at: new Date().toISOString(),
        }).eq("id", submoduleId);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: "Submodule updated successfully",
        submodule: updatedSubmodule,
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION 5: DELETE SUBMODULE (Level 2)
    // ─────────────────────────────────────────────────────────
    if (action === "delete_submodule") {
      const mainModuleId = body.main_module_id || body.mainModuleId;
      const submoduleId = body.id || body.submodule_id || body.submoduleId;

      if (!mainModuleId || !submoduleId) {
        return NextResponse.json({ error: "Main Module ID and Submodule ID are required" }, { status: 400 });
      }

      const { data: mainTrack, error: mainError } = await adminClient
        .from("practice_tracks")
        .select("*")
        .eq("id", mainModuleId)
        .maybeSingle();

      if (mainError || !mainTrack) {
        return NextResponse.json({ error: "Parent Main Module not found" }, { status: 404 });
      }

      let meta: any = {};
      if (mainTrack.tags && mainTrack.tags[0]) {
        try { meta = JSON.parse(mainTrack.tags[0]); } catch {}
      }

      let currentSubmodules = normalizeSubmodules(meta.subModules || mainTrack.sub_modules || [], mainTrack.id);
      currentSubmodules = currentSubmodules.filter((s) => s.id !== submoduleId);
      meta.subModules = currentSubmodules;

      const { error: updateError } = await adminClient
        .from("practice_tracks")
        .update({
          sub_modules: currentSubmodules,
          tags: [JSON.stringify(meta)],
          updated_at: new Date().toISOString(),
        })
        .eq("id", mainModuleId);

      if (updateError) throw updateError;

      try {
        await adminClient.from("practice_submodules").delete().eq("id", submoduleId);
      } catch (e) {}

      return NextResponse.json({ success: true, message: "Submodule deleted successfully" });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION 6: CREATE MODULE (Level 3)
    // ─────────────────────────────────────────────────────────
    if (action === "create_module") {
      const mainModuleId = body.main_module_id || body.mainModuleId;
      const submoduleId = body.submodule_id || body.submoduleId;

      if (!mainModuleId || !submoduleId) {
        return NextResponse.json({ error: "Parent Main Module and Submodule IDs are required" }, { status: 400 });
      }

      const name = (body.name || body.title || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Module name is required" }, { status: 400 });
      }

      const { data: mainTrack, error: mainError } = await adminClient
        .from("practice_tracks")
        .select("*")
        .eq("id", mainModuleId)
        .maybeSingle();

      if (mainError || !mainTrack) {
        return NextResponse.json({ error: "Parent Main Module not found" }, { status: 404 });
      }

      let meta: any = {};
      if (mainTrack.tags && mainTrack.tags[0]) {
        try { meta = JSON.parse(mainTrack.tags[0]); } catch {}
      }

      const currentSubmodules = normalizeSubmodules(meta.subModules || mainTrack.sub_modules || [], mainTrack.id);
      const subIdx = currentSubmodules.findIndex((s) => s.id === submoduleId);

      if (subIdx === -1) {
        return NextResponse.json({ error: "Parent Submodule not found in this Main Module" }, { status: 404 });
      }

      const targetSub = currentSubmodules[subIdx];
      const newModuleId = randomUUID();
      const status = body.status === "inactive" ? "inactive" : "active";
      const displayOrder = typeof body.display_order === "number" ? body.display_order : (typeof body.displayOrder === "number" ? body.displayOrder : targetSub.modules.length);

      const mcqQuestions = Array.isArray(body.mcqQuestions) ? body.mcqQuestions : [];
      const codingQuestions = Array.isArray(body.codingQuestions) ? body.codingQuestions : [];
      const questionCount = mcqQuestions.length + codingQuestions.length || body.questionCount || 0;

      const totalMarks = typeof body.totalMarks === "number" ? body.totalMarks : (typeof body.total_marks === "number" ? body.total_marks : 100);
      if (isNaN(totalMarks) || totalMarks < 1) {
        return NextResponse.json({ error: "Total marks must be a positive number of at least 1" }, { status: 400 });
      }

      const passingMarks = typeof body.passingMarks === "number" ? body.passingMarks : (typeof body.passing_marks === "number" ? body.passing_marks : 40);
      if (isNaN(passingMarks) || passingMarks < 0 || passingMarks > totalMarks) {
        return NextResponse.json({
          error: `Passing marks (${passingMarks}) cannot be negative and cannot exceed total marks (${totalMarks})`,
        }, { status: 400 });
      }

      const allowedAttempts = typeof body.allowedAttempts === "number" ? body.allowedAttempts : 3;
      if (isNaN(allowedAttempts) || allowedAttempts < 1) {
        return NextResponse.json({ error: "Allowed attempts must be at least 1" }, { status: 400 });
      }

      const allQuestions = [...mcqQuestions, ...codingQuestions];
      if (allQuestions.length > 0) {
        const markValidation = validateModuleMarks(totalMarks, allQuestions, status !== "active");
        if (!markValidation.isValid) {
          return NextResponse.json({
            error: markValidation.errorMessage || "The sum of question marks must match the configured module total marks.",
            details: markValidation,
          }, { status: 400 });
        }
      }

      const newModule = {
        id: newModuleId,
        submodule_id: submoduleId,
        submoduleId: submoduleId,
        main_module_id: mainModuleId,
        mainModuleId: mainModuleId,
        name,
        title: name,
        description: (body.description || "").trim(),
        status,
        display_order: displayOrder,
        displayOrder,
        type: body.type || "mixed",
        durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : 60,
        totalMarks,
        total_marks: totalMarks,
        questionCount,
        allowedAttempts,
        reattemptEnabled: typeof body.reattemptEnabled === "boolean" ? body.reattemptEnabled : true,
        reviewEnabled: typeof body.reviewEnabled === "boolean" ? body.reviewEnabled : true,
        passingMarks,
        completionRule: body.completionRule || "submit",
        mcqSectionTitle: (body.mcqSectionTitle || body.mcq_section_title || "Section 1: MCQs").trim(),
        codingSectionTitle: (body.codingSectionTitle || body.coding_section_title || "Section 2: Coding").trim(),
        mcqQuestions,
        codingQuestions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      targetSub.modules.push(newModule);
      targetSub.modules.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
      targetSub.updated_at = new Date().toISOString();

      meta.subModules = currentSubmodules;

      const { error: updateError } = await adminClient
        .from("practice_tracks")
        .update({
          sub_modules: currentSubmodules,
          tags: [JSON.stringify(meta)],
          updated_at: new Date().toISOString(),
        })
        .eq("id", mainModuleId);

      if (updateError) throw updateError;

      try {
        await adminClient.from("practice_modules").insert({
          id: newModuleId,
          submodule_id: submoduleId,
          name,
          description: body.description || "",
          status,
          display_order: displayOrder,
          type: newModule.type,
          duration_minutes: newModule.durationMinutes,
          total_marks: newModule.totalMarks,
          question_count: questionCount,
          mcq_questions: mcqQuestions,
          coding_questions: codingQuestions,
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: "Module created successfully",
        module: newModule,
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION 7: UPDATE MODULE (Level 3)
    // ─────────────────────────────────────────────────────────
    if (action === "update_module") {
      const mainModuleId = body.main_module_id || body.mainModuleId;
      const submoduleId = body.submodule_id || body.submoduleId;
      const moduleId = body.id || body.module_id || body.moduleId;

      if (!mainModuleId || !submoduleId || !moduleId) {
        return NextResponse.json({ error: "Main Module, Submodule, and Module IDs are required" }, { status: 400 });
      }

      const name = (body.name || body.title || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Module name is required" }, { status: 400 });
      }

      const { data: mainTrack, error: mainError } = await adminClient
        .from("practice_tracks")
        .select("*")
        .eq("id", mainModuleId)
        .maybeSingle();

      if (mainError || !mainTrack) {
        return NextResponse.json({ error: "Parent Main Module not found" }, { status: 404 });
      }

      let meta: any = {};
      if (mainTrack.tags && mainTrack.tags[0]) {
        try { meta = JSON.parse(mainTrack.tags[0]); } catch {}
      }

      const currentSubmodules = normalizeSubmodules(meta.subModules || mainTrack.sub_modules || [], mainTrack.id);
      const targetSub = currentSubmodules.find((s) => s.id === submoduleId);

      if (!targetSub) {
        return NextResponse.json({ error: "Submodule not found in this Main Module" }, { status: 404 });
      }

      const modIdx = targetSub.modules.findIndex((m: any) => m.id === moduleId);
      if (modIdx === -1) {
        return NextResponse.json({ error: "Module not found in this Submodule" }, { status: 404 });
      }

      const existingMod = targetSub.modules[modIdx];
      const status = body.status === "inactive" ? "inactive" : "active";
      const displayOrder = typeof body.display_order === "number" ? body.display_order : (typeof body.displayOrder === "number" ? body.displayOrder : existingMod.display_order);

      const mcqQuestions = Array.isArray(body.mcqQuestions) ? body.mcqQuestions : existingMod.mcqQuestions || [];
      const codingQuestions = Array.isArray(body.codingQuestions) ? body.codingQuestions : existingMod.codingQuestions || [];
      const questionCount = mcqQuestions.length + codingQuestions.length || body.questionCount || existingMod.questionCount || 0;

      const totalMarks = typeof body.totalMarks === "number" ? body.totalMarks : (typeof body.total_marks === "number" ? body.total_marks : (existingMod.totalMarks ?? 100));
      if (isNaN(totalMarks) || totalMarks < 1) {
        return NextResponse.json({ error: "Total marks must be a positive number of at least 1" }, { status: 400 });
      }

      const passingMarks = typeof body.passingMarks === "number" ? body.passingMarks : (typeof body.passing_marks === "number" ? body.passing_marks : (existingMod.passingMarks ?? 40));
      if (isNaN(passingMarks) || passingMarks < 0 || passingMarks > totalMarks) {
        return NextResponse.json({
          error: `Passing marks (${passingMarks}) cannot be negative and cannot exceed total marks (${totalMarks})`,
        }, { status: 400 });
      }

      const allowedAttempts = typeof body.allowedAttempts === "number" ? body.allowedAttempts : (existingMod.allowedAttempts ?? 3);
      if (isNaN(allowedAttempts) || allowedAttempts < 1) {
        return NextResponse.json({ error: "Allowed attempts must be at least 1" }, { status: 400 });
      }

      const allQuestions = [...mcqQuestions, ...codingQuestions];
      if (allQuestions.length > 0) {
        const markValidation = validateModuleMarks(totalMarks, allQuestions, status !== "active");
        if (!markValidation.isValid) {
          return NextResponse.json({
            error: markValidation.errorMessage || "The sum of question marks must match the configured module total marks.",
            details: markValidation,
          }, { status: 400 });
        }
      }

      const updatedModule = {
        ...existingMod,
        name,
        title: name,
        description: body.description !== undefined ? body.description.trim() : existingMod.description,
        status,
        display_order: displayOrder,
        displayOrder,
        type: body.type || existingMod.type || "mixed",
        durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : existingMod.durationMinutes,
        totalMarks,
        total_marks: totalMarks,
        questionCount,
        allowedAttempts,
        reattemptEnabled: typeof body.reattemptEnabled === "boolean" ? body.reattemptEnabled : (existingMod.reattemptEnabled ?? true),
        reviewEnabled: typeof body.reviewEnabled === "boolean" ? body.reviewEnabled : (existingMod.reviewEnabled ?? true),
        passingMarks,
        completionRule: body.completionRule || existingMod.completionRule || "submit",
        mcqSectionTitle: body.mcqSectionTitle !== undefined ? body.mcqSectionTitle.trim() : (existingMod.mcqSectionTitle || "Section 1: MCQs"),
        codingSectionTitle: body.codingSectionTitle !== undefined ? body.codingSectionTitle.trim() : (existingMod.codingSectionTitle || "Section 2: Coding"),
        mcqQuestions,
        codingQuestions,
        updated_at: new Date().toISOString(),
      };

      targetSub.modules[modIdx] = updatedModule;
      targetSub.modules.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
      targetSub.updated_at = new Date().toISOString();

      meta.subModules = currentSubmodules;

      const { error: updateError } = await adminClient
        .from("practice_tracks")
        .update({
          sub_modules: currentSubmodules,
          tags: [JSON.stringify(meta)],
          updated_at: new Date().toISOString(),
        })
        .eq("id", mainModuleId);

      if (updateError) throw updateError;

      try {
        await adminClient.from("practice_modules").update({
          name,
          description: updatedModule.description,
          status,
          display_order: displayOrder,
          type: updatedModule.type,
          duration_minutes: updatedModule.durationMinutes,
          total_marks: updatedModule.totalMarks,
          question_count: questionCount,
          mcq_questions: mcqQuestions,
          coding_questions: codingQuestions,
          updated_at: new Date().toISOString(),
        }).eq("id", moduleId);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: "Module updated successfully",
        module: updatedModule,
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION 8: DELETE MODULE (Level 3)
    // ─────────────────────────────────────────────────────────
    if (action === "delete_module") {
      const mainModuleId = body.main_module_id || body.mainModuleId;
      const submoduleId = body.submodule_id || body.submoduleId;
      const moduleId = body.id || body.module_id || body.moduleId;

      if (!mainModuleId || !submoduleId || !moduleId) {
        return NextResponse.json({ error: "Main Module, Submodule, and Module IDs are required" }, { status: 400 });
      }

      const { data: mainTrack, error: mainError } = await adminClient
        .from("practice_tracks")
        .select("*")
        .eq("id", mainModuleId)
        .maybeSingle();

      if (mainError || !mainTrack) {
        return NextResponse.json({ error: "Parent Main Module not found" }, { status: 404 });
      }

      let meta: any = {};
      if (mainTrack.tags && mainTrack.tags[0]) {
        try { meta = JSON.parse(mainTrack.tags[0]); } catch {}
      }

      const currentSubmodules = normalizeSubmodules(meta.subModules || mainTrack.sub_modules || [], mainTrack.id);
      const targetSub = currentSubmodules.find((s) => s.id === submoduleId);

      if (!targetSub) {
        return NextResponse.json({ error: "Submodule not found in this Main Module" }, { status: 404 });
      }

      targetSub.modules = targetSub.modules.filter((m: any) => m.id !== moduleId);
      targetSub.updated_at = new Date().toISOString();

      meta.subModules = currentSubmodules;

      const { error: updateError } = await adminClient
        .from("practice_tracks")
        .update({
          sub_modules: currentSubmodules,
          tags: [JSON.stringify(meta)],
          updated_at: new Date().toISOString(),
        })
        .eq("id", mainModuleId);

      if (updateError) throw updateError;

      try {
        await adminClient.from("practice_modules").delete().eq("id", moduleId);
      } catch (e) {}

      return NextResponse.json({ success: true, message: "Module deleted successfully" });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION 9: REORDER
    // ─────────────────────────────────────────────────────────
    if (action === "reorder") {
      const { level, items, main_module_id, submodule_id } = body;

      if (level === "main_module" && Array.isArray(items)) {
        for (const it of items) {
          if (!it.id) continue;
          await adminClient
            .from("practice_tracks")
            .update({ display_order: it.display_order })
            .eq("id", it.id);
        }
        return NextResponse.json({ success: true, message: "Main Modules reordered" });
      }

      if (level === "submodule" && main_module_id && Array.isArray(items)) {
        const { data: mainTrack } = await adminClient
          .from("practice_tracks")
          .select("*")
          .eq("id", main_module_id)
          .maybeSingle();

        if (mainTrack) {
          let meta: any = {};
          if (mainTrack.tags && mainTrack.tags[0]) {
            try { meta = JSON.parse(mainTrack.tags[0]); } catch {}
          }
          const currentSubmodules = normalizeSubmodules(meta.subModules || mainTrack.sub_modules || [], mainTrack.id);
          const orderMap = new Map<string, number>(items.map((i: any) => [i.id, i.display_order]));
          currentSubmodules.forEach((sm) => {
            if (orderMap.has(sm.id)) {
              sm.display_order = orderMap.get(sm.id)!;
              sm.displayOrder = sm.display_order;
            }
          });
          currentSubmodules.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
          meta.subModules = currentSubmodules;
          await adminClient
            .from("practice_tracks")
            .update({ sub_modules: currentSubmodules, tags: [JSON.stringify(meta)], updated_at: new Date().toISOString() })
            .eq("id", main_module_id);
        }
        return NextResponse.json({ success: true, message: "Submodules reordered" });
      }

      if (level === "module" && main_module_id && submodule_id && Array.isArray(items)) {
        const { data: mainTrack } = await adminClient
          .from("practice_tracks")
          .select("*")
          .eq("id", main_module_id)
          .maybeSingle();

        if (mainTrack) {
          let meta: any = {};
          if (mainTrack.tags && mainTrack.tags[0]) {
            try { meta = JSON.parse(mainTrack.tags[0]); } catch {}
          }
          const currentSubmodules = normalizeSubmodules(meta.subModules || mainTrack.sub_modules || [], mainTrack.id);
          const targetSub = currentSubmodules.find((s) => s.id === submodule_id);
          if (targetSub) {
            const orderMap = new Map<string, number>(items.map((i: any) => [i.id, i.display_order]));
            targetSub.modules.forEach((m: any) => {
              if (orderMap.has(m.id)) {
                m.display_order = orderMap.get(m.id)!;
                m.displayOrder = m.display_order;
              }
            });
            targetSub.modules.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
            meta.subModules = currentSubmodules;
            await adminClient
              .from("practice_tracks")
              .update({ sub_modules: currentSubmodules, tags: [JSON.stringify(meta)], updated_at: new Date().toISOString() })
              .eq("id", main_module_id);
          }
        }
        return NextResponse.json({ success: true, message: "Modules reordered" });
      }
    }

    // ─────────────────────────────────────────────────────────
    // BACKWARD COMPATIBILITY: Legacy track or tracks save
    // ─────────────────────────────────────────────────────────
    const { track, tracks } = body;
    const tracksToSave = tracks || (track ? [track] : []);

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
      const explicitCommon =
        t.isCommon !== undefined
          ? (t.isCommon === true || String(t.isCommon) === "true")
          : t.is_common !== undefined
          ? (t.is_common === true || String(t.is_common) === "true")
          : null;

      const rawAssignedBatches = t.assignedBatches || t.assigned_batches || [];
      const rawAssignedStudents = t.assignedStudents || t.assigned_students || [];

      const isCommon: boolean =
        explicitCommon !== null
          ? explicitCommon
          : rawAssignedBatches.length === 0 && rawAssignedStudents.length === 0;

      const assignedBatches: string[] = isCommon ? [] : rawAssignedBatches;
      const assignedStudentsArray: string[] = isCommon ? [] : rawAssignedStudents;
      const rawSub = t.submodules || t.subModules || t.sub_modules || [];
      const normalizedSubs = normalizeSubmodules(rawSub, t.id || "pending");

      const meta = {
        description: t.description || "",
        thumbnail: t.thumbnail || "",
        status: t.status === "inactive" || t.status === "draft" ? "draft" : "published",
        isCommon,
        is_common: isCommon,
        assignedBatches,
        assigned_batches: assignedBatches,
        assignedStudents: assignedStudentsArray,
        assigned_students: assignedStudentsArray,
        assignedByName: t.assignedByName || t.assigned_by_name || "Admin",
        subModules: normalizedSubs,
        display_order: t.display_order ?? t.displayOrder ?? 0,
      };

      const payload: any = {
        title: (t.name || t.title || "Untitled Track").trim(),
        category: t.category || "General",
        difficulty: t.difficulty || "medium",
        description: t.description || "",
        thumbnail: t.thumbnail || "",
        assigned_batches: assignedBatches,
        assigned_students: assignedStudentsArray,
        is_common: isCommon,
        assigned_by_name: t.assignedByName || t.assigned_by_name || "Admin",
        sub_modules: normalizedSubs,
        status: t.status === "inactive" || t.status === "draft" ? "draft" : "published",
        tags: [JSON.stringify(meta)],
      };

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
      let trackId: string | null = isUUID ? t.id : null;

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

      if (trackId) {
        payload.id = trackId;
        const { error } = await adminClient
          .from("practice_tracks")
          .upsert(payload, { onConflict: "id" });
        if (error) {
          await adminClient.from("practice_tracks").update(payload).eq("id", trackId);
        }
      } else {
        await adminClient.from("practice_tracks").insert(payload);
      }
    }

    try {
      const trackTitle = (tracksToSave[0]?.title || tracksToSave[0]?.name || "Technical Practice Track").trim();
      const trackId = tracksToSave[0]?.id || "practice";
      const isCommon = tracksToSave[0]?.isCommon ?? true;
      const assignedBatches = tracksToSave[0]?.assignedBatches || [];

      if (isCommon) {
        dispatchBatchNotification({
          isCommon: true,
          eventType: "practice_assigned",
          title: `New Practice Assigned: ${trackTitle}`,
          message: `A new hands-on technical practice track "${trackTitle}" has been added to your workspace.`,
          resourceType: "practice",
          resourceId: trackId,
          targetUrl: `/student/practices`,
          assignedBy: "SensiLearn Trainer",
        }).catch((e) => console.warn("Practice batch notification error:", e));
      } else if (assignedBatches.length > 0) {
        for (const bName of assignedBatches) {
          dispatchBatchNotification({
            batchName: bName,
            eventType: "practice_assigned",
            title: `New Practice Assigned: ${trackTitle}`,
            message: `A new practice track "${trackTitle}" has been assigned to cohort ${bName}.`,
            resourceType: "practice",
            resourceId: trackId,
            targetUrl: `/student/practices`,
            assignedBy: "SensiLearn Trainer",
          }).catch((e) => console.warn("Practice batch notification error:", e));
        }
      }
    } catch (notifErr) {
      console.warn("Practice notification trigger warning:", notifErr);
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
    const type = searchParams.get("type") || "main_module";
    const id = searchParams.get("id");
    const mainModuleId = searchParams.get("main_module_id") || searchParams.get("mainModuleId");
    const submoduleId = searchParams.get("submodule_id") || searchParams.get("submoduleId");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    // 1. DELETE MODULE (Level 3)
    if (type === "module") {
      if (!mainModuleId || !submoduleId) {
        return NextResponse.json({ error: "Missing parent IDs" }, { status: 400 });
      }

      const { data: track } = await adminClient
        .from("practice_tracks")
        .select("*")
        .eq("id", mainModuleId)
        .maybeSingle();

      if (!track) {
        return NextResponse.json({ error: "Main module not found" }, { status: 404 });
      }

      let meta: any = {};
      if (track.tags && track.tags[0]) {
        try { meta = JSON.parse(track.tags[0]); } catch {}
      }

      const currentSubmodules = normalizeSubmodules(meta.subModules || track.sub_modules || [], track.id);
      const targetSub = currentSubmodules.find((s) => s.id === submoduleId);
      if (targetSub) {
        targetSub.modules = targetSub.modules.filter((m: any) => m.id !== id);
        meta.subModules = currentSubmodules;
        await adminClient
          .from("practice_tracks")
          .update({ sub_modules: currentSubmodules, tags: [JSON.stringify(meta)], updated_at: new Date().toISOString() })
          .eq("id", mainModuleId);
      }

      try {
        await adminClient.from("practice_modules").delete().eq("id", id);
      } catch (e) {}

      return NextResponse.json({ success: true, message: "Module deleted successfully" });
    }

    // 2. DELETE SUBMODULE (Level 2)
    if (type === "submodule") {
      if (!mainModuleId) {
        return NextResponse.json({ error: "Missing parent Main Module ID" }, { status: 400 });
      }

      const { data: track } = await adminClient
        .from("practice_tracks")
        .select("*")
        .eq("id", mainModuleId)
        .maybeSingle();

      if (!track) {
        return NextResponse.json({ error: "Main module not found" }, { status: 404 });
      }

      let meta: any = {};
      if (track.tags && track.tags[0]) {
        try { meta = JSON.parse(track.tags[0]); } catch {}
      }

      let currentSubmodules = normalizeSubmodules(meta.subModules || track.sub_modules || [], track.id);
      currentSubmodules = currentSubmodules.filter((s) => s.id !== id);
      meta.subModules = currentSubmodules;

      await adminClient
        .from("practice_tracks")
        .update({ sub_modules: currentSubmodules, tags: [JSON.stringify(meta)], updated_at: new Date().toISOString() })
        .eq("id", mainModuleId);

      try {
        await adminClient.from("practice_submodules").delete().eq("id", id);
      } catch (e) {}

      return NextResponse.json({ success: true, message: "Submodule deleted successfully" });
    }

    // 3. DELETE MAIN MODULE (Level 1)
    const { error } = await adminClient.from("practice_tracks").delete().eq("id", id);

    if (error) {
      throw error;
    }

    try {
      await adminClient.from("practice_submodules").delete().eq("main_module_id", id);
    } catch (e) {}

    return NextResponse.json({ success: true, message: "Main module deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/practices error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
