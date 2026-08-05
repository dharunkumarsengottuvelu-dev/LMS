"use client";

import React, { useState } from "react";
import {
  FileText, Plus, Search, CheckCircle2, Clock, Eye, Edit, Trash2,
  Award, ArrowLeft, Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface StudentSubmission {
  id: string;
  studentName: string;
  assignmentTitle: string;
  batch: string;
  submittedAt: string;
  status: "graded" | "pending";
  gradeScore?: number;
  feedback?: string;
}

const initialSubmissions: StudentSubmission[] = [
  {
    id: "sub_1",
    studentName: "Dharunkumar Sengottuvelu",
    assignmentTitle: "Next.js 16 Server Components Architecture & RLS Security",
    batch: "Batch 2026-A",
    submittedAt: "2026-08-05 16:30",
    status: "graded",
    gradeScore: 98,
    feedback: "Exceptional code quality, flawless type safety, and clean RLS integration.",
  },
  {
    id: "sub_2",
    studentName: "Alex Rivera",
    assignmentTitle: "Next.js 16 Server Components Architecture & RLS Security",
    batch: "Batch 2026-A",
    submittedAt: "2026-08-05 17:15",
    status: "pending",
  },
];

export function AssignmentGradingHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(initialSubmissions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // View state: "list" | "create" | "grade"
  const [viewState, setViewState] = useState<"list" | "create" | "grade">("list");
  const [selectedSub, setSelectedSub] = useState<StudentSubmission | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newBatch, setNewBatch] = useState("Batch 2026-A");
  const [scoreInput, setScoreInput] = useState<number>(90);
  const [feedbackInput, setFeedbackInput] = useState("");

  const filtered = submissions.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.assignmentTitle.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    setViewState("list");
    setNewTitle("");
    toast({
      title: "Assignment Published",
      description: `"${newTitle}" assigned to ${newBatch}.`,
    });
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id === selectedSub.id) {
          return {
            ...s,
            status: "graded",
            gradeScore: scoreInput,
            feedback: feedbackInput || "Good work!",
          };
        }
        return s;
      })
    );

    setViewState("list");
    toast({
      title: "Submission Graded",
      description: `Graded ${selectedSub.studentName}: ${scoreInput}%`,
    });
  };

  // FULL PAGE ASSIGNMENT CREATOR VIEW
  if (viewState === "create") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button
            onClick={() => setViewState("list")}
            variant="outline"
            size="sm"
            className="h-9 font-bold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Submissions
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              Create & Publish Assignment
            </h1>
            <p className="text-xs text-[#6B7280]">Assign code challenges or practical project work to learners</p>
          </div>
        </div>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm">
          <form onSubmit={handleCreateAssignment} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Assignment Title</label>
              <Input
                placeholder="e.g. Next.js 16 API Routes & Middleware Security"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Cohort Batch</label>
              <Select value={newBatch} onValueChange={(val) => setNewBatch(val || "Batch 2026-A")}>
                <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Batch 2026-A">Batch 2026-A</SelectItem>
                  <SelectItem value="Batch 2026-B">Batch 2026-B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("list")} className="h-[48px] px-6 font-bold text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
                <Sparkles className="h-4 w-4" /> Publish Assignment
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
      <div className="space-y-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button
            onClick={() => setViewState("list")}
            variant="outline"
            size="sm"
            className="h-9 font-bold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Submissions
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              Grade Submission: {selectedSub.studentName}
            </h1>
            <p className="text-xs text-[#6B7280]">{selectedSub.assignmentTitle} • {selectedSub.batch}</p>
          </div>
        </div>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm">
          <form onSubmit={handleSaveGrade} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Score Percentage (0 - 100)</label>
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
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Instructor Feedback</label>
              <Textarea
                placeholder="Provide feedback for the learner..."
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
                <CheckCircle2 className="h-4 w-4" /> Save & Submit Grade
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {role === "admin" ? "Enterprise Assignment & Evaluation Manager" : "Assignment Submissions & Grading"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Review student code submissions, assign scores, provide feedback, and publish assignments
          </p>
        </div>

        <Button
          onClick={() => setViewState("create")}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20"
        >
          <Plus className="h-4 w-4" /> Create New Assignment
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search student or assignment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
            <SelectTrigger className="h-[44px] text-xs w-[180px] bg-[#F9FAFB] dark:bg-[#09090B]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Submissions Table */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">Student Name</th>
                <th className="p-4">Assignment Title</th>
                <th className="p-4">Cohort</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4">Grade & Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                  <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">
                    {s.studentName}
                  </td>

                  <td className="p-4 text-xs font-medium text-[#111827] dark:text-[#FAFAFA]">
                    {s.assignmentTitle}
                  </td>

                  <td className="p-4">
                    <Badge variant="outline" className="text-xs font-bold border-[#2563EB]/30 text-[#2563EB]">
                      {s.batch}
                    </Badge>
                  </td>

                  <td className="p-4 text-xs text-[#6B7280] font-mono">
                    {s.submittedAt}
                  </td>

                  <td className="p-4">
                    {s.status === "graded" ? (
                      <span className="font-bold text-xs text-[#16A34A] flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Graded ({s.gradeScore}%)
                      </span>
                    ) : (
                      <Badge className="bg-[#F59E0B] text-white text-[10px] font-bold">
                        Pending Review
                      </Badge>
                    )}
                  </td>

                  <td className="p-4 pr-6 text-right space-x-2">
                    <Button
                      onClick={() => {
                        setSelectedSub(s);
                        setScoreInput(s.gradeScore || 90);
                        setFeedbackInput(s.feedback || "");
                        setViewState("grade");
                      }}
                      size="sm"
                      className="h-8 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1"
                    >
                      <Award className="h-3.5 w-3.5" /> {s.status === "graded" ? "Edit Grade" : "Grade Submission"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
