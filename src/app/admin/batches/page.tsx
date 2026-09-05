"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Building2, Plus, Search, MoreVertical, Edit2, 
  Trash2, Users, FileSpreadsheet, Lock, Unlock, 
  MapPin, Clock, CalendarDays, RefreshCw, X, ArrowRight,
  Boxes, CheckCircle2, GraduationCap, Calendar, Edit, XCircle, UserPlus, ArrowRightLeft, UserMinus, BookOpen, User, Check
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
  course?: string;
  startDate?: string;
  trainer?: string;
  status: "active" | "inactive";
  studentIds: string[];
}

export default function AdminBatchesPage() {
  const { toast } = useToast();
  const [batches, setBatches] = useState<LMSBatch[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    return Array.from(set);
  }, [batches]);

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
      {/* 1. Header & Primary Action */}
      <PageHeader
        title="Batch Management"
        actions={
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              onClick={handleOpenCreateModal}
              variant="outline"
              className="h-[44px] border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10 dark:border-[#3B82F6] dark:text-[#3B82F6] font-semibold text-sm px-6 rounded-full shadow-xs transition-all"
            >
              Create New Batch
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
              className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm px-6 rounded-full shadow-md shadow-[#2563EB]/25 transition-all"
            >
              Add Student to Batch
            </Button>
          </div>
        }
      />

      {/* 2. Key Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA]">Total Batches</span>
            <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#111827] dark:text-[#FAFAFA]">{totalBatches}</span>
            <span className="text-xs text-[#6B7280] ml-2 font-medium">Configured</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA]">Active Batches</span>
            <div className="w-9 h-9 rounded-xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#16A34A]">{activeBatches}</span>
            <span className="text-xs text-[#6B7280] ml-2 font-medium">In Session</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA]">Assigned Students</span>
            <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#111827] dark:text-[#FAFAFA]">{totalAssignedStudents}</span>
            <span className="text-xs text-[#6B7280] ml-2 font-medium">In Batches</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA]">Unassigned Students</span>
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#F59E0B]">{totalUnassignedStudents}</span>
            <span className="text-xs text-[#6B7280] ml-2 font-medium">Awaiting Batch</span>
          </div>
        </Card>
      </div>

      {/* 3. Search & Filters Bar */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search by batch name, college, course, trainer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-[44px] text-sm bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val: string | null) => setStatusFilter((val as any) || "all")}>
              <SelectTrigger className="h-[44px] text-xs font-medium w-[140px] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {/* College Filter */}
            <Select value={collegeFilter} onValueChange={(val: string | null) => setCollegeFilter(val ?? "all")}>
              <SelectTrigger className="h-[44px] text-xs font-medium w-[180px] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder="College: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colleges</SelectItem>
                {distinctColleges.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || statusFilter !== "all" || collegeFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCollegeFilter("all");
                }}
                className="h-[44px] text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 px-3 rounded-xl"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 4. Batch Cards Grid */}
      {filteredBatches.length === 0 ? (
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-12 text-center rounded-2xl">
          <Boxes className="h-12 w-12 text-[#6B7280] mx-auto opacity-40 mb-3" />
          <h3 className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">No Batches Found</h3>
          <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
            No batches match your active search filters. Try adjusting your query or create a new batch.
          </p>
          <Button onClick={handleOpenCreateModal} className="mt-4 bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-xl">
            <Plus className="h-4 w-4 mr-1" /> Create Batch
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map((batch) => {
            const currentStudentCount = batch.studentIds.length;
            return (
              <Card
                key={batch.id}
                className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Top Bar with Status Badge */}
                  <div className="p-5 pb-3 flex items-start justify-between gap-3 border-b border-[#E5E7EB]/60 dark:border-[#27272A]/60 bg-[#F9FAFB]/50 dark:bg-[#09090B]/50">
                    <div className="space-y-1">
                      {batch.collegeName && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#2563EB] shrink-0" />
                          <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA] truncate">
                            {batch.collegeName}
                          </span>
                        </div>
                      )}
                      <h3 className="text-base font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug line-clamp-2">
                        {batch.batchName}
                      </h3>
                    </div>

                    <Badge
                      className={`text-[10px] font-bold uppercase tracking-wider shrink-0 px-2.5 py-0.5 ${
                        batch.status === "active"
                          ? "bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30"
                          : "bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30"
                      }`}
                    >
                      {batch.status}
                    </Badge>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                    {batch.course && (
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="h-4 w-4 text-[#6B7280] shrink-0" />
                        <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{batch.course}</span>
                      </div>
                    )}

                    {batch.trainer && (
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-[#6B7280] shrink-0" />
                        <span>Trainer: <strong className="text-[#111827] dark:text-[#FAFAFA]">{batch.trainer}</strong></span>
                      </div>
                    )}

                    {batch.startDate && (
                      <div className="flex items-center gap-2.5">
                        <Calendar className="h-4 w-4 text-[#6B7280] shrink-0" />
                        <span>Start Date: <strong>{batch.startDate}</strong></span>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-[#E5E7EB] dark:border-[#27272A]">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#2563EB]" />
                        <span className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">
                          {currentStudentCount} <span className="text-xs font-normal text-[#6B7280]">Learners</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6B7280]">Cohort Group</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingBatch(batch)}
                    className="flex-1 h-9 text-xs font-bold gap-1.5 border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10 rounded-xl"
                  >
                    <Users className="h-3.5 w-3.5" /> Enrolled Students ({currentStudentCount})
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit Batch Details"
                      onClick={() => handleOpenEditModal(batch)}
                      className="h-9 w-9 text-[#6B7280] hover:text-[#111827] dark:hover:text-white rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      title={batch.status === "active" ? "Deactivate Batch" : "Activate Batch"}
                      onClick={() => toggleBatchStatus(batch.id, batch.status)}
                      className={`h-9 w-9 rounded-lg ${batch.status === "active" ? "text-[#16A34A] hover:bg-[#16A34A]/10" : "text-[#DC2626] hover:bg-[#DC2626]/10"}`}
                    >
                      {batch.status === "active" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete Batch Safely"
                      onClick={() => handleDeleteBatch(batch.id, batch.batchName)}
                      className="h-9 w-9 text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT BATCH DIALOG (Strictly 5 Fields - Section 2 & 3) */}
      {/* ========================================================================= */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <Boxes className="h-5 w-5 text-[#2563EB]" />
              {editingBatch ? "Edit Batch Details" : "Create New Batch"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Define a new student cohort batch. Only Batch Name is required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBatchSubmit} className="space-y-4 py-2">
            {/* Field 1: Batch Name (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Batch Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Java Batch 01"
                value={formBatchName}
                onChange={(e) => setFormBatchName(e.target.value)}
                required
                className="h-[44px] text-xs font-medium bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            </div>

            {/* Field 2: College / Institution (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                College / Institution <span className="text-[10px] text-[#6B7280] font-normal">(Optional)</span>
              </label>
              <Input
                placeholder="Select or enter College (e.g. PSG Tech)"
                value={formCollegeName}
                onChange={(e) => setFormCollegeName(e.target.value)}
                className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            </div>

            {/* Field 3: Lead Trainer (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Lead Trainer <span className="text-[10px] text-[#6B7280] font-normal">(Optional)</span>
              </label>
              <Input
                placeholder="Select or enter Trainer (e.g. Dr. Aris Thorne)"
                value={formTrainer}
                onChange={(e) => setFormTrainer(e.target.value)}
                className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            </div>

            {/* Field 4: Course Track (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Course Track <span className="text-[10px] text-[#6B7280] font-normal">(Optional)</span>
              </label>
              <Select value={formCourse} onValueChange={(val: string | null) => setFormCourse(val || "")}>
                <SelectTrigger className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]">
                  <SelectValue placeholder="Select Course Track" />
                </SelectTrigger>
                <SelectContent>
                  {courses && courses.length > 0 ? (
                    courses.map((c) => (
                      <SelectItem key={c.id} value={c.title}>
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
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Start Date <span className="text-[10px] text-[#6B7280] font-normal">(Optional)</span>
              </label>
              <Input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-[#E5E7EB] dark:border-[#27272A] gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-[44px] px-5 text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-[44px] px-7 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-md shadow-[#2563EB]/20"
              >
                {editingBatch ? "Save Batch Changes" : "Create Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: BATCH DETAIL & ENROLLED STUDENTS MANAGEMENT */}
      {/* ========================================================================= */}
      <Dialog open={!!viewingBatch} onOpenChange={(open) => !open && setViewingBatch(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl p-6 shadow-2xl space-y-6">
          {viewingBatch && (
            <>
              <DialogHeader className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
                <div className="flex items-center justify-between">
                  <div>
                    {viewingBatch.collegeName && (
                      <Badge className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30 text-[10px] font-bold uppercase mb-1">
                        {viewingBatch.collegeName}
                      </Badge>
                    )}
                    <DialogTitle className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
                      {viewingBatch.batchName}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#6B7280] mt-1">
                      {viewingBatch.course && <>Course: <strong>{viewingBatch.course}</strong> • </>}
                      {viewingBatch.trainer && <>Trainer: <strong>{viewingBatch.trainer}</strong> • </>}
                      {viewingBatch.startDate && <>Starts: <strong>{viewingBatch.startDate}</strong></>}
                    </DialogDescription>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedStudentIdsToAdd([]);
                      setIsAddStudentModalOpen(true);
                    }}
                    className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-5 gap-2 rounded-xl shadow-md shadow-[#2563EB]/20 shrink-0"
                  >
                    <UserPlus className="h-4 w-4" /> Add Students to Batch
                  </Button>
                </div>
              </DialogHeader>

              {/* List of Enrolled Students */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Enrolled Learners ({enrolledStudentsInViewingBatch.length})
                  </h4>
                  <span className="text-xs text-[#6B7280]">
                    Students can belong to multiple batches
                  </span>
                </div>

                {enrolledStudentsInViewingBatch.length === 0 ? (
                  <div className="p-8 text-center bg-[#F9FAFB] dark:bg-[#09090B] border border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl space-y-2">
                    <Users className="h-8 w-8 text-[#6B7280] mx-auto opacity-40" />
                    <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">No Students Enrolled Yet</p>
                    <p className="text-xs text-[#6B7280]">Click &quot;Add Students to Batch&quot; to assign learners to this cohort.</p>
                  </div>
                ) : (
                  <div className="border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                    {enrolledStudentsInViewingBatch.map((std) => {
                      const stdName = `${std.first_name || ""} ${std.last_name || ""}`.trim() || std.name || "Student";
                      const stdIdentifier = std.id || std.user_id;
                      return (
                        <div
                          key={std.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-[#2563EB]/30">
                              <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs">
                                {stdName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">{stdName}</p>
                              <p className="text-xs text-[#6B7280]">
                                {std.email}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStudentFromBatch(viewingBatch.id, stdIdentifier, stdName)}
                            className="h-9 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 rounded-xl gap-1"
                          >
                            <UserMinus className="h-3.5 w-3.5" /> Remove from Batch
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
        <DialogContent className="max-w-2xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#2563EB]" />
              {viewingBatch
                ? `Add Students to ${viewingBatch.batchName}`
                : "Add Student to Batch"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              {viewingBatch
                ? "Select registered learners to assign to this batch. Multiple batch membership is supported."
                : "Select target batch and registered learners to assign."}
            </DialogDescription>
          </DialogHeader>

          {!viewingBatch && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Target Batch <span className="text-red-500">*</span>
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
                <SelectTrigger className="h-[42px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <SelectValue placeholder="Select target batch..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#18181B] max-h-60">
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="font-semibold text-xs">{b.batchName}</span>
                      {b.collegeName && (
                        <span className="text-[11px] text-[#6B7280] ml-2">
                          ({b.collegeName})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search by student name or email..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
            {availableStudentsToAdd.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6B7280]">
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
                    className={`p-3.5 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] cursor-pointer transition-colors ${
                      isSelected ? "bg-[#2563EB]/5" : ""
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
                        <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{stdName}</p>
                        <p className="text-[11px] text-[#6B7280]">
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
                      className="h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-3 rounded-lg gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Assign
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
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Close
            </Button>
            {selectedStudentIdsToAdd.length > 0 && effectiveBatchForAssignment && (
              <Button
                onClick={() => handleAssignStudentsToBatch(effectiveBatchForAssignment.id, selectedStudentIdsToAdd)}
                disabled={isAssigningStudents}
                className="h-9 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl"
              >
                Assign {selectedStudentIdsToAdd.length} Selected Students
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
