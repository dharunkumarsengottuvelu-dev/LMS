"use client";

import { MCQAssessmentEngine } from "@/components/quiz/mcq-engine";
import { useParams } from "next/navigation";
import type { Assessment, AssessmentAttempt, Question } from "@/types";

const mockAssessment: Assessment = {
  id: "a1",
  title: "React 19 & Next.js App Router Evaluation",
  description: "Comprehensive React 19 evaluation",
  type: "mcq",
  instructions: "Complete all questions within the 30-minute time limit. Each question has positive marking.",
  duration_minutes: 30,
  total_marks: 100,
  passing_marks: 70,
  max_attempts: 3,
  shuffle_questions: false,
  negative_marking: false,
  negative_marks_per_wrong: 0,
  available_from: null,
  expires_at: null,
  status: "active",
  course_id: null,
  created_by: "u1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockAttempt: AssessmentAttempt = {
  id: "att1",
  assessment_id: "a1",
  student_id: "s1",
  answers: {},
  score: null,
  total_marks: 100,
  percentage: null,
  passed: null,
  status: "in_progress",
  started_at: new Date().toISOString(),
  submitted_at: null,
  expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  time_taken_seconds: 0,
  created_at: new Date().toISOString(),
};

const mockQuestions: Question[] = [
  {
    id: "q1",
    assessment_id: "a1",
    text: "What is the primary role of Server Components in Next.js 16 App Router?",
    type: "single_choice",
    marks: 50,
    negative_marks: 0,
    options: [
      { id: "o1", text: "To execute exclusively on the server and reduce client bundle size" },
      { id: "o2", text: "To handle client-side onClick event listeners" },
      { id: "o3", text: "To manage local React state with useState" },
      { id: "o4", text: "To replace CSS styling rules" }
    ],
    correct_answers: ["o1"],
    explanation: "Server components run on the server and send pre-rendered HTML/payload to the client without adding JavaScript bundle size.",
    order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "q2",
    assessment_id: "a1",
    text: "Which directory in Next.js 16 App Router maps to root routing?",
    type: "single_choice",
    marks: 50,
    negative_marks: 0,
    options: [
      { id: "o1", text: "src/app/" },
      { id: "o2", text: "src/pages/" },
      { id: "o3", text: "src/routes/" },
      { id: "o4", text: "public/" }
    ],
    correct_answers: ["o1"],
    explanation: "The app directory inside src/ or root maps directly to routes in Next.js App Router.",
    order: 2,
    created_at: new Date().toISOString(),
  }
];

export default function AssessmentTakePage() {
  const params = useParams();

  const handleSubmit = async (answers: Record<string, string[]>) => {
    console.log("Submitted answers:", answers);
  };

  return (
    <div className="py-4">
      <MCQAssessmentEngine
        assessment={mockAssessment}
        attempt={mockAttempt}
        questions={mockQuestions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
