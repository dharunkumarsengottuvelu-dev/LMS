import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();

    const {
      batchId,
      batchName,
      studentId,
      studentEmail,
      studentName,
      action = "assign",
      bulkAssignments,
    } = body;

    // Handle Bulk Assignments (e.g. from CSV import)
    if (Array.isArray(bulkAssignments) && bulkAssignments.length > 0) {
      const results: any[] = [];
      const errors: string[] = [];

      for (const item of bulkAssignments) {
        try {
          const targetBatchName = (item.batchName || item.batch || "").trim();
          const targetEmail = (item.studentEmail || item.email || "").trim().toLowerCase();
          const targetId = item.studentId || item.id || "";
          const targetName = (item.studentName || item.name || "").trim();

          if (!targetBatchName && !item.batchId) continue;
          if (!targetEmail && !targetId) continue;

          // 1. Resolve or create Batch
          let resolvedBatchId = item.batchId;
          let resolvedBatchName = targetBatchName;

          if (!resolvedBatchId && targetBatchName) {
            const { data: existingBatch } = await adminClient
              .from("batches")
              .select("id, name, batch_name")
              .or(`name.ilike."${targetBatchName}",batch_name.ilike."${targetBatchName}"`)
              .maybeSingle();

            if (existingBatch) {
              resolvedBatchId = existingBatch.id;
              resolvedBatchName = existingBatch.name || existingBatch.batch_name;
            } else {
              // Create the batch automatically
              const descMeta = {
                college_name: item.collegeName || item.college || "Enterprise Academy",
                course_name: item.course || item.techTrack || "Fullstack Enterprise",
              };
              const { data: newBatch, error: bErr } = await adminClient
                .from("batches")
                .insert([{
                  name: targetBatchName,
                  batch_name: targetBatchName,
                  code: `BAT-${Date.now().toString().slice(-4)}`,
                  description: JSON.stringify(descMeta),
                  status: "active",
                }])
                .select()
                .single();

              if (!bErr && newBatch) {
                resolvedBatchId = newBatch.id;
                resolvedBatchName = newBatch.name || newBatch.batch_name;
              }
            }
          }

          // 2. Resolve Student Profile
          let studentProfile: any = null;
          if (targetId) {
            const { data } = await adminClient
              .from("profiles")
              .select("id, user_id, email, first_name, last_name, role")
              .or(`id.eq.${targetId},user_id.eq.${targetId}`)
              .maybeSingle();
            studentProfile = data;
          }
          if (!studentProfile && targetEmail) {
            const { data } = await adminClient
              .from("profiles")
              .select("id, user_id, email, first_name, last_name, role")
              .eq("email", targetEmail)
              .maybeSingle();
            studentProfile = data;
          }

          if (studentProfile && resolvedBatchId) {
            const studentUserId = studentProfile.user_id || studentProfile.id;

            // Insert into batch_members
            await adminClient.from("batch_members").upsert(
              [{ batch_id: resolvedBatchId, user_id: studentUserId }],
              { onConflict: "batch_id,user_id" }
            );

            // Update profiles table
            await adminClient
              .from("profiles")
              .update({
                batch_id: resolvedBatchId,
                batch_name: resolvedBatchName,
                batch: resolvedBatchName,
              })
              .eq("id", studentProfile.id);

            results.push({
              studentId: studentProfile.id,
              name: `${studentProfile.first_name || ""} ${studentProfile.last_name || ""}`.trim() || targetName,
              email: studentProfile.email,
              batchId: resolvedBatchId,
              batchName: resolvedBatchName,
            });
          }
        } catch (itemErr: any) {
          errors.push(itemErr?.message || "Error processing item");
        }
      }

      return NextResponse.json({
        success: true,
        assignedCount: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // Handle Single Student (Assign or Remove)
    if (!studentId && !studentEmail) {
      return NextResponse.json(
        { error: "Student ID or corporate email is required." },
        { status: 400 }
      );
    }

    // 1. Resolve Student Profile
    let studentProfile: any = null;
    if (studentId) {
      const { data } = await adminClient
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, role")
        .or(`id.eq.${studentId},user_id.eq.${studentId}`)
        .maybeSingle();
      studentProfile = data;
    }
    if (!studentProfile && studentEmail) {
      const { data } = await adminClient
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, role")
        .eq("email", studentEmail.trim().toLowerCase())
        .maybeSingle();
      studentProfile = data;
    }

    if (!studentProfile) {
      return NextResponse.json(
        { error: `Student profile not found for identifier: ${studentId || studentEmail}` },
        { status: 404 }
      );
    }

    const studentUserId = studentProfile.user_id || studentProfile.id;

    // Action: REMOVE
    if (action === "remove") {
      if (batchId) {
        await adminClient
          .from("batch_members")
          .delete()
          .eq("batch_id", batchId)
          .eq("user_id", studentUserId);
      }

      await adminClient
        .from("profiles")
        .update({
          batch_id: null,
          batch_name: null,
          batch: null,
        })
        .eq("id", studentProfile.id);

      return NextResponse.json({
        success: true,
        message: "Student removed from batch successfully.",
        studentId: studentProfile.id,
      });
    }

    // Action: ASSIGN
    if (!batchId && !batchName) {
      return NextResponse.json(
        { error: "Target batch ID or batch name is required." },
        { status: 400 }
      );
    }

    let resolvedBatch: any = null;

    if (batchId) {
      const { data } = await adminClient
        .from("batches")
        .select("id, name, batch_name, code, description")
        .eq("id", batchId)
        .maybeSingle();
      resolvedBatch = data;
    }

    if (!resolvedBatch && batchName) {
      const trimmedBatchName = batchName.trim();
      const { data } = await adminClient
        .from("batches")
        .select("id, name, batch_name, code, description")
        .or(`name.ilike."${trimmedBatchName}",batch_name.ilike."${trimmedBatchName}"`)
        .maybeSingle();
      resolvedBatch = data;

      // If batch doesn't exist yet, create it on-demand
      if (!resolvedBatch) {
        const { data: newBatch, error: createBatchErr } = await adminClient
          .from("batches")
          .insert([{
            name: trimmedBatchName,
            batch_name: trimmedBatchName,
            code: `BAT-${Date.now().toString().slice(-4)}`,
            status: "active",
          }])
          .select()
          .single();

        if (createBatchErr) {
          throw createBatchErr;
        }
        resolvedBatch = newBatch;
      }
    }

    if (!resolvedBatch) {
      return NextResponse.json(
        { error: "Could not find or create the target batch." },
        { status: 404 }
      );
    }

    const effectiveBatchName = resolvedBatch.name || resolvedBatch.batch_name || batchName;

    // Upsert into batch_members
    const { error: memberError } = await adminClient
      .from("batch_members")
      .upsert(
        [{ batch_id: resolvedBatch.id, user_id: studentUserId }],
        { onConflict: "batch_id,user_id" }
      );

    if (memberError) {
      console.warn("Notice: batch_members upsert error:", memberError.message);
    }

    // Update profiles table
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        batch_id: resolvedBatch.id,
        batch_name: effectiveBatchName,
        batch: effectiveBatchName,
      })
      .eq("id", studentProfile.id);

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({
      success: true,
      message: `Student successfully assigned to batch "${effectiveBatchName}".`,
      student: {
        id: studentProfile.id,
        userId: studentUserId,
        email: studentProfile.email,
        name: `${studentProfile.first_name || ""} ${studentProfile.last_name || ""}`.trim() || studentName || "Student",
        batchId: resolvedBatch.id,
        batchName: effectiveBatchName,
      },
      batch: {
        id: resolvedBatch.id,
        name: effectiveBatchName,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/batches/assign-student error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
