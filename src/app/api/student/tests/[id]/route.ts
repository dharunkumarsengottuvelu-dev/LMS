import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Resolve student batch context
    const batchContext = await getStudentBatchAccess(adminClient, user);

    // 2. Fetch assessment from database
    const { data: assessment, error } = await adminClient
      .from("assessments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    let meta: any = {};
    if (assessment.tags && assessment.tags[0]) {
      try {
        meta = JSON.parse(assessment.tags[0]);
      } catch {}
    }

    const assignedBatches =
      assessment.assigned_batches ||
      meta.assignedBatches ||
      meta.assigned_batches ||
      (assessment.course_id ? [assessment.course_id] : []);

    const isCommon =
      assessment.is_common !== undefined
        ? assessment.is_common
        : meta.isCommon !== undefined
        ? meta.isCommon
        : assignedBatches.length === 0;

    // Batch Authorization Check
    const isAuthorized = isContentVisibleToStudent(
      {
        is_common: isCommon,
        assigned_batches: assignedBatches,
        assigned_students: meta.assignedStudents || [],
      },
      batchContext
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Access Denied. You do not belong to the assigned batch for this assessment." },
        { status: 403 }
      );
    }

    // 3. Map raw questions from meta
    const rawQuestions: any[] = meta.questions || [];
    const mappedQuestions = rawQuestions.map((q: any, index: number) => {
      const optionsArray = (q.options || []).map((opt: any) =>
        typeof opt === "string" ? opt : opt.text || ""
      );

      const correctIndex = (q.options || []).findIndex(
        (opt: any) => typeof opt === "object" && Boolean(opt.isCorrect)
      );

      // Sanitize test cases for students: public cases keep input & output; hidden cases keep only metadata without revealing answers
      const sanitizedTestCases = (q.testCases || []).map((tc: any, tcIdx: number) => {
        const isHidden = Boolean(tc.isHidden || tc.is_hidden);
        return {
          id: tc.id || `tc_${tcIdx + 1}`,
          input: isHidden ? "" : (tc.input || ""),
          output: isHidden ? "" : (tc.output || tc.expected_output || tc.expectedOutput || ""),
          expected_output: isHidden ? "" : (tc.output || tc.expected_output || tc.expectedOutput || ""),
          isHidden: isHidden,
          is_hidden: isHidden,
        };
      });

      return {
        id: index + 1,
        questionId: q.id || `q_${index + 1}`,
        type: q.type || "mcq",
        question: q.title || `Question ${index + 1}`,
        problemStatement: q.problemStatement || q.description || q.title || "",
        marks: Number(q.marks) || 1,
        section: q.section || "General Assessment",
        difficulty: q.difficulty || "medium",
        language: q.language || (typeof q.starterCode === "object" ? Object.keys(q.starterCode)[0] : "java"),
        inputFormat: q.inputFormat || "",
        outputFormat: q.outputFormat || "",
        constraints: q.constraints || "",
        explanation: q.explanation || "",
        options: optionsArray.length > 0 ? optionsArray : ["Option A", "Option B", "Option C", "Option D"],
        optionsList: q.options || [],
        correctOption: correctIndex >= 0 ? correctIndex : 0,
        testCases: sanitizedTestCases,
        starterCode: q.starterCode || q.templates || {
          python: "# Write your Python solution here\n",
          javascript: "// Write your JavaScript solution here\n",
          java: "public class Main {\n    public static void main(String[] args) {\n        // Write your Java solution here\n    }\n}",
          cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
          c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}"
        },
      };
    });

    const duration = assessment.duration_minutes || assessment.duration || meta.duration || 60;
    const maxMarks = assessment.total_marks || meta.maxMarks || (mappedQuestions.reduce((acc, q) => acc + q.marks, 0) || 100);

    const testInfo = {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description || meta.instructions || "",
      duration: duration,
      maxMarks: maxMarks,
      totalQuestions: mappedQuestions.length,
      scheduleMode: meta.scheduleMode || "open",
      date: meta.date || "",
      startTime: meta.startTime || "",
      endTime: meta.endTime || "",
      hasPassingCriteria: meta.hasPassingCriteria ?? true,
      passingCriteriaType: meta.passingCriteriaType || "percentage",
      passPercentage: meta.passPercentage ?? 40,
      passingMarks: meta.passingMarks ?? 40,
      proctoring: {
        enabled: Boolean(
          (meta.secWebcam !== false && meta.secWebcam !== undefined) ||
          (meta.secFullscreen !== false && meta.secFullscreen !== undefined) ||
          (meta.secTabSwitch !== false && meta.secTabSwitch !== undefined) ||
          (meta.secCopyPaste !== false && meta.secCopyPaste !== undefined)
        ),
        webcamTracking: meta.secWebcam !== undefined ? Boolean(meta.secWebcam) : true,
        fullscreenLock: meta.secFullscreen !== undefined ? Boolean(meta.secFullscreen) : true,
        tabSwitchLock: meta.secTabSwitch !== undefined ? Boolean(meta.secTabSwitch) : true,
        copyPasteRestricted: meta.secCopyPaste !== undefined ? Boolean(meta.secCopyPaste) : true,
        safeExamBrowserRequired: Boolean(meta.secSEB),
        multipleFacesAlert: meta.secMultipleFaces !== undefined ? Boolean(meta.secMultipleFaces) : true,
        lookingAwayAlert: meta.secLookingAway !== undefined ? Boolean(meta.secLookingAway) : true,
        facePositionGuard: meta.secFacePosition !== undefined ? Boolean(meta.secFacePosition) : true,
        autoSubmitOnWarning: meta.secAutoSubmit !== undefined ? Boolean(meta.secAutoSubmit) : true,
        maxWarningsLimit: meta.maxWarningsLimit !== undefined ? Number(meta.maxWarningsLimit) : 3,
      },
    };

    return NextResponse.json({
      test: testInfo,
      questions: mappedQuestions,
    });
  } catch (error) {
    console.error("GET /api/student/tests/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      answers = {},
      timeSpentSeconds = 0,
      violationsCount = 0,
      autoSubmitted = false,
    } = body;

    const adminClient = createAdminClient();

    // 1. Resolve student profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, department")
      .eq("user_id", user.id)
      .maybeSingle();

    const studentId = profile?.id || user.id;

    // 2. Fetch assessment to calculate score
    const { data: assessment } = await adminClient
      .from("assessments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    let meta: any = {};
    if (assessment?.tags && assessment.tags[0]) {
      try {
        meta = JSON.parse(assessment.tags[0]);
      } catch {}
    }

    const rawQuestions: any[] = meta.questions || [];
    let calculatedScore = 0;
    let totalMarks = 0;

    rawQuestions.forEach((q: any, idx: number) => {
      const qNum = idx + 1;
      const qMarks = Number(q.marks) || 1;
      totalMarks += qMarks;

      const studentAns = answers[qNum];
      if (studentAns === undefined || studentAns === null) return;

      const isMSQ = q.type === "msq" || q.type === "multiple_choice" || q.type === "both";
      const isCoding = q.type === "coding";

      if (isCoding) {
        if (typeof studentAns === "string" && studentAns.trim().length > 10) {
          calculatedScore += qMarks;
        }
      } else if (isMSQ) {
        const correctIndexes = (q.options || [])
          .map((opt: any, i: number) => (typeof opt === "object" && Boolean(opt.isCorrect) ? i : -1))
          .filter((i: number) => i >= 0);

        const studentIndexes: number[] = Array.isArray(studentAns)
          ? studentAns.map(Number)
          : [Number(studentAns)];

        const isExactMatch =
          correctIndexes.length > 0 &&
          correctIndexes.length === studentIndexes.length &&
          correctIndexes.every((ci: number) => studentIndexes.includes(ci));

        if (isExactMatch) {
          calculatedScore += qMarks;
        }
      } else {
        const correctIdx = (q.options || []).findIndex(
          (opt: any) => typeof opt === "object" && Boolean(opt.isCorrect)
        );
        if (correctIdx >= 0 && Number(studentAns) === correctIdx) {
          calculatedScore += qMarks;
        }
      }
    });

    if (totalMarks === 0) totalMarks = assessment?.total_marks || (meta as any)?.maxMarks || 100;
    const percentage = Math.round((calculatedScore / (totalMarks || 1)) * 100);
    
    let passed = true;
    const metaObj = (meta as any) || {};
    const hasPassingCriteria = metaObj.hasPassingCriteria ?? true;
    if (hasPassingCriteria) {
      if (metaObj.passingCriteriaType === "marks") {
        const requiredMarks = metaObj.passingMarks ?? 40;
        passed = calculatedScore >= requiredMarks;
      } else {
        const requiredPercentage = metaObj.passPercentage ?? assessment?.passing_marks ?? assessment?.pass_percentage ?? 40;
        passed = percentage >= requiredPercentage;
      }
    }

    // 3. Save attempt record
    const { data: attempt, error: attemptError } = await adminClient
      .from("assessment_attempts")
      .insert({
        assessment_id: id,
        student_id: studentId,
        status: autoSubmitted ? "auto_submitted" : "submitted",
        score: calculatedScore,
        total_marks: totalMarks,
        percentage: percentage,
        passed: passed,
        time_taken_seconds: timeSpentSeconds,
        answers: {
          submittedAnswers: answers,
          violationsCount: violationsCount,
          autoSubmitted: autoSubmitted,
        },
        submitted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select()
      .maybeSingle();

    if (attemptError) {
      console.warn("Notice: assessment_attempts insert error:", attemptError.message);
    }

    return NextResponse.json({
      success: true,
      score: calculatedScore,
      totalMarks: totalMarks,
      percentage: percentage,
      passed: passed,
      attemptId: attempt?.id,
    });
  } catch (error) {
    console.error("POST /api/student/tests/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
