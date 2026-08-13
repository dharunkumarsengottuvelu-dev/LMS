"use client";

import { useState, useEffect } from "react";
import { PracticeRunnerEngine, PracticeQuestion } from "@/components/quiz/practice-runner";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubModuleMeta {
  id: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
  assignedBy: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  proctoring: {
    fullscreenLock: boolean;
    copyPasteRestricted: boolean;
  };
}

export default function AssessmentTakePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const subModuleId = (params?.id as string) || "";
  const trackId = searchParams?.get("trackId") || "";

  const [loading, setLoading] = useState(true);
  const [currentSubModule, setCurrentSubModule] = useState<SubModuleMeta | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!trackId || !subModuleId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/student/practices/${trackId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load practice track");
        
        if (data.track && data.track.subModules) {
          const sm = data.track.subModules.find((s: any) => s.id === subModuleId);
          if (sm) {
            setCurrentSubModule({
              id: sm.id,
              title: sm.title || "Assessment",
              type: sm.type || "mcq",
              assignedBy: "System",
              durationMinutes: sm.durationMinutes || 60,
              totalMarks: sm.totalMarks || 100,
              passingMarks: Math.floor((sm.totalMarks || 100) / 2),
              proctoring: { fullscreenLock: false, copyPasteRestricted: false }
            });
            
            // Format mcqQuestions if available
            if (sm.mcqQuestions && Array.isArray(sm.mcqQuestions)) {
              const formattedQuestions: PracticeQuestion[] = sm.mcqQuestions.map((q: any) => ({
                id: q.id,
                type: "mcq",
                text: q.questionText || q.text || "",
                marks: 10, // Default marks per question
                options: q.options || [],
                explanation: q.explanation,
              }));
              setQuestions(formattedQuestions);
            }
          }
        }
      } catch (err: any) {
        console.error("Error fetching MCQ sub-module:", err);
        toast({
          title: "Error",
          description: err.message || "Failed to load assessment data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [trackId, subModuleId]);

  const handleSubmit = async (answers: Record<string, any>) => {
    console.log("Practice sub-module submitted:", answers);
    toast({
      title: "Submitted successfully!",
      description: "Your answers have been recorded.",
    });
    router.back();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  if (!currentSubModule || questions.length === 0) {
    return (
      <div className="flex flex-col h-96 items-center justify-center text-center space-y-4">
        <p className="text-muted-foreground">No questions found for this assignment.</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <PracticeRunnerEngine
        module={currentSubModule}
        questions={questions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
