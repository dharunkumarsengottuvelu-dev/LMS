import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { authenticateAdminSession } from "@/app/api/admin/_auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin"]);
    if (auth.errorResponse) return auth.errorResponse;
    const adminClient = auth.adminClient || createAdminClient();

    const { id } = await params;
    const body = await request.json();
    const collegeName = (body.collegeName || "").trim();
    const institutionId = (body.institutionId || "").trim();

    // 1. Fetch current batch
    const { data: batch, error: bErr } = await adminClient
      .from("batches")
      .select("*")
      .eq("id", id)
      .single();

    if (bErr || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // 2. Parse existing metadata
    let meta: any = {};
    try {
      if (batch.description && batch.description.startsWith("{")) {
        meta = JSON.parse(batch.description);
      }
    } catch {}

    const existingCollege = (meta.collegeName || meta.college_name || "").trim();
    const existingInstId = (meta.institutionId || meta.institution_id || "").trim();

    // Duplicate Assignment Prevention: If already assigned to this exact institution
    if (
      collegeName &&
      existingCollege.toLowerCase() === collegeName.toLowerCase() &&
      (!institutionId || !existingInstId || existingInstId === institutionId)
    ) {
      return NextResponse.json({
        success: true,
        alreadyAssigned: true,
        message: `Batch "${batch.name || batch.batch_name || id}" is already assigned to ${collegeName}`,
        batch: {
          id: batch.id,
          collegeName,
          institutionId: existingInstId || institutionId || null,
        },
      });
    }

    const updatedMeta = {
      ...meta,
      college_name: collegeName,
      collegeName: collegeName,
      ...(collegeName
        ? {
            institution_id: institutionId || existingInstId || null,
            institutionId: institutionId || existingInstId || null,
          }
        : {
            institution_id: null,
            institutionId: null,
          }),
    };

    // 3. Update batch in database
    const { data: updatedBatch, error: uErr } = await adminClient
      .from("batches")
      .update({
        description: JSON.stringify(updatedMeta),
      })
      .eq("id", id)
      .select()
      .single();

    if (uErr) throw uErr;

    return NextResponse.json({
      success: true,
      alreadyAssigned: false,
      message: collegeName
        ? `Batch successfully assigned to ${collegeName}`
        : "Batch unassigned from institution",
      batch: {
        id: updatedBatch.id,
        collegeName,
        institutionId: updatedMeta.institutionId,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/batches/[id]/assign-institution error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
