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

    const updatedMeta = {
      ...meta,
      college_name: collegeName,
      collegeName: collegeName,
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
      message: collegeName
        ? `Batch successfully assigned to ${collegeName}`
        : "Batch unassigned from institution",
      batch: {
        id: updatedBatch.id,
        collegeName,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/batches/[id]/assign-institution error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
