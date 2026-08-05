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

const mockSubModules: Record<string, SubModuleMeta> = {
  "p1-sub1": {
    id: "p1-sub1",
    title: "Sub-Module 1.1: Server Component Rendering & Hydration",
    type: "mcq",
    assignedBy: "Admin (Dharunkumar S)",
    durationMinutes: 30,
    totalMarks: 100,
    passingMarks: 70,
    proctoring: {
      fullscreenLock: true, // Instructor Enabled -> Fullscreen Required
      copyPasteRestricted: true,
    }
  },
  "p1-sub2": {
    id: "p1-sub2",
    title: "Sub-Module 1.2: Server Actions & Mutating Form Data",
    type: "coding",
    assignedBy: "Admin (Dharunkumar S)",
    durationMinutes: 45,
    totalMarks: 120,
    passingMarks: 80,
    proctoring: {
      fullscreenLock: false, // Standard Practice -> Standard Windowed View (No Fullscreen)
      copyPasteRestricted: true,
    }
  },
  "p2-sub1": {
    id: "p2-sub1",
    title: "Sub-Module 2.1: Route Interception & JWT Cookie Validation",
    type: "coding",
    assignedBy: "Trainer (Dr. Arunkumar)",
    durationMinutes: 40,
    totalMarks: 150,
    passingMarks: 100,
    proctoring: {
      fullscreenLock: true, // Instructor Enabled -> Fullscreen Required
      copyPasteRestricted: true,
    }
  },
  "p2-sub2": {
    id: "p2-sub2",
    title: "Sub-Module 2.2: Rate Limiting & Security Headers",
    type: "mcq",
    assignedBy: "Trainer (Dr. Arunkumar)",
    durationMinutes: 25,
    totalMarks: 80,
    passingMarks: 50,
    proctoring: {
      fullscreenLock: false, // Standard Practice -> Standard Windowed View (No Fullscreen)
      copyPasteRestricted: false,
    }
  }
};

const mockMixedQuestions: PracticeQuestion[] = [
  {
    id: "q1",
    type: "single_choice",
    title: "1. Next.js 16 Server Components Architecture",
    text: "What is the primary role of Server Components in Next.js 16 App Router?",
    marks: 25,
    order: 1,
    options: [
      { id: "o1", text: "To execute exclusively on the server and reduce client JS bundle size" },
      { id: "o2", text: "To handle client-side onClick event listeners" },
      { id: "o3", text: "To manage local React state with useState" },
      { id: "o4", text: "To replace CSS styling rules" }
    ],
  },
  {
    id: "q2",
    type: "coding",
    title: "2. Algorithm Challenge: Two Sum Target Index Pair",
    text: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. Write an efficient solution in O(N) time complexity.",
    marks: 75,
    order: 2,
    starterCode: {
      python: `# Write your solution in Python 3\ndef two_sum(nums, target):\n    hashmap = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in hashmap:\n            return [hashmap[diff], i]\n        hashmap[num] = i\n    return []\n\n# Test call\nprint(two_sum([2, 7, 11, 15], 9))`,
      javascript: `// Write your solution in JavaScript\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}\nconsole.log(twoSum([2, 7, 11, 15], 9));`,
    },
    testCases: [
      { input: "nums = [2,7,11,15], target = 9", expectedOutput: "[0, 1]" }
    ],
  },
  {
    id: "q3",
    type: "multiple_choice",
    title: "3. PostgreSQL Row Level Security (RLS)",
    text: "Which of the following statements are correct regarding Supabase PostgreSQL Row Level Security (RLS)?",
    marks: 50,
    order: 3,
    options: [
      { id: "o1", text: "RLS policies run directly at the database engine layer" },
      { id: "o2", text: "auth.uid() retrieves the authenticated Supabase user ID" },
      { id: "o3", text: "RLS policies can only be written in JavaScript" },
      { id: "o4", text: "Service role key bypasses RLS policies for administrative tasks" }
    ],
  }
];

export default function AssessmentTakePage() {
  const params = useParams();
  const router = useRouter();

  const subModuleId = (params?.id as string) || "p1-sub1";
  const currentSubModule = mockSubModules[subModuleId] ?? mockSubModules["p1-sub1"]!;

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
