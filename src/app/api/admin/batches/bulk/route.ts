import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

interface BulkBatchRow {
  batchName: string;
  collegeName?: string;
  leadTrainer?: string;
  courseTrack?: string;
  startDate?: string;
  code?: string;
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();
    const rawBatches: BulkBatchRow[] = Array.isArray(body.batches) ? body.batches : [];

    if (rawBatches.length === 0) {
      return NextResponse.json({ error: "No batches provided for bulk import" }, { status: 400 });
    }

    // 1. Fetch trainers for ID mapping
    const { data: trainersData } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("role", "trainer");

    // 2. Fetch courses for ID mapping
    const { data: coursesData } = await adminClient
      .from("courses")
      .select("id, title");

    const trainerList = trainersData || [];
    const courseList = coursesData || [];

    const preparedPayloads: any[] = [];
    const errors: string[] = [];

    const now = Date.now();

    for (let i = 0; i < rawBatches.length; i++) {
      const row = rawBatches[i];
      if (!row) continue;
      const batchName = (row.batchName || "").trim();

      if (!batchName) {
        errors.push(`Row ${i + 1}: Batch Name is required and was empty.`);
        continue;
      }

      const collegeName = (row.collegeName || "").trim();
      const courseTrack = (row.courseTrack || "").trim();
      const leadTrainer = (row.leadTrainer || "").trim();
      const startDate = (row.startDate || "").trim() || null;
      const code = (row.code || "").trim() || `BAT-${now.toString().slice(-4)}${i + 1}`;

      // Match trainer ID
      let trainerId: string | null = null;
      if (leadTrainer) {
        const leadLower = leadTrainer.toLowerCase();
        const matchedTrainer = trainerList.find((t: any) => {
          const fullName = `${t.first_name || ""} ${t.last_name || ""}`.trim().toLowerCase();
          const email = (t.email || "").toLowerCase();
          return fullName.includes(leadLower) || leadLower.includes(fullName) || email.includes(leadLower);
        });
        if (matchedTrainer) {
          trainerId = matchedTrainer.id;
        }
      }

      // Match course ID
      let courseId: string | null = null;
      if (courseTrack) {
        const courseLower = courseTrack.toLowerCase();
        const matchedCourse = courseList.find((c: any) => {
          const title = (c.title || "").toLowerCase();
          return title.includes(courseLower) || courseLower.includes(title);
        });
        if (matchedCourse) {
          courseId = matchedCourse.id;
        }
      }

      const descMeta = {
        college_name: collegeName,
        collegeName: collegeName,
        course_name: courseTrack,
        courseName: courseTrack,
        lead_trainer: leadTrainer,
      };

      const payload: Record<string, any> = {
        name: batchName,
        batch_name: batchName,
        code,
        description: JSON.stringify(descMeta),
        start_date: startDate,
        status: "active",
      };

      if (trainerId) payload.trainer_id = trainerId;
      if (courseId) payload.course_id = courseId;

      preparedPayloads.push({
        payload,
        rowMeta: {
          batchName,
          collegeName,
          leadTrainer,
          courseTrack,
          startDate,
          code,
        },
      });
    }

    if (preparedPayloads.length === 0) {
      return NextResponse.json(
        { error: "No valid batches found to import", details: errors },
        { status: 400 }
      );
    }

    // Insert batches into database
    const insertData = preparedPayloads.map((p) => p.payload);
    const { data: insertedBatches, error: insertError } = await adminClient
      .from("batches")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Bulk batch insert error:", insertError);
      throw insertError;
    }

    // Format returned batches to LMSBatch structure
    const formattedBatches = (insertedBatches || []).map((b: any, idx: number) => {
      const meta = preparedPayloads[idx]?.rowMeta;
      return {
        id: b.id,
        name: b.name || b.batch_name,
        batchName: b.name || b.batch_name,
        code: b.code,
        collegeName: meta?.collegeName || "",
        course: meta?.courseTrack || "",
        trainer: meta?.leadTrainer || "",
        startDate: b.start_date || "",
        status: b.status || "active",
        studentIds: [],
      };
    });

    return NextResponse.json({
      success: true,
      insertedCount: formattedBatches.length,
      batches: formattedBatches,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("POST /api/admin/batches/bulk error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
