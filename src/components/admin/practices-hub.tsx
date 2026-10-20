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
import { PageHeader } from "@/components/layouts/page-header";
import { BulkUploadModal } from "@/components/admin/bulk-upload";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { CodingProblemsService } from "@/services/coding-problems.service";
import { cn } from "@/lib/utils";
import {
  calculateEqualWeights,
  calculateQuestionWeightsSum,
  validateModuleMarks,
  getQuestionWeight,
  calculateSubmoduleTotalMarks,
  calculateMainModuleTotalMarks,
} from "@/lib/practice-progress";
import { parseCsv } from "@/lib/excel-security";
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
  ChevronDown,
  ArrowLeft,
  Infinity as InfinityIcon,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText
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
  difficulty?: string;
}

export interface CustomSectionItem {
  id?: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
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
  passingMarksEnabled?: boolean;
  completionRule?: "submit" | "pass";
  mcqSectionTitle?: string;
  codingSectionTitle?: string;
  customSections?: (CustomSectionItem | string)[];
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
  variant = "blue",
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

  const hoverBorder =
    variant === "blue"
      ? "hover:border-blue-400 dark:hover:border-blue-500"
      : variant === "emerald"
      ? "hover:border-emerald-400 dark:hover:border-emerald-500"
      : "hover:border-purple-400 dark:hover:border-purple-500";

  const chevronActiveColor =
    variant === "blue"
      ? "text-blue-600 dark:text-blue-400"
      : variant === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-purple-600 dark:text-purple-400";

  const selectedBg =
    variant === "blue"
      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200"
      : variant === "emerald"
      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
      : "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200";

  const checkColor =
    variant === "blue"
      ? "text-blue-600 dark:text-blue-400"
      : variant === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-purple-600 dark:text-purple-400";

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
          hoverBorder,
          "hover:bg-slate-50 dark:hover:bg-zinc-800/90",
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
            isOpen ? cn("rotate-180", chevronActiveColor) : ""
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
                    ? cn(selectedBg, "font-bold")
                    : "text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon && <div className="shrink-0">{opt.icon}</div>}
                  {opt.dotColor && <span className={cn("w-2 h-2 rounded-full shrink-0", opt.dotColor)} />}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className={cn("w-3.5 h-3.5 shrink-0", checkColor)} />}
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
  const [fModCustomSections, setFModCustomSections] = useState<CustomSectionItem[]>([]);
  const [fModAllowedAttempts, setFModAllowedAttempts] = useState<number>(3);
  const [fModUnlimitedAttempts, setFModUnlimitedAttempts] = useState<boolean>(false);
  const [fModReattemptEnabled, setFModReattemptEnabled] = useState<boolean>(true);
  const [fModReviewEnabled, setFModReviewEnabled] = useState<boolean>(true);
  const [fModPassingMarksEnabled, setFModPassingMarksEnabled] = useState<boolean>(true);
  const [fModPassingMarks, setFModPassingMarks] = useState<number>(40);
  const [fModCompletionRule, setFModCompletionRule] = useState<"submit" | "pass">("submit");

  // Module Questions Editor Inline Passing Marks State
  const [isEditingBannerPassingMarks, setIsEditingBannerPassingMarks] = useState<boolean>(false);
  const [bannerPassingMarksInput, setBannerPassingMarksInput] = useState<string>("");
  const [isSavingBannerPassingMarks, setIsSavingBannerPassingMarks] = useState<boolean>(false);

  // Module Questions Editor State
  const [activeTab, setActiveTab] = useState<"mcq" | "coding">("mcq");
  const [mcqList, setMcqList] = useState<MCQQuestion[]>([]);
  const [codingList, setCodingList] = useState<any[]>([]);
  const [showCodingCreator, setShowCodingCreator] = useState<boolean>(false);
  const [editingCodingIndex, setEditingCodingIndex] = useState<number | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState<boolean>(false);
  const [bulkUploadModuleType, setBulkUploadModuleType] = useState<string>("coding_problem");
  const [targetQuestionUploadModule, setTargetQuestionUploadModule] = useState<PracticeModule | null>(null);

  // ─── MULTI-SELECT CHECKBOX & BULK DELETE STATES ──────────────────
  const [selectedMainModuleIds, setSelectedMainModuleIds] = useState<string[]>([]);
  const [selectedSubmoduleIds, setSelectedSubmoduleIds] = useState<string[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [selectedViewQuestionKeys, setSelectedViewQuestionKeys] = useState<string[]>([]);

  // ─── BULK MODULE CREATION STATE (LEVEL 3) ──────────────────────────
  const [showBulkModuleModal, setShowBulkModuleModal] = useState<boolean>(false);
  const [bulkModuleActiveTab, setBulkModuleActiveTab] = useState<"manual" | "csv">("manual");
  const [bulkModuleStep, setBulkModuleStep] = useState<"edit" | "preview">("edit");
  const [bulkAutoOrder, setBulkAutoOrder] = useState<boolean>(true);
  const [bulkManualRows, setBulkManualRows] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      type: "mixed" | "coding" | "mcq";
      durationEnabled: boolean;
      durationMinutes: number;
      totalMarks: number;
      passingMarks: number;
      status: "active" | "inactive";
      displayOrder: number;
    }>
  >([]);
  const [bulkCsvFile, setBulkCsvFile] = useState<File | null>(null);
  const [bulkCsvRows, setBulkCsvRows] = useState<
    Array<{
      rowNumber: number;
      name: string;
      description: string;
      type: "mixed" | "coding" | "mcq";
      durationMinutes: number;
      totalMarks: number;
      passingMarks: number;
      status: "active" | "inactive";
      displayOrder: number;
      errors: string[];
      isValid: boolean;
    }>
  >([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState<boolean>(false);
  const [bulkErrorMessage, setBulkErrorMessage] = useState<string | null>(null);
  const [bulkCsvFilter, setBulkCsvFilter] = useState<"all" | "valid" | "invalid">("all");
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // MNC-Level Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "main_module"; item: PracticeMainModule; title: string; subCount: number }
    | { type: "submodule"; item: PracticeSubmodule; title: string; modCount: number }
    | { type: "module"; item: PracticeModule; title: string; questionCount: number }
    | { type: "question"; questionType: "coding" | "mcq"; index: number; title: string; targetModule?: PracticeModule }
    | { type: "bulk_main_modules"; count: number; ids: string[] }
    | { type: "bulk_submodules"; count: number; ids: string[]; parentMainId: string }
    | { type: "bulk_modules"; count: number; ids: string[]; parentMainId: string; parentSubId: string }
    | { type: "bulk_questions"; count: number; keys: string[] }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // View Module Questions Modal State
  const [viewingQuestionsModule, setViewingQuestionsModule] = useState<PracticeModule | null>(null);
  const [viewQuestionsFilter, setViewQuestionsFilter] = useState<"all" | "mcq" | "coding">("all");
  const [togglingCodeLabId, setTogglingCodeLabId] = useState<string | null>(null);
  const [collapsedAdminModuleIds, setCollapsedAdminModuleIds] = useState<Set<string>>(new Set());

  const toggleAdminModuleCollapse = (modId: string) => {
    setCollapsedAdminModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) {
        next.delete(modId);
      } else {
        next.add(modId);
      }
      return next;
    });
  };

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
    setFModCustomSections([]);
    setFModAllowedAttempts(3);
    setFModUnlimitedAttempts(false);
    setFModReattemptEnabled(true);
    setFModReviewEnabled(true);
    setFModPassingMarksEnabled(true);
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
    const rawCustom = Array.isArray((m as any).customSections) ? (m as any).customSections : [];
    const normalizedCustom: CustomSectionItem[] = rawCustom.map((cs: any, idx: number) => {
      if (typeof cs === "string") {
        return {
          id: `sec_${idx}_${Date.now()}`,
          title: cs,
          type: "mixed" as const,
        };
      }
      return {
        id: cs.id || `sec_${idx}_${Date.now()}`,
        title: cs.title || cs.name || `Section ${idx + 1}`,
        type: (cs.type === "mcq" || cs.type === "coding" || cs.type === "mixed") ? cs.type : ("mixed" as const),
      };
    });
    setFModCustomSections(normalizedCustom);
    const isUnlimited = m.allowedAttempts === 0;
    setFModUnlimitedAttempts(isUnlimited);
    setFModAllowedAttempts(typeof m.allowedAttempts === "number" ? (isUnlimited ? 0 : m.allowedAttempts) : 3);
    setFModReattemptEnabled(typeof m.reattemptEnabled === "boolean" ? m.reattemptEnabled : true);
    setFModReviewEnabled(typeof m.reviewEnabled === "boolean" ? m.reviewEnabled : true);
    const hasPassing = typeof m.passingMarksEnabled === "boolean"
      ? m.passingMarksEnabled
      : (typeof m.passingMarks === "number" ? m.passingMarks > 0 : true);
    setFModPassingMarksEnabled(hasPassing);
    setFModPassingMarks(typeof m.passingMarks === "number" && m.passingMarks > 0 ? m.passingMarks : 40);
    setFModCompletionRule(m.completionRule || "submit");
    setShowModuleModal(true);
  };

  const handleSaveModule = async () => {
    const trimmedName = fModName.trim();
    if (!trimmedName || !currentMainModule || !currentSubmodule) {
      toast({ title: "Validation Error", description: "Module name is required", variant: "destructive" });
      return;
    }

    const totalMarks = Number(fModMarks) || 100;
    if (totalMarks < 1) {
      toast({ title: "Validation Error", description: "Total Marks must be a positive number of at least 1", variant: "destructive" });
      return;
    }
    const passingMarks = fModPassingMarksEnabled ? Math.max(0, Number(fModPassingMarks) || 0) : 0;
    if (fModPassingMarksEnabled && passingMarks > totalMarks) {
      toast({ title: "Validation Error", description: `Passing Marks (${passingMarks}) cannot exceed Total Marks (${totalMarks})`, variant: "destructive" });
      return;
    }
    const allowedAttempts = fModUnlimitedAttempts ? 0 : Math.max(1, Number(fModAllowedAttempts) || 1);

    if (editingModule && fModStatus === "active") {
      const existingQuestions = [...(editingModule.mcqQuestions || []), ...(editingModule.codingQuestions || [])];
      if (existingQuestions.length > 0) {
        const markVal = validateModuleMarks(totalMarks, existingQuestions, false);
        if (!markVal.isValid) {
          toast({
            title: "Cannot Activate Assessment",
            description: markVal.errorMessage,
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      const isEdit = Boolean(editingModule?.id);
      const action = isEdit ? "update_module" : "create_module";
      const finalDuration = fModDurationEnabled ? (Number(fModDuration) || 60) : 0;
      const hasCoding = fModType === "coding" || fModType === "mixed" || fModCustomSections.some((s) => s.type === "coding" || s.type === "mixed");
      const hasMcq = fModType === "mcq" || fModType === "mixed" || fModCustomSections.some((s) => s.type === "mcq" || s.type === "mixed");
      const resolvedType = (hasCoding && hasMcq) ? "mixed" : hasCoding ? "coding" : "mcq";

      const payload: any = {
        action,
        main_module_id: currentMainModule.id,
        submodule_id: currentSubmodule.id,
        id: editingModule?.id,
        name: trimmedName,
        title: trimmedName,
        description: fModDesc.trim(),
        type: resolvedType,
        durationMinutes: finalDuration,
        totalMarks,
        status: fModStatus,
        display_order: Number(fModOrder) || 0,
        mcqSectionTitle: fModMcqSectionTitle.trim() || "Section 1: MCQs",
        codingSectionTitle: fModCodingSectionTitle.trim() || "Section 2: Coding",
        customSections: fModCustomSections.map((s) => ({
          id: s.id,
          title: s.title.trim() || `Section: ${s.type.toUpperCase()}`,
          type: s.type,
        })),
        allowedAttempts,
        reattemptEnabled: Boolean(fModReattemptEnabled),
        reviewEnabled: Boolean(fModReviewEnabled),
        passingMarks,
        passingMarksEnabled: fModPassingMarksEnabled,
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
    if (newStatus === "active") {
      const allQ = [...(m.mcqQuestions || []), ...(m.codingQuestions || [])];
      if (allQ.length > 0) {
        const markVal = validateModuleMarks(m.totalMarks ?? 100, allQ, false);
        if (!markVal.isValid) {
          toast({
            title: "Cannot Activate Assessment",
            description: markVal.errorMessage,
            variant: "destructive",
          });
          return;
        }
      }
    }

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

  // ─── 3.5. BULK MODULE ACTIONS (LEVEL 3) ───────────────────────────
  const handleOpenBulkAddModules = () => {
    if (!currentMainModule || !currentSubmodule) {
      toast({
        title: "Context Missing",
        description: "Please select a Submodule before adding bulk modules.",
        variant: "destructive",
      });
      return;
    }

    const maxOrder = (currentSubmodule.modules && currentSubmodule.modules.length > 0)
      ? currentSubmodule.modules.reduce((max, m) => Math.max(max, m.display_order ?? 0), 0)
      : 0;

    const initialRows = [
      {
        id: `brow_${Date.now()}_1`,
        name: "",
        description: "",
        type: "mixed" as const,
        durationEnabled: true,
        durationMinutes: 60,
        totalMarks: 100,
        passingMarks: 40,
        status: "active" as const,
        displayOrder: maxOrder + 1,
      },
      {
        id: `brow_${Date.now()}_2`,
        name: "",
        description: "",
        type: "mixed" as const,
        durationEnabled: true,
        durationMinutes: 60,
        totalMarks: 100,
        passingMarks: 40,
        status: "active" as const,
        displayOrder: maxOrder + 2,
      },
      {
        id: `brow_${Date.now()}_3`,
        name: "",
        description: "",
        type: "mixed" as const,
        durationEnabled: true,
        durationMinutes: 60,
        totalMarks: 100,
        passingMarks: 40,
        status: "active" as const,
        displayOrder: maxOrder + 3,
      },
    ];

    setBulkManualRows(initialRows);
    setBulkCsvFile(null);
    setBulkCsvRows([]);
    setBulkAutoOrder(true);
    setBulkModuleActiveTab("manual");
    setBulkModuleStep("edit");
    setBulkErrorMessage(null);
    setBulkCsvFilter("all");
    setShowBulkModuleModal(true);
  };

  const handleBulkAddRow = () => {
    const maxOrder = bulkManualRows.length > 0
      ? Math.max(...bulkManualRows.map((r) => r.displayOrder))
      : (currentSubmodule?.modules?.length || 0);

    setBulkManualRows((prev) => [
      ...prev,
      {
        id: `brow_${Date.now()}_${prev.length + 1}`,
        name: "",
        description: "",
        type: "mixed" as const,
        durationEnabled: true,
        durationMinutes: 60,
        totalMarks: 100,
        passingMarks: 40,
        status: "active" as const,
        displayOrder: maxOrder + 1,
      },
    ]);
  };

  const handleBulkRemoveRow = (rowId: string) => {
    if (bulkManualRows.length <= 1) {
      toast({
        title: "Row Required",
        description: "At least one module row is required.",
        variant: "destructive",
      });
      return;
    }
    setBulkManualRows((prev) => prev.filter((r) => r.id !== rowId));
    if (bulkErrorMessage) setBulkErrorMessage(null);
  };

  const handleBulkRowChange = (rowId: string, field: string, value: any) => {
    setBulkManualRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return { ...r, [field]: value };
      })
    );
    if (bulkErrorMessage) setBulkErrorMessage(null);
  };

  const handleDownloadCsvTemplate = () => {
    const headers = [
      "Module Name",
      "Description",
      "Type",
      "Duration (Minutes)",
      "Total Marks",
      "Passing Marks",
      "Status",
      "Display Order",
    ];

    const sampleRows = [
      ["C Basics", "Learn C syntax, structure, compilation, and basic output", "Mixed", "30", "100", "40", "Active", "1"],
      ["Variables and Data Types", "Learn int, float, char, sizes, and memory allocation", "Coding", "45", "100", "40", "Active", "2"],
      ["Operators and Expressions", "Arithmetic, relational, bitwise, and logical operators", "MCQ", "20", "50", "20", "Active", "3"],
      ["Input and Output", "printf, scanf, format specifiers and escape sequences", "Coding", "30", "100", "40", "Active", "4"],
    ];

    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...sampleRows.map((r) =>
          r
            .map((val) =>
              val.includes(",") || val.includes('"') || val.includes("\n")
                ? `"${val.replace(/"/g, '""')}"`
                : val
            )
            .join(",")
        ),
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const subTitle = (currentSubmodule?.name || currentSubmodule?.title || "submodule")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");
    link.setAttribute("download", `sensilearn_practice_modules_${subTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkCsvFileSelected = async (file: File) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith(".csv")) {
      toast({
        title: "Invalid File Type",
        description: "Only standard .csv files are supported. Please download the template if needed.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size exceeds maximum allowed limit of 5 MB.",
        variant: "destructive",
      });
      return;
    }

    setBulkCsvFile(file);
    setBulkErrorMessage(null);

    try {
      const text = await file.text();
      const rawRows = parseCsv(text);

      if (rawRows.length < 2 || !rawRows[0]) {
        throw new Error("CSV file must contain a header row and at least 1 data row.");
      }

      const headerRow = rawRows[0] || [];
      const headers = headerRow.map((h) => (h || "").toLowerCase().replace(/[\s\-_*()\[\]/\\:]+/g, ""));
      const nameIdx = headers.findIndex((h) => ["modulename", "name", "title", "module"].includes(h));
      const descIdx = headers.findIndex((h) => ["description", "desc", "summary", "notes"].includes(h));
      const typeIdx = headers.findIndex((h) => ["type", "deliverytype", "format"].includes(h));
      const durIdx = headers.findIndex((h) => ["durationminutes", "duration", "time", "timeminutes"].includes(h));
      const marksIdx = headers.findIndex((h) => ["totalmarks", "marks", "points", "score"].includes(h));
      const passIdx = headers.findIndex((h) => ["passingmarks", "passing_marks", "passmarks"].includes(h));
      const statusIdx = headers.findIndex((h) => ["status", "state"].includes(h));
      const orderIdx = headers.findIndex((h) => ["displayorder", "order", "sequence", "index"].includes(h));

      if (nameIdx === -1) {
        throw new Error("Could not find required header 'Module Name' or 'Title' in CSV.");
      }

      const existingNamesMap = new Set(
        (currentSubmodule?.modules || []).map((m) => (m.name || m.title || "").trim().toLowerCase())
      );

      const maxOrder = (currentSubmodule?.modules && currentSubmodule.modules.length > 0)
        ? currentSubmodule.modules.reduce((max, m) => Math.max(max, m.display_order ?? 0), 0)
        : 0;

      const seenNames = new Set<string>();
      const parsedResults: any[] = [];

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.every((c) => !c || !c.trim())) continue;

        const rowNumber = i + 1;
        const rowErrors: string[] = [];

        const rawName = (nameIdx !== -1 && row[nameIdx] ? row[nameIdx]! : "").trim();
        if (!rawName) {
          rowErrors.push("Module Name is required.");
        }

        const lowerName = rawName.toLowerCase();
        if (rawName) {
          if (seenNames.has(lowerName)) {
            rowErrors.push(`Duplicate module name "${rawName}" found in CSV.`);
          } else {
            seenNames.add(lowerName);
          }

          if (existingNamesMap.has(lowerName)) {
            rowErrors.push(`Module "${rawName}" already exists in this Submodule.`);
          }
        }

        const rawType = (typeIdx !== -1 && row[typeIdx] ? row[typeIdx]! : "").toLowerCase().trim();
        let finalType: "mixed" | "coding" | "mcq" = "mixed";
        if (rawType) {
          if (["coding", "code", "code only"].includes(rawType)) {
            finalType = "coding";
          } else if (["mcq", "mcq only", "quiz"].includes(rawType)) {
            finalType = "mcq";
          } else if (["mixed"].includes(rawType)) {
            finalType = "mixed";
          } else {
            rowErrors.push(`Invalid type "${rawType}". Allowed: Mixed, Coding, MCQ.`);
          }
        }

        const rawDur = durIdx !== -1 && row[durIdx] ? parseInt(row[durIdx]!) : 60;
        const durationMinutes = isNaN(rawDur) ? 60 : Math.max(0, rawDur);

        const rawMarks = marksIdx !== -1 && row[marksIdx] ? parseInt(row[marksIdx]!) : 100;
        const totalMarks = isNaN(rawMarks) ? 100 : rawMarks;
        if (totalMarks < 1) {
          rowErrors.push("Total marks must be a positive number of at least 1.");
        }

        const rawPass = passIdx !== -1 && row[passIdx] ? parseInt(row[passIdx]!) : 40;
        const passingMarks = isNaN(rawPass) ? 40 : rawPass;
        if (passingMarks < 0 || passingMarks > totalMarks) {
          rowErrors.push(`Passing marks (${passingMarks}) cannot exceed total marks (${totalMarks}).`);
        }

        const rawStatus = (statusIdx !== -1 && row[statusIdx] ? row[statusIdx]! : "").toLowerCase().trim();
        let status: "active" | "inactive" = "active";
        if (rawStatus) {
          if (["active", "enabled", "published"].includes(rawStatus)) {
            status = "active";
          } else if (["inactive", "disabled", "draft"].includes(rawStatus)) {
            status = "inactive";
          } else {
            rowErrors.push(`Invalid status "${rawStatus}". Allowed: Active, Inactive.`);
          }
        }

        let displayOrder = maxOrder + parsedResults.length + 1;
        if (orderIdx !== -1 && row[orderIdx]) {
          const ord = parseInt(row[orderIdx]!);
          if (!isNaN(ord) && ord > 0) {
            displayOrder = ord;
          }
        }

        const description = descIdx !== -1 && row[descIdx] ? row[descIdx]!.trim() : "";

        parsedResults.push({
          rowNumber,
          name: rawName,
          description,
          type: finalType,
          durationMinutes,
          totalMarks,
          passingMarks,
          status,
          displayOrder,
          errors: rowErrors,
          isValid: rowErrors.length === 0,
        });
      }

      if (parsedResults.length === 0) {
        throw new Error("No valid data rows found in the CSV file.");
      }

      setBulkCsvRows(parsedResults);
      toast({
        title: "CSV Parsed",
        description: `${parsedResults.length} rows loaded (${parsedResults.filter((r) => r.isValid).length} valid).`,
      });
    } catch (err: any) {
      toast({
        title: "CSV Parsing Failed",
        description: err.message || "Failed to parse CSV file. Ensure valid headers and structure.",
        variant: "destructive",
      });
      setBulkErrorMessage(err.message || "Failed to parse CSV file.");
      setBulkCsvFile(null);
      setBulkCsvRows([]);
    }
  };

  const handleValidateAndProceedToPreview = () => {
    setBulkErrorMessage(null);

    if (bulkModuleActiveTab === "manual") {
      if (bulkManualRows.length === 0) {
        setBulkErrorMessage("Please add at least one module row.");
        return;
      }

      const existingNamesMap = new Set(
        (currentSubmodule?.modules || []).map((m) => (m.name || m.title || "").trim().toLowerCase())
      );

      const seenNames = new Set<string>();

      for (let i = 0; i < bulkManualRows.length; i++) {
        const r = bulkManualRows[i];
        if (!r) continue;
        const trimmed = r.name.trim();

        if (!trimmed) {
          const msg = `Module #${i + 1}: Module Name is required.`;
          setBulkErrorMessage(msg);
          toast({ title: "Validation Error", description: msg, variant: "destructive" });
          return;
        }

        const lower = trimmed.toLowerCase();
        if (seenNames.has(lower)) {
          const msg = `Module #${i + 1}: Duplicate module name "${trimmed}" detected in form.`;
          setBulkErrorMessage(msg);
          toast({ title: "Duplicate Detected", description: msg, variant: "destructive" });
          return;
        }
        seenNames.add(lower);

        if (existingNamesMap.has(lower)) {
          const msg = `Module #${i + 1}: Module "${trimmed}" already exists in this Submodule.`;
          setBulkErrorMessage(msg);
          toast({ title: "Module Exists", description: msg, variant: "destructive" });
          return;
        }

        if (r.totalMarks < 1) {
          const msg = `Module #${i + 1}: Total Marks must be at least 1.`;
          setBulkErrorMessage(msg);
          toast({ title: "Validation Error", description: msg, variant: "destructive" });
          return;
        }

        if (r.passingMarks < 0 || r.passingMarks > r.totalMarks) {
          const msg = `Module #${i + 1}: Passing Marks (${r.passingMarks}) cannot exceed Total Marks (${r.totalMarks}).`;
          setBulkErrorMessage(msg);
          toast({ title: "Validation Error", description: msg, variant: "destructive" });
          return;
        }
      }

      setBulkModuleStep("preview");
    } else {
      // CSV tab
      if (!bulkCsvFile || bulkCsvRows.length === 0) {
        const msg = "Please upload a valid CSV file first.";
        setBulkErrorMessage(msg);
        toast({ title: "No File Uploaded", description: msg, variant: "destructive" });
        return;
      }

      const invalidRows = bulkCsvRows.filter((r) => !r.isValid);
      if (invalidRows.length > 0) {
        const firstInvalid = invalidRows[0];
        const firstErr = firstInvalid?.errors?.[0] || "Invalid data found";
        const rowNum = firstInvalid?.rowNumber || 1;
        const msg = `Row #${rowNum}: ${firstErr}. Please resolve all CSV errors before previewing.`;
        setBulkErrorMessage(msg);
        toast({ title: "CSV Has Errors", description: msg, variant: "destructive" });
        return;
      }

      setBulkModuleStep("preview");
    }
  };

  const handleConfirmBulkSubmit = async () => {
    if (!currentMainModule || !currentSubmodule) {
      toast({ title: "Error", description: "Missing submodule context.", variant: "destructive" });
      return;
    }

    let modulesToCreate: Array<{
      name: string;
      description: string;
      type: "mixed" | "coding" | "mcq";
      durationMinutes: number;
      totalMarks: number;
      passingMarks: number;
      status: "active" | "inactive";
      displayOrder?: number;
    }> = [];

    const maxOrder = (currentSubmodule.modules && currentSubmodule.modules.length > 0)
      ? currentSubmodule.modules.reduce((max, m) => Math.max(max, m.display_order ?? 0), 0)
      : 0;

    if (bulkModuleActiveTab === "manual") {
      modulesToCreate = bulkManualRows.map((r, idx) => ({
        name: r.name.trim(),
        description: r.description.trim(),
        type: r.type,
        durationMinutes: r.durationEnabled ? Math.max(1, r.durationMinutes) : 0,
        totalMarks: Math.max(1, r.totalMarks),
        passingMarks: Math.max(0, r.passingMarks),
        status: r.status,
        displayOrder: bulkAutoOrder ? maxOrder + 1 + idx : r.displayOrder,
      }));
    } else {
      modulesToCreate = bulkCsvRows.map((r, idx) => ({
        name: r.name.trim(),
        description: r.description.trim(),
        type: r.type,
        durationMinutes: r.durationMinutes,
        totalMarks: r.totalMarks,
        passingMarks: r.passingMarks,
        status: r.status,
        displayOrder: bulkAutoOrder ? maxOrder + 1 + idx : r.displayOrder,
      }));
    }

    if (modulesToCreate.length === 0) {
      toast({ title: "Error", description: "No modules to create.", variant: "destructive" });
      return;
    }

    setIsBulkSubmitting(true);
    setBulkErrorMessage(null);

    try {
      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_create_modules",
          main_module_id: currentMainModule.id,
          submodule_id: currentSubmodule.id,
          auto_order: bulkAutoOrder,
          modules: modulesToCreate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to save modules right now. No changes were applied.");
      }

      toast({
        title: "Success",
        description: `${data.count || modulesToCreate.length} modules created successfully.`,
      });

      setShowBulkModuleModal(false);
      await fetchData();
    } catch (err: any) {
      console.error("Bulk module creation error:", err);
      const safeMsg = err.message || "Unable to save modules right now. No changes were applied. Please try again.";
      setBulkErrorMessage(safeMsg);
      toast({
        title: "Creation Failed",
        description: safeMsg,
        variant: "destructive",
      });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleCloseBulkModal = () => {
    if (isBulkSubmitting) return;
    setShowBulkModuleModal(false);
  };

  // 3.8. OPEN QUESTION BULK UPLOAD MODAL (OPTIONS: MIXED | CODE ONLY | MCQ ONLY)
  const handleOpenQuestionBulkUpload = (m?: PracticeModule | null) => {
    const target = m || currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
    if (!target) {
      toast({ title: "Module Context Missing", description: "Please select a Module before uploading questions.", variant: "destructive" });
      return;
    }

    const hierarchy = resolveHierarchyForModule(target.id);
    const mainId = target.main_module_id || hierarchy.mainModule?.id;
    const subId = target.submodule_id || hierarchy.submodule?.id;
    if (mainId) setSelectedMainModuleId(mainId);
    if (subId) setSelectedSubmoduleId(subId);
    setSelectedModuleId(target.id);
    setMcqList(target.mcqQuestions || []);
    setCodingList(target.codingQuestions || []);
    setTargetQuestionUploadModule(target);

    // Initial default format based on module type
    const defaultType = target.type === "mcq" ? "quiz" : target.type === "mixed" ? "mixed_questions" : "coding_problem";
    setBulkUploadModuleType(defaultType);
    setIsBulkUploadOpen(true);
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
    setIsEditingBannerPassingMarks(false);
    setBannerPassingMarksInput("");
    setActiveLevel("module_editor");
  };

  const handleToggleBannerPassingMarks = async (enabled: boolean) => {
    const activeMod = currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
    if (!activeMod) return;

    const resolvedHierarchy = resolveHierarchyForModule(activeMod.id);
    const parentMainId = activeMod.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
    const parentSubId = activeMod.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;
    if (!parentMainId || !parentSubId) {
      toast({ title: "Error", description: "Parent module hierarchy not found", variant: "destructive" });
      return;
    }

    setIsSavingBannerPassingMarks(true);
    const prevMarks = typeof activeMod.passingMarks === "number" && activeMod.passingMarks > 0 ? activeMod.passingMarks : 40;
    const newPassingMarks = enabled ? prevMarks : 0;

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
          passingMarks: newPassingMarks,
          passingMarksEnabled: enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update passing marks");
      toast({
        title: "Passing Marks Updated",
        description: enabled ? `Passing marks enabled (${newPassingMarks} marks)` : "Passing marks disabled (All submissions pass)",
      });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingBannerPassingMarks(false);
    }
  };

  const handleSaveBannerPassingMarks = async () => {
    const activeMod = currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
    if (!activeMod) return;

    const num = parseInt(bannerPassingMarksInput);
    if (isNaN(num) || num < 0) {
      toast({ title: "Validation Error", description: "Passing marks must be 0 or greater", variant: "destructive" });
      return;
    }
    const modTotal = activeMod.totalMarks ?? 100;
    if (num > modTotal) {
      toast({ title: "Validation Error", description: `Passing marks (${num}) cannot exceed total marks (${modTotal})`, variant: "destructive" });
      return;
    }

    const resolvedHierarchy = resolveHierarchyForModule(activeMod.id);
    const parentMainId = activeMod.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
    const parentSubId = activeMod.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;
    if (!parentMainId || !parentSubId) {
      toast({ title: "Error", description: "Parent module hierarchy not found", variant: "destructive" });
      return;
    }

    setIsSavingBannerPassingMarks(true);
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
          passingMarks: num,
          passingMarksEnabled: num > 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update passing marks");
      toast({ title: "Success", description: `Passing marks updated to ${num}` });
      setIsEditingBannerPassingMarks(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingBannerPassingMarks(false);
    }
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

    const totalMarks = activeMod.totalMarks ?? 100;
    const allQuestions = [...mcqList, ...codingList];
    const isDraft = activeMod.status !== "active";
    const markVal = validateModuleMarks(totalMarks, allQuestions, isDraft);
    if (!markVal.isValid) {
      toast({
        title: "Validation Error",
        description: markVal.errorMessage,
        variant: "destructive",
      });
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

  const handleDistributeMarksEqually = () => {
    const activeMod = currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
    const totalMarks = activeMod?.totalMarks ?? 100;
    const totalCount = mcqList.length + codingList.length;
    if (totalCount === 0) {
      toast({ title: "No Questions", description: "Add questions first before distributing marks", variant: "destructive" });
      return;
    }

    const weights = calculateEqualWeights(totalMarks, totalCount);

    const updatedMcqs = mcqList.map((q, idx) => ({
      ...q,
      marks: weights[idx],
    }));

    const updatedCoding = codingList.map((cp, idx) => ({
      ...cp,
      points: weights[mcqList.length + idx],
      marks: weights[mcqList.length + idx],
      weight: weights[mcqList.length + idx],
    }));

    setMcqList(updatedMcqs);
    setCodingList(updatedCoding);

    toast({
      title: "Marks Distributed Equally",
      description: `Distributed ${totalMarks} total marks across ${totalCount} questions with exact remainder handling.`,
    });
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
        const currentMcqs = (activeMod.mcqQuestions && activeMod.mcqQuestions.length > 0)
          ? [...activeMod.mcqQuestions]
          : (isCurrentActive && mcqList.length > 0 ? [...mcqList] : []);
        const currentCodings = (activeMod.codingQuestions && activeMod.codingQuestions.length > 0)
          ? [...activeMod.codingQuestions]
          : (isCurrentActive && codingList.length > 0 ? [...codingList] : []);

        const targetDeletedProblem = questionType === "coding" ? currentCodings[index] : null;

        const updatedMcqs = questionType === "mcq" ? currentMcqs.filter((_, i) => i !== index) : currentMcqs;
        const updatedCodings = questionType === "coding" ? currentCodings.filter((_, i) => i !== index) : currentCodings;

        // Auto balance remaining questions points so module totalMarks constraint is satisfied
        const remainingTotalCount = updatedMcqs.length + updatedCodings.length;
        const totalMarks = activeMod.totalMarks || 100;
        if (remainingTotalCount > 0) {
          const weights = calculateEqualWeights(totalMarks, remainingTotalCount);
          let wIdx = 0;
          updatedMcqs.forEach((q: any) => {
            q.marks = weights[wIdx++];
          });
          updatedCodings.forEach((cq: any) => {
            const w = weights[wIdx++];
            cq.points = w;
            cq.marks = w;
            cq.weight = w;
          });
        }

        if (isCurrentActive) {
          if (questionType === "mcq") setMcqList(updatedMcqs);
          if (questionType === "coding") setCodingList(updatedCodings);
        }

        // Optimistically update viewingQuestionsModule immediately so user sees deletion right away!
        if (viewingQuestionsModule && viewingQuestionsModule.id === activeMod.id) {
          setViewingQuestionsModule({
            ...viewingQuestionsModule,
            mcqQuestions: updatedMcqs,
            codingQuestions: updatedCodings,
            questionCount: remainingTotalCount,
          });
        }

        // Optimistically update tracks in memory so tree reflects it immediately
        setTracks((prevTracks) => {
          return prevTracks.map((main) => {
            if (main.id !== parentMainId) return main;
            return {
              ...main,
              submodules: (main.submodules || []).map((sub) => {
                if (sub.id !== parentSubId) return sub;
                return {
                  ...sub,
                  modules: (sub.modules || []).map((mod) => {
                    if (mod.id !== activeMod.id) return mod;
                    return {
                      ...mod,
                      mcqQuestions: updatedMcqs,
                      codingQuestions: updatedCodings,
                      questionCount: remainingTotalCount,
                    };
                  }),
                };
              }),
            };
          });
        });

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
            totalMarks,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Delete failed");

        // If it was a coding problem with an id, also clean up from coding_problems table
        if (targetDeletedProblem?.id) {
          try {
            await fetch(`/api/admin/coding?id=${encodeURIComponent(targetDeletedProblem.id)}`, {
              method: "DELETE",
            });
          } catch (e) {
            console.warn("Could not delete from coding_problems table:", e);
          }
        }

        toast({ title: "Deleted", description: `"${title}" has been deleted successfully.` });
        setDeleteTarget(null);
        await fetchData();
      } else if (deleteTarget.type === "bulk_main_modules") {
        const { ids } = deleteTarget;
        await Promise.all(
          ids.map((id) =>
            fetch(`/api/admin/practices?id=${encodeURIComponent(id)}&type=main_module`, { method: "DELETE" }).catch(() => null)
          )
        );
        setSelectedMainModuleIds([]);
        toast({ title: "Main Modules Deleted", description: `Successfully deleted ${ids.length} Main Module(s).` });
        setDeleteTarget(null);
        await fetchData();
      } else if (deleteTarget.type === "bulk_submodules") {
        const { ids, parentMainId } = deleteTarget;
        await Promise.all(
          ids.map((id) =>
            fetch(
              `/api/admin/practices?id=${encodeURIComponent(id)}&type=submodule&main_module_id=${encodeURIComponent(parentMainId)}`,
              { method: "DELETE" }
            ).catch(() => null)
          )
        );
        setSelectedSubmoduleIds([]);
        toast({ title: "Submodules Deleted", description: `Successfully deleted ${ids.length} Submodule(s).` });
        setDeleteTarget(null);
        await fetchData();
      } else if (deleteTarget.type === "bulk_modules") {
        const { ids, parentMainId, parentSubId } = deleteTarget;
        await Promise.all(
          ids.map((id) =>
            fetch(
              `/api/admin/practices?id=${encodeURIComponent(id)}&type=module&main_module_id=${encodeURIComponent(parentMainId)}&submodule_id=${encodeURIComponent(parentSubId)}`,
              { method: "DELETE" }
            ).catch(() => null)
          )
        );
        setSelectedModuleIds([]);
        toast({ title: "Modules Deleted", description: `Successfully deleted ${ids.length} Module(s).` });
        setDeleteTarget(null);
        await fetchData();
      } else if (deleteTarget.type === "bulk_questions") {
        const { keys } = deleteTarget;
        if (viewingQuestionsModule) {
          const mcqIndicesToDelete = keys
            .filter((k) => k.startsWith("mcq_"))
            .map((k) => Number(k.replace("mcq_", "")))
            .sort((a, b) => b - a);

          const codingIndicesToDelete = keys
            .filter((k) => k.startsWith("coding_"))
            .map((k) => Number(k.replace("coding_", "")))
            .sort((a, b) => b - a);

          let updatedMcqs = [...(viewingQuestionsModule.mcqQuestions || [])];
          mcqIndicesToDelete.forEach((idx) => {
            updatedMcqs.splice(idx, 1);
          });

          let updatedCodings = [...(viewingQuestionsModule.codingQuestions || [])];
          codingIndicesToDelete.forEach((idx) => {
            updatedCodings.splice(idx, 1);
          });

          const remainingTotalCount = updatedMcqs.length + updatedCodings.length;
          const totalMarks = viewingQuestionsModule.totalMarks || 100;
          if (remainingTotalCount > 0) {
            const weights = calculateEqualWeights(totalMarks, remainingTotalCount);
            let wIdx = 0;
            updatedMcqs.forEach((q: any) => {
              q.marks = weights[wIdx++];
            });
            updatedCodings.forEach((cq: any) => {
              const w = weights[wIdx++];
              cq.points = w;
              cq.marks = w;
              cq.weight = w;
            });
          }

          const updatedModule = {
            ...viewingQuestionsModule,
            mcqQuestions: updatedMcqs,
            codingQuestions: updatedCodings,
            questionCount: remainingTotalCount,
          };

          const res = await fetch("/api/admin/practices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update_module",
              id: viewingQuestionsModule.id,
              main_module_id: viewingQuestionsModule.main_module_id,
              submodule_id: viewingQuestionsModule.submodule_id,
              name: viewingQuestionsModule.name || viewingQuestionsModule.title,
              title: viewingQuestionsModule.name || viewingQuestionsModule.title,
              description: viewingQuestionsModule.description,
              type: viewingQuestionsModule.type,
              status: viewingQuestionsModule.status,
              display_order: viewingQuestionsModule.display_order,
              duration_minutes: viewingQuestionsModule.durationMinutes,
              total_marks: viewingQuestionsModule.totalMarks,
              question_count: remainingTotalCount,
              mcq_questions: updatedMcqs,
              coding_questions: updatedCodings,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || "Failed to update module questions");

          setViewingQuestionsModule(updatedModule);
          setSelectedViewQuestionKeys([]);
          toast({ title: "Questions Deleted", description: `Successfully deleted ${keys.length} question(s).` });
          setDeleteTarget(null);
          await fetchData();
        }
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

  // ─── BULK DELETE HANDLERS ──────────────────────────────────────────
  const handleBulkDeleteMainModules = (ids: string[]) => {
    if (!ids.length) return;
    setDeleteTarget({
      type: "bulk_main_modules",
      count: ids.length,
      ids,
    });
  };

  const handleBulkDeleteSubmodules = (ids: string[], parentMainId: string) => {
    if (!ids.length || !parentMainId) return;
    setDeleteTarget({
      type: "bulk_submodules",
      count: ids.length,
      ids,
      parentMainId,
    });
  };

  const handleBulkDeleteModules = (ids: string[], parentMainId: string, parentSubId: string) => {
    if (!ids.length || !parentMainId || !parentSubId) return;
    setDeleteTarget({
      type: "bulk_modules",
      count: ids.length,
      ids,
      parentMainId,
      parentSubId,
    });
  };

  const handleBulkDeleteQuestionsFromView = (keys: string[]) => {
    if (!viewingQuestionsModule || !keys.length) return;
    setDeleteTarget({
      type: "bulk_questions",
      count: keys.length,
      keys,
    });
  };

  // Toggle Coding Problem Scope (Practice Only <-> Code Lab)
  const handleToggleCodeLabScope = async (m: PracticeModule, cp: any, index: number) => {
    const isCurrentlyCodeLab = Boolean(
      cp.is_codelab === true ||
      cp.isCodeLab === true ||
      cp.scope === "codelab" ||
      cp.scope === "both" ||
      (typeof cp.starter_code === "object" && (
        cp.starter_code?.is_codelab === true ||
        cp.starter_code?.scope === "codelab" ||
        cp.starter_code?.scope === "both"
      ))
    );

    const newScope = !isCurrentlyCodeLab;
    const targetId = cp.id || `cp-${index}`;
    setTogglingCodeLabId(targetId);

    // 1. Optimistic update
    const updatedQuestion = {
      ...cp,
      is_codelab: newScope,
      isCodeLab: newScope,
      scope: newScope ? "both" : "practice",
      starter_code: {
        ...(typeof cp.starter_code === "object" ? cp.starter_code : {}),
        is_codelab: newScope,
        scope: newScope ? "both" : "practice",
      },
    };

    const currentCodings = [...(m.codingQuestions || [])];
    currentCodings[index] = updatedQuestion;

    if (viewingQuestionsModule && viewingQuestionsModule.id === m.id) {
      setViewingQuestionsModule({
        ...viewingQuestionsModule,
        codingQuestions: currentCodings,
      });
    }

    if (selectedModuleId === m.id) {
      setCodingList(currentCodings);
    }

    // Also update in tracks state
    setTracks((prevTracks) => {
      return prevTracks.map((main) => ({
        ...main,
        submodules: (main.submodules || []).map((sub) => ({
          ...sub,
          modules: (sub.modules || []).map((mod) => {
            if (mod.id !== m.id) return mod;
            return {
              ...mod,
              codingQuestions: currentCodings,
            };
          }),
        })),
      }));
    });

    try {
      // 2. Resolve hierarchy to persist in practice_tracks
      const resolvedHierarchy = resolveHierarchyForModule(m.id);
      const parentMainId = m.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
      const parentSubId = m.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;

      if (parentMainId && parentSubId) {
        await fetch("/api/admin/practices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_module",
            main_module_id: parentMainId,
            submodule_id: parentSubId,
            id: m.id,
            name: m.name || m.title,
            codingQuestions: currentCodings,
            mcqQuestions: m.mcqQuestions || [],
            totalMarks: m.totalMarks || 100,
          }),
        });
      }

      // 3. Sync to coding_problems table if problem has an ID
      if (cp.id) {
        await fetch("/api/admin/coding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...cp,
            id: cp.id,
            scope: newScope ? "both" : "practice",
            starter_code: {
              ...(typeof cp.starter_code === "object" ? cp.starter_code : {}),
              is_codelab: newScope,
              scope: newScope ? "both" : "practice",
            },
          }),
        });
      }

      toast({
        title: newScope ? "Published to Challenges" : "Removed from Challenges",
        description: `"${cp.title || "Problem"}" is ${newScope ? "now available in Challenges" : "restricted to practice module only"}.`,
      });
    } catch (err: any) {
      console.error("Error toggling Code Lab scope:", err);
      toast({
        title: "Toggle Saved",
        description: "Updated locally in current session.",
      });
    } finally {
      setTogglingCodeLabId(null);
    }
  };

  // 6. BULK IMPORT HANDLER (FOR MIXED, CODING CHALLENGES & MCQS)
  const handleBulkImport = async (importedItems: any[]) => {
    if (!importedItems || importedItems.length === 0) return;

    const activeMod = targetQuestionUploadModule || currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
    if (!activeMod) {
      toast({ title: "Error", description: "Target module not found for bulk questions import.", variant: "destructive" });
      return;
    }

    const resolvedHierarchy = resolveHierarchyForModule(activeMod.id);
    const parentMainId = activeMod.main_module_id || currentMainModule?.id || resolvedHierarchy.mainModule?.id;
    const parentSubId = activeMod.submodule_id || currentSubmodule?.id || resolvedHierarchy.submodule?.id;

    if (!parentMainId || !parentSubId) {
      toast({ title: "Error", description: "Parent module hierarchy not found.", variant: "destructive" });
      return;
    }

    let addedMcqCount = 0;
    let addedCodingCount = 0;
    const updatedMcqs: MCQQuestion[] = [...(activeMod.mcqQuestions || mcqList)];
    const updatedCodings: any[] = [...(activeMod.codingQuestions || codingList)];
    const newlyCreatedCodingProblems: any[] = [];

    importedItems.forEach((item, idx) => {
      // Determine if item is MCQ or Coding
      const isMcq =
        item.questionCategory === "mcq" ||
        (item.options && Array.isArray(item.options) && item.options.length > 0 && !item.test_cases && !item.testCases && !item.starter_code && !item.starterCode);

      if (isMcq) {
        let opts = item.options;
        const rawCorrect = String(item.correctOption || item.correctAnswer || "A").trim().toUpperCase();
        const correctParts = rawCorrect.split(/[\s,+/]+/).map((s) => s.trim()).filter(Boolean);
        let isMultiple = Boolean(item.allowMultiple) || correctParts.length > 1 || String(item.questionType || "").toLowerCase().includes("multi");

        if (!Array.isArray(opts) || opts.length === 0) {
          const opt1 = { id: `opt_${Date.now()}_1_${idx}`, text: item.optionA || item.option_1 || "Option A", isCorrect: false };
          const opt2 = { id: `opt_${Date.now()}_2_${idx}`, text: item.optionB || item.option_2 || "Option B", isCorrect: false };
          const opt3 = { id: `opt_${Date.now()}_3_${idx}`, text: item.optionC || item.option_3 || "Option C", isCorrect: false };
          const opt4 = { id: `opt_${Date.now()}_4_${idx}`, text: item.optionD || item.option_4 || "Option D", isCorrect: false };

          if (correctParts.includes("A") || correctParts.includes("1")) opt1.isCorrect = true;
          if (correctParts.includes("B") || correctParts.includes("2")) opt2.isCorrect = true;
          if (correctParts.includes("C") || correctParts.includes("3")) opt3.isCorrect = true;
          if (correctParts.includes("D") || correctParts.includes("4")) opt4.isCorrect = true;

          // Default fallback to Option A if none matched
          if (!opt1.isCorrect && !opt2.isCorrect && !opt3.isCorrect && !opt4.isCorrect) {
            opt1.isCorrect = true;
          }
          opts = [opt1, opt2, opt3, opt4];
        } else {
          const correctCount = opts.filter((o: any) => o.isCorrect).length;
          if (correctCount > 1) {
            isMultiple = true;
          }
        }

        const newMcq: MCQQuestion = {
          id: item.id || `mcq_${Date.now()}_${idx}`,
          questionText: String(item.questionText || item.question || item.title || `Question ${idx + 1}`).trim(),
          marks: Number(item.marks || item.points || item.totalMarks) || 10,
          options: opts,
          explanation: String(item.explanation || "").trim(),
          difficulty: item.difficulty || "Easy",
          allowMultiple: isMultiple,
        };
        updatedMcqs.push(newMcq);
        addedMcqCount++;
      } else {
        // Coding Problem
        const starterCode = item.starter_code || item.starterCode || item.templates || {};
        const testCases = Array.isArray(item.test_cases) ? item.test_cases : (Array.isArray(item.testCases) ? item.testCases : []);
        const sampleCases = item.sample_test_cases || testCases.filter((tc: any) => !tc.is_hidden && !tc.isHidden);
        const hiddenCases = item.hidden_test_cases || testCases.filter((tc: any) => tc.is_hidden || tc.isHidden);

        const newProblem = {
          id: item.id || `cp-${Date.now()}-${idx}`,
          title: item.title || `Coding Challenge ${idx + 1}`,
          slug: item.slug || `prob-${Date.now()}-${idx}`,
          description: item.description || item.title || "",
          difficulty: (item.difficulty || "medium").toLowerCase(),
          category: item.category || "Algorithms",
          tags: item.topic_tags || item.tags || [],
          points: Number(item.points || item.marks) || 10,
          marks: Number(item.points || item.marks) || 10,
          time_limit_ms: Number(item.time_limit_ms) || 2000,
          memory_limit_mb: Number(item.memory_limit_mb) || 256,
          starter_code: starterCode,
          test_cases: testCases,
          sample_test_cases: sampleCases,
          hidden_test_cases: hiddenCases,
          status: "published",
          scope: "practice",
          assessment_id: activeMod.id,
          module_id: activeMod.id,
        };
        updatedCodings.push(newProblem);
        newlyCreatedCodingProblems.push(newProblem);
        addedCodingCount++;
      }
    });

    setMcqList(updatedMcqs);
    setCodingList(updatedCodings);
    setIsBulkUploadOpen(false);

    // Save coding problems to coding_problems table if any
    if (newlyCreatedCodingProblems.length > 0) {
      CodingProblemsService.saveProblems(newlyCreatedCodingProblems as any).catch((err) => {
        console.warn("Direct DB bulk coding persistence notice:", err);
      });
    }

    // Persist to database
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
          mcqQuestions: updatedMcqs,
          codingQuestions: updatedCodings,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");

      await fetchData();
      const summaryMsg = [];
      if (addedMcqCount > 0) summaryMsg.push(`${addedMcqCount} MCQ questions`);
      if (addedCodingCount > 0) summaryMsg.push(`${addedCodingCount} Coding challenges`);
      toast({
        title: "Bulk Questions Added Successfully",
        description: `Imported and saved ${summaryMsg.join(" and ") || "questions"} to "${activeMod.name || activeMod.title}".`,
      });
    } catch (err: any) {
      toast({
        title: "Import Loaded",
        description: "Click 'Save Questions & Exit' to persist changes to database.",
      });
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
      {/* ─── ENTERPRISE PAGE HEADER (MATCHING ALL PAGES ACROSS LMS) ────── */}
      {!(activeLevel === "module_editor" && showCodingCreator) && (
        <PageHeader
          title={
            activeLevel === "main_modules"
              ? "Practice Main Modules"
              : activeLevel === "submodules"
              ? `Submodules: ${currentMainModule?.name || currentMainModule?.title || ""}`
              : activeLevel === "modules"
              ? `Modules: ${currentSubmodule?.name || currentSubmodule?.title || ""}`
              : `Questions Editor: ${currentModule?.name || currentModule?.title || ""}`
          }
          backAction={
            activeLevel === "submodules"
              ? {
                  label: "Back to Main Modules",
                  onClick: () => {
                    setSelectedMainModuleId(null);
                    setActiveLevel("main_modules");
                  },
                }
              : activeLevel === "modules"
              ? {
                  label: "Back to Submodules",
                  onClick: () => {
                    setSelectedSubmoduleId(null);
                    setActiveLevel("submodules");
                  },
                }
              : activeLevel === "module_editor"
              ? {
                  label: "Back to Modules",
                  onClick: () => setActiveLevel("modules"),
                }
              : undefined
          }
          actions={
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
                <Button
                  type="button"
                  onClick={handleOpenAddSubmodule}
                  className="h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                >
                  + Add Submodule
                </Button>
              )}

              {activeLevel === "modules" && (
                <Button
                  type="button"
                  onClick={handleOpenAddModule}
                  className="h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                >
                  + Add Module
                </Button>
              )}

              {activeLevel === "module_editor" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenQuestionBulkUpload(currentModule)}
                    className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 bg-white dark:bg-[#18181B] cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
                  >
                    Bulk Upload Questions
                  </button>
                  <Button
                    type="button"
                    onClick={handleSaveModuleQuestions}
                    className="h-9 px-4 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                  >
                    Save Questions &amp; Exit
                  </Button>
                </div>
              )}
            </div>
          }
        />
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
            <div className="space-y-3">
              {/* Main Modules Bulk Delete Toolbar */}
              {selectedMainModuleIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-2.5 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                      {selectedMainModuleIds.length}
                    </span>
                    <span className="text-xs font-bold text-red-800 dark:text-red-300">
                      {selectedMainModuleIds.length === 1 ? "1 main module selected" : `${selectedMainModuleIds.length} main modules selected`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedMainModuleIds([])}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 underline cursor-pointer ml-1"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBulkDeleteMainModules(selectedMainModuleIds)}
                      className="h-8 px-3 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs cursor-pointer"
                    >
                      <span>Delete Selected ({selectedMainModuleIds.length})</span>
                    </Button>
                  </div>
                </div>
              )}

              {filteredTracks.map((m) => {
                const subCount = m.submodules?.length || 0;
                const totalModCount = (m.submodules || []).reduce(
                  (acc, s) => acc + (s.modules?.length || 0),
                  0
                );
                const isActive = m.status === "active";
                const totalMarks = calculateMainModuleTotalMarks(m);

                return (
                  <Card
                    key={m.id}
                    className={`bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4.5 shadow-2xs hover:border-blue-400/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      selectedMainModuleIds.includes(m.id) ? "border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedMainModuleIds.includes(m.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedMainModuleIds((prev) =>
                            prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0 mt-1"
                        title="Select this main module"
                      />
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
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
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                          Order: <strong className="text-slate-800 dark:text-zinc-200">{m.display_order ?? 0}</strong>
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug truncate">
                          {m.name || m.title}
                        </h3>
                        {m.description && (
                          <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                            {m.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-600 dark:text-zinc-400 pt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          <strong className="text-slate-900 dark:text-white">{subCount}</strong> Submodules
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          <strong className="text-slate-900 dark:text-white">{totalModCount}</strong> Modules
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          Total Marks: <strong className="text-slate-900 dark:text-white">{totalMarks}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          Batch: <strong className="text-slate-900 dark:text-white">{m.isCommon ? "All Batches" : `${m.assignedBatches?.length || 0} Assigned`}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-zinc-800">
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedMainModuleId(m.id);
                          setActiveLevel("submodules");
                        }}
                        className="h-8.5 px-3.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        View Submodules ({subCount})
                      </Button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenEditMainModule(m, e)}
                        className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleMainModuleStatus(m, e)}
                        className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMainModule(m, e)}
                        className="h-8.5 px-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Delete
                      </button>
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
            <div className="space-y-3">
              {/* Submodules Bulk Delete Toolbar */}
              {selectedSubmoduleIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-2.5 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                      {selectedSubmoduleIds.length}
                    </span>
                    <span className="text-xs font-bold text-red-800 dark:text-red-300">
                      {selectedSubmoduleIds.length === 1 ? "1 submodule selected" : `${selectedSubmoduleIds.length} submodules selected`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSubmoduleIds([])}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 underline cursor-pointer ml-1"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBulkDeleteSubmodules(selectedSubmoduleIds, currentMainModule.id)}
                      className="h-8 px-3 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs cursor-pointer"
                    >
                      <span>Delete Selected ({selectedSubmoduleIds.length})</span>
                    </Button>
                  </div>
                </div>
              )}

              {currentMainModule.submodules.map((sm) => {
                const modCount = sm.modules?.length || 0;
                const isActive = sm.status === "active";
                const totalMarks = calculateSubmoduleTotalMarks(sm);

                return (
                  <Card
                    key={sm.id}
                    className={`bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4.5 shadow-2xs hover:border-blue-400/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      selectedSubmoduleIds.includes(sm.id) ? "border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedSubmoduleIds.includes(sm.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedSubmoduleIds((prev) =>
                            prev.includes(sm.id) ? prev.filter((id) => id !== sm.id) : [...prev, sm.id]
                          );
                        }}
                        className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0 mt-1"
                        title="Select this submodule"
                      />
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
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
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                          Order: <strong className="text-slate-800 dark:text-zinc-200">{sm.display_order ?? 0}</strong>
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug truncate">
                          {sm.name || sm.title}
                        </h3>
                        {sm.description && (
                          <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                            {sm.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-600 dark:text-zinc-400 pt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          Modules: <strong className="text-slate-900 dark:text-white">{modCount}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          Total Marks: <strong className="text-slate-900 dark:text-white">{totalMarks}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-zinc-800">
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedSubmoduleId(sm.id);
                          setActiveLevel("modules");
                        }}
                        className="h-8.5 px-3.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        View Modules ({modCount})
                      </Button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenEditSubmodule(sm, e)}
                        className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleSubmoduleStatus(sm, e)}
                        className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSubmodule(sm, e)}
                        className="h-8.5 px-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Delete
                      </button>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs">
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
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">
                Modules Count: {currentSubmodule.modules.length}
              </span>
              {currentSubmodule.modules.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (collapsedAdminModuleIds.size === currentSubmodule.modules.length) {
                      setCollapsedAdminModuleIds(new Set());
                    } else {
                      setCollapsedAdminModuleIds(new Set(currentSubmodule.modules.map((m) => m.id)));
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer transition-colors"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      collapsedAdminModuleIds.size === currentSubmodule.modules.length ? "-rotate-90" : ""
                    }`}
                  />
                  <span>
                    {collapsedAdminModuleIds.size === currentSubmodule.modules.length
                      ? "Expand All"
                      : "Minimize All"}
                  </span>
                </button>
              )}
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
                <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap">
                  <Button
                    type="button"
                    onClick={handleOpenAddModule}
                    className="h-9 px-5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                  >
                    + Add Module
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {/* Modules Bulk Delete Toolbar */}
              {selectedModuleIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-2.5 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                      {selectedModuleIds.length}
                    </span>
                    <span className="text-xs font-bold text-red-800 dark:text-red-300">
                      {selectedModuleIds.length === 1 ? "1 module selected" : `${selectedModuleIds.length} modules selected`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedModuleIds([])}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 underline cursor-pointer ml-1"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBulkDeleteModules(selectedModuleIds, currentMainModule.id, currentSubmodule.id)}
                      className="h-8 px-3 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs cursor-pointer"
                    >
                      <span>Delete Selected ({selectedModuleIds.length})</span>
                    </Button>
                  </div>
                </div>
              )}

              {currentSubmodule.modules.map((mod) => {
                const isActive = mod.status === "active";
                const qCount = (mod.mcqQuestions?.length || 0) + (mod.codingQuestions?.length || 0);
                const isCardCollapsed = collapsedAdminModuleIds.has(mod.id);

                if (isCardCollapsed) {
                  return (
                    <Card
                      key={mod.id}
                      className={`bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 shadow-2xs hover:border-blue-400/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        selectedModuleIds.includes(mod.id) ? "border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedModuleIds.includes(mod.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedModuleIds((prev) =>
                              prev.includes(mod.id) ? prev.filter((id) => id !== mod.id) : [...prev, mod.id]
                            );
                          }}
                          className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                          title="Select this module"
                        />
                        <span className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {mod.display_order ?? 0}
                        </span>
                        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {mod.name || mod.title}
                          </h4>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 shrink-0">
                            {mod.type}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border shrink-0 ${
                              isActive
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium shrink-0 hidden md:inline">
                            {qCount} Questions · {mod.totalMarks} Marks
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <Button
                          type="button"
                          onClick={() => handleOpenViewQuestions(mod)}
                          variant="outline"
                          className="h-7 px-2.5 text-xs font-semibold rounded-md border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer shadow-2xs whitespace-nowrap"
                        >
                          View ({qCount})
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleOpenModuleEditor(mod)}
                          className="h-7 px-2.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs whitespace-nowrap"
                        >
                          + Questions
                        </Button>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModule(mod, e)}
                          className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAdminModuleCollapse(mod.id)}
                          className="h-7 px-1.5 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                          title="Expand details"
                        >
                          <ChevronDown className="w-4 h-4 -rotate-90 transition-transform" />
                        </button>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={mod.id}
                    className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:border-blue-400/50 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Top Badges & Minimize button */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            checked={selectedModuleIds.includes(mod.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedModuleIds((prev) =>
                                prev.includes(mod.id) ? prev.filter((id) => id !== mod.id) : [...prev, mod.id]
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                            title="Select this module"
                          />
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40">
                            LEVEL 3: MODULE
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                              isActive
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            {mod.type}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                            Order: <strong className="text-slate-800 dark:text-zinc-200">{mod.display_order ?? 0}</strong>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleAdminModuleCollapse(mod.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                        >
                          <span>Minimize</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug truncate">
                          {mod.name || mod.title}
                        </h3>
                        {mod.description && (
                          <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                            {mod.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-600 dark:text-zinc-400 pt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          Questions: <strong className="text-slate-900 dark:text-white">{qCount}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          Duration: <strong className="text-slate-900 dark:text-white">{mod.durationMinutes > 0 ? `${mod.durationMinutes}m` : "Untimed"}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          Total Marks: <strong className="text-slate-900 dark:text-white">{mod.totalMarks}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          Passing: <strong className="text-slate-900 dark:text-white">{mod.passingMarksEnabled === false || mod.passingMarks === 0 ? "None (OFF)" : mod.passingMarks ?? 40}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium text-slate-700 dark:text-zinc-300">
                          Attempts: <strong className="text-slate-900 dark:text-white">{mod.allowedAttempts === 0 ? "Unlimited" : (mod.allowedAttempts ?? 3)}</strong>
                        </span>
                      </div>

                      {/* Display Section Names */}
                      {(mod.mcqSectionTitle || mod.codingSectionTitle || (Array.isArray(mod.customSections) && mod.customSections.length > 0)) && (
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-0.5">
                          {mod.type !== "coding" && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 truncate max-w-[150px]" title={mod.mcqSectionTitle || "Section 1: MCQs"}>
                              {mod.mcqSectionTitle || "Section 1: MCQs"}
                            </span>
                          )}
                          {mod.type !== "mcq" && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 truncate max-w-[150px]" title={mod.codingSectionTitle || "Section 2: Coding"}>
                              {mod.codingSectionTitle || "Section 2: Coding"}
                            </span>
                          )}
                          {Array.isArray(mod.customSections) && mod.customSections.map((cs: any, idx: number) => {
                            const title = typeof cs === "string" ? cs : (cs.title || `Section ${idx + 1}`);
                            const secType = typeof cs === "string" ? "mixed" : (cs.type || "mixed");
                            const colorClass =
                              secType === "coding"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : secType === "mcq"
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";

                            return (
                              <span key={idx} className={`px-2 py-0.5 rounded border truncate max-w-[150px] ${colorClass}`} title={`${title} (${secType.toUpperCase()})`}>
                                {title}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap pt-2.5 border-t border-slate-100 dark:border-zinc-800">
                      <Button
                        type="button"
                        onClick={() => handleOpenViewQuestions(mod)}
                        variant="outline"
                        className="h-7.5 px-3 text-xs font-semibold rounded-md border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        View Questions ({qCount})
                      </Button>

                      <Button
                        type="button"
                        onClick={() => handleOpenModuleEditor(mod)}
                        className="h-7.5 px-3 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        + Add Questions
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleOpenQuestionBulkUpload(mod)}
                        className="h-7.5 px-3 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
                      >
                        Bulk Upload Questions
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModule(mod, e)}
                        className="h-7.5 px-3 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleModuleStatus(mod, e)}
                        className="h-7.5 px-3 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteModule(mod, e)}
                        className="h-7.5 px-3 rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Delete
                      </button>
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

            {/* Actions & Tab switch */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenQuestionBulkUpload(currentModule)}
                className="h-8.5 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 bg-white dark:bg-[#18181B] cursor-pointer shadow-2xs whitespace-nowrap transition-colors"
              >
                Bulk Upload Questions
              </button>

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
          </div>

          {/* Live Marks & Weight Scoring Summary */}
          {(() => {
            const modTotal = currentModule.totalMarks ?? 100;
            const qCount = mcqList.length + codingList.length;
            const currentSum = calculateQuestionWeightsSum([...mcqList, ...codingList]);
            const diff = modTotal - currentSum;
            const isPassingActive = typeof currentModule.passingMarksEnabled === "boolean"
              ? currentModule.passingMarksEnabled
              : (typeof currentModule.passingMarks === "number" ? currentModule.passingMarks > 0 : true);
            const effectivePassingMarks = typeof currentModule.passingMarks === "number" && currentModule.passingMarks > 0
              ? currentModule.passingMarks
              : 40;

            return (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Authoritative Total: {modTotal} marks
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600 dark:text-zinc-300">
                      Questions: <strong className="text-slate-900 dark:text-white">{qCount}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600 dark:text-zinc-300">
                      Sum of Weights: <strong className={currentSum === modTotal ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{currentSum} marks</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600 dark:text-zinc-300">Passing Marks:</span>
                      
                      {/* ON/OFF Toggle Button */}
                      <button
                        type="button"
                        disabled={isSavingBannerPassingMarks}
                        onClick={() => handleToggleBannerPassingMarks(!isPassingActive)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border cursor-pointer transition-colors ${
                          isPassingActive
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                        }`}
                        title={isPassingActive ? "Click to toggle passing marks OFF (All scores pass)" : "Click to toggle passing marks ON"}
                      >
                        {isPassingActive ? "ON" : "OFF"}
                      </button>

                      {/* Display & Inline Edit Option */}
                      {isPassingActive ? (
                        isEditingBannerPassingMarks ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={modTotal}
                              value={bannerPassingMarksInput}
                              onChange={(e) => setBannerPassingMarksInput(e.target.value)}
                              className="h-6.5 w-16 text-xs px-1.5 py-0 bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 rounded font-bold"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveBannerPassingMarks();
                                if (e.key === "Escape") setIsEditingBannerPassingMarks(false);
                              }}
                            />
                            <button
                              type="button"
                              disabled={isSavingBannerPassingMarks}
                              onClick={handleSaveBannerPassingMarks}
                              className="h-6.5 px-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingBannerPassingMarks(false)}
                              className="h-6.5 px-1.5 text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 rounded cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <strong className="text-slate-900 dark:text-white">
                              {effectivePassingMarks}
                            </strong>
                            <button
                              type="button"
                              onClick={() => {
                                setBannerPassingMarksInput(String(effectivePassingMarks));
                                setIsEditingBannerPassingMarks(true);
                              }}
                              className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-0.5"
                              title="Click to edit passing marks"
                            >
                              Edit
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium italic">
                          No Minimum (All Pass)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {qCount > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDistributeMarksEqually}
                        className="h-7.5 px-3 text-xs font-semibold rounded-lg border-slate-300 dark:border-zinc-700 hover:bg-slate-100 cursor-pointer"
                        title="Distribute module total marks equally across all questions with remainder handling"
                      >
                        Distribute Marks Equally
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600 dark:text-zinc-400">Validation Status:</span>
                    {diff === 0 ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Valid: Sum of Question Weights Matches Total Marks ({modTotal})
                      </span>
                    ) : diff > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Incomplete: {diff} marks remaining to reach {modTotal}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                        Over Limit: {Math.abs(diff)} marks over configured total ({modTotal})
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {currentModule.status === "active" ? "Active Assessment (Sum must match to save/submit)" : "Draft Assessment"}
                  </span>
                </div>
              </div>
            );
          })()}

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
                            <span className="font-semibold text-slate-700 dark:text-zinc-300">Weight / Score Points:</span>
                            <Input
                              type="number"
                              min={1}
                              value={q.marks ?? 10}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
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
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-700 dark:text-zinc-300">Weight / Score Points:</span>
                                <Input
                                  type="number"
                                  min={1}
                                  value={cp.points ?? cp.marks ?? 10}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    setCodingList(codingList.map((item, i) => i === idx ? { ...item, points: val, marks: val, weight: val } : item));
                                  }}
                                  className="h-6.5 w-16 text-xs bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                                />
                              </div>
                              <span>Time Limit: <strong>{cp.time_limit_ms || 2000}ms</strong></span>
                              {tcCount > 0 && <span>Test Cases: <strong>{tcCount}</strong></span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* Code Lab Scope Toggle in Editor */}
                            {Boolean(currentModule || (selectedModuleId && resolveHierarchyForModule(selectedModuleId).module)) && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-2xs">
                                <span className="text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                                  Challenges
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={Boolean(
                                    cp.is_codelab === true ||
                                    cp.isCodeLab === true ||
                                    cp.scope === "codelab" ||
                                    cp.scope === "both" ||
                                    (typeof cp.starter_code === "object" && (
                                      cp.starter_code?.is_codelab === true ||
                                      cp.starter_code?.scope === "codelab" ||
                                      cp.starter_code?.scope === "both"
                                    ))
                                  )}
                                  onClick={() => {
                                    const m = currentModule || (selectedModuleId ? resolveHierarchyForModule(selectedModuleId).module : null);
                                    if (m) handleToggleCodeLabScope(m, cp, idx);
                                  }}
                                  className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    (cp.is_codelab === true || cp.scope === "codelab" || cp.scope === "both" || (typeof cp.starter_code === "object" && (cp.starter_code?.is_codelab === true || cp.starter_code?.scope === "codelab" || cp.starter_code?.scope === "both")))
                                      ? "bg-emerald-600"
                                      : "bg-slate-300 dark:bg-zinc-700"
                                  }`}
                                  title="Toggle Challenges visibility"
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      (cp.is_codelab === true || cp.scope === "codelab" || cp.scope === "both" || (typeof cp.starter_code === "object" && (cp.starter_code?.is_codelab === true || cp.starter_code?.scope === "codelab" || cp.starter_code?.scope === "both")))
                                        ? "translate-x-3.5"
                                        : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                            )}

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
              className="h-9 px-4 text-xs font-semibold rounded-lg cursor-pointer inline-flex items-center"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Modules
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDistributeMarksEqually}
                className="h-9 px-4 text-xs font-semibold rounded-lg cursor-pointer border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Distribute Marks Equally
              </Button>
              <Button
                type="button"
                onClick={handleSaveModuleQuestions}
                className="h-9 px-5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
              >
                Save Questions &amp; Exit
              </Button>
            </div>
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
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  Level 1 · Main Module
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {editingMainModule ? "Edit Main Module" : "New Main Module"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Configure track metadata, status, and batch access rules.
                </p>
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
                              },
                              {
                                value: "inactive",
                                label: "Inactive",
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
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  Level 2 · Submodule
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {editingSubmodule ? "Edit Submodule" : "Add Submodule"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Parent: {currentMainModule.name || currentMainModule.title}
                </p>
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
                    variant="blue"
                    options={[
                      {
                        value: "active",
                        label: "Active",
                      },
                      {
                        value: "inactive",
                        label: "Inactive",
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
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  Level 3 · Practice Module
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {editingModule ? "Edit Module" : "Add Module"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Submodule: {currentSubmodule.name || currentSubmodule.title}
                </p>
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
                  className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">Description</label>
                <Textarea
                  placeholder="Short description of this Module..."
                  value={fModDesc}
                  onChange={(e) => setFModDesc(e.target.value)}
                  className="text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Type</label>
                  <MncSelect
                    value={fModType}
                    onChange={(v: any) => setFModType(v)}
                    variant="blue"
                    options={[
                      {
                        value: "mixed",
                        label: "Mixed",
                      },
                      {
                        value: "coding",
                        label: "Code Only",
                      },
                      {
                        value: "mcq",
                        label: "MCQ Only",
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
                      className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      placeholder="e.g. 60"
                      min={1}
                    />
                  ) : (
                    <div
                      onClick={() => setFModDurationEnabled(true)}
                      className="h-9.5 px-3 flex items-center justify-between bg-slate-100 dark:bg-zinc-800/80 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700 text-[11px] text-slate-500 dark:text-zinc-400 font-semibold cursor-pointer hover:border-blue-400 transition-colors"
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
                    className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Status</label>
                  <MncSelect
                    value={fModStatus}
                    onChange={(v: any) => setFModStatus(v)}
                    variant="blue"
                    options={[
                      {
                        value: "active",
                        label: "Active",
                      },
                      {
                        value: "inactive",
                        label: "Inactive",
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
                    className="h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Assessment & Attempt Policy (Source of Truth) */}
              <div className="p-4 bg-slate-100/70 dark:bg-zinc-900/80 rounded-xl border border-slate-200/90 dark:border-zinc-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Assessment &amp; Attempt Policy
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Single Source of Truth
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Defines attempt limits, reattempt permissions, review access, and completion criteria for all students.
                </p>

                {/* Attempt Limits & Passing Marks (Aligned Row) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between h-5">
                      <label className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">
                        Allowed Attempts <span className="text-slate-400 font-normal">(Max Attempts)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !fModUnlimitedAttempts;
                          setFModUnlimitedAttempts(next);
                          if (next) {
                            setFModAllowedAttempts(0);
                          } else {
                            setFModAllowedAttempts(3);
                          }
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-colors flex items-center gap-1.5 ${
                          fModUnlimitedAttempts
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:text-slate-900"
                        }`}
                        title="Toggle unlimited attempts for students"
                      >
                        <span>Unlimited</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${fModUnlimitedAttempts ? "bg-blue-600" : "bg-slate-400"}`} />
                      </button>
                    </div>
                    {fModUnlimitedAttempts ? (
                      <div
                        onClick={() => {
                          setFModUnlimitedAttempts(false);
                          setFModAllowedAttempts(3);
                        }}
                        className="h-9 px-3 flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg border border-dashed border-blue-300 dark:border-blue-700/60 text-[11px] text-blue-700 dark:text-blue-300 font-semibold cursor-pointer hover:border-blue-500 transition-colors"
                        title="Click to set numerical attempt limit"
                      >
                        <span>Unlimited Attempts (No Limit)</span>
                        <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">ACTIVE</span>
                      </div>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={fModAllowedAttempts || ""}
                        onChange={(e) => setFModAllowedAttempts(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-9 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20"
                        placeholder="e.g. 3"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between h-5">
                      <label className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">
                        Passing Marks
                      </label>
                      <button
                        type="button"
                        onClick={() => setFModPassingMarksEnabled(!fModPassingMarksEnabled)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-colors flex items-center gap-1.5 ${
                          fModPassingMarksEnabled
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:text-slate-900"
                        }`}
                        title="Toggle passing score requirement"
                      >
                        <span>{fModPassingMarksEnabled ? "ON" : "OFF"}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${fModPassingMarksEnabled ? "bg-blue-600" : "bg-slate-400"}`} />
                      </button>
                    </div>
                    {fModPassingMarksEnabled ? (
                      <Input
                        type="number"
                        min={0}
                        max={fModMarks}
                        value={fModPassingMarks}
                        onChange={(e) => setFModPassingMarks(Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-9 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20"
                        placeholder="e.g. 40"
                      />
                    ) : (
                      <div
                        onClick={() => setFModPassingMarksEnabled(true)}
                        className="h-9 px-3 flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg border border-dashed border-slate-200 dark:border-zinc-700 text-[11px] text-slate-500 dark:text-zinc-400 font-semibold cursor-pointer hover:border-blue-400 transition-colors"
                        title="Click to turn passing marks ON"
                      >
                        <span>No Passing Mark (All Scores Pass)</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">OFF</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time Marks & Validation Summary */}
                {(() => {
                  const currentTotal = Number(fModMarks) || 100;
                  const currentPassing = Number(fModPassingMarks) || 0;
                  const passingPct = currentTotal > 0 ? Math.round((currentPassing / currentTotal) * 100) : 0;
                  const hasPassingExceeded = fModPassingMarksEnabled && currentPassing > currentTotal;
                  const existingQuestions = editingModule
                    ? [...(editingModule.mcqQuestions || []), ...(editingModule.codingQuestions || [])]
                    : [];
                  const qCount = existingQuestions.length;
                  const sumOfQ = calculateQuestionWeightsSum(existingQuestions);
                  const isMatch = sumOfQ === currentTotal;
                  const diff = currentTotal - sumOfQ;

                  return (
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 dark:text-zinc-400 font-medium">
                          Passing Standard:
                        </span>
                        <span className={`font-semibold ${hasPassingExceeded ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                          {fModPassingMarksEnabled ? `${currentPassing} / ${currentTotal} marks (${passingPct}%)` : "Disabled (No Minimum Score Required)"}
                        </span>
                      </div>
                      {hasPassingExceeded && (
                        <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-900 font-medium">
                          Passing Marks cannot exceed Module Total Marks ({currentTotal}).
                        </div>
                      )}
                      {editingModule && qCount > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 font-medium">Questions: </span>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200">{qCount}</span>
                            <span className="text-slate-400 mx-1">·</span>
                            <span className="text-slate-500 dark:text-zinc-400 font-medium">Sum of Weights: </span>
                            <span className={`font-bold ${isMatch ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {sumOfQ} / {currentTotal}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isMatch
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}>
                            {isMatch ? "Balanced" : diff > 0 ? `${diff} marks unallocated` : `${Math.abs(diff)} marks excess`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                            ? "bg-blue-600 text-white shadow-xs"
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
                            ? "bg-blue-600 text-white shadow-xs"
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
                      variant="blue"
                      options={[
                        { value: "submit", label: "Submit Attempt" },
                        { value: "pass", label: "Passing Marks" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Custom Section Titles Configuration with Add Code / Mixed / MCQ Section Options */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/70 dark:border-blue-800/40 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2.5">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      Section Configuration (Custom Section Names)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Configure sections for this module (e.g. &quot;Core Java MCQs&quot;, &quot;Algorithmic Challenges&quot;).
                    </p>
                  </div>

                  {/* Add Section Type Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const nextIdx = (fModType === "mixed" ? 2 : 1) + fModCustomSections.length + 1;
                        setFModCustomSections([
                          ...fModCustomSections,
                          {
                            id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                            title: `Section ${nextIdx}: Coding Challenges`,
                            type: "coding",
                          },
                        ]);
                        if (fModType === "mcq") setFModType("mixed");
                      }}
                      className="h-7.5 px-3 text-[11px] font-bold rounded-lg border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer shadow-2xs"
                    >
                      + Add Code Section
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const nextIdx = (fModType === "mixed" ? 2 : 1) + fModCustomSections.length + 1;
                        setFModCustomSections([
                          ...fModCustomSections,
                          {
                            id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                            title: `Section ${nextIdx}: MCQs`,
                            type: "mcq",
                          },
                        ]);
                        if (fModType === "coding") setFModType("mixed");
                      }}
                      className="h-7.5 px-3 text-[11px] font-bold rounded-lg border-blue-300 dark:border-blue-800 bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer shadow-2xs"
                    >
                      + Add MCQ Section
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const nextIdx = (fModType === "mixed" ? 2 : 1) + fModCustomSections.length + 1;
                        setFModCustomSections([
                          ...fModCustomSections,
                          {
                            id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                            title: `Section ${nextIdx}: Mixed Assessment`,
                            type: "mixed",
                          },
                        ]);
                        setFModType("mixed");
                      }}
                      className="h-7.5 px-3 text-[11px] font-bold rounded-lg border-indigo-300 dark:border-indigo-800 bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer shadow-2xs"
                    >
                      + Add Mixed Section
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Built-in Base Sections */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(fModType === "mixed" || fModType === "mcq") && (
                      <div className="space-y-1 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                            MCQ Section Name
                          </label>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                            MCQ
                          </span>
                        </div>
                        <Input
                          placeholder="e.g. Section 1: MCQs"
                          value={fModMcqSectionTitle}
                          onChange={(e) => setFModMcqSectionTitle(e.target.value)}
                          className="h-8.5 text-xs bg-slate-50/60 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20"
                        />
                      </div>
                    )}

                    {(fModType === "mixed" || fModType === "coding") && (
                      <div className="space-y-1 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                            Coding Section Name
                          </label>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                            Code
                          </span>
                        </div>
                        <Input
                          placeholder="e.g. Section 2: Coding"
                          value={fModCodingSectionTitle}
                          onChange={(e) => setFModCodingSectionTitle(e.target.value)}
                          className="h-8.5 text-xs bg-slate-50/60 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20"
                        />
                      </div>
                    )}
                  </div>

                  {/* Additional Custom Sections (with Code / Mixed / MCQ toggles) */}
                  {fModCustomSections.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-blue-200/50 dark:border-blue-900/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                          Additional Custom Sections ({fModCustomSections.length})
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                          Select type for each section: MCQ, Code, or Mixed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {fModCustomSections.map((sec, idx) => (
                          <div
                            key={sec.id || idx}
                            className="space-y-2 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs transition-all"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate">
                                Custom Section {idx + 1}
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Type Selector Pills: MCQ | Code | Mixed */}
                                <div className="flex items-center rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-100/80 dark:bg-zinc-800 p-0.5 text-[10px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFModCustomSections((prev) =>
                                        prev.map((s, i) => (i === idx ? { ...s, type: "mcq" as const } : s))
                                      );
                                    }}
                                    className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                      sec.type === "mcq"
                                        ? "bg-blue-600 text-white shadow-2xs"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                                    }`}
                                    title="Set section type to MCQ"
                                  >
                                    MCQ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFModCustomSections((prev) =>
                                        prev.map((s, i) => (i === idx ? { ...s, type: "coding" as const } : s))
                                      );
                                    }}
                                    className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                      sec.type === "coding"
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                                    }`}
                                    title="Set section type to Code"
                                  >
                                    Code
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFModCustomSections((prev) =>
                                        prev.map((s, i) => (i === idx ? { ...s, type: "mixed" as const } : s))
                                      );
                                    }}
                                    className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                      sec.type === "mixed"
                                        ? "bg-indigo-600 text-white shadow-2xs"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                                    }`}
                                    title="Set section type to Mixed"
                                  >
                                    Mixed
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setFModCustomSections((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors"
                                  title="Remove section"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <Input
                              placeholder={`e.g. Section ${idx + 3}: ${sec.type === "coding" ? "Coding Challenges" : sec.type === "mcq" ? "MCQs" : "Mixed Practice"}`}
                              value={sec.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFModCustomSections((prev) =>
                                  prev.map((s, i) => (i === idx ? { ...s, title: val } : s))
                                );
                              }}
                              className="h-8.5 text-xs bg-slate-50/70 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20"
                            />
                          </div>
                        ))}
                      </div>
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
                className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm transition-all"
              >
                {editingModule ? "Save Changes" : "Create Module"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL 3.5: BULK ADD MODULES (LEVEL 3) ─────────────────────────── */}
      {mounted && typeof document !== "undefined" && showBulkModuleModal && currentMainModule && currentSubmodule && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 cursor-pointer" onClick={handleCloseBulkModal} />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-white dark:bg-[#18181B] border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    Level 3 · Bulk Module Creation
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                    Create multiple modules at once
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Add Modules
                </h3>
                <div className="flex items-center gap-2 flex-wrap pt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium">
                    <span className="text-slate-400 dark:text-zinc-500 font-normal">Main Module:</span>{" "}
                    <strong className="text-slate-700 dark:text-zinc-200">{currentMainModule.name || currentMainModule.title}</strong>
                  </span>
                  <span className="text-slate-300 dark:text-zinc-700">/</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 font-medium">
                    <span className="text-slate-400 dark:text-zinc-500 font-normal">Submodule:</span>{" "}
                    <strong className="text-slate-700 dark:text-zinc-200">{currentSubmodule.name || currentSubmodule.title}</strong>
                  </span>
                  <span className="text-slate-300 dark:text-zinc-700">·</span>
                  <span className="text-slate-500 dark:text-zinc-400">
                    Existing Modules: <strong>{currentSubmodule.modules?.length || 0}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseBulkModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation & Controls Bar */}
            <div className="px-6 py-3 bg-slate-50/90 dark:bg-zinc-900/80 border-b border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              {/* Tab Switcher (Visible in Edit step) */}
              {bulkModuleStep === "edit" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkModuleActiveTab("manual");
                      setBulkErrorMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      bulkModuleActiveTab === "manual"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:text-slate-900"
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    MANUAL ENTRY ({bulkManualRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkModuleActiveTab("csv");
                      setBulkErrorMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      bulkModuleActiveTab === "csv"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:text-slate-900"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    CSV IMPORT {bulkCsvRows.length > 0 ? `(${bulkCsvRows.length})` : ""}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Step 2: Review &amp; Confirm Modules
                  </span>
                </div>
              )}

              {/* Auto Display Order Option */}
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={bulkAutoOrder}
                    onChange={(e) => setBulkAutoOrder(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-zinc-700 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Auto assign display order</span>
                </label>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 hidden md:inline">
                  (Starts at #{(currentSubmodule.modules && currentSubmodule.modules.length > 0 ? currentSubmodule.modules.reduce((max, m) => Math.max(max, m.display_order ?? 0), 0) : 0) + 1})
                </span>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs bg-slate-50/50 dark:bg-zinc-950/40">
              {/* ─── VIEW 1: MANUAL BULK ENTRY ─── */}
              {bulkModuleStep === "edit" && bulkModuleActiveTab === "manual" && (
                <div className="space-y-4">
                  {bulkManualRows.map((row, idx) => {
                    const rowNumber = idx + 1;
                    return (
                      <Card
                        key={row.id}
                        className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4.5 shadow-2xs space-y-3.5 transition-all hover:border-slate-300 dark:hover:border-zinc-700"
                      >
                        {/* Row Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800/80">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                              Module {rowNumber}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                              Display Order: {bulkAutoOrder ? `#${((currentSubmodule.modules && currentSubmodule.modules.length > 0 ? currentSubmodule.modules.reduce((max, m) => Math.max(max, m.display_order ?? 0), 0) : 0) + rowNumber)}` : `#${row.displayOrder}`}
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBulkRemoveRow(row.id)}
                            disabled={bulkManualRows.length <= 1}
                            className="h-7 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Remove
                          </Button>
                        </div>

                        {/* Module Name (Required) */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                            Module Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            placeholder="e.g. C Basics, Variables and Data Types, Loops..."
                            value={row.name}
                            onChange={(e) => handleBulkRowChange(row.id, "name", e.target.value)}
                            className="h-9 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20"
                          />
                        </div>

                        {/* Fields Grid: Type, Duration, Total Marks, Passing Marks */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* Type */}
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-zinc-300">Type</label>
                            <MncSelect
                              value={row.type}
                              onChange={(v: any) => handleBulkRowChange(row.id, "type", v)}
                              variant="blue"
                              options={[
                                { value: "mixed", label: "Mixed" },
                                { value: "coding", label: "Code Only" },
                                { value: "mcq", label: "MCQ Only" },
                              ]}
                            />
                          </div>

                          {/* Duration */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="font-semibold text-slate-700 dark:text-zinc-300">Duration (m)</label>
                              <button
                                type="button"
                                onClick={() => handleBulkRowChange(row.id, "durationEnabled", !row.durationEnabled)}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
                                  row.durationEnabled
                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                                }`}
                              >
                                {row.durationEnabled ? "ON" : "OFF"}
                              </button>
                            </div>
                            {row.durationEnabled ? (
                              <Input
                                type="number"
                                value={row.durationMinutes}
                                onChange={(e) => handleBulkRowChange(row.id, "durationMinutes", Math.max(1, parseInt(e.target.value) || 1))}
                                className="h-9 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20"
                                min={1}
                              />
                            ) : (
                              <div
                                onClick={() => handleBulkRowChange(row.id, "durationEnabled", true)}
                                className="h-9 px-3 flex items-center justify-between bg-slate-100 dark:bg-zinc-800/80 rounded-lg border border-dashed border-slate-200 dark:border-zinc-700 text-[11px] text-slate-500 dark:text-zinc-400 font-semibold cursor-pointer"
                              >
                                <span>No Limit</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400">OFF</span>
                              </div>
                            )}
                          </div>

                          {/* Total Marks */}
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-zinc-300">Total Marks</label>
                            <Input
                              type="number"
                              value={row.totalMarks}
                              onChange={(e) => handleBulkRowChange(row.id, "totalMarks", Math.max(1, parseInt(e.target.value) || 1))}
                              className="h-9 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20"
                              min={1}
                            />
                          </div>

                          {/* Passing Marks */}
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-zinc-300">Passing Marks</label>
                            <Input
                              type="number"
                              value={row.passingMarks}
                              onChange={(e) => handleBulkRowChange(row.id, "passingMarks", Math.max(0, parseInt(e.target.value) || 0))}
                              className="h-9 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20"
                              min={0}
                              max={row.totalMarks}
                            />
                          </div>
                        </div>

                        {/* Fields Grid: Status & Display Order */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Status */}
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-zinc-300">Status</label>
                            <MncSelect
                              value={row.status}
                              onChange={(v: any) => handleBulkRowChange(row.id, "status", v)}
                              variant="blue"
                              options={[
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" },
                              ]}
                            />
                          </div>

                          {/* Display Order */}
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-zinc-300">Display Order</label>
                            <Input
                              type="number"
                              value={row.displayOrder}
                              disabled={bulkAutoOrder}
                              onChange={(e) => handleBulkRowChange(row.id, "displayOrder", parseInt(e.target.value) || 0)}
                              className={`h-9 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/20 ${
                                bulkAutoOrder ? "opacity-60 cursor-not-allowed" : ""
                              }`}
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-zinc-300">Description</label>
                          <Textarea
                            placeholder="Brief description of this Module's learning objectives..."
                            value={row.description}
                            onChange={(e) => handleBulkRowChange(row.id, "description", e.target.value)}
                            className="text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg resize-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                            rows={2}
                          />
                        </div>
                      </Card>
                    );
                  })}

                  {/* Add Row Button */}
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBulkAddRow}
                      className="w-full h-10 border-dashed border-2 border-slate-300 dark:border-zinc-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      + Add Another Module
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── VIEW 2: CSV IMPORT ─── */}
              {bulkModuleStep === "edit" && bulkModuleActiveTab === "csv" && (
                <div className="space-y-4">
                  {/* CSV Template Download Banner */}
                  <Card className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/70 dark:border-blue-900/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                        <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Standardized CSV Template
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                        Contains columns: Module Name, Description, Type, Duration, Total Marks, Passing Marks, Status, Display Order.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleDownloadCsvTemplate}
                      className="h-8.5 px-3.5 text-xs font-bold rounded-lg bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 shadow-2xs shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download CSV Template
                    </Button>
                  </Card>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={bulkFileInputRef}
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleBulkCsvFileSelected(e.target.files[0]);
                      }
                      e.target.value = "";
                    }}
                  />

                  {/* Upload Dropzone */}
                  {!bulkCsvFile ? (
                    <div
                      onClick={() => bulkFileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleBulkCsvFileSelected(e.dataTransfer.files[0]);
                        }
                      }}
                      className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-8 text-center cursor-pointer transition-all bg-white dark:bg-[#18181B] group shadow-2xs"
                    >
                      <div className="max-w-md mx-auto space-y-2.5">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                          Click to upload or drag &amp; drop CSV
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                          Supports UTF-8 encoded .csv files up to 5 MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Uploaded File Summary & Validation Breakdown */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3.5 bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {bulkCsvFile.name}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                              {(bulkCsvFile.size / 1024).toFixed(1)} KB · {bulkCsvRows.length} modules detected
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => bulkFileInputRef.current?.click()}
                            className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
                          >
                            Replace File
                          </Button>
                        </div>
                      </div>

                      {/* Stats & Filter Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                            {bulkCsvRows.length} rows detected:
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {bulkCsvRows.filter((r) => r.isValid).length} valid
                          </span>
                          {bulkCsvRows.filter((r) => !r.isValid).length > 0 && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                              {bulkCsvRows.filter((r) => !r.isValid).length} invalid
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setBulkCsvFilter("all")}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              bulkCsvFilter === "all"
                                ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700"
                            }`}
                          >
                            All ({bulkCsvRows.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkCsvFilter("valid")}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              bulkCsvFilter === "valid"
                                ? "bg-emerald-600 text-white"
                                : "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-zinc-700"
                            }`}
                          >
                            Valid ({bulkCsvRows.filter((r) => r.isValid).length})
                          </button>
                          {bulkCsvRows.filter((r) => !r.isValid).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setBulkCsvFilter("invalid")}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                bulkCsvFilter === "invalid"
                                  ? "bg-red-600 text-white"
                                  : "bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 border border-slate-200 dark:border-zinc-700"
                              }`}
                            >
                              Errors ({bulkCsvRows.filter((r) => !r.isValid).length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Error List Alert if any */}
                      {bulkCsvRows.filter((r) => !r.isValid).length > 0 && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl space-y-1.5 text-xs text-red-800 dark:text-red-300">
                          <div className="font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span>Action Required: Please fix the following errors in your CSV:</span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-red-700 dark:text-red-300">
                            {bulkCsvRows
                              .filter((r) => !r.isValid)
                              .slice(0, 5)
                              .map((r) => (
                                <li key={r.rowNumber}>
                                  <strong>Row #{r.rowNumber}:</strong> {r.errors.join(", ")}
                                </li>
                              ))}
                            {bulkCsvRows.filter((r) => !r.isValid).length > 5 && (
                              <li className="font-semibold">
                                + {bulkCsvRows.filter((r) => !r.isValid).length - 5} more invalid row(s)...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* CSV Preview Table */}
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#18181B] shadow-2xs">
                        <div className="overflow-x-auto max-h-[300px]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 font-bold sticky top-0 z-10">
                              <tr>
                                <th className="p-2.5 pl-3">Row</th>
                                <th className="p-2.5">Module Name</th>
                                <th className="p-2.5">Type</th>
                                <th className="p-2.5">Duration</th>
                                <th className="p-2.5">Marks</th>
                                <th className="p-2.5">Status</th>
                                <th className="p-2.5">Order</th>
                                <th className="p-2.5 pr-3 text-right">Validation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                              {bulkCsvRows
                                .filter((r) => {
                                  if (bulkCsvFilter === "valid") return r.isValid;
                                  if (bulkCsvFilter === "invalid") return !r.isValid;
                                  return true;
                                })
                                .map((r) => (
                                  <tr
                                    key={r.rowNumber}
                                    className={r.isValid ? "hover:bg-slate-50/50 dark:hover:bg-zinc-900/40" : "bg-red-50/30 dark:bg-red-950/20"}
                                  >
                                    <td className="p-2.5 pl-3 font-semibold text-slate-500">#{r.rowNumber}</td>
                                    <td className="p-2.5 font-bold text-slate-900 dark:text-white max-w-[200px] truncate" title={r.name}>
                                      {r.name || <span className="text-red-500 italic">Missing name</span>}
                                    </td>
                                    <td className="p-2.5">
                                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                                        {r.type}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-slate-600 dark:text-zinc-400">
                                      {r.durationMinutes > 0 ? `${r.durationMinutes}m` : "Untimed"}
                                    </td>
                                    <td className="p-2.5 font-medium text-slate-700 dark:text-zinc-300">{r.totalMarks}</td>
                                    <td className="p-2.5">
                                      <span
                                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                          r.status === "active"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-slate-100 text-slate-600 border border-slate-200"
                                        }`}
                                      >
                                        {r.status}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-slate-600 dark:text-zinc-400">#{r.displayOrder}</td>
                                    <td className="p-2.5 pr-3 text-right">
                                      {r.isValid ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                          <CheckCircle className="w-3.5 h-3.5" /> Valid
                                        </span>
                                      ) : (
                                        <span
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 cursor-help"
                                          title={r.errors.join("; ")}
                                        >
                                          <AlertCircle className="w-3.5 h-3.5" /> Error
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── VIEW 3: PREVIEW STAGE ("Review Modules") ─── */}
              {bulkModuleStep === "preview" && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 p-3.5 rounded-xl shadow-2xs">
                      <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                        Total Modules
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                        {bulkModuleActiveTab === "manual" ? bulkManualRows.length : bulkCsvRows.length}
                      </div>
                    </Card>

                    <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 p-3.5 rounded-xl shadow-2xs">
                      <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                        Total Marks
                      </div>
                      <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                        {bulkModuleActiveTab === "manual"
                          ? bulkManualRows.reduce((sum, r) => sum + r.totalMarks, 0)
                          : bulkCsvRows.reduce((sum, r) => sum + r.totalMarks, 0)}
                      </div>
                    </Card>

                    <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 p-3.5 rounded-xl shadow-2xs">
                      <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                        Active / Inactive
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 mt-1">
                        {bulkModuleActiveTab === "manual"
                          ? `${bulkManualRows.filter((r) => r.status === "active").length} / ${bulkManualRows.filter((r) => r.status === "inactive").length}`
                          : `${bulkCsvRows.filter((r) => r.status === "active").length} / ${bulkCsvRows.filter((r) => r.status === "inactive").length}`}
                      </div>
                    </Card>

                    <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 p-3.5 rounded-xl shadow-2xs">
                      <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                        Order Sequence
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 mt-1">
                        {bulkAutoOrder ? "Auto-Sequential" : "Custom Order"}
                      </div>
                    </Card>
                  </div>

                  {/* Review Table */}
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#18181B] shadow-2xs">
                    <div className="p-3 bg-slate-50/80 dark:bg-zinc-900/70 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 dark:text-zinc-200">
                        Review Modules to be Created
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Submodule: <strong>{currentSubmodule.name || currentSubmodule.title}</strong>
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-[380px]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 font-bold sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5 pl-3">#</th>
                            <th className="p-2.5">Module Name</th>
                            <th className="p-2.5">Type</th>
                            <th className="p-2.5">Duration</th>
                            <th className="p-2.5">Marks</th>
                            <th className="p-2.5">Pass</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Order</th>
                            <th className="p-2.5 pr-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {(bulkModuleActiveTab === "manual" ? bulkManualRows : bulkCsvRows).map((mod: any, idx: number) => {
                            const maxOrder = (currentSubmodule.modules && currentSubmodule.modules.length > 0)
                              ? currentSubmodule.modules.reduce((max, m) => Math.max(max, m.display_order ?? 0), 0)
                              : 0;
                            const finalOrder = bulkAutoOrder ? maxOrder + 1 + idx : mod.displayOrder;
                            const dur = bulkModuleActiveTab === "manual"
                              ? (mod.durationEnabled ? `${mod.durationMinutes}m` : "Untimed")
                              : (mod.durationMinutes > 0 ? `${mod.durationMinutes}m` : "Untimed");

                            return (
                              <tr key={mod.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40">
                                <td className="p-2.5 pl-3 font-semibold text-slate-500">{idx + 1}</td>
                                <td className="p-2.5">
                                  <div className="font-bold text-slate-900 dark:text-white">{mod.name}</div>
                                  {mod.description && (
                                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 truncate max-w-[280px]">
                                      {mod.description}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                                    {mod.type}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-600 dark:text-zinc-400">{dur}</td>
                                <td className="p-2.5 font-semibold text-slate-800 dark:text-zinc-200">{mod.totalMarks}</td>
                                <td className="p-2.5 text-slate-600 dark:text-zinc-400">{mod.passingMarks}</td>
                                <td className="p-2.5">
                                  <span
                                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                      mod.status === "active"
                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200"
                                    }`}
                                  >
                                    {mod.status}
                                  </span>
                                </td>
                                <td className="p-2.5 font-bold text-slate-700 dark:text-zinc-300">#{finalOrder}</td>
                                <td className="p-2.5 pr-3 text-right">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle className="w-3.5 h-3.5" /> Valid
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Modal Footer */}
            <div className="bg-white dark:bg-[#18181B] border-t border-slate-200/80 dark:border-zinc-800 p-4 space-y-3 shrink-0">
              {/* Error Callout inside footer */}
              {bulkErrorMessage && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span className="flex-1 font-medium">{bulkErrorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                {bulkModuleStep === "preview" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkModuleStep("edit")}
                    disabled={isBulkSubmitting}
                    className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Edit
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseBulkModal}
                    disabled={isBulkSubmitting}
                    className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 cursor-pointer"
                  >
                    Cancel
                  </Button>
                )}

                <div className="flex items-center gap-2.5">
                  {bulkModuleStep === "edit" ? (
                    <Button
                      type="button"
                      onClick={handleValidateAndProceedToPreview}
                      className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm transition-all"
                    >
                      Review Modules ({bulkModuleActiveTab === "manual" ? bulkManualRows.length : bulkCsvRows.length})
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleConfirmBulkSubmit}
                      disabled={isBulkSubmitting || (bulkModuleActiveTab === "csv" && bulkCsvRows.some((r) => !r.isValid))}
                      className="h-9.5 px-6 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isBulkSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Modules...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Create All Modules (
                            {bulkModuleActiveTab === "manual"
                              ? bulkManualRows.length
                              : bulkCsvRows.filter((r) => r.isValid).length}
                            )
                          </span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL 4: VIEW QUESTIONS (WITH DIRECT EDIT & DELETE) ─────────── */}
      {mounted && typeof document !== "undefined" && viewingQuestionsModule && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 cursor-pointer" onClick={() => setViewingQuestionsModule(null)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-white dark:bg-[#18181B] border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
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

            {/* Questions Bulk Delete Toolbar */}
            {selectedViewQuestionKeys.length > 0 && (
              <div className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-2.5 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                    {selectedViewQuestionKeys.length}
                  </span>
                  <span className="text-xs font-bold text-red-800 dark:text-red-300">
                    {selectedViewQuestionKeys.length === 1 ? "1 question selected" : `${selectedViewQuestionKeys.length} questions selected`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedViewQuestionKeys([])}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 underline cursor-pointer ml-1"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkDeleteQuestionsFromView(selectedViewQuestionKeys)}
                    className="h-8 px-3 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs cursor-pointer"
                  >
                    <span>Delete Selected ({selectedViewQuestionKeys.length})</span>
                  </Button>
                </div>
              </div>
            )}

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
                        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={
                              (viewingQuestionsModule.mcqQuestions || []).length > 0 &&
                              (viewingQuestionsModule.mcqQuestions || []).every((_, idx) =>
                                selectedViewQuestionKeys.includes(`mcq_${idx}`)
                              )
                            }
                            onChange={() => {
                              const allMcqKeys = (viewingQuestionsModule.mcqQuestions || []).map((_, idx) => `mcq_${idx}`);
                              const allSelected = allMcqKeys.every((k) => selectedViewQuestionKeys.includes(k));
                              if (allSelected) {
                                setSelectedViewQuestionKeys((prev) => prev.filter((k) => !allMcqKeys.includes(k)));
                              } else {
                                setSelectedViewQuestionKeys((prev) => Array.from(new Set([...prev, ...allMcqKeys])));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                          />
                          <span>Select All MCQs</span>
                        </label>
                      </div>
                      <div className="space-y-2.5">
                        {(viewingQuestionsModule.mcqQuestions || []).map((q, qIdx) => (
                          <div
                            key={q.id || qIdx}
                            className={`p-4 bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors ${
                              selectedViewQuestionKeys.includes(`mcq_${qIdx}`) ? "border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="checkbox"
                                  checked={selectedViewQuestionKeys.includes(`mcq_${qIdx}`)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const key = `mcq_${qIdx}`;
                                    setSelectedViewQuestionKeys((prev) =>
                                      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                                    );
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                  title="Select this question"
                                />
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
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditQuestionFromView(viewingQuestionsModule, "mcq", qIdx)}
                                  className="h-7 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors whitespace-nowrap"
                                >
                                  <Edit3 className="w-3 h-3 text-blue-600" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestionFromView(viewingQuestionsModule, "mcq", qIdx, `MCQ Question #${qIdx + 1}`)}
                                  className="h-7 px-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors whitespace-nowrap"
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
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          {viewingQuestionsModule.codingSectionTitle || "Section 2: Coding"} ({(viewingQuestionsModule.codingQuestions || []).length})
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={
                              (viewingQuestionsModule.codingQuestions || []).length > 0 &&
                              (viewingQuestionsModule.codingQuestions || []).every((_, idx) =>
                                selectedViewQuestionKeys.includes(`coding_${idx}`)
                              )
                            }
                            onChange={() => {
                              const allCodingKeys = (viewingQuestionsModule.codingQuestions || []).map((_, idx) => `coding_${idx}`);
                              const allSelected = allCodingKeys.every((k) => selectedViewQuestionKeys.includes(k));
                              if (allSelected) {
                                setSelectedViewQuestionKeys((prev) => prev.filter((k) => !allCodingKeys.includes(k)));
                              } else {
                                setSelectedViewQuestionKeys((prev) => Array.from(new Set([...prev, ...allCodingKeys])));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                          />
                          <span>Select All Coding</span>
                        </label>
                      </div>
                      <div className="space-y-2.5">
                        {(viewingQuestionsModule.codingQuestions || []).map((cp, cIdx) => {
                          const tcCount = (cp.test_cases?.length || 0) + (cp.sample_test_cases?.length || 0) + (cp.hidden_test_cases?.length || 0);
                          const diff = (cp.difficulty || "medium").toLowerCase();
                          const isCodeLabActive = Boolean(
                            cp.is_codelab === true ||
                            cp.isCodeLab === true ||
                            cp.scope === "codelab" ||
                            cp.scope === "both" ||
                            (typeof cp.starter_code === "object" && (
                              cp.starter_code?.is_codelab === true ||
                              cp.starter_code?.scope === "codelab" ||
                              cp.starter_code?.scope === "both"
                            ))
                          );
                          const isToggling = togglingCodeLabId === (cp.id || `cp-${cIdx}`);

                          return (
                            <div
                              key={cp.id || cIdx}
                              className={`p-4 bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors ${
                                selectedViewQuestionKeys.includes(`coding_${cIdx}`) ? "border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedViewQuestionKeys.includes(`coding_${cIdx}`)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const key = `coding_${cIdx}`;
                                      setSelectedViewQuestionKeys((prev) =>
                                        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                                      );
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    title="Select this question"
                                  />
                                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-300 shrink-0">
                                    #{cp.problem_number || cIdx + 1}.
                                  </span>
                                  <strong className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {cp.title || "Untitled Coding Problem"}
                                  </strong>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                                      diff === "easy"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                        : diff === "hard"
                                        ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                    }`}
                                  >
                                    {cp.difficulty || "Medium"}
                                  </span>
                                  <span className="text-xs text-slate-500 font-semibold shrink-0">
                                    {cp.points || 100} Points
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Code Lab Scope Toggle */}
                                  <div className="h-7 flex items-center gap-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 shadow-2xs">
                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 select-none">
                                      Challenges
                                    </span>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={isCodeLabActive}
                                      disabled={isToggling}
                                      onClick={() => handleToggleCodeLabScope(viewingQuestionsModule, cp, cIdx)}
                                      className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                        isCodeLabActive ? "bg-emerald-600" : "bg-slate-300 dark:bg-zinc-700"
                                      }`}
                                      title={isCodeLabActive ? "Published to Challenges (Click to disable)" : "Practice only (Click to publish to Challenges)"}
                                    >
                                      <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                          isCodeLabActive ? "translate-x-3.5" : "translate-x-0"
                                        }`}
                                      />
                                    </button>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                      isCodeLabActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-zinc-500"
                                    }`}>
                                      {isToggling ? "..." : isCodeLabActive ? "Active" : "Off"}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleEditQuestionFromView(viewingQuestionsModule, "coding", cIdx)}
                                    className="h-7 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors whitespace-nowrap"
                                  >
                                    <Edit3 className="w-3 h-3 text-blue-600" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuestionFromView(viewingQuestionsModule, "coding", cIdx, cp.title || `Coding Problem #${cIdx + 1}`)}
                                    className="h-7 px-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors whitespace-nowrap"
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

      {/* ─── MNC-LEVEL ENTERPRISE DELETE CONFIRMATION MODAL (PURE TEXT & TYPOGRAPHY, NO ICONS) ─── */}
      {mounted && typeof document !== "undefined" && deleteTarget && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 cursor-pointer" 
            onClick={() => { if (!isDeleting) setDeleteTarget(null); }} 
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">
            {/* Top Danger Line */}
            <div className="h-1 w-full bg-red-600" />

            <div className="p-6 sm:p-7 space-y-5">
              {/* Header with Badges & Title (No Icons) */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700">
                      {deleteTarget.type === "main_module" && "Level 1 · Main Module"}
                      {deleteTarget.type === "submodule" && "Level 2 · Submodule"}
                      {deleteTarget.type === "module" && "Level 3 · Practice Module"}
                      {deleteTarget.type === "question" && (deleteTarget.questionType === "coding" ? "Coding Problem" : "MCQ Question")}
                      {deleteTarget.type === "bulk_main_modules" && "Bulk Action · Main Modules"}
                      {deleteTarget.type === "bulk_submodules" && "Bulk Action · Submodules"}
                      {deleteTarget.type === "bulk_modules" && "Bulk Action · Modules"}
                      {deleteTarget.type === "bulk_questions" && "Bulk Action · Questions"}
                    </span>
                    <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-900/50">
                      Critical Action
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {deleteTarget.type === "main_module" && "Delete Main Module"}
                    {deleteTarget.type === "submodule" && "Delete Submodule"}
                    {deleteTarget.type === "module" && "Delete Practice Module"}
                    {deleteTarget.type === "question" && `Delete ${deleteTarget.questionType === "coding" ? "Coding Problem" : "MCQ Question"}`}
                    {deleteTarget.type === "bulk_main_modules" && `Delete ${deleteTarget.count} Main Modules`}
                    {deleteTarget.type === "bulk_submodules" && `Delete ${deleteTarget.count} Submodules`}
                    {deleteTarget.type === "bulk_modules" && `Delete ${deleteTarget.count} Modules`}
                    {deleteTarget.type === "bulk_questions" && `Delete ${deleteTarget.count} Questions`}
                  </h3>
                </div>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Selected Target Summary Card (Clean Text, No Icons) */}
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Target Resource
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                    {deleteTarget.type === "main_module" && `${deleteTarget.subCount} Submodule${deleteTarget.subCount === 1 ? "" : "s"}`}
                    {deleteTarget.type === "submodule" && `${deleteTarget.modCount} Module${deleteTarget.modCount === 1 ? "" : "s"}`}
                    {deleteTarget.type === "module" && `${deleteTarget.questionCount} Question${deleteTarget.questionCount === 1 ? "" : "s"}`}
                    {deleteTarget.type === "question" && "Single Item"}
                    {deleteTarget.type === "bulk_main_modules" && `${deleteTarget.count} Selected`}
                    {deleteTarget.type === "bulk_submodules" && `${deleteTarget.count} Selected`}
                    {deleteTarget.type === "bulk_modules" && `${deleteTarget.count} Selected`}
                    {deleteTarget.type === "bulk_questions" && `${deleteTarget.count} Selected`}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {"title" in deleteTarget
                      ? deleteTarget.title
                      : `${deleteTarget.count} items selected for deletion`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {deleteTarget.type === "main_module" && "All child submodules, modules, and practice questions will be removed."}
                    {deleteTarget.type === "submodule" && "All modules and questions grouped in this submodule will be removed."}
                    {deleteTarget.type === "module" && "All MCQs and coding challenges in this module will be permanently removed."}
                    {deleteTarget.type === "question" && "This question will be permanently removed from this practice module."}
                    {deleteTarget.type === "bulk_main_modules" && "All selected tracks and their full nested hierarchies will be permanently removed."}
                    {deleteTarget.type === "bulk_submodules" && "All selected submodules and their child modules will be permanently removed."}
                    {deleteTarget.type === "bulk_modules" && "All selected practice modules and questions will be permanently removed."}
                    {deleteTarget.type === "bulk_questions" && "The selected questions will be removed and module scores rebalanced."}
                  </p>
                </div>
              </div>

              {/* Enterprise Irreversible Warning Alert (Clean Text Box, No Icons) */}
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 p-4 space-y-1">
                <p className="text-xs font-bold text-red-900 dark:text-red-200 uppercase tracking-wide">
                  Irreversible Action Warning
                </p>
                <p className="text-xs leading-relaxed text-red-800 dark:text-red-300">
                  {deleteTarget.type === "main_module"
                    ? `Deleting Main Module "${deleteTarget.title}" will permanently cascade and erase all nested submodules, modules, test cases, and student progress records. This action cannot be undone.`
                    : deleteTarget.type === "submodule"
                    ? `Deleting Submodule "${deleteTarget.title}" will permanently remove all child modules and associated questions. This action cannot be reversed.`
                    : deleteTarget.type === "module"
                    ? `Deleting Module "${deleteTarget.title}" will remove all practice questions. Once deleted, this data cannot be recovered.`
                    : deleteTarget.type === "question"
                    ? `Are you sure you want to delete "${deleteTarget.title}"? Once confirmed, this item cannot be recovered.`
                    : deleteTarget.type === "bulk_main_modules"
                    ? `Are you sure you want to delete ${deleteTarget.count} selected Main Modules? All nested submodules and questions will be permanently erased.`
                    : deleteTarget.type === "bulk_submodules"
                    ? `Are you sure you want to delete ${deleteTarget.count} selected Submodules? All child modules and questions will be permanently erased.`
                    : deleteTarget.type === "bulk_modules"
                    ? `Are you sure you want to delete ${deleteTarget.count} selected Modules? All questions will be permanently erased.`
                    : `Are you sure you want to delete ${deleteTarget.count} selected questions? Points will be automatically rebalanced.`}
                </p>
              </div>

              {/* Action Buttons (Pure Text, No Icons) */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="h-9 px-4 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDelete}
                  className="h-9 px-5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs transition-all"
                >
                  {isDeleting
                    ? "Deleting..."
                    : deleteTarget.type.startsWith("bulk_")
                    ? `Delete Selected (${"count" in deleteTarget ? deleteTarget.count : ""})`
                    : "Delete Permanently"}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* ─── BULK UPLOAD MODAL (FOR CODING CHALLENGES, MCQS & MIXED) ─────────── */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        moduleType={bulkUploadModuleType}
        moduleTitle={
          targetQuestionUploadModule?.name || currentModule?.name
            ? `${targetQuestionUploadModule?.name || currentModule?.name} — Questions (${
                bulkUploadModuleType === "quiz" || bulkUploadModuleType === "mcq"
                  ? "MCQ & Multi-Select"
                  : bulkUploadModuleType === "mixed_questions" || bulkUploadModuleType === "mixed"
                  ? "Mixed: MCQ + Coding"
                  : "Coding Challenges"
              })`
            : "Practice Module Questions"
        }
        onImport={handleBulkImport}
      />
    </div>
  );
}
