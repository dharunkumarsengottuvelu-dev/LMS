import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch assignments
    const { data: assignmentsData, error: assignError } = await adminClient
      .from("assignments")
      .select("*")
      .order("created_at", { ascending: false });

    if (assignError) throw assignError;

    // 2. Fetch batches
    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, college_name");

    const mappedBatches: any[] = (batchesData || []).map((b: any) => ({
      id: b.id,
      name: b.name || b.batch_name,
      collegeName: b.college_name || "",
    }));

    // 3. Fetch submissions for count
    const { data: submissionsData } = await adminClient
      .from("assignment_submissions")
      .select("assignment_id, status");

    const submissionsCountMap = new Map<string, number>();
    (submissionsData || []).forEach((s: any) => {
      const current = submissionsCountMap.get(s.assignment_id) || 0;
      submissionsCountMap.set(s.assignment_id, current + 1);
    });

    const mappedAssignments = (assignmentsData || []).map((a: any) => {
      let meta: any = {};
      if (a.tags && a.tags[0]) {
        try {
          meta = JSON.parse(a.tags[0]);
        } catch {}
      }

      const assignedBatches =
        a.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        [];

      const isCommon =
        a.is_common !== undefined
          ? a.is_common
          : meta.isCommon !== undefined
          ? meta.isCommon
          : assignedBatches.length === 0;

      return {
        id: a.id,
        title: a.title,
        description: a.description || "",
        courseId: a.course_id,
        deadline: a.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
        maxMarks: a.max_marks || 100,
        instructions: a.instructions || a.description || "",
        isCommon,
        assignedBatches,
        submissionCount: submissionsCountMap.get(a.id) || 0,
        createdAt: a.created_at,
      };
    });

    return NextResponse.json({
      assignments: mappedAssignments,
      batches: mappedBatches,
    });
  } catch (error) {
    console.error("GET /api/admin/assignments error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();

    const title = (body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Assignment title is required." }, { status: 400 });
    }

    const assignedBatches: string[] = body.assignedBatches || body.assigned_batches || [];
    const isCommon: boolean = body.isCommon !== undefined ? body.isCommon : assignedBatches.length === 0;

    const meta = {
      isCommon,
      assignedBatches: isCommon ? [] : assignedBatches,
      instructions: body.instructions || body.description || "",
    };

    const payload: any = {
      title,
      description: body.description || title,
      instructions: body.instructions || body.description || "",
      deadline: body.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
      max_marks: body.maxMarks || body.max_marks || 100,
      assigned_batches: isCommon ? [] : assignedBatches,
      is_common: isCommon,
      tags: [JSON.stringify(meta)],
    };

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id);
    if (isUUID) {
      payload.id = body.id;
    }

    const { data, error } = await adminClient
      .from("assignments")
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, assignment: data });
  } catch (error) {
    console.error("POST /api/admin/assignments error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 });
    }

    const { error } = await adminClient
      .from("assignments")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/assignments error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
