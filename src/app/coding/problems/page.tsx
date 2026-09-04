"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CodingProblemsService } from "@/services/coding-problems.service";
import { CodingProgressService, type ProblemSolveStatus } from "@/services/coding-progress.service";
import { CodingAssignmentsService } from "@/services/coding-assignments.service";
import { SubmissionService } from "@/services/submission.service";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";

const TOPIC_OPTIONS = [
  "All",
  "Array",
  "String",
  "Hash Table",
  "Dynamic Programming",
  "Two Pointers",
  "Binary Search",
  "Math",
  "Stack",
  "Greedy",
  "Divide and Conquer"
];

const DIFFICULTY_RANK: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export default function ProblemsListPage() {
  const [problems, setProblems] = useState<ExtendedCodingProblem[]>(() => {
    return CodingProblemsService.getAllProblems() as ExtendedCodingProblem[];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedTopic, setSelectedTopic] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [quickTab, setQuickTab] = useState<"all" | "assigned" | "solved" | "in_progress">("all");

  // Sorting
  const [sortColumn, setSortColumn] = useState<"id" | "title" | "difficulty" | "acceptance">("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Assigned problem IDs
  const [assignedProblemIds, setAssignedProblemIds] = useState<Set<string>>(() => {
    const assigns = CodingAssignmentsService.getAssignments();
    const ids = new Set<string>();
    assigns.forEach((a) => a.problemIds.forEach((id) => ids.add(id)));
    return ids;
  });

  // Re-sync with database on mount and window focus
  useEffect(() => {
    const refreshData = async () => {
      try {
        const [all, subs] = await Promise.all([
          CodingProblemsService.fetchProblems(),
          SubmissionService.fetchStudentSubmissions(),
        ]);
        const problemsList = all as ExtendedCodingProblem[];
        setProblems(problemsList);
        CodingProgressService.syncWithSubmissions(subs, problemsList);
      } catch {
        const all = CodingProblemsService.getAllProblems() as ExtendedCodingProblem[];
        setProblems(all);
        const cachedSubs = SubmissionService.getStudentSubmissions();
        CodingProgressService.syncWithSubmissions(cachedSubs, all);
      }
      const assigns = CodingAssignmentsService.getAssignments();
      const ids = new Set<string>();
      assigns.forEach((a) => a.problemIds.forEach((id) => ids.add(id)));
      setAssignedProblemIds(ids);
    };

    refreshData();
    window.addEventListener("focus", refreshData);
    return () => window.removeEventListener("focus", refreshData);
  }, []);

  const handleSort = (column: "id" | "title" | "difficulty" | "acceptance") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      const status: ProblemSolveStatus = CodingProgressService.getProblemStatus(p.id);

      // Search match
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.includes(searchQuery) ||
        (p.topic_tags && p.topic_tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      // Difficulty match
      const matchDiff = selectedDifficulty === "all" || p.difficulty === selectedDifficulty;

      // Topic match
      const matchTopic =
        selectedTopic === "All" ||
        (p.topic_tags && p.topic_tags.includes(selectedTopic)) ||
        p.category === selectedTopic;

      // Status match
      let matchStatus = true;
      if (selectedStatus === "solved") matchStatus = status === "solved";
      else if (selectedStatus === "in_progress") matchStatus = status === "in_progress";
      else if (selectedStatus === "attempted") matchStatus = status === "attempted";
      else if (selectedStatus === "not_started") matchStatus = status === "not_started";

      // Quick tab filter
      let matchQuickTab = true;
      if (quickTab === "assigned") matchQuickTab = assignedProblemIds.has(p.id);
      else if (quickTab === "solved") matchQuickTab = status === "solved";
      else if (quickTab === "in_progress") matchQuickTab = status === "in_progress" || status === "attempted";

      return matchSearch && matchDiff && matchTopic && matchStatus && matchQuickTab;
    });
  }, [problems, searchQuery, selectedDifficulty, selectedTopic, selectedStatus, quickTab, assignedProblemIds]);

  const sortedProblems = useMemo(() => {
    return [...filteredProblems].sort((a, b) => {
      let comparison = 0;
      if (sortColumn === "id") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeA && timeB) {
          comparison = timeA - timeB;
        } else if (!isNaN(Number(a.id)) && !isNaN(Number(b.id))) {
          comparison = Number(a.id) - Number(b.id);
        } else {
          comparison = timeA - timeB;
        }
      } else if (sortColumn === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortColumn === "difficulty") {
        comparison = (DIFFICULTY_RANK[a.difficulty] || 0) - (DIFFICULTY_RANK[b.difficulty] || 0);
      } else if (sortColumn === "acceptance") {
        const rateA = parseFloat(a.acceptance_rate || "50");
        const rateB = parseFloat(b.acceptance_rate || "50");
        comparison = rateA - rateB;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredProblems, sortColumn, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedProblems.length / itemsPerPage));
  const paginatedProblems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedProblems.slice(start, start + itemsPerPage);
  }, [sortedProblems, currentPage, itemsPerPage]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedDifficulty("all");
    setSelectedTopic("All");
    setSelectedStatus("all");
    setQuickTab("all");
    setCurrentPage(1);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <Link href="/coding" className="hover:text-blue-600 transition-colors">Coding</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Problems</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Problem Explorer
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/coding">
            <Button variant="outline" className="border-slate-200 text-slate-700 font-medium rounded-lg text-xs h-9 px-3.5">
              Dashboard View
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3.5">
        {/* Quick Tab Filters */}
        <div className="flex flex-wrap items-center gap-1 pb-3 border-b border-slate-100">
          <button
            onClick={() => { setQuickTab("all"); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              quickTab === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Problems ({problems.length})
          </button>
          <button
            onClick={() => { setQuickTab("assigned"); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              quickTab === "assigned"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Assigned ({assignedProblemIds.size})
          </button>
          <button
            onClick={() => { setQuickTab("solved"); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              quickTab === "solved"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Solved
          </button>
          <button
            onClick={() => { setQuickTab("in_progress"); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              quickTab === "in_progress"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            In-Progress
          </button>
        </div>

        {/* Detailed Controls: Search, Difficulty, Status, Topic */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search problems or tags..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-lg focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => { setSelectedDifficulty(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-xs outline-none cursor-pointer"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-xs outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="solved">Solved</option>
              <option value="in_progress">In Progress</option>
              <option value="attempted">Attempted</option>
              <option value="not_started">Not Started</option>
            </select>

            {/* Topic Filter */}
            <select
              value={selectedTopic}
              onChange={(e) => { setSelectedTopic(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-xs outline-none cursor-pointer"
            >
              {TOPIC_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All Topics" : t}
                </option>
              ))}
            </select>

            {(searchQuery || selectedDifficulty !== "all" || selectedTopic !== "All" || selectedStatus !== "all" || quickTab !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 text-xs text-slate-500 hover:text-slate-900"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* LeetCode-style Problem List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th
                  onClick={() => handleSort("id")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none w-14"
                >
                  #
                </th>
                <th className="py-3 px-4 w-24">Status</th>
                <th
                  onClick={() => handleSort("title")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  Problem
                </th>
                <th
                  onClick={() => handleSort("difficulty")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none w-24"
                >
                  Difficulty
                </th>
                <th className="py-3 px-4">Topics</th>
                <th
                  onClick={() => handleSort("acceptance")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none w-24"
                >
                  Acceptance
                </th>
                <th className="py-3 px-4 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProblems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No problems match your current filter settings.
                  </td>
                </tr>
              ) : (
                paginatedProblems.map((prob, idx) => {
                  const status = CodingProgressService.getProblemStatus(prob.id);
                  const isAssigned = assignedProblemIds.has(prob.id);

                  return (
                    <tr
                      key={prob.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* # Number */}
                      <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-400 whitespace-nowrap" title={prob.id}>
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {status === "solved" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Solved
                          </span>
                        ) : status === "in_progress" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            In Progress
                          </span>
                        ) : status === "attempted" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            Attempted
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs font-medium">-</span>
                        )}
                      </td>

                      {/* Title */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/coding/problems/${prob.id}`}
                          className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2 text-xs"
                        >
                          <span>{prob.title}</span>
                          {isAssigned && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                              Assigned
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* Difficulty */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                            prob.difficulty === "easy"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : prob.difficulty === "medium"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {prob.difficulty}
                        </span>
                      </td>

                      {/* Topics */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(prob.topic_tags || []).slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Acceptance */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {prob.acceptance_rate || "55.0%"}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/coding/problems/${prob.id}`}>
                          <Button
                            size="sm"
                            className="h-7 px-3 rounded text-xs font-medium bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 transition-colors shadow-none"
                          >
                            Solve
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
            <strong>{Math.min(currentPage * itemsPerPage, sortedProblems.length)}</strong> of{" "}
            <strong>{sortedProblems.length}</strong> problems
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0 rounded border-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0 rounded border-slate-200"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
