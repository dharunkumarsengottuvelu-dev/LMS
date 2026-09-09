"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Building2, Plus, Search, MoreVertical, Edit2, 
  Trash2, Users, FileSpreadsheet, Lock, Unlock, 
  MapPin, Clock, CalendarDays, RefreshCw, X, ArrowRight,
  Boxes, CheckCircle2, GraduationCap, Calendar, Edit, XCircle, UserPlus, ArrowRightLeft, UserMinus, BookOpen, User, Check,
  UploadCloud, Download, AlertTriangle, LayoutGrid, List, Filter, Layers, Eye, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layouts/page-header";

interface LMSBatch {
  id: string;
  batchName: string;
  collegeName: string;
  code?: string;
  course?: string;
  startDate?: string;
  trainer?: string;
  status: "active" | "inactive";
  studentIds: string[];
}

interface InstitutionItem {
  id: string;
  userId?: string;
  name: string;
  college: string;
  code: string;
  email?: string;
  batchCount?: number;
}

export default function AdminBatchesPage() {
  const { toast } = useToast();
  const [batches, setBatches] = useState<LMSBatch[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Institution Assignment Modal State
  const [isAssignInstitutionModalOpen, setIsAssignInstitutionModalOpen] = useState(false);
  const [assigningBatch, setAssigningBatch] = useState<LMSBatch | null>(null);
  const [selectedInstitutionCollege, setSelectedInstitutionCollege] = useState<string>("none");
  const [customCollegeInput, setCustomCollegeInput] = useState<string>("");
  const [isSavingInstitutionAssignment, setIsSavingInstitutionAssignment] = useState(false);

  // Bulk Upload Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkParsedRows, setBulkParsedRows] = useState<any[]>([]);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [bulkFileError, setBulkFileError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Fetch batches via API
      const res = await fetch("/api/admin/batches");
      if (res.ok) {
        const data = await res.json();
        if (data.batches) {
          setBatches(data.batches);
        }
      }

      // 2. Fetch students
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: sData } = await supabase.from("profiles").select("*").eq("role", "student");
      if (sData) setStudents(sData);

      const { data: cData } = await supabase.from("courses").select("*");
      if (cData) setCourses(cData);

      // 3. Fetch partner institutions
      try {
        const instRes = await fetch("/api/admin/institutions");
        if (instRes.ok) {
          const instData = await instRes.json();
          if (instData.institutions) setInstitutions(instData.institutions);
        }
      } catch (instErr) {
        console.warn("Could not fetch institutions:", instErr);
      }
    } catch (err) {
      console.error("Error loading batches page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [collegeFilter, setCollegeFilter] = useState("all");

  // Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<LMSBatch | null>(null);

  // Form State for Create/Edit Batch (Strictly 5 fields according to requirements)
  const [formBatchName, setFormBatchName] = useState("");
  const [formCollegeName, setFormCollegeName] = useState("");
  const [formTrainer, setFormTrainer] = useState("");
  const [formCourse, setFormCourse] = useState("");
  const [formStartDate, setFormStartDate] = useState("");

  // Drawer / View Students Modal State
  const [viewingBatch, setViewingBatch] = useState<LMSBatch | null>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [globalAssignBatchId, setGlobalAssignBatchId] = useState<string>("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [selectedStudentIdsToAdd, setSelectedStudentIdsToAdd] = useState<string[]>([]);
  const [isAssigningStudents, setIsAssigningStudents] = useState(false);

  // Calculated Metrics
  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.status === "active").length;
  
  // Total assigned student IDs across all batches
  const assignedStudentIds = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.studentIds) b.studentIds.forEach((sid: string) => set.add(sid));
    });
    return set;
  }, [batches]);

  const totalAssignedStudents = assignedStudentIds.size;
  const totalUnassignedStudents = useMemo(() => {
    return students.filter((s) => !assignedStudentIds.has(s.id) && !assignedStudentIds.has(s.user_id)).length;
  }, [students, assignedStudentIds]);

  // Distinct College List for Filter Dropdown
  const distinctColleges = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.collegeName) set.add(b.collegeName);
    });
    institutions.forEach((inst) => {
      if (inst.college) set.add(inst.college);
    });
    return Array.from(set);
  }, [batches, institutions]);

  // Filtered Batches
  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.collegeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.trainer?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesCollege = collegeFilter === "all" || b.collegeName === collegeFilter;

    return matchesSearch && matchesStatus && matchesCollege;
  });

  const handleOpenCreateModal = () => {
    setEditingBatch(null);
    setFormBatchName("");
    setFormCollegeName("");
    setFormTrainer("");
    setFormCourse("");
    setFormStartDate("");
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (batch: LMSBatch) => {
    setEditingBatch(batch);
    setFormBatchName(batch.batchName);
    setFormCollegeName(batch.collegeName || "");
    setFormTrainer(batch.trainer || "");
    setFormCourse(batch.course || "");
    setFormStartDate(batch.startDate || "");
    setIsCreateModalOpen(true);
  };

  // Save Batch (Create / Update)
  const handleSaveBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // RULE 1 & 4: Only Batch Name is required!
    if (!formBatchName.trim()) {
      toast({
        title: "Validation Error",
        description: "Batch name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingBatch) {
        const res = await fetch(`/api/admin/batches/${editingBatch.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchName: formBatchName.trim(),
            collegeName: formCollegeName.trim(),
            leadTrainer: formTrainer.trim(),
            courseTrack: formCourse.trim(),
            startDate: formStartDate || null,
          }),
        });

        if (res.ok) {
          setBatches((prev) =>
            prev.map((b) =>
              b.id === editingBatch.id
                ? {
                    ...b,
                    batchName: formBatchName.trim(),
                    collegeName: formCollegeName.trim(),
                    trainer: formTrainer.trim(),
                    course: formCourse.trim(),
                    startDate: formStartDate || "",
                  }
                : b
            )
          );
          toast({
            title: "Batch Updated",
            description: `Batch "${formBatchName.trim()}" has been updated successfully.`,
          });
        }
      } else {
        const res = await fetch("/api/admin/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchName: formBatchName.trim(),
            collegeName: formCollegeName.trim(),
            leadTrainer: formTrainer.trim(),
            courseTrack: formCourse.trim(),
            startDate: formStartDate || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.batch) {
            setBatches((prev) => [data.batch, ...prev]);
            toast({
              title: "Batch Created Successfully",
              description: `Batch "${formBatchName.trim()}" is now active. You can now add students to this batch.`,
            });
          }
        }
      }
      setIsCreateModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save batch",
        variant: "destructive",
      });
    }
  };

  // Safe Delete Batch (Rule 20)
  const handleDeleteBatch = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete batch "${name}"? This will safely remove batch assignments without deleting students or learning content.`)) {
      try {
        const res = await fetch(`/api/admin/batches/${id}`, { method: "DELETE" });
        if (res.ok) {
          setBatches((prev) => prev.filter((b) => b.id !== id));
          if (viewingBatch?.id === id) setViewingBatch(null);
          toast({
            title: "Batch Deleted",
            description: `Batch "${name}" was safely deleted.`,
          });
        }
      } catch (err) {
        console.error("Error deleting batch:", err);
      }
    }
  };

  // Open Assign to Institution Dialog
  const handleOpenAssignInstitution = (batch: LMSBatch) => {
    setAssigningBatch(batch);
    const existingCollege = batch.collegeName?.trim() || "";
    if (!existingCollege) {
      setSelectedInstitutionCollege("none");
      setCustomCollegeInput("");
    } else {
      const match = institutions.find((i) => i.college.toLowerCase() === existingCollege.toLowerCase());
      if (match) {
        setSelectedInstitutionCollege(match.college);
        setCustomCollegeInput("");
      } else {
        setSelectedInstitutionCollege("custom");
        setCustomCollegeInput(existingCollege);
      }
    }
    setIsAssignInstitutionModalOpen(true);
  };

  // Save Batch Assignment to Institution
  const handleSaveInstitutionAssignment = async () => {
    if (!assigningBatch) return;

    let targetCollege = "";
    if (selectedInstitutionCollege === "custom") {
      targetCollege = customCollegeInput.trim();
    } else if (selectedInstitutionCollege !== "none") {
      targetCollege = selectedInstitutionCollege.trim();
    }

    setIsSavingInstitutionAssignment(true);
    try {
      const res = await fetch(`/api/admin/batches/${assigningBatch.id}/assign-institution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeName: targetCollege }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to assign institution");
      }

      setBatches((prev) =>
        prev.map((b) =>
          b.id === assigningBatch.id ? { ...b, collegeName: targetCollege } : b
        )
      );

      toast({
        title: targetCollege ? "Batch Assigned to Institution" : "Institution Assignment Removed",
        description: targetCollege
          ? `Batch "${assigningBatch.batchName}" is now linked to ${targetCollege}. It will immediately sync to their institution performance portal.`
          : `Batch "${assigningBatch.batchName}" is now unlinked from institutions.`,
      });

      setIsAssignInstitutionModalOpen(false);
      setAssigningBatch(null);
    } catch (err: any) {
      toast({
        title: "Assignment Failed",
        description: err.message || "Failed to update institution assignment",
        variant: "destructive",
      });
    } finally {
      setIsSavingInstitutionAssignment(false);
    }
  };

  // Download Sample Template for Bulk Batches
  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const templateData = [
      ["Batch Name", "College / Institution", "Lead Trainer", "Course Track", "Start Date", "Batch Code"],
      ["Full Stack Java 2026", "SSCET", "Dr. Aris Thorne", "Full Stack Web Development", "2026-09-15", "FS-2026"],
      ["AI & Data Science Batch A", "SSCET", "Sarah Jenkins", "Applied Machine Learning", "2026-10-01", "AI-2026"],
      ["Cloud & DevOps Cohort", "", "Michael Scott", "Cloud Architecture", "2026-10-15", "DEV-2026"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws["!cols"] = [{ wch: 25 }, { wch: 22 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Batches Template");
    XLSX.writeFile(wb, "falcon_batches_bulk_template.xlsx");
  };

  // Handle File Upload (Excel or CSV)
  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileError(null);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("File contains no sheets.");

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error("Worksheet could not be read.");
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) {
        throw new Error("File must contain at least a header row and one batch record.");
      }

      const headers = (rows[0] || []).map((h: any) => String(h || "").trim().toLowerCase());

      const findColIdx = (keywords: string[]) => {
        return headers.findIndex((h: string) => keywords.some((k) => h.includes(k)));
      };

      const nameIdx = findColIdx(["batch name", "cohort", "batch"]);
      const collegeIdx = findColIdx(["college", "institution", "campus"]);
      const trainerIdx = findColIdx(["trainer", "lead trainer", "instructor", "faculty"]);
      const courseIdx = findColIdx(["course", "track", "program"]);
      const dateIdx = findColIdx(["start date", "date", "start"]);
      const codeIdx = findColIdx(["code", "batch code"]);

      const parsed: any[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every((c: any) => !c || String(c).trim() === "")) {
          continue;
        }

        const batchName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "";
        const collegeName = collegeIdx !== -1 && row[collegeIdx] ? String(row[collegeIdx]).trim() : "";
        const leadTrainer = trainerIdx !== -1 && row[trainerIdx] ? String(row[trainerIdx]).trim() : "";
        const courseTrack = courseIdx !== -1 && row[courseIdx] ? String(row[courseIdx]).trim() : "";
        let startDate = dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]).trim() : "";
        const code = codeIdx !== -1 && row[codeIdx] ? String(row[codeIdx]).trim() : "";

        if (typeof row[dateIdx] === "number") {
          const jsDate = new Date(Math.round((row[dateIdx] - 25569) * 86400 * 1000));
          if (!isNaN(jsDate.getTime())) {
            startDate = jsDate.toISOString().split("T")[0] || "";
          }
        }

        const isValid = !!batchName;
        const validationMsg = !batchName ? "Batch Name is required" : undefined;

        parsed.push({
          id: `row-${i}`,
          batchName,
          collegeName,
          leadTrainer,
          courseTrack,
          startDate,
          code,
          isValid,
          validationMsg,
        });
      }

      if (parsed.length === 0) {
        throw new Error("No data rows found in uploaded file.");
      }

      setBulkParsedRows(parsed);
    } catch (err: any) {
      setBulkFileError(err.message || "Failed to parse file. Please verify format.");
    } finally {
      e.target.value = "";
    }
  };

  const handleRemoveBulkRow = (rowId: string) => {
    setBulkParsedRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleExecuteBulkImport = async () => {
    const validRows = bulkParsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast({
        title: "No Valid Batches",
        description: "Please provide at least one batch with a valid Batch Name.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingBulk(true);
    try {
      const res = await fetch("/api/admin/batches/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batches: validRows.map((r) => ({
            batchName: r.batchName,
            collegeName: r.collegeName,
            leadTrainer: r.leadTrainer,
            courseTrack: r.courseTrack,
            startDate: r.startDate,
            code: r.code,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to bulk create batches");
      }

      const data = await res.json();
      if (data.batches && data.batches.length > 0) {
        setBatches((prev) => [...data.batches, ...prev]);
        toast({
          title: "Batches Created Successfully",
          description: `Imported ${data.insertedCount} batches into the system. All institution mappings and cohorts are now active.`,
        });
      }

      setIsBulkModalOpen(false);
      setBulkParsedRows([]);
    } catch (err: any) {
      toast({
        title: "Bulk Import Failed",
        description: err.message || "An error occurred during bulk creation.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const toggleBatchStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/batches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setBatches((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: newStatus as any } : b))
        );
      }
    } catch (err) {
      console.error("Error toggling batch status:", err);
    }
  };

  // Assign Student(s) to Batch (Rule 6 & 7: Supports Multiple Batch Membership)
  const handleAssignStudentsToBatch = async (batchId: string, studentIdsToAssign: string[]) => {
    if (!studentIdsToAssign.length) return;
    setIsAssigningStudents(true);

    try {
      const res = await fetch(`/api/admin/batches/${batchId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: studentIdsToAssign }),
      });

      if (res.ok) {
        setBatches((prev) =>
          prev.map((b) => {
            if (b.id === batchId) {
              const merged = Array.from(new Set([...b.studentIds, ...studentIdsToAssign]));
              return { ...b, studentIds: merged };
            }
            return b;
          })
        );

        if (viewingBatch && viewingBatch.id === batchId) {
          const merged = Array.from(new Set([...viewingBatch.studentIds, ...studentIdsToAssign]));
          setViewingBatch({ ...viewingBatch, studentIds: merged });
        }

        toast({
          title: "Students Assigned",
          description: `Assigned ${studentIdsToAssign.length} student(s) to batch.`,
        });
        setSelectedStudentIdsToAdd([]);
        setIsAddStudentModalOpen(false);
      }
    } catch (err: any) {
      toast({ title: "Assignment Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsAssigningStudents(false);
    }
  };

  // Remove Student from Batch
  const handleRemoveStudentFromBatch = async (batchId: string, studentId: string, studentName: string) => {
    try {
      const res = await fetch(`/api/admin/batches/${batchId}/students?studentId=${studentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setBatches((prev) =>
          prev.map((b) => {
            if (b.id === batchId) {
              return { ...b, studentIds: b.studentIds.filter((id) => id !== studentId) };
            }
            return b;
          })
        );

        if (viewingBatch && viewingBatch.id === batchId) {
          setViewingBatch({
            ...viewingBatch,
            studentIds: viewingBatch.studentIds.filter((id) => id !== studentId),
          });
        }

        toast({
          title: "Student Unassigned",
          description: `${studentName} removed from batch.`,
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Enrolled students in currently viewed batch
  const enrolledStudentsInViewingBatch = useMemo(() => {
    if (!viewingBatch) return [];
    const currentBatchState = batches.find((b) => b.id === viewingBatch.id) || viewingBatch;
    return students.filter(
      (s) => currentBatchState.studentIds.includes(s.id) || currentBatchState.studentIds.includes(s.user_id)
    );
  }, [viewingBatch, batches, students]);

  const effectiveBatchForAssignment = useMemo(() => {
    if (viewingBatch) return batches.find((b) => b.id === viewingBatch.id) || viewingBatch;
    if (globalAssignBatchId) return batches.find((b) => b.id === globalAssignBatchId) || null;
    return batches[0] || null;
  }, [viewingBatch, globalAssignBatchId, batches]);

  // Available students to add (supports multiple batch membership)
  const availableStudentsToAdd = useMemo(() => {
    if (!effectiveBatchForAssignment) return [];
    const currentBatchState = batches.find((b) => b.id === effectiveBatchForAssignment.id) || effectiveBatchForAssignment;
    const assignedIds = currentBatchState.studentIds || [];
    return students.filter((s) => {
      const isAlreadyInThisBatch =
        assignedIds.includes(s.id) ||
        assignedIds.includes(s.user_id);
      if (isAlreadyInThisBatch) return false;

      const name = `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.name || "";
      const email = s.email || "";
      const college = s.college || "";
      const course = s.course || "";

      const matchesSearch =
        name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        email.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        college.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        course.toLowerCase().includes(studentSearchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [effectiveBatchForAssignment, batches, students, studentSearchQuery]);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header & Primary Actions (Falcon / Courses / Practices Style) */}
      <PageHeader
        title="Batch Management"
        description="Configure student cohorts, link academic partner institutions, assign training tracks, and track learner enrollments."
        actions={
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              onClick={() => {
                setBulkParsedRows([]);
                setBulkFileError(null);
                setIsBulkModalOpen(true);
              }}
              variant="outline"
              className="h-[44px] gap-2 px-4 rounded-xl border-[#E5E7EB] dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#27272A] text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-xs transition-all shrink-0"
              title="Bulk create cohorts via spreadsheet"
            >
              <UploadCloud className="h-4 w-4 text-[#2563EB]" />
              <span>Bulk Upload Batches</span>
            </Button>

            <Button
              onClick={handleOpenCreateModal}
              className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2 px-5 rounded-xl shrink-0 shadow-sm text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Batch</span>
            </Button>

            <Button
              onClick={() => {
                setViewingBatch(null);
                if (batches.length > 0 && batches[0]?.id) {
                  setGlobalAssignBatchId(batches[0].id);
                }
                setSelectedStudentIdsToAdd([]);
                setStudentSearchQuery("");
                setIsAddStudentModalOpen(true);
              }}
              className="h-[44px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold gap-2 px-5 rounded-xl shrink-0 shadow-sm text-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Students to Batch</span>
            </Button>
          </div>
        }
      />

      {/* 2. Key Metrics Overview Cards (Clean Typographic Standard - No Icons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider text-[11px]">Total Batches</span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-zinc-700">
              SYSTEM
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#111827] dark:text-[#FAFAFA] font-mono">{totalBatches}</span>
              <span className="text-xs text-[#6B7280] font-medium">Configured</span>
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-slate-900 dark:bg-zinc-400 rounded-full w-full" />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider text-[11px]">Active Cohorts</span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              LIVE
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#16A34A] font-mono">{activeBatches}</span>
              <span className="text-xs text-[#6B7280] font-medium">In Session</span>
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: totalBatches > 0 ? `${Math.round((activeBatches / totalBatches) * 100)}%` : "0%" }}
              />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider text-[11px]">Assigned Learners</span>
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
              ALLOCATED
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#111827] dark:text-[#FAFAFA] font-mono">{totalAssignedStudents}</span>
              <span className="text-xs text-[#6B7280] font-medium">In Batches</span>
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: (totalAssignedStudents + totalUnassignedStudents) > 0
                    ? `${Math.round((totalAssignedStudents / (totalAssignedStudents + totalUnassignedStudents)) * 100)}%`
                    : "0%"
                }}
              />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider text-[11px]">Unassigned Students</span>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              QUEUE
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#F59E0B] font-mono">{totalUnassignedStudents}</span>
              <span className="text-xs text-[#6B7280] font-medium">Awaiting Batch</span>
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{
                  width: (totalAssignedStudents + totalUnassignedStudents) > 0
                    ? `${Math.round((totalUnassignedStudents / (totalAssignedStudents + totalUnassignedStudents)) * 100)}%`
                    : "0%"
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Search & Filter Bar (Matching Courses & Practices) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-3 rounded-xl shadow-sm">
        <div className="relative w-full md:w-[450px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search batches by name, college, course, trainer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-none shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(val: string | null) => setStatusFilter((val as any) || "all")}>
            <SelectTrigger className="h-10 text-xs font-semibold px-3.5 min-w-[140px] rounded-xl border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]">
              <SelectValue placeholder="Status: All">
                {statusFilter === "all" ? "Status: All" : statusFilter === "active" ? "Status: Active" : "Status: Inactive"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All Statuses">All Statuses</SelectItem>
              <SelectItem value="active" label="Active Only">Active Only</SelectItem>
              <SelectItem value="inactive" label="Inactive Only">Inactive Only</SelectItem>
            </SelectContent>
          </Select>

          {/* College Filter */}
          <Select value={collegeFilter} onValueChange={(val: string | null) => setCollegeFilter(val ?? "all")}>
            <SelectTrigger className="h-10 text-xs font-semibold px-3.5 min-w-[160px] rounded-xl border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]">
              <SelectValue placeholder="Institution: All">
                {collegeFilter === "all" ? "Institution: All" : `Institution: ${collegeFilter}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All Institutions">All Institutions</SelectItem>
              {distinctColleges.map((col) => (
                <SelectItem key={col} value={col} label={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "all" || collegeFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setCollegeFilter("all");
              }}
              className="h-10 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 rounded-xl gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4. Batch Catalog Content: Empty State OR Linear Table OR Grid Cards */}
      {filteredBatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl bg-white dark:bg-[#18181B] shadow-sm">
          <h3 className="font-semibold text-lg text-[#111827] dark:text-[#FAFAFA]">No batches found</h3>
          <p className="text-sm text-[#6B7280] mt-1 max-w-sm font-normal">
            {searchQuery ? "No cohorts match your search criteria. Try a different term or clear filters." : "You haven't created any student batches yet. Click the button above to get started."}
          </p>
          {!searchQuery && (
            <Button onClick={handleOpenCreateModal} className="mt-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm gap-2">
              <Plus className="h-4 w-4" /> Create First Batch
            </Button>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* LINEAR ENTERPRISE TABLE (EXACT COURSES & PRACTICES HUB FORMAT) */
        /* ========================================================================= */
        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#27272A] bg-slate-50/70 dark:bg-[#09090B] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Batch Cohort</th>
                  <th className="py-2.5 px-3 w-36">Institution / College</th>
                  <th className="py-2.5 px-3 w-36">Course Track</th>
                  <th className="py-2.5 px-3 w-28">Lead Trainer</th>
                  <th className="py-2.5 px-3 w-24">Learners</th>
                  <th className="py-2.5 px-3 w-28">Commencement</th>
                  <th className="py-2.5 px-3 w-20">Status</th>
                  <th className="py-2.5 px-3 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                {filteredBatches.map((batch, idx) => {
                  const currentStudentCount = batch.studentIds.length;
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/70 dark:hover:bg-[#27272A]/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-xs font-semibold text-slate-400 text-center align-middle">
                        #{idx + 1}
                      </td>

                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white text-xs">
                            {batch.batchName}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold shrink-0">
                            {batch.code || "BAT-ID"}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-middle">
                        {batch.collegeName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50 max-w-[140px] truncate" title={batch.collegeName}>
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{batch.collegeName}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignInstitution(batch)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 underline decoration-dashed whitespace-nowrap"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Link</span>
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-3 align-middle">
                        {batch.course ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 max-w-[140px] truncate" title={batch.course}>
                            {batch.course}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal italic">None</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300 font-medium align-middle">
                        <span className="max-w-[120px] truncate block" title={batch.trainer || "Unassigned"}>
                          {batch.trainer || "-"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingBatch(batch)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                        >
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span>{currentStudentCount} Learners</span>
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono align-middle whitespace-nowrap">
                        {batch.startDate || "-"}
                      </td>

                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize whitespace-nowrap shrink-0 ${
                            batch.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40"
                              : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${batch.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                          <span>{batch.status}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 text-xs whitespace-nowrap">
                          <button
                            onClick={() => setViewingBatch(batch)}
                            className="font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:underline whitespace-nowrap"
                          >
                            Students
                          </button>
                          <span className="text-slate-300 dark:text-zinc-700">|</span>
                          <button
                            onClick={() => handleOpenAssignInstitution(batch)}
                            className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline whitespace-nowrap"
                          >
                            Assign
                          </button>
                          <span className="text-slate-300 dark:text-zinc-700">|</span>
                          <button
                            onClick={() => toggleBatchStatus(batch.id, batch.status)}
                            className="font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:underline whitespace-nowrap"
                          >
                            {batch.status === "active" ? "Pause" : "Resume"}
                          </button>
                          <span className="text-slate-300 dark:text-zinc-700">|</span>
                          <button
                            onClick={() => handleOpenEditModal(batch)}
                            className="font-medium text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 hover:underline whitespace-nowrap"
                          >
                            Edit
                          </button>
                          <span className="text-slate-300 dark:text-zinc-700">|</span>
                          <button
                            onClick={() => handleDeleteBatch(batch.id, batch.batchName)}
                            className="font-medium text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 hover:underline whitespace-nowrap"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT BATCH DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {editingBatch ? "Edit Batch Details" : "Create New Batch"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define a new student cohort batch. Only Batch Name is required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBatchSubmit} className="space-y-4 py-2">
            {/* Field 1: Batch Name (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                Batch Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Java Batch 01"
                value={formBatchName}
                onChange={(e) => setFormBatchName(e.target.value)}
                required
                className="h-10 text-xs font-medium bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 rounded-xl"
              />
            </div>

            {/* Field 2: College / Institution (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  Partner Institution / College <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                {institutions.length > 0 && (
                  <span className="text-[10px] text-blue-600 font-semibold">
                    {institutions.length} partner {institutions.length === 1 ? "institution" : "institutions"} registered
                  </span>
                )}
              </div>

              {institutions.length > 0 && (
                <Select
                  value={
                    institutions.some((i) => i.college.toLowerCase() === formCollegeName.toLowerCase())
                      ? institutions.find((i) => i.college.toLowerCase() === formCollegeName.toLowerCase())?.college || ""
                      : formCollegeName ? "custom" : "none"
                  }
                  onValueChange={(val: string | null) => {
                    if (!val || val === "none") {
                      setFormCollegeName("");
                    } else if (val === "custom") {
                      // Keep current input
                    } else {
                      setFormCollegeName(val);
                    }
                  }}
                >
                  <SelectTrigger className="h-10 text-xs bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 rounded-xl">
                    <SelectValue placeholder="Quick-select partner institution...">
                      {institutions.find((i) => i.college.toLowerCase() === formCollegeName.toLowerCase())?.college 
                        || (formCollegeName ? `Custom: ${formCollegeName}` : "No Institution (Unassigned)")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" label="No Institution (Unassigned)">No Institution (Unassigned)</SelectItem>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.college} label={`${inst.college} (${inst.name})`}>
                        <span className="font-semibold">{inst.college}</span>
                        <span className="text-[11px] text-slate-500 ml-2">({inst.name})</span>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom" label="Other / Custom College Name...">Other / Custom College Name...</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Input
                placeholder="Enter or confirm College Name (e.g. SSCET, PSG Tech)"
                value={formCollegeName}
                onChange={(e) => setFormCollegeName(e.target.value)}
                className="h-10 text-xs bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 rounded-xl"
              />
            </div>

            {/* Field 3: Lead Trainer (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                Lead Trainer <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <Input
                placeholder="Select or enter Trainer (e.g. Dr. Aris Thorne)"
                value={formTrainer}
                onChange={(e) => setFormTrainer(e.target.value)}
                className="h-10 text-xs bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 rounded-xl"
              />
            </div>

            {/* Field 4: Course Track (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                Course Track <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <Select value={formCourse} onValueChange={(val: string | null) => setFormCourse(val || "")}>
                <SelectTrigger className="h-10 text-xs bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 rounded-xl">
                  <SelectValue placeholder="Select Course Track">
                    {formCourse || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {courses && courses.length > 0 ? (
                    courses.map((c) => (
                      <SelectItem key={c.id} value={c.title} label={c.title}>
                        {c.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No course tracks available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Field 5: Start Date (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                Start Date <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <Input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="h-10 text-xs bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-zinc-800 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-10 px-5 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold text-xs rounded-xl shadow-xs"
              >
                {editingBatch ? "Save Changes" : "Create Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: BATCH DETAIL & ENROLLED STUDENTS MANAGEMENT */}
      {/* ========================================================================= */}
      <Dialog open={!!viewingBatch} onOpenChange={(open) => !open && setViewingBatch(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
          {viewingBatch && (
            <>
              <DialogHeader className="pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    {viewingBatch.collegeName && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/40 inline-block mb-1">
                        {viewingBatch.collegeName}
                      </span>
                    )}
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                      {viewingBatch.batchName}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-1">
                      {viewingBatch.course && <>Track: <strong className="text-slate-700 dark:text-zinc-300">{viewingBatch.course}</strong> • </>}
                      {viewingBatch.trainer && <>Lead: <strong className="text-slate-700 dark:text-zinc-300">{viewingBatch.trainer}</strong> • </>}
                      {viewingBatch.startDate && <>Commences: <strong className="text-slate-700 dark:text-zinc-300">{viewingBatch.startDate}</strong></>}
                    </DialogDescription>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedStudentIdsToAdd([]);
                      setIsAddStudentModalOpen(true);
                    }}
                    className="h-9.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold text-xs px-4 rounded-xl shadow-xs shrink-0"
                  >
                    Add Students
                  </Button>
                </div>
              </DialogHeader>

              {/* List of Enrolled Students */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Enrolled Learners ({enrolledStudentsInViewingBatch.length})
                  </h4>
                  <span className="text-xs text-slate-400">
                    Active cohort membership
                  </span>
                </div>

                {enrolledStudentsInViewingBatch.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/50 dark:bg-zinc-900/50 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl space-y-1.5">
                    <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">No Students Enrolled</p>
                    <p className="text-xs text-slate-500">Click &quot;Add Students&quot; to assign learners to this cohort.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800">
                    {enrolledStudentsInViewingBatch.map((std) => {
                      const stdName = `${std.first_name || ""} ${std.last_name || ""}`.trim() || std.name || "Student";
                      const stdIdentifier = std.id || std.user_id;
                      return (
                        <div
                          key={std.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-slate-200 dark:border-zinc-700">
                              <AvatarFallback className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-xs">
                                {stdName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{stdName}</p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {std.email}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStudentFromBatch(viewingBatch.id, stdIdentifier, stdName)}
                            className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg px-3"
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: ADD STUDENTS TO BATCH (Multi-Select Supported) */}
      {/* ========================================================================= */}
      <Dialog open={isAddStudentModalOpen} onOpenChange={setIsAddStudentModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {viewingBatch
                ? `Add Students to ${viewingBatch.batchName}`
                : "Add Students to Batch"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {viewingBatch
                ? "Select registered learners to assign to this batch. Multiple batch membership is supported."
                : "Select target batch and registered learners to assign."}
            </DialogDescription>
          </DialogHeader>

          {!viewingBatch && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                Target Batch <span className="text-rose-500">*</span>
              </label>
              <Select
                value={effectiveBatchForAssignment?.id || ""}
                onValueChange={(val: string | null) => {
                  if (val) {
                    setGlobalAssignBatchId(val);
                    setSelectedStudentIdsToAdd([]);
                  }
                }}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800">
                  <SelectValue placeholder="Select target batch...">
                    {effectiveBatchForAssignment 
                      ? `${effectiveBatchForAssignment.batchName}${effectiveBatchForAssignment.collegeName ? ` (${effectiveBatchForAssignment.collegeName})` : ""}` 
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#18181B] max-h-60">
                  {batches.map((b) => (
                    <SelectItem 
                      key={b.id} 
                      value={b.id}
                      label={`${b.batchName}${b.collegeName ? ` (${b.collegeName})` : ""}`}
                    >
                      <span className="font-semibold text-xs">{b.batchName}</span>
                      {b.collegeName && (
                        <span className="text-[11px] text-slate-500 ml-2">
                          ({b.collegeName})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Input
              placeholder="Search by student name or email..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="h-10 text-xs bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 rounded-xl px-4"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto border border-slate-200/80 dark:border-zinc-800 rounded-2xl divide-y divide-slate-100 dark:divide-zinc-800">
            {availableStudentsToAdd.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No available unassigned students matching search.
              </div>
            ) : (
              availableStudentsToAdd.map((std) => {
                const stdName = `${std.first_name || ""} ${std.last_name || ""}`.trim() || std.name || "Student";
                const stdIdentifier = std.id || std.user_id;
                const isSelected = selectedStudentIdsToAdd.includes(stdIdentifier);

                return (
                  <div
                    key={std.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedStudentIdsToAdd(prev => prev.filter(id => id !== stdIdentifier));
                      } else {
                        setSelectedStudentIdsToAdd(prev => [...prev, stdIdentifier]);
                      }
                    }}
                    className={`p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          if (isSelected) {
                            setSelectedStudentIdsToAdd(prev => prev.filter(id => id !== stdIdentifier));
                          } else {
                            setSelectedStudentIdsToAdd(prev => [...prev, stdIdentifier]);
                          }
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{stdName}</p>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 border border-slate-200 dark:border-zinc-700">
                            Unassigned
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {std.email}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (effectiveBatchForAssignment) {
                          handleAssignStudentsToBatch(effectiveBatchForAssignment.id, [stdIdentifier]);
                        }
                      }}
                      className="h-7.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold text-xs px-3 rounded-lg"
                    >
                      Assign
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddStudentModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-800"
            >
              Close
            </Button>
            {selectedStudentIdsToAdd.length > 0 && effectiveBatchForAssignment && (
              <Button
                onClick={() => handleAssignStudentsToBatch(effectiveBatchForAssignment.id, selectedStudentIdsToAdd)}
                disabled={isAssigningStudents}
                className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold text-xs rounded-xl shadow-xs"
              >
                Assign {selectedStudentIdsToAdd.length} Selected Students
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================       {/* ========================================================================= */}
      {/* MODAL 4: ASSIGN BATCH TO PARTNER INSTITUTION */}
      {/* ========================================================================= */}
      <Dialog open={isAssignInstitutionModalOpen} onOpenChange={setIsAssignInstitutionModalOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Assign Batch to Partner Institution
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Link this cohort to a registered partner institution. All enrolled students, performance telemetry, and assessment scores will automatically synchronize to that institution&apos;s portal.
            </DialogDescription>
          </DialogHeader>

          {assigningBatch && (
            <div className="space-y-4 py-2">
              {/* Batch Info Banner */}
              <div className="bg-slate-50/70 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-zinc-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Target Cohort</span>
                  <span className="font-mono text-[10px] text-slate-500 bg-slate-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    {assigningBatch.code || `ID: ${assigningBatch.id.slice(0, 6)}`}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {assigningBatch.batchName}
                </h4>
                <p className="text-xs text-slate-500">
                  Currently Assigned:{" "}
                  <strong className="text-slate-800 dark:text-zinc-200">
                    {assigningBatch.collegeName || "None (Unassigned)"}
                  </strong>
                </p>
              </div>

              {/* Selector for Batches if opened globally */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  Select Target Batch
                </label>
                <Select
                  value={assigningBatch.id}
                  onValueChange={(val: string | null) => {
                    if (val) {
                      const b = batches.find((item) => item.id === val);
                      if (b) {
                        setAssigningBatch(b);
                        const existingCollege = b.collegeName?.trim() || "";
                        if (!existingCollege) {
                          setSelectedInstitutionCollege("none");
                          setCustomCollegeInput("");
                        } else {
                          const match = institutions.find((i) => i.college.toLowerCase() === existingCollege.toLowerCase());
                          if (match) {
                            setSelectedInstitutionCollege(match.college);
                            setCustomCollegeInput("");
                          } else {
                            setSelectedInstitutionCollege("custom");
                            setCustomCollegeInput(existingCollege);
                          }
                        }
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800">
                    <SelectValue placeholder="Select batch...">
                      {assigningBatch ? `${assigningBatch.batchName}${assigningBatch.collegeName ? ` (${assigningBatch.collegeName})` : ""}` : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {batches.map((b) => (
                      <SelectItem 
                        key={b.id} 
                        value={b.id}
                        label={`${b.batchName}${b.collegeName ? ` (${b.collegeName})` : ""}`}
                      >
                        <span className="font-semibold">{b.batchName}</span>
                        {b.collegeName && <span className="text-[11px] text-slate-500 ml-2">({b.collegeName})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Institution Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  Select Partner Institution <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={selectedInstitutionCollege}
                  onValueChange={(val: string | null) => setSelectedInstitutionCollege(val || "none")}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800">
                    <SelectValue placeholder="Choose an institution...">
                      {selectedInstitutionCollege === "none"
                        ? "None (Unassign from Institution)"
                        : selectedInstitutionCollege === "custom"
                        ? "Other / Custom College Name..."
                        : selectedInstitutionCollege}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="none" label="None (Unassign from Institution)">
                      None (Unassign from Institution)
                    </SelectItem>
                    {institutions.map((inst) => (
                      <SelectItem 
                        key={inst.id} 
                        value={inst.college}
                        label={`${inst.college} (${inst.name} • ${inst.email})`}
                      >
                        <span className="font-semibold">{inst.college}</span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          ({inst.name} • {inst.email})
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom" label="Other / Custom College Name...">
                      Other / Custom College Name...
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Input if selected */}
              {selectedInstitutionCollege === "custom" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Custom College / Institution Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. SSCET or PSG Tech"
                    value={customCollegeInput}
                    onChange={(e) => setCustomCollegeInput(e.target.value)}
                    className="h-10 text-xs bg-slate-50/70 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 rounded-xl"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAssignInstitutionModalOpen(false)}
              disabled={isSavingInstitutionAssignment}
              className="h-10 text-xs rounded-xl border-slate-200 dark:border-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveInstitutionAssignment}
              disabled={
                isSavingInstitutionAssignment ||
                (selectedInstitutionCollege === "custom" && !customCollegeInput.trim())
              }
              className="h-10 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold rounded-xl shadow-xs"
            >
              {isSavingInstitutionAssignment ? "Saving..." : "Confirm & Assign Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: BULK UPLOAD BATCHES (Excel & CSV) */}
      {/* ========================================================================= */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="max-w-3xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  Bulk Create Batches
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Upload an Excel (.xlsx, .xls) or CSV spreadsheet to create multiple batches at once.
                </DialogDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-9 px-3.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 shrink-0"
              >
                Download Template (.xlsx)
              </Button>
            </div>
          </DialogHeader>

          {/* Upload Area / Dropzone */}
          {bulkParsedRows.length === 0 ? (
            <div className="space-y-4 py-3">
              <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600 rounded-2xl p-8 text-center transition-colors bg-slate-50/50 dark:bg-zinc-900/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 bg-slate-200/60 dark:bg-zinc-800 px-2.5 py-1 rounded-md inline-block mb-3">
                  SPREADSHEET IMPORTER
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Drop Batch Spreadsheet Here
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                  Supports .xlsx, .xls, and .csv files. Columns: Batch Name, College / Institution, Lead Trainer, Course Track, Start Date, Batch Code.
                </p>

                <div className="flex justify-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleBulkFileUpload}
                      className="hidden"
                    />
                    <span className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold text-xs shadow-xs transition-all">
                      Browse File
                    </span>
                  </label>
                </div>
              </div>

              {bulkFileError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs">
                  <span>{bulkFileError}</span>
                </div>
              )}

              {/* Tips & Institution info */}
              <div className="bg-slate-50/70 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-zinc-800 p-4 rounded-xl text-xs space-y-1.5 text-slate-500">
                <p className="font-semibold text-slate-900 dark:text-white">Bulk Creation Guidelines:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li><strong>Batch Name</strong> is the only mandatory column. Empty batch name rows are automatically skipped.</li>
                  <li>In <strong>College / Institution</strong> column, specifying a registered partner name (e.g. <code>SSCET</code>) will automatically link the batch to that institution&apos;s portal.</li>
                  <li>In <strong>Lead Trainer</strong> column, entering a trainer&apos;s name or email will automatically link them.</li>
                  <li>If <strong>Batch Code</strong> is blank, a unique code is automatically assigned.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Parsed Batch Table Preview */
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 font-bold text-xs px-2.5 py-1 rounded-md">
                    {bulkParsedRows.filter((r) => r.isValid).length} Valid Batches
                  </span>
                  {bulkParsedRows.some((r) => !r.isValid) && (
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 font-bold text-xs px-2.5 py-1 rounded-md">
                      {bulkParsedRows.filter((r) => !r.isValid).length} Invalid Rows
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBulkParsedRows([])}
                  className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                >
                  Upload Different File
                </Button>
              </div>

              <div className="max-h-[350px] overflow-y-auto border border-slate-200/80 dark:border-zinc-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-zinc-900/70 border-b border-slate-200 dark:border-zinc-800 sticky top-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Batch Name</th>
                      <th className="py-3 px-4">Institution / College</th>
                      <th className="py-3 px-4">Lead Trainer</th>
                      <th className="py-3 px-4">Course Track</th>
                      <th className="py-3 px-4">Start Date</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {bulkParsedRows.map((row) => (
                      <tr key={row.id} className={row.isValid ? "hover:bg-slate-50/50 dark:hover:bg-zinc-900/50" : "bg-rose-50/20 dark:bg-rose-950/10"}>
                        <td className="py-3 px-4">
                          {row.isValid ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded">
                              Valid
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded">
                              Missing Name
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {row.batchName || <span className="text-rose-500 italic">Empty Name</span>}
                        </td>

                        <td className="py-3 px-4">
                          {row.collegeName ? (
                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 rounded">
                              {row.collegeName}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-zinc-400">
                          {row.leadTrainer || "—"}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-zinc-400">
                          {row.courseTrack || "—"}
                        </td>

                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {row.startDate || "—"}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBulkRow(row.id)}
                            className="h-7 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md px-2"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBulkModalOpen(false)}
              disabled={isUploadingBulk}
              className="h-10 text-xs rounded-xl border-slate-200 dark:border-zinc-800"
            >
              Cancel
            </Button>
            {bulkParsedRows.length > 0 && (
              <Button
                onClick={handleExecuteBulkImport}
                disabled={isUploadingBulk || bulkParsedRows.filter((r) => r.isValid).length === 0}
                className="h-10 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold rounded-xl shadow-xs"
              >
                {isUploadingBulk ? "Processing Import..." : `Confirm & Create ${bulkParsedRows.filter((r) => r.isValid).length} Batches`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
