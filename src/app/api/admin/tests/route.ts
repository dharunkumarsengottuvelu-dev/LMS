import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
  try {
    const adminClient = createAdminClient();

    const { data: assessmentsData, error: assessmentsError } = await adminClient
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    if (assessmentsError) {
      throw assessmentsError;
    }

    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, college_name");

    const mappedBatches: any[] = (batchesData || []).map((b: any) => ({
      id: b.id,
      name: b.name || b.batch_name,
      collegeName: b.college_name || "",
    }));

    const mappedTests = (assessmentsData || []).map((a: any) => {
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
        (a.course_id ? [a.course_id] : []);

      const isCommon =
        a.is_common !== undefined
          ? a.is_common
          : meta.isCommon !== undefined
          ? meta.isCommon
          : assignedBatches.length === 0;

      return {
        id: a.id,
        title: a.title,
        batch: isCommon ? "Common (All Batches)" : assignedBatches.join(", ") || "Specific Batches",
        duration: a.duration_minutes || a.duration || 60,
        totalQuestions: a.total_questions || 10,
        maxMarks: a.total_marks || (a.total_questions || 10) * 10,
        status: a.status === "active" ? "live" : a.status === "expired" ? "completed" : "scheduled",
        submissionsCount: 0,
        totalEnrolled: 0,
        proctoringFlags: ["Fullscreen Lock", "Tab Switch Security"],
        isCommon,
        assignedBatches,
        questions: [],
        allowedQuestionTypes: a.type === "coding" ? "coding" : a.type === "mixed" ? "both" : "mcq",
        sections: [],
      };
    });

    return NextResponse.json({ tests: mappedTests, batches: mappedBatches });
  } catch (error) {
    console.error("GET /api/admin/tests error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();
    const { test } = body;

    if (!test || !test.title) {
      return NextResponse.json({ error: "Missing test title" }, { status: 400 });
    }

    const assignedBatches: string[] = test.assignedBatches || test.assigned_batches || [];
    const isCommon: boolean =
      test.isCommon !== undefined ? test.isCommon : assignedBatches.length === 0;

    const meta = {
      isCommon,
      assignedBatches: isCommon ? [] : assignedBatches,
      instructions: test.instructions || test.description || "",
      questions: test.questions || [],
      sections: test.sections || [],
    };

    const payload: any = {
      title: test.title,
      description: test.description || `Assessment for ${isCommon ? "all students" : "assigned batches"}`,
      type: test.allowedQuestionTypes === "coding" ? "coding" : test.allowedQuestionTypes === "both" ? "mixed" : "mcq",
      duration_minutes: test.duration || 60,
      duration: test.duration || 60,
      total_questions: test.totalQuestions || 10,
      total_marks: test.maxMarks || 100,
      passing_marks: Math.floor((test.maxMarks || 100) / 2),
      passing_score: Math.floor((test.maxMarks || 100) / 2),
      status: test.status === "live" ? "active" : "draft",
      max_attempts: 1,
      assigned_batches: isCommon ? [] : assignedBatches,
      is_common: isCommon,
      tags: [JSON.stringify(meta)],
    };

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(test.id);
    if (isUUID) {
      payload.id = test.id;
    }

    const { data, error } = await adminClient
      .from("assessments")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, test: data });
  } catch (error) {
    console.error("POST /api/admin/tests error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing test ID" }, { status: 400 });
    }

    const { error } = await adminClient.from("assessments").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Test deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/tests error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
