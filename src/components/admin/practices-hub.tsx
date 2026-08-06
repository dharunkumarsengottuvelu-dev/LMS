"use client";

import React, { useState } from "react";
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

// ─── Types aligned with Student Portal assessments page ────
interface SubModuleItem {
  id: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
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

const allStudents = [
  { id: "std_101", name: "Dharunkumar Sengottuvelu", email: "dharunkumar@gmail.com",  batch: "Batch 2026-A" },
  { id: "std_102", name: "Alex Rivera",              email: "alex.rivera@techcorp.com",  batch: "Batch 2026-A" },
  { id: "std_103", name: "Sarah Chen",               email: "sarah.chen@techcorp.com",   batch: "Batch 2026-B" },
  { id: "std_104", name: "Michael Chang",            email: "m.chang@enterprise.com",    batch: "Batch 2026-B" },
  { id: "std_105", name: "Priya Nair",               email: "priya.nair@org.in",         batch: "Batch 2026-A" },
  { id: "std_106", name: "James Okafor",             email: "j.okafor@techcorp.com",     batch: "Batch 2026-B" },
];
const allBatches = ["Batch 2026-A", "Batch 2026-B"];

const initialTracks: PracticeTrack[] = [
  {
    id: "track-1",
    title: "React 19 & Next.js 16 Enterprise Masterclass",
    category: "Frontend Development",
    description: "Complete hands-on practice suite covering Server Components, App Router Navigation, and Custom Middleware.",
    assignedByName: "Dharunkumar S",
    subModules: [
      { id: "p1", title: "Module 1: React 19 Server Components Architecture", type: "mcq", durationMinutes: 30, totalMarks: 100, questionCount: 10 },
      { id: "p1-m2", title: "Module 2: Custom Middleware & JWT Auth Handshake", type: "coding", durationMinutes: 45, totalMarks: 150, questionCount: 2 },
      { id: "p1-m3", title: "Module 3: Fullstack Server Action & PostgreSQL RLS", type: "mixed", durationMinutes: 60, totalMarks: 200, questionCount: 8 },
    ],
    assignedBatches: ["Batch 2026-A"],
    assignedStudents: ["std_101", "std_102", "std_105"],
  },
  {
    id: "track-2",
    title: "Data Structures & Algorithms Problem Solving Track",
    category: "Algorithms & Logic",
    description: "Master essential algorithmic problem solving with live code execution and test cases.",
    assignedByName: "Dr. Arunkumar",
    subModules: [
      { id: "p2", title: "Module 1: Arrays, Hash Maps & Two Pointer Technique", type: "coding", durationMinutes: 45, totalMarks: 150, questionCount: 3 },
      { id: "p2-m2", title: "Module 2: Dynamic Programming & Recursion Fundamentals", type: "coding", durationMinutes: 60, totalMarks: 200, questionCount: 4 },
    ],
    assignedBatches: [],
    assignedStudents: [],
  },
];

type ViewState = "list" | "create" | "edit" | "detail" | "add-module" | "assign";

export function PracticesHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<PracticeTrack[]>(initialTracks);
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
    setTracks((prev) => [created, ...prev]);
    setViewState("list");
    toast({ title: "Practice Track Created", description: `"${fTitle}" saved successfully.` });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setTracks((prev) => prev.map((t) =>
      t.id === editingId ? { ...t, title: fTitle, category: fCategory, description: fDesc, assignedByName: fAssignedBy } : t
    ));
    setViewState("list");
    toast({ title: "Practice Track Updated", description: `"${fTitle}" saved.` });
  };

  const handleDelete = (id: string, title: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Practice Track Removed", description: title, variant: "destructive" });
  };

  const handleAddSubModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrack || !smTitle) return;
    const newSm: SubModuleItem & { hasHiddenTests?: boolean; hiddenTestsCode?: string } = {
      id: `sm_${Date.now()}`, title: smTitle, type: smType,
      durationMinutes: smDuration, totalMarks: smMarks, questionCount: smQuestions,
      ...(smType === "coding" || smType === "mixed" ? {
        hasHiddenTests: smHasHiddenTests,
        hiddenTestsCode: smHasHiddenTests ? smHiddenTests : undefined
      } : {})
    };
    const updated = { ...selectedTrack, subModules: [...selectedTrack.subModules, newSm] };
    setSelectedTrack(updated);
    setTracks((prev) => prev.map((t) => (t.id === selectedTrack.id ? updated : t)));
    setSmTitle(""); setSmDuration(30); setSmMarks(100); setSmQuestions(10);
    setSmHasHiddenTests(false); setSmHiddenTests("");
    setViewState("detail");
    toast({ title: "Sub-Module Added", description: `"${smTitle}" added.` });
  };

  const handleDeleteSubModule = (trackId: string, smId: string) => {
    setTracks((prev) => prev.map((t) =>
      t.id === trackId ? { ...t, subModules: t.subModules.filter((s) => s.id !== smId) } : t
    ));
    if (selectedTrack?.id === trackId) {
      setSelectedTrack((prev) => prev ? { ...prev, subModules: prev.subModules.filter((s) => s.id !== smId) } : prev);
    }
  };

  const openAssign = (t: PracticeTrack) => {
    setSelectedTrack(t);
    setSelectedBatches([...t.assignedBatches]);
    setSelectedStudentIds([...t.assignedStudents]);
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
    setTracks((prev) => prev.map((t) =>
      t.id === selectedTrack.id ? { ...t, assignedBatches: selectedBatches, assignedStudents: selectedStudentIds } : t
    ));
    toast({ title: "Practice Track Assigned", description: `${selectedStudentIds.length} students assigned.` });
    setViewState("list");
  };

  const displayStudents = batchFilter === "all" ? allStudents : allStudents.filter((s) => s.batch === batchFilter);

  const typeBadgeColor = (type: string) =>
    type === "mcq" ? "bg-[#2563EB] text-white font-medium"
    : type === "coding" ? "bg-[#9333EA] text-white font-medium"
    : "bg-[#D97706] text-white font-medium";

  // ════════════════════════════════════════════════════════════
  // VIEW: CREATE / EDIT TRACK (MNC CORPORATE STYLING)
  // ════════════════════════════════════════════════════════════
  if (viewState === "create" || viewState === "edit") {
    const isEdit = viewState === "edit";
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button onClick={() => setViewState("list")} variant="outline" size="sm" className="h-9 font-semibold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A]">
            <ArrowLeft className="h-4 w-4" /> Back to Practices
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              {isEdit ? "Edit Practice Track" : "Create New Practice Track"}
            </h1>
            <p className="text-xs text-[#6B7280]">Configure practice track parameters for student deployment</p>
          </div>
        </div>

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
              <Button type="submit" className="h-[48px] px-8 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-center gap-3">
            <Button onClick={() => setViewState("list")} variant="outline" size="sm" className="h-9 font-semibold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A]">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">{selectedTrack.title}</h1>
              <p className="text-xs text-[#6B7280]">{selectedTrack.category} • Instructor: {selectedTrack.assignedByName}</p>
            </div>
          </div>
          <Button onClick={() => { setSmTitle(""); setViewState("add-module"); }}
            className="h-[44px] bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold text-xs gap-2 px-5 rounded-xl shrink-0 shadow-sm">
            <Plus className="h-4 w-4" /> Add Sub-Module
          </Button>
        </div>

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
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button onClick={() => setViewState("detail")} variant="outline" size="sm" className="h-9 font-semibold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A]">
            <ArrowLeft className="h-4 w-4" /> Back to Track Detail
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">Add Practice Sub-Module</h1>
            <p className="text-xs text-[#6B7280]">{selectedTrack.title}</p>
          </div>
        </div>

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

            {(smType === "coding" || smType === "mixed") && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl">
                  <div>
                    <label className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Enable Hidden Test Cases</label>
                    <p className="text-xs text-[#6B7280]">Hidden test cases are used for final grading but kept hidden from the student during practice.</p>
                  </div>
                  <Switch checked={smHasHiddenTests} onCheckedChange={setSmHasHiddenTests} />
                </div>
                {smHasHiddenTests && (
                  <div className="space-y-2 mt-3">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Hidden Test Cases (JSON / Code format)</label>
                    <Textarea placeholder="e.g. [{ input: [1,2], expected: 3 }]"
                      value={smHiddenTests} onChange={(e) => setSmHiddenTests(e.target.value)}
                      className="min-h-[120px] text-sm font-mono rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("detail")} className="h-[48px] px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]">Cancel</Button>
              <Button type="submit" className="h-[48px] px-8 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-start gap-3">
            <Button onClick={() => setViewState("list")} variant="outline" size="sm" className="h-9 font-semibold text-xs gap-2 mt-0.5 border-[#E5E7EB] dark:border-[#27272A]">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">Assign Practice Track</h1>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Target Track: <span className="font-semibold text-[#9333EA]">"{selectedTrack.title}"</span>
              </p>
            </div>
          </div>
          <Button onClick={handleSaveAssign}
            className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm shrink-0">
            <CheckCircle2 className="h-4 w-4" /> Save Assignment ({selectedStudentIds.length})
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
              <Users className="h-4 w-4 text-[#9333EA]" /> Assign by Cohort Batch
            </h2>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {role === "admin" ? "Practice Track Management" : "Practice Track Assignments"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Author practice tracks with MCQ, Coding, and Mixed assessments for student cohorts
          </p>
        </div>
        <Button onClick={openCreate}
          className="h-[44px] bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold gap-2 px-5 rounded-xl shrink-0 shadow-sm">
          <Plus className="h-4 w-4" /> Create Practice Track
        </Button>
      </div>

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
