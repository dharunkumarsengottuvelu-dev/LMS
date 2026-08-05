"use client";

import { PracticeRunnerEngine, PracticeQuestion } from "@/components/quiz/practice-runner";
import { useParams } from "next/navigation";

const mockModule = {
  id: "p3",
  title: "Fullstack Architecture & Mixed Coding Practice",
  type: "mixed" as const, // MCQ + Coding Mixed format assigned by Trainer/Admin
  assignedBy: "Admin (Dharun)",
  durationMinutes: 45,
  totalMarks: 150,
  passingMarks: 100,
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

  const handleSubmit = async (answers: Record<string, any>) => {
    console.log("Practice module submitted:", answers);
  };

  return (
    <div className="py-4">
      <PracticeRunnerEngine
        module={mockModule}
        questions={mockMixedQuestions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
