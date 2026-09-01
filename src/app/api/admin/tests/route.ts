import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { dispatchBatchNotification } from "@/lib/notifications/dispatcher";

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

    const { data: profilesData } = await adminClient
      .from("profiles")
      .select("batch, batch_name, batch_id");

    const batchNamesSet = new Set<string>();
    const mappedBatches: any[] = [];

    (batchesData || []).forEach((b: any) => {
      const bName = b.name || b.batch_name;
      if (bName) {
        batchNamesSet.add(bName);
        mappedBatches.push({
          id: b.id,
          name: bName,
          collegeName: b.college_name || "",
        });
      }
    });

    (profilesData || []).forEach((p: any) => {
      const pb = p.batch || p.batch_name || p.batch_id;
      if (pb && !batchNamesSet.has(pb)) {
        batchNamesSet.add(pb);
        mappedBatches.push({
          id: pb,
          name: pb,
          collegeName: "Student Cohort",
        });
      }
    });

    if (mappedBatches.length === 0) {
      mappedBatches.push({ id: "General Cohort", name: "General Cohort", collegeName: "All Students" });
    }

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
        a.is_common === true ||
        meta.isCommon === true ||
        String(a.is_common) === "true" ||
        String(meta.isCommon) === "true" ||
        assignedBatches.length === 0 ||
        assignedBatches.includes("Common (All Batches)");

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
        proctoringFlags: meta.proctoringFlags || ["Fullscreen Lock", "Tab Switch Security"],
        isCommon,
        assignedBatches,
        questions: meta.questions || [],
        allowedQuestionTypes: a.type === "coding" ? "coding" : a.type === "mixed" ? "both" : "mcq",
        sections: meta.sections || ["General Assessment"],
        scheduleMode: meta.scheduleMode || (meta.date || a.scheduled_at || a.available_from ? "scheduled" : "open"),
        date: meta.date || (a.scheduled_at ? a.scheduled_at.split("T")[0] : a.available_from ? a.available_from.split("T")[0] : ""),
        startDate: meta.startDate || "",
        endDate: meta.endDate || "",
        startTime: meta.startTime || "",
        endTime: meta.endTime || "",
        timezone: meta.timezone || "Asia/Kolkata (IST)",
        secWebcam: meta.secWebcam ?? true,
        secFullscreen: meta.secFullscreen ?? true,
        secTabSwitch: meta.secTabSwitch ?? true,
        secCopyPaste: meta.secCopyPaste ?? true,
        secMultipleScreens: meta.secMultipleScreens ?? false,
        secSEB: meta.secSEB ?? false,
        secMultipleFaces: meta.secMultipleFaces ?? true,
        secLookingAway: meta.secLookingAway ?? true,
        secFacePosition: meta.secFacePosition ?? true,
        secAutoSubmit: meta.secAutoSubmit ?? true,
        maxWarningsLimit: meta.maxWarningsLimit ?? 3,
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
      scheduleMode: test.scheduleMode || (test.date ? "scheduled" : "open"),
      date: test.date || "",
      startDate: test.startDate || "",
      endDate: test.endDate || "",
      startTime: test.startTime || "",
      endTime: test.endTime || "",
      timezone: test.timezone || "Asia/Kolkata (IST)",
      proctoringFlags: test.proctoringFlags || [],
      secWebcam: test.secWebcam !== undefined ? test.secWebcam : true,
      secFullscreen: test.secFullscreen !== undefined ? test.secFullscreen : true,
      secTabSwitch: test.secTabSwitch !== undefined ? test.secTabSwitch : true,
      secCopyPaste: test.secCopyPaste !== undefined ? test.secCopyPaste : true,
      secMultipleScreens: Boolean(test.secMultipleScreens),
      secSEB: Boolean(test.secSEB),
      secMultipleFaces: test.secMultipleFaces !== undefined ? test.secMultipleFaces : true,
      secLookingAway: test.secLookingAway !== undefined ? test.secLookingAway : true,
      secFacePosition: test.secFacePosition !== undefined ? test.secFacePosition : true,
      secAutoSubmit: test.secAutoSubmit !== undefined ? test.secAutoSubmit : true,
      maxWarningsLimit: test.maxWarningsLimit !== undefined ? Number(test.maxWarningsLimit) : 3,
    };

    const payload: any = {
      title: test.title,
      description: test.description || `Assessment for ${isCommon ? "all students" : "assigned batches"}`,
      type: test.allowedQuestionTypes === "coding" ? "coding" : test.allowedQuestionTypes === "both" ? "mixed" : "mcq",
      duration_minutes: test.duration || 60,
      total_marks: test.maxMarks || (test.totalQuestions || 10) * 10,
      pass_percentage: 50,
      status: "active",
      assigned_batches: isCommon ? [] : assignedBatches,
      assigned_students: test.assignedStudents || [],
      is_common: isCommon,
      tags: [JSON.stringify(meta)],
    };

    // If date/time provided, sync scheduled_at
    if (test.date) {
      try {
        const timePart = test.startTime ? test.startTime : "00:00";
        payload.scheduled_at = new Date(`${test.date} ${timePart}`).toISOString();
      } catch {}
    } else if (test.startDate) {
      try {
        payload.scheduled_at = new Date(test.startDate).toISOString();
      } catch {}
    }

    if (test.endDate) {
      try {
        payload.expires_at = new Date(test.endDate).toISOString();
      } catch {}
    }

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

    // Asynchronously dispatch in-app & email notifications to target students
    try {
      const testId = data?.id || test.id;
      const testTitle = data?.title || test.title;
      const durationStr = `${test.duration || data?.duration_minutes || 60} Mins`;
      const scheduleStr = test.date ? `${test.date} ${test.startTime || ""}`.trim() : (test.startDate || "Scheduled");

      if (isCommon) {
        dispatchBatchNotification({
          isCommon: true,
          eventType: "test_scheduled",
          title: `New Assessment Scheduled: ${testTitle}`,
          message: `A new proctored assessment "${testTitle}" has been scheduled for your cohort. Duration: ${durationStr}.`,
          resourceType: "assessment",
          resourceId: testId,
          targetUrl: `/student/tests/${testId}`,
          assignedBy: "FALCON Examination Team",
          dueDate: scheduleStr,
          duration: durationStr,
        }).catch((e) => console.warn("Test batch notification error:", e));
      } else if (assignedBatches.length > 0) {
        for (const bName of assignedBatches) {
          dispatchBatchNotification({
            batchName: bName,
            eventType: "test_scheduled",
            title: `New Assessment Scheduled: ${testTitle}`,
            message: `A new assessment "${testTitle}" has been scheduled for batch ${bName}.`,
            resourceType: "assessment",
            resourceId: testId,
            targetUrl: `/student/tests/${testId}`,
            assignedBy: "FALCON Examination Team",
            dueDate: scheduleStr,
            duration: durationStr,
          }).catch((e) => console.warn("Test batch notification error:", e));
        }
      }
    } catch (notifErr) {
      console.warn("Test notification trigger warning:", notifErr);
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
