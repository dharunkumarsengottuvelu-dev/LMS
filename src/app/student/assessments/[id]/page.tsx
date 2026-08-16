"use client";

import { useState, useEffect } from "react";
import { PracticeRunnerEngine, PracticeQuestion } from "@/components/quiz/practice-runner";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { WaveLoader } from "@/components/ui/wave-loader";

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
  mcqSectionTitle?: string;
  codingSectionTitle?: string;
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

  const loadData = async () => {
    if (!subModuleId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);

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
                durationMinutes: foundAssess.duration_minutes || foundAssess.duration || 60,
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

      setCurrentSubModule({
        id: targetSubModule.id,
        title: targetSubModule.title || "Interactive Practice Module",
        type: targetSubModule.type || "mixed",
        assignedBy: targetTrack?.assignedByName || targetTrack?.assigned_by_name || "Admin",
        durationMinutes: targetSubModule.durationMinutes || targetSubModule.duration_minutes || 60,
        totalMarks: targetSubModule.totalMarks || targetSubModule.total_marks || 100,
        passingMarks: Math.floor((targetSubModule.totalMarks || targetSubModule.total_marks || 100) / 2),
        maxAttempts: targetSubModule.maxAttempts ?? targetTrack?.maxAttempts ?? 0,
        allowResume: targetSubModule.allowResume ?? targetTrack?.allowResume ?? true,
        scoreRetentionPolicy: targetSubModule.scoreRetentionPolicy ?? targetTrack?.scoreRetentionPolicy ?? "best",
        proctoring: {
          fullscreenLock: Boolean(targetSubModule.enforceFullScreen || targetSubModule.fullscreenLock),
          copyPasteRestricted: Boolean(targetSubModule.restrictCopyPaste || targetSubModule.copyPasteRestricted),
        },
        mcqSectionTitle: targetSubModule.mcqSectionTitle || targetSubModule.mcq_section_title || "Section 1: MCQs",
        codingSectionTitle: targetSubModule.codingSectionTitle || targetSubModule.coding_section_title || "Section 2: Coding",
      });

      const formattedQuestions: PracticeQuestion[] = [];

      // A. Extract MCQ Questions
      const mcqs = targetSubModule.mcqQuestions || [];
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
          title: `Question ${idx + 1}`,
          text: q.questionText || q.text || q.title || "Choose the correct option:",
          marks: 10,
          options: normalizedOptions,
          explanation: q.explanation || ""
        });
      });

      // B. Extract Coding Questions
      const codingProbs = targetSubModule.codingQuestions || targetSubModule.codingProblems || [];
      if (codingProbs.length > 0) {
        codingProbs.forEach((cq: any, idx: number) => {
          const testCases = (cq.publicTestCases || cq.testCases || cq.sample_test_cases || []).map((tc: any, tcIdx: number) => ({
            id: tc.id || `tc_${tcIdx}`,
            input: tc.input || "",
            expected_output: tc.expected_output || tc.expectedOutput || tc.output || "",
            is_hidden: Boolean(tc.is_hidden)
          }));

          formattedQuestions.push({
            id: cq.id || `cq_${idx}`,
            type: "coding",
            section: "coding",
            title: cq.title || `Coding Challenge ${idx + 1}`,
            text: cq.description || cq.problemDescription || "Implement the algorithm as specified.",
            marks: 20,
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
            testCases
          });
        });
      } else if (targetSubModule.type === "coding" || targetSubModule.problemDescription) {
        // Single coding task in submodule
        formattedQuestions.push({
          id: `${targetSubModule.id}_prob`,
          type: "coding",
          section: "coding",
          title: targetSubModule.title || "Coding Problem",
          text: targetSubModule.problemDescription || "Write a program that solves the problem and passes all test cases.",
          marks: 50,
          difficulty: "medium",
          starterCode: {
            python: targetSubModule.starterCode || "# Write Python code here\n",
            java: targetSubModule.starterCode || "// Write Java code here\n",
            cpp: targetSubModule.starterCode || "// Write C++ code here\n",
            javascript: targetSubModule.starterCode || "// Write JavaScript code here\n",
            c: targetSubModule.starterCode || "/* Write C code here */\n"
          },
          testCases: targetSubModule.publicTestCases ? [
            { id: "tc_1", input: targetSubModule.publicTestCases, expected_output: "" }
          ] : []
        });
      }

      setQuestions(formattedQuestions);
    } catch (err: any) {
      console.error("Error fetching sub-module questions:", err);
      setErrorMsg(err.message || "Failed to load practice questions.");
      toast({
        title: "Error Loading Practice",
        description: err.message || "Failed to load practice questions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subModuleId, trackIdParam]);

  const handleSubmit = async (answers: Record<string, any>) => {
    let obtainedMarks = 0;
    questions.forEach(q => {
      if (q.type === "coding") {
        const cqAns = answers[q.id];
        if (cqAns && cqAns.code) obtainedMarks += (q.marks || 20);
      } else {
        const studentAns = answers[q.id];
        const correctOpts = q.options?.filter(o => o.isCorrect).map(o => o.id) || [];
        if (Array.isArray(studentAns) && studentAns.length === correctOpts.length && studentAns.every(id => correctOpts.includes(id))) {
          obtainedMarks += (q.marks || 10);
        }
      }
    });

    if (typeof window !== "undefined") {
      localStorage.removeItem(`lms_practice_session_${subModuleId}`);
      const prevCompleted = localStorage.getItem(`lms_completed_assessment_${subModuleId}`);
      let attemptsCount = 1;
      let bestScore = obtainedMarks;
      if (prevCompleted) {
        try {
          const parsed = JSON.parse(prevCompleted);
          attemptsCount = (parsed.attemptsCount || 1) + 1;
          bestScore = Math.max(parsed.score || 0, obtainedMarks);
        } catch {}
      }
      localStorage.setItem(`lms_completed_assessment_${subModuleId}`, JSON.stringify({
        score: obtainedMarks,
        bestScore,
        totalMarks: currentSubModule?.totalMarks || 100,
        attemptsCount,
        submittedAt: new Date().toISOString()
      }));
    }

    try {
      await fetch(`/api/student/assessments/${subModuleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, score: obtainedMarks })
      });
    } catch {}

    toast({
      title: "Practice Completed! 🎉",
      description: `Your submission has been recorded. Score: ${obtainedMarks} / ${currentSubModule?.totalMarks || 100}`,
    });
    router.back();
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <WaveLoader
          label="Preparing Assessment Environment..."
          subLabel="Loading questions, test suites and live code execution runtime"
        />
      </div>
    );
  }

  if (errorMsg || !currentSubModule || questions.length === 0) {
    return (
      <div className="w-full py-12 space-y-6">
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

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3 space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A] rounded-xl hover:bg-muted"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Track
        </Button>
      </div>

      <PracticeRunnerEngine
        module={currentSubModule}
        questions={questions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
