"use client";

import React, { useState, useEffect } from "react";
import {
  FileText, Plus, Search, CheckCircle2, Clock, Eye, Edit, Trash2,
  Award, ArrowLeft, Sparkles, Globe, Boxes
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layouts/page-header";
import { VisibilitySelector } from "@/components/admin/visibility-selector";
import { AutoSaveBadge } from "@/components/ui/auto-save-badge";

export interface StudentSubmission {
  id: string;
  studentName: string;
  assignmentTitle: string;
  batch: string;
  submittedAt: string;
  status: "graded" | "pending";
  gradeScore?: number;
  feedback?: string;
  githubUrl?: string;
  fileUrl?: string;
}

export interface ManagedAssignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  deadline: string;
  maxMarks: number;
  isCommon: boolean;
  assignedBatches: string[];
  submissionCount: number;
}

export function AssignmentGradingHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [assignments, setAssignments] = useState<ManagedAssignment[]>([]);
  const [allBatches, setAllBatches] = useState<Array<{ id: string; name: string; collegeName?: string }>>([]);

  const loadData = async () => {
    try {
      // 1. Fetch assignments & batches from API
      const res = await fetch("/api/admin/assignments");
      if (res.ok) {
        const data = await res.json();
        if (data.assignments) setAssignments(data.assignments);
        if (data.batches) setAllBatches(data.batches);
      }

      // 2. Fetch submissions
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: subData } = await supabase
        .from("assignment_submissions")
        .select("*, assignments(title), profiles(first_name, last_name, email, batch_name)")
        .order("submitted_at", { ascending: false });

      if (subData) {
        const mapped: StudentSubmission[] = subData.map((s: any) => ({
          id: s.id,
          studentName: `${s.profiles?.first_name || ""} ${s.profiles?.last_name || ""}`.trim() || s.profiles?.email || "Student",
          assignmentTitle: s.assignments?.title || "Assignment",
          batch: s.profiles?.batch_name || "Enrolled Batch",
          submittedAt: s.submitted_at || new Date().toISOString(),
          status: s.status === "graded" ? "graded" : "pending",
          gradeScore: s.marks || undefined,
          feedback: s.feedback || undefined,
          githubUrl: s.github_link || undefined,
          fileUrl: s.file_url || undefined,
        }));
        setSubmissions(mapped);
      }
    } catch (err) {
      console.error("Failed to load assignments", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // View state: "list" | "create" | "grade"
  const [viewState, setViewState] = useState<"list" | "create" | "grade">("list");
  const [selectedSub, setSelectedSub] = useState<StudentSubmission | null>(null);

  // Form State for Assignment Authoring
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newMaxMarks, setNewMaxMarks] = useState(100);
  const [isCommon, setIsCommon] = useState(true);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-Save Assignment Draft State
  const [lastSavedAssignDraft, setLastSavedAssignDraft] = useState<string | null>(null);
  const [isSavedAssignDraft, setIsSavedAssignDraft] = useState<boolean>(true);

  // Restore draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("draft_assignment");
      if (stored) {
        const d = JSON.parse(stored);
        if (d) {
          if (d.newTitle) setNewTitle(d.newTitle);
          if (d.newDescription) setNewDescription(d.newDescription);
          if (d.newDeadline) setNewDeadline(d.newDeadline);
          if (d.newMaxMarks) setNewMaxMarks(d.newMaxMarks);
          if (d.isCommon !== undefined) setIsCommon(d.isCommon);
          if (d.selectedBatches) setSelectedBatches(d.selectedBatches);
          setLastSavedAssignDraft(d.savedAt || new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.warn("Failed to load assignment draft", e);
    }
  }, []);

  // Auto-save assignment draft
  useEffect(() => {
    if (typeof window === "undefined" || viewState !== "create") return;
    if (!newTitle && !newDescription) return;
    setIsSavedAssignDraft(false);
    const timer = setTimeout(() => {
      try {
        const d = {
          newTitle, newDescription, newDeadline, newMaxMarks, isCommon, selectedBatches,
          savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        localStorage.setItem("draft_assignment", JSON.stringify(d));
        setIsSavedAssignDraft(true);
        setLastSavedAssignDraft(d.savedAt);
      } catch (e) {
        console.warn("Failed to auto-save assignment draft", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newTitle, newDescription, newDeadline, newMaxMarks, isCommon, selectedBatches, viewState]);

  // Grade Form State
  const [scoreInput, setScoreInput] = useState<number>(90);
  const [feedbackInput, setFeedbackInput] = useState("");

  const filtered = submissions.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.assignmentTitle.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast({ title: "Title Required", description: "Please enter assignment title.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || newTitle.trim(),
          instructions: newDescription.trim(),
          deadline: newDeadline || new Date(Date.now() + 7 * 86400000).toISOString(),
          maxMarks: newMaxMarks,
          isCommon,
          assignedBatches: isCommon ? [] : selectedBatches,
        }),
      });

      if (res.ok) {
        toast({
          title: "Assignment Published",
          description: `"${newTitle}" successfully published with ${isCommon ? "Common (All Batches)" : `${selectedBatches.length} batch(es)`} visibility.`,
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("draft_assignment");
        }
        setViewState("list");
        setNewTitle("");
        setNewDescription("");
        setIsCommon(true);
        setSelectedBatches([]);
        loadData();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to publish assignment");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await (supabase.from("assignment_submissions") as any).update({
        status: "graded",
        marks: scoreInput,
        feedback: feedbackInput || "Evaluated by Instructor",
        graded_at: new Date().toISOString(),
      }).eq("id", selectedSub.id);

      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.id === selectedSub.id) {
            return {
              ...s,
              status: "graded",
              gradeScore: scoreInput,
              feedback: feedbackInput || "Evaluated by Instructor",
            };
          }
          return s;
        })
      );

      setViewState("list");
      toast({
        title: "Submission Graded",
        description: `Graded ${selectedSub.studentName}: ${scoreInput} marks`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // FULL PAGE ASSIGNMENT CREATOR VIEW WITH VISIBILITY SELECTOR
  if (viewState === "create") {
    return (
      <div className="space-y-8 w-full animate-fade-up">
        <PageHeader
          title="Create & Publish Assignment"
          description="Author practical project work and configure Common or specific batch visibility"
          backAction={{ label: "Back to Submissions", onClick: () => setViewState("list") }}
          actions={<AutoSaveBadge isSaved={isSavedAssignDraft} lastSaved={lastSavedAssignDraft} />}
        />

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm">
          <form onSubmit={handleCreateAssignment} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Assignment Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Fullstack React & Next.js Authentication Project"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Instructions & Submission Requirements
              </label>
              <Textarea
                placeholder="Provide detailed instructions, acceptance criteria, and repository submission guidelines..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={4}
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Deadline</label>
                <Input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Maximum Score Marks</label>
                <Input
                  type="number"
                  min={10}
                  max={500}
                  value={newMaxMarks}
                  onChange={(e) => setNewMaxMarks(Number(e.target.value))}
                  className="h-[48px] text-xs font-bold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>
            </div>

            {/* BATCH VISIBILITY SELECTOR (Rule 8, 9, 10, 11, 12) */}
            <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <VisibilitySelector
                isCommon={isCommon}
                selectedBatches={selectedBatches}
                batches={allBatches}
                onChange={({ isCommon: c, selectedBatches: b }) => {
                  setIsCommon(c);
                  setSelectedBatches(b);
                }}
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("list")} className="h-[48px] px-6 font-bold text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20"
              >
                <Sparkles className="h-4 w-4" /> {isSubmitting ? "Publishing..." : "Publish Assignment"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // FULL PAGE GRADING VIEW
  if (viewState === "grade" && selectedSub) {
    return (
      <div className="space-y-8 w-full animate-fade-up">
        <PageHeader
          title={`Grade Submission: ${selectedSub.studentName}`}
          description={`${selectedSub.assignmentTitle} • ${selectedSub.batch}`}
          backAction={{ label: "Back to Submissions", onClick: () => setViewState("list") }}
        />

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm">
          <form onSubmit={handleSaveGrade} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Score Marks (0 - 100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={scoreInput}
                onChange={(e) => setScoreInput(Number(e.target.value))}
                required
                className="h-[48px] text-sm font-bold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Instructor Evaluation Feedback</label>
              <Textarea
                placeholder="Provide constructive feedback for the learner..."
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                rows={4}
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("list")} className="h-[48px] px-6 font-bold text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="h-[48px] px-8 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#16A34A]/20">
                <CheckCircle2 className="h-4 w-4" /> Save & Submit Evaluation
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Top Banner */}
      <PageHeader
        title={role === "admin" ? "Enterprise Assignment & Evaluation Manager" : "Assignment Submissions & Grading"}
        description="Author assignments with Common or batch-based access control, evaluate submissions, and track progress."
        actions={
          <Button
            onClick={() => {
              setNewTitle("");
              setNewDescription("");
              setIsCommon(true);
              setSelectedBatches([]);
              setViewState("create");
            }}
            className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20"
          >
            <Plus className="h-4 w-4" /> Create New Assignment
          </Button>
        }
      />

      {/* Filter Controls */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 shadow-sm rounded-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search by student name or assignment title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2">
            {["all", "pending", "graded"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className={`h-9 text-xs font-semibold capitalize rounded-xl ${
                  statusFilter === status
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "border-[#E5E7EB] dark:border-[#27272A]"
                }`}
              >
                {status === "all" ? "All Submissions" : status}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Submissions Table / Cards */}
      {filtered.length === 0 ? (
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-12 text-center rounded-2xl">
          <FileText className="h-12 w-12 text-[#6B7280] mx-auto opacity-40 mb-3" />
          <h3 className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">No Submissions Found</h3>
          <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
            Student assignment submissions will appear here automatically for review and grading.
          </p>
        </Card>
      ) : (
        <div className="border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden bg-white dark:bg-[#18181B] divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
          {filtered.map((sub) => (
            <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">{sub.studentName}</span>
                  <Badge variant="outline" className="text-[10px] text-[#2563EB] bg-[#2563EB]/5">
                    {sub.batch}
                  </Badge>
                  <Badge
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                      sub.status === "graded"
                        ? "bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30"
                        : "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30"
                    }`}
                  >
                    {sub.status}
                  </Badge>
                </div>
                <p className="text-xs text-[#6B7280]">{sub.assignmentTitle}</p>
                {sub.gradeScore !== undefined && (
                  <p className="text-xs font-semibold text-[#16A34A]">Score: {sub.gradeScore} / 100</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedSub(sub);
                    setScoreInput(sub.gradeScore || 90);
                    setFeedbackInput(sub.feedback || "");
                    setViewState("grade");
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl"
                >
                  {sub.status === "graded" ? "Update Grade" : "Evaluate & Grade"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
