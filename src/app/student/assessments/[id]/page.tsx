"use client";

import { PracticeRunnerEngine, PracticeQuestion } from "@/components/quiz/practice-runner";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

const mockSubModules: Record<string, SubModuleMeta> = {};

const mockMixedQuestions: PracticeQuestion[] = [];

export default function AssessmentTakePage() {
  const params = useParams();
  const router = useRouter();

  const subModuleId = (params?.id as string) || "";
  const currentSubModule: SubModuleMeta = mockSubModules[subModuleId] ?? {
    id: subModuleId,
    title: "Assessment",
    type: "mcq",
    assignedBy: "System",
    durationMinutes: 60,
    totalMarks: 100,
    passingMarks: 50,
    proctoring: { fullscreenLock: false, copyPasteRestricted: false }
  };

  const handleSubmit = async (answers: Record<string, any>) => {
    console.log("Practice sub-module submitted:", answers);
    router.back();
  };

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
        questions={mockMixedQuestions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
