"use client";

import { useState, useEffect, useMemo } from "react";
import { PracticeRunnerEngine, PracticeQuestion } from "@/components/quiz/practice-runner";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, CheckCircle2, RotateCcw, Check, X, Copy } from "lucide-react";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SubModuleMeta {
  id: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
  assignedBy: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  maxAttempts?: number;
  allowResume?: boolean;
  scoreRetentionPolicy?: string;
  proctoring: {
    fullscreenLock: boolean;
    copyPasteRestricted: boolean;
  };
  allowReviewBeforeSubmit?: boolean;
  mcqSectionTitle?: string;
  codingSectionTitle?: string;
}

interface CompletedRecord {
  score: number;
  bestScore?: number;
  totalMarks: number;
  attemptsCount: number;
  submittedAt: string;
  timeSpentSeconds?: number;
  answers?: Record<string, any>;
}

function formatCompletedDateTime(isoStr?: string): string {
  if (!isoStr) return "Just now";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "Less than 1 min";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export default function AssessmentTakePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const subModuleId = (params?.id as string) || "";
  const trackIdParam = searchParams?.get("trackId") || "";

  const [loading, setLoading] = useState(true);
  const [currentSubModule, setCurrentSubModule] = useState<SubModuleMeta | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "mcq" | "coding">("all");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const [completedRecord, setCompletedRecord] = useState<CompletedRecord | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const resStr = localStorage.getItem(`lms_completed_assessment_${subModuleId}`);
        if (resStr) return JSON.parse(resStr);
      } catch {}
    }
    return null;
  });

  const loadData = async () => {
    if (!subModuleId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    // Check completion status from storage on load
    if (typeof window !== "undefined") {
      try {
        const resStr = localStorage.getItem(`lms_completed_assessment_${subModuleId}`);
        if (resStr) {
          setCompletedRecord(JSON.parse(resStr));
        }
      } catch {}
    }

    try {
      let targetTrack: any = null;
      let targetSubModule: any = null;

      // 1. Direct Track Param check
      if (trackIdParam) {
        try {
          const res = await fetch(`/api/student/practices/${trackIdParam}`);
          if (res.ok) {
            const data = await res.json();
            if (data.track) {
              targetTrack = data.track;
              const subs = data.track.sub_modules || data.track.subModules || [];
              targetSubModule = subs.find((s: any) => s.id === subModuleId) || (trackIdParam === subModuleId ? subs[0] : null);
            }
          }
        } catch (e) {
          console.warn("Direct track fetch error:", e);
        }
      }

      // 2. Direct Submodule / Track ID API fetch
      if (!targetSubModule) {
        try {
          const res = await fetch(`/api/student/practices/${subModuleId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.track) {
              targetTrack = data.track;
              const subs = data.track.sub_modules || data.track.subModules || [];
              targetSubModule = subs.find((s: any) => s.id === subModuleId) || subs[0] || data.track;
            }
          }
        } catch (e) {
          console.warn("Direct practice ID lookup notice:", e);
        }
      }

      // 3. Scan all authorized student practice tracks
      if (!targetSubModule) {
        try {
          const resAll = await fetch("/api/student/practices");
          if (resAll.ok) {
            const allData = await resAll.json();
            const tracks = allData.tracks || [];
            for (const t of tracks) {
              const subs = t.sub_modules || t.subModules || [];
              const found = subs.find((s: any) => s.id === subModuleId);
              if (found || t.id === subModuleId) {
                const detailRes = await fetch(`/api/student/practices/${t.id}`);
                if (detailRes.ok) {
                  const detailData = await detailRes.json();
                  targetTrack = detailData.track;
                  const detailSubs = detailData.track?.sub_modules || detailData.track?.subModules || [];
                  targetSubModule = detailSubs.find((s: any) => s.id === subModuleId) || detailSubs[0] || found || t;
                }
                break;
              }
            }
          }
        } catch (e) {
          console.warn("All practices scan notice:", e);
        }
      }

      // 4. Scan student assessments endpoint
      if (!targetSubModule) {
        try {
          const resAssess = await fetch("/api/student/assessments");
          if (resAssess.ok) {
            const assessData = await resAssess.json();
            const assessments = assessData.assessments || [];
            const foundAssess = assessments.find((a: any) => a.id === subModuleId);
            if (foundAssess) {
              targetSubModule = {
                id: foundAssess.id,
                title: foundAssess.title,
                type: foundAssess.type || "mixed",
                durationMinutes: typeof foundAssess.duration_minutes === "number" ? foundAssess.duration_minutes : (typeof foundAssess.duration === "number" ? foundAssess.duration : 0),
                totalMarks: foundAssess.total_marks || 100,
                mcqQuestions: foundAssess.mcqQuestions || foundAssess.questions || [],
                codingQuestions: foundAssess.codingQuestions || [],
              };
            }
          }
        } catch (e) {
          console.warn("Assessments scan notice:", e);
        }
      }

      // 5. Local Storage fallback (for development / offline tracks)
      if (!targetSubModule && typeof window !== "undefined") {
        try {
          const localStr = localStorage.getItem("enterprise_lms_practice_tracks_v2");
          if (localStr) {
            const localTracks = JSON.parse(localStr);
            for (const t of localTracks) {
              const subs = t.subModules || t.sub_modules || [];
              const found = subs.find((s: any) => s.id === subModuleId);
              if (found || t.id === subModuleId) {
                targetTrack = t;
                targetSubModule = found || subs[0] || t;
                break;
              }
            }
          }
        } catch (e) {
          console.warn("Local storage lookup warning:", e);
        }
      }

      if (!targetSubModule) {
        setErrorMsg("This practice module was not found or is currently not assigned to your batch.");
        setLoading(false);
        return;
      }

      const parsedDuration =
        typeof targetSubModule.durationMinutes === "number"
          ? targetSubModule.durationMinutes
          : typeof targetSubModule.duration_minutes === "number"
          ? targetSubModule.duration_minutes
          : typeof targetSubModule.duration === "number"
          ? targetSubModule.duration
          : 0;

      setCurrentSubModule({
        id: targetSubModule.id,
        title: targetSubModule.title || "Interactive Practice Module",
        type: targetSubModule.type || "mixed",
        assignedBy: targetTrack?.assignedByName || targetTrack?.assigned_by_name || "Admin",
        durationMinutes: parsedDuration,
        totalMarks: targetSubModule.totalMarks || targetSubModule.total_marks || 100,
        passingMarks: Math.floor((targetSubModule.totalMarks || targetSubModule.total_marks || 100) / 2),
        maxAttempts: targetSubModule.maxAttempts ?? targetTrack?.maxAttempts ?? 0,
        allowResume: targetSubModule.allowResume ?? targetTrack?.allowResume ?? true,
        scoreRetentionPolicy: targetSubModule.scoreRetentionPolicy ?? targetTrack?.scoreRetentionPolicy ?? "best",
        proctoring: {
          fullscreenLock: Boolean(targetSubModule.enforceFullScreen || targetSubModule.fullscreenLock),
          copyPasteRestricted: Boolean(targetSubModule.restrictCopyPaste || targetSubModule.copyPasteRestricted),
        },
        allowReviewBeforeSubmit: targetSubModule.allowReviewBeforeSubmit ?? targetTrack?.allowReviewBeforeSubmit ?? true,
        mcqSectionTitle:
          targetSubModule.mcqSectionTitle ||
          targetSubModule.mcq_section_title ||
          (targetSubModule.sections?.[0]?.title) ||
          "Section 1: MCQs",
        codingSectionTitle:
          targetSubModule.codingSectionTitle ||
          targetSubModule.coding_section_title ||
          (targetSubModule.sections?.find((s: any) => (s.codingQuestions?.length || 0) > 0)?.title) ||
          "Section 2: Coding",
      });

      // If completed in Database, initialize completedRecord from DB data so logout never loses completion
      if (targetSubModule.status === "completed" || targetSubModule.score !== undefined && targetSubModule.score > 0) {
        setCompletedRecord((prev) => prev || {
          score: targetSubModule.score ?? (targetSubModule.totalMarks || 100),
          bestScore: targetSubModule.score ?? (targetSubModule.totalMarks || 100),
          totalMarks: targetSubModule.totalMarks || targetSubModule.total_marks || 100,
          attemptsCount: 1,
          submittedAt: targetSubModule.submittedAt || new Date().toISOString(),
          answers: {},
        });
      }

      const formattedQuestions: PracticeQuestion[] = [];
      const totalSubModuleMarks = targetSubModule.totalMarks || targetSubModule.total_marks || 100;
      const rawSections = targetSubModule.sections && Array.isArray(targetSubModule.sections) ? targetSubModule.sections : [];

      if (rawSections.length > 0) {
        let totalCount = 0;
        rawSections.forEach((s: any) => {
          totalCount += (s.mcqQuestions?.length || 0) + (s.codingQuestions?.length || 0);
        });
        const perQuestionBaseMarks = totalCount > 0 ? Math.max(5, Math.floor(totalSubModuleMarks / totalCount)) : 10;

        let globalMcqIdx = 0;
        let globalCodingIdx = 0;

        rawSections.forEach((sec: any, sIdx: number) => {
          const customSecTitle = sec.title || `Section ${sIdx + 1}`;

          // MCQs in this section
          const secMcqs = sec.mcqQuestions || [];
          secMcqs.forEach((q: any) => {
            const rawOptions = q.options || [];
            const normalizedOptions = rawOptions.map((opt: any, oIdx: number) => {
              if (typeof opt === "string") {
                return { id: `opt_${oIdx}`, text: opt, isCorrect: false };
              }
              return {
                id: opt.id || `opt_${oIdx}`,
                text: opt.text || opt.optionText || opt.title || "",
                isCorrect: Boolean(opt.isCorrect)
              };
            });

            const correctCount = normalizedOptions.filter((o: any) => o.isCorrect).length;
            const isMulti = q.questionType === "multiple" || correctCount > 1;
            formattedQuestions.push({
              id: q.id || `mcq_${globalMcqIdx}`,
              type: isMulti ? "multiple_choice" : "single_choice",
              section: "mcq",
              sectionTitle: customSecTitle,
              sectionIndex: sIdx,
              title: q.title || `Question ${globalMcqIdx + 1}`,
              text: q.questionText || q.text || q.title || "Choose the correct option:",
              marks: q.marks || perQuestionBaseMarks,
              options: normalizedOptions,
              explanation: q.explanation || ""
            });
            globalMcqIdx++;
          });

          // Coding in this section
          const secCoding = sec.codingQuestions || [];
          secCoding.forEach((cq: any) => {
            const rawPub = Array.isArray(cq.publicTestCases) ? cq.publicTestCases : [];
            const rawHid = Array.isArray(cq.hiddenTestCases) ? cq.hiddenTestCases : [];
            const rawAll = Array.isArray(cq.test_cases)
              ? cq.test_cases
              : Array.isArray(cq.testCases)
              ? cq.testCases
              : Array.isArray(cq.sample_test_cases)
              ? cq.sample_test_cases
              : [];

            let combinedTestCases: any[] = [];
            if (rawPub.length > 0 || rawHid.length > 0) {
              combinedTestCases = [
                ...rawPub.map((tc: any, tcIdx: number) => ({
                  id: tc.id || `tc_pub_${tcIdx}`,
                  input: tc.input || "",
                  expected_output: tc.expected_output || tc.expectedOutput || tc.output || "",
                  is_hidden: false
                })),
                ...rawHid.map((tc: any, tcIdx: number) => ({
                  id: tc.id || `tc_hid_${tcIdx}`,
                  input: tc.input || "",
                  expected_output: tc.expected_output || tc.expectedOutput || tc.output || "",
                  is_hidden: true
                }))
              ];
            } else if (rawAll.length > 0) {
              combinedTestCases = rawAll.map((tc: any, tcIdx: number) => ({
                id: tc.id || `tc_${tcIdx}`,
                input: tc.input || "",
                expected_output: tc.expected_output || tc.expectedOutput || tc.output || "",
                is_hidden: Boolean(tc.is_hidden)
              }));
            }

            formattedQuestions.push({
              id: cq.id || `cq_${globalCodingIdx}`,
              type: "coding",
              section: "coding",
              sectionTitle: customSecTitle,
              sectionIndex: sIdx,
              title: cq.title || `Coding Challenge ${globalCodingIdx + 1}`,
              text: cq.description || cq.problemDescription || "Implement the algorithm as specified.",
              marks: cq.marks || cq.points || (perQuestionBaseMarks * 2),
              difficulty: cq.difficulty || "medium",
              constraints: cq.constraints || "",
              inputFormat: cq.inputFormat || "",
              outputFormat: cq.outputFormat || "",
              starterCode: cq.templates || {
                python: targetSubModule.starterCode || "# Write Python code here\n",
                java: targetSubModule.starterCode || "// Write Java code here\n",
                cpp: targetSubModule.starterCode || "// Write C++ code here\n",
                javascript: targetSubModule.starterCode || "// Write JavaScript code here\n",
                c: targetSubModule.starterCode || "/* Write C code here */\n"
              },
              testCases: combinedTestCases
            });
            globalCodingIdx++;
          });
        });
      } else {
        // Fallback for direct MCQ and Coding questions
        let mcqs = targetSubModule.mcqQuestions || [];
        let codingProbs = targetSubModule.codingQuestions || targetSubModule.codingProblems || [];
        const customMcqTitle = targetSubModule.mcqSectionTitle || targetSubModule.mcq_section_title || "Section 1: MCQs";
        const customCodingTitle = targetSubModule.codingSectionTitle || targetSubModule.coding_section_title || "Section 2: Coding";

        const totalQuestionCount = mcqs.length + (codingProbs.length > 0 ? codingProbs.length : (targetSubModule.type === "coding" || targetSubModule.problemDescription ? 1 : 0));
        const perQuestionBaseMarks = totalQuestionCount > 0 ? Math.max(5, Math.floor(totalSubModuleMarks / totalQuestionCount)) : 10;

        mcqs.forEach((q: any, idx: number) => {
          const rawOptions = q.options || [];
          const normalizedOptions = rawOptions.map((opt: any, oIdx: number) => {
            if (typeof opt === "string") {
              return { id: `opt_${oIdx}`, text: opt, isCorrect: false };
            }
            return {
              id: opt.id || `opt_${oIdx}`,
              text: opt.text || opt.optionText || opt.title || "",
              isCorrect: Boolean(opt.isCorrect)
            };
          });

          const correctCount = normalizedOptions.filter((o: any) => o.isCorrect).length;
          const isMulti = q.questionType === "multiple" || correctCount > 1;
          formattedQuestions.push({
            id: q.id || `mcq_${idx}`,
            type: isMulti ? "multiple_choice" : "single_choice",
            section: "mcq",
            sectionTitle: customMcqTitle,
            title: `Question ${idx + 1}`,
            text: q.questionText || q.text || q.title || "Choose the correct option:",
            marks: q.marks || perQuestionBaseMarks,
            options: normalizedOptions,
            explanation: q.explanation || ""
          });
        });

        if (codingProbs.length > 0) {
          codingProbs.forEach((cq: any, idx: number) => {
            const rawPub = Array.isArray(cq.publicTestCases) ? cq.publicTestCases : [];
            const rawHid = Array.isArray(cq.hiddenTestCases) ? cq.hiddenTestCases : [];
            const rawAll = Array.isArray(cq.test_cases)
              ? cq.test_cases
              : Array.isArray(cq.testCases)
              ? cq.testCases
              : Array.isArray(cq.sample_test_cases)
              ? cq.sample_test_cases
              : [];

            let combinedTestCases: any[] = [];
            if (rawPub.length > 0 || rawHid.length > 0) {
              combinedTestCases = [
                ...rawPub.map((tc: any, tcIdx: number) => ({
                  id: tc.id || `tc_pub_${tcIdx}`,
                  input: tc.input || "",
                  expected_output: tc.expected_output || tc.expectedOutput || tc.output || "",
                  is_hidden: false
                })),
                ...rawHid.map((tc: any, tcIdx: number) => ({
                  id: tc.id || `tc_hid_${tcIdx}`,
                  input: tc.input || "",
                  expected_output: tc.expected_output || tc.expectedOutput || tc.output || "",
                  is_hidden: true
                }))
              ];
            } else if (rawAll.length > 0) {
              combinedTestCases = rawAll.map((tc: any, tcIdx: number) => ({
                id: tc.id || `tc_${tcIdx}`,
                input: tc.input || "",
                expected_output: tc.expected_output || tc.expectedOutput || tc.output || "",
                is_hidden: Boolean(tc.is_hidden)
              }));
            }

            formattedQuestions.push({
              id: cq.id || `cq_${idx}`,
              type: "coding",
              section: "coding",
              sectionTitle: customCodingTitle,
              title: cq.title || `Coding Challenge ${idx + 1}`,
              text: cq.description || cq.problemDescription || "Implement the algorithm as specified.",
              marks: cq.marks || cq.points || (perQuestionBaseMarks * 2),
              difficulty: cq.difficulty || "medium",
              constraints: cq.constraints || "",
              inputFormat: cq.inputFormat || "",
              outputFormat: cq.outputFormat || "",
              starterCode: cq.templates || {
                python: targetSubModule.starterCode || "# Write Python code here\n",
                java: targetSubModule.starterCode || "// Write Java code here\n",
                cpp: targetSubModule.starterCode || "// Write C++ code here\n",
                javascript: targetSubModule.starterCode || "// Write JavaScript code here\n",
                c: targetSubModule.starterCode || "/* Write C code here */\n"
              },
              testCases: combinedTestCases
            });
          });
        } else if (targetSubModule.type === "coding" || targetSubModule.problemDescription) {
          // Single coding task in submodule
          const testCases: any[] = [];
          if (targetSubModule.publicTestCases) {
            testCases.push({ id: "tc_pub_1", input: targetSubModule.publicTestCases, expected_output: "1", is_hidden: false });
          }
          if (targetSubModule.hasHiddenTests && targetSubModule.hiddenTestsCode) {
            testCases.push({ id: "tc_hid_1", input: targetSubModule.hiddenTestsCode, expected_output: "1", is_hidden: true });
          }

          formattedQuestions.push({
            id: `${targetSubModule.id}_prob`,
            type: "coding",
            section: "coding",
            sectionTitle: customCodingTitle,
            title: targetSubModule.title || "Coding Problem",
            text: targetSubModule.problemDescription || targetSubModule.description || "Solve the problem according to requirements.",
            marks: totalSubModuleMarks,
            difficulty: targetSubModule.difficulty || "medium",
            constraints: targetSubModule.constraints || "",
            inputFormat: targetSubModule.inputFormat || "",
            outputFormat: targetSubModule.outputFormat || "",
            starterCode: targetSubModule.starterCode || {
              python: "# Write Python code here\n",
              java: "// Write Java code here\n",
              cpp: "// Write C++ code here\n",
              javascript: "// Write JavaScript code here\n",
              c: "/* Write C code here */\n"
            },
            testCases: testCases.length > 0 ? testCases : [{ id: "tc_1", input: "1", expected_output: "1", is_hidden: false }]
          });
        }
      }

      setQuestions(formattedQuestions);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading assessment data:", err);
      setErrorMsg(err.message || "Failed to load assessment data.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subModuleId, trackIdParam]);

  const handleSubmit = async (
    answers: Record<string, any>,
    meta?: { timeSpentSeconds: number; completedAt: string; timeLeft: number; submissionResults?: Record<string, any> }
  ) => {
    let obtainedMarks = 0;
    const subResults = meta?.submissionResults || {};

    questions.forEach(q => {
      const qMarks = q.marks || 10;
      if (q.type === "coding") {
        const cqAns = answers[q.id];
        const sub = subResults[q.id];
        if (sub) {
          if (sub.status === "accepted" || (sub.total_test_cases > 0 && sub.passed_test_cases === sub.total_test_cases)) {
            obtainedMarks += qMarks;
          } else if (sub.total_test_cases > 0) {
            obtainedMarks += Math.round(qMarks * (sub.passed_test_cases / sub.total_test_cases));
          } else if (cqAns && cqAns.code && cqAns.code.trim().length > 0) {
            obtainedMarks += Math.round(qMarks * 0.5);
          }
        } else if (cqAns && cqAns.code && cqAns.code.trim().length > 0) {
          obtainedMarks += Math.round(qMarks * 0.5);
        }
      } else {
        const rawStudentAns = answers[q.id];
        const studentAnsArray: string[] = Array.isArray(rawStudentAns)
          ? rawStudentAns
          : typeof rawStudentAns === "string" && rawStudentAns
          ? [rawStudentAns]
          : [];
        const correctOpts = q.options?.filter(o => o.isCorrect).map(o => o.id) || [];
        if (
          studentAnsArray.length > 0 &&
          studentAnsArray.length === correctOpts.length &&
          studentAnsArray.every(id => correctOpts.includes(id))
        ) {
          obtainedMarks += qMarks;
        }
      }
    });

    const completedAt = meta?.completedAt || new Date().toISOString();
    const timeSpentSeconds = meta?.timeSpentSeconds ?? 0;

    let attemptsCount = 1;
    let bestScore = obtainedMarks;

    if (typeof window !== "undefined") {
      localStorage.removeItem(`lms_practice_session_${subModuleId}`);
      localStorage.setItem(`lms_practice_session_${subModuleId}_submitted`, "true");
      
      const prevCompleted = localStorage.getItem(`lms_completed_assessment_${subModuleId}`);
      if (prevCompleted) {
        try {
          const parsed = JSON.parse(prevCompleted);
          attemptsCount = (parsed.attemptsCount || 1) + 1;
          bestScore = Math.max(parsed.score || 0, obtainedMarks);
        } catch {}
      }

      const rec: CompletedRecord = {
        score: obtainedMarks,
        bestScore,
        totalMarks: currentSubModule?.totalMarks || 100,
        attemptsCount,
        submittedAt: completedAt,
        timeSpentSeconds,
        answers,
      };

      localStorage.setItem(`lms_completed_assessment_${subModuleId}`, JSON.stringify(rec));
      setCompletedRecord(rec);
    }

    try {
      await fetch(`/api/student/assessments/${subModuleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, score: obtainedMarks, completedAt, timeSpentSeconds })
      });
    } catch {}

    toast({
      title: "Practice Completed",
      description: `Your submission has been recorded. Score: ${obtainedMarks} / ${currentSubModule?.totalMarks || 100}`,
    });
  };

  const handleRetake = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`lms_completed_assessment_${subModuleId}`);
      localStorage.removeItem(`lms_practice_session_${subModuleId}`);
      localStorage.removeItem(`lms_practice_session_${subModuleId}_submitted`);
    }
    setCompletedRecord(null);
  };

  const mcqQuestionsCount = useMemo(() => 
    questions.filter(q => q.type !== "coding" && q.section !== "coding").length,
    [questions]
  );

  const codingQuestionsCount = useMemo(() => 
    questions.filter(q => q.type === "coding" || q.section === "coding").length,
    [questions]
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  if (errorMsg || !currentSubModule || questions.length === 0) {
    return (
      <div className="w-full py-12 space-y-6 max-w-7xl mx-auto px-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl border-[#E5E7EB] dark:border-[#27272A]"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>
        <Card className="text-center py-16 bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
          <CardContent className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
            <CardTitle className="text-lg font-bold">
              {errorMsg || "No questions found for this module."}
            </CardTitle>
            <Button onClick={loadData} variant="outline" className="gap-2 rounded-xl">
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If already completed and submitted, show the completed results & question review on full page
  if (completedRecord) {
    const isPassed = completedRecord.score >= (currentSubModule.passingMarks || 50);
    const submittedAnswers = completedRecord.answers || {};

    const filteredQuestions = questions.filter(q => {
      const isCoding = q.type === "coding" || q.section === "coding";
      if (reviewFilter === "mcq") return !isCoding;
      if (reviewFilter === "coding") return isCoding;
      return true;
    });

    return (
      <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-300">
        {/* Overview Header Card - Spacious Enterprise MNC Card */}
        <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-visible p-5 sm:p-7 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            {/* Header Left */}
            <div className="space-y-2.5 flex-1 min-w-0">
              {/* Breadcrumb Navigation */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (trackIdParam) {
                      router.push(`/student/practices/${trackIdParam}`);
                    } else {
                      router.push("/student/practices");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                  <span>Back to Practice Track</span>
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap py-0.5">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-normal">
                  {currentSubModule.title}
                </h1>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold px-3 py-1 rounded-full dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 shrink-0">
                  Completed
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-normal pt-0.5">
                Assigned by <strong className="font-semibold text-slate-800 dark:text-slate-200">{currentSubModule.assignedBy}</strong> • {questions.length} Total Questions
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start lg:self-center pt-2 lg:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetake}
                className="h-10 px-4 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-2xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retake Practice
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (trackIdParam) {
                    router.push(`/student/practices/${trackIdParam}`);
                  } else {
                    router.push("/student/practices");
                  }
                }}
                className="h-10 px-5 text-xs font-bold gap-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs"
              >
                Continue Track
              </Button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-[#F8FAFC]/70 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">FINAL SCORE</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                {completedRecord.score} <span className="text-xs font-medium text-slate-400">/ {completedRecord.totalMarks}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC]/70 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">RESULT STATUS</p>
              <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                {isPassed ? "Passed" : "Completed"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC]/70 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">TIME TAKEN</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                {formatDuration(completedRecord.timeSpentSeconds)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC]/70 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">COMPLETED AT</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate" title={formatCompletedDateTime(completedRecord.submittedAt)}>
                {formatCompletedDateTime(completedRecord.submittedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Question Review Section Header & Filters */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Question Review & Answers ({questions.length})
            </h2>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setReviewFilter("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                  reviewFilter === "all"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                )}
              >
                All ({questions.length})
              </button>
              {mcqQuestionsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter("mcq")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                    reviewFilter === "mcq"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  )}
                >
                  MCQs ({mcqQuestionsCount})
                </button>
              )}
              {codingQuestionsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter("coding")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                    reviewFilter === "coding"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Coding ({codingQuestionsCount})
                </button>
              )}
            </div>
          </div>

          {/* Questions Review List */}
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const isCoding = q.type === "coding" || q.section === "coding";
              const origIndex = questions.findIndex(item => item.id === q.id);
              const qNum = origIndex >= 0 ? origIndex + 1 : idx + 1;

              if (isCoding) {
                const codeData = submittedAnswers[q.id];
                const submittedCode = typeof codeData === "string" ? codeData : codeData?.code || "";
                const codeLang = typeof codeData === "object" ? codeData?.language || "java" : "java";

                return (
                  <Card
                    key={q.id || idx}
                    className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden"
                  >
                    <div className="p-6 sm:p-7 space-y-4">
                      {/* Top Row: Section, Marks, Status */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {qNum}
                          </span>
                          <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">
                            SECTION 2: CODING
                          </span>
                          {q.marks && (
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              +{q.marks} Marks
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200/70 uppercase">
                            {codeLang}
                          </span>
                        </div>

                        <div>
                          {submittedCode ? (
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                              Code Submitted
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-600 border border-rose-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                              No Code
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {q.title || q.text}
                      </h3>

                      {q.text && q.text !== q.title && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {q.text}
                        </p>
                      )}

                      {/* Code Solution Display */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            SUBMITTED CODE ({codeLang.toUpperCase()})
                          </span>
                          {submittedCode && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(submittedCode);
                                setCopiedCodeId(q.id);
                                setTimeout(() => setCopiedCodeId(null), 2000);
                              }}
                              className="text-[11px] font-semibold text-slate-500 hover:text-[#2563EB] transition-colors flex items-center gap-1"
                            >
                              {copiedCodeId === q.id ? "Copied" : "Copy"}
                            </button>
                          )}
                        </div>

                        {submittedCode ? (
                          <div className="rounded-2xl border border-slate-800 bg-[#090D16] p-4 overflow-x-auto max-h-72">
                            <pre className="font-mono text-[12px] leading-relaxed text-slate-200 whitespace-pre">{submittedCode}</pre>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 bg-slate-50 dark:bg-zinc-900/20">
                            No code was written for this challenge.
                          </div>
                        )}
                      </div>

                      {/* Test Cases Count */}
                      {q.testCases && q.testCases.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            TEST CASES CONFIGURED
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {q.testCases.length} {q.testCases.length === 1 ? "case" : "cases"}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              }

              // MCQ Question Review
              const studentChoice = submittedAnswers[q.id];
              const selectedIds: string[] = Array.isArray(studentChoice)
                ? studentChoice
                : typeof studentChoice === "string"
                ? [studentChoice]
                : [];

              return (
                <Card
                  key={q.id || idx}
                  className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden"
                >
                  <div className="p-6 sm:p-7 space-y-4">
                    {/* Top Row: Section, Marks, Status */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {qNum}
                        </span>
                        <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">
                          SECTION 1: MCQS
                        </span>
                        {q.marks && (
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            +{q.marks} Marks
                          </span>
                        )}
                      </div>

                      <div>
                        {selectedIds.length > 0 ? (
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                            Answered
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-rose-600 border border-rose-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                            Unanswered
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {q.text || q.title}
                    </h3>

                    {/* Options List */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        OPTIONS & RESPONSE
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(q.options || []).map((opt, oIdx) => {
                          const isSelected = selectedIds.includes(opt.id);

                          return (
                            <div
                              key={opt.id || oIdx}
                              className={cn(
                                "p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all",
                                isSelected
                                  ? "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xs"
                                  : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-slate-600 dark:text-slate-400"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                    isSelected
                                      ? "bg-[#2563EB] text-white"
                                      : "bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400"
                                  )}
                                >
                                  {String.fromCharCode(65 + oIdx)}
                                </div>
                                <span className={cn("truncate text-xs", isSelected ? "text-slate-900 dark:text-white font-bold" : "font-medium text-slate-700 dark:text-slate-300")}>
                                  {opt.text}
                                </span>
                              </div>

                              {isSelected && (
                                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white shrink-0">
                                  Selected
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="mt-3 p-3.5 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-200/60 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-900 dark:text-white font-bold">Explanation: </strong>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 space-y-4">
      <PracticeRunnerEngine
        module={currentSubModule}
        questions={questions}
        onBack={() => router.back()}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
