"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodingProblemsService } from "@/services/coding-problems.service";
import { CodingProgressService, type ProblemSavedState } from "@/services/coding-progress.service";
import { CodingAssignmentsService, type CodingAssignment } from "@/services/coding-assignments.service";
import { CodingLeaderboardService, type LeaderboardEntry } from "@/services/coding-leaderboard.service";
import { CodingDiscussService, type CodingDiscussPost } from "@/services/coding-discuss.service";
import { SubmissionService } from "@/services/submission.service";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";
import type { CodingSubmission } from "@/types/coding";
import { toast } from "sonner";

export default function CodingDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("problems");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  const [problems, setProblems] = useState<ExtendedCodingProblem[]>(() => {
    return CodingProblemsService.getAllProblems() as ExtendedCodingProblem[];
  });
  const [inProgressItems, setInProgressItems] = useState<{ problem: ExtendedCodingProblem; state: ProblemSavedState }[]>(() => {
    const all = CodingProblemsService.getAllProblems() as ExtendedCodingProblem[];
    return CodingProgressService.getInProgressProblems(all);
  });
  const [solvedItems, setSolvedItems] = useState<{ problem: ExtendedCodingProblem; state: ProblemSavedState }[]>(() => {
    const all = CodingProblemsService.getAllProblems() as ExtendedCodingProblem[];
    return CodingProgressService.getSolvedProblems(all);
  });
  const [assignments] = useState<CodingAssignment[]>(() => CodingAssignmentsService.getAssignments());
  const [leaderboard] = useState<LeaderboardEntry[]>(() => CodingLeaderboardService.getLeaderboard());
  const [discussPosts, setDiscussPosts] = useState<CodingDiscussPost[]>(() => CodingDiscussService.getPosts());
  const [submissions, setSubmissions] = useState<CodingSubmission[]>(() => SubmissionService.getStudentSubmissions());

  useEffect(() => {
    const refreshData = async () => {
      try {
        const all = (await CodingProblemsService.fetchProblems()) as ExtendedCodingProblem[];
        setProblems(all);
        setInProgressItems(CodingProgressService.getInProgressProblems(all));
        setSolvedItems(CodingProgressService.getSolvedProblems(all));
      } catch {
        const all = CodingProblemsService.getAllProblems() as ExtendedCodingProblem[];
        setProblems(all);
        setInProgressItems(CodingProgressService.getInProgressProblems(all));
        setSolvedItems(CodingProgressService.getSolvedProblems(all));
      }
      setDiscussPosts(CodingDiscussService.getPosts());
      setSubmissions(SubmissionService.getStudentSubmissions());
    };

    refreshData();
    window.addEventListener("focus", refreshData);
    return () => window.removeEventListener("focus", refreshData);
  }, []);

  const stats = useMemo(() => {
    return CodingProgressService.getProgressStats(problems);
  }, [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.topic_tags && p.topic_tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchDiff = selectedDifficulty === "all" || p.difficulty === selectedDifficulty;
      return matchSearch && matchDiff;
    });
  }, [problems, searchQuery, selectedDifficulty]);

  const handleUpvote = (postId: string) => {
    CodingDiscussService.upvotePost(postId);
    setDiscussPosts([...CodingDiscussService.getPosts()]);
    toast.success("Upvoted discussion thread");
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Quick Stats */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 rounded">
                Practice Workspace
              </span>
              <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {stats.streakDays} Day Streak
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              FALCON Coding Workspace
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              Sharpen your algorithmic thinking and data structure implementation with real-time compilation and automated test case evaluation.
            </p>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-xs font-medium text-slate-500 mb-1">Solved Problems</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">{stats.solvedCount}</span>
              <span className="text-xs text-slate-400">/ {stats.totalProblems}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <span className="text-emerald-700">{stats.easySolved} Easy</span>
              <span>•</span>
              <span className="text-amber-700">{stats.mediumSolved} Med</span>
              <span>•</span>
              <span className="text-rose-700">{stats.hardSolved} Hard</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-xs font-medium text-slate-500 mb-1">In Progress</div>
            <div className="text-2xl font-bold text-slate-900">{inProgressItems.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">Saved drafts</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-xs font-medium text-slate-500 mb-1">Acceptance Rate</div>
            <div className="text-2xl font-bold text-slate-900">
              {submissions.length > 0 ? stats.acceptanceRate : "—"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {submissions.length > 0 ? "Across all submissions" : "No submissions yet"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-xs font-medium text-slate-500 mb-1">Points Earned</div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalPoints}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.solvedCount > 0
                ? `Rank #${leaderboard.find((l) => l.isCurrentUser)?.rank || 1} in Cohort`
                : "Unranked (Solve problems to rank)"}
            </p>
          </div>
        </div>
      </div>

      {/* Main 7 Dashboard Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b border-slate-200 bg-white rounded-xl p-1 shadow-xs">
          <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-1">
            <TabsTrigger
              value="problems"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none px-3.5 py-1.5 text-xs font-medium rounded-md text-slate-600 transition-colors"
            >
              Problems
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none px-3.5 py-1.5 text-xs font-medium rounded-md text-slate-600 transition-colors"
            >
              Assignments ({assignments.length})
            </TabsTrigger>
            <TabsTrigger
              value="in-progress"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none px-3.5 py-1.5 text-xs font-medium rounded-md text-slate-600 transition-colors"
            >
              In Progress ({inProgressItems.length})
            </TabsTrigger>
            <TabsTrigger
              value="solved"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none px-3.5 py-1.5 text-xs font-medium rounded-md text-slate-600 transition-colors"
            >
              Solved ({stats.solvedCount})
            </TabsTrigger>
            <TabsTrigger
              value="submissions"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none px-3.5 py-1.5 text-xs font-medium rounded-md text-slate-600 transition-colors"
            >
              Submissions ({submissions.length})
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none px-3.5 py-1.5 text-xs font-medium rounded-md text-slate-600 transition-colors"
            >
              Leaderboard
            </TabsTrigger>
            <TabsTrigger
              value="discuss"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none px-3.5 py-1.5 text-xs font-medium rounded-md text-slate-600 transition-colors"
            >
              Discuss
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. PROBLEMS TAB */}
        <TabsContent value="problems" className="space-y-6 m-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="w-full sm:w-80">
                <Input
                  placeholder="Search problems or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {["all", "easy", "medium", "hard"].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                      selectedDifficulty === diff
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
                <Link href="/coding/problems">
                  <Button variant="outline" size="sm" className="rounded-md text-xs font-medium text-slate-700 h-7 px-2.5 border-slate-200">
                    Table View
                  </Button>
                </Link>
              </div>
            </div>

            {/* Problem Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredProblems.slice(0, 9).map((prob) => {
                const status = CodingProgressService.getProblemStatus(prob.id);
                return (
                  <div
                    key={prob.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-mono text-slate-400">
                          #{prob.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded capitalize ${
                              prob.difficulty === "easy"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : prob.difficulty === "medium"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {prob.difficulty}
                          </span>
                          {status === "solved" ? (
                            <span className="text-[11px] font-medium text-emerald-700">
                              Solved
                            </span>
                          ) : status === "in_progress" ? (
                            <span className="text-[11px] font-medium text-amber-700">
                              In Progress
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <Link href={`/coding/problems/${prob.id}`}>
                        <h3 className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-xs line-clamp-1">
                          {prob.title}
                        </h3>
                      </Link>

                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {prob.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {(prob.topic_tags || []).slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {prob.acceptance_rate || "55%"} acceptance
                      </span>
                      <Link href={`/coding/problems/${prob.id}`}>
                        <Button
                          size="sm"
                          className="h-7 px-3 rounded text-xs font-medium bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition-colors shadow-none"
                        >
                          Solve
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 text-center">
              <Link href="/coding/problems">
                <Button variant="outline" className="rounded-lg border-slate-200 text-slate-700 text-xs font-medium h-8 px-4">
                  View All {problems.length} Problems
                </Button>
              </Link>
            </div>
          </div>
        </TabsContent>

        {/* 2. MY ASSIGNMENTS TAB */}
        <TabsContent value="assignments" className="space-y-4 m-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Curated Class Assignments</h2>
              <p className="text-xs text-slate-500">
                Problems assigned by your trainer. Submissions count directly toward cohort gradebook.
              </p>
            </div>

            {assignments.length === 0 ? (
              <div className="py-14 text-center text-slate-500 text-xs">
                <p className="font-bold text-slate-700 text-sm">No Active Assignments</p>
                <p className="mt-1 text-slate-400">
                  No coding problem sets have been assigned to your batch yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assign) => (
                  <div
                    key={assign.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {assign.assignedCohort}
                        </span>
                        <span className="text-xs text-slate-500">
                          Due: {new Date(assign.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">{assign.title}</h3>
                      <p className="text-xs text-slate-600">{assign.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>Assigned by: {assign.trainerName}</span>
                        <span>•</span>
                        <span>Max Score: {assign.maxScore} pts</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/coding/problems/${assign.problemIds[0] || "1"}`}>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs h-8 px-4">
                          Start Assignment
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3. IN PROGRESS TAB */}
        <TabsContent value="in-progress" className="space-y-4 m-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">In Progress Solutions</h2>
              <p className="text-xs text-slate-500">
                Problems with autosaved code and active workspace states. Click &quot;Continue&quot; to resume right where you left off.
              </p>
            </div>

            {inProgressItems.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                <h3 className="text-xs font-semibold text-slate-700">No problems currently in progress</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pick any problem from the problems library to begin writing code.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {inProgressItems.map(({ problem, state }) => (
                  <div
                    key={problem.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono text-slate-400">#{problem.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                          In Progress
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">{problem.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Language: {state.language.toUpperCase()} • Last saved:{" "}
                        {new Date(state.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>

                      <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-700 line-clamp-3">
                        {state.code || "// Draft code stored"}
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 capitalize">
                        Difficulty: {problem.difficulty}
                      </span>
                      <Link href={`/coding/problems/${problem.id}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs h-7 px-3 shadow-xs">
                          Continue
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 4. SOLVED PROBLEMS TAB */}
        <TabsContent value="solved" className="space-y-4 m-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Solved Problems ({solvedItems.length})</h2>
              <p className="text-xs text-slate-500">
                Problems completed with verified Accepted status by the online judge.
              </p>
            </div>

            {solvedItems.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                <h3 className="text-xs font-semibold text-slate-700">No solved problems yet</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submit a working solution that passes all test cases to mark it as solved.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {solvedItems.map(({ problem, state }) => (
                  <div key={problem.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">#{problem.id}</span>
                        <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">{problem.title}</h4>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded capitalize bg-slate-100 text-slate-700">
                          {problem.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Accepted on {new Date(state.updatedAt).toLocaleDateString()} • {state.language.toUpperCase()}
                      </p>
                    </div>

                    <Link href={`/coding/problems/${problem.id}`}>
                      <Button variant="outline" size="sm" className="rounded-lg text-xs font-medium text-slate-700 h-7 px-3 border-slate-200">
                        Review Solution
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 5. SUBMISSIONS TAB */}
        <TabsContent value="submissions" className="space-y-4 m-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Recent Online Judge Submissions</h2>
              <p className="text-xs text-slate-500">
                Real-time evaluation logs and execution metrics from the online compiler.
              </p>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                <h3 className="text-xs font-semibold text-slate-700">No submissions recorded</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Run and submit code in any problem to view official verdicts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Problem</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Language</th>
                      <th className="py-2.5 px-3">Runtime</th>
                      <th className="py-2.5 px-3">Test Cases</th>
                      <th className="py-2.5 px-3">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub) => {
                      const prob = problems.find((p) => p.id === sub.problem_id);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <Link href={`/coding/problems/${sub.problem_id}`} className="hover:text-blue-600">
                              {prob ? prob.title : `Problem #${sub.problem_id}`}
                            </Link>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                sub.status === "accepted"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {sub.status === "accepted" ? "Accepted" : "Wrong Answer"}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-600 uppercase font-medium">
                            {sub.language}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-600">
                            {sub.execution_time ? `${(sub.execution_time * 1000).toFixed(0)} ms` : "0.04 s"}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-700 font-medium">
                            {sub.passed_test_cases} / {sub.total_test_cases} passed
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-400">
                            {new Date(sub.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 6. LEADERBOARD TAB */}
        <TabsContent value="leaderboard" className="space-y-4 m-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Cohort Ranking & Leaderboard</h2>
              <p className="text-xs text-slate-500">
                Rankings calculated from solved problem difficulty weights and accuracy.
              </p>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-14 text-center text-slate-500 text-xs">
                <p className="font-bold text-slate-700 text-sm">No Cohort Rankings Yet</p>
                <p className="mt-1 text-slate-400">
                  All static mock rankings have been removed. Solve and submit coding problems to earn points and appear on the live leaderboard.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Solved Breakdown</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3">Streak</th>
                      <th className="py-2.5 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.map((lead) => (
                      <tr
                        key={lead.studentId}
                        className={`hover:bg-slate-50 transition-colors ${
                          lead.isCurrentUser ? "bg-slate-50 font-semibold" : ""
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-slate-700">#{lead.rank}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 font-medium">{lead.name}</span>
                            {lead.isCurrentUser && (
                              <span className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-bold">YOU</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          <span className="text-emerald-700 font-medium">{lead.easySolved}E</span>{" "}
                          <span className="text-amber-700 font-medium">{lead.mediumSolved}M</span>{" "}
                          <span className="text-rose-700 font-medium">{lead.hardSolved}H</span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600">{lead.acceptanceRate}</td>
                        <td className="py-3 px-3 text-[11px] text-slate-700 font-medium">
                          {lead.streakDays}d
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900">{lead.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 7. DISCUSS TAB */}
        <TabsContent value="discuss" className="space-y-4 m-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Community Discussions</h2>
              <p className="text-xs text-slate-500">
                Discuss algorithm optimizations, interview patterns, and common debugging tips.
              </p>
            </div>

            {discussPosts.length === 0 ? (
              <div className="py-14 text-center text-slate-500 text-xs">
                <p className="font-bold text-slate-700 text-sm">No Community Discussions Yet</p>
                <p className="mt-1 text-slate-400">
                  All static mock discussions have been removed. Discussions started by students or instructors will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {discussPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 text-xs">{post.author.name}</span>
                        {post.author.badge && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                            {post.author.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{post.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-3">
                      {post.content}
                    </p>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5">
                        {(post.tags || []).map((t: string) => (
                          <span key={t} className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={() => handleUpvote(post.id)}
                          className="text-slate-600 hover:text-slate-900 font-medium"
                        >
                          Upvote ({post.upvotes})
                        </button>
                        <span className="text-slate-400">
                          {post.commentsCount} replies
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
