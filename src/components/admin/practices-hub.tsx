"use client";

import React, { useState, useEffect } from "react";
import {
  Dumbbell, Search, Users, CheckCircle2, Clock, Plus,
  BookOpen, Code2, FileText, Video, UserCheck,
  ShieldCheck, PlayCircle, StickyNote, ListChecks,
  ArrowLeft, FolderKanban, Sparkles, Trash2, Edit, Save,
  HelpCircle, Layers
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLMSStore } from "@/lib/store/lms-store";
import { CodingProblemCreator } from "@/components/admin/coding-problem-creator";
import type { PracticeTrackItem } from "@/services/assessment.service";
import { PageHeader } from "@/components/layouts/page-header";

// ─── Types aligned with Student Portal assessments page ────
interface SubModuleItem {
  id: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
}

export interface MCQQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MCQQuestionItem {
  id: string;
  questionText: string;
  options: MCQQuestionOption[];
  explanation?: string;
}

export interface CodingQuestionItem {
  id: string;
  title: string;
  description: string;
  difficulty?: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  templates?: Record<string, string>;
  publicTestCases?: any[];
  hiddenTestCases?: any[];
}

interface PracticeTrack {
  id: string;
  title: string;
  category: string;
  description: string;
  assignedByName: string;
  subModules: SubModuleItem[];
  assignedBatches: string[];
  assignedStudents: string[];
}

const initialTracks: PracticeTrack[] = [];

type ViewState = "list" | "create" | "edit" | "detail" | "add-module" | "assign" | "create-coding";

export function PracticesHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<PracticeTrack[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // Try loading from localStorage first to prevent losing data
      const savedTracks = localStorage.getItem("enterprise_lms_practice_tracks_v2");
      if (savedTracks) {
        try {
          setTracks(JSON.parse(savedTracks));
        } catch (e) {
          console.error("Failed to parse saved tracks", e);
        }
      } else {
        const { data: tracksData, error } = await supabase
          .from("practice_tracks")
          .select("*")
          .order("created_at", { ascending: false });

        if (tracksData && !error) {
          const mappedTracks: PracticeTrack[] = tracksData.map((t: any) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            description: t.description || "Practice Track",
            assignedByName: "Admin",
            subModules: [], // Can be fetched from a related table if needed
            assignedBatches: [],
            assignedStudents: []
          }));
          setTracks(mappedTracks);
        }
      }

      const { data: studentsData } = await supabase.from("profiles").select("*").eq("role", "student");
      if (studentsData) {
        setAllStudents(studentsData.map((s: any) => ({
          id: s.id,
          name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email?.split("@")[0] || "Unknown",
          email: s.email,
          batch: s.batch || "Unassigned Batch"
        })));
      }

      const { data: batchesData } = await supabase.from("batches").select("batch_name");
      if (batchesData) {
        setAllBatches(batchesData.map((b: any) => b.batch_name));
      }
    };
    fetchData();
  }, []);

  const [search, setSearch] = useState("");
  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedTrack, setSelectedTrack] = useState<PracticeTrack | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Track form state
  const [fTitle, setFTitle]       = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fDesc, setFDesc]         = useState("");
  const [fAssignedBy, setFAssignedBy] = useState("");

  // Sub-module form state
  const [smTitle, setSmTitle]           = useState("");
  const [smType, setSmType]             = useState<"mcq" | "coding" | "mixed">("mcq");
  const [smDuration, setSmDuration]     = useState(30);
  const [smMarks, setSmMarks]           = useState(100);
  const [smQuestions, setSmQuestions]    = useState(10);
  const [smHasHiddenTests, setSmHasHiddenTests] = useState(false);
  const [smHiddenTests, setSmHiddenTests] = useState("");
  const [smProblemDesc, setSmProblemDesc] = useState("");
  const [smStarterCode, setSmStarterCode] = useState("");
  const [smPublicTestCases, setSmPublicTestCases] = useState("");
  const [showCodingProblemBuilder, setShowCodingProblemBuilder] = useState(false);

  // Coding Questions State
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestionItem[]>([
    {
      id: "cq1",
      title: "Find the Largest Element",
      description: "Given an array of integers, write a program to find and output the largest element in the array.",
    },
  ]);

  const addCodingQuestion = () => {
    const cqId = `cq_${Date.now()}`;
    setCodingQuestions((prev) => [
      ...prev,
      {
        id: cqId,
        title: `Coding Problem ${prev.length + 1}`,
        description: "",
      },
    ]);
  };

  const removeCodingQuestion = (cqId: string) => {
    if (codingQuestions.length > 1) {
      setCodingQuestions((prev) => prev.filter((cq) => cq.id !== cqId));
    }
  };

  const updateCodingQuestion = (cqId: string, data: any) => {
    setCodingQuestions((prev) =>
      prev.map((cq) => (cq.id === cqId ? { ...cq, ...data } : cq))
    );
  };

  // MCQ Questions State
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestionItem[]>([
    {
      id: "q1",
      questionText: "",
      options: [
        { id: "o1", text: "", isCorrect: true },
        { id: "o2", text: "", isCorrect: false },
        { id: "o3", text: "", isCorrect: false },
        { id: "o4", text: "", isCorrect: false },
      ],
      explanation: "",
    },
  ]);

  const addMcqQuestion = () => {
    const qId = `q_${Date.now()}`;
    setMcqQuestions((prev) => [
      ...prev,
      {
        id: qId,
        questionText: "",
        options: [
          { id: `o_${Date.now()}_1`, text: "", isCorrect: true },
          { id: `o_${Date.now()}_2`, text: "", isCorrect: false },
          { id: `o_${Date.now()}_3`, text: "", isCorrect: false },
          { id: `o_${Date.now()}_4`, text: "", isCorrect: false },
        ],
        explanation: "",
      },
    ]);
  };

  const removeMcqQuestion = (qId: string) => {
    if (mcqQuestions.length > 1) {
      setMcqQuestions((prev) => prev.filter((q) => q.id !== qId));
    }
  };

  const updateQuestionText = (qId: string, text: string) => {
    setMcqQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, questionText: text } : q))
    );
  };

  const updateOptionText = (qId: string, optId: string, text: string) => {
    setMcqQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.map((o: MCQQuestionOption) => (o.id === optId ? { ...o, text } : o)),
            }
          : q
      )
    );
  };

  const setCorrectOption = (qId: string, optId: string) => {
    setMcqQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.map((o: MCQQuestionOption) => ({ ...o, isCorrect: o.id === optId })),
            }
          : q
      )
    );
  };

  const addOptionToQuestion = (qId: string) => {
    setMcqQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: [
                ...q.options,
                { id: `o_${Date.now()}`, text: "", isCorrect: false },
              ],
            }
          : q
      )
    );
  };

  const removeOptionFromQuestion = (qId: string, optId: string) => {
    setMcqQuestions((prev) =>
      prev.map((q) =>
        q.id === qId && q.options.length > 2
          ? {
              ...q,
              options: q.options.filter((o: MCQQuestionOption) => o.id !== optId),
            }
          : q
      )
    );
  };

  const updateQuestionExplanation = (qId: string, exp: string) => {
    setMcqQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, explanation: exp } : q))
    );
  };

  // Assign state
  const [selectedBatches, setSelectedBatches]       = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchFilter, setBatchFilter]               = useState("all");

  const filtered = tracks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFTitle(""); setFCategory(""); setFDesc(""); setFAssignedBy("");
  };

  const openCreate = () => { resetForm(); setEditingId(null); setViewState("create"); };

  const openEdit = (t: PracticeTrack) => {
    setEditingId(t.id);
    setFTitle(t.title); setFCategory(t.category);
    setFDesc(t.description); setFAssignedBy(t.assignedByName);
    setViewState("edit");
  };

  const syncTracksToStore = (newTracks: PracticeTrack[]) => {
    setTracks(newTracks);
    localStorage.setItem("enterprise_lms_practice_tracks_v2", JSON.stringify(newTracks));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle) return;
    const created: PracticeTrack = {
      id: `track_${Date.now()}`,
      title: fTitle, category: fCategory || "General",
      description: fDesc || "New practice track for students.",
      assignedByName: fAssignedBy || (role === "admin" ? "Admin" : "Trainer"),
      subModules: [], assignedBatches: [], assignedStudents: [],
    };
    const updated = [created, ...tracks];
    syncTracksToStore(updated);
    setViewState("list");
    toast({ title: "Practice Track Created", description: `"${fTitle}" saved and assigned to students.` });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const updated = tracks.map((t) =>
      t.id === editingId ? { ...t, title: fTitle, category: fCategory, description: fDesc, assignedByName: fAssignedBy } : t
    );
    syncTracksToStore(updated);
    setViewState("list");
    toast({ title: "Practice Track Updated", description: `"${fTitle}" saved.` });
  };

  const handleDelete = (id: string, title: string) => {
    const updated = tracks.filter((t) => t.id !== id);
    syncTracksToStore(updated);
    toast({ title: "Practice Track Removed", description: title, variant: "destructive" });
  };

  const handleAddSubModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrack || !smTitle) return;
    const newSm: SubModuleItem & {
      hasHiddenTests?: boolean;
      hiddenTestsCode?: string;
      problemDescription?: string;
      starterCode?: string;
      publicTestCases?: string;
      mcqQuestions?: MCQQuestionItem[];
      codingQuestions?: CodingQuestionItem[];
    } = {
      id: `sm_${Date.now()}`, title: smTitle, type: smType,
      durationMinutes: smDuration, totalMarks: smMarks, questionCount: smQuestions,
      ...(smType === "mcq" || smType === "mixed" ? { mcqQuestions } : {}),
      ...(smType === "coding" || smType === "mixed" ? {
        hasHiddenTests: smHasHiddenTests,
        hiddenTestsCode: smHasHiddenTests ? smHiddenTests : undefined,
        problemDescription: smProblemDesc,
        starterCode: smStarterCode,
        publicTestCases: smPublicTestCases,
        codingQuestions,
      } : {})
    };
    const updatedTrack = { ...selectedTrack, subModules: [...selectedTrack.subModules, newSm] };
    setSelectedTrack(updatedTrack);
    const updatedTracks = tracks.map((t) => (t.id === selectedTrack.id ? updatedTrack : t));
    syncTracksToStore(updatedTracks);
    setSmTitle(""); setSmDuration(30); setSmMarks(100); setSmQuestions(10);
    setSmHasHiddenTests(false); setSmHiddenTests("");
    setSmProblemDesc(""); setSmStarterCode(""); setSmPublicTestCases("");
    setCodingQuestions([
      {
        id: "cq1",
        title: "Find the Largest Element",
        description: "Given an array of integers, write a program to find and output the largest element in the array.",
      },
    ]);
    setMcqQuestions([
      {
        id: "q1",
        questionText: "",
        options: [
          { id: "o1", text: "", isCorrect: true },
          { id: "o2", text: "", isCorrect: false },
          { id: "o3", text: "", isCorrect: false },
          { id: "o4", text: "", isCorrect: false },
        ],
        explanation: "",
      },
    ]);
    setViewState("detail");
    toast({ title: "Sub-Module Added", description: `"${smTitle}" added.` });
  };

  const handleDeleteSubModule = (trackId: string, smId: string) => {
    const updatedTracks = tracks.map((t) =>
      t.id === trackId ? { ...t, subModules: t.subModules.filter((s) => s.id !== smId) } : t
    );
    syncTracksToStore(updatedTracks);
    if (selectedTrack?.id === trackId) {
      setSelectedTrack((prev) => prev ? { ...prev, subModules: prev.subModules.filter((s) => s.id !== smId) } : prev);
    }
  };

  const openAssign = (t: PracticeTrack) => {
    setSelectedTrack(t);
    setSelectedBatches([...(t.assignedBatches || [])]);
    setSelectedStudentIds([...(t.assignedStudents || [])]);
    setBatchFilter("all");
    setViewState("assign");
  };

  const toggleBatch = (batch: string) => {
    const ids = allStudents.filter((s) => s.batch === batch).map((s) => s.id);
    if (selectedBatches.includes(batch)) {
      setSelectedBatches((p) => p.filter((b) => b !== batch));
      setSelectedStudentIds((p) => p.filter((id) => !ids.includes(id)));
    } else {
      setSelectedBatches((p) => [...p, batch]);
      setSelectedStudentIds((p) => [...new Set([...p, ...ids])]);
    }
  };

  const toggleStudent = (id: string) =>
    setSelectedStudentIds((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  const handleSaveAssign = () => {
    if (!selectedTrack) return;
    const updatedTracks = tracks.map((t) =>
      t.id === selectedTrack.id ? { ...t, assignedBatches: selectedBatches, assignedStudents: selectedStudentIds } : t
    );
    syncTracksToStore(updatedTracks);
    toast({ title: "Practice Track Assigned", description: `${selectedStudentIds.length} students assigned.` });
    setViewState("list");
  };

  const displayStudents = batchFilter === "all" ? allStudents : allStudents.filter((s) => s.batch === batchFilter);

  const typeBadgeColor = (type: string) =>
    type === "mcq" ? "bg-[#2563EB] text-white font-medium"
    : type === "coding" ? "bg-[#9333EA] text-white font-medium"
    : "bg-[#D97706] text-white font-medium";

  if (viewState === "create-coding") {
    return <CodingProblemCreator onCancel={() => setViewState("list")} />;
  }

  // ════════════════════════════════════════════════════════════
  // VIEW: CREATE / EDIT TRACK (MNC CORPORATE STYLING)
  // ════════════════════════════════════════════════════════════
  if (viewState === "create" || viewState === "edit") {
    const isEdit = viewState === "edit";
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <PageHeader 
          title={isEdit ? "Edit Practice Track" : "Create New Practice Track"}
          description="Configure practice track parameters for student deployment"
          backAction={{ label: "Back to Practices", onClick: () => setViewState("list") }}
        />

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm">
          <form onSubmit={isEdit ? handleEdit : handleCreate} className="space-y-6">

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Practice Track Title</label>
              <Input placeholder="e.g. React 19 & Next.js 16 Enterprise Masterclass"
                value={fTitle} onChange={(e) => setFTitle(e.target.value)} required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Category</label>
              <Input placeholder="e.g. Frontend Development, Algorithms & Logic..."
                value={fCategory} onChange={(e) => setFCategory(e.target.value)} required
                className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Assigned By (Instructor / Admin Name)</label>
              <Input placeholder="e.g. Dharunkumar S"
                value={fAssignedBy} onChange={(e) => setFAssignedBy(e.target.value)} required
                className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Track Description</label>
              <Textarea placeholder="Complete hands-on practice suite covering..."
                value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={4}
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("list")} className="h-[48px] px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]">Cancel</Button>
              <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
                {isEdit ? <Save className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {isEdit ? "Save Changes" : "Create Practice Track"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VIEW: TRACK DETAIL
  // ════════════════════════════════════════════════════════════
  if (viewState === "detail" && selectedTrack) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <PageHeader 
          title={selectedTrack.title}
          description={`${selectedTrack.category} • Instructor: ${selectedTrack.assignedByName}`}
          backAction={{ label: "Back", onClick: () => setViewState("list") }}
          actions={
            <Button onClick={() => { setSmTitle(""); setViewState("add-module"); }}
              className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs gap-2 px-5 rounded-xl shrink-0 shadow-sm">
              <Plus className="h-4 w-4" /> Add Sub-Module
            </Button>
          }
        />

        <div className="space-y-3">
          {selectedTrack.subModules.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-[#9CA3AF]">
              <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm text-[#111827] dark:text-[#FAFAFA]">No practice sub-modules configured yet.</p>
              <p className="text-xs mt-1 text-[#6B7280]">Click "Add Sub-Module" above to configure MCQ, Coding, or Mixed items.</p>
            </div>
          )}
          {selectedTrack.subModules.map((sm, idx) => (
            <Card key={sm.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-[#9333EA]/10 text-[#9333EA] font-bold text-xs flex items-center justify-center border border-[#9333EA]/20 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{sm.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-[10px] uppercase ${typeBadgeColor(sm.type)}`}>{sm.type}</Badge>
                        <span className="text-[10px] text-[#6B7280]">
                          <Clock className="h-2.5 w-2.5 inline mr-0.5" />{sm.durationMinutes} mins
                        </span>
                        <span className="text-[10px] text-[#6B7280]">{sm.totalMarks} marks</span>
                        <span className="text-[10px] text-[#6B7280]">{sm.questionCount} questions</span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => handleDeleteSubModule(selectedTrack.id, sm.id)}
                    variant="ghost" size="icon" className="h-8 w-8 text-[#DC2626] shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VIEW: ADD SUB-MODULE
  // ════════════════════════════════════════════════════════════
  if (viewState === "add-module" && selectedTrack) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <PageHeader 
          title="Add Practice Sub-Module"
          description={selectedTrack.title}
          backAction={{ label: "Back to Track Detail", onClick: () => setViewState("detail") }}
        />

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleAddSubModule} className="space-y-6">

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Sub-Module Title</label>
              <Input placeholder="e.g. Module 1: Arrays, Hash Maps & Two Pointer Technique"
                value={smTitle} onChange={(e) => setSmTitle(e.target.value)} required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Assessment Type</label>
              <Select value={smType} onValueChange={(v) => setSmType((v as any) || "mcq")}>
                <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ (Multiple Choice Questions)</SelectItem>
                  <SelectItem value="coding">Coding (Live Execution Engine)</SelectItem>
                  <SelectItem value="mixed">Mixed (MCQ & Coding Assessment)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Duration (mins)</label>
                <Input type="number" min={1} value={smDuration}
                  onChange={(e) => setSmDuration(Math.max(1, Number(e.target.value)))}
                  className="h-[48px] text-sm font-bold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Total Marks</label>
                <Input type="number" min={1} value={smMarks}
                  onChange={(e) => setSmMarks(Math.max(1, Number(e.target.value)))}
                  className="h-[48px] text-sm font-bold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Question Count</label>
                <Input type="number" min={1} value={smQuestions}
                  onChange={(e) => setSmQuestions(Math.max(1, Number(e.target.value)))}
                  className="h-[48px] text-sm font-bold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>
            </div>

            {/* MCQ Questions Builder for MCQ and Mixed types */}
            {(smType === "mcq" || smType === "mixed") && (
              <div className="p-6 rounded-2xl border border-[#2563EB]/20 bg-[#2563EB]/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                    <HelpCircle className="h-4 w-4" /> Multiple Choice Questions Builder ({mcqQuestions.length} Questions)
                  </div>
                  <Button
                    type="button"
                    onClick={addMcqQuestion}
                    variant="outline"
                    className="h-8 px-3 text-xs font-bold border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1 rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Question
                  </Button>
                </div>

                <div className="space-y-6">
                  {mcqQuestions.map((q, qIdx) => (
                    <div key={q.id} className="p-5 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl space-y-4 shadow-sm relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-3 py-1 rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
                          Question {qIdx + 1}
                        </span>
                        {mcqQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMcqQuestion(q.id)}
                            className="text-[#EF4444] hover:bg-[#EF4444]/10 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Question Prompt</label>
                        <Input
                          value={q.questionText}
                          onChange={(e) => updateQuestionText(q.id, e.target.value)}
                          placeholder={`Enter question ${qIdx + 1} text...`}
                          className="h-10 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Options & Correct Answer</label>
                          <button
                            type="button"
                            onClick={() => addOptionToQuestion(q.id)}
                            className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add Option
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((opt: MCQQuestionOption, oIdx: number) => (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2 p-2.5 border rounded-xl transition-all ${
                                opt.isCorrect
                                  ? 'border-[#2563EB] bg-[#2563EB]/5 dark:bg-[#2563EB]/10'
                                  : 'border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]'
                              }`}
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[10px] font-bold text-[#6B7280] shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </div>
                              <Input
                                value={opt.text}
                                onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                className="h-8 text-xs flex-1 bg-white dark:bg-[#18181B] rounded-lg"
                              />
                              <label className="flex items-center gap-1.5 cursor-pointer pr-1 shrink-0">
                                <input
                                  type="radio"
                                  name={`correct-opt-${q.id}`}
                                  checked={opt.isCorrect}
                                  onChange={() => setCorrectOption(q.id, opt.id)}
                                  className="w-3.5 h-3.5 text-[#2563EB] cursor-pointer"
                                />
                                <span className={`text-[10px] font-bold ${opt.isCorrect ? 'text-[#2563EB]' : 'text-[#6B7280]'}`}>
                                  Correct
                                </span>
                              </label>
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOptionFromQuestion(q.id, opt.id)}
                                  className="text-[#EF4444] hover:bg-[#EF4444]/10 p-1 rounded transition-colors shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Explanation / Answer Hint (Optional)</label>
                        <Input
                          value={q.explanation || ""}
                          onChange={(e) => updateQuestionExplanation(q.id, e.target.value)}
                          placeholder="Provide explanation for the correct answer..."
                          className="h-8 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coding Problem Specs for Coding and Mixed types */}
            {(smType === "coding" || smType === "mixed") && (
              <div className="p-6 rounded-2xl border border-[#9333EA]/20 bg-[#9333EA]/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9333EA]">
                    <Code2 className="h-4 w-4" /> Coding Problem Specifications & Test Cases ({codingQuestions.length} Problems)
                  </div>
                  <Button
                    type="button"
                    onClick={addCodingQuestion}
                    variant="outline"
                    className="h-8 px-3 text-xs font-bold border-[#9333EA]/30 text-[#9333EA] hover:bg-[#9333EA]/10 gap-1 rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Coding Question
                  </Button>
                </div>

                <div className="space-y-8">
                  {codingQuestions.map((cq, cqIdx) => (
                    <div key={cq.id} className="p-5 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl space-y-4 shadow-sm relative group">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
                        <span className="text-xs font-bold px-3 py-1 rounded-lg bg-[#9333EA]/10 text-[#9333EA]">
                          Coding Question {cqIdx + 1}
                        </span>
                        {codingQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCodingQuestion(cq.id)}
                            className="text-[#EF4444] hover:bg-[#EF4444]/10 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <CodingProblemCreator
                        inline
                        initialTitle={cq.title || `Coding Problem ${cqIdx + 1}`}
                        initialDescription={cq.description}
                        onChange={(data) => {
                          updateCodingQuestion(cq.id, data);
                          if (cqIdx === 0) {
                            if (!smTitle && data.title) setSmTitle(data.title);
                            setSmProblemDesc(data.description);
                            setSmPublicTestCases(data.publicTestCases.map((t) => `${t.input} -> ${t.expected_output}`).join("\n"));
                            if (data.hiddenTestCases.length > 0) {
                              setSmHasHiddenTests(true);
                              setSmHiddenTests(data.hiddenTestCases.map((t) => `${t.input} -> ${t.expected_output}`).join("\n"));
                            }
                            setSmStarterCode(Object.values(data.templates)[0] || "");
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("detail")} className="h-[48px] px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]">Cancel</Button>
              <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
                Add Sub-Module
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VIEW: ASSIGN TO STUDENTS
  // ════════════════════════════════════════════════════════════
  if (viewState === "assign" && selectedTrack) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <PageHeader 
          title="Assign Practice Track"
          description={
            <>
              Target Track: <span className="font-semibold text-[#2563EB]">"{selectedTrack.title}"</span>
            </>
          }
          backAction={{ label: "Back", onClick: () => setViewState("list") }}
          actions={
            <Button onClick={handleSaveAssign}
              className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm shrink-0">
              <CheckCircle2 className="h-4 w-4" /> Save Assignment ({selectedStudentIds.length})
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
                <Users className="h-4 w-4 text-[#9333EA]" /> Assign by Student Batch
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] font-bold text-[#9333EA] border-[#9333EA]/30 hover:bg-[#9333EA]/10"
                onClick={() => {
                  if (selectedBatches.length === allBatches.length) {
                    setSelectedBatches([]);
                    setSelectedStudentIds([]);
                  } else {
                    setSelectedBatches([...allBatches]);
                    setSelectedStudentIds(allStudents.map((s) => s.id));
                  }
                }}
              >
                {selectedBatches.length === allBatches.length ? "Deselect All" : "Select All Batches"}
              </Button>
            </div>
            {allBatches.map((batch) => {
              const isSel = selectedBatches.includes(batch);
              const count = allStudents.filter((s) => s.batch === batch).length;
              return (
                <button key={batch} type="button" onClick={() => toggleBatch(batch)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSel ? "border-[#9333EA] bg-[#9333EA]/5" : "border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B]"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{batch}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{count} enrolled students</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSel ? "border-[#9333EA] bg-[#9333EA]" : "border-[#D1D5DB]"
                    }`}>
                      {isSel && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
                <UserCheck className="h-4 w-4 text-[#9333EA]" /> Individual Student Selection
              </h2>
              <Select value={batchFilter} onValueChange={(v) => setBatchFilter(v || "all")}>
                <SelectTrigger className="h-9 text-xs w-[160px] bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {allBatches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-hidden">
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                {displayStudents.map((s) => {
                  const isSel = selectedStudentIds.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                      className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 transition-all ${
                        isSel ? "bg-[#9333EA]/5" : "hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60"
                      }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSel ? "bg-[#9333EA] text-white" : "bg-[#9333EA]/10 text-[#9333EA]"
                        }`}>{s.name.charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#111827] dark:text-[#FAFAFA] truncate">{s.name}</p>
                          <p className="text-[11px] text-[#6B7280] truncate">{s.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] border-[#9333EA]/30 text-[#9333EA]">{s.batch}</Badge>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                          isSel ? "border-[#9333EA] bg-[#9333EA]" : "border-[#D1D5DB]"
                        }`}>
                          {isSel && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
              <p className="text-xs text-[#6B7280]">
                <span className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{selectedStudentIds.length}</span> of {allStudents.length} selected
              </p>
              <Button onClick={handleSaveAssign} className="h-9 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs rounded-xl gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VIEW: LIST PRACTICES (MNC CORPORATE STYLING)
  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8">
      <PageHeader
        title={role === "admin" ? "Practice Track Management" : "Practice Track Assignments"}
        description="Author practice tracks with MCQ, Coding, and Mixed assessments for student batches"
        actions={
          <Button onClick={openCreate}
            className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2 px-5 rounded-xl shrink-0 shadow-sm text-xs">
            <Plus className="h-4 w-4" /> Create Practice Track
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-3 rounded-xl shadow-sm">
        <div className="relative w-full md:w-[450px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input placeholder="Search practice tracks..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-none shadow-none focus-visible:ring-0" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((track) => {
          const totalMods = track.subModules.length;
          const totalMarks = track.subModules.reduce((s, m) => s + m.totalMarks, 0);
          const totalDuration = track.subModules.reduce((s, m) => s + m.durationMinutes, 0);

          return (
            <Card key={track.id}
              className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-[#9333EA]/40 transition-colors">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-[#9333EA]/30 text-[#9333EA] bg-[#9333EA]/5">
                    <FolderKanban className="h-3 w-3 mr-1 inline" /> {track.category}
                  </Badge>
                  <span className="text-[10px] font-semibold text-[#9333EA]">
                    Instructor: {track.assignedByName}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-[#111827] dark:text-[#FAFAFA] leading-snug">{track.title}</h3>
                  <p className="text-xs text-[#6B7280] line-clamp-2 mt-1.5 leading-relaxed">{track.description}</p>
                </div>

                <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Sub-Modules:</span>
                    <span className="font-bold text-[#9333EA]">{totalMods} Practice Modules</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Total Duration:</span>
                    <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{totalDuration} mins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Total Marks:</span>
                    <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{totalMarks}</span>
                  </div>
                  {track.assignedStudents.length > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB] dark:border-[#27272A]">
                      <span className="text-[#6B7280]">Assigned to:</span>
                      <Badge className="bg-[#16A34A] text-white text-[10px] font-semibold gap-1">
                        <UserCheck className="h-3 w-3" /> {track.assignedStudents.length} Students
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <Button onClick={() => { setSelectedTrack(track); setViewState("detail"); }}
                    variant="outline" size="sm"
                    className="flex-1 h-8 text-xs font-semibold gap-1 border-[#9333EA] text-[#9333EA] min-w-0">
                    <Dumbbell className="h-3.5 w-3.5" /> Modules ({totalMods})
                  </Button>
                  <Button onClick={() => openAssign(track)} size="sm"
                    className="h-8 px-3 text-xs font-semibold bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-lg gap-1">
                    <Users className="h-3.5 w-3.5" /> Assign
                  </Button>
                  <Button onClick={() => openEdit(track)} variant="outline" size="sm"
                    className="h-8 text-xs font-semibold gap-1 border-[#D97706] text-[#D97706]">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button onClick={() => handleDelete(track.id, track.title)} variant="ghost" size="icon"
                    className="h-8 w-8 text-[#DC2626]">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
