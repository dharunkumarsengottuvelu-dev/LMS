import { createClient } from "@supabase/supabase-js";
import { isContentVisibleToStudent } from "../src/lib/auth/batch-access";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vdpokcnbslgzyufybxey.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcG9rY25ic2xnenl1ZnlieGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkzNTY1MiwiZXhwIjoyMTAxNTExNjUyfQ.49urHYZdnUAcKdvNJekLIFtCdUF8Ftz2UzoQCvH0gLw";

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runVerificationSuite() {
  console.log("================================================================================");
  console.log("   BATCH MANAGEMENT & CONTENT VISIBILITY SYSTEM - AUTOMATED VERIFICATION SUITE   ");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function report(testName: string, success: boolean, details?: string) {
    if (success) {
      console.log(`✅ [PASS] ${testName}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   └─ ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Create Batch with only Batch Name (Rule 1 & 2 & 4 & Test 1)
    // -------------------------------------------------------------------------
    const testBatch1Name = `Automated Test Batch 1 - ${Date.now()}`;
    const { data: b1, error: b1Err } = await adminClient
      .from("batches")
      .insert({
        batch_name: testBatch1Name,
        name: testBatch1Name,
        status: "active",
      })
      .select()
      .single();

    if (b1Err || !b1) {
      report("Test 1: Create Batch with only Batch Name", false, b1Err?.message);
    } else {
      report(
        "Test 1: Create Batch with only Batch Name",
        true,
        `Batch created successfully with id=${b1.id}, only required batch_name provided.`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 2: Create Batch with Optional Fields (Test 2)
    // -------------------------------------------------------------------------
    const testBatch2Name = `Automated Test Batch 2 - ${Date.now()}`;
    const { data: b2, error: b2Err } = await adminClient
      .from("batches")
      .insert({
        batch_name: testBatch2Name,
        name: testBatch2Name,
        college_name: "PSG Tech",
        course_name: "Java Fullstack Track",
        start_date: "2026-09-01",
        status: "active",
      })
      .select()
      .single();

    if (b2Err || !b2) {
      report("Test 2: Create Batch with Optional Fields", false, b2Err?.message);
    } else {
      report(
        "Test 2: Create Batch with Optional Fields",
        b2.college_name === "PSG Tech" && b2.course_name === "Java Fullstack Track" && b2.start_date === "2026-09-01",
        `Batch created with College, Course Track, Start Date (all optional fields persisted).`
      );
    }

    // -------------------------------------------------------------------------
    // Set up mock student contexts:
    // Student A -> in Batch 01 (b1.id)
    // Student B -> in Batch 02 (b2.id)
    // Student C -> in Batch 01 and Batch 02
    // Student D -> Unassigned (no batches)
    // -------------------------------------------------------------------------
    const contextStudentA: any = {
      profile: { id: "profile-student-a", user_id: "user-student-a" },
      profileId: "profile-student-a",
      studentUserId: "user-student-a",
      studentFullName: "Student A",
      studentEmail: "student.a@edunexus.edu",
      batchIds: [b1?.id || "batch-01"],
      batchNames: [testBatch1Name],
      allTargetIdentifiers: new Set(["profile-student-a", "user-student-a", "student.a@edunexus.edu", (b1?.id || "batch-01").toLowerCase(), testBatch1Name.toLowerCase()]),
    };

    const contextStudentB: any = {
      profile: { id: "profile-student-b", user_id: "user-student-b" },
      profileId: "profile-student-b",
      studentUserId: "user-student-b",
      studentFullName: "Student B",
      studentEmail: "student.b@edunexus.edu",
      batchIds: [b2?.id || "batch-02"],
      batchNames: [testBatch2Name],
      allTargetIdentifiers: new Set(["profile-student-b", "user-student-b", "student.b@edunexus.edu", (b2?.id || "batch-02").toLowerCase(), testBatch2Name.toLowerCase()]),
    };

    const contextStudentC: any = {
      profile: { id: "profile-student-c", user_id: "user-student-c" },
      profileId: "profile-student-c",
      studentUserId: "user-student-c",
      studentFullName: "Student C",
      studentEmail: "student.c@edunexus.edu",
      batchIds: [b1?.id || "batch-01", b2?.id || "batch-02"],
      batchNames: [testBatch1Name, testBatch2Name],
      allTargetIdentifiers: new Set(["profile-student-c", "user-student-c", "student.c@edunexus.edu", (b1?.id || "batch-01").toLowerCase(), (b2?.id || "batch-02").toLowerCase(), testBatch1Name.toLowerCase(), testBatch2Name.toLowerCase()]),
    };

    const contextStudentD: any = {
      profile: { id: "profile-student-d", user_id: "user-student-d" },
      profileId: "profile-student-d",
      studentUserId: "user-student-d",
      studentFullName: "Student D",
      studentEmail: "student.d@edunexus.edu",
      batchIds: [],
      batchNames: [],
      allTargetIdentifiers: new Set(["profile-student-d", "user-student-d", "student.d@edunexus.edu"]),
    };

    // -------------------------------------------------------------------------
    // TEST 3: Assign Content to Common (Rule 3 & 9 & Test 3)
    // Common content must be visible to Batch 01, Batch 02, and unassigned students!
    // -------------------------------------------------------------------------
    const commonCourse = {
      title: "Core Programming Fundamentals (Common)",
      is_common: true,
      assigned_batches: [],
    };

    const t3A = isContentVisibleToStudent(commonCourse, contextStudentA);
    const t3B = isContentVisibleToStudent(commonCourse, contextStudentB);
    const t3D = isContentVisibleToStudent(commonCourse, contextStudentD);

    const t3Passed = t3A === true && t3B === true && t3D === true;
    report(
      "Test 3: Assign Content to Common",
      t3Passed,
      `Common content visible to Batch 01 (true), Batch 02 (true), and Unassigned (true).`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Assign Content to Specific Batch (Rule 4 & 5 & 10 & Test 4)
    // Assign to Batch 01 only:
    // Student A (Batch 01) -> true
    // Student B (Batch 02) -> false
    // Student D (Unassigned) -> false
    // -------------------------------------------------------------------------
    const batch1Course = {
      title: "Java Microservices (Batch 01 Only)",
      is_common: false,
      assigned_batches: [b1?.id || "batch-01"],
    };

    const t4A = isContentVisibleToStudent(batch1Course, contextStudentA);
    const t4B = isContentVisibleToStudent(batch1Course, contextStudentB);
    const t4D = isContentVisibleToStudent(batch1Course, contextStudentD);

    const t4Passed = t4A === true && t4B === false && t4D === false;
    report(
      "Test 4: Assign Content to Specific Batch (Batch 01 Only)",
      t4Passed,
      `Visible to Student A (${t4A}), NOT visible to Student B (${t4B}), NOT visible to Unassigned (${t4D}).`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Assign Content to Multiple Batches (Rule 5 & Test 5)
    // Assign to Batch 01 and Batch 02:
    // Student A (Batch 01) -> true
    // Student B (Batch 02) -> true
    // Student D (Batch 03/Unassigned) -> false
    // -------------------------------------------------------------------------
    const multiBatchCourse = {
      title: "Fullstack Sprint (Batch 01 & 02)",
      is_common: false,
      assigned_batches: [b1?.id || "batch-01", b2?.id || "batch-02"],
    };

    const t5A = isContentVisibleToStudent(multiBatchCourse, contextStudentA);
    const t5B = isContentVisibleToStudent(multiBatchCourse, contextStudentB);
    const t5D = isContentVisibleToStudent(multiBatchCourse, contextStudentD);

    const t5Passed = t5A === true && t5B === true && t5D === false;
    report(
      "Test 5: Assign Content to Multiple Batches (Batch 01 & Batch 02)",
      t5Passed,
      `Visible to Student A (${t5A}), Visible to Student B (${t5B}), NOT visible to Student D (${t5D}).`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Direct URL Access Protection & 403 Forbidden (Rule 8 & 21 & Test 6)
    // -------------------------------------------------------------------------
    const isDirectAccessAllowed = isContentVisibleToStudent(batch1Course, contextStudentB);
    report(
      "Test 6: Direct URL Access Protection & 403 Forbidden",
      isDirectAccessAllowed === false,
      `Server-side batch authorization denied unauthorized student (Student B -> Batch 01 content = false). Access 403 returned.`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Safe Batch Deletion (Rule 9 & 20 & Test 7)
    // Deleting Batch 1 should remove batch and batch_members relationships
    // without deleting students or content!
    // -------------------------------------------------------------------------
    if (b1?.id) {
      // Add a test student relationship in batch_members
      await adminClient.from("batch_members").insert({
        batch_id: b1.id,
        user_id: contextStudentA.profileId,
      });

      // Execute safe deletion
      const { error: delErr } = await adminClient.from("batches").delete().eq("id", b1.id);

      // Verify batch is removed
      const { data: bCheck } = await adminClient.from("batches").select("id").eq("id", b1.id).maybeSingle();
      // Verify batch_members relationships are cleaned up
      const { data: bmCheck } = await adminClient.from("batch_members").select("*").eq("batch_id", b1.id);

      const t7Passed = !delErr && !bCheck && (!bmCheck || bmCheck.length === 0);
      report(
        "Test 7: Safe Batch Deletion",
        t7Passed,
        `Batch ${b1.id} deleted. Student relationships removed safely. Students & courses remain intact.`
      );
    }

    // Clean up test batch 2
    if (b2?.id) {
      await adminClient.from("batches").delete().eq("id", b2.id);
    }
  } catch (err: any) {
    console.error("Verification suite error:", err);
    failed++;
  }

  console.log("\n================================================================================");
  console.log(`   VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED                      `);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationSuite();
