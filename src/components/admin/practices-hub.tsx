"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dumbbell, Search, Users, CheckCircle2, Clock, Plus,
  BookOpen, Code2, FileText, Video, UserCheck,
  ShieldCheck, PlayCircle, StickyNote, ListChecks,
  ArrowLeft, FolderKanban, Sparkles, Trash2, Edit, Save,
  HelpCircle, Layers, Eye, EyeOff, UploadCloud, User,
  Maximize2, Minimize2, ShieldAlert, Lock, Copy, RotateCcw,
  Edit2, ChevronUp
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
import { VisibilitySelector } from "@/components/admin/visibility-selector";
import { AutoSaveBadge } from "@/components/ui/auto-save-badge";

// ─── Types aligned with Student Portal assessments page ────
export interface SubModuleSection {
  id: string;
  title: string;
  mcqQuestions: MCQQuestionItem[];
  codingQuestions: CodingQuestionItem[];
}

interface SubModuleItem {
  id: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  mcqSectionTitle?: string;
  codingSectionTitle?: string;
  restrictCopyPaste?: boolean;
  enforceFullScreen?: boolean;
  sections?: SubModuleSection[];
  maxAttempts?: number;
  allowResume?: boolean;
  scoreRetentionPolicy?: "best" | "latest" | "average";
  allowReviewBeforeSubmit?: boolean;
}

export interface MCQQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MCQQuestionItem {
  id: string;
  questionText: string;
  questionType?: "single" | "multiple";
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
  isCommon?: boolean;
  assignedBatches: string[];
  assignedStudents: string[];
  status?: "published" | "draft";
  maxAttempts?: number;
  allowResume?: boolean;
  scoreRetentionPolicy?: "best" | "latest" | "average";
  allowReviewBeforeSubmit?: boolean;
}

const initialTracks: PracticeTrack[] = [];

type ViewState = "list" | "create" | "edit" | "detail" | "add-module" | "assign" | "create-coding";

export function PracticesHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<PracticeTrack[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/practices");
        const data = await res.json();
        if (data.tracks) {
          // Deduplicate tracks by title
          const seen = new Map<string, PracticeTrack>();
          data.tracks.forEach((t: PracticeTrack) => {
            const norm = (t.title || "").trim().toLowerCase();
            if (!norm) return;
            if (!seen.has(norm)) {
              seen.set(norm, t);
            } else {
              const existing = seen.get(norm)!;
              if ((t.subModules?.length || 0) > (existing.subModules?.length || 0)) {
                seen.set(norm, t);
              }
            }
          });
          const unique = Array.from(seen.values());
          setTracks(unique);
        }
        if (data.students) setAllStudents(data.students);
        if (data.batches) setAllBatches(data.batches);
      } catch (err) {
        console.error("Failed to fetch admin practice data", err);
      }
    };
    fetchData();
  }, []);

  const [search, setSearch] = useState("");
  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedTrack, setSelectedTrack] = useState<PracticeTrack | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubModuleId, setEditingSubModuleId] = useState<string | null>(null);

  // Track form state
  const [fTitle, setFTitle]       = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fDesc, setFDesc]         = useState("");
  const [fAssignedBy, setFAssignedBy] = useState("");
  const [fMaxAttempts, setFMaxAttempts] = useState<number>(0); // 0 = unlimited
  const [fAllowResume, setFAllowResume] = useState<boolean>(true);
  const [fScorePolicy, setFScorePolicy] = useState<"best" | "latest" | "average">("best");
  const [fAllowReviewBeforeSubmit, setFAllowReviewBeforeSubmit] = useState<boolean>(true);

  // Sub-module form state
  const [smTitle, setSmTitle]                     = useState("");
  const [smType, setSmType]                       = useState<"mcq" | "coding" | "mixed">("mcq");
  const [smDuration, setSmDuration]               = useState(30);
  const [smDurationEnabled, setSmDurationEnabled] = useState<boolean>(true);
  const [smMarks, setSmMarks]                     = useState(100);
  const [smQuestions, setSmQuestions]             = useState(10);
  const [smHasHiddenTests, setSmHasHiddenTests] = useState(false);
  const [smHiddenTests, setSmHiddenTests] = useState("");
  const [smProblemDesc, setSmProblemDesc] = useState("");
  const [smStarterCode, setSmStarterCode] = useState("");
  const [smPublicTestCases, setSmPublicTestCases] = useState("");
  const [smMcqSectionTitle, setSmMcqSectionTitle] = useState("Section 1: MCQs");
  const [smCodingSectionTitle, setSmCodingSectionTitle] = useState("Section 2: Coding");
  const [smRestrictCopyPaste, setSmRestrictCopyPaste] = useState(false);
  const [smEnforceFullScreen, setSmEnforceFullScreen] = useState(false);
  const [smMaxAttempts, setSmMaxAttempts] = useState<number>(0);
  const [smAllowResume, setSmAllowResume] = useState<boolean>(true);
  const [smScorePolicy, setSmScorePolicy] = useState<"best" | "latest" | "average">("best");
  const [smAllowReviewBeforeSubmit, setSmAllowReviewBeforeSubmit] = useState<boolean>(true);
  const [isFullScreenAuthoring, setIsFullScreenAuthoring] = useState(false);
  const [showCodingProblemBuilder, setShowCodingProblemBuilder] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Dynamic SubModule Sections State (supports both MCQ and Coding within any Section)
  const [sections, setSections] = useState<SubModuleSection[]>([
    {
      id: "sec_1",
      title: "Section 1: General & Technical Questions",
      mcqQuestions: [
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
      ],
      codingQuestions: [],
    },
  ]);

  const addSection = () => {
    const secId = `sec_${Date.now()}`;
    setSections((prev) => [
      ...prev,
      {
        id: secId,
        title: `Section ${prev.length + 1}: Custom Section`,
        mcqQuestions: [],
        codingQuestions: [],
      },
    ]);
  };

  const removeSection = (sectionId: string) => {
    if (sections.length > 1) {
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    }
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
  };

  const addMcqToSection = (sectionId: string, insertAfterIndex?: number) => {
    const qId = `q_${Date.now()}`;
    const newQ: MCQQuestionItem = {
      id: qId,
      questionText: "",
      options: [
        { id: `o_${Date.now()}_1`, text: "", isCorrect: true },
        { id: `o_${Date.now()}_2`, text: "", isCorrect: false },
        { id: `o_${Date.now()}_3`, text: "", isCorrect: false },
        { id: `o_${Date.now()}_4`, text: "", isCorrect: false },
      ],
      explanation: "",
    };
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        if (typeof insertAfterIndex === "number" && insertAfterIndex >= 0) {
          const nextMcqs = [...s.mcqQuestions];
          nextMcqs.splice(insertAfterIndex + 1, 0, newQ);
          return { ...s, mcqQuestions: nextMcqs };
        }
        return { ...s, mcqQuestions: [...s.mcqQuestions, newQ] };
      })
    );
    setEditingQuestionId(qId);
  };

  const removeMcqFromSection = (sectionId: string, qId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, mcqQuestions: s.mcqQuestions.filter((q) => q.id !== qId) }
          : s
      )
    );
    if (editingQuestionId === qId) {
      setEditingQuestionId(null);
    }
  };

  const updateSectionMcqText = (sectionId: string, qId: string, text: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              mcqQuestions: s.mcqQuestions.map((q) =>
                q.id === qId ? { ...q, questionText: text } : q
              ),
            }
          : s
      )
    );
  };

  const updateSectionOptionText = (sectionId: string, qId: string, optId: string, text: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              mcqQuestions: s.mcqQuestions.map((q) =>
                q.id === qId
                  ? {
                      ...q,
                      options: q.options.map((o) =>
                        o.id === optId ? { ...o, text } : o
                      ),
                    }
                  : q
              ),
            }
          : s
      )
    );
  };

  const toggleSectionQuestionType = (sectionId: string, qId: string, type: "single" | "multiple") => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          mcqQuestions: s.mcqQuestions.map((q) => {
            if (q.id !== qId) return q;
            let options: MCQQuestionOption[] = q.options;
            if (type === "single") {
              let hasCorrect = false;
              options = options.map((opt) => {
                if (opt.isCorrect && !hasCorrect) {
                  hasCorrect = true;
                  return { ...opt, isCorrect: true };
                }
                return { ...opt, isCorrect: false };
              });
              if (!hasCorrect && options.length > 0 && options[0]) {
                options = options.map((opt, idx) => (idx === 0 ? { ...opt, isCorrect: true } : opt));
              }
            }
            return { ...q, questionType: type, options };
          }),
        };
      })
    );
  };

  const toggleSectionOptionCorrect = (sectionId: string, qId: string, optId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          mcqQuestions: s.mcqQuestions.map((q) => {
            if (q.id !== qId) return q;
            const isMultiple = q.questionType === "multiple";
            if (isMultiple) {
              return {
                ...q,
                options: q.options.map((o) =>
                  o.id === optId ? { ...o, isCorrect: !o.isCorrect } : o
                ),
              };
            } else {
              return {
                ...q,
                options: q.options.map((o) => ({
                  ...o,
                  isCorrect: o.id === optId,
                })),
              };
            }
          }),
        };
      })
    );
  };

  const updateSectionQuestionExplanation = (sectionId: string, qId: string, text: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              mcqQuestions: s.mcqQuestions.map((q) =>
                q.id === qId ? { ...q, explanation: text } : q
              ),
            }
          : s
      )
    );
  };

  const addOptionToSectionMcq = (sectionId: string, qId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              mcqQuestions: s.mcqQuestions.map((q) =>
                q.id === qId
                  ? {
                      ...q,
                      options: [
                        ...q.options,
                        { id: `o_${Date.now()}_${q.options.length + 1}`, text: "", isCorrect: false },
                      ],
                    }
                  : q
              ),
            }
          : s
      )
    );
  };

  const removeOptionFromSectionMcq = (sectionId: string, qId: string, optId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              mcqQuestions: s.mcqQuestions.map((q) =>
                q.id === qId && q.options.length > 2
                  ? {
                      ...q,
                      options: q.options.filter((o) => o.id !== optId),
                    }
                  : q
              ),
            }
          : s
      )
    );
  };

  const addCodingToSection = (sectionId: string, insertAfterIndex?: number) => {
    const cqId = `cq_${Date.now()}`;
    const newCq: CodingQuestionItem = {
      id: cqId,
      title: "",
      description: "",
    };
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        if (typeof insertAfterIndex === "number" && insertAfterIndex >= 0) {
          const nextCoding = [...s.codingQuestions];
          nextCoding.splice(insertAfterIndex + 1, 0, newCq);
          return { ...s, codingQuestions: nextCoding };
        }
        return { ...s, codingQuestions: [...s.codingQuestions, newCq] };
      })
    );
    setEditingQuestionId(cqId);
  };

  const removeCodingFromSection = (sectionId: string, cqId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, codingQuestions: s.codingQuestions.filter((cq) => cq.id !== cqId) }
          : s
      )
    );
    if (editingQuestionId === cqId) {
      setEditingQuestionId(null);
    }
  };

  const updateSectionCodingQuestion = useCallback((sectionId: string, cqId: string, data: any) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const existing = s.codingQuestions.find((cq) => cq.id === cqId);
        if (!existing) return s;
        let hasChanged = false;
        for (const k of Object.keys(data)) {
          if ((existing as any)[k] !== data[k]) {
            hasChanged = true;
            break;
          }
        }
        if (!hasChanged) return s;
        return {
          ...s,
          codingQuestions: s.codingQuestions.map((cq) =>
            cq.id === cqId ? { ...cq, ...data } : cq
          ),
        };
      })
    );
  }, []);

  // Auto-Save Drafts State
  const [lastSavedTrackDraft, setLastSavedTrackDraft] = useState<string | null>(null);
  const [isSavedTrackDraft, setIsSavedTrackDraft] = useState<boolean>(true);
  const [lastSavedSmDraft, setLastSavedSmDraft] = useState<string | null>(null);
  const [isSavedSmDraft, setIsSavedSmDraft] = useState<boolean>(true);

  // 1. Restore drafts on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedTrack = localStorage.getItem("draft_practice_track");
      if (storedTrack) {
        const parsed = JSON.parse(storedTrack);
        if (parsed) {
          if (parsed.fTitle) setFTitle(parsed.fTitle);
          if (parsed.fCategory) setFCategory(parsed.fCategory);
          if (parsed.fDesc) setFDesc(parsed.fDesc);
          if (parsed.fAssignedBy) setFAssignedBy(parsed.fAssignedBy);
          setLastSavedTrackDraft(parsed.savedAt || new Date().toLocaleTimeString());
        }
      }
      const storedSm = localStorage.getItem("draft_practice_submodule");
      if (storedSm) {
        const parsedSm = JSON.parse(storedSm);
        if (parsedSm) {
          if (parsedSm.smTitle) setSmTitle(parsedSm.smTitle);
          if (parsedSm.smType) setSmType(parsedSm.smType);
          if (parsedSm.smDuration !== undefined) setSmDuration(parsedSm.smDuration);
          if (parsedSm.smDurationEnabled !== undefined) setSmDurationEnabled(parsedSm.smDurationEnabled);
          if (parsedSm.smMarks) setSmMarks(parsedSm.smMarks);
          if (parsedSm.sections?.length) setSections(parsedSm.sections);
          setLastSavedSmDraft(parsedSm.savedAt || new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.warn("Failed to load practice drafts", e);
    }
  }, []);

  // 2. Auto-save practice track draft
  useEffect(() => {
    if (typeof window === "undefined" || viewState !== "create") return;
    if (!fTitle && !fCategory && !fDesc) return;
    setIsSavedTrackDraft(false);
    const timer = setTimeout(() => {
      try {
        const data = {
          fTitle, fCategory, fDesc, fAssignedBy,
          savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        localStorage.setItem("draft_practice_track", JSON.stringify(data));
        setIsSavedTrackDraft(true);
        setLastSavedTrackDraft(data.savedAt);
      } catch (err) {
        console.warn("Failed to auto-save track draft", err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fTitle, fCategory, fDesc, fAssignedBy, viewState]);

  // 3. Auto-save sub-module draft
  useEffect(() => {
    if (typeof window === "undefined" || viewState !== "add-module" || editingSubModuleId) return;
    if (!smTitle && !sections[0]?.mcqQuestions[0]?.questionText && !sections[0]?.codingQuestions[0]?.title) return;
    setIsSavedSmDraft(false);
    const timer = setTimeout(() => {
      try {
        const data = {
          smTitle, smType, smDuration, smDurationEnabled, smMarks, smQuestions,
          smMcqSectionTitle, smCodingSectionTitle, smHasHiddenTests, smHiddenTests,
          smProblemDesc, smStarterCode, smPublicTestCases,
          sections,
          savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        localStorage.setItem("draft_practice_submodule", JSON.stringify(data));
        setIsSavedSmDraft(true);
        setLastSavedSmDraft(data.savedAt);
      } catch (err) {
        console.warn("Failed to auto-save sub-module draft", err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [smTitle, smType, smDuration, smDurationEnabled, smMarks, smQuestions, smMcqSectionTitle, smCodingSectionTitle, smHasHiddenTests, smHiddenTests, smProblemDesc, smStarterCode, smPublicTestCases, sections, viewState, editingSubModuleId]);

  // Assign state
  const [isCommon, setIsCommon]                     = useState<boolean>(true);
  const [selectedBatches, setSelectedBatches]       = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchFilter, setBatchFilter]               = useState("all");

  const filtered = tracks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFTitle(""); setFCategory(""); setFDesc(""); setFAssignedBy("");
    setFMaxAttempts(0); setFAllowResume(true); setFScorePolicy("best");
    setFAllowReviewBeforeSubmit(true);
  };

  const openCreate = () => { resetForm(); setEditingId(null); setViewState("create"); };

  const openEdit = (t: PracticeTrack) => {
    setEditingId(t.id);
    setFTitle(t.title); setFCategory(t.category);
    setFDesc(t.description); setFAssignedBy(t.assignedByName);
    setFMaxAttempts(t.maxAttempts ?? 0);
    setFAllowResume(t.allowResume ?? true);
    setFScorePolicy(t.scoreRetentionPolicy ?? "best");
    setFAllowReviewBeforeSubmit(t.allowReviewBeforeSubmit ?? true);
    setViewState("edit");
  };

  const syncTracksToStore = async (newTracks: PracticeTrack[]) => {
    // Deduplicate list before saving
    const seen = new Map<string, PracticeTrack>();
    newTracks.forEach((t) => {
      const norm = (t.title || "").trim().toLowerCase();
      if (!norm) return;
      if (!seen.has(norm)) {
        seen.set(norm, t);
      } else {
        const existing = seen.get(norm)!;
        if ((t.subModules?.length || 0) >= (existing.subModules?.length || 0)) {
          seen.set(norm, t);
        }
      }
    });
    const uniqueTracks = Array.from(seen.values());
    setTracks(uniqueTracks);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("enterprise_lms_practice_tracks_v2", JSON.stringify(uniqueTracks));
      } catch (e) {
        console.warn("Local storage track sync warning", e);
      }
    }
    try {
      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: uniqueTracks })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn("Backend track sync notice:", errorData);
      }
    } catch (error) {
      console.warn("Non-blocking track sync warning:", error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const normalizedNewTitle = fTitle.trim().toLowerCase();
      const existingTrack = tracks.find(
        (t) => (t.title || "").trim().toLowerCase() === normalizedNewTitle
      );

      if (existingTrack) {
        // If track with same title already exists, update it rather than creating a duplicate
        const updated = tracks.map((t) =>
          t.id === existingTrack.id
            ? {
                ...t,
                category: fCategory || t.category || "General",
                description: fDesc || t.description,
                assignedByName: fAssignedBy || t.assignedByName,
                maxAttempts: fMaxAttempts,
                allowResume: fAllowResume,
                scoreRetentionPolicy: fScorePolicy,
                allowReviewBeforeSubmit: fAllowReviewBeforeSubmit,
              }
            : t
        );
        await syncTracksToStore(updated);
        toast({
          title: "Track Updated",
          description: `Track "${fTitle.trim()}" already exists and was updated with your latest changes.`,
        });
      } else {
        const created: PracticeTrack = {
          id: `track_${Date.now()}`,
          title: fTitle.trim(),
          category: fCategory || "General",
          description: fDesc || "New practice track for students.",
          assignedByName: fAssignedBy || (role === "admin" ? "Admin" : "Trainer"),
          subModules: [],
          assignedBatches: [],
          assignedStudents: [],
          maxAttempts: fMaxAttempts,
          allowResume: fAllowResume,
          scoreRetentionPolicy: fScorePolicy,
          allowReviewBeforeSubmit: fAllowReviewBeforeSubmit,
        };
        const updated = [created, ...tracks];
        await syncTracksToStore(updated);
        toast({
          title: "Practice Track Created",
          description: `"${fTitle.trim()}" saved and published.`,
        });
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("draft_practice_track");
      }
      setViewState("list");
    } catch (err) {
      console.error("Create track error:", err);
      toast({
        title: "Error",
        description: "Failed to create practice track.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updated = tracks.map((t) =>
        t.id === editingId
          ? {
              ...t,
              title: fTitle.trim(),
              category: fCategory,
              description: fDesc,
              assignedByName: fAssignedBy,
              maxAttempts: fMaxAttempts,
              allowResume: fAllowResume,
              scoreRetentionPolicy: fScorePolicy,
              allowReviewBeforeSubmit: fAllowReviewBeforeSubmit,
            }
          : t
      );
      await syncTracksToStore(updated);
      setViewState("list");
      toast({ title: "Practice Track Updated", description: `"${fTitle}" saved.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const updated = tracks.filter((t) => t.id !== id);
    setTracks(updated);
    try {
      const res = await fetch(`/api/admin/practices?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete track");
      toast({ title: "Practice Track Removed", description: title, variant: "destructive" });
    } catch (error) {
      console.error("Failed to delete track", error);
      toast({ title: "Database Error", description: "Failed to delete track.", variant: "destructive" });
    }
  };

  const handleTogglePublishTrack = async (trackId: string) => {
    const updated = tracks.map((t) => {
      if (t.id !== trackId) return t;
      const nextStatus = t.status === "draft" ? "published" : "draft";
      toast({
        title: nextStatus === "published" ? "Practice Track Published" : "Practice Track Unpublished (Draft)",
        description: `"${t.title}" is now ${nextStatus === "published" ? "visible to students" : "saved as draft and hidden from students"}.`
      });
      return { ...t, status: nextStatus as "published" | "draft" };
    });
    await syncTracksToStore(updated);
  };

  const handleAddSubModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrack || !smTitle) return;

    const allMcqs = sections.flatMap((s) => s.mcqQuestions);
    const allCoding = sections.flatMap((s) => s.codingQuestions);
    const computedQCount = allMcqs.length + allCoding.length;

    const newSm: SubModuleItem & {
      hasHiddenTests?: boolean;
      hiddenTestsCode?: string;
      problemDescription?: string;
      starterCode?: string;
      publicTestCases?: string;
      mcqSectionTitle?: string;
      codingSectionTitle?: string;
      mcqQuestions?: MCQQuestionItem[];
      codingQuestions?: CodingQuestionItem[];
      sections?: SubModuleSection[];
    } = {
      id: editingSubModuleId || `sm_${Date.now()}`,
      title: smTitle,
      type: smType,
      durationMinutes: smDurationEnabled ? Math.max(1, smDuration) : 0,
      totalMarks: smMarks,
      questionCount: computedQCount > 0 ? computedQCount : smQuestions,
      mcqSectionTitle: smMcqSectionTitle || "Section 1: MCQs",
      codingSectionTitle: smCodingSectionTitle || "Section 2: Coding",
      restrictCopyPaste: smRestrictCopyPaste,
      enforceFullScreen: smEnforceFullScreen,
      maxAttempts: smMaxAttempts,
      allowResume: smAllowResume,
      scoreRetentionPolicy: smScorePolicy,
      allowReviewBeforeSubmit: smAllowReviewBeforeSubmit,
      sections: sections,
      mcqQuestions: allMcqs,
      codingQuestions: allCoding,
      ...(allCoding.length > 0 ? {
        hasHiddenTests: smHasHiddenTests,
        hiddenTestsCode: smHasHiddenTests ? smHiddenTests : undefined,
        problemDescription: smProblemDesc,
        starterCode: smStarterCode,
        publicTestCases: smPublicTestCases,
      } : {})
    };
    
    let updatedTrack;
    if (editingSubModuleId) {
      updatedTrack = { ...selectedTrack, subModules: selectedTrack.subModules.map((s) => s.id === editingSubModuleId ? newSm : s) };
    } else {
      updatedTrack = { ...selectedTrack, subModules: [...selectedTrack.subModules, newSm] };
    }
    
    setSelectedTrack(updatedTrack);
    const updatedTracks = tracks.map((t) => (t.id === selectedTrack.id ? updatedTrack : t));
    
    setIsSubmitting(true);
    try {
      await syncTracksToStore(updatedTracks);
      if (typeof window !== "undefined") {
        localStorage.removeItem("draft_practice_submodule");
      }
      setSmTitle(""); setSmDuration(30); setSmDurationEnabled(true); setSmMarks(100); setSmQuestions(10);
      setSmHasHiddenTests(false); setSmHiddenTests("");
      setSmProblemDesc(""); setSmStarterCode(""); setSmPublicTestCases("");
      setSmMcqSectionTitle("Section 1: MCQs");
      setSmCodingSectionTitle("Section 2: Coding");
      setSmRestrictCopyPaste(false);
      setSmEnforceFullScreen(false);
      setSmMaxAttempts(0);
      setSmAllowResume(true);
      setSmScorePolicy("best");
      setSmAllowReviewBeforeSubmit(true);
      setIsFullScreenAuthoring(false);
      setEditingSubModuleId(null);
      setSections([
        {
          id: "sec_1",
          title: "Section 1: General & Technical Questions",
          mcqQuestions: [
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
          ],
          codingQuestions: [],
        },
      ]);
      setViewState("detail");
      toast({ title: editingSubModuleId ? "Sub-Module Updated" : "Sub-Module Added", description: `"${smTitle}" saved.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubModule = (trackId: string, smId: string) => {
    const sm = tracks.find(t => t.id === trackId)?.subModules.find(s => s.id === smId) as any;
    if (!sm) return;
    
    setEditingSubModuleId(sm.id);
    setSmTitle(sm.title);
    setSmType(sm.type);
    const hasDuration = sm.durationMinutes !== undefined ? sm.durationMinutes > 0 : true;
    setSmDurationEnabled(hasDuration);
    setSmDuration(hasDuration ? sm.durationMinutes : 30);
    setSmMarks(sm.totalMarks);
    setSmQuestions(sm.questionCount);
    setSmMcqSectionTitle(sm.mcqSectionTitle || sm.mcq_section_title || "Section 1: MCQs");
    setSmCodingSectionTitle(sm.codingSectionTitle || sm.coding_section_title || "Section 2: Coding");
    setSmRestrictCopyPaste(Boolean(sm.restrictCopyPaste || sm.copyPasteRestricted));
    setSmEnforceFullScreen(Boolean(sm.enforceFullScreen || sm.fullscreenLock));
    setSmMaxAttempts(sm.maxAttempts ?? selectedTrack?.maxAttempts ?? 0);
    setSmAllowResume(sm.allowResume ?? selectedTrack?.allowResume ?? true);
    setSmScorePolicy(sm.scoreRetentionPolicy ?? selectedTrack?.scoreRetentionPolicy ?? "best");
    setSmAllowReviewBeforeSubmit(sm.allowReviewBeforeSubmit ?? selectedTrack?.allowReviewBeforeSubmit ?? true);
    
    setSmHasHiddenTests(sm.hasHiddenTests || false);
    setSmHiddenTests(sm.hiddenTestsCode || "");
    setSmProblemDesc(sm.problemDescription || "");
    setSmStarterCode(sm.starterCode || "");
    setSmPublicTestCases(sm.publicTestCases || "");

    if (sm.sections && sm.sections.length > 0) {
      setSections(sm.sections);
    } else {
      const initialSections: SubModuleSection[] = [];
      if (sm.mcqQuestions && sm.mcqQuestions.length > 0) {
        initialSections.push({
          id: `sec_mcq_${Date.now()}`,
          title: sm.mcqSectionTitle || sm.mcq_section_title || "Section 1: MCQs",
          mcqQuestions: sm.mcqQuestions,
          codingQuestions: [],
        });
      }
      if (sm.codingQuestions && sm.codingQuestions.length > 0) {
        initialSections.push({
          id: `sec_coding_${Date.now()}`,
          title: sm.codingSectionTitle || sm.coding_section_title || "Section 2: Coding",
          mcqQuestions: [],
          codingQuestions: sm.codingQuestions,
        });
      }
      if (initialSections.length === 0) {
        initialSections.push({
          id: "sec_1",
          title: "Section 1: General & Technical Questions",
          mcqQuestions: [
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
          ],
          codingQuestions: [],
        });
      }
      setSections(initialSections);
    }
    
    setViewState("add-module");
  };

  const handleDeleteSubModule = async (trackId: string, smId: string) => {
    const updatedTracks = tracks.map((t) =>
      t.id === trackId ? { ...t, subModules: t.subModules.filter((s) => s.id !== smId) } : t
    );
    await syncTracksToStore(updatedTracks);
    if (selectedTrack?.id === trackId) {
      setSelectedTrack((prev) => prev ? { ...prev, subModules: prev.subModules.filter((s) => s.id !== smId) } : prev);
    }
  };

  const openAssign = (t: PracticeTrack) => {
    setSelectedTrack(t);
    const assigned = t.assignedBatches || [];
    const common =
      t.isCommon === true ||
      (t as any).is_common === true ||
      assigned.length === 0;
    setIsCommon(common);
    setSelectedBatches(common ? [] : assigned);
    setSelectedStudentIds(common ? [] : [...(t.assignedStudents || [])]);
    setBatchFilter("all");
    setViewState("assign");
  };

  const toggleStudent = (id: string) =>
    setSelectedStudentIds((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  const handleSaveAssign = async () => {
    if (!selectedTrack || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updatedTracks = tracks.map((t) =>
        t.id === selectedTrack.id
          ? {
              ...t,
              isCommon,
              is_common: isCommon,
              assignedBatches: isCommon ? [] : selectedBatches,
              assignedStudents: isCommon ? [] : selectedStudentIds,
            }
          : t
      );
      await syncTracksToStore(updatedTracks);
      toast({
        title: "Practice Track Visibility Updated",
        description: `Track configured as ${isCommon ? "Common (All Students)" : `${selectedBatches.length} batch(es)`}.`,
      });
      setViewState("list");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayStudents = batchFilter === "all" ? allStudents : allStudents.filter((s) => s.batch === batchFilter);

  const typeBadgeColor = (type: string) =>
    type === "mcq" ? "bg-[#2563EB] text-white font-medium"
    : type === "coding" ? "bg-[#2563EB] text-white font-medium"
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
      <div className="space-y-8 w-full">
        <PageHeader 
          title={isEdit ? "Edit Practice Track" : "Create New Practice Track"}
          description="Configure practice track parameters for student deployment"
          backAction={{ label: "Back to Practices", onClick: () => setViewState("list") }}
          actions={!isEdit ? <AutoSaveBadge isSaved={isSavedTrackDraft} lastSaved={lastSavedTrackDraft} /> : undefined}
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

            {/* Attempt Limits & Session Continuation Rules */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-500/5 via-blue-500/5 to-amber-500/5 border border-[#E5E7EB] dark:border-[#27272A] space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-[#2563EB]" />
                  <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] uppercase tracking-wider">
                    Attempt Limits & Retake Policies
                  </h4>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-[#2563EB] border-[#2563EB]/30">
                  {fMaxAttempts === 0 ? "Unlimited Attempts" : fMaxAttempts === 1 ? "Single Attempt Only" : `${fMaxAttempts} Attempts Allowed`}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Max Attempts Selector */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] space-y-3 shadow-xs">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5 text-[#2563EB]" /> Allowed Student Attempts
                    </label>
                    <p className="text-[11px] text-[#6B7280]">
                      Control how many times a student can take/retake tests in this track.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setFMaxAttempts(0)}
                      className={`p-2 rounded-lg text-center text-xs font-semibold border transition-all ${
                        fMaxAttempts === 0
                          ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]"
                          : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:bg-gray-50 dark:hover:bg-[#27272A]"
                      }`}
                    >
                      Unlimited
                    </button>
                    <button
                      type="button"
                      onClick={() => setFMaxAttempts(1)}
                      className={`p-2 rounded-lg text-center text-xs font-semibold border transition-all ${
                        fMaxAttempts === 1
                          ? "border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]"
                          : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:bg-gray-50 dark:hover:bg-[#27272A]"
                      }`}
                    >
                      1 Attempt
                    </button>
                    <button
                      type="button"
                      onClick={() => setFMaxAttempts(fMaxAttempts <= 1 ? 3 : fMaxAttempts)}
                      className={`p-2 rounded-lg text-center text-xs font-semibold border transition-all ${
                        fMaxAttempts > 1
                          ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]"
                          : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:bg-gray-50 dark:hover:bg-[#27272A]"
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {fMaxAttempts > 1 && (
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#6B7280]">Specific Limit:</span>
                      <Input
                        type="number"
                        min={2}
                        max={20}
                        value={fMaxAttempts}
                        onChange={(e) => setFMaxAttempts(Math.max(2, parseInt(e.target.value, 10) || 2))}
                        className="h-8 w-24 text-xs font-bold rounded-lg bg-[#F9FAFB] dark:bg-[#09090B]"
                      />
                      <span className="text-xs text-[#6B7280]">attempts max</span>
                    </div>
                  )}
                </div>

                {/* Retake Score Retention Policy */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] flex flex-col justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Score Retention Policy on Retake
                    </span>
                    <p className="text-[11px] text-[#6B7280]">
                      Determines which attempt score reflects on student report cards and progress metrics.
                    </p>
                  </div>

                  <Select value={fScorePolicy} onValueChange={(v: any) => setFScorePolicy(v)}>
                    <SelectTrigger className="h-9 w-full text-xs font-semibold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best">Keep Highest / Best Score</SelectItem>
                      <SelectItem value="latest">Keep Latest Attempt</SelectItem>
                      <SelectItem value="average">Average of All Attempts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Review Answers Before Final Submit Switch */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-3 shadow-xs md:col-span-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Review Answers Before Final Submission</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      Allow students to review answered, marked, and unanswered questions in a summary modal before final submission.
                    </p>
                  </div>
                  <Switch
                    checked={fAllowReviewBeforeSubmit}
                    onCheckedChange={setFAllowReviewBeforeSubmit}
                    className="shrink-0 data-[state=checked]:bg-[#2563EB]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("list")} disabled={isSubmitting} className="h-[48px] px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    {isEdit ? <Save className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    <span>{isEdit ? "Save Changes" : "Create Practice Track"}</span>
                  </>
                )}
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
      <div className="space-y-8 w-full">
        <PageHeader 
          title={selectedTrack.title}
          description={`${selectedTrack.category} • Instructor: ${selectedTrack.assignedByName}`}
          backAction={{ label: "Back", onClick: () => setViewState("list") }}
          actions={
            <Button onClick={() => { 
              setEditingSubModuleId(null);
              setSmTitle(""); setSmDuration(30); setSmDurationEnabled(true); setSmMarks(100); setSmQuestions(10);
              setSmHasHiddenTests(false); setSmHiddenTests("");
              setSmProblemDesc(""); setSmStarterCode(""); setSmPublicTestCases("");
              setSections([
                {
                  id: "sec_1",
                  title: "Section 1: General & Technical Questions",
                  mcqQuestions: [
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
                  ],
                  codingQuestions: [],
                },
              ]);
              setViewState("add-module"); 
            }}
              className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs gap-2 px-5 rounded-xl shrink-0 shadow-sm">
              <Plus className="h-4 w-4" /> Add Sub-Module
            </Button>
          }
        />

        <div className="space-y-3">
          {selectedTrack.subModules.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-[#9CA3AF]">
              <p className="font-semibold text-sm text-[#111827] dark:text-[#FAFAFA]">No practice sub-modules configured yet.</p>
              <p className="text-xs mt-1 text-[#6B7280]">Click "Add Sub-Module" above to configure MCQ, Coding, or Mixed items.</p>
            </div>
          )}
          {selectedTrack.subModules.map((sm, idx) => (
            <Card key={sm.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs flex items-center justify-center border border-[#2563EB]/20 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{sm.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-[10px] uppercase ${typeBadgeColor(sm.type)}`}>{sm.type}</Badge>
                        <span className="text-[10px] text-[#6B7280]">
                          <Clock className="h-2.5 w-2.5 inline mr-0.5" />{sm.durationMinutes > 0 ? `${sm.durationMinutes} mins` : "No Time Limit"}
                        </span>
                        <span className="text-[10px] text-[#6B7280]">{sm.totalMarks} marks</span>
                        <span className="text-[10px] text-[#6B7280]">{sm.questionCount} questions</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button onClick={() => handleEditSubModule(selectedTrack.id, sm.id)}
                      variant="ghost" size="icon" className="h-8 w-8 text-[#2563EB]">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDeleteSubModule(selectedTrack.id, sm.id)}
                      variant="ghost" size="icon" className="h-8 w-8 text-[#DC2626]">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
      <div className="space-y-8 w-full">
        <PageHeader 
          title={editingSubModuleId ? "Edit Sub-Module" : "Add Practice Sub-Module"}
          description={selectedTrack.title}
          backAction={{ label: "Back to Track Detail", onClick: () => setViewState("detail") }}
          actions={!editingSubModuleId ? <AutoSaveBadge isSaved={isSavedSmDraft} lastSaved={lastSavedSmDraft} /> : undefined}
        />

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleAddSubModule} className="space-y-6">

            {/* Assessment Environment & Anti-Cheating Controls */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/5 via-blue-500/5 to-slate-500/5 border border-[#E5E7EB] dark:border-[#27272A] space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#2563EB]" />
                <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] uppercase tracking-wider">
                  Assessment Environment, Retake & Plagiarism Controls
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Copy Paste Restriction Switch */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-[#EF4444]" />
                      <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Restrict Copy & Paste</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      Disables copying question text and pasting external code into solution editor.
                    </p>
                  </div>
                  <Switch
                    checked={smRestrictCopyPaste}
                    onCheckedChange={setSmRestrictCopyPaste}
                    className="shrink-0 data-[state=checked]:bg-[#2563EB]"
                  />
                </div>

                {/* Full Screen Mode Requirement Switch */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Enforce Full Screen Mode</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      Requires students to take assessment in distraction-free full screen mode.
                    </p>
                  </div>
                  <Switch
                    checked={smEnforceFullScreen}
                    onCheckedChange={setSmEnforceFullScreen}
                    className="shrink-0 data-[state=checked]:bg-[#2563EB]"
                  />
                </div>

                {/* Allowed Student Attempts */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] space-y-2 shadow-xs md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Allowed Student Attempts</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-[#2563EB] border-[#2563EB]/30">
                      {smMaxAttempts === 0 ? "Unlimited Attempts" : smMaxAttempts === 1 ? "1 Attempt Only" : `${smMaxAttempts} Attempts Allowed`}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSmMaxAttempts(0)}
                      className={`p-2 rounded-lg text-center text-xs font-semibold border transition-all ${
                        smMaxAttempts === 0
                          ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]"
                          : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:bg-gray-50 dark:hover:bg-[#27272A]"
                      }`}
                    >
                      Unlimited
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmMaxAttempts(1)}
                      className={`p-2 rounded-lg text-center text-xs font-semibold border transition-all ${
                        smMaxAttempts === 1
                          ? "border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]"
                          : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:bg-gray-50 dark:hover:bg-[#27272A]"
                      }`}
                    >
                      1 Attempt
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmMaxAttempts(smMaxAttempts <= 1 ? 3 : smMaxAttempts)}
                      className={`p-2 rounded-lg text-center text-xs font-semibold border transition-all ${
                        smMaxAttempts > 1
                          ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]"
                          : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:bg-gray-50 dark:hover:bg-[#27272A]"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {smMaxAttempts > 1 && (
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#6B7280]">Specific Limit:</span>
                      <Input
                        type="number"
                        min={2}
                        max={20}
                        value={smMaxAttempts}
                        onChange={(e) => setSmMaxAttempts(Math.max(2, parseInt(e.target.value, 10) || 2))}
                        className="h-8 w-24 text-xs font-bold rounded-lg bg-[#F9FAFB] dark:bg-[#09090B]"
                      />
                      <span className="text-xs text-[#6B7280]">attempts max</span>
                    </div>
                  )}
                </div>

                {/* Review Answers Before Final Submit Switch */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-3 shadow-xs md:col-span-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Review Answers Before Final Submission</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      Allow students to review answered, marked, and unanswered questions in a summary modal before submitting.
                    </p>
                  </div>
                  <Switch
                    checked={smAllowReviewBeforeSubmit}
                    onCheckedChange={setSmAllowReviewBeforeSubmit}
                    className="shrink-0 data-[state=checked]:bg-[#2563EB]"
                  />
                </div>
              </div>
            </div>

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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Duration (mins)</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-[#6B7280]">
                      {smDurationEnabled ? "Timed" : "No Limit"}
                    </span>
                    <Switch
                      checked={smDurationEnabled}
                      onCheckedChange={(checked) => {
                        setSmDurationEnabled(checked);
                        if (checked && smDuration <= 0) {
                          setSmDuration(30);
                        }
                      }}
                      className="data-[state=checked]:bg-[#2563EB]"
                    />
                  </div>
                </div>
                {smDurationEnabled ? (
                  <Input type="number" min={1} value={smDuration}
                    onChange={(e) => setSmDuration(Math.max(1, Number(e.target.value)))}
                    placeholder="e.g. 30"
                    className="h-[48px] text-sm font-bold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
                ) : (
                  <div className="h-[48px] flex items-center px-4 rounded-xl bg-[#F3F4F6] dark:bg-[#09090B] border border-dashed border-[#E5E7EB] dark:border-[#27272A] text-xs font-semibold text-[#6B7280] gap-2">
                    <Clock className="h-4 w-4 text-[#9CA3AF]" />
                    <span>∞ Untimed (No time limit)</span>
                  </div>
                )}
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

            {/* Dynamic Assessment Sections Builder */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#2563EB]" /> Assessment Sections ({sections.length} {sections.length === 1 ? "Section" : "Sections"})
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    Create customized sections and add any kind of questions (MCQs or Live Coding Challenges) into each section.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={addSection}
                  className="h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl gap-2 shadow-xs"
                >
                  <Plus className="h-4 w-4" /> Add Section
                </Button>
              </div>

              {/* Sections List */}
              <div className="space-y-8">
                {sections.map((section, secIdx) => (
                  <Card
                    key={section.id}
                    className="p-6 rounded-2xl border-2 border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-sm space-y-6"
                  >
                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1 rounded-lg shrink-0">
                          Section {secIdx + 1}
                        </Badge>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                            Section Title
                          </label>
                          <Input
                            value={section.title}
                            onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                            placeholder={`e.g. Section ${secIdx + 1}: Technical & Aptitude`}
                            className="h-10 text-xs font-bold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                          />
                        </div>
                      </div>

                      {/* Section Actions: Add MCQ, Add Coding, Delete Section */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addMcqToSection(section.id)}
                          className="h-8 px-3 text-xs font-bold rounded-lg border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 shadow-xs"
                        >
                          <ListChecks className="h-3.5 w-3.5" /> + MCQ Question
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addCodingToSection(section.id)}
                          className="h-8 px-3 text-xs font-bold rounded-lg border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 shadow-xs"
                        >
                          <Code2 className="h-3.5 w-3.5" /> + Coding Problem
                        </Button>

                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(section.id)}
                            className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors ml-1"
                            title="Delete Section"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section Questions Body */}
                    <div className="space-y-6">
                      {section.mcqQuestions.length === 0 && section.codingQuestions.length === 0 && (
                        <div className="p-8 text-center border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl space-y-3 bg-[#F9FAFB]/50 dark:bg-[#09090B]/50">
                          <p className="text-xs font-bold text-[#6B7280]">
                            No questions added to this section yet.
                          </p>
                          <div className="flex items-center justify-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addMcqToSection(section.id)}
                              className="h-8 text-xs font-bold border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 rounded-xl"
                            >
                              <ListChecks className="h-3.5 w-3.5" /> Add MCQ Question
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addCodingToSection(section.id)}
                              className="h-8 text-xs font-bold border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 rounded-xl"
                            >
                              <Code2 className="h-3.5 w-3.5" /> Add Coding Problem
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* MCQs in this Section */}
                      {section.mcqQuestions.map((q, qIdx) => {
                        if (editingQuestionId !== q.id) {
                          const correctCount = q.options.filter((o) => o.isCorrect).length;
                          return (
                            <div
                              key={q.id}
                              className="p-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between group shadow-xs hover:border-[#2563EB]/40 transition-all gap-3"
                            >
                              <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#2563EB]/10 text-[#2563EB]">
                                    MCQ #{qIdx + 1}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#6B7280] bg-[#F3F4F6] dark:bg-[#27272A] px-2 py-0.5 rounded-md uppercase">
                                    {q.questionType === "multiple" ? "Multiple Select" : "Single Choice"}
                                  </span>
                                  <span className="text-[11px] text-[#6B7280]">
                                    ({q.options.length} options • {correctCount} correct)
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA] truncate">
                                  {q.questionText || `MCQ Question ${qIdx + 1} (Click edit to add statement)`}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingQuestionId(q.id)}
                                  className="h-8 px-3 text-xs font-semibold bg-white dark:bg-[#18181B] gap-1.5"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMcqFromSection(section.id, q.id)}
                                  className="h-8 px-2.5 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 gap-1.5"
                                  title="Delete Question"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={q.id}
                            className="p-5 bg-white dark:bg-[#18181B] border-2 border-[#2563EB] dark:border-[#2563EB]/80 rounded-2xl space-y-4 shadow-sm"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-xs font-bold px-3 py-1 rounded-lg bg-[#2563EB] text-white">
                                  MCQ #{qIdx + 1}
                                </span>

                                {/* Single vs Multiple Switch */}
                                <div className="flex items-center bg-[#F3F4F6] dark:bg-[#09090B] p-0.5 rounded-lg border border-[#E5E7EB] dark:border-[#3F3F46]">
                                  <button
                                    type="button"
                                    onClick={() => toggleSectionQuestionType(section.id, q.id, "single")}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                                      (q.questionType || "single") === "single"
                                        ? "bg-[#2563EB] text-white shadow-xs"
                                        : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                                    }`}
                                  >
                                    Single Choice (Radio)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleSectionQuestionType(section.id, q.id, "multiple")}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                                      q.questionType === "multiple"
                                        ? "bg-[#2563EB] text-white shadow-xs"
                                        : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                                    }`}
                                  >
                                    Multiple Select (Checkboxes)
                                  </button>
                                </div>

                                <span className="text-[11px] text-[#6B7280]">
                                  ({q.options.length} Options)
                                </span>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingQuestionId(null)}
                                  className="h-8 px-3 text-xs font-semibold border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 rounded-lg"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                  Collapse
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => removeMcqFromSection(section.id, q.id)}
                                  className="text-[#EF4444] hover:bg-[#EF4444]/10 p-1.5 rounded-lg transition-colors"
                                  title="Delete Question"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                                Question Prompt
                              </label>
                              <Input
                                value={q.questionText}
                                onChange={(e) => updateSectionMcqText(section.id, q.id, e.target.value)}
                                placeholder={`Enter MCQ question ${qIdx + 1} text...`}
                                className="h-10 text-xs rounded-xl bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]"
                              />
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                                  Options & Correct Answer {q.questionType === "multiple" && <span className="text-[#2563EB] lowercase font-normal">(check all that apply)</span>}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addOptionToSectionMcq(section.id, q.id)}
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
                                        ? "border-[#2563EB] bg-[#2563EB]/5 dark:bg-[#2563EB]/10"
                                        : "border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] text-[10px] font-bold text-[#6B7280] shrink-0">
                                      {String.fromCharCode(65 + oIdx)}
                                    </div>
                                    <Input
                                      value={opt.text}
                                      onChange={(e) => updateSectionOptionText(section.id, q.id, opt.id, e.target.value)}
                                      placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                      className="h-8 text-xs flex-1 bg-white dark:bg-[#18181B] rounded-lg"
                                    />
                                    <label className="flex items-center gap-1.5 cursor-pointer pr-1 shrink-0">
                                      <input
                                        type={q.questionType === "multiple" ? "checkbox" : "radio"}
                                        name={`correct-opt-${section.id}-${q.id}`}
                                        checked={opt.isCorrect}
                                        onChange={() => toggleSectionOptionCorrect(section.id, q.id, opt.id)}
                                        className={`w-3.5 h-3.5 ${
                                          q.questionType === "multiple"
                                            ? "rounded text-[#2563EB] accent-[#2563EB]"
                                            : "text-[#2563EB] accent-[#2563EB]"
                                        } cursor-pointer`}
                                      />
                                      <span className={`text-[10px] font-bold ${
                                        opt.isCorrect ? "text-[#2563EB]" : "text-[#6B7280]"
                                      }`}>
                                        {q.questionType === "multiple" ? (opt.isCorrect ? "Correct" : "Mark") : "Correct"}
                                      </span>
                                    </label>
                                    {q.options.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => removeOptionFromSectionMcq(section.id, q.id, opt.id)}
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
                              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                                Explanation / Answer Hint (Optional)
                              </label>
                              <Input
                                value={q.explanation || ""}
                                onChange={(e) => updateSectionQuestionExplanation(section.id, q.id, e.target.value)}
                                placeholder="Provide explanation for the correct answer..."
                                className="h-8 text-xs rounded-xl bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]"
                              />
                            </div>

                            {/* Quick Add at End of MCQ Card */}
                            <div className="pt-3 mt-2 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addMcqToSection(section.id, qIdx)}
                                  className="h-8 px-3 text-xs font-bold rounded-lg border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 shadow-xs bg-white dark:bg-[#18181B]"
                                >
                                  <ListChecks className="h-3.5 w-3.5" /> + MCQ Question
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addCodingToSection(section.id)}
                                  className="h-8 px-3 text-xs font-bold rounded-lg border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 shadow-xs bg-white dark:bg-[#18181B]"
                                >
                                  <Code2 className="h-3.5 w-3.5" /> + Coding Problem
                                </Button>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setEditingQuestionId(null)}
                                className="h-8 px-4 text-xs font-bold rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs"
                              >
                                Done Editing
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Coding Problems in this Section */}
                      {section.codingQuestions.map((cq, cqIdx) => {
                        if (editingQuestionId !== cq.id) {
                          const totalCases = (cq.publicTestCases?.length || 0) + (cq.hiddenTestCases?.length || 0);
                          return (
                            <div
                              key={cq.id}
                              className="p-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between group shadow-xs hover:border-[#2563EB]/40 transition-all gap-3"
                            >
                              <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#2563EB]/10 text-[#2563EB]">
                                    Coding #{cqIdx + 1}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    {cq.difficulty || "Easy"}
                                  </span>
                                  <span className="text-[11px] text-[#6B7280]">
                                    ({totalCases} test cases)
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA] truncate">
                                  {cq.title || `Coding Problem ${cqIdx + 1} (Click edit to configure)`}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingQuestionId(cq.id)}
                                  className="h-8 px-3 text-xs font-semibold bg-white dark:bg-[#18181B] gap-1.5"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCodingFromSection(section.id, cq.id)}
                                  className="h-8 px-2.5 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 gap-1.5"
                                  title="Delete Problem"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={cq.id}
                            className="p-5 bg-white dark:bg-[#18181B] border-2 border-[#2563EB] dark:border-[#2563EB]/80 rounded-2xl space-y-4 shadow-sm"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
                              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-[#2563EB] text-white">
                                Coding Problem #{cqIdx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingQuestionId(null)}
                                  className="h-8 px-3 text-xs font-semibold border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 rounded-lg"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                  Collapse
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => removeCodingFromSection(section.id, cq.id)}
                                  className="text-[#EF4444] hover:bg-[#EF4444]/10 p-1.5 rounded-lg transition-colors"
                                  title="Delete Problem"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <CodingProblemCreator
                              inline
                              initialTitle={cq.title || `Coding Problem ${cqIdx + 1}`}
                              initialDescription={cq.description}
                              initialDifficulty={cq.difficulty as any}
                              initialConstraints={cq.constraints}
                              initialInputFormat={cq.inputFormat}
                              initialOutputFormat={cq.outputFormat}
                              initialTemplates={cq.templates}
                              initialPublicTestCases={cq.publicTestCases}
                              initialHiddenTestCases={cq.hiddenTestCases}
                              onChange={(data) => {
                                updateSectionCodingQuestion(section.id, cq.id, data);
                                if (cqIdx === 0 && !smTitle && data.title) {
                                  setSmTitle(data.title);
                                }
                              }}
                            />

                            {/* Quick Add at End of Coding Problem Card */}
                            <div className="pt-3 mt-2 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addMcqToSection(section.id)}
                                  className="h-8 px-3 text-xs font-bold rounded-lg border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 shadow-xs bg-white dark:bg-[#18181B]"
                                >
                                  <ListChecks className="h-3.5 w-3.5" /> + MCQ Question
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addCodingToSection(section.id, cqIdx)}
                                  className="h-8 px-3 text-xs font-bold rounded-lg border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 shadow-xs bg-white dark:bg-[#18181B]"
                                >
                                  <Code2 className="h-3.5 w-3.5" /> + Coding Problem
                                </Button>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setEditingQuestionId(null)}
                                className="h-8 px-4 text-xs font-bold rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs"
                              >
                                Done Editing
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Section-End Quick Add Question Buttons */}
                      {(section.mcqQuestions.length > 0 || section.codingQuestions.length > 0) && (
                        <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#09090B] border border-dashed border-[#2563EB]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                          <span className="text-xs font-bold text-[#2563EB]">
                            + Add another question to this section:
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addMcqToSection(section.id)}
                              className="h-8 px-3 text-xs font-bold rounded-lg border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 shadow-xs bg-white dark:bg-[#18181B]"
                            >
                              <ListChecks className="h-3.5 w-3.5" /> + MCQ Question
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addCodingToSection(section.id)}
                              className="h-8 px-3 text-xs font-bold rounded-lg border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 shadow-xs bg-white dark:bg-[#18181B]"
                            >
                              <Code2 className="h-3.5 w-3.5" /> + Coding Problem
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add New Section Button */}
              <Button
                type="button"
                onClick={addSection}
                variant="outline"
                className="w-full h-12 text-xs font-bold border-2 border-dashed border-[#2563EB]/40 bg-[#2563EB]/5 hover:bg-[#2563EB]/10 text-[#2563EB] rounded-2xl gap-2 shadow-xs transition-all"
              >
                <Plus className="h-4 w-4" /> Add New Section
              </Button>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => { setEditingSubModuleId(null); setViewState("detail"); }} disabled={isSubmitting} className="h-[48px] px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingSubModuleId ? "Update Sub-Module" : "Add Sub-Module"}</span>
                )}
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
      <div className="space-y-8 w-full">
        <PageHeader 
          title="Assign Practice Track"
          description={
            <>
              Target Track: <span className="font-semibold text-[#2563EB]">"{selectedTrack.title}"</span>
            </>
          }
          backAction={{ label: "Back", onClick: () => setViewState("list") }}
          actions={
            <Button onClick={handleSaveAssign} disabled={isSubmitting}
              className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm shrink-0">
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save Assignment ({selectedStudentIds.length})
                </>
              )}
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="space-y-4">
              <VisibilitySelector
                isCommon={isCommon}
                selectedBatches={selectedBatches}
                batches={allBatches.map(b => typeof b === "string" ? { id: b, name: b } : b)}
                onChange={({ isCommon: c, selectedBatches: b }) => {
                  setIsCommon(c);
                  setSelectedBatches(b);
                }}
              />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
                <UserCheck className="h-4 w-4 text-[#2563EB]" /> Individual Student Selection
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
                        isSel ? "bg-[#2563EB]/5" : "hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60"
                      }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSel ? "bg-[#2563EB] text-white" : "bg-[#2563EB]/10 text-[#2563EB]"
                        }`}>{s.name.charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#111827] dark:text-[#FAFAFA] truncate">{s.name}</p>
                          <p className="text-[11px] text-[#6B7280] truncate">{s.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] border-[#2563EB]/30 text-[#2563EB]">{s.batch}</Badge>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                          isSel ? "border-[#2563EB] bg-[#2563EB]" : "border-[#D1D5DB]"
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl bg-white dark:bg-[#18181B] shadow-sm">
          <h3 className="font-semibold text-lg text-[#111827] dark:text-[#FAFAFA]">No practice tracks found</h3>
          <p className="text-sm text-[#6B7280] mt-1 max-w-sm font-normal">
            {search ? "No practice tracks match your search criteria. Try a different term." : "You haven't created any practice tracks yet. Click the button above to get started."}
          </p>
          {!search && (
            <Button onClick={openCreate} className="mt-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Create First Track
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((track) => {
            const totalMods = track.subModules.length;
            const totalMarks = track.subModules.reduce((s, m) => s + m.totalMarks, 0);
            const totalDuration = track.subModules.reduce((s, m) => s + m.durationMinutes, 0);

            return (
              <Card key={track.id}
                className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors">
                <CardContent className="p-6 space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    {/* Top Row: Category Pill */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs font-semibold px-3 py-1 border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5 rounded-lg flex items-center gap-1.5 whitespace-normal">
                        <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                        <span>{track.category}</span>
                      </Badge>
                    </div>

                    {/* Instructor & Status Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                        <User className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                        <span>Instructor: <strong className="text-[#111827] dark:text-[#FAFAFA] font-semibold">{track.assignedByName}</strong></span>
                      </div>

                      {track.status === "draft" ? (
                        <Badge variant="outline" className="text-[10px] font-bold px-2.5 py-0.5 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1 rounded-md shrink-0">
                          <Clock className="h-3 w-3" /> Draft
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold px-2.5 py-0.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 rounded-md shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Published
                        </Badge>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-bold text-base text-[#111827] dark:text-[#FAFAFA] leading-snug line-clamp-2">{track.title}</h3>
                      <p className="text-xs text-[#6B7280] line-clamp-2 mt-1.5 leading-relaxed">{track.description}</p>
                    </div>

                    {/* Parameters Box */}
                    <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Sub-Modules:</span>
                        <span className="font-bold text-[#2563EB]">{totalMods} Practice Modules</span>
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
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => { setSelectedTrack(track); setViewState("detail"); }}
                        className="flex-1 h-9 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-xs">
                        Modules ({totalMods})
                      </Button>
                      <Button onClick={() => openAssign(track)} variant="outline"
                        className="h-9 px-3.5 text-xs font-bold border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 rounded-xl gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Assign
                      </Button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {track.status === "draft" ? (
                        <Button
                          onClick={() => handleTogglePublishTrack(track.id)}
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs font-bold border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 rounded-xl shadow-xs"
                        >
                          <UploadCloud className="h-3.5 w-3.5" /> Publish
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleTogglePublishTrack(track.id)}
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1.5 rounded-xl shadow-xs"
                        >
                          <EyeOff className="h-3.5 w-3.5" /> Unpublish
                        </Button>
                      )}

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button onClick={() => openEdit(track)} variant="outline" size="icon"
                          className="h-8 w-8 text-[#D97706] border-[#D97706]/40 hover:bg-[#D97706]/10 rounded-xl"
                          title="Edit Track Details">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button onClick={() => handleDelete(track.id, track.title)} variant="outline" size="icon"
                          className="h-8 w-8 text-[#DC2626] border-[#DC2626]/40 hover:bg-[#DC2626]/10 rounded-xl"
                          title="Delete Track">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
