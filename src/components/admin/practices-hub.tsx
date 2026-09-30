"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CodingProblemCreator } from "@/components/admin/coding-problem-creator";

// ─── TYPES FOR STRICT 3-LEVEL HIERARCHY ──────────────────────────────
export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MCQQuestion {
  id: string;
  questionText: string;
  options: MCQOption[];
  explanation?: string;
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

  // Module Questions Editor State
  const [activeTab, setActiveTab] = useState<"mcq" | "coding">("mcq");
  const [mcqList, setMcqList] = useState<MCQQuestion[]>([]);
  const [codingList, setCodingList] = useState<any[]>([]);

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
  }, [fetchData]);

  // Derived current Main Module and Submodule
  const currentMainModule = useMemo(() => {
    if (!selectedMainModuleId) return null;
    return tracks.find((t) => t.id === selectedMainModuleId) || null;
  }, [tracks, selectedMainModuleId]);

  const currentSubmodule = useMemo(() => {
    if (!currentMainModule || !selectedSubmoduleId) return null;
    return currentMainModule.submodules.find((s) => s.id === selectedSubmoduleId) || null;
  }, [currentMainModule, selectedSubmoduleId]);

  const currentModule = useMemo(() => {
    if (!currentSubmodule || !selectedModuleId) return null;
    return currentSubmodule.modules.find((m) => m.id === selectedModuleId) || null;
  }, [currentSubmodule, selectedModuleId]);

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

  const handleDeleteMainModule = async (m: PracticeMainModule, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete Main Module "${m.name || m.title}" and all its submodules? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/practices?id=${m.id}&type=main_module`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast({ title: "Deleted", description: "Main Module deleted successfully" });
      if (selectedMainModuleId === m.id) {
        setSelectedMainModuleId(null);
        setActiveLevel("main_modules");
      }
      await fetchData();
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    }
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

  const handleDeleteSubmodule = async (sm: PracticeSubmodule, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentMainModule) return;
    if (!window.confirm(`Delete Submodule "${sm.name || sm.title}" and all its modules? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/practices?id=${sm.id}&type=submodule&main_module_id=${currentMainModule.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast({ title: "Deleted", description: "Submodule deleted successfully" });
      if (selectedSubmoduleId === sm.id) {
        setSelectedSubmoduleId(null);
        setActiveLevel("submodules");
      }
      await fetchData();
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    }
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

  const handleDeleteModule = async (m: PracticeModule, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentMainModule || !currentSubmodule) return;
    if (!window.confirm(`Delete Module "${m.name || m.title}"? This will remove its questions.`)) {
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/practices?id=${m.id}&type=module&main_module_id=${currentMainModule.id}&submodule_id=${currentSubmodule.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast({ title: "Deleted", description: "Module deleted successfully" });
      if (selectedModuleId === m.id) {
        setSelectedModuleId(null);
        setActiveLevel("modules");
      }
      await fetchData();
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    }
  };

  // 4. OPEN MODULE QUESTIONS EDITOR
  const handleOpenModuleEditor = (m: PracticeModule) => {
    setSelectedModuleId(m.id);
    setMcqList(m.mcqQuestions || []);
    setCodingList(m.codingQuestions || []);
    setActiveTab(m.type === "coding" ? "coding" : "mcq");
    setActiveLevel("module_editor");
  };

  const handleSaveModuleQuestions = async () => {
    if (!currentMainModule || !currentSubmodule || !currentModule) return;

    try {
      const res = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_module",
          main_module_id: currentMainModule.id,
          submodule_id: currentSubmodule.id,
          id: currentModule.id,
          name: currentModule.name,
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
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              3-Level Dynamic Practice Hierarchy: Main Module &gt; Submodule &gt; Module
            </p>
          </div>

          {/* Top Level Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {activeLevel === "main_modules" && (
              <Button
                type="button"
                onClick={handleOpenAddMainModule}
                className="h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
              >
                [ + Add Main Module ]
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
                  [ &lt; Back to Main Modules ]
                </Button>
                <Button
                  type="button"
                  onClick={handleOpenAddSubmodule}
                  className="h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                >
                  [ + Add Submodule ]
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
                  [ &lt; Back to Submodules ]
                </Button>
                <Button
                  type="button"
                  onClick={handleOpenAddModule}
                  className="h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                >
                  [ + Add Module ]
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
                  [ &lt; Back to Modules ]
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveModuleQuestions}
                  className="h-9 px-4 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                >
                  [ Save Questions &amp; Exit ]
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

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
                    [ Add Main Module ]
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
                          {isActive ? "[ ACTIVE ]" : "[ INACTIVE ]"}
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
                        className="w-full h-8 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                      >
                        [ View Submodules ({subCount}) &gt; ]
                      </Button>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditMainModule(m, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          [ Edit ]
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleMainModuleStatus(m, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          {isActive ? "[ Deactivate ]" : "[ Activate ]"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMainModule(m, e)}
                          className="h-7 rounded border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                        >
                          [ Delete ]
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
                    [ Add Submodule ]
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
                          {isActive ? "[ ACTIVE ]" : "[ INACTIVE ]"}
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
                        className="w-full h-8 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                      >
                        [ View Modules ({modCount}) &gt; ]
                      </Button>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditSubmodule(sm, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          [ Edit ]
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSubmoduleStatus(sm, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          {isActive ? "[ Deactivate ]" : "[ Activate ]"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSubmodule(sm, e)}
                          className="h-7 rounded border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                        >
                          [ Delete ]
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
            <span className="text-slate-500 dark:text-zinc-400 font-medium">
              Modules Count: {currentSubmodule.modules.length}
            </span>
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
                    [ Add Module ]
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
                          {isActive ? "[ ACTIVE ]" : "[ INACTIVE ]"}
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
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                      <Button
                        type="button"
                        onClick={() => handleOpenModuleEditor(mod)}
                        className="w-full h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                      >
                        [ Manage Questions &amp; Coding ({qCount}) ]
                      </Button>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModule(mod, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          [ Edit ]
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleModuleStatus(mod, e)}
                          className="h-7 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          {isActive ? "[ Deactivate ]" : "[ Activate ]"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteModule(mod, e)}
                          className="h-7 rounded border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                        >
                          [ Delete ]
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
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                PRACTICE CONTENT RUNNER
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Content for: {currentModule.name || currentModule.title}
              </h2>
            </div>

            {/* Tab switch */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("mcq")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  activeTab === "mcq"
                    ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                MCQ Questions ({mcqList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("coding")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  activeTab === "coding"
                    ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                Coding Problems ({codingList.length})
              </button>
            </div>
          </div>

          {/* MCQ TAB CONTENT */}
          {activeTab === "mcq" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Multiple Choice Questions ({mcqList.length})
                </h3>
                <Button
                  type="button"
                  onClick={() => {
                    const newQ: MCQQuestion = {
                      id: `mcq_${Date.now()}`,
                      questionText: "",
                      options: [
                        { id: `opt_${Date.now()}_1`, text: "", isCorrect: true },
                        { id: `opt_${Date.now()}_2`, text: "", isCorrect: false },
                        { id: `opt_${Date.now()}_3`, text: "", isCorrect: false },
                        { id: `opt_${Date.now()}_4`, text: "", isCorrect: false },
                      ],
                    };
                    setMcqList([...mcqList, newQ]);
                  }}
                  className="h-8 px-3.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                >
                  [ + Add MCQ Question ]
                </Button>
              </div>

              {mcqList.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-500 dark:text-zinc-400">
                  No MCQ questions added yet. Click [ + Add MCQ Question ] above.
                </div>
              ) : (
                <div className="space-y-4">
                  {mcqList.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="p-4 bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          Question #{qIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMcqList(mcqList.filter((item) => item.id !== q.id))}
                          className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
                        >
                          [ Delete Question ]
                        </button>
                      </div>

                      <Textarea
                        placeholder="Enter question text here..."
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

                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                          Answer Options (Select correct radio):
                        </span>
                        {q.options.map((opt, optIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
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
                              className="cursor-pointer"
                            />
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
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                [ CORRECT ]
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CODING TAB CONTENT */}
          {activeTab === "coding" && (
            <div className="space-y-4">
              <CodingProblemCreator
                onSave={(newProb: any) => {
                  const problemToSave = {
                    ...newProb,
                    assessment_id: currentModule.id,
                    module_id: currentModule.id,
                  };
                  setCodingList([...codingList, problemToSave]);
                  toast({ title: "Coding Problem Added", description: `Added: ${newProb?.title || "New Problem"}` });
                }}
              />

              {codingList.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase">
                    Configured Coding Problems ({codingList.length})
                  </h4>
                  <div className="space-y-2">
                    {codingList.map((cp, idx) => (
                      <div
                        key={cp.id || idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs"
                      >
                        <div>
                          <strong className="text-slate-900 dark:text-white font-bold">{cp.title}</strong>
                          <span className="ml-2 text-slate-500">[{cp.difficulty || "Medium"}]</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCodingList(codingList.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:underline font-semibold cursor-pointer"
                        >
                          [ Remove ]
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ─── MODAL 1: CREATE / EDIT MAIN MODULE ─────────────────────────── */}
      {showMainModuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">LEVEL 1</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingMainModule ? "Edit Main Module" : "Add Main Module"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMainModuleModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                [ Close ]
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">
                  Main Module Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Java Programming, System Design, Algorithms..."
                  value={fMainName}
                  onChange={(e) => setFMainName(e.target.value)}
                  className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Description</label>
                <Textarea
                  placeholder="Short description of this Main Module..."
                  value={fMainDesc}
                  onChange={(e) => setFMainDesc(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Status</label>
                  <Select value={fMainStatus} onValueChange={(v: any) => setFMainStatus(v)}>
                    <SelectTrigger className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">[ ACTIVE ]</SelectItem>
                      <SelectItem value="inactive">[ INACTIVE ]</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Display Order</label>
                  <Input
                    type="number"
                    value={fMainOrder}
                    onChange={(e) => setFMainOrder(parseInt(e.target.value) || 0)}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Cohort / Batch Visibility</label>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="chk_common"
                    checked={fMainIsCommon}
                    onChange={(e) => setFMainIsCommon(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <label htmlFor="chk_common" className="cursor-pointer text-slate-800 dark:text-zinc-200">
                    Make Common (Visible to all assigned student batches)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMainModuleModal(false)}
                className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                [ Cancel ]
              </Button>
              <Button
                type="button"
                onClick={handleSaveMainModule}
                className="h-8 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
              >
                [ {editingMainModule ? "Save Changes" : "Create Main Module"} ]
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CREATE / EDIT SUBMODULE ────────────────────────────── */}
      {showSubmoduleModal && currentMainModule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">LEVEL 2</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingSubmodule ? "Edit Submodule" : "Add Submodule"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Parent: {currentMainModule.name || currentMainModule.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmoduleModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                [ Close ]
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">
                  Submodule Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Basics, Data Structures, OOP..."
                  value={fSubName}
                  onChange={(e) => setFSubName(e.target.value)}
                  className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Description</label>
                <Textarea
                  placeholder="Short description of this Submodule..."
                  value={fSubDesc}
                  onChange={(e) => setFSubDesc(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Status</label>
                  <Select value={fSubStatus} onValueChange={(v: any) => setFSubStatus(v)}>
                    <SelectTrigger className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">[ ACTIVE ]</SelectItem>
                      <SelectItem value="inactive">[ INACTIVE ]</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Display Order</label>
                  <Input
                    type="number"
                    value={fSubOrder}
                    onChange={(e) => setFSubOrder(parseInt(e.target.value) || 0)}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSubmoduleModal(false)}
                className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                [ Cancel ]
              </Button>
              <Button
                type="button"
                onClick={handleSaveSubmodule}
                className="h-8 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
              >
                [ {editingSubmodule ? "Save Changes" : "Create Submodule"} ]
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: CREATE / EDIT MODULE ──────────────────────────────── */}
      {showModuleModal && currentMainModule && currentSubmodule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">LEVEL 3</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingModule ? "Edit Module" : "Add Module"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Submodule: {currentSubmodule.name || currentSubmodule.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModuleModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                [ Close ]
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">
                  Module Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Variables & Data Types, Binary Search..."
                  value={fModName}
                  onChange={(e) => setFModName(e.target.value)}
                  className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Description</label>
                <Textarea
                  placeholder="Short description of this Module..."
                  value={fModDesc}
                  onChange={(e) => setFModDesc(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Type</label>
                  <Select value={fModType} onValueChange={(v: any) => setFModType(v)}>
                    <SelectTrigger className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed (MCQ + Code)</SelectItem>
                      <SelectItem value="mcq">MCQ Only</SelectItem>
                      <SelectItem value="coding">Coding Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-zinc-300">Duration (m)</label>
                    <button
                      type="button"
                      onClick={() => setFModDurationEnabled(!fModDurationEnabled)}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
                        fModDurationEnabled
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                      }`}
                    >
                      {fModDurationEnabled ? "[ ON ]" : "[ OFF ]"}
                    </button>
                  </div>
                  {fModDurationEnabled ? (
                    <Input
                      type="number"
                      value={fModDuration}
                      onChange={(e) => setFModDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                      placeholder="e.g. 60"
                      min={1}
                    />
                  ) : (
                    <div
                      onClick={() => setFModDurationEnabled(true)}
                      className="h-8.5 px-2.5 flex items-center justify-between bg-slate-100 dark:bg-zinc-800/80 rounded-md border border-dashed border-slate-200 dark:border-zinc-700 text-[11px] text-slate-500 dark:text-zinc-400 font-semibold cursor-pointer hover:border-blue-400"
                      title="Click to turn duration ON"
                    >
                      <span>No Time Limit</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">[ OFF ]</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Total Marks</label>
                  <Input
                    type="number"
                    value={fModMarks}
                    onChange={(e) => setFModMarks(parseInt(e.target.value) || 100)}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Status</label>
                  <Select value={fModStatus} onValueChange={(v: any) => setFModStatus(v)}>
                    <SelectTrigger className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">[ ACTIVE ]</SelectItem>
                      <SelectItem value="inactive">[ INACTIVE ]</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Display Order</label>
                  <Input
                    type="number"
                    value={fModOrder}
                    onChange={(e) => setFModOrder(parseInt(e.target.value) || 0)}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModuleModal(false)}
                className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                [ Cancel ]
              </Button>
              <Button
                type="button"
                onClick={handleSaveModule}
                className="h-8 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
              >
                [ {editingModule ? "Save Changes" : "Create Module"} ]
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
