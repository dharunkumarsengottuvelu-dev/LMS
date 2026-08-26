"use client";

import React, { useState, useEffect } from "react";
import { CourseService } from "@/services/course.service";
import {
  BookOpen, Plus, Search, Edit, Trash2, Eye,
  Clock, Users, Sparkles, ArrowLeft, ArrowRight, Layers,
  User, GraduationCap, ListChecks, PlayCircle,
  StickyNote, Code2, FileText, CheckCircle2,
  Check, ShieldCheck,
  UploadCloud, PenSquare, HardDrive, EyeOff,
  Maximize2, Minimize2, ShieldAlert, Lock,
  ChevronDown, ChevronUp, FolderPlus, Folder, ArrowUp, ArrowDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CodingProblemCreator } from "@/components/admin/coding-problem-creator";
import { QuizMcqCreator } from "@/components/admin/quiz-mcq-creator";
import { useLMSStore } from "@/lib/store/lms-store";
import { PageHeader } from "@/components/layouts/page-header";
import { VisibilitySelector } from "@/components/admin/visibility-selector";
import { AutoSaveBadge } from "@/components/ui/auto-save-badge";

// ─── Sub-Module / Lesson Item ──────────────────────────────
export interface CourseSyllabusSubModule {
  id: string;
  title: string;
  duration: string;
  type: "video" | "reading" | "quiz" | "coding";
  videoUrl?: string;
  notes?: string;
  readingMaterial?: string;
  readingContent?: string;
  problemStatement?: string;
  practiceDescription?: string;
  practiceTestCases?: string;
  practiceStarterCode?: string;
  testCases?: string;
  starterCode?: string;
  quizQuestion?: string;
  quizQuestions?: string;
  quizOptions?: string[];
  quizCorrect?: number;
  quizExplanation?: string;
}

// ─── Main Module Container ──────────────────────────────────
export interface CourseSyllabusModule {
  id: string;
  title: string;
  description?: string;
  subModules: CourseSyllabusSubModule[];
  // Legacy backward compatibility fields:
  duration?: string;
  type?: "video" | "reading" | "quiz" | "coding";
  videoUrl?: string;
  notes?: string;
  readingContent?: string;
  practiceDescription?: string;
  practiceTestCases?: string;
  practiceStarterCode?: string;
  quizQuestions?: string;
}

// ─── Managed Course ────────────────────────────────────────
export interface ManagedCourse {
  id: string;
  title: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  status: "published" | "draft";
  enrolledStudents: number;
  totalLessons: number;
  instructor: string;
  durationHours: number;
  durationMins: number;
  description: string;
  thumbnail?: string;
  modules: CourseSyllabusModule[];
  isCommon?: boolean;
  assignedBatches?: string[];
  assignedStudents?: string[];
}

function formatDuration(h: number, m: number) {
  if (h === 0 && m === 0) return "Self-paced";
  return [h > 0 ? `${h}h` : "", m > 0 ? `${m}m` : ""].filter(Boolean).join(" ");
}

export function normalizeCourseModules(rawModules: any[] = []): CourseSyllabusModule[] {
  if (!rawModules || !Array.isArray(rawModules)) return [];
  return rawModules.map((m, idx) => {
    // If it has subModules array already
    if (m.subModules && Array.isArray(m.subModules)) {
      return {
        id: m.id || `mod_${idx + 1}`,
        title: m.title || `Module ${idx + 1}`,
        description: m.description || "",
        subModules: m.subModules.map((sub: any, sIdx: number) => ({
          id: sub.id || `sub_${idx + 1}_${sIdx + 1}`,
          title: sub.title || `Lesson ${idx + 1}.${sIdx + 1}`,
          duration: sub.duration || "45 mins",
          type: sub.type || "video",
          videoUrl: sub.videoUrl || "",
          notes: sub.notes || "",
          readingContent: sub.readingContent || "",
          practiceDescription: sub.practiceDescription || "",
          practiceTestCases: sub.practiceTestCases || "",
          practiceStarterCode: sub.practiceStarterCode || "",
          quizQuestions: sub.quizQuestions || "",
        }))
      };
    }
    // If it's a legacy flat module with direct videoUrl/type/duration
    if (m.type || m.videoUrl || m.duration || m.notes || m.quizQuestions || m.practiceDescription) {
      return {
        id: m.id || `mod_${idx + 1}`,
        title: m.title || `Module ${idx + 1}`,
        description: m.description || "",
        subModules: [
          {
            id: `sub_${m.id || idx + 1}_1`,
            title: m.title || `Lesson ${idx + 1}.1`,
            duration: m.duration || "45 mins",
            type: m.type || "video",
            videoUrl: m.videoUrl || "",
            notes: m.notes || "",
            readingContent: m.readingContent || "",
            practiceDescription: m.practiceDescription || "",
            practiceTestCases: m.practiceTestCases || "",
            practiceStarterCode: m.practiceStarterCode || "",
            quizQuestions: m.quizQuestions || "",
          }
        ]
      };
    }
    // If it's a main module container without subModules
    return {
      id: m.id || `mod_${idx + 1}`,
      title: m.title || `Module ${idx + 1}`,
      description: m.description || "",
      subModules: []
    };
  });
}

function calculateModulesTotalDuration(modules: CourseSyllabusModule[] = []): string {
  let totalMins = 0;
  (modules || []).forEach((m) => {
    (m.subModules || []).forEach((sub) => {
      if (sub && sub.duration) {
        const match = sub.duration.match(/(\d+)/);
        if (match && match[1]) {
          totalMins += parseInt(match[1], 10);
        }
      }
    });
  });
  if (totalMins === 0) return "Self-paced";
  const h = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return formatDuration(h, mins);
}

function getTotalSubModulesCount(modules: CourseSyllabusModule[] = []): number {
  return (modules || []).reduce((acc, m) => acc + (m.subModules ? m.subModules.length : 0), 0);
}

const initialCourses: ManagedCourse[] = [];

type ViewState = "list" | "wizard" | "syllabus" | "add-module" | "edit-module";

export function CourseManagementHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<string[]>([]);
  const [courses, setCourses] = useState<ManagedCourse[]>(initialCourses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/courses");
        const data = await res.json();
        if (data.courses) {
          const normalized = data.courses.map((c: any) => ({
            ...c,
            modules: normalizeCourseModules(c.modules),
          }));
          setCourses(normalized);
        }
        if (data.students) {
          setAllStudents(data.students);
        }
        if (data.batches) {
          setAllBatches(data.batches);
        }
      } catch(err) {
        console.error("Failed to load admin courses", err);
      }
    }
    loadData();
  }, []);

  // Assign Modal State
  const [assigningCourse, setAssigningCourse] = useState<ManagedCourse | null>(null);
  const [isCommon, setIsCommon] = useState<boolean>(true);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assignBatchFilter, setAssignBatchFilter] = useState("all");

  const openAssignModal = (course: ManagedCourse) => {
    setAssigningCourse(course);
    const assigned = course.assignedBatches || [];
    const common = course.isCommon !== undefined ? course.isCommon : assigned.length === 0;
    setIsCommon(common);
    setSelectedBatches(common ? [] : assigned);
    setSelectedStudentIds(course.assignedStudents || []);
    setAssignBatchFilter("all");
  };

  const handleSaveAssignments = async () => {
    if (!assigningCourse) return;
    const updatedCourse: ManagedCourse = {
      ...assigningCourse,
      isCommon,
      assignedBatches: isCommon ? [] : selectedBatches,
      assignedStudents: selectedStudentIds,
      enrolledStudents: selectedStudentIds.length || assigningCourse.enrolledStudents,
    };

    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: updatedCourse }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update course assignment");
      }

      if (data.course && data.course.id) {
        updatedCourse.id = data.course.id;
      }

      setCourses((prev) =>
        prev.map((c) => (c.id === assigningCourse.id ? updatedCourse : c))
      );

      toast({
        title: "Course Visibility & Assignments Updated",
        description: `"${assigningCourse.title}" assigned to ${
          isCommon ? "All Students (Common)" : `${selectedBatches.length} batch(es)`
        }${selectedStudentIds.length > 0 ? ` and ${selectedStudentIds.length} specific learner(s)` : ""}.`,
      });
      setAssigningCourse(null);
    } catch (err: any) {
      console.error("Failed to save course assignments to API", err);
      toast({
        title: "Assignment Failed",
        description: err.message || "Could not save assignments to server. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Multi-Step Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Step 1: Course Metadata
  const [fTitle, setFTitle]           = useState("");
  const [fCategory, setFCategory]     = useState("");
  const [fLevel, setFLevel]           = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [fInstructor, setFInstructor] = useState("");
  const [fDesc, setFDesc]             = useState("");
  const [fThumbnail, setFThumbnail]   = useState("");

  // Step 2: Course Modules Draft (Hierarchical Main Modules containing Sub-Modules)
  const [draftModules, setDraftModules] = useState<CourseSyllabusModule[]>([]);

  // Main Module Dialog State (for creating / editing main modules)
  const [showMainModuleModal, setShowMainModuleModal] = useState(false);
  const [editingMainModuleId, setEditingMainModuleId] = useState<string | null>(null);
  const [mainModuleTitle, setMainModuleTitle] = useState("");
  const [mainModuleDesc, setMainModuleDesc] = useState("");

  // Sub-Module Builder State
  const [targetMainModuleId, setTargetMainModuleId] = useState<string | null>(null);
  const [editingSubModuleId, setEditingSubModuleId] = useState<string | null>(null);
  const [showModuleBuilder, setShowModuleBuilder] = useState(false);
  const [modTitle, setModTitle]         = useState("");
  const [modDurEnabled, setModDurEnabled] = useState(true);
  const [modStartTime, setModStartTime]   = useState("09:00");
  const [modEndTime, setModEndTime]     = useState("09:45");
  const [modDur, setModDur]             = useState("45 mins");
  const [modType, setModType]           = useState<"video" | "reading" | "quiz" | "coding">("video");
  const [modVideoUrl, setModVideoUrl]   = useState("");
  const [modNotes, setModNotes]         = useState("");
  const [modNotesFile, setModNotesFile] = useState<File | null>(null);
  const [modNotesType, setModNotesType] = useState<"text" | "pdf">("text");
  const [modReading, setModReading]     = useState("");
  const [modReadingFile, setModReadingFile] = useState<File | null>(null);
  const [modReadingType, setModReadingType] = useState<"text" | "pdf">("text");
  const [modDesc, setModDesc]           = useState("");
  const [modTestCases, setModTestCases] = useState("");
  const [modStarter, setModStarter]     = useState("");
  const [modQuiz, setModQuiz]           = useState("");

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return "N/A";
    const [sH = 0, sM = 0] = start.split(":").map(Number);
    const [eH = 0, eM = 0] = end.split(":").map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    let diff = endMins - startMins;
    if (diff <= 0) diff += 24 * 60;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} mins`;
    if (hours > 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${mins} mins`;
  };

  const handleTimeChange = (start: string, end: string) => {
    setModStartTime(start);
    setModEndTime(end);
    if (modDurEnabled) {
      setModDur(calculateDuration(start, end));
    }
  };

  const handleToggleDuration = (enabled: boolean) => {
    setModDurEnabled(enabled);
    if (enabled) {
      setModDur(calculateDuration(modStartTime, modEndTime));
    } else {
      setModDur("N/A");
    }
  };

  const resetSubModuleBuilder = () => {
    setEditingSubModuleId(null);
    setModTitle("");
    setModDurEnabled(true);
    setModStartTime("09:00");
    setModEndTime("09:45");
    setModDur("45 mins");
    setModType("video");
    setModVideoUrl("");
    setModNotes("");
    setModNotesFile(null);
    setModNotesType("text");
    setModReading("");
    setModReadingFile(null);
    setModReadingType("text");
    setModDesc("");
    setModTestCases("");
    setModStarter("");
    setModQuiz("");
  };

  // Main Module Handlers
  const openCreateMainModule = () => {
    setEditingMainModuleId(null);
    setMainModuleTitle(`Module ${draftModules.length + 1}: `);
    setMainModuleDesc("");
    setShowMainModuleModal(true);
  };

  const openEditMainModule = (m: CourseSyllabusModule) => {
    setEditingMainModuleId(m.id);
    setMainModuleTitle(m.title);
    setMainModuleDesc(m.description || "");
    setShowMainModuleModal(true);
  };

  const handleSaveMainModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainModuleTitle.trim()) return;

    if (editingMainModuleId) {
      setDraftModules((prev) =>
        prev.map((m) =>
          m.id === editingMainModuleId
            ? { ...m, title: mainModuleTitle.trim(), description: mainModuleDesc.trim() }
            : m
        )
      );
      toast({ title: "Main Module Updated", description: `"${mainModuleTitle}" updated.` });
    } else {
      const newMainMod: CourseSyllabusModule = {
        id: `mod_${Date.now()}`,
        title: mainModuleTitle.trim(),
        description: mainModuleDesc.trim(),
        subModules: [],
      };
      setDraftModules((prev) => [...prev, newMainMod]);
      toast({
        title: "Main Module Created",
        description: `"${mainModuleTitle}" added. Click "+ Add Sub-Module" inside to add lessons.`,
      });
    }
    setShowMainModuleModal(false);
  };

  const handleDeleteMainModule = (id: string, title: string) => {
    setDraftModules((prev) => prev.filter((m) => m.id !== id));
    toast({
      title: "Main Module Removed",
      description: `"${title}" and all its sub-modules were removed.`,
      variant: "destructive",
    });
  };

  const handleMoveMainModule = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draftModules.length) return;
    const newArr = [...draftModules];
    const temp = newArr[index];
    const target = newArr[targetIndex];
    if (temp && target) {
      newArr[index] = target;
      newArr[targetIndex] = temp;
      setDraftModules(newArr);
    }
  };

  // Sub-Module Handlers
  const openAddSubModule = (mainModuleId: string) => {
    setTargetMainModuleId(mainModuleId);
    setEditingSubModuleId(null);
    resetSubModuleBuilder();
    const mainMod = draftModules.find((m) => m.id === mainModuleId);
    const subCount = mainMod ? mainMod.subModules.length : 0;
    const mainIdx = draftModules.findIndex((m) => m.id === mainModuleId);
    setModTitle(`Lesson ${mainIdx + 1}.${subCount + 1}: `);
    setShowModuleBuilder(true);
  };

  const openEditSubModule = (mainModuleId: string, sub: CourseSyllabusSubModule) => {
    setTargetMainModuleId(mainModuleId);
    setEditingSubModuleId(sub.id);
    setModTitle(sub.title);
    setModDur(sub.duration || "45 mins");
    setModDurEnabled(sub.duration !== "N/A" && sub.duration !== "Disabled");
    setModType(sub.type || "video");
    setModVideoUrl(sub.videoUrl || "");
    setModNotes(sub.notes || "");
    setModReading(sub.readingContent || "");
    setModDesc(sub.practiceDescription || "");
    setModTestCases(sub.practiceTestCases || "");
    setModStarter(sub.practiceStarterCode || "");
    setModQuiz(sub.quizQuestions || "");
    setShowModuleBuilder(true);
  };

  const handleSaveSubModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle.trim()) return;

    const activeTargetMainId = targetMainModuleId || (draftModules[0] ? draftModules[0].id : null);
    if (!activeTargetMainId) {
      toast({
        title: "Main Module Required",
        description: "Please create a Main Module first.",
        variant: "destructive",
      });
      return;
    }

    const subItem: CourseSyllabusSubModule = {
      id: editingSubModuleId || `sub_${Date.now()}`,
      title: modTitle.trim(),
      duration: modDur,
      type: modType,
      videoUrl: modType === "video" ? modVideoUrl : undefined,
      notes: modType === "video" ? modNotes : undefined,
      readingContent: modType === "reading" ? modReading : undefined,
      practiceDescription: modType === "coding" ? modDesc : undefined,
      practiceTestCases: modType === "coding" ? modTestCases : undefined,
      practiceStarterCode: modType === "coding" ? modStarter : undefined,
      quizQuestions: modType === "quiz" ? modQuiz : undefined,
    };

    setDraftModules((prev) =>
      prev.map((m) => {
        if (m.id !== activeTargetMainId) {
          if (editingSubModuleId && m.subModules.some((s) => s.id === editingSubModuleId)) {
            return { ...m, subModules: m.subModules.filter((s) => s.id !== editingSubModuleId) };
          }
          return m;
        }

        if (editingSubModuleId) {
          const exists = m.subModules.some((s) => s.id === editingSubModuleId);
          if (exists) {
            return {
              ...m,
              subModules: m.subModules.map((s) => (s.id === editingSubModuleId ? subItem : s)),
            };
          } else {
            return { ...m, subModules: [...m.subModules, subItem] };
          }
        } else {
          return { ...m, subModules: [...m.subModules, subItem] };
        }
      })
    );

    toast({
      title: editingSubModuleId ? "Sub-Module Updated" : "Sub-Module Added",
      description: `"${modTitle}" saved to module.`,
    });
    resetSubModuleBuilder();
    setShowModuleBuilder(false);
  };

  const removeDraftSubModule = (mainModuleId: string, subId: string) => {
    setDraftModules((prev) =>
      prev.map((m) => {
        if (m.id === mainModuleId) {
          return { ...m, subModules: m.subModules.filter((s) => s.id !== subId) };
        }
        return m;
      })
    );
    if (editingSubModuleId === subId) {
      resetSubModuleBuilder();
      setShowModuleBuilder(false);
    }
  };

  const handleMoveSubModule = (mainModuleId: string, subIndex: number, direction: "up" | "down") => {
    setDraftModules((prev) =>
      prev.map((m) => {
        if (m.id !== mainModuleId) return m;
        const targetIdx = direction === "up" ? subIndex - 1 : subIndex + 1;
        if (targetIdx < 0 || targetIdx >= m.subModules.length) return m;
        const newSubs = [...m.subModules];
        const temp = newSubs[subIndex];
        const targetSub = newSubs[targetIdx];
        if (temp && targetSub) {
          newSubs[subIndex] = targetSub;
          newSubs[targetIdx] = temp;
          return { ...m, subModules: newSubs };
        }
        return m;
      })
    );
  };

  // Course Draft State
  const [lastSavedCourseDraft, setLastSavedCourseDraft] = useState<string | null>(null);
  const [isSavedCourseDraft, setIsSavedCourseDraft] = useState<boolean>(true);

  // Restore course draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("draft_course_wizard");
      if (stored) {
        const d = JSON.parse(stored);
        if (d) {
          if (d.fTitle) setFTitle(d.fTitle);
          if (d.fCategory) setFCategory(d.fCategory);
          if (d.fLevel) setFLevel(d.fLevel);
          if (d.fInstructor) setFInstructor(d.fInstructor);
          if (d.fDesc) setFDesc(d.fDesc);
          if (d.fThumbnail) setFThumbnail(d.fThumbnail);
          if (d.draftModules?.length) setDraftModules(normalizeCourseModules(d.draftModules));
          if (d.isCommon !== undefined) setIsCommon(d.isCommon);
          if (d.selectedBatches) setSelectedBatches(d.selectedBatches);
          setLastSavedCourseDraft(d.savedAt || new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.warn("Failed to restore course draft", e);
    }
  }, []);

  // Auto-save draft on changes
  useEffect(() => {
    if (typeof window === "undefined" || viewState !== "wizard" || editingCourseId) return;
    if (!fTitle && !fCategory && !fDesc && draftModules.length === 0) return;
    setIsSavedCourseDraft(false);
    const timer = setTimeout(() => {
      try {
        const d = {
          fTitle, fCategory, fLevel, fInstructor, fDesc, fThumbnail,
          draftModules, isCommon, selectedBatches,
          savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        localStorage.setItem("draft_course_wizard", JSON.stringify(d));
        setIsSavedCourseDraft(true);
        setLastSavedCourseDraft(d.savedAt);
      } catch (e) {
        console.warn("Failed to auto-save course draft", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fTitle, fCategory, fLevel, fInstructor, fDesc, fThumbnail, draftModules, isCommon, selectedBatches, viewState, editingCourseId]);

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) &&
    (categoryFilter === "all" || c.category.toLowerCase().includes(categoryFilter.toLowerCase()))
  );

  const openCreateWizard = () => {
    try {
      localStorage.removeItem("draft_course_wizard");
    } catch {}
    setEditingCourseId(null);
    setFTitle(""); setFCategory(""); setFLevel("Intermediate");
    setFInstructor(""); setFDesc(""); setFThumbnail("");
    setDraftModules([]);
    resetSubModuleBuilder();
    setShowModuleBuilder(false);
    setWizardStep(1);
    setViewState("wizard");
  };

  const openEditWizard = (c: ManagedCourse) => {
    setEditingCourseId(c.id);
    setFTitle(c.title); setFCategory(c.category); setFLevel(c.level);
    setFInstructor(c.instructor); setFDesc(c.description); setFThumbnail(c.thumbnail || "");
    setDraftModules(normalizeCourseModules(c.modules));
    resetSubModuleBuilder();
    setShowModuleBuilder(false);
    setWizardStep(1);
    setViewState("wizard");
  };

  const handlePublishCourse = async () => {
    if (!fTitle) {
      toast({ title: "Title Required", description: "Please enter a course title in Step 1.", variant: "destructive" });
      setWizardStep(1);
      return;
    }

    const totalSubCount = getTotalSubModulesCount(draftModules);

    if (editingCourseId) {
      const existing = courses.find((c) => c.id === editingCourseId);
      const updatedCourse: ManagedCourse = {
        id: editingCourseId,
        title: fTitle,
        category: fCategory || "General",
        level: fLevel,
        instructor: fInstructor || "Course Instructor",
        description: fDesc,
        thumbnail: fThumbnail || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
        modules: draftModules,
        totalLessons: totalSubCount,
        status: existing?.status || "published",
        enrolledStudents: existing?.enrolledStudents || 0,
        durationHours: existing?.durationHours || 0,
        durationMins: existing?.durationMins || 0,
        isCommon: existing?.isCommon,
        assignedBatches: existing?.assignedBatches,
        assignedStudents: existing?.assignedStudents,
      };

      try {
        const res = await fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course: updatedCourse }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Failed to update course");
        }
        if (data.course && data.course.id) {
          updatedCourse.id = data.course.id;
        }
      } catch (err: any) {
        console.error("Failed to update course in API", err);
        toast({ title: "Update Failed", description: err.message || "Failed to save course changes", variant: "destructive" });
        return;
      }

      setCourses((prev) => prev.map((c) => (c.id === editingCourseId ? { ...c, ...updatedCourse } : c)));
      toast({ title: "Course Updated", description: `"${fTitle}" saved successfully.` });
    } else {
      const created: ManagedCourse = {
        id: `mc_${Date.now()}`,
        title: fTitle,
        category: fCategory || "General",
        level: fLevel,
        status: "published",
        enrolledStudents: 0,
        totalLessons: totalSubCount,
        instructor: fInstructor || "Course Instructor",
        durationHours: 0,
        durationMins: 0,
        description: fDesc || "Newly authored enterprise training course.",
        thumbnail: fThumbnail || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
        modules: draftModules,
        isCommon: isCommon,
        assignedBatches: isCommon ? [] : selectedBatches,
      };

      try {
        const res = await fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course: created }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Failed to publish course");
        }
        if (data.course && data.course.id) {
          created.id = data.course.id;
        }
      } catch (err: any) {
        console.error("Failed to save to API", err);
        toast({ title: "Publish Failed", description: err.message || "Could not publish course", variant: "destructive" });
        return;
      }

      setCourses((prev) => [created, ...prev]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("draft_course_wizard");
      }
      toast({ title: "Course Published", description: `"${fTitle}" is live.` });
    }

    setViewState("list");
  };

  const handleToggleStatus = async (id: string) => {
    const course = courses.find((c) => c.id === id);
    if (!course) return;
    const nextStatus = course.status === "published" ? "draft" : "published";
    const updatedCourse = { ...course, status: nextStatus as "published" | "draft" };

    try {
      await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: updatedCourse }),
      });
      setCourses((prev) => prev.map((c) => (c.id === id ? updatedCourse : c)));
      toast({ title: "Status Updated", description: `${course.title} → ${nextStatus.toUpperCase()}` });
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/courses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete request failed");
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Course Deleted", description: title, variant: "destructive" });
    } catch (err) {
      console.error("Failed to delete course", err);
      // Fallback local removal
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Course Removed", description: title });
    }
  };

  // ════════════════════════════════════════════════════════════
  // VIEW: MULTI-STEP WIZARD (PROFESSIONAL MNC STYLING, ZERO EMOJIS)
  // ════════════════════════════════════════════════════════════
  if (viewState === "wizard") {
    return (
      <div className="space-y-8 w-full pb-12">
        {/* Header */}
        <PageHeader
          title={editingCourseId ? "Course Configuration Wizard" : "Enterprise Course Creation Wizard"}
          description="Structured multi-step curriculum authoring"
          backAction={{ label: "Exit Authoring", onClick: () => setViewState("list") }}
          actions={!editingCourseId ? <AutoSaveBadge isSaved={isSavedCourseDraft} lastSaved={lastSavedCourseDraft} /> : undefined}
        />

        {/* STEP PROGRESS INDICATOR */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: 1, title: "1. Basic Metadata", desc: "Title, category & instructor" },
            { step: 2, title: "2. Curriculum Content", desc: "Lessons, code & assessments" },
            { step: 3, title: "3. Review & Deploy", desc: "Verification & deployment" },
          ].map((item) => {
            const isActive = wizardStep === item.step;
            const isCompleted = wizardStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setWizardStep(item.step as 1 | 2 | 3)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? "border-[#2563EB] bg-[#2563EB]/5 dark:bg-[#2563EB]/10"
                    : isCompleted
                    ? "border-[#16A34A] bg-[#16A34A]/5"
                    : "border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? "text-[#2563EB]" : isCompleted ? "text-[#16A34A]" : "text-[#6B7280]"}`}>
                    {item.title}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  ) : (
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isActive ? "bg-[#2563EB] text-white" : "bg-[#E5E7EB] dark:bg-[#27272A] text-[#6B7280]"
                    }`}>
                      {item.step}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280] mt-1">{item.desc}</p>
              </button>
            );
          })}
        </div>

        {/* STEP 1: METADATA */}
        {wizardStep === 1 && (
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA] uppercase tracking-wider">
              Course Overview & Identity
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                <span>Course Title</span>
                <span className="text-[10px] font-semibold text-[#2563EB]">Required</span>
              </label>
              <Input placeholder="e.g. Full Stack Next.js 16 Enterprise Production Architecture"
                value={fTitle} onChange={(e) => setFTitle(e.target.value)} required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Domain Category</label>
                <Input placeholder="e.g. Web Development, Cloud Systems, AI Engineering"
                  value={fCategory} onChange={(e) => setFCategory(e.target.value)} required
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Difficulty Level</label>
                <Select value={fLevel} onValueChange={(v) => setFLevel(v || "Intermediate")}>
                  <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner Level</SelectItem>
                    <SelectItem value="Intermediate">Intermediate Level</SelectItem>
                    <SelectItem value="Advanced">Advanced Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-[#2563EB]" /> Lead Instructor Name
              </label>
              <Input placeholder="e.g. Alex Rivera"
                value={fInstructor} onChange={(e) => setFInstructor(e.target.value)} required
                className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Executive Summary & Learning Outcomes</label>
              <Textarea placeholder="Write course objectives and syllabus takeaways..."
                value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={4}
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                <span>Course Thumbnail Image</span>
                <span className="text-[10px] font-semibold text-[#2563EB]">Upload Local File OR Paste Image URL</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode 1: Manual File Upload from Computer / Device */}
                <div className="relative">
                  <input
                    type="file"
                    id="thumbnail-file-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setFThumbnail(event.target.result as string);
                            toast({ title: "Image Selected", description: `File "${file.name}" loaded for thumbnail.` });
                          }
                        };
                        reader.onerror = () => {
                          toast({ title: "File Error", description: "Failed to read the selected file.", variant: "destructive" });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="thumbnail-file-upload"
                    className="flex items-center justify-center gap-2 h-[48px] px-4 rounded-xl border border-dashed border-[#2563EB]/40 bg-[#2563EB]/5 hover:bg-[#2563EB]/10 text-[#2563EB] text-xs font-bold cursor-pointer transition-all w-full text-center"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Upload Image File from Device</span>
                  </label>
                </div>

                {/* Mode 2: Direct URL Input */}
                <div>
                  <Input
                    placeholder="Or paste image URL (https://...)"
                    value={fThumbnail}
                    onChange={(e) => setFThumbnail(e.target.value)}
                    className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                  />
                </div>
              </div>

              {/* Live Image Preview Box */}
              {fThumbnail && (
                <div className="relative w-full h-44 rounded-xl overflow-hidden border border-[#E5E7EB] dark:border-[#27272A] bg-[#F1F5F9] dark:bg-[#09090B]">
                  <img src={fThumbnail} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <Badge className="bg-[#111827]/80 text-white text-[10px] font-bold">
                      Active Thumbnail
                    </Badge>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 text-[10px] px-2.5 font-bold"
                      onClick={() => setFThumbnail("")}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-end border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" onClick={() => {
                if (!fTitle) {
                  toast({ title: "Title Required", description: "Enter course title to proceed.", variant: "destructive" });
                  return;
                }
                setWizardStep(2);
              }} className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm">
                Next Step: Curriculum Modules
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2: CURRICULUM & CONTENT */}
        {wizardStep === 2 && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
                <div>
                  <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] uppercase tracking-wider">
                    Step 2: Curriculum Structure
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Organize your course into Main Modules with nested Sub-Modules (Videos, Notes, Monaco Coding & Quizzes)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={openCreateMainModule}
                    className="h-10 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm"
                  >
                    + Add Main Module
                  </Button>
                </div>
              </div>

              {draftModules.length === 0 && (
                <div className="text-center py-14 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-[#9CA3AF] bg-[#F9FAFB]/50 dark:bg-[#09090B]/50">
                  <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">No main modules created yet</p>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
                    Start by creating a Main Module (e.g. &quot;Module 1: Java Basics&quot;), then add nested sub-modules and lessons inside it.
                  </p>
                  <Button
                    type="button"
                    onClick={openCreateMainModule}
                    className="mt-4 h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl"
                  >
                    Create First Main Module
                  </Button>
                </div>
              )}

              {/* LIST OF MAIN MODULES */}
              <div className="space-y-6">
                {draftModules.map((mainMod, mIdx) => {
                  const subCount = mainMod.subModules ? mainMod.subModules.length : 0;
                  const mainModDuration = calculateModulesTotalDuration([mainMod]);

                  return (
                    <div
                      key={mainMod.id}
                      className="rounded-2xl border-2 border-[#E5E7EB] dark:border-[#27272A] overflow-hidden bg-[#FAFAFA] dark:bg-[#09090B]/60 shadow-sm"
                    >
                      {/* Main Module Header Bar */}
                      <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <span className="px-2.5 py-1 rounded-lg bg-[#2563EB] text-white font-mono font-bold text-xs shrink-0 tracking-wide">
                            MODULE {mIdx + 1}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-bold text-[#111827] dark:text-[#FAFAFA] text-base truncate">
                              {mainMod.title}
                            </h3>
                            {mainMod.description && (
                              <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">
                                {mainMod.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#2563EB]">
                            {subCount} {subCount === 1 ? "Sub-Module" : "Sub-Modules"}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-mono font-semibold px-2.5 py-1 bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                            {mainModDuration}
                          </Badge>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openAddSubModule(mainMod.id)}
                            className="h-8 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg shadow-sm"
                          >
                            + Add Sub-Module
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditMainModule(mainMod)}
                            className="h-8 px-3 text-xs font-semibold border-[#E5E7EB] dark:border-[#27272A] hover:bg-gray-100 dark:hover:bg-[#27272A]"
                            title="Edit Main Module Title"
                          >
                            Edit
                          </Button>

                          <div className="flex items-center border border-[#E5E7EB] dark:border-[#27272A] rounded-lg overflow-hidden">
                            <button
                              type="button"
                              disabled={mIdx === 0}
                              onClick={() => handleMoveMainModule(mIdx, "up")}
                              className="h-8 px-2.5 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#27272A] disabled:opacity-30 disabled:cursor-not-allowed text-[#6B7280] text-xs font-semibold"
                              title="Move Module Up"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              disabled={mIdx === draftModules.length - 1}
                              onClick={() => handleMoveMainModule(mIdx, "down")}
                              className="h-8 px-2.5 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#27272A] disabled:opacity-30 disabled:cursor-not-allowed text-[#6B7280] border-l border-[#E5E7EB] dark:border-[#27272A] text-xs font-semibold"
                              title="Move Module Down"
                            >
                              Down
                            </button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMainModule(mainMod.id, mainMod.title)}
                            className="h-8 px-3 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg"
                            title="Delete Main Module"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Sub-Modules Container */}
                      <div className="p-4 sm:p-5 space-y-3">
                        {subCount === 0 ? (
                          <div className="p-5 text-center rounded-xl border border-dashed border-[#2563EB]/30 bg-white dark:bg-[#18181B]">
                            <p className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">
                              No sub-modules in this main module yet.
                            </p>
                            <p className="text-[11px] text-[#6B7280] mt-0.5">
                              Add video lessons, reading materials, coding tasks or quiz assessments.
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openAddSubModule(mainMod.id)}
                              className="mt-3 h-8 px-3 text-xs font-semibold text-[#2563EB] border-[#2563EB]/40 hover:bg-[#2563EB]/10 rounded-lg"
                            >
                              + Add First Sub-Module
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {mainMod.subModules.map((sub, sIdx) => (
                              <div
                                key={sub.id}
                                className="p-3.5 bg-white dark:bg-[#18181B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="w-8 h-8 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 text-[#2563EB] font-bold text-xs flex items-center justify-center border border-[#2563EB]/20 shrink-0">
                                    {mIdx + 1}.{sIdx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-[#111827] dark:text-[#FAFAFA] text-xs truncate">
                                      {sub.title}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <Badge className="text-[9px] font-bold uppercase tracking-wider bg-[#2563EB] text-white">
                                        {sub.type}
                                      </Badge>
                                      {sub.videoUrl && (
                                        <Badge variant="outline" className="text-[9px] font-semibold text-[#2563EB] border-[#2563EB]/30 py-0 bg-[#2563EB]/5">
                                          Video Link
                                        </Badge>
                                      )}
                                      {sub.notes && (
                                        <Badge variant="outline" className="text-[9px] font-semibold text-[#16A34A] border-[#16A34A]/30 py-0 bg-[#16A34A]/5">
                                          Notes
                                        </Badge>
                                      )}
                                      {sub.readingContent && (
                                        <Badge variant="outline" className="text-[9px] font-semibold text-[#16A34A] border-[#16A34A]/30 py-0 bg-[#16A34A]/5">
                                          Document
                                        </Badge>
                                      )}
                                      {sub.practiceDescription && (
                                        <Badge variant="outline" className="text-[9px] font-semibold text-[#2563EB] border-[#2563EB]/30 py-0 bg-[#2563EB]/5">
                                          Monaco Code
                                        </Badge>
                                      )}
                                      {sub.quizQuestions && (
                                        <Badge variant="outline" className="text-[9px] font-semibold text-[#D97706] border-[#D97706]/30 py-0 bg-[#D97706]/5">
                                          Quiz
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  <Badge variant="outline" className="text-[11px] font-mono font-semibold px-2.5 py-0.5 border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                                    {sub.duration}
                                  </Badge>

                                  <div className="flex items-center border border-[#E5E7EB] dark:border-[#27272A] rounded-md overflow-hidden">
                                    <button
                                      type="button"
                                      disabled={sIdx === 0}
                                      onClick={() => handleMoveSubModule(mainMod.id, sIdx, "up")}
                                      className="h-7 px-2 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#27272A] disabled:opacity-30 disabled:cursor-not-allowed text-[#6B7280] text-[11px] font-semibold"
                                      title="Move Sub-Module Up"
                                    >
                                      Up
                                    </button>
                                    <button
                                      type="button"
                                      disabled={sIdx === mainMod.subModules.length - 1}
                                      onClick={() => handleMoveSubModule(mainMod.id, sIdx, "down")}
                                      className="h-7 px-2 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#27272A] disabled:opacity-30 disabled:cursor-not-allowed text-[#6B7280] border-l border-[#E5E7EB] dark:border-[#27272A] text-[11px] font-semibold"
                                      title="Move Sub-Module Down"
                                    >
                                      Down
                                    </button>
                                  </div>

                                  <Button
                                    type="button"
                                    onClick={() => openEditSubModule(mainMod.id, sub)}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 text-xs font-semibold border-[#D97706] text-[#D97706] hover:bg-[#D97706]/10 rounded-md"
                                  >
                                    Edit
                                  </Button>

                                  <Button
                                    type="button"
                                    onClick={() => removeDraftSubModule(mainMod.id, sub.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 rounded-md"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* SUB-MODULE BUILDER CARD */}
            {showModuleBuilder && (
              <Card className="bg-white dark:bg-[#18181B] border-2 border-[#2563EB] p-6 rounded-2xl space-y-5 shadow-md">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                      {editingSubModuleId ? "Edit Sub-Module / Lesson" : "Sub-Module Content Authoring"}
                    </h3>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      Configuring lesson for: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">
                        {draftModules.find((m) => m.id === targetMainModuleId)?.title || "Main Module"}
                      </span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { resetSubModuleBuilder(); setShowModuleBuilder(false); }}
                    className="text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                </div>

                <form onSubmit={handleSaveSubModule} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Sub-Module / Lesson Title</label>
                      <Input
                        placeholder="e.g. 1.2 Video Lesson: Variables and Data Types"
                        value={modTitle}
                        onChange={(e) => setModTitle(e.target.value)}
                        required
                        className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Delivery Type</label>
                      <Select value={modType} onValueChange={(v) => setModType((v as "video" | "reading" | "quiz" | "coding") || "video")}>
                        <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video Lesson & Notes</SelectItem>
                          <SelectItem value="coding">Coding Challenge (Monaco Editor)</SelectItem>
                          <SelectItem value="reading">Reading Material & Documentation</SelectItem>
                          <SelectItem value="quiz">Quiz Assessment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Estimated Lesson Duration</label>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#6B7280] font-medium">
                            {modDurEnabled ? "Enabled" : "Off"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleDuration(!modDurEnabled)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              modDurEnabled ? "bg-[#2563EB]" : "bg-gray-300 dark:bg-gray-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                modDurEnabled ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {modDurEnabled ? (
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="text-[10px] text-[#6B7280]">Start Time</span>
                            <Input
                              type="time"
                              value={modStartTime}
                              onChange={(e) => handleTimeChange(e.target.value, modEndTime)}
                              className="h-[40px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#6B7280]">End Time</span>
                            <Input
                              type="time"
                              value={modEndTime}
                              onChange={(e) => handleTimeChange(modStartTime, e.target.value)}
                              className="h-[40px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#6B7280]">Duration</span>
                            <div className="h-[40px] px-3 flex items-center text-xs font-semibold text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl">
                              {modDur}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[44px] px-3 flex items-center text-xs text-[#6B7280] italic bg-gray-100 dark:bg-[#18181B] rounded-xl border border-dashed border-[#E5E7EB] dark:border-[#27272A]">
                          Duration tracking is turned off for this lesson.
                        </div>
                      )}
                    </div>
                  </div>

                  {modType === "video" && (
                    <div className="p-5 rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5 space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                          <span>Video Link</span>
                          <span className="text-[10px] font-medium text-[#6B7280] bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] px-2 py-0.5 rounded-md">
                            Google Drive or YouTube
                          </span>
                        </label>
                        <Input
                          type="url"
                          placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                          value={modVideoUrl}
                          onChange={(e) => setModVideoUrl(e.target.value)}
                          className="h-[44px] text-xs rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                        />
                        <div className="p-3 bg-white dark:bg-[#09090B] border border-[#2563EB]/20 rounded-lg">
                          <div className="text-[10px] text-[#6B7280] leading-relaxed">
                            <p className="font-semibold text-[#2563EB] mb-0.5">Google Drive format:</p>
                            <p className="font-mono break-all">https://drive.google.com/file/d/<span className="text-[#2563EB]">FILE_ID</span>/view?usp=sharing</p>
                            <p className="mt-1">Make sure the file is shared as <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">&quot;Anyone with the link&quot;</span> in Drive settings.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                            Lesson Notes
                          </label>
                          <div className="flex items-center bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-lg p-0.5 gap-0.5">
                            <button
                              type="button"
                              onClick={() => setModNotesType("text")}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                modNotesType === "text"
                                  ? "bg-[#2563EB] text-white shadow-sm"
                                  : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                              }`}
                            >
                              Write Notes
                            </button>
                            <button
                              type="button"
                              onClick={() => setModNotesType("pdf")}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                modNotesType === "pdf"
                                  ? "bg-[#2563EB] text-white shadow-sm"
                                  : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                              }`}
                            >
                              Upload PDF
                            </button>
                          </div>
                        </div>

                        {modNotesType === "text" ? (
                          <Textarea
                            placeholder="# Key Concepts&#10;- Concept 1..."
                            value={modNotes}
                            onChange={(e) => setModNotes(e.target.value)}
                            rows={5}
                            className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                          />
                        ) : (
                          <div className="relative">
                            <label
                              htmlFor="notes-pdf-wizard"
                              className="flex flex-col items-center justify-center w-full h-[120px] border-2 border-dashed border-[#2563EB]/40 rounded-xl bg-white dark:bg-[#09090B] cursor-pointer hover:bg-[#2563EB]/5 transition-colors text-center p-4"
                            >
                              {modNotesFile ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] max-w-[250px] truncate">{modNotesFile.name}</p>
                                  <p className="text-[10px] text-[#6B7280]">{(modNotesFile.size / 1024).toFixed(1)} KB — click to replace</p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-[#6B7280]">Click to upload PDF or Markdown file</p>
                                  <p className="text-[10px] text-[#9CA3AF]">PDF, DOC, DOCX, MD — max 20MB</p>
                                </div>
                              )}
                            </label>
                            <input
                              id="notes-pdf-wizard"
                              type="file"
                              accept=".pdf,.doc,.docx,.md"
                              className="sr-only"
                              onChange={(e) => setModNotesFile(e.target.files?.[0] ?? null)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {modType === "reading" && (
                    <div className="p-5 rounded-xl border border-[#16A34A]/20 bg-[#16A34A]/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Full Article Document</label>
                        <div className="flex items-center gap-1 p-1 bg-[#16A34A]/10 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setModReadingType("text")}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${modReadingType === "text" ? "bg-white dark:bg-[#27272A] text-[#16A34A] shadow-sm" : "text-[#16A34A]/70 hover:text-[#16A34A]"}`}
                          >
                            Write Text
                          </button>
                          <button
                            type="button"
                            onClick={() => setModReadingType("pdf")}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${modReadingType === "pdf" ? "bg-white dark:bg-[#27272A] text-[#16A34A] shadow-sm" : "text-[#16A34A]/70 hover:text-[#16A34A]"}`}
                          >
                            Upload File
                          </button>
                        </div>
                      </div>

                      {modReadingType === "text" ? (
                        <Textarea
                          placeholder="Write documentation and lesson text here..."
                          value={modReading}
                          onChange={(e) => setModReading(e.target.value)}
                          rows={6}
                          className="text-xs font-sans rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                        />
                      ) : (
                        <div className="relative">
                          <label
                            htmlFor="reading-pdf-wizard"
                            className="flex flex-col items-center justify-center w-full h-[120px] border-2 border-dashed border-[#16A34A]/40 rounded-xl bg-white dark:bg-[#09090B] cursor-pointer hover:bg-[#16A34A]/5 transition-colors text-center p-4"
                          >
                            {modReadingFile ? (
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] max-w-[250px] truncate">{modReadingFile.name}</p>
                                <p className="text-[10px] text-[#6B7280]">{(modReadingFile.size / 1024).toFixed(1)} KB — click to replace</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-[#6B7280]">Click to upload Document / Presentation</p>
                                <p className="text-[10px] text-[#9CA3AF]">PDF, DOC, DOCX, PPT, PPTX — max 20MB</p>
                              </div>
                            )}
                          </label>
                          <input
                            id="reading-pdf-wizard"
                            type="file"
                            accept=".pdf,.doc,.docx,.ppt,.pptx"
                            className="sr-only"
                            onChange={(e) => setModReadingFile(e.target.files?.[0] ?? null)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {((modType as string) === "coding" || (modType as string) === "mixed") && (
                    <div className="p-6 rounded-2xl border border-[#2563EB]/20 bg-[#2563EB]/5 space-y-6">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                        Coding Problem Specifications & Test Cases
                      </div>
                      <CodingProblemCreator
                        inline
                        initialTitle={modTitle || "Find the Largest Element"}
                        initialDescription={modDesc}
                        onChange={(problem) => {
                          if (!modTitle && problem.title) setModTitle(problem.title);
                          setModDesc(problem.description);
                          setModStarter(Object.values(problem.templates)[0] || "");
                          setModTestCases(problem.publicTestCases.map((t) => `${t.input} -> ${t.expected_output}`).join("\n"));
                        }}
                      />
                    </div>
                  )}

                  {((modType as string) === "quiz" || (modType as string) === "mixed") && (
                    <div className="p-6 rounded-2xl border border-[#D97706]/20 bg-[#D97706]/5 space-y-6">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#D97706]">
                        Quiz / MCQ Specifications
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Quiz MCQ Items</label>
                        <QuizMcqCreator value={modQuiz} onChange={setModQuiz} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { resetSubModuleBuilder(); setShowModuleBuilder(false); }}
                      className="h-10 text-xs font-semibold rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl"
                    >
                      {editingSubModuleId ? "Update Sub-Module" : "Save Sub-Module"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWizardStep(1)}
                className="h-[48px] px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]"
              >
                Previous Step
              </Button>
              <Button
                type="button"
                onClick={() => setWizardStep(3)}
                className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm"
              >
                Next Step: Review & Deploy
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & PUBLISH */}
        {wizardStep === 3 && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm space-y-6">
              <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] uppercase tracking-wider">
                Step 3: Verification & Deployment
              </h2>

              <div className="p-6 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-semibold border-[#2563EB]/30 text-[#2563EB]">
                    {fCategory || "General"}
                  </Badge>
                  <Badge className="bg-[#16A34A] text-white text-xs">{fLevel}</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">{fTitle || "Untitled Course"}</h3>
                  <p className="text-xs text-[#6B7280] mt-1">Instructor: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{fInstructor || "Course Instructor"}</span></p>
                  <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">{fDesc || "No description provided."}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] text-xs">
                  <div>
                    <span className="text-[#6B7280]">Calculated Duration:</span>
                    <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">{calculateModulesTotalDuration(draftModules)}</p>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Main Modules:</span>
                    <p className="font-bold text-[#2563EB]">{draftModules.length} Modules</p>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Total Sub-Modules:</span>
                    <p className="font-bold text-[#16A34A]">{getTotalSubModulesCount(draftModules)} Lessons</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] uppercase tracking-wider">
                  Curriculum Structure Breakdown:
                </h4>
                {draftModules.length === 0 ? (
                  <p className="text-xs text-[#6B7280]">No modules configured in curriculum draft.</p>
                ) : (
                  <div className="space-y-3">
                    {draftModules.map((m, idx) => (
                      <div key={m.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">
                            Module {idx + 1}: {m.title}
                          </span>
                          <Badge variant="outline" className="text-[11px] font-semibold text-[#2563EB] border-[#2563EB]/30">
                            {m.subModules?.length || 0} Sub-Modules
                          </Badge>
                        </div>
                        {m.subModules && m.subModules.length > 0 && (
                          <div className="pl-4 space-y-1.5 border-l-2 border-[#2563EB]/20 mt-2">
                            {m.subModules.map((sub, sIdx) => (
                              <div key={sub.id} className="flex items-center justify-between text-xs text-[#6B7280]">
                                <span>{idx + 1}.{sIdx + 1} {sub.title}</span>
                                <Badge className="text-[9px] bg-[#2563EB] text-white capitalize">{sub.type} ({sub.duration})</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <Button type="button" variant="outline" onClick={() => setWizardStep(2)} className="h-[48px] px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]">
                  Previous Step
                </Button>
                <Button type="button" onClick={handlePublishCourse} className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-md">
                  {editingCourseId ? "Deploy & Update Course" : "Deploy & Publish Course"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── CREATE / EDIT MAIN MODULE MODAL DIALOG ── */}
        <Dialog open={showMainModuleModal} onOpenChange={setShowMainModuleModal}>
          <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-6 space-y-4">
            <DialogHeader className="space-y-1.5 text-left border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
              <DialogTitle className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
                {editingMainModuleId ? "Edit Main Module" : "Create New Main Module"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                Main Modules group related sub-modules, video lessons, and exercises together.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveMainModule} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Main Module Title <span className="text-[#DC2626]">*</span>
                </label>
                <Input
                  placeholder="e.g. Module 1: Java Foundations & Object-Oriented Principles"
                  value={mainModuleTitle}
                  onChange={(e) => setMainModuleTitle(e.target.value)}
                  required
                  className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Module Description (Optional)
                </label>
                <Textarea
                  placeholder="Brief summary of concepts covered in this module..."
                  value={mainModuleDesc}
                  onChange={(e) => setMainModuleDesc(e.target.value)}
                  rows={3}
                  className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>

              <DialogFooter className="pt-3 gap-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMainModuleModal(false)}
                  className="h-10 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm"
                >
                  {editingMainModuleId ? "Update Module" : "Create Module"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VIEW: SYLLABUS DIRECT VIEW
  // ════════════════════════════════════════════════════════════
  if (viewState === "syllabus" && selectedCourse) return (
    <div className="space-y-8 w-full">
      <PageHeader
        title={selectedCourse.title}
        description={`${selectedCourse.category} • ${selectedCourse.level} • Instructor: ${selectedCourse.instructor}`}
        backAction={{ label: "Back to Courses", onClick: () => setViewState("list") }}
        actions={
          <Button onClick={() => openEditWizard(selectedCourse)}
            className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs gap-2 px-5 rounded-xl shrink-0 shadow-sm">
            <Edit className="h-4 w-4" /> Edit Course Structure
          </Button>
        }
      />

      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-4">
          <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] uppercase tracking-wider">
            Course Syllabus
          </h2>
          <Badge variant="outline" className="text-xs font-mono font-semibold text-[#2563EB]">
            Total: {calculateModulesTotalDuration(selectedCourse.modules)}
          </Badge>
        </div>

        {selectedCourse.modules.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl text-[#9CA3AF]">
            <p className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">No modules configured for this course yet.</p>
            <Button onClick={() => openEditWizard(selectedCourse)} size="sm" className="mt-3 bg-[#2563EB] text-white font-semibold text-xs rounded-xl">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Curriculum Modules
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {selectedCourse.modules.map((mainMod, mIdx) => (
              <div key={mainMod.id} className="p-5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-[#2563EB] text-white font-mono font-bold text-xs">
                      MODULE {mIdx + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{mainMod.title}</h3>
                      {mainMod.description && <p className="text-[11px] text-[#6B7280] mt-0.5">{mainMod.description}</p>}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold text-[#2563EB]">
                    {mainMod.subModules?.length || 0} Lessons
                  </Badge>
                </div>

                {mainMod.subModules && mainMod.subModules.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
                    {mainMod.subModules.map((sub, sIdx) => (
                      <div key={sub.id} className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-[#2563EB]/10 text-[#2563EB] font-bold text-[10px] flex items-center justify-center shrink-0">
                            {mIdx + 1}.{sIdx + 1}
                          </span>
                          <span className="font-semibold text-[#111827] dark:text-[#FAFAFA] truncate">{sub.title}</span>
                          <Badge className="text-[9px] bg-[#2563EB] text-white capitalize shrink-0">{sub.type}</Badge>
                        </div>
                        <span className="text-[11px] font-mono text-[#6B7280] shrink-0">{sub.duration}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // VIEW: LIST COURSES
  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8">
      <PageHeader
        title={role === "admin" ? "Enterprise Course & Curriculum Management" : "Assigned Training Courses"}
        description="Author courses with step-by-step wizard (Course Info → Curriculum Modules → Review & Deploy)"
        actions={
          <Button onClick={openCreateWizard}
            className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2 px-5 rounded-xl shrink-0 shadow-sm">
            <Plus className="h-4 w-4" /> Author New Course
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2 rounded-xl shadow-sm">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input placeholder="Search courses by title or instructor..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-none shadow-none focus-visible:ring-0 w-full rounded-lg" />
        </div>
        <div className="flex items-center w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#27272A] pt-3 md:pt-0 md:pl-4">
          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
            <SelectTrigger className="h-10 text-xs w-full md:w-[220px] bg-transparent border-none shadow-none focus:ring-0">
              <SelectValue placeholder="Filter by category..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Web Development">Web Development</SelectItem>
              <SelectItem value="AI & Machine Learning">AI & Machine Learning</SelectItem>
              <SelectItem value="Cloud Computing">Cloud Computing</SelectItem>
              <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Course Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((course) => (
          <Card key={course.id}
            className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors">
            {course.thumbnail && (
              <div className="relative w-full h-36 overflow-hidden border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F1F5F9]">
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
              </div>
            )}
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-semibold border-[#2563EB]/30 text-[#2563EB]">
                  {course.category}
                </Badge>
                <Badge className={course.status === "published" ? "bg-[#16A34A] text-white text-[10px] font-medium" : "bg-[#6B7280] text-white text-[10px] font-medium"}>
                  {course.status}
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-base text-[#111827] dark:text-[#FAFAFA] leading-snug">{course.title}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-[10px] font-medium">{course.level}</Badge>
                  <span className="text-xs text-[#6B7280]">Instructor: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{course.instructor}</span></span>
                </div>
                <p className="text-xs text-[#6B7280] line-clamp-2 mt-1.5 leading-relaxed">{course.description}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6B7280] pt-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <span className="flex items-center gap-1 font-bold text-[#111827] dark:text-[#FAFAFA]">
                  <Users className="h-3.5 w-3.5 text-[#2563EB]" /> {course.enrolledStudents} Learners
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-[#2563EB]" /> {course.totalLessons} Lessons
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#16A34A]" /> {calculateModulesTotalDuration(course.modules)}
                </span>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button onClick={() => openAssignModal(course)} size="sm"
                  className="w-full h-9 text-[13px] font-bold gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-all hover:-translate-y-[1px]">
                  <Users className="h-4 w-4" /> Assign Course
                </Button>
                <div className="flex items-center justify-between gap-2 w-full">
                  <Button onClick={() => { setSelectedCourse(course); setViewState("syllabus"); }}
                    variant="outline" size="sm"
                    className="flex-1 h-8 text-[11px] font-semibold gap-1 border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/5 px-1 shadow-sm transition-colors">
                    <Eye className="h-3 w-3 shrink-0" /> Syllabus
                  </Button>
                  <Button onClick={() => openEditWizard(course)} variant="outline" size="sm"
                    className="flex-1 h-8 text-[11px] font-semibold gap-1 border-[#D97706]/40 text-[#D97706] hover:bg-[#D97706]/5 px-1 shadow-sm transition-colors">
                    <Edit className="h-3 w-3 shrink-0" /> Edit
                  </Button>
                  <Button onClick={() => handleToggleStatus(course.id)} variant="outline" size="sm"
                    className={`flex-1 h-8 text-[11px] font-semibold px-1 shadow-xs transition-colors ${
                      course.status === "published"
                        ? "text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                        : "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
                    }`}>
                    {course.status === "published" ? (
                      <>
                        <EyeOff className="h-3 w-3 shrink-0 mr-1" /> Unpublish
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3 w-3 shrink-0 mr-1" /> Publish
                      </>
                    )}
                  </Button>
                  <Button onClick={() => handleDeleteCourse(course.id, course.title)} variant="outline" size="icon"
                    className="h-8 w-8 shrink-0 text-[#DC2626] border-[#DC2626]/30 hover:bg-[#DC2626]/10 hover:border-[#DC2626]/50 shadow-sm transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── ASSIGN COURSE MODAL DIALOG ── */}
      {assigningCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <div>
                <h3 className="font-bold text-lg text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#2563EB]" /> Assign Course
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">{assigningCourse.title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAssigningCourse(null)} className="h-8 w-8 p-0 rounded-full">
                ✕
              </Button>
            </div>

            {/* Visibility & Batch Selection */}
            <div className="space-y-3">
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

            {/* Individual Student Selection */}
            <div className="space-y-3 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Assign to Specific Students ({selectedStudentIds.length} enrolled)
                </label>
                <Select value={assignBatchFilter} onValueChange={(v) => setAssignBatchFilter(v || "all")}>
                  <SelectTrigger className="h-8 text-xs w-[140px] bg-[#F9FAFB] dark:bg-[#09090B]">
                    <SelectValue placeholder="Filter batch..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {allBatches.map((b: any) => {
                      const bName = typeof b === "string" ? b : (b.name || b.batch_name || b.id || "Batch");
                      const bKey = typeof b === "string" ? b : (b.id || b.name || Math.random().toString());
                      return (
                        <SelectItem key={bKey} value={bName}>{bName}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {allStudents
                  .filter((s) => assignBatchFilter === "all" || s.batch === assignBatchFilter)
                  .map((s) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <label key={s.id} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${isChecked ? "bg-[#2563EB]/10 border-[#2563EB]/40" : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"}`}>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds((prev) => [...prev, s.id]);
                              } else {
                                setSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                          />
                          <div>
                            <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">{s.name}</p>
                            <p className="text-[10px] text-[#6B7280]">{s.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px]">{s.batch}</Badge>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button variant="outline" onClick={() => setAssigningCourse(null)} className="h-10 text-xs font-semibold">
                Cancel
              </Button>
              <Button onClick={handleSaveAssignments} className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl gap-2">
                <Check className="h-4 w-4" /> Save Assignments
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
