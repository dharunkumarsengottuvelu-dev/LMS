"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CodingProblemCreator } from "@/components/admin/coding-problem-creator";
import { BulkUploadModal } from "@/components/admin/bulk-upload";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { CodingProblemsService } from "@/services/coding-problems.service";
import { cn } from "@/lib/utils";
import { 
  FolderPlus, 
  Layers, 
  BookOpen, 
  X, 
  Globe, 
  Users, 
  Check, 
  AlertTriangle,
  ShieldAlert,
  Search,
  Eye,
  Code2,
  HelpCircle,
  CheckCircle2,
  Trash2,
  Edit3,
  Plus,
  ChevronDown
} from "lucide-react";

// ─── TYPES FOR STRICT 3-LEVEL HIERARCHY ──────────────────────────────
export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MCQQuestion {
  id: string;
  questionText: string;
  marks?: number;
  options: MCQOption[];
  explanation?: string;
  allowMultiple?: boolean;
}

export interface PracticeModule {
  id: string;
  submodule_id: string;
  main_module_id: string;
  name: string;
  title: string;
  description: string;
  status: "active" | "inactive";
  display_order: number;
  type: "mcq" | "coding" | "mixed";
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  allowedAttempts?: number;
  reattemptEnabled?: boolean;
  reviewEnabled?: boolean;
  passingMarks?: number;
  completionRule?: "submit" | "pass";
  mcqSectionTitle?: string;
  codingSectionTitle?: string;
  mcqQuestions: MCQQuestion[];
  codingQuestions: any[];
  created_at?: string;
  updated_at?: string;
}

export interface PracticeSubmodule {
  id: string;
  main_module_id: string;
  name: string;
  title: string;
  description: string;
  status: "active" | "inactive";
  display_order: number;
  modules: PracticeModule[];
  created_at?: string;
  updated_at?: string;
}

export interface PracticeMainModule {
  id: string;
  name: string;
  title: string;
  category: string;
  difficulty: string;
  description: string;
  status: "active" | "inactive";
  display_order: number;
  assignedByName: string;
  assignedBatches: string[];
  assignedStudents: string[];
  isCommon: boolean;
  submodules: PracticeSubmodule[];
  createdAt?: string;
  updatedAt?: string;
}

type NavigationLevel = "main_modules" | "submodules" | "modules" | "module_editor";

// ─── MNC-LEVEL CUSTOM DROPDOWN SELECT COMPONENT ────────────────────────
interface MncSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  dotColor?: string;
}

interface MncSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: MncSelectOption[];
  placeholder?: string;
  className?: string;
  variant?: "purple" | "blue" | "emerald";
}

function MncSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  variant = "purple",
}: MncSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeRing =
    variant === "blue"
      ? "ring-2 ring-blue-500/20 border-blue-500 dark:border-blue-500"
      : variant === "emerald"
      ? "ring-2 ring-emerald-500/20 border-emerald-500 dark:border-emerald-500"
      : "ring-2 ring-purple-500/20 border-purple-500 dark:border-purple-500";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "w-full h-9.5 px-3 flex items-center justify-between gap-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none",
          "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 shadow-2xs",
          "hover:border-purple-400 dark:hover:border-purple-500 hover:bg-slate-50 dark:hover:bg-zinc-800/90",
          isOpen ? activeRing : ""
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <div className="shrink-0 text-slate-500 dark:text-zinc-400">
              {selectedOption.icon}
            </div>
          )}
          {selectedOption?.dotColor && (
            <span className={cn("w-2 h-2 rounded-full shrink-0", selectedOption.dotColor)} />
          )}
          <span className="truncate text-slate-900 dark:text-zinc-100 font-semibold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 transition-transform duration-200",
            isOpen ? "rotate-180 text-purple-600 dark:text-purple-400" : ""
          )}
        />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 p-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5 animate-in fade-in-0 zoom-in-95 duration-150 min-w-[130px]"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full h-8.5 px-2.5 rounded-lg text-left flex items-center justify-between gap-2 text-xs font-semibold transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold"
                    : "text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon && <div className="shrink-0">{opt.icon}</div>}
                  {opt.dotColor && <span className={cn("w-2 h-2 rounded-full shrink-0", opt.dotColor)} />}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PracticesHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();

  // ─── STATE ────────────────────────────────────────────────────────
  const [tracks, setTracks] = useState<PracticeMainModule[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Hierarchy Navigation State
  const [activeLevel, setActiveLevel] = useState<NavigationLevel>("main_modules");
  const [selectedMainModuleId, setSelectedMainModuleId] = useState<string | null>(null);
  const [selectedSubmoduleId, setSelectedSubmoduleId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Modal Dialogs
  const [showMainModuleModal, setShowMainModuleModal] = useState<boolean>(false);
  const [editingMainModule, setEditingMainModule] = useState<PracticeMainModule | null>(null);

  const [showSubmoduleModal, setShowSubmoduleModal] = useState<boolean>(false);
  const [editingSubmodule, setEditingSubmodule] = useState<PracticeSubmodule | null>(null);

  const [showModuleModal, setShowModuleModal] = useState<boolean>(false);
  const [editingModule, setEditingModule] = useState<PracticeModule | null>(null);

  // Form Fields: Main Module
  const [fMainName, setFMainName] = useState<string>("");
  const [fMainDesc, setFMainDesc] = useState<string>("");
  const [fMainStatus, setFMainStatus] = useState<"active" | "inactive">("active");
  const [fMainOrder, setFMainOrder] = useState<number>(0);
  const [fMainIsCommon, setFMainIsCommon] = useState<boolean>(true);
  const [fMainBatches, setFMainBatches] = useState<string[]>([]);
  const [fBatchSearch, setFBatchSearch] = useState<string>("");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form Fields: Submodule
  const [fSubName, setFSubName] = useState<string>("");
  const [fSubDesc, setFSubDesc] = useState<string>("");
  const [fSubStatus, setFSubStatus] = useState<"active" | "inactive">("active");
  const [fSubOrder, setFSubOrder] = useState<number>(0);

  // Form Fields: Module
  const [fModName, setFModName] = useState<string>("");
  const [fModDesc, setFModDesc] = useState<string>("");
  const [fModType, setFModType] = useState<"mixed" | "mcq" | "coding">("mixed");
  const [fModDurationEnabled, setFModDurationEnabled] = useState<boolean>(true);
  const [fModDuration, setFModDuration] = useState<number>(60);
  const [fModMarks, setFModMarks] = useState<number>(100);
  const [fModStatus, setFModStatus] = useState<"active" | "inactive">("active");
  const [fModOrder, setFModOrder] = useState<number>(0);
  const [fModMcqSectionTitle, setFModMcqSectionTitle] = useState<string>("Section 1: MCQs");
  const [fModCodingSectionTitle, setFModCodingSectionTitle] = useState<string>("Section 2: Coding");
  const [fModAllowedAttempts, setFModAllowedAttempts] = useState<number>(3);
  const [fModReattemptEnabled, setFModReattemptEnabled] = useState<boolean>(true);
  const [fModReviewEnabled, setFModReviewEnabled] = useState<boolean>(true);
  const [fModPassingMarks, setFModPassingMarks] = useState<number>(40);
  const [fModCompletionRule, setFModCompletionRule] = useState<"submit" | "pass">("submit");

  // Module Questions Editor State
  const [activeTab, setActiveTab] = useState<"mcq" | "coding">("mcq");
  const [mcqList, setMcqList] = useState<MCQQuestion[]>([]);
  const [codingList, setCodingList] = useState<any[]>([]);
  const [showCodingCreator, setShowCodingCreator] = useState<boolean>(false);
  const [editingCodingIndex, setEditingCodingIndex] = useState<number | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState<boolean>(false);
  const [bulkUploadModuleType, setBulkUploadModuleType] = useState<"coding_problem" | "assessment_questions">("coding_problem");
  // MNC-Level Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "main_module"; item: PracticeMainModule; title: string; subCount: number }
    | { type: "submodule"; item: PracticeSubmodule; title: string; modCount: number }
    | { type: "module"; item: PracticeModule; title: string; questionCount: number }
    | { type: "question"; questionType: "coding" | "mcq"; index: number; title: string; targetModule?: PracticeModule }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // View Module Questions Modal State
  const [viewingQuestionsModule, setViewingQuestionsModule] = useState<PracticeModule | null>(null);
  const [viewQuestionsFilter, setViewQuestionsFilter] = useState<"all" | "mcq" | "coding">("all");

  // Fetch actual data from backend
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/practices");
      if (!res.ok) throw new Error("Failed to load practice modules");
      const data = await res.json();
      if (Array.isArray(data.tracks)) {
        setTracks(data.tracks);
      }
      if (Array.isArray(data.batches)) {
        setBatches(data.batches);
      }
    } catch (err: any) {
      toast({
        title: "Load Error",
        description: err.message || "Failed to load database records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();

    // Supabase Realtime channel for live sync with database
    const supabase = createClient();
    const channel = supabase
      .channel("admin_practice_tracks_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "practice_tracks" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const handleFocus = () => fetchData();
    window.addEventListener("focus", handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchData]);

  // Handle ESC key for MNC Delete Confirmation Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && deleteTarget && !isDeleting) {
        setDeleteTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteTarget, isDeleting]);

  // Helper functions to resolve parent hierarchy reliably across any navigation flow
  const resolveHierarchyForModule = useCallback((modId: string) => {
    for (const main of tracks) {
      for (const sub of main.submodules || []) {
        const foundMod = sub.modules?.find((m) => m.id === modId);
        if (foundMod) {
          return { mainModule: main, submodule: sub, module: foundMod };
        }
      }
    }
    return { mainModule: null, submodule: null, module: null };
  }, [tracks]);

  const resolveHierarchyForSubmodule = useCallback((subId: string) => {
    for (const main of tracks) {
      const foundSub = main.submodules?.find((s) => s.id === subId);
      if (foundSub) {
        return { mainModule: main, submodule: foundSub };
      }
    }
    return { mainModule: null, submodule: null };
  }, [tracks]);

  // Derived current Main Module, Submodule, and Module with robust fallbacks
  const currentMainModule = useMemo(() => {
    if (selectedMainModuleId) {
      const found = tracks.find((t) => t.id === selectedMainModuleId);
      if (found) return found;
    }
    if (selectedModuleId) {
      const { mainModule } = resolveHierarchyForModule(selectedModuleId);
      if (mainModule) return mainModule;
    }
    if (selectedSubmoduleId) {
      const { mainModule } = resolveHierarchyForSubmodule(selectedSubmoduleId);
      if (mainModule) return mainModule;
    }
    return null;
  }, [tracks, selectedMainModuleId, selectedSubmoduleId, selectedModuleId, resolveHierarchyForModule, resolveHierarchyForSubmodule]);

  const currentSubmodule = useMemo(() => {
    if (currentMainModule && selectedSubmoduleId) {
      const found = currentMainModule.submodules.find((s) => s.id === selectedSubmoduleId);
      if (found) return found;
    }
    if (selectedModuleId) {
      const { submodule } = resolveHierarchyForModule(selectedModuleId);
      if (submodule) return submodule;
    }
    if (selectedSubmoduleId) {
      const { submodule } = resolveHierarchyForSubmodule(selectedSubmoduleId);
      if (submodule) return submodule;
    }
    return null;
  }, [currentMainModule, selectedSubmoduleId, selectedModuleId, resolveHierarchyForModule, resolveHierarchyForSubmodule]);

  const currentModule = useMemo(() => {
    if (currentSubmodule && selectedModuleId) {
      const found = currentSubmodule.modules.find((m) => m.id === selectedModuleId);
      if (found) return found;
    }
    if (selectedModuleId) {
      const { module } = resolveHierarchyForModule(selectedModuleId);
      if (module) return module;
    }
    return null;
  }, [currentSubmodule, selectedModuleId, resolveHierarchyForModule]);

  // ─── CRUD HANDLERS ──────────────────────────────────────────────────

  // 1. MAIN MODULE ACTIONS
  const handleOpenAddMainModule = () => {
    setEditingMainModule(null);
    setFMainName("");
    setFMainDesc("");
    setFMainStatus("active");
    setFMainOrder(tracks.length + 1);
    setFMainIsCommon(true);
    setFMainBatches([]);
    setShowMainModuleModal(true);
  };

  const handleOpenEditMainModule = (m: PracticeMainModule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMainModule(m);
    setFMainName(m.name || m.title || "");
    setFMainDesc(m.description || "");
    setFMainStatus(m.status === "inactive" ? "inactive" : "active");
    setFMainOrder(m.display_order ?? 0);
    setFMainIsCommon(m.isCommon ?? true);
    setFMainBatches(m.assignedBatches || []);
    setShowMainModuleModal(true);
  };

  const handleSaveMainModule = async () => {
    const trimmedName = fMainName.trim();
    if (!trimmedName) {
      toast({ title: "Validation Error", description: "Main Module name is required", variant: "destructive" });
      return;
    }

    try {
      const isEdit = Boolean(editingMainModule?.id);
      const action = isEdit ? "update_main_module" : "create_main_module";
      const payload: any = {
        action,
        id: editingMainModule?.id,
        name: trimmedName,
        title: trimmedName,
        description: fMainDesc.trim(),
        status: fMainStatus,
        display_order: Number(fMainOrder) || 0,
        isCommon: fMainIsCommon,
        assignedBatches: fMainIsCommon ? [] : fMainBatches,
      };

      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Operation failed");

      toast({ title: "Success", description: `Main Module ${isEdit ? "updated" : "created"} successfully` });
      setShowMainModuleModal(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleMainModuleStatus = async (m: PracticeMainModule, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = m.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_main_module",
          id: m.id,
          name: m.name || m.title,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast({ title: "Status Updated", description: `Main Module marked ${newStatus.toUpperCase()}` });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteMainModule = (m: PracticeMainModule, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({
      type: "main_module",
      item: m,
      title: m.name || m.title || "Main Module",
      subCount: m.submodules?.length || 0,
    });
  };

  // 2. SUBMODULE ACTIONS
  const handleOpenAddSubmodule = () => {
    if (!currentMainModule) return;
    setEditingSubmodule(null);
    setFSubName("");
    setFSubDesc("");
    setFSubStatus("active");
    setFSubOrder(currentMainModule.submodules.length + 1);
    setShowSubmoduleModal(true);
  };

  const handleOpenEditSubmodule = (sm: PracticeSubmodule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubmodule(sm);
    setFSubName(sm.name || sm.title || "");
    setFSubDesc(sm.description || "");
    setFSubStatus(sm.status);
    setFSubOrder(sm.display_order ?? 0);
    setShowSubmoduleModal(true);
  };

  const handleSaveSubmodule = async () => {
    const trimmedName = fSubName.trim();
    if (!trimmedName || !currentMainModule) {
      toast({ title: "Validation Error", description: "Submodule name is required", variant: "destructive" });
      return;
    }

    try {
      const isEdit = Boolean(editingSubmodule?.id);
      const action = isEdit ? "update_submodule" : "create_submodule";
      const payload: any = {
        action,
        main_module_id: currentMainModule.id,
        id: editingSubmodule?.id,
        name: trimmedName,
        title: trimmedName,
        description: fSubDesc.trim(),
        status: fSubStatus,
        display_order: Number(fSubOrder) || 0,
      };

      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Operation failed");

      toast({ title: "Success", description: `Submodule ${isEdit ? "updated" : "created"} successfully` });
      setShowSubmoduleModal(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleSubmoduleStatus = async (sm: PracticeSubmodule, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentMainModule) return;
    const newStatus = sm.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_submodule",
          main_module_id: currentMainModule.id,
          id: sm.id,
          name: sm.name || sm.title,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast({ title: "Status Updated", description: `Submodule marked ${newStatus.toUpperCase()}` });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteSubmodule = (sm: PracticeSubmodule, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({
      type: "submodule",
      item: sm,
      title: sm.name || sm.title || "Submodule",
      modCount: sm.modules?.length || 0,
    });
  };

  // 3. MODULE ACTIONS
  const handleOpenAddModule = () => {
    if (!currentMainModule || !currentSubmodule) return;
    setEditingModule(null);
    setFModName("");
    setFModDesc("");
    setFModType("mixed");
    setFModDurationEnabled(true);
    setFModDuration(60);
    setFModMarks(100);
    setFModStatus("active");
    setFModOrder(currentSubmodule.modules.length + 1);
    setFModMcqSectionTitle("Section 1: MCQs");
    setFModCodingSectionTitle("Section 2: Coding");
    setFModAllowedAttempts(3);
    setFModReattemptEnabled(true);
    setFModReviewEnabled(true);
    setFModPassingMarks(40);
    setFModCompletionRule("submit");
    setShowModuleModal(true);
  };

  const handleOpenEditModule = (m: PracticeModule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModule(m);
    setFModName(m.name || m.title || "");
    setFModDesc(m.description || "");
    setFModType(m.type || "mixed");
    const hasDur = typeof m.durationMinutes === "number" && m.durationMinutes > 0;
    setFModDurationEnabled(hasDur);
    setFModDuration(hasDur ? m.durationMinutes : 60);
    setFModMarks(m.totalMarks || 100);
    setFModStatus(m.status);
    setFModOrder(m.display_order ?? 0);
    setFModMcqSectionTitle(m.mcqSectionTitle || "Section 1: MCQs");
    setFModCodingSectionTitle(m.codingSectionTitle || "Section 2: Coding");
    setFModAllowedAttempts(typeof m.allowedAttempts === "number" ? m.allowedAttempts : 3);
    setFModReattemptEnabled(typeof m.reattemptEnabled === "boolean" ? m.reattemptEnabled : true);
    setFModReviewEnabled(typeof m.reviewEnabled === "boolean" ? m.reviewEnabled : true);
    setFModPassingMarks(typeof m.passingMarks === "number" ? m.passingMarks : 40);
    setFModCompletionRule(m.completionRule || "submit");
    setShowModuleModal(true);
  };

  const handleSaveModule = async () => {
    const trimmedName = fModName.trim();
    if (!trimmedName || !currentMainModule || !currentSubmodule) {
      toast({ title: "Validation Error", description: "Module name is required", variant: "destructive" });
      return;
    }

    try {
      const isEdit = Boolean(editingModule?.id);
      const action = isEdit ? "update_module" : "create_module";
      const finalDuration = fModDurationEnabled ? (Number(fModDuration) || 60) : 0;
      const payload: any = {
        action,
        main_module_id: currentMainModule.id,
        submodule_id: currentSubmodule.id,
        id: editingModule?.id,
        name: trimmedName,
        title: trimmedName,
        description: fModDesc.trim(),
        type: fModType,
        durationMinutes: finalDuration,
        totalMarks: Number(fModMarks) || 100,
        status: fModStatus,
        display_order: Number(fModOrder) || 0,
        mcqSectionTitle: fModMcqSectionTitle.trim() || "Section 1: MCQs",
        codingSectionTitle: fModCodingSectionTitle.trim() || "Section 2: Coding",
        allowedAttempts: Math.max(1, Number(fModAllowedAttempts) || 1),
        reattemptEnabled: Boolean(fModReattemptEnabled),
        reviewEnabled: Boolean(fModReviewEnabled),
        passingMarks: Math.max(0, Number(fModPassingMarks) || 0),
        completionRule: fModCompletionRule || "submit",
      };

      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Operation failed");

      toast({ title: "Success", description: `Module ${isEdit ? "updated" : "created"} successfully` });
      setShowModuleModal(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleModuleStatus = async (m: PracticeModule, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentMainModule || !currentSubmodule) return;
    const newStatus = m.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_module",
          main_module_id: currentMainModule.id,
          submodule_id: currentSubmodule.id,
          id: m.id,
          name: m.name || m.title,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast({ title: "Status Updated", description: `Module marked ${newStatus.toUpperCase()}` });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteModule = (m: PracticeModule, e: React.MouseEvent) => {
    e.stopPropagation();
    const qCount = (m.mcqQuestions?.length || 0) + (m.codingQuestions?.length || 0);
    setDeleteTarget({
      type: "module",
      item: m,
      title: m.name || m.title || "Practice Module",
      questionCount: qCount,
    });
  };

  // 4. OPEN MODULE QUESTIONS EDITOR
  const handleOpenModuleEditor = (m: PracticeModule) => {
    const hierarchy = resolveHierarchyForModule(m.id);
    const mainId = m.main_module_id || hierarchy.mainModule?.id;
    const subId = m.submodule_id || hierarchy.submodule?.id;
    if (mainId) setSelectedMainModuleId(mainId);
    if (subId) setSelectedSubmoduleId(subId);
    setSelectedModuleId(m.id);
    setMcqList(m.mcqQuestions || []);
    setCodingList(m.codingQuestions || []);
    setActiveTab(m.type === "coding" ? "coding" : "mcq");
    setShowCodingCreator(false);
    setEditingCodingIndex(null);
    setActiveLevel("module_editor");
  };

  const handleSaveModuleQuestions = async () => {
    const activeMod = currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
    if (!activeMod) {
      toast({ title: "Error", description: "Module not found", variant: "destructive" });
      return;
    }

    const resolvedHierarchy = resolveHierarchyForModule(activeMod.id);
    const parentMainId = activeMod.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
    const parentSubId = activeMod.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;

    if (!parentMainId || !parentSubId) {
      toast({ title: "Error", description: "Parent module hierarchy not found", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_module",
          main_module_id: parentMainId,
          submodule_id: parentSubId,
          id: activeMod.id,
          name: activeMod.name || activeMod.title,
          mcqSectionTitle: activeMod.mcqSectionTitle || "Section 1: MCQs",
          codingSectionTitle: activeMod.codingSectionTitle || "Section 2: Coding",
          mcqQuestions: mcqList,
          codingQuestions: codingList,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");

      toast({ title: "Saved", description: "Practice module questions saved to database" });
      await fetchData();
      setActiveLevel("modules");
    } catch (err: any) {
      toast({ title: "Save Error", description: err.message, variant: "destructive" });
    }
  };

  // Save current MCQ list to DB and immediately append a blank new question
  const handleSaveAndAddNextMCQ = async (currentList: MCQQuestion[]) => {
    const activeMod = currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
    if (!activeMod) return;

    const resolvedHierarchy = resolveHierarchyForModule(activeMod.id);
    const parentMainId = activeMod.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
    const parentSubId = activeMod.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;
    if (!parentMainId || !parentSubId) return;

    const newQ: MCQQuestion = {
      id: `mcq_${Date.now()}`,
      questionText: "",
      marks: 10,
      options: [
        { id: `opt_${Date.now()}_1`, text: "", isCorrect: true },
        { id: `opt_${Date.now()}_2`, text: "", isCorrect: false },
        { id: `opt_${Date.now()}_3`, text: "", isCorrect: false },
        { id: `opt_${Date.now()}_4`, text: "", isCorrect: false },
      ],
    };
    const updatedList = [...currentList, newQ];
    setMcqList(updatedList);

    try {
      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_module",
          main_module_id: parentMainId,
          submodule_id: parentSubId,
          id: activeMod.id,
          name: activeMod.name || activeMod.title,
          mcqSectionTitle: activeMod.mcqSectionTitle || "Section 1: MCQs",
          codingSectionTitle: activeMod.codingSectionTitle || "Section 2: Coding",
          mcqQuestions: updatedList,
          codingQuestions: codingList,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      toast({ title: "Saved & New Question Added", description: `Question #${currentList.length + 1} saved. New blank question ready.` });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Save Error", description: err.message, variant: "destructive" });
    }
  };

  // 5. UNIFIED MNC-LEVEL DELETE EXECUTION HANDLER
  const handleExecuteDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === "main_module") {
        const m = deleteTarget.item;
        const res = await fetch(`/api/admin/practices?id=${encodeURIComponent(m.id)}&type=main_module`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete Main Module");
        toast({ title: "Deleted", description: `Main Module "${deleteTarget.title}" deleted successfully.` });
        if (selectedMainModuleId === m.id) {
          setSelectedMainModuleId(null);
          setActiveLevel("main_modules");
        }
        setDeleteTarget(null);
        await fetchData();
      } else if (deleteTarget.type === "submodule") {
        const sm = deleteTarget.item;
        const resolvedHierarchy = resolveHierarchyForSubmodule(sm.id);
        const parentMainId = sm.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
        if (!parentMainId) throw new Error("Parent Main Module ID could not be identified.");

        const res = await fetch(
          `/api/admin/practices?id=${encodeURIComponent(sm.id)}&type=submodule&main_module_id=${encodeURIComponent(parentMainId)}`,
          { method: "DELETE" }
        );
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete Submodule");
        toast({ title: "Deleted", description: `Submodule "${deleteTarget.title}" deleted successfully.` });
        if (selectedSubmoduleId === sm.id) {
          setSelectedSubmoduleId(null);
          setActiveLevel("submodules");
        }
        setDeleteTarget(null);
        await fetchData();
      } else if (deleteTarget.type === "module") {
        const mod = deleteTarget.item;
        const resolvedHierarchy = resolveHierarchyForModule(mod.id);
        const parentMainId = mod.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
        const parentSubId = mod.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;
        if (!parentMainId || !parentSubId) throw new Error("Parent hierarchy could not be identified for this module.");

        const res = await fetch(
          `/api/admin/practices?id=${encodeURIComponent(mod.id)}&type=module&main_module_id=${encodeURIComponent(parentMainId)}&submodule_id=${encodeURIComponent(parentSubId)}`,
          { method: "DELETE" }
        );
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete Module");
        toast({ title: "Deleted", description: `Module "${deleteTarget.title}" deleted successfully.` });
        if (selectedModuleId === mod.id) {
          setSelectedModuleId(null);
          setActiveLevel("modules");
        }
        setDeleteTarget(null);
        await fetchData();
      } else if (deleteTarget.type === "question") {
        const { questionType, index, title, targetModule } = deleteTarget;
        const activeMod = targetModule || currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
        if (!activeMod) throw new Error("Module not found for this question.");

        const resolvedHierarchy = resolveHierarchyForModule(activeMod.id);
        const parentMainId = activeMod.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
        const parentSubId = activeMod.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;
        if (!parentMainId || !parentSubId) throw new Error("Parent module hierarchy not found.");

        const isCurrentActive = activeMod.id === currentModule?.id || activeMod.id === selectedModuleId;
        const currentMcqs = isCurrentActive ? mcqList : (activeMod.mcqQuestions || []);
        const currentCodings = isCurrentActive ? codingList : (activeMod.codingQuestions || []);

        const updatedMcqs = questionType === "mcq" ? currentMcqs.filter((_, i) => i !== index) : currentMcqs;
        const updatedCodings = questionType === "coding" ? currentCodings.filter((_, i) => i !== index) : currentCodings;

        if (isCurrentActive) {
          if (questionType === "mcq") setMcqList(updatedMcqs);
          if (questionType === "coding") setCodingList(updatedCodings);
        }

        const res = await fetch("/api/admin/practices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_module",
            main_module_id: parentMainId,
            submodule_id: parentSubId,
            id: activeMod.id,
            name: activeMod.name || activeMod.title,
            mcqSectionTitle: activeMod.mcqSectionTitle || "Section 1: MCQs",
            codingSectionTitle: activeMod.codingSectionTitle || "Section 2: Coding",
            mcqQuestions: updatedMcqs,
            codingQuestions: updatedCodings,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Delete failed");

        if (viewingQuestionsModule && viewingQuestionsModule.id === activeMod.id) {
          setViewingQuestionsModule({
            ...viewingQuestionsModule,
            mcqQuestions: updatedMcqs,
            codingQuestions: updatedCodings,
            questionCount: updatedMcqs.length + updatedCodings.length,
          });
        }

        toast({ title: "Deleted", description: `"${title}" has been deleted successfully.` });
        setDeleteTarget(null);
        await fetchData();
      }
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message || "Failed to complete deletion", variant: "destructive" });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper actions for View Questions Modal
  const handleOpenViewQuestions = (m: PracticeModule) => {
    setViewingQuestionsModule(m);
    setViewQuestionsFilter("all");
  };

  const handleEditQuestionFromView = (m: PracticeModule, type: "mcq" | "coding", index: number) => {
    setViewingQuestionsModule(null);
    handleOpenModuleEditor(m);
    if (type === "mcq") {
      setActiveTab("mcq");
      toast({ title: "Editing MCQ", description: `Editing Question #${index + 1}` });
    } else {
      setActiveTab("coding");
      setEditingCodingIndex(index);
      setShowCodingCreator(true);
      toast({ title: "Editing Coding Problem", description: `Editing ${m.codingQuestions?.[index]?.title || `Problem #${index + 1}`}` });
    }
  };

  const handleDeleteQuestionFromView = (m: PracticeModule, type: "mcq" | "coding", index: number, title: string) => {
    setDeleteTarget({
      type: "question",
      questionType: type,
      index,
      title,
      targetModule: m,
    });
  };

  // 6. BULK IMPORT HANDLER (FOR CODING CHALLENGES & MCQS)
  const handleBulkImport = async (importedItems: any[]) => {
    if (!importedItems || importedItems.length === 0) return;

    if (bulkUploadModuleType === "coding_problem") {
      const newCodingProblems = importedItems.map((p, i) => {
        const starterCode = p.starter_code || p.templates || {};
        const testCases = Array.isArray(p.test_cases) ? p.test_cases : [];
        const sampleCases = testCases.filter((tc: any) => !tc.is_hidden);
        const hiddenCases = testCases.filter((tc: any) => tc.is_hidden);

        return {
          id: p.id || `cp-${Date.now()}-${i}`,
          title: p.title || `Coding Challenge ${i + 1}`,
          slug: p.slug || `prob-${Date.now()}-${i}`,
          description: p.description || "",
          difficulty: (p.difficulty || "medium").toLowerCase(),
          category: p.category || "Algorithms",
          tags: p.topic_tags || p.tags || [],
          points: Number(p.points) || 100,
          time_limit_ms: Number(p.time_limit_ms) || 2000,
          memory_limit_mb: Number(p.memory_limit_mb) || 256,
          starter_code: starterCode,
          test_cases: testCases,
          sample_test_cases: sampleCases,
          hidden_test_cases: hiddenCases,
          status: "published",
          scope: "practice",
          assessment_id: currentModule?.id,
          module_id: currentModule?.id,
        };
      });

      const updated = [...codingList, ...newCodingProblems];
      setCodingList(updated);
      setIsBulkUploadOpen(false);

      // Persist imported coding problems directly to Supabase coding_problems table
      CodingProblemsService.saveProblems(newCodingProblems as any).catch((err) => {
        console.warn("Direct DB bulk coding persistence notice:", err);
      });

      if (currentMainModule && currentSubmodule && currentModule) {
        try {
          await fetch("/api/admin/practices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update_module",
              main_module_id: currentMainModule.id,
              submodule_id: currentSubmodule.id,
              id: currentModule.id,
              name: currentModule.name,
              mcqQuestions: mcqList,
              codingQuestions: updated,
            }),
          });
          await fetchData();
          toast({
            title: "Bulk Upload Complete",
            description: `Imported and saved ${newCodingProblems.length} coding challenges to database.`,
          });
        } catch (err: any) {
          toast({
            title: "Save Required",
            description: "Click 'Save Questions & Exit' to persist changes to database.",
          });
        }
      }
    } else {
      // MCQ Import
      const newMCQs: MCQQuestion[] = importedItems.map((item, idx) => {
        const opt1 = { id: `opt_${Date.now()}_1_${idx}`, text: item.option_1 || item.option1 || item.optionA || "Option A", isCorrect: false };
        const opt2 = { id: `opt_${Date.now()}_2_${idx}`, text: item.option_2 || item.option2 || item.optionB || "Option B", isCorrect: false };
        const opt3 = { id: `opt_${Date.now()}_3_${idx}`, text: item.option_3 || item.option3 || item.optionC || "Option C", isCorrect: false };
        const opt4 = { id: `opt_${Date.now()}_4_${idx}`, text: item.option_4 || item.option4 || item.optionD || "Option D", isCorrect: false };

        const correctStr = String(item.correctAnswer || item.correct_answer || "A").trim().toUpperCase();
        if (correctStr.includes("B") || correctStr === "2") opt2.isCorrect = true;
        else if (correctStr.includes("C") || correctStr === "3") opt3.isCorrect = true;
        else if (correctStr.includes("D") || correctStr === "4") opt4.isCorrect = true;
        else opt1.isCorrect = true;

        const rawOptions = [opt1, opt2, opt3, opt4];

        return {
          id: item.id || `mcq_${Date.now()}_${idx}`,
          questionText: String(item.question || item.questionText || item.title || `Question ${idx + 1}`).trim(),
          marks: Number(item.marks || item.totalMarks) || 10,
          options: rawOptions,
          explanation: String(item.explanation || "").trim(),
        };
      });

      const updated = [...mcqList, ...newMCQs];
      setMcqList(updated);
      setIsBulkUploadOpen(false);

      if (currentMainModule && currentSubmodule && currentModule) {
        try {
          await fetch("/api/admin/practices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update_module",
              main_module_id: currentMainModule.id,
              submodule_id: currentSubmodule.id,
              id: currentModule.id,
              name: currentModule.name,
              mcqQuestions: updated,
              codingQuestions: codingList,
            }),
          });
          await fetchData();
          toast({
            title: "Bulk Upload Complete",
            description: `Imported and saved ${newMCQs.length} MCQ questions to database.`,
          });
        } catch (err: any) {
          toast({
            title: "Save Required",
            description: "Click 'Save Questions & Exit' to persist changes to database.",
          });
        }
      }
    }
  };

  // Filtered Main Modules for Search
  const filteredTracks = useMemo(() => {
    if (!search.trim()) return tracks;
    const q = search.toLowerCase();
    return tracks.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [tracks, search]);

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      {/* ─── MNC PAGE HEADER (PURE TEXT, ZERO ICONS) ────────────────────── */}
      {!(activeLevel === "module_editor" && showCodingCreator) && (
        <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              {/* Breadcrumb Hierarchy Navigation */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMainModuleId(null);
                    setSelectedSubmoduleId(null);
                    setSelectedModuleId(null);
                    setActiveLevel("main_modules");
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 underline-offset-2 hover:underline cursor-pointer"
                >
                  Practice Management
                </button>

                {currentMainModule && (
                  <>
                    <span className="text-slate-400">/</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubmoduleId(null);
                        setSelectedModuleId(null);
                        setActiveLevel("submodules");
                      }}
                      className="hover:text-blue-600 dark:hover:text-blue-400 underline-offset-2 hover:underline cursor-pointer font-semibold text-slate-800 dark:text-zinc-200"
                    >
                      {currentMainModule.name || currentMainModule.title}
                    </button>
                  </>
                )}

                {currentSubmodule && (
                  <>
                    <span className="text-slate-400">/</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModuleId(null);
                        setActiveLevel("modules");
                      }}
                      className="hover:text-blue-600 dark:hover:text-blue-400 underline-offset-2 hover:underline cursor-pointer font-semibold text-slate-800 dark:text-zinc-200"
                    >
                      {currentSubmodule.name || currentSubmodule.title}
                    </button>
                  </>
                )}

                {activeLevel === "module_editor" && currentModule && (
                  <>
                    <span className="text-slate-400">/</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      Content Editor ({currentModule.name || currentModule.title})
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeLevel === "main_modules" && "Practice Main Modules"}
                {activeLevel === "submodules" && `Submodules: ${currentMainModule?.name || currentMainModule?.title}`}
                {activeLevel === "modules" && `Modules: ${currentSubmodule?.name || currentSubmodule?.title}`}
                {activeLevel === "module_editor" && `Questions Editor: ${currentModule?.name || currentModule?.title}`}
              </h1>
            </div>

            {/* Top Level Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {activeLevel === "main_modules" && (
                <Button
                  type="button"
                  onClick={handleOpenAddMainModule}
                  className="h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                >
                  + Add Main Module
                </Button>
              )}

              {activeLevel === "submodules" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedMainModuleId(null);
                      setActiveLevel("main_modules");
                    }}
                    className="h-9 px-3.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
                  >
                    Back to Main Modules
                  </Button>
                  <Button
                    type="button"
                    onClick={handleOpenAddSubmodule}
                    className="h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                  >
                    + Add Submodule
                  </Button>
                </>
              )}

              {activeLevel === "modules" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedSubmoduleId(null);
                      setActiveLevel("submodules");
                    }}
                    className="h-9 px-3.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
                  >
                    Back to Submodules
                  </Button>
                  <Button
                    type="button"
                    onClick={handleOpenAddModule}
                    className="h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                  >
                    + Add Module
                  </Button>
                </>
              )}

              {activeLevel === "module_editor" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveLevel("modules")}
                    className="h-9 px-3.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
                  >
                    Back to Modules
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveModuleQuestions}
                    className="h-9 px-4 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                  >
                    Save Questions &amp; Exit
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── LEVEL 1: MAIN MODULES VIEW ─────────────────────────────────── */}
      {activeLevel === "main_modules" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <Input
              placeholder="Search Main Modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md h-9 text-xs bg-white dark:bg-[#18181B] border-slate-200 dark:border-zinc-800 rounded-lg"
            />
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Total Main Modules: {filteredTracks.length}
            </span>
          </div>

          {/* Empty State: Main Modules */}
          {filteredTracks.length === 0 ? (
            <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-10 text-center rounded-xl shadow-2xs">
              <div className="max-w-md mx-auto space-y-3">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                  LEVEL 1: MAIN MODULE
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No practice modules available.
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Start by adding your first Main Module to build the practice curriculum.
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleOpenAddMainModule}
                    className="h-9 px-5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                  >
                    Add Main Module
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTracks.map((m) => {
                const subCount = m.submodules?.length || 0;
                const totalModCount = (m.submodules || []).reduce(
                  (acc, s) => acc + (s.modules?.length || 0),
                  0
                );
                const isActive = m.status === "active";

                return (
                  <Card
                    key={m.id}
                    className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4.5 shadow-2xs hover:border-blue-400/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40">
                          LEVEL 1: MAIN MODULE
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                          {m.name || m.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1 min-h-[32px]">
                          {m.description || "No description provided."}
                        </p>
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-zinc-200">{subCount}</span> Submodules
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-zinc-200">{totalModCount}</span> Modules
                        </div>
                        <div>
                          Order: <span className="font-semibold">{m.display_order ?? 0}</span>
                        </div>
                        <div>
                          Batch:{" "}
                          <span className="font-semibold">
                            {m.isCommon ? "All Batches" : `${m.assignedBatches?.length || 0} Assigned`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedMainModuleId(m.id);
                          setActiveLevel("submodules");
                        }}
                        className="w-full h-8 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                      >
                        View Submodules ({subCount})
                      </Button>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditMainModule(m, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleMainModuleStatus(m, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMainModule(m, e)}
                          className="h-7 rounded border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── LEVEL 2: SUBMODULES VIEW ───────────────────────────────────── */}
      {activeLevel === "submodules" && currentMainModule && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs">
            <div>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">Parent Main Module:</span>{" "}
              <strong className="text-slate-900 dark:text-white font-bold">
                {currentMainModule.name || currentMainModule.title}
              </strong>
            </div>
            <span className="text-slate-500 dark:text-zinc-400 font-medium">
              Submodules Count: {currentMainModule.submodules.length}
            </span>
          </div>

          {/* Empty State: Submodules */}
          {currentMainModule.submodules.length === 0 ? (
            <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-10 text-center rounded-xl shadow-2xs">
              <div className="max-w-md mx-auto space-y-3">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                  LEVEL 2: SUBMODULE
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No submodules available.
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Inside this Main Module, create your first Submodule to organize topics.
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleOpenAddSubmodule}
                    className="h-9 px-5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                  >
                    Add Submodule
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentMainModule.submodules.map((sm) => {
                const modCount = sm.modules?.length || 0;
                const isActive = sm.status === "active";

                return (
                  <Card
                    key={sm.id}
                    className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4.5 shadow-2xs hover:border-blue-400/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/40">
                          LEVEL 2: SUBMODULE
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                          {sm.name || sm.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1 min-h-[32px]">
                          {sm.description || "No description provided."}
                        </p>
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400">
                        <div>
                          Modules: <span className="font-bold text-slate-900 dark:text-zinc-200">{modCount}</span>
                        </div>
                        <div>
                          Order: <span className="font-bold text-slate-900 dark:text-zinc-200">{sm.display_order ?? 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedSubmoduleId(sm.id);
                          setActiveLevel("modules");
                        }}
                        className="w-full h-8 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                      >
                        View Modules ({modCount})
                      </Button>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditSubmodule(sm, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSubmoduleStatus(sm, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSubmodule(sm, e)}
                          className="h-7 rounded border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── LEVEL 3: MODULES VIEW ──────────────────────────────────────── */}
      {activeLevel === "modules" && currentMainModule && currentSubmodule && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs">
            <div className="space-x-2">
              <span className="text-slate-500">Main Module:</span>
              <strong className="text-slate-900 dark:text-white font-bold">
                {currentMainModule.name || currentMainModule.title}
              </strong>
              <span className="text-slate-400">&gt;</span>
              <span className="text-slate-500">Submodule:</span>
              <strong className="text-slate-900 dark:text-white font-bold">
                {currentSubmodule.name || currentSubmodule.title}
              </strong>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">
                Modules Count: {currentSubmodule.modules.length}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hidden md:inline">
                Click &quot;+ Add / Manage Questions&quot; on any module below
              </span>
            </div>
          </div>

          {/* Empty State: Modules */}
          {currentSubmodule.modules.length === 0 ? (
            <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-10 text-center rounded-xl shadow-2xs">
              <div className="max-w-md mx-auto space-y-3">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                  LEVEL 3: MODULE
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No modules available.
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Inside this Submodule, create Modules containing MCQs or Coding Challenges.
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleOpenAddModule}
                    className="h-9 px-5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                  >
                    Add Module
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentSubmodule.modules.map((mod) => {
                const isActive = mod.status === "active";
                const qCount = (mod.mcqQuestions?.length || 0) + (mod.codingQuestions?.length || 0);

                return (
                  <Card
                    key={mod.id}
                    className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4.5 shadow-2xs hover:border-blue-400/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/40">
                          LEVEL 3: MODULE
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                          {mod.name || mod.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1 min-h-[32px]">
                          {mod.description || "Interactive practice module."}
                        </p>
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                        <div>
                          Type: <span className="font-bold uppercase text-slate-900 dark:text-zinc-200">{mod.type}</span>
                        </div>
                        <div>
                          Questions: <span className="font-bold text-slate-900 dark:text-zinc-200">{qCount}</span>
                        </div>
                        <div>
                          Duration: <span className="font-bold">{mod.durationMinutes > 0 ? `${mod.durationMinutes}m` : "Untimed"}</span>
                        </div>
                        <div>
                          Total Marks: <span className="font-bold">{mod.totalMarks}</span>
                        </div>
                      </div>
                      {/* Display Section Names */}
                      {(mod.mcqSectionTitle || mod.codingSectionTitle) && (
                        <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-800/60 flex items-center gap-1.5 flex-wrap text-[10px]">
                          {mod.type !== "coding" && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 truncate max-w-[140px]" title={mod.mcqSectionTitle || "Section 1: MCQs"}>
                              {mod.mcqSectionTitle || "Section 1: MCQs"}
                            </span>
                          )}
                          {mod.type !== "mcq" && (
                            <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 truncate max-w-[140px]" title={mod.codingSectionTitle || "Section 2: Coding"}>
                              {mod.codingSectionTitle || "Section 2: Coding"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          onClick={() => handleOpenViewQuestions(mod)}
                          variant="outline"
                          className="h-8 text-xs font-semibold rounded-lg border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Questions ({qCount})</span>
                        </Button>

                        <Button
                          type="button"
                          onClick={() => handleOpenModuleEditor(mod)}
                          className="h-8 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Questions</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModule(mod, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleModuleStatus(mod, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteModule(mod, e)}
                          className="h-7 rounded border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── LEVEL 3: MODULE QUESTIONS EDITOR ───────────────────────────── */}
      {activeLevel === "module_editor" && currentModule && (
        <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {currentModule.name || currentModule.title} · Questions
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {currentModule.type === "coding"
                  ? "Interactive algorithm challenges, starter code, and test cases."
                  : currentModule.type === "mcq"
                  ? "Multiple choice questions, answer options, marks, and explanations."
                  : "Multiple choice questions and interactive coding challenges."}
              </p>
            </div>

            {/* Tab switch / Type indicator */}
            {currentModule.type === "mixed" ? (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab("mcq")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    activeTab === "mcq"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-2xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                  }`}
                >
                  MCQs ({mcqList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("coding")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    activeTab === "coding"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-2xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                  }`}
                >
                  Coding Problems ({codingList.length})
                </button>
              </div>
            ) : currentModule.type === "coding" ? (
              <div className="px-3.5 py-1.5 text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 shadow-2xs">
                Coding Problems ({codingList.length})
              </div>
            ) : (
              <div className="px-3.5 py-1.5 text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 shadow-2xs">
                MCQ Questions ({mcqList.length})
              </div>
            )}
          </div>

          {/* MCQ TAB CONTENT: only if type is mcq or mixed */}
          {(currentModule.type === "mcq" || (currentModule.type === "mixed" && activeTab === "mcq")) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {currentModule.mcqSectionTitle || "Section 1: MCQs"}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Multiple Choice Questions ({mcqList.length})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Type question statement, enter options, select radio for correct answer, and set marks.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBulkUploadModuleType("assessment_questions");
                      setIsBulkUploadOpen(true);
                    }}
                    className="h-8.5 px-3.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    Bulk Upload
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const newQ: MCQQuestion = {
                        id: `mcq_${Date.now()}`,
                        questionText: "",
                        marks: 10,
                        allowMultiple: false,
                        options: [
                          { id: `opt_${Date.now()}_1`, text: "", isCorrect: true },
                          { id: `opt_${Date.now()}_2`, text: "", isCorrect: false },
                          { id: `opt_${Date.now()}_3`, text: "", isCorrect: false },
                          { id: `opt_${Date.now()}_4`, text: "", isCorrect: false },
                        ],
                      };
                      setMcqList([...mcqList, newQ]);
                    }}
                    className="h-8.5 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                  >
                    + Add MCQ Question
                  </Button>
                </div>
              </div>

              {mcqList.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-6 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    No MCQ questions added to this module yet.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setBulkUploadModuleType("assessment_questions");
                        setIsBulkUploadOpen(true);
                      }}
                      className="h-8.5 px-4 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
                    >
                      Bulk Upload
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const newQ: MCQQuestion = {
                          id: `mcq_${Date.now()}`,
                          questionText: "",
                          marks: 10,
                          allowMultiple: false,
                          options: [
                            { id: `opt_${Date.now()}_1`, text: "", isCorrect: true },
                            { id: `opt_${Date.now()}_2`, text: "", isCorrect: false },
                            { id: `opt_${Date.now()}_3`, text: "", isCorrect: false },
                            { id: `opt_${Date.now()}_4`, text: "", isCorrect: false },
                          ],
                        };
                        setMcqList([...mcqList, newQ]);
                      }}
                      className="h-8.5 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                    >
                      + Add First MCQ Question
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {mcqList.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="p-4.5 bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          Question #{qIdx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          {/* Extra Option for Multiple Answer Question */}
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 font-semibold cursor-pointer select-none bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-2.5 py-1 rounded-lg">
                            <input
                              type="checkbox"
                              checked={Boolean(q.allowMultiple)}
                              onChange={(e) => {
                                const isMultiple = e.target.checked;
                                setMcqList(
                                  mcqList.map((item) => {
                                    if (item.id !== q.id) return item;
                                    return {
                                      ...item,
                                      allowMultiple: isMultiple,
                                      options: isMultiple
                                        ? item.options
                                        : (() => {
                                            let hasCorrect = false;
                                            return item.options.map((o) => {
                                              if (o.isCorrect && !hasCorrect) {
                                                hasCorrect = true;
                                                return o;
                                              }
                                              return { ...o, isCorrect: false };
                                            });
                                          })(),
                                    };
                                  })
                                );
                              }}
                              className="w-3.5 h-3.5 rounded cursor-pointer accent-purple-600"
                            />
                            <span>Multiple Answers</span>
                          </label>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400">
                            <span className="font-semibold">Marks:</span>
                            <Input
                              type="number"
                              min={1}
                              value={q.marks ?? 10}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setMcqList(mcqList.map((item) => item.id === q.id ? { ...item, marks: val } : item));
                              }}
                              className="h-7 w-16 text-xs bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ type: "question", questionType: "mcq", index: qIdx, title: `Question #${qIdx + 1}` })}
                            className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
                          >
                            Delete Question
                          </button>
                        </div>
                      </div>

                      <Textarea
                        placeholder="Enter question statement here..."
                        value={q.questionText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMcqList(
                            mcqList.map((item) => (item.id === q.id ? { ...item, questionText: val } : item))
                          );
                        }}
                        className="text-xs bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                        rows={2}
                      />

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                            {q.allowMultiple
                              ? "Answer Choices (Select checkboxes for all correct answers):"
                              : "Answer Choices (Select radio button for the correct answer):"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newOptId = `opt_${Date.now()}_${q.options.length + 1}`;
                              setMcqList(
                                mcqList.map((item) => {
                                  if (item.id !== q.id) return item;
                                  return {
                                    ...item,
                                    options: [...item.options, { id: newOptId, text: "", isCorrect: false }],
                                  };
                                })
                              );
                            }}
                            className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            + Add Option
                          </button>
                        </div>

                        {q.options.map((opt, optIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            {q.allowMultiple ? (
                              <input
                                type="checkbox"
                                checked={opt.isCorrect}
                                onChange={() => {
                                  setMcqList(
                                    mcqList.map((item) => {
                                      if (item.id !== q.id) return item;
                                      return {
                                        ...item,
                                        options: item.options.map((o) =>
                                          o.id === opt.id ? { ...o, isCorrect: !o.isCorrect } : o
                                        ),
                                      };
                                    })
                                  );
                                }}
                                className="w-4 h-4 cursor-pointer accent-purple-600 rounded"
                                title="Toggle correct answer"
                              />
                            ) : (
                              <input
                                type="radio"
                                name={`correct_${q.id}`}
                                checked={opt.isCorrect}
                                onChange={() => {
                                  setMcqList(
                                    mcqList.map((item) => {
                                      if (item.id !== q.id) return item;
                                      return {
                                        ...item,
                                        options: item.options.map((o) => ({
                                          ...o,
                                          isCorrect: o.id === opt.id,
                                        })),
                                      };
                                    })
                                  );
                                }}
                                className="w-4 h-4 cursor-pointer accent-purple-600"
                                title="Mark as correct answer"
                              />
                            )}
                            <Input
                              placeholder={`Option ${optIdx + 1}`}
                              value={opt.text}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMcqList(
                                  mcqList.map((item) => {
                                    if (item.id !== q.id) return item;
                                    return {
                                      ...item,
                                      options: item.options.map((o) => (o.id === opt.id ? { ...o, text: val } : o)),
                                    };
                                  })
                                );
                              }}
                              className="h-8 text-xs bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 flex-1"
                            />
                            {opt.isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                                Correct Answer
                              </span>
                            )}
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMcqList(
                                    mcqList.map((item) => {
                                      if (item.id !== q.id) return item;
                                      return {
                                        ...item,
                                        options: item.options.filter((o) => o.id !== opt.id),
                                      };
                                    })
                                  );
                                }}
                                className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                                title="Remove this option"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500">
                          Explanation (Optional, shown to student after submitting):
                        </label>
                        <Input
                          placeholder="e.g. In Java, Strings are immutable..."
                          value={q.explanation || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMcqList(mcqList.map((item) => item.id === q.id ? { ...item, explanation: val } : item));
                          }}
                          className="h-7 text-xs bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      onClick={() => handleSaveAndAddNextMCQ(mcqList)}
                      className="h-8 px-4 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                    >
                      Save &amp; Add Next Question
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const newQ: MCQQuestion = {
                          id: `mcq_${Date.now()}`,
                          questionText: "",
                          marks: 10,
                          options: [
                            { id: `opt_${Date.now()}_1`, text: "", isCorrect: true },
                            { id: `opt_${Date.now()}_2`, text: "", isCorrect: false },
                            { id: `opt_${Date.now()}_3`, text: "", isCorrect: false },
                            { id: `opt_${Date.now()}_4`, text: "", isCorrect: false },
                          ],
                        };
                        setMcqList([...mcqList, newQ]);
                      }}
                      variant="outline"
                      className="h-8 px-4 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      + Add Another MCQ Question
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CODING TAB CONTENT: only if type is coding or mixed */}
          {(currentModule.type === "coding" || (currentModule.type === "mixed" && activeTab === "coding")) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Coding Problems ({codingList.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Interactive algorithm challenges, starter code, and test cases.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBulkUploadModuleType("coding_problem");
                      setIsBulkUploadOpen(true);
                    }}
                    className="h-8.5 px-3.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    Bulk Upload
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (showCodingCreator && editingCodingIndex === null) {
                        setShowCodingCreator(false);
                      } else {
                        setEditingCodingIndex(null);
                        setShowCodingCreator(true);
                      }
                    }}
                    className="h-8.5 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                  >
                    {showCodingCreator && editingCodingIndex === null ? "Close Creator Form" : "+ Create Coding Problem"}
                  </Button>
                </div>
              </div>

              {/* Creator Form (when opened) */}
              {showCodingCreator && (
                <div className="pt-1">
                  <CodingProblemCreator
                    initialProblem={editingCodingIndex !== null ? codingList[editingCodingIndex] : undefined}
                    initialProblemNumber={editingCodingIndex !== null ? (codingList[editingCodingIndex]?.problem_number || editingCodingIndex + 1) : codingList.length + 1}
                    scope="practice"
                    onCancel={() => {
                      setShowCodingCreator(false);
                      setEditingCodingIndex(null);
                    }}
                    onSave={async (newProb: any) => {
                      const assignedProblemNum = editingCodingIndex !== null
                        ? (newProb?.problem_number || codingList[editingCodingIndex]?.problem_number || editingCodingIndex + 1)
                        : (newProb?.problem_number || codingList.length + 1);

                      const activeMod = currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
                      const modId = activeMod?.id || selectedModuleId || "";

                      const problemToSave = {
                        ...newProb,
                        problem_number: assignedProblemNum,
                        scope: "practice",
                        assessment_id: modId,
                        module_id: modId,
                      };
                      let updatedList: any[];
                      if (editingCodingIndex !== null) {
                        updatedList = codingList.map((item, i) => (i === editingCodingIndex ? problemToSave : item));
                        toast({ title: "Coding Problem Updated", description: `Updated: ${newProb?.title || "Problem"}` });
                      } else {
                        updatedList = [...codingList, problemToSave];
                        toast({ title: "Coding Problem Added", description: `Added: ${newProb?.title || "New Problem"}` });
                      }
                      setCodingList(updatedList);
                      setShowCodingCreator(false);
                      setEditingCodingIndex(null);

                      if (activeMod) {
                        const resolvedHierarchy = resolveHierarchyForModule(activeMod.id);
                        const parentMainId = activeMod.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
                        const parentSubId = activeMod.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;

                        if (parentMainId && parentSubId) {
                          try {
                            await fetch("/api/admin/practices", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "update_module",
                                main_module_id: parentMainId,
                                submodule_id: parentSubId,
                                id: activeMod.id,
                                name: activeMod.name || activeMod.title,
                                mcqQuestions: mcqList,
                                codingQuestions: updatedList,
                              }),
                            });
                            await fetchData();
                          } catch (err: any) {
                            console.error("Auto-save coding problem error:", err);
                          }
                        }
                      }
                    }}
                    onSaveAndNext={async (newProb: any) => {
                      const assignedProblemNum = editingCodingIndex !== null
                        ? (newProb?.problem_number || codingList[editingCodingIndex]?.problem_number || editingCodingIndex + 1)
                        : (newProb?.problem_number || codingList.length + 1);

                      const activeMod = currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
                      const modId = activeMod?.id || selectedModuleId || "";

                      const problemToSave = {
                        ...newProb,
                        problem_number: assignedProblemNum,
                        assessment_id: modId,
                        module_id: modId,
                      };
                      const updatedList = editingCodingIndex !== null
                        ? codingList.map((item, i) => (i === editingCodingIndex ? problemToSave : item))
                        : [...codingList, problemToSave];

                      setCodingList(updatedList);
                      setEditingCodingIndex(null);

                      if (activeMod) {
                        const resolvedHierarchy = resolveHierarchyForModule(activeMod.id);
                        const parentMainId = activeMod.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
                        const parentSubId = activeMod.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;

                        if (parentMainId && parentSubId) {
                          try {
                            await fetch("/api/admin/practices", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "update_module",
                                main_module_id: parentMainId,
                                submodule_id: parentSubId,
                                id: activeMod.id,
                                name: activeMod.name || activeMod.title,
                                mcqQuestions: mcqList,
                                codingQuestions: updatedList,
                              }),
                            });
                            await fetchData();
                            toast({ title: "Saved & Ready for Next", description: `Problem #${assignedProblemNum} saved. Create the next one!` });
                          } catch (err: any) {
                            console.error("Save & Next coding error:", err);
                            toast({ title: "Save Error", description: err.message, variant: "destructive" });
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}

              {/* Configured Coding Problems List */}
              {codingList.length === 0 && !showCodingCreator ? (
                <div className="text-center py-10 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-6 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    No coding problems configured for this module yet.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setBulkUploadModuleType("coding_problem");
                        setIsBulkUploadOpen(true);
                      }}
                      className="h-8.5 px-4 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
                    >
                      Bulk Upload
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowCodingCreator(true)}
                      className="h-8.5 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                    >
                      + Create New Coding Problem
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">
                    Configured Coding Problems ({codingList.length})
                  </h4>
                  <div className="space-y-2">
                    {codingList.map((cp, idx) => {
                      const tcCount = (cp.test_cases?.length || 0) + (cp.sample_test_cases?.length || 0) + (cp.hidden_test_cases?.length || 0);
                      const diff = (cp.difficulty || "medium").toLowerCase();

                      return (
                        <div
                          key={cp.id || idx}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-400">#{cp.problem_number || idx + 1}.</span>
                              <strong className="text-slate-900 dark:text-white font-bold">{cp.title}</strong>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  diff === "easy"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : diff === "hard"
                                    ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                }`}
                              >
                                {cp.difficulty || "Medium"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-3">
                              <span>Points: <strong>{cp.points || 100}</strong></span>
                              <span>Time Limit: <strong>{cp.time_limit_ms || 2000}ms</strong></span>
                              {tcCount > 0 && <span>Test Cases: <strong>{tcCount}</strong></span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCodingIndex(idx);
                                setShowCodingCreator(true);
                              }}
                              className="h-7 px-3.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold cursor-pointer text-xs transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: "question", questionType: "coding", index: idx, title: cp.title || `Coding Problem #${idx + 1}` })}
                              className="h-7 px-3.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold cursor-pointer text-xs transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Footer for Questions Editor */}
          <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveLevel("modules")}
              className="h-9 px-4 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Back to Modules
            </Button>
            <Button
              type="button"
              onClick={handleSaveModuleQuestions}
              className="h-9 px-5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
            >
              Save Questions &amp; Exit
            </Button>
          </div>
        </Card>
      )}

      {/* ─── MODAL 1: CREATE / EDIT MAIN MODULE ─────────────────────────── */}
      {mounted && typeof document !== "undefined" && showMainModuleModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 cursor-pointer" onClick={() => setShowMainModuleModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[88vh] bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">

            {/* ── Header bar ── */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-white dark:bg-[#18181B] border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-[#2563EB] shrink-0 shadow-xs">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                      Level 1 · Main Module
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {editingMainModule ? "Edit Main Module" : "New Main Module"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Configure track metadata, status, and batch access rules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMainModuleModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Scrollable content: 2-Column MNC Layout ── */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-zinc-950/40">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* ══ LEFT COLUMN: SECTION 1 ══ */}
                <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">Section 1</p>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mt-0.5">Basic Information</h3>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Name, description and display ordering.</p>
                    </div>

                    <div className="space-y-3.5 mt-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Module Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Java Programming, System Design, Algorithms..."
                          value={fMainName}
                          onChange={(e) => setFMainName(e.target.value)}
                          className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Description</label>
                        <Textarea
                          placeholder="Short description of this module..."
                          value={fMainDesc}
                          onChange={(e) => setFMainDesc(e.target.value)}
                          className="text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Status</label>
                          <MncSelect
                            value={fMainStatus}
                            onChange={(v: any) => setFMainStatus(v)}
                            variant="blue"
                            options={[
                              {
                                value: "active",
                                label: "Active",
                                dotColor: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
                              },
                              {
                                value: "inactive",
                                label: "Inactive",
                                dotColor: "bg-slate-400",
                              },
                            ]}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Display Order</label>
                          <Input
                            type="number"
                            value={fMainOrder}
                            onChange={(e) => setFMainOrder(parseInt(e.target.value) || 0)}
                            className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ══ RIGHT COLUMN: SECTION 2 ══ */}
                <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl p-5 space-y-4 flex flex-col">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">Section 2</p>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mt-0.5">Batch Assignment</h3>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Choose who can access this module.</p>
                    </div>
                    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700 shrink-0 ml-4">
                      <button
                        type="button"
                        onClick={() => setFMainIsCommon(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${fMainIsCommon ? "bg-[#2563EB] text-white shadow-xs" : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"}`}
                      >
                        Common
                      </button>
                      <button
                        type="button"
                        onClick={() => setFMainIsCommon(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!fMainIsCommon ? "bg-[#2563EB] text-white shadow-xs" : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"}`}
                      >
                        Batch Wise
                        {!fMainIsCommon && fMainBatches.length > 0 && (
                          <span className="ml-1 bg-white/25 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{fMainBatches.length}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {fMainIsCommon ? (
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-start gap-3.5 p-4.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300">
                        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[13px]">Universal Batch Access Active</p>
                          <p className="text-[11px] text-blue-600 dark:text-blue-400/90 mt-1 leading-relaxed">
                            This module will be automatically visible to <strong>all student batches</strong> across the institution. No individual batch assignment is required.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <Input
                            placeholder="Filter batches..."
                            value={fBatchSearch}
                            onChange={(e) => setFBatchSearch(e.target.value)}
                            className="h-8 pl-8 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button type="button" onClick={() => setFMainBatches(batches.map((b: any) => b.id))} className="text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer">All</button>
                          <span className="text-slate-300 dark:text-zinc-600">|</span>
                          <button type="button" onClick={() => setFMainBatches([])} className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer">Clear</button>
                        </div>
                      </div>

                      {batches.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-500 dark:text-zinc-400">
                          No batches found. Create batches in Batch Management first.
                        </div>
                      ) : (
                        <div className="flex-1 max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                          {batches
                            .filter((b: any) => (b.name || b.batch_name || b.id || "").toLowerCase().includes(fBatchSearch.toLowerCase()))
                            .map((batch: any) => {
                              const isSelected = fMainBatches.includes(batch.id);
                              return (
                                <button
                                  key={batch.id}
                                  type="button"
                                  onClick={() => setFMainBatches((prev) => prev.includes(batch.id) ? prev.filter((id) => id !== batch.id) : [...prev, batch.id])}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${isSelected ? "bg-[#2563EB] text-white border-[#2563EB] font-semibold shadow-xs" : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-[#2563EB]/40 hover:bg-blue-50/40 font-medium"}`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-white text-[#2563EB] border-white" : "border-slate-300 dark:border-zinc-600"}`}>
                                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </div>
                                    <span className="truncate">{batch.name || batch.batch_name || batch.id}</span>
                                  </div>
                                  <span className={`text-[10px] shrink-0 ml-2 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                                    {batch.studentCount != null ? `${batch.studentCount} students` : ""}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {fMainBatches.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 max-h-[50px] overflow-y-auto">
                          {fMainBatches.map((bId) => {
                            const b = batches.find((x: any) => x.id === bId);
                            return (
                              <span key={bId} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {b?.name || bId}
                                <button type="button" onClick={() => setFMainBatches((prev) => prev.filter((id) => id !== bId))} className="hover:text-blue-900 cursor-pointer">×</button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {fMainBatches.length === 0 && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          No batches selected — module will not be visible to students.
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#18181B] border-t border-slate-200/80 dark:border-zinc-800 shrink-0">
              <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium hidden sm:flex items-center gap-1.5">
                {!fMainIsCommon ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span><strong>{fMainBatches.length}</strong> batch{fMainBatches.length === 1 ? "" : "es"} assigned</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Accessible to all student batches</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMainModuleModal(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveMainModule}
                  className="h-9 px-5 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer shadow-sm transition-all"
                >
                  {editingMainModule ? "Save Changes" : "Create Main Module"}
                </Button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL 2: CREATE / EDIT SUBMODULE ────────────────────────────── */}
      {mounted && typeof document !== "undefined" && showSubmoduleModal && currentMainModule && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 cursor-pointer" onClick={() => setShowSubmoduleModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 z-10 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                    Level 2 · Submodule
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {editingSubmodule ? "Edit Submodule" : "Add Submodule"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Parent: {currentMainModule.name || currentMainModule.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmoduleModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">
                  Submodule Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Basics, Data Structures, OOP..."
                  value={fSubName}
                  onChange={(e) => setFSubName(e.target.value)}
                  className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">Description</label>
                <Textarea
                  placeholder="Short description of this Submodule..."
                  value={fSubDesc}
                  onChange={(e) => setFSubDesc(e.target.value)}
                  className="text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Status</label>
                  <MncSelect
                    value={fSubStatus}
                    onChange={(v: any) => setFSubStatus(v)}
                    variant="purple"
                    options={[
                      {
                        value: "active",
                        label: "Active",
                        dotColor: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
                      },
                      {
                        value: "inactive",
                        label: "Inactive",
                        dotColor: "bg-slate-400",
                      },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Display Order</label>
                  <Input
                    type="number"
                    value={fSubOrder}
                    onChange={(e) => setFSubOrder(parseInt(e.target.value) || 0)}
                    className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSubmoduleModal(false)}
                className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveSubmodule}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm transition-all"
              >
                {editingSubmodule ? "Save Changes" : "Create Submodule"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL 3: CREATE / EDIT MODULE ──────────────────────────────── */}
      {mounted && typeof document !== "undefined" && showModuleModal && currentMainModule && currentSubmodule && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 cursor-pointer" onClick={() => setShowModuleModal(false)} />
          <div className="relative w-full max-w-xl max-h-[88vh] bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between px-6 py-4.5 bg-white dark:bg-[#18181B] border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-center text-purple-600 shrink-0 shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                    Level 3 · Practice Module
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {editingModule ? "Edit Module" : "Add Module"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Submodule: {currentSubmodule.name || currentSubmodule.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModuleModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs bg-slate-50/50 dark:bg-zinc-950/40">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">
                  Module Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Variables & Data Types, Binary Search..."
                  value={fModName}
                  onChange={(e) => setFModName(e.target.value)}
                  className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-purple-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">Description</label>
                <Textarea
                  placeholder="Short description of this Module..."
                  value={fModDesc}
                  onChange={(e) => setFModDesc(e.target.value)}
                  className="text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-purple-500/20"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Type</label>
                  <MncSelect
                    value={fModType}
                    onChange={(v: any) => setFModType(v)}
                    variant="purple"
                    options={[
                      {
                        value: "mixed",
                        label: "Mixed",
                        icon: <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
                      },
                      {
                        value: "coding",
                        label: "Code Only",
                        icon: <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
                      },
                      {
                        value: "mcq",
                        label: "MCQ Only",
                        icon: <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
                      },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700 dark:text-zinc-300">Duration (m)</label>
                    <button
                      type="button"
                      onClick={() => setFModDurationEnabled(!fModDurationEnabled)}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border cursor-pointer transition-colors ${
                        fModDurationEnabled
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                      }`}
                    >
                      {fModDurationEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                  {fModDurationEnabled ? (
                    <Input
                      type="number"
                      value={fModDuration}
                      onChange={(e) => setFModDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-purple-500/20"
                      placeholder="e.g. 60"
                      min={1}
                    />
                  ) : (
                    <div
                      onClick={() => setFModDurationEnabled(true)}
                      className="h-9.5 px-3 flex items-center justify-between bg-slate-100 dark:bg-zinc-800/80 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700 text-[11px] text-slate-500 dark:text-zinc-400 font-semibold cursor-pointer hover:border-purple-400 transition-colors"
                      title="Click to turn duration ON"
                    >
                      <span>No Time Limit</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">OFF</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Total Marks</label>
                  <Input
                    type="number"
                    value={fModMarks}
                    onChange={(e) => setFModMarks(parseInt(e.target.value) || 100)}
                    className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Status</label>
                  <MncSelect
                    value={fModStatus}
                    onChange={(v: any) => setFModStatus(v)}
                    variant="purple"
                    options={[
                      {
                        value: "active",
                        label: "Active",
                        dotColor: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
                      },
                      {
                        value: "inactive",
                        label: "Inactive",
                        dotColor: "bg-slate-400",
                      },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Display Order</label>
                  <Input
                    type="number"
                    value={fModOrder}
                    onChange={(e) => setFModOrder(parseInt(e.target.value) || 0)}
                    className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-purple-500/20"
                  />
                </div>
              </div>

              {/* Assessment & Attempt Policy (Source of Truth) */}
              <div className="p-4 bg-slate-100/70 dark:bg-zinc-900/80 rounded-xl border border-slate-200/90 dark:border-zinc-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Assessment &amp; Attempt Policy
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Single Source of Truth
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Defines attempt limits, reattempt permissions, review access, and completion criteria for all students.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">
                      Allowed Attempts <span className="text-slate-400 font-normal">(Max Attempts)</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={fModAllowedAttempts}
                      onChange={(e) => setFModAllowedAttempts(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-9 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg"
                      placeholder="e.g. 3"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">
                      Passing Marks
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={fModPassingMarks}
                      onChange={(e) => setFModPassingMarks(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-9 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg"
                      placeholder="e.g. 40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">
                      Reattempt
                    </label>
                    <div className="flex rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5">
                      <button
                        type="button"
                        onClick={() => setFModReattemptEnabled(true)}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                          fModReattemptEnabled
                            ? "bg-purple-600 text-white"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                        }`}
                      >
                        Enabled
                      </button>
                      <button
                        type="button"
                        onClick={() => setFModReattemptEnabled(false)}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                          !fModReattemptEnabled
                            ? "bg-slate-700 text-white dark:bg-zinc-700"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                        }`}
                      >
                        Disabled
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">
                      Review Answers
                    </label>
                    <div className="flex rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5">
                      <button
                        type="button"
                        onClick={() => setFModReviewEnabled(true)}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                          fModReviewEnabled
                            ? "bg-purple-600 text-white"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                        }`}
                      >
                        Enabled
                      </button>
                      <button
                        type="button"
                        onClick={() => setFModReviewEnabled(false)}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                          !fModReviewEnabled
                            ? "bg-slate-700 text-white dark:bg-zinc-700"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                        }`}
                      >
                        Disabled
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">
                      Completion Rule
                    </label>
                    <MncSelect
                      value={fModCompletionRule}
                      onChange={(v: any) => setFModCompletionRule(v)}
                      variant="purple"
                      options={[
                        { value: "submit", label: "Submit Attempt" },
                        { value: "pass", label: "Passing Marks" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Custom Section Titles Configuration */}
              <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-200/60 dark:border-purple-800/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Section Configuration (Custom Section Names)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Set custom names for the sections in this module (e.g. &quot;Core Java MCQs&quot;, &quot;Algorithmic Challenges&quot;).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(fModType === "mixed" || fModType === "mcq") && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                        MCQ Section Name
                      </label>
                      <Input
                        placeholder="e.g. Section 1: MCQs"
                        value={fModMcqSectionTitle}
                        onChange={(e) => setFModMcqSectionTitle(e.target.value)}
                        className="h-9 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg"
                      />
                    </div>
                  )}
                  {(fModType === "mixed" || fModType === "coding") && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                        Coding Section Name
                      </label>
                      <Input
                        placeholder="e.g. Section 2: Coding"
                        value={fModCodingSectionTitle}
                        onChange={(e) => setFModCodingSectionTitle(e.target.value)}
                        className="h-9 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white dark:bg-[#18181B] border-t border-slate-200/80 dark:border-zinc-800 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModuleModal(false)}
                className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveModule}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-sm transition-all"
              >
                {editingModule ? "Save Changes" : "Create Module"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL 4: VIEW QUESTIONS (WITH DIRECT EDIT & DELETE) ─────────── */}
      {mounted && typeof document !== "undefined" && viewingQuestionsModule && currentMainModule && currentSubmodule && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 cursor-pointer" onClick={() => setViewingQuestionsModule(null)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-white dark:bg-[#18181B] border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                      Level 3 · Questions List
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      Total: {(viewingQuestionsModule.mcqQuestions?.length || 0) + (viewingQuestionsModule.codingQuestions?.length || 0)} questions
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {viewingQuestionsModule.name || viewingQuestionsModule.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingQuestionsModule(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Quick Actions */}
            <div className="px-6 py-3 bg-slate-50/80 dark:bg-zinc-900/70 border-b border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setViewQuestionsFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewQuestionsFilter === "all"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:text-slate-900"
                  }`}
                >
                  All Questions ({(viewingQuestionsModule.mcqQuestions?.length || 0) + (viewingQuestionsModule.codingQuestions?.length || 0)})
                </button>
                {(viewingQuestionsModule.type === "mixed" || viewingQuestionsModule.type === "mcq") && (
                  <button
                    type="button"
                    onClick={() => setViewQuestionsFilter("mcq")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewQuestionsFilter === "mcq"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:text-slate-900"
                    }`}
                  >
                    {viewingQuestionsModule.mcqSectionTitle || "Section 1: MCQs"} ({viewingQuestionsModule.mcqQuestions?.length || 0})
                  </button>
                )}
                {(viewingQuestionsModule.type === "mixed" || viewingQuestionsModule.type === "coding") && (
                  <button
                    type="button"
                    onClick={() => setViewQuestionsFilter("coding")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewQuestionsFilter === "coding"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:text-slate-900"
                    }`}
                  >
                    {viewingQuestionsModule.codingSectionTitle || "Section 2: Coding"} ({viewingQuestionsModule.codingQuestions?.length || 0})
                  </button>
                )}
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const m = viewingQuestionsModule;
                  setViewingQuestionsModule(null);
                  handleOpenModuleEditor(m);
                }}
                className="h-8 px-3.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add More Questions</span>
              </Button>
            </div>

            {/* Questions Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* If no questions */}
              {((viewingQuestionsModule.mcqQuestions?.length || 0) === 0 && (viewingQuestionsModule.codingQuestions?.length || 0) === 0) ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-6 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    No questions have been added to this module yet.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      const m = viewingQuestionsModule;
                      setViewingQuestionsModule(null);
                      handleOpenModuleEditor(m);
                    }}
                    className="h-8.5 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    + Add First Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* MCQs Section */}
                  {(viewQuestionsFilter === "all" || viewQuestionsFilter === "mcq") && (viewingQuestionsModule.mcqQuestions || []).length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-zinc-800">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          {viewingQuestionsModule.mcqSectionTitle || "Section 1: MCQs"} ({(viewingQuestionsModule.mcqQuestions || []).length})
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {(viewingQuestionsModule.mcqQuestions || []).map((q, qIdx) => (
                          <div
                            key={q.id || qIdx}
                            className="p-4 bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-300">
                                  Q{qIdx + 1}.
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  MCQ
                                </span>
                                <span className="text-xs text-slate-500 font-semibold">
                                  {q.marks || 10} Marks
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditQuestionFromView(viewingQuestionsModule, "mcq", qIdx)}
                                  className="h-7 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                >
                                  <Edit3 className="w-3 h-3 text-blue-600" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestionFromView(viewingQuestionsModule, "mcq", qIdx, `MCQ Question #${qIdx + 1}`)}
                                  className="h-7 px-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>

                            <p className="text-xs font-medium text-slate-900 dark:text-white leading-relaxed">
                              {q.questionText || "(No question statement provided)"}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                              {q.options?.map((opt, oIdx) => (
                                <div
                                  key={opt.id || oIdx}
                                  className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                                    opt.isCorrect
                                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium"
                                      : "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                                  }`}
                                >
                                  <span className="truncate">{opt.text || `Option ${oIdx + 1}`}</span>
                                  {opt.isCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded shrink-0">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/50 dark:border-zinc-800/50">
                                Explanation: {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coding Problems Section */}
                  {(viewQuestionsFilter === "all" || viewQuestionsFilter === "coding") && (viewingQuestionsModule.codingQuestions || []).length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-zinc-800">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          {viewingQuestionsModule.codingSectionTitle || "Section 2: Coding"} ({(viewingQuestionsModule.codingQuestions || []).length})
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {(viewingQuestionsModule.codingQuestions || []).map((cp, cIdx) => {
                          const tcCount = (cp.test_cases?.length || 0) + (cp.sample_test_cases?.length || 0) + (cp.hidden_test_cases?.length || 0);
                          const diff = (cp.difficulty || "medium").toLowerCase();
                          return (
                            <div
                              key={cp.id || cIdx}
                              className="p-4 bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    #{cp.problem_number || cIdx + 1}.
                                  </span>
                                  <strong className="text-xs font-bold text-slate-900 dark:text-white">
                                    {cp.title || "Untitled Coding Problem"}
                                  </strong>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      diff === "easy"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                        : diff === "hard"
                                        ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                    }`}
                                  >
                                    {cp.difficulty || "Medium"}
                                  </span>
                                  <span className="text-xs text-slate-500 font-semibold">
                                    {cp.points || 100} Points
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditQuestionFromView(viewingQuestionsModule, "coding", cIdx)}
                                    className="h-7 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                  >
                                    <Edit3 className="w-3 h-3 text-purple-600" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuestionFromView(viewingQuestionsModule, "coding", cIdx, cp.title || `Coding Problem #${cIdx + 1}`)}
                                    className="h-7 px-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">
                                {cp.description || "Interactive algorithm challenge with automated test cases."}
                              </p>

                              <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-200/50 dark:border-zinc-800/50">
                                <span>Time Limit: <strong>{cp.time_limit_ms || 2000}ms</strong></span>
                                <span>Memory Limit: <strong>{cp.memory_limit_mb || 256}MB</strong></span>
                                <span>Total Test Cases: <strong>{tcCount}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#18181B] border-t border-slate-200/80 dark:border-zinc-800 shrink-0">
              <Button
                type="button"
                onClick={() => {
                  const m = viewingQuestionsModule;
                  setViewingQuestionsModule(null);
                  handleOpenModuleEditor(m);
                }}
                className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add / Manage Questions</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingQuestionsModule(null)}
                className="h-9 px-5 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MNC-LEVEL ENTERPRISE DELETE CONFIRMATION MODAL ──────────────── */}
      {mounted && typeof document !== "undefined" && deleteTarget && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 cursor-pointer" 
            onClick={() => { if (!isDeleting) setDeleteTarget(null); }} 
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">
            {/* Top Danger Gradient Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

            <div className="p-6 sm:p-7 space-y-5">
              {/* Header with Danger Ring & Level Indicator */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200/70 dark:border-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 shadow-xs ring-4 ring-red-500/10">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                        deleteTarget.type === "main_module"
                          ? "bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60"
                          : deleteTarget.type === "submodule"
                          ? "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60"
                          : deleteTarget.type === "module"
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60"
                          : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60"
                      }`}>
                        {deleteTarget.type === "main_module" && "Level 1 · Main Module"}
                        {deleteTarget.type === "submodule" && "Level 2 · Submodule"}
                        {deleteTarget.type === "module" && "Level 3 · Practice Module"}
                        {deleteTarget.type === "question" && (deleteTarget.questionType === "coding" ? "Coding Problem" : "MCQ Question")}
                      </span>
                      <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-md border border-red-200/50 dark:border-red-900/40">
                        Critical Action
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {deleteTarget.type === "main_module" && "Delete Main Module"}
                      {deleteTarget.type === "submodule" && "Delete Submodule"}
                      {deleteTarget.type === "module" && "Delete Practice Module"}
                      {deleteTarget.type === "question" && `Delete ${deleteTarget.questionType === "coding" ? "Coding Problem" : "MCQ Question"}`}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selected Target Summary Card */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Target Resource
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                    {deleteTarget.type === "main_module" && `${deleteTarget.subCount} Submodule${deleteTarget.subCount === 1 ? "" : "s"}`}
                    {deleteTarget.type === "submodule" && `${deleteTarget.modCount} Module${deleteTarget.modCount === 1 ? "" : "s"}`}
                    {deleteTarget.type === "module" && `${deleteTarget.questionCount} Question${deleteTarget.questionCount === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 shadow-2xs text-slate-700 dark:text-zinc-200 shrink-0">
                    {deleteTarget.type === "main_module" && <FolderPlus className="w-5 h-5 text-[#2563EB]" />}
                    {deleteTarget.type === "submodule" && <Layers className="w-5 h-5 text-purple-600" />}
                    {deleteTarget.type === "module" && <BookOpen className="w-5 h-5 text-emerald-600" />}
                    {deleteTarget.type === "question" && (deleteTarget.questionType === "coding" ? <Code2 className="w-5 h-5 text-indigo-600" /> : <HelpCircle className="w-5 h-5 text-amber-600" />)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {deleteTarget.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {deleteTarget.type === "main_module" && "All child submodules, modules, and practice questions will be removed."}
                      {deleteTarget.type === "submodule" && "All modules and questions grouped in this submodule will be removed."}
                      {deleteTarget.type === "module" && "All MCQs and coding challenges in this module will be permanently removed."}
                      {deleteTarget.type === "question" && "This question will be permanently removed from this practice module."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enterprise Irreversible Warning Alert */}
              <div className="rounded-2xl border border-red-200/70 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/30 p-3.5 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs text-red-900 dark:text-red-200">
                  <p className="font-bold">Irreversible Action Warning</p>
                  <p className="text-[11px] leading-relaxed text-red-800/80 dark:text-red-300/80">
                    {deleteTarget.type === "main_module"
                      ? `Deleting Main Module "${deleteTarget.title}" will permanently cascade and erase all nested submodules, modules, test cases, and student progress records. This action cannot be undone.`
                      : deleteTarget.type === "submodule"
                      ? `Deleting Submodule "${deleteTarget.title}" will permanently remove all child modules and associated questions. This action cannot be reversed.`
                      : deleteTarget.type === "module"
                      ? `Deleting Module "${deleteTarget.title}" will remove all practice questions. Once deleted, this data cannot be recovered.`
                      : `Are you sure you want to delete "${deleteTarget.title}"? Once confirmed, this item cannot be recovered.`}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDelete}
                  className="h-10 px-6 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                  {isDeleting ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── BULK UPLOAD MODAL (FOR CODING CHALLENGES & MCQS) ───────────────── */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        moduleType={bulkUploadModuleType}
        moduleTitle={currentModule?.name ? `${currentModule.name} (${bulkUploadModuleType === "coding_problem" ? "Coding Challenges" : "MCQ Questions"})` : "Practice Module"}
        onImport={handleBulkImport}
      />
    </div>
  );
}
