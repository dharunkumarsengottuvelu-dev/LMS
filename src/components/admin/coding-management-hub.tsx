"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layouts/page-header";
import { Search, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodingProblemCreator } from "@/components/admin/coding-problem-creator";
import { CodingProblemsService } from "@/services/coding-problems.service";
import type { CodingProblem } from "@/types/coding";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CodingManagementHubProps {
  role?: "admin" | "trainer";
}

export function CodingManagementHub({ role = "admin" }: CodingManagementHubProps) {
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [problems, setProblems] = useState<(ExtendedCodingProblem | CodingProblem)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProblem, setEditingProblem] = useState<CodingProblem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Delete modal state
  const [problemToDelete, setProblemToDelete] = useState<CodingProblem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshProblems = async () => {
    try {
      const data = await CodingProblemsService.fetchProblems();
      setProblems(data);
    } catch (err) {
      console.error("Failed to load problems from database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProblems();
    window.addEventListener("focus", refreshProblems);
    return () => window.removeEventListener("focus", refreshProblems);
  }, []);

  // Filtered list
  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        problem.title.toLowerCase().includes(q) ||
        (problem as any).slug?.toLowerCase().includes(q) ||
        problem.id.toLowerCase().includes(q) ||
        (problem.category && problem.category.toLowerCase().includes(q)) ||
        ((problem as ExtendedCodingProblem).topic_tags &&
          (problem as ExtendedCodingProblem).topic_tags?.some((t) => t.toLowerCase().includes(q)));

      // Difficulty filter
      const matchesDifficulty =
        selectedDifficulty === "all" || problem.difficulty === selectedDifficulty;

      // Category filter
      const isSql = problem.category === "Databases" || !!(problem as any).sql_engine;
      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "sql" && isSql) ||
        (selectedCategory === "algorithms" && !isSql);

      return matchesSearch && matchesDifficulty && matchesCategory;
    });
  }, [problems, searchQuery, selectedDifficulty, selectedCategory]);

  const handleOpenEdit = (problem: ExtendedCodingProblem | CodingProblem) => {
    setEditingProblem(problem as CodingProblem);
    setViewMode("edit");
  };

  const handleConfirmDelete = async () => {
    if (!problemToDelete) return;
    setIsDeleting(true);
    try {
      await CodingProblemsService.deleteProblem(problemToDelete.id);
      toast.success(`Problem "${problemToDelete.title}" deleted.`);
      setProblemToDelete(null);
      refreshProblems();
    } catch {
      toast.error("Failed to delete problem.");
    } finally {
      setIsDeleting(false);
    }
  };

  // If in Create Mode
  if (viewMode === "create") {
    return (
      <div className="w-full">
        <CodingProblemCreator
          onCancel={() => setViewMode("list")}
          onSave={() => {
            setViewMode("list");
            refreshProblems();
          }}
        />
      </div>
    );
  }

  // If in Edit Mode
  if (viewMode === "edit" && editingProblem) {
    return (
      <div className="w-full">
        <CodingProblemCreator
          initialProblem={editingProblem}
          onCancel={() => {
            setEditingProblem(null);
            setViewMode("list");
          }}
          onSave={() => {
            setEditingProblem(null);
            setViewMode("list");
            refreshProblems();
          }}
        />
      </div>
    );
  }

  // Management Hub (List View) - Pure Admin / Trainer Functionality
  return (
    <div className="space-y-8">
      {/* Unified Enterprise Page Header matching PracticesHub */}
      <PageHeader
        title={role === "admin" ? "Coding Problems Repository" : "Coding Practice Problems"}
        description="Configure, author, and manage algorithmic problems and SQL challenges"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => {
                setEditingProblem(null);
                setViewMode("create");
              }}
              className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2 px-5 rounded-xl shrink-0 shadow-sm text-xs"
            >
              <Plus className="h-4 w-4" /> Create Problem
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar matching Practices / Courses Hub */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2 rounded-xl shadow-sm">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search problems by title, slug, ID, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-none shadow-none focus-visible:ring-0 w-full rounded-lg"
          />
        </div>

        <div className="flex items-center w-full md:w-auto shrink-0 gap-2 border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#27272A] pt-3 md:pt-0 md:pl-4">
          <Select value={selectedDifficulty} onValueChange={(val) => setSelectedDifficulty(val || "all")}>
            <SelectTrigger className="h-10 text-xs w-full md:w-[150px] bg-transparent border-none shadow-none focus:ring-0">
              <SelectValue placeholder="All Difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || "all")}>
            <SelectTrigger className="h-10 text-xs w-full md:w-[170px] bg-transparent border-none shadow-none focus:ring-0">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="algorithms">Algorithms / Code</SelectItem>
              <SelectItem value="sql">Databases / SQL</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || selectedDifficulty !== "all" || selectedCategory !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedDifficulty("all");
                setSelectedCategory("all");
              }}
              className="h-9 px-2 text-xs text-slate-500 hover:text-slate-900"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Problems Management Table - Pure Admin / Trainer Functionality */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 w-14">#</th>
                <th className="py-2.5 px-4">Problem Name</th>
                <th className="py-2.5 px-4 w-28">Difficulty</th>
                <th className="py-2.5 px-4 w-28">Type</th>
                <th className="py-2.5 px-4 w-36">Test Cases</th>
                <th className="py-2.5 px-4 w-24">Points</th>
                <th className="py-2.5 px-4 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span>Loading live problems from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-500 text-xs">
                    <p className="font-bold text-slate-700 text-sm">No Coding Problems in Database</p>
                    <p className="mt-1 text-slate-400">
                      All static mock data has been removed. Click &quot;Create Problem&quot; above to create your first question in Supabase.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProblems.map((prob) => {
                  const testCases = prob.test_cases || [];
                  const publicCount = testCases.filter((tc) => !tc.is_hidden).length;
                  const hiddenCount = testCases.filter((tc) => tc.is_hidden).length;
                  const isSql = prob.category === "Databases" || !!prob.sql_engine;

                  return (
                    <tr key={prob.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-400">
                        #{prob.id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">
                            {prob.title}
                          </span>
                          {prob.slug && (
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              {prob.slug}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
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

                      <td className="py-3 px-4">
                        {isSql ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            SQL
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            Algorithm
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-slate-600">
                          <span>{publicCount} public</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400">{hiddenCount} hidden</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                        {prob.points || 10} pts
                      </td>

                      {/* Admin Actions: Edit & Delete only */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button
                            onClick={() => handleOpenEdit(prob)}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Edit
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => setProblemToDelete(prob as CodingProblem)}
                            className="font-medium text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!problemToDelete} onOpenChange={(open) => !open && setProblemToDelete(null)}>
        <DialogContent className="max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Delete Coding Problem
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete <strong>{problemToDelete?.title}</strong>? Students will no longer be able to access or submit solutions for this problem.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProblemToDelete(null)}
              className="rounded-lg text-xs font-semibold border-slate-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
