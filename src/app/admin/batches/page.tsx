"use client";

import React, { useState, useMemo } from "react";
import { useLMSStore } from "@/lib/store/lms-store";
import type { LMSBatch } from "@/types/batch";
import { PageHeader } from "@/components/layouts/page-header";
import {
  Boxes, Plus, Search, Filter, Users, Calendar, Clock, GraduationCap,
  BookOpen, CheckCircle2, XCircle, MoreVertical, Edit, Trash2, ArrowRightLeft,
  UserPlus, UserMinus, ShieldAlert, Sparkles, X, ChevronRight, Eye, Building2, User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminBatchesPage() {
  const { toast } = useToast();
  const {
    batches,
    students,
    courses,
    addBatch,
    updateBatch,
    deleteBatch,
    toggleBatchStatus,
    assignStudentToBatch,
    removeStudentFromBatch,
    transferStudentBatch,
  } = useLMSStore();

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [collegeFilter, setCollegeFilter] = useState("all");

  // Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<LMSBatch | null>(null);

  // Form State for Create/Edit Batch
  const [formBatchName, setFormBatchName] = useState("");
  const [formCollegeName, setFormCollegeName] = useState("");
  const [formCourse, setFormCourse] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formJoiningTime, setFormJoiningTime] = useState("Morning Session (09:00 AM)");
  const [formTrainer, setFormTrainer] = useState("");

  // Drawer / View Students Modal State
  const [viewingBatch, setViewingBatch] = useState<LMSBatch | null>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Transfer Student Modal State
  const [transferringStudentId, setTransferringStudentId] = useState<string | null>(null);
  const [transferTargetBatchId, setTransferTargetBatchId] = useState<string>("");

  // Calculated Metrics
  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.status === "active").length;
  
  // Total assigned student IDs across all active batches
  const assignedStudentIds = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => b.studentIds.forEach((sid) => set.add(sid)));
    return set;
  }, [batches]);

  const totalAssignedStudents = assignedStudentIds.size;
  const totalUnassignedStudents = useMemo(() => {
    return students.filter((s) => !s.batchId || s.batch === "Not Assigned" || !assignedStudentIds.has(s.id)).length;
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
      b.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.trainer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesCollege = collegeFilter === "all" || b.collegeName === collegeFilter;

    return matchesSearch && matchesStatus && matchesCollege;
  });

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setEditingBatch(null);
    setFormBatchName("");
    setFormCollegeName("");
    setFormCourse(courses[0]?.title || "Fullstack Enterprise React/Next.js");
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate(new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10));
    setFormJoiningTime("Morning Session (09:00 AM)");
    setFormTrainer("Dr. Aris Thorne");
    setIsCreateModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (batch: LMSBatch) => {
    setEditingBatch(batch);
    setFormBatchName(batch.batchName);
    setFormCollegeName(batch.collegeName);
    setFormCourse(batch.course);
    setFormStartDate(batch.startDate);
    setFormEndDate(batch.endDate);
    setFormJoiningTime(batch.joiningTime);
    setFormTrainer(batch.trainer);
    setIsCreateModalOpen(true);
  };

  // Submit Create / Edit Batch Form
  const handleSaveBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBatchName || !formCollegeName || !formCourse) {
      toast({
        title: "Validation Error",
        description: "Please fill in Batch Name, College, and Course fields.",
        variant: "destructive",
      });
      return;
    }

    if (editingBatch) {
      updateBatch(editingBatch.id, {
        batchName: formBatchName,
        collegeName: formCollegeName,
        course: formCourse,
        startDate: formStartDate,
        endDate: formEndDate,
        joiningTime: formJoiningTime,
        trainer: formTrainer,
      });
      toast({
        title: "Batch Updated",
        description: `Batch "${formBatchName}" has been updated successfully.`,
      });
    } else {
      addBatch({
        batchName: formBatchName,
        collegeName: formCollegeName,
        course: formCourse,
        startDate: formStartDate,
        endDate: formEndDate,
        joiningTime: formJoiningTime,
        trainer: formTrainer,
        status: "active",
      });
      toast({
        title: "Batch Created",
        description: `Batch "${formBatchName}" is now active.`,
      });
    }

    setIsCreateModalOpen(false);
  };

  // Handle Batch Deletion
  const handleDeleteBatch = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete batch "${name}"? Enrolled students will be moved to "Not Assigned".`)) {
      deleteBatch(id);
      if (viewingBatch?.id === id) setViewingBatch(null);
      toast({
        title: "Batch Deleted",
        description: `Batch "${name}" was deleted.`,
      });
    }
  };

  // Enrolled students in currently viewed batch
  const enrolledStudentsInViewingBatch = useMemo(() => {
    if (!viewingBatch) return [];
    // Keep viewingBatch updated with newest store state
    const currentBatchState = batches.find((b) => b.id === viewingBatch.id) || viewingBatch;
    return students.filter(
      (s) => s.batchId === currentBatchState.id || currentBatchState.studentIds.includes(s.id)
    );
  }, [viewingBatch, batches, students]);

  // Unassigned students or students available to add to viewing batch
  const availableStudentsToAdd = useMemo(() => {
    if (!viewingBatch) return [];
    const currentBatchState = batches.find((b) => b.id === viewingBatch.id) || viewingBatch;
    return students.filter((s) => {
      const isAlreadyInThisBatch = s.batchId === currentBatchState.id || currentBatchState.studentIds.includes(s.id);
      if (isAlreadyInThisBatch) return false;

      const matchesSearch =
        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        (s.college && s.college.toLowerCase().includes(studentSearchQuery.toLowerCase())) ||
        (s.course && s.course.toLowerCase().includes(studentSearchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [viewingBatch, batches, students, studentSearchQuery]);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header & Primary Action */}
      <PageHeader
        title="Batch Management"
        description="Group learners by college, course, and schedule. Manage batch transfers and unassigned students seamlessly."
        actions={
          <Button
            onClick={handleOpenCreateModal}
            className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm px-5 gap-2 rounded-xl shadow-md shadow-[#2563EB]/20 shrink-0"
          >
            <Plus className="h-4 w-4" /> Create New Batch
          </Button>
        }
      />

      {/* 2. Key Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA]">Total Student Batches</span>
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
            <div className="w-9 h-9 rounded-xl bg-[#9333EA]/10 text-[#9333EA] flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#111827] dark:text-[#FAFAFA]">{totalAssignedStudents}</span>
            <span className="text-xs text-[#6B7280] ml-2 font-medium">In Active Batches</span>
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
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#2563EB] shrink-0" />
                        <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA] truncate">
                          {batch.collegeName}
                        </span>
                      </div>
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
                  <div className="p-5 space-y-3.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="h-4 w-4 text-[#6B7280] shrink-0" />
                      <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{batch.course}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <User className="h-4 w-4 text-[#6B7280] shrink-0" />
                      <span>Trainer: <strong className="text-[#111827] dark:text-[#FAFAFA]">{batch.trainer}</strong></span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 text-[#6B7280] shrink-0" />
                      <span>{batch.joiningTime}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-[#6B7280] shrink-0" />
                      <span>{batch.startDate} to {batch.endDate}</span>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-[#E5E7EB] dark:border-[#27272A]">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#2563EB]" />
                        <span className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">
                          {currentStudentCount} <span className="text-xs font-normal text-[#6B7280]">Learners</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6B7280]">Single Active Batch Rule</span>
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
                      onClick={() => {
                        toggleBatchStatus(batch.id);
                        toast({
                          title: "Batch Status Updated",
                          description: `Batch "${batch.batchName}" is now ${batch.status === "active" ? "Inactive" : "Active"}.`,
                        });
                      }}
                      className={`h-9 w-9 rounded-lg ${batch.status === "active" ? "text-[#16A34A] hover:bg-[#16A34A]/10" : "text-[#DC2626] hover:bg-[#DC2626]/10"}`}
                    >
                      {batch.status === "active" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete Batch"
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
      {/* MODAL 1: CREATE / EDIT BATCH DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <Boxes className="h-5 w-5 text-[#2563EB]" />
              {editingBatch ? "Edit Batch Details" : "Create New Batch"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Configure batch name, college, course program, schedule timings, and trainer assignments.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBatchSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Batch Name</label>
              <Input
                placeholder="e.g. ABC College – Java Development – Batch 01"
                value={formBatchName}
                onChange={(e) => setFormBatchName(e.target.value)}
                required
                className="h-[44px] text-xs font-medium bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">College / Institution Name</label>
                <Input
                  placeholder="e.g. ABC College or PSG Tech"
                  value={formCollegeName}
                  onChange={(e) => setFormCollegeName(e.target.value)}
                  required
                  className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Course / Tech Track</label>
                <Input
                  placeholder="e.g. Java Development, Fullstack React..."
                  value={formCourse}
                  onChange={(e) => setFormCourse(e.target.value)}
                  required
                  className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Start Date</label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">End Date</label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Joining Session / Timing</label>
                <Select value={formJoiningTime} onValueChange={(val: string | null) => setFormJoiningTime(val ?? "Morning Session (09:00 AM)")}>
                  <SelectTrigger className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning Session (09:00 AM)">Morning Session (09:00 AM)</SelectItem>
                    <SelectItem value="Afternoon Session (02:00 PM)">Afternoon Session (02:00 PM)</SelectItem>
                    <SelectItem value="Evening Session (05:00 PM)">Evening Session (05:00 PM)</SelectItem>
                    <SelectItem value="Full-Day Bootcamp (09:00 AM - 05:00 PM)">Full-Day Bootcamp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Lead Trainer / Instructor</label>
                <Input
                  placeholder="e.g. Dr. Aris Thorne"
                  value={formTrainer}
                  onChange={(e) => setFormTrainer(e.target.value)}
                  className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>
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
                {editingBatch ? "Save Batch Changes" : "Create Batch Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: BATCH DETAIL & ENROLLED STUDENTS MANAGEMENT DRAWER / DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={!!viewingBatch} onOpenChange={(open) => !open && setViewingBatch(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl p-6 shadow-2xl space-y-6">
          {viewingBatch && (
            <>
              <DialogHeader className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30 text-[10px] font-bold uppercase mb-1">
                      {viewingBatch.collegeName}
                    </Badge>
                    <DialogTitle className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
                      {viewingBatch.batchName}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#6B7280] mt-1">
                      Course: <strong>{viewingBatch.course}</strong> • Trainer: <strong>{viewingBatch.trainer}</strong> • Timing: <strong>{viewingBatch.joiningTime}</strong>
                    </DialogDescription>
                  </div>

                  <Button
                    onClick={() => setIsAddStudentModalOpen(true)}
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
                  <span className="text-xs text-[#6B7280]">Students in this batch cannot be in another batch simultaneously</span>
                </div>

                {enrolledStudentsInViewingBatch.length === 0 ? (
                  <div className="p-8 text-center bg-[#F9FAFB] dark:bg-[#09090B] border border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl space-y-2">
                    <Users className="h-8 w-8 text-[#6B7280] mx-auto opacity-40" />
                    <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">No Students Enrolled Yet</p>
                    <p className="text-xs text-[#6B7280]">Click &quot;Add Students to Batch&quot; to assign registered learners to this batch.</p>
                  </div>
                ) : (
                  <div className="border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                    {enrolledStudentsInViewingBatch.map((std) => (
                      <div
                        key={std.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-[#2563EB]/30">
                            <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs">
                              {std.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">{std.name}</p>
                            <p className="text-xs text-[#6B7280]">
                              {std.email} • <span className="font-mono text-[#2563EB]">{std.employeeId || "REG-2026"}</span>
                            </p>
                            {(std.college || std.course) && (
                              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                                College: {std.college || "N/A"} | Course: {std.course || "N/A"}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTransferringStudentId(std.id);
                              // Pick first active batch that is not this current batch
                              const otherBatch = batches.find((b) => b.id !== viewingBatch.id && b.status === "active");
                              setTransferTargetBatchId(otherBatch?.id || "");
                            }}
                            className="h-9 text-xs font-semibold gap-1.5 border-[#9333EA] text-[#9333EA] hover:bg-[#9333EA]/10 rounded-xl"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Batch
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              removeStudentFromBatch(std.id, viewingBatch.id);
                              toast({
                                title: "Student Removed from Batch",
                                description: `${std.name} has been unassigned and batch set to "Not Assigned".`,
                              });
                            }}
                            className="h-9 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 rounded-xl gap-1"
                          >
                            <UserMinus className="h-3.5 w-3.5" /> Unassign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: ADD STUDENTS TO BATCH MODAL */}
      {/* ========================================================================= */}
      <Dialog open={isAddStudentModalOpen} onOpenChange={setIsAddStudentModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#2563EB]" />
              Add Students to {viewingBatch?.batchName}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Search unassigned or registered students by Name, Email, College, or Course and assign them to this batch.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search by student name, email, college, course..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
            {availableStudentsToAdd.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6B7280]">
                No matching available students found.
              </div>
            ) : (
              availableStudentsToAdd.map((std) => (
                <div
                  key={std.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]"
                >
                  <div>
                    <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{std.name}</p>
                    <p className="text-[11px] text-[#6B7280]">
                      {std.email} • <span className="font-semibold text-[#2563EB]">{std.batch || "Not Assigned"}</span>
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      if (viewingBatch) {
                        assignStudentToBatch(std.id, viewingBatch.id);
                        toast({
                          title: "Student Assigned",
                          description: `${std.name} is now enrolled in "${viewingBatch.batchName}".`,
                        });
                      }
                    }}
                    className="h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-3 rounded-lg gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Assign Batch
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddStudentModalOpen(false)}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: TRANSFER STUDENT BATCH MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!transferringStudentId} onOpenChange={(open) => !open && setTransferringStudentId(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-[#9333EA]" />
              Transfer Student Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Select a target active batch to transfer this student. Students can belong to at most one active batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Batch</label>
            <Select value={transferTargetBatchId} onValueChange={(val: string | null) => setTransferTargetBatchId(val ?? "")}>
              <SelectTrigger className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder="Select target active batch" />
              </SelectTrigger>
              <SelectContent>
                {batches
                  .filter((b) => b.status === "active" && b.id !== viewingBatch?.id)
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.batchName} ({b.collegeName})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTransferringStudentId(null)}
              className="h-[44px] px-4 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (transferringStudentId && transferTargetBatchId && viewingBatch) {
                  transferStudentBatch(transferringStudentId, viewingBatch.id, transferTargetBatchId);
                  const targetB = batches.find((b) => b.id === transferTargetBatchId);
                  toast({
                    title: "Student Transferred",
                    description: `Student successfully moved to "${targetB?.batchName || "New Batch"}".`,
                  });
                  setTransferringStudentId(null);
                }
              }}
              disabled={!transferTargetBatchId}
              className="h-[44px] px-6 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-bold text-xs rounded-xl shadow-md shadow-[#9333EA]/20"
            >
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
