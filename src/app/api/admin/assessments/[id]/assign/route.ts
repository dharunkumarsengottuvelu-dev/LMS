import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const body = await request.json();

    if (!body.assigned_to_type || !body.assigned_to_id || !body.assigned_by) {
      return NextResponse.json(
        { error: "Missing required fields (assigned_to_type, assigned_to_id, assigned_by)" },
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

    // Verify assessment exists
    const { data: assessment, error: checkError } = await supabase
      .from("assessments")
      .select("id")
      .eq("id", assessmentId)
      .single();

    if (checkError || !assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Insert assignment
    const { data: assignment, error: assignError } = await supabase
      .from("assessment_assignments")
      .insert({
        assessment_id: assessmentId,
        assigned_to_type: body.assigned_to_type,
        assigned_to_id: body.assigned_to_id,
        assigned_by: body.assigned_by,
      })
      .select()
      .single();

    if (assignError) {
      // Handle unique constraint if they are assigning it twice? There is no unique constraint defined in schema, but good practice
      console.error("Assignment Error:", assignError);
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 });

  } catch (error: unknown) {
    console.error("POST /api/admin/assessments/[id]/assign Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
