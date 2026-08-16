import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;
    const adminClient = createAdminClient();

    // 1. Fetch batch members for this batch
    const { data: members, error: membersError } = await adminClient
      .from("batch_members")
      .select("user_id, joined_at")
      .eq("batch_id", batchId);

    if (membersError) throw membersError;

    const assignedUserIds = new Set((members || []).map((m: any) => m.user_id));

    // 2. Fetch all student profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, batch_id, batch_name, role")
      .eq("role", "student")
      .order("first_name", { ascending: true });

    if (profilesError) throw profilesError;

    const enrolledStudents: any[] = [];
    const availableStudents: any[] = [];

    (profiles || []).forEach((p: any) => {
      const isEnrolled =
        assignedUserIds.has(p.id) ||
        assignedUserIds.has(p.user_id) ||
        p.batch_id === batchId;

      const stdObj = {
        id: p.id,
        userId: p.user_id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email?.split("@")[0] || "Student",
        email: p.email,
        batch: p.batch_name || (isEnrolled ? "Assigned" : "Unassigned"),
        isEnrolled,
      };

      if (isEnrolled) {
        enrolledStudents.push(stdObj);
      } else {
        availableStudents.push(stdObj);
      }
    });

    return NextResponse.json({
      enrolledStudents,
      availableStudents,
      totalEnrolled: enrolledStudents.length,
    });
  } catch (error) {
    console.error("GET /api/admin/batches/[id]/students error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;
    const adminClient = createAdminClient();
    const body = await request.json();

    const studentIds: string[] = body.studentIds || (body.studentId ? [body.studentId] : []);

    if (studentIds.length === 0) {
      return NextResponse.json({ error: "No students provided to assign" }, { status: 400 });
    }

    // Insert into batch_members
    const rows = studentIds.map((userId) => ({
      batch_id: batchId,
      user_id: userId,
    }));

    const { data, error } = await adminClient
      .from("batch_members")
      .upsert(rows, { onConflict: "batch_id,user_id" })
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Assigned ${studentIds.length} student(s) to batch`,
      assigned: data,
    });
  } catch (error) {
    console.error("POST /api/admin/batches/[id]/students error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId query parameter" }, { status: 400 });
    }

    const { error } = await adminClient
      .from("batch_members")
      .delete()
      .eq("batch_id", batchId)
      .or(`user_id.eq.${studentId}`);

    if (error) throw error;

    // Clear legacy profile batch_id if it pointed to this batch
    await adminClient
      .from("profiles")
      .update({ batch_id: null, batch_name: null, batch: null })
      .eq("batch_id", batchId)
      .or(`id.eq.${studentId},user_id.eq.${studentId}`);

    return NextResponse.json({
      success: true,
      message: "Student removed from batch successfully",
    });
  } catch (error) {
    console.error("DELETE /api/admin/batches/[id]/students error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
