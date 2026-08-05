"use client";

import Link from "next/link";
import { Code2, Play, CheckCircle2, ChevronRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const mockProblems = [
  {
    id: "p1",
    title: "Two Sum Target Index Pair",
    difficulty: "Easy",
    category: "Arrays & Hashes",
    solved: true,
    acceptanceRate: "88%",
  },
  {
    id: "p2",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    category: "Sliding Window",
    solved: false,
    acceptanceRate: "62%",
  },
  {
    id: "p3",
    title: "Merge K Sorted Linked Lists",
    difficulty: "Hard",
    category: "Heap & Trees",
    solved: false,
    acceptanceRate: "41%",
  },
];

export default function StudentCodingProblemsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Coding Practice & IDE
          </h1>
          <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Solve algorithmic problems in 14+ languages with live Judge0 compilation
          </p>
        </div>

        <Button className="h-[44px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2" asChild>
          <Link href="/ide/playground">
            <Code2 className="h-5 w-5" /> Open Code Playground
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {mockProblems.map((problem) => (
          <Card key={problem.id} className="hover:border-[#2563EB]/40 transition-colors">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-[18px] font-semibold text-[#111827] dark:text-[#FAFAFA] truncate">
                    {problem.title}
                  </span>
                  {problem.solved && (
                    <Badge className="bg-[#16A34A] text-white text-xs">Solved</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                  <span>{problem.category}</span>
                  <span>•</span>
                  <span className={problem.difficulty === "Easy" ? "text-[#16A34A]" : problem.difficulty === "Medium" ? "text-[#F59E0B]" : "text-[#DC2626]"}>
                    {problem.difficulty}
                  </span>
                  <span>•</span>
                  <span>Acceptance: {problem.acceptanceRate}</span>
                </div>
              </div>

              <Button className="h-[44px] px-5 bg-[#2563EB] text-white shrink-0" asChild>
                <Link href="/ide/playground">Solve Problem</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
