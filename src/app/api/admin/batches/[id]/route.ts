import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    const { data: batch, error } = await adminClient
      .from("batches")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Fetch batch members
    const { data: members } = await adminClient
      .from("batch_members")
      .select("user_id")
      .eq("batch_id", id);

    const studentIds = (members || []).map((m: any) => m.user_id);

    // Extract metadata from description
    let meta: any = {};
    try {
      if (batch.description && batch.description.startsWith("{")) {
        meta = JSON.parse(batch.description);
      }
    } catch {}

    const collegeName = meta.collegeName || meta.college_name || "";
    const courseName = meta.courseName || meta.course || meta.courseTrack || "";

    return NextResponse.json({
      batch: {
        id: batch.id,
        name: batch.name || batch.batch_name,
        batchName: batch.name || batch.batch_name,
        code: batch.code || "",
        collegeName,
        course: courseName,
        courseName,
        trainer: batch.trainer_id || "",
        startDate: batch.start_date || "",
        status: batch.status || "active",
        studentIds,
        studentCount: studentIds.length,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/batches/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();
    const body = await request.json();

    // Fetch existing batch to preserve existing description metadata
    const { data: existingBatch } = await adminClient
      .from("batches")
      .select("*")
      .eq("id", id)
      .single();

    let existingMeta: any = {};
    try {
      if (existingBatch?.description && existingBatch.description.startsWith("{")) {
        existingMeta = JSON.parse(existingBatch.description);
      }
    } catch {}

    const collegeInput = body.collegeName !== undefined ? body.collegeName : (body.college_name !== undefined ? body.college_name : existingMeta.collegeName || "");
    const courseInput = body.courseTrack !== undefined ? body.courseTrack : (body.course !== undefined ? body.course : (body.course_name !== undefined ? body.course_name : existingMeta.courseName || ""));

    const newMeta = {
      ...existingMeta,
      college_name: collegeInput,
      collegeName: collegeInput,
      course_name: courseInput,
      courseName: courseInput,
    };

    const payload: Record<string, any> = {
      description: JSON.stringify(newMeta),
    };

    if (body.batchName || body.name) {
      const name = (body.batchName || body.name).trim();
      payload.name = name;
      payload.batch_name = name;
    }
    if (body.code) {
      payload.code = body.code;
    }
    if (body.startDate !== undefined || body.start_date !== undefined) {
      payload.start_date = body.startDate || body.start_date || null;
    }
    if (body.status) {
      payload.status = body.status;
    }

    const { data: updatedBatch, error } = await adminClient
      .from("batches")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      batch: {
        id: updatedBatch.id,
        name: updatedBatch.name || updatedBatch.batch_name,
        batchName: updatedBatch.name || updatedBatch.batch_name,
        code: updatedBatch.code,
        collegeName: collegeInput,
        course: courseInput,
        courseName: courseInput,
        startDate: updatedBatch.start_date || "",
        status: updatedBatch.status || "active",
      },
    });
  } catch (error) {
    console.error("PUT /api/admin/batches/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    // RULE 9 & 20: Safe Batch Deletion
    // 1. Remove student relationships in batch_members
    await adminClient.from("batch_members").delete().eq("batch_id", id);

    // 2. Delete the batch
    const { error } = await adminClient.from("batches").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Batch safely deleted. Student and learning content records preserved.",
    });
  } catch (error) {
    console.error("DELETE /api/admin/batches/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
