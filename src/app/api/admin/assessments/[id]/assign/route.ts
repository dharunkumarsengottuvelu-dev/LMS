import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const body = await request.json();

    if (!body.assigned_to_type || !body.assigned_to_id) {
      return NextResponse.json(
        { error: "Missing required fields (assigned_to_type, assigned_to_id)" },
        { status: 400 }
      );
    }

    if (!["student", "batch", "course"].includes(body.assigned_to_type)) {
      return NextResponse.json(
        { error: "Invalid assigned_to_type. Must be 'student', 'batch', or 'course'." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Verify assessment exists
    const { data: assessment, error: checkError } = await supabase
      .from("assessments")
      .select("id")
      .eq("id", assessmentId)
      .single();

    if (checkError || !assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // 2. Resolve assigned_by to a valid profile UUID
    let assignedByProfileId = body.assigned_by;
    if (!assignedByProfileId || !UUID_REGEX.test(assignedByProfileId)) {
      // Find an admin or trainer profile
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "trainer"])
        .limit(1)
        .maybeSingle() as any;

      if (adminProfile) {
        assignedByProfileId = adminProfile.id;
      } else {
        const { data: anyProfile } = await supabase
          .from("profiles")
          .select("id")
          .limit(1)
          .maybeSingle() as any;
        assignedByProfileId = anyProfile?.id;
      }
    }

    // 3. Resolve assigned_to_id if necessary
    let resolvedTargetId = body.assigned_to_id;
    if (body.assigned_to_type === "batch" && !UUID_REGEX.test(resolvedTargetId)) {
      const { data: batchRow } = await supabase
        .from("batches")
        .select("id")
        .ilike("name", resolvedTargetId)
        .limit(1)
        .maybeSingle() as any;

      if (batchRow?.id) {
        resolvedTargetId = batchRow.id;
      }
    } else if (body.assigned_to_type === "student" && !UUID_REGEX.test(resolvedTargetId)) {
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("id")
        .or(`email.eq.${resolvedTargetId},user_id.eq.${resolvedTargetId}`)
        .limit(1)
        .maybeSingle() as any;

      if (studentProfile?.id) {
        resolvedTargetId = studentProfile.id;
      }
    }

    // 4. Check if duplicate assignment exists
    const { data: existingAssignment } = await supabase
      .from("assessment_assignments")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("assigned_to_type", body.assigned_to_type)
      .eq("assigned_to_id", resolvedTargetId)
      .maybeSingle() as any;

    if (existingAssignment) {
      return NextResponse.json({ success: true, assignment: existingAssignment, message: "Already assigned" }, { status: 200 });
    }

    // 5. Insert assignment
    const { data: assignment, error: assignError } = await supabase
      .from("assessment_assignments")
      .insert({
        assessment_id: assessmentId,
        assigned_to_type: body.assigned_to_type,
        assigned_to_id: resolvedTargetId,
        assigned_by: assignedByProfileId,
      })
      .select()
      .single();

    if (assignError) {
      console.error("Assignment Error:", assignError);
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 });

  } catch (error: unknown) {
    console.error("POST /api/admin/assessments/[id]/assign Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
