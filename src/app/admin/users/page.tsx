"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Search, Plus, UserCheck, Shield, Trash2, Edit, GraduationCap, Building2, Briefcase, Mail, Key, Upload, FileSpreadsheet, UploadCloud, X, ExternalLink, Phone, CheckCircle2, Layers, Eye, BookOpen, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLMSStore } from "@/lib/store/lms-store";
import { PageHeader } from "@/components/layouts/page-header";
import { createClient } from "@/lib/supabase/client";
import { safeParseSpreadsheet } from "@/lib/excel-security";

type UserRole = "admin" | "manager" | "trainer" | "student" | "institution";
type UserStatus = "active" | "pending" | "suspended";
type UserType = "employee" | "student" | "institution";

export interface AdminBatchDetail {
  id: string;
  name: string;
  batchName: string;
  code: string;
  collegeName?: string;
  course?: string;
  trainer?: string;
  startDate?: string;
  status: string;
  studentCount: number;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
  type: UserType;
  department?: string; // For employees
  batch?: string; // For students
  college?: string; // For institutions / students
  branch?: string; // Code for institutions
  phone?: string;
}

const initialUsers: SystemUser[] = [];

export default function AdminUsersPage() {
  const { toast } = useToast();
  const { batches: storeBatches } = useLMSStore();
  const [availableBatches, setAvailableBatches] = useState<{ id: string; name: string }[]>([]);
  const [allBatches, setAllBatches] = useState<AdminBatchDetail[]>([]);
  const [selectedInstForBatches, setSelectedInstForBatches] = useState<SystemUser | null>(null);
  const [isManageBatchesOpen, setIsManageBatchesOpen] = useState(false);
  const [batchModalFilter, setBatchModalFilter] = useState<"all" | "assigned" | "available">("all");
  const [batchModalSearch, setBatchModalSearch] = useState("");
  const [assigningBatchId, setAssigningBatchId] = useState<string | null>(null);
  const [viewingBatchDetail, setViewingBatchDetail] = useState<AdminBatchDetail | null>(null);

  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("student");
  const [isLoading, setIsLoading] = useState(true);

  // Tab sync from query params (e.g. /admin/users?tab=institution)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "institution" || tabParam === "employee" || tabParam === "student") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Fetch batches directly from API
  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/admin/batches");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.batches)) {
          setAllBatches(
            data.batches.map((b: any) => ({
              id: String(b.id),
              name: b.name || b.batchName || b.batch_name || `Batch #${b.id}`,
              batchName: b.name || b.batchName || b.batch_name || `Batch #${b.id}`,
              code: b.code || `BAT-${String(b.id).slice(0, 6).toUpperCase()}`,
              collegeName: b.collegeName || "",
              course: b.course || b.courseName || "",
              trainer: b.trainer || b.trainerName || "",
              startDate: b.startDate || "",
              status: b.status || "active",
              studentCount: b.studentCount || (Array.isArray(b.studentIds) ? b.studentIds.length : 0),
            }))
          );
          setAvailableBatches(
            data.batches.map((b: any) => ({
              id: String(b.id),
              name: b.name || b.batchName || b.batch_name || `Batch #${b.id}`,
            }))
          );
        }
      }
    } catch (e) {
      console.warn("Could not fetch batches:", e);
    }
  };

  // Assign or unassign existing batch to the selected institution
  const handleAssignBatchToInstitution = async (batchId: string, targetCollege: string) => {
    if (assigningBatchId) return;

    const batch = allBatches.find((b) => b.id === batchId);
    const existingCollege = (batch?.collegeName || "").trim().toLowerCase();
    const newCollege = targetCollege.trim().toLowerCase();

    // Prevent duplicate assignment if already assigned
    if (newCollege && existingCollege === newCollege) {
      toast({
        title: "Already Assigned",
        description: `Batch "${batch?.batchName || batchId}" is already assigned to ${targetCollege}.`,
      });
      return;
    }

    setAssigningBatchId(batchId);
    try {
      const res = await fetch(`/api/admin/batches/${batchId}/assign-institution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeName: targetCollege,
          institutionId: selectedInstForBatches?.id || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update batch assignment");
      }

      const resData = await res.json().catch(() => ({}));

      // Optimistically update allBatches state
      setAllBatches((prev) =>
        prev.map((b) =>
          b.id === batchId ? { ...b, collegeName: targetCollege } : b
        )
      );

      // Re-fetch batches for database consistency
      await fetchBatches();

      toast({
        title: targetCollege
          ? resData.alreadyAssigned
            ? "Already Assigned"
            : "Batch Assigned to Institution"
          : "Assignment Deleted",
        description: targetCollege
          ? `Batch "${batch?.batchName || batchId}" is now linked to ${targetCollege}. It will immediately sync to their institution performance portal.`
          : `Batch "${batch?.batchName || batchId}" assignment has been deleted and is now available.`,
      });
    } catch (err: any) {
      toast({
        title: "Assignment Failed",
        description: err.message || "Failed to update institution assignment",
        variant: "destructive",
      });
    } finally {
      setAssigningBatchId(null);
    }
  };

  // Combined deduplicated batch list for dropdowns
  const allBatchesList = [
    ...availableBatches,
    ...storeBatches.map((b) => ({ id: String(b.id), name: b.batchName })),
  ].filter((b, idx, arr) => arr.findIndex((x) => x.name.toLowerCase() === b.name.toLowerCase()) === idx);
  
  // Fetch users from API (connects auth.users and profiles)
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBatches();

    const supabase = createClient();
    const channel = supabase
      .channel("realtime-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkPreviewRows, setBulkPreviewRows] = useState<any[]>([]);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [newUserType, setNewUserType] = useState<UserType>("student");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("student");
  const [newUserDept, setNewUserDept] = useState("");
  const [newUserBatch, setNewUserBatch] = useState("");
  const [customBatch, setCustomBatch] = useState("");
  const [newUserCollege, setNewUserCollege] = useState("");
  const [newUserCode, setNewUserCode] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");

  const filtered = users.filter(
    (u) => 
      u.type === activeTab && 
      (u.name.toLowerCase().includes(search.toLowerCase()) || 
       u.email.toLowerCase().includes(search.toLowerCase()) ||
       (u.college && u.college.toLowerCase().includes(search.toLowerCase())) ||
       (u.department && u.department.toLowerCase().includes(search.toLowerCase())))
  );

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail) return;

    try {
      const selectedBatch = newUserType === "student" ? (newUserBatch === "custom" ? customBatch : newUserBatch) : undefined;
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword || (newUserType === "institution" ? "Institution@2026" : "Sensilearn@2026"),
          role: newUserRole,
          batch_id: selectedBatch,
          department: newUserType === "employee" ? newUserDept || "General" : undefined,
          college: newUserType === "institution" ? (newUserCollege || newUserName) : undefined,
          branch: newUserType === "institution" ? newUserCode : undefined,
          phone: newUserPhone || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast({ title: "Error Creating User", description: data.error || "Failed to create user in database", variant: "destructive" });
        return;
      }

      if (data.user) {
        setUsers((prev) => [data.user, ...prev.filter(u => u.email !== newUserEmail)]);
      } else {
        fetchUsers();
      }

      setIsAddOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setCustomBatch("");
      setNewUserCollege("");
      setNewUserCode("");
      setNewUserPhone("");
      
      toast({
        title: "User Successfully Created",
        description: `${newUserName} (${newUserEmail}) is now registered in the system.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create user", variant: "destructive" });
    }
  };

  const handleEditUser = (id: string) => {
    const userToEdit = users.find(u => u.id === id);
    if (userToEdit) {
      setNewUserType(userToEdit.type);
      setNewUserName(userToEdit.name);
      setNewUserEmail(userToEdit.email);
      setNewUserRole(userToEdit.role);
      setNewUserDept(userToEdit.department || "");
      setNewUserCollege(userToEdit.college || "");
      setNewUserCode(userToEdit.branch || "");
      setNewUserPhone(userToEdit.phone || "");
      
      if (userToEdit.batch) {
        setNewUserBatch(userToEdit.batch);
      } else {
        setNewUserBatch("");
      }
      setEditingUserId(id);
      setIsEditOpen(true);
    }
  };

  const saveEditUser = async () => {
    try {
      const selectedBatch = newUserType === "student" ? (newUserBatch === "custom" ? customBatch : newUserBatch) || "Unassigned" : null;
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUserId,
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          department: newUserType === "employee" ? newUserDept || "General" : null,
          batch: selectedBatch,
          college: newUserType === "institution" ? (newUserCollege || newUserName) : null,
          branch: newUserType === "institution" ? (newUserCode || null) : null,
          phone: newUserPhone || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update profile");
      }

      await fetchUsers();
      setIsEditOpen(false);
      toast({ title: "Profile Updated", description: "User details and batch assignment saved successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update profile", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({
        title: "User Removed",
        description: `${name} has been removed from the system.`,
        variant: "destructive"
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete user", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 w-full pb-10">
      {/* Top Banner */}
      <PageHeader
        title="Enterprise Access & Directory"
        actions={
          <>
            <Button 
              onClick={() => setIsBulkUploadOpen(true)}
              variant="outline"
              className="h-[44px] gap-2 px-4 rounded-xl border-[#E5E7EB] dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#27272A] text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-sm transition-all"
            >
              <UploadCloud className="h-4 w-4 text-[#2563EB]" /> Bulk Upload
            </Button>
            <Button 
              onClick={() => setIsAddOpen(true)}
              className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shadow-md shadow-[#2563EB]/20 transition-all"
            >
              <Plus className="h-4 w-4" /> Add New User
            </Button>
          </>
        }
      />
      {/* ── ADD / EDIT USER ── Inline Panel ── */}
      {(isAddOpen || isEditOpen) && (
        <Card className="bg-white dark:bg-[#18181B] border border-[#2563EB]/40 dark:border-[#2563EB]/30 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <div className="flex items-center gap-2.5">
                <div>
                  <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {isEditOpen ? "Edit User Profile" : "Onboard New User"}
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    {isEditOpen ? "Update details and system role." : "Add a new person to the system and grant them role-based access."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {!isEditOpen && (
                <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">User Classification</label>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-1 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => { setNewUserType("student"); setNewUserRole("student"); }}
                      className={`px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        newUserType === "student"
                          ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-sm border border-[#E5E7EB] dark:border-[#27272A]"
                          : "text-[#6B7280] hover:text-[#111827]"
                      }`}
                    >
                      <GraduationCap className="h-3.5 w-3.5" /> Student
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewUserType("employee"); setNewUserRole("trainer"); }}
                      className={`px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        newUserType === "employee"
                          ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-sm border border-[#E5E7EB] dark:border-[#27272A]"
                          : "text-[#6B7280] hover:text-[#111827]"
                      }`}
                    >
                      <Briefcase className="h-3.5 w-3.5" /> Employee & Trainer
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewUserType("institution"); setNewUserRole("institution"); }}
                      className={`px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        newUserType === "institution"
                          ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-sm border border-[#E5E7EB] dark:border-[#27272A]"
                          : "text-[#6B7280] hover:text-[#111827]"
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5 text-[#2563EB]" /> Partner Institution
                    </button>
                  </div>
                </div>
              )}

              {newUserType === "institution" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-[#2563EB]" /> Institution / College Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newUserCollege}
                      onChange={(e) => {
                        setNewUserCollege(e.target.value);
                        if (!newUserName) setNewUserName(e.target.value);
                      }}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] rounded-xl focus:border-[#2563EB]"
                      placeholder="e.g. Sri Krishna College of Engineering & Technology"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Principal / SPOC Name
                    </label>
                    <Input
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] rounded-xl focus:border-[#2563EB]"
                      placeholder="e.g. Dr. K. Ramesh (Placement Director)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Institution Login Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] rounded-xl focus:border-[#2563EB]"
                      placeholder="e.g. institution@skcet.ac.in"
                    />
                  </div>

                  {!isEditOpen && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                        <Key className="h-3 w-3 text-[#2563EB]" /> Initial Account Password
                      </label>
                      <Input
                        type="text"
                        placeholder="Set password (Default: Institution@2026)"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="h-[42px] text-xs font-mono rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Institution Code (Optional)</label>
                    <Input
                      value={newUserCode}
                      onChange={(e) => setNewUserCode(e.target.value)}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] rounded-xl focus:border-[#2563EB]"
                      placeholder="e.g. SKCET-2026"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-[#2563EB]" /> Contact Phone
                    </label>
                    <Input
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] rounded-xl focus:border-[#2563EB]"
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Full Name</label>
                    <Input
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] rounded-xl focus:border-[#2563EB]"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Email Address</label>
                    <Input
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] rounded-xl focus:border-[#2563EB]"
                      placeholder="e.g. john@enterprise.com"
                    />
                  </div>

                  {!isEditOpen && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                        <Key className="h-3 w-3 text-[#2563EB]" /> Initial Account Password
                      </label>
                      <Input
                        type="text"
                        placeholder="Set initial password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="h-[42px] text-xs font-mono rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                      />
                    </div>
                  )}

                  {newUserType === "employee" ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">System Role</label>
                        <Select value={newUserRole} onValueChange={(val) => setNewUserRole(val as UserRole)}>
                          <SelectTrigger className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trainer">Trainer / Assessor</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Department</label>
                        <Input
                          value={newUserDept}
                          onChange={(e) => setNewUserDept(e.target.value)}
                          className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] rounded-xl focus:border-[#2563EB]"
                          placeholder="e.g. AI Engineering"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Assign Student Batch</label>
                      <Select value={newUserBatch} onValueChange={(val) => val && setNewUserBatch(val)}>
                        <SelectTrigger className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl">
                          <SelectValue placeholder="Select Batch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unassigned" className="text-amber-600 dark:text-amber-400 font-medium">Unassigned (No Batch)</SelectItem>
                          {allBatchesList.length > 0 ? (
                            allBatchesList.map(b => (
                              <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no_batches" disabled>No cohorts found</SelectItem>
                          )}
                          <SelectItem value="custom" className="text-[#2563EB] font-bold">+ Custom Batch...</SelectItem>
                        </SelectContent>
                      </Select>
                      {newUserBatch === "custom" && (
                        <Input
                          value={customBatch}
                          onChange={(e) => setCustomBatch(e.target.value)}
                          placeholder="Enter custom batch name"
                          className="h-[42px] text-xs bg-[#F9FAFB] mt-2 border-[#2563EB]/40 focus:border-[#2563EB]"
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {isEditOpen && (
              <div className="space-y-2 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Password Management</label>
                <div className="flex flex-col md:flex-row gap-4 md:items-center p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">Force Password Reset</p>
                    <p className="text-[11px] text-[#6B7280]">Provide a temporary password for this user.</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Input
                      type="text"
                      placeholder="Enter temp password..."
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="h-9 text-xs font-mono bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]"
                    />
                    <Button
                      onClick={() => {
                        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
                        let pass = "";
                        for (let i = 0; i < 10; i++) {
                          pass += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        setNewUserPassword(pass);
                      }}
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-9"
                    >
                      Auto
                    </Button>
                    <Button
                      onClick={() => {
                        if (!newUserPassword) {
                          toast({ title: "Error", description: "Please enter a temporary password.", variant: "destructive" });
                          return;
                        }
                        toast({
                          title: "Password Reset Triggered",
                          description: `Temp Password set. User will be prompted to change it on next login.`,
                        });
                        navigator.clipboard.writeText(newUserPassword);
                      }}
                      size="sm"
                      className="shrink-0 h-9 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} className="h-10 px-6 rounded-xl font-bold text-xs">Cancel</Button>
              <Button onClick={isEditOpen ? saveEditUser : handleAddUser} className={`h-10 px-8 text-white rounded-xl font-bold text-xs shadow-md ${newUserType === 'student' ? 'bg-[#2563EB] hover:bg-[#1D4ED8]' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'}`}>
                {isEditOpen ? "Save Changes" : "Provision Account"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <TabsList className="bg-[#F9FAFB] dark:bg-[#09090B] p-1 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl h-auto gap-2">
            <TabsTrigger 
              value="student" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:shadow-sm rounded-lg py-2.5 px-6 font-bold text-xs gap-2 transition-all"
            >
              <GraduationCap className="h-4 w-4" /> Students
            </TabsTrigger>
            <TabsTrigger 
              value="employee" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:shadow-sm rounded-lg py-2.5 px-6 font-bold text-xs gap-2 transition-all"
            >
              <Briefcase className="h-4 w-4" /> Employees & Trainers
            </TabsTrigger>
            <TabsTrigger 
              value="institution" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:shadow-sm rounded-lg py-2.5 px-6 font-bold text-xs gap-2 transition-all"
            >
              <Building2 className="h-4 w-4" /> Partner Institutions
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input 
              placeholder={`Search ${activeTab === 'student' ? 'students' : activeTab === 'institution' ? 'institutions' : 'employees'}...`}
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 h-11 text-xs bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl focus-visible:ring-1 focus-visible:ring-[#2563EB] shadow-sm transition-all" 
            />
          </div>
        </div>

        <TabsContent value="student" className="mt-0 outline-none">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 pl-6">Student Profile</th>
                    <th className="p-4">Assigned Batch</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4">Enrollment Date</th>
                    <th className="p-4 pr-6 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-[#6B7280] text-sm">No students found.</td></tr>
                  ) : (
                    filtered.map((user) => (
                      <tr key={user.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-[#E5E7EB] dark:border-[#27272A]">
                              <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] font-bold text-sm">
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{user.name}</p>
                              <p className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3" /> {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {user.batch && user.batch !== "Unassigned" ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60">
                              <span className="truncate max-w-[170px]">{user.batch}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEditUser(user.id)}
                              title="Click to assign batch"
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-normal border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 hover:text-blue-600 hover:border-blue-400 dark:hover:text-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer"
                            >
                              Unassigned
                            </button>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={`text-[10px] font-bold capitalize ${
                            user.status === "active" ? "bg-[#16A34A] text-white" : "bg-[#F59E0B] text-white"
                          }`}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs font-mono text-[#6B7280]">{user.joined}</td>
                        <td className="p-4 pr-6 text-right space-x-2">
                          <Button onClick={() => handleEditUser(user.id)} variant="outline" size="icon" className="h-8 w-8 text-[#6B7280] border-[#E5E7EB] hover:bg-white shadow-sm">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button onClick={() => handleDeleteUser(user.id, user.name)} variant="outline" size="icon" className="h-8 w-8 text-[#DC2626] border-[#DC2626]/20 hover:bg-[#DC2626]/10 shadow-sm">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee" className="mt-0 outline-none">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 pl-6">Employee Profile</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">System Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-[#6B7280] text-sm">No employees found.</td></tr>
                  ) : (
                    filtered.map((user) => (
                      <tr key={user.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-[#E5E7EB] dark:border-[#27272A]">
                              <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] font-bold text-sm">
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{user.name}</p>
                              <p className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3" /> {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold text-[#4B5563] dark:text-[#D4D4D8] flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-[#9CA3AF]" />
                            {user.department}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={`capitalize text-[10px] font-bold ${
                            user.role === "manager" 
                              ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20" 
                              : "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20"
                          }`}>
                            {user.role === "manager" ? <Shield className="h-3 w-3 mr-1" /> : null}
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={`text-[10px] font-bold capitalize ${
                            user.status === "active" ? "bg-[#16A34A] text-white" : "bg-[#F59E0B] text-white"
                          }`}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-4 pr-6 text-right space-x-2">
                          <Button onClick={() => handleEditUser(user.id)} variant="outline" size="icon" className="h-8 w-8 text-[#6B7280] border-[#E5E7EB] hover:bg-white shadow-sm">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button onClick={() => handleDeleteUser(user.id, user.name)} variant="outline" size="icon" className="h-8 w-8 text-[#DC2626] border-[#DC2626]/20 hover:bg-[#DC2626]/10 shadow-sm">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="institution" className="mt-0 outline-none">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 pl-6">Institution & SPOC</th>
                    <th className="p-4">College / Organization</th>
                    <th className="p-4">Institution Code</th>
                    <th className="p-4">Assigned Batches</th>
                    <th className="p-4">Contact Phone</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Onboarded</th>
                    <th className="p-4 pr-6 text-right">Portal & Batches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-[#6B7280]">
                        <Building2 className="h-8 w-8 mx-auto mb-2 text-[#9CA3AF]" />
                        <p className="font-semibold text-sm text-[#111827] dark:text-[#FAFAFA]">No institution accounts found.</p>
                        <p className="text-xs text-[#6B7280] mt-1">Click &quot;Add New User&quot; and choose &quot;Partner Institution&quot; to create an institutional login.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => (
                      <tr key={user.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center shrink-0">
                              <Building2 className="h-5 w-5 text-[#2563EB]" />
                            </div>
                            <div>
                              <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">
                                {user.name}
                              </p>
                              <p className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3" /> {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">
                            {user.college || user.name}
                          </span>
                        </td>
                        <td className="p-4">
                          {user.branch ? (
                            <Badge variant="outline" className="font-mono text-[10px] font-bold border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                              {user.branch}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {(() => {
                            const collegeLower = (user.college || user.name || "").trim().toLowerCase();
                            const instBatches = allBatches.filter(
                              (b) => (b.collegeName || "").trim().toLowerCase() === collegeLower
                            );
                            const count = instBatches.length;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInstForBatches(user);
                                  setBatchModalFilter("assigned");
                                  setBatchModalSearch("");
                                  setIsManageBatchesOpen(true);
                                }}
                                title="Click to view and manage assigned batches"
                                className="group inline-flex items-center gap-1.5 focus:outline-none"
                              >
                                <Badge
                                  variant="outline"
                                  className={`font-semibold text-[11px] px-2.5 py-0.5 transition-all cursor-pointer group-hover:scale-105 ${
                                    count > 0
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                      : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                                  }`}
                                >
                                  <span>{count} {count === 1 ? "Batch" : "Batches"}</span>
                                </Badge>
                              </button>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-xs text-[#6B7280]">
                          {user.phone ? (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3 text-[#9CA3AF]" /> {user.phone}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={`text-[10px] font-bold capitalize ${
                            user.status === "active" ? "bg-[#16A34A] text-white" : "bg-[#F59E0B] text-white"
                          }`}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs font-mono text-[#6B7280]">{user.joined}</td>
                        <td className="p-4 pr-6 text-right space-x-2 whitespace-nowrap">
                          <Button
                            onClick={() => {
                              setSelectedInstForBatches(user);
                              setBatchModalFilter("all");
                              setBatchModalSearch("");
                              setIsManageBatchesOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs"
                            title="Manage and assign existing batches for this institution"
                          >
                            Batches
                          </Button>
                          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1 text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/10">
                            <Link href="/institution/overview" target="_blank" title="Open Institution Portal">
                              <ExternalLink className="h-3.5 w-3.5" /> Portal
                            </Link>
                          </Button>
                          <Button onClick={() => handleEditUser(user.id)} variant="outline" size="icon" className="h-8 w-8 text-[#6B7280] border-[#E5E7EB] hover:bg-white shadow-sm" title="Edit Institution Details">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button onClick={() => handleDeleteUser(user.id, user.name)} variant="outline" size="icon" className="h-8 w-8 text-[#DC2626] border-[#DC2626]/20 hover:bg-[#DC2626]/10 shadow-sm" title="Delete Institution">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* Bulk Upload Modal — Fully Functional */}
      <Dialog open={isBulkUploadOpen} onOpenChange={(open) => { setIsBulkUploadOpen(open); if (!open) setBulkPreviewRows([]); }}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">Bulk Import Users</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Upload a CSV or Excel file to provision multiple users at once. Required columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Role</strong> (student/trainer/admin).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Template Download */}
            <div className="bg-[#EFF6FF] dark:bg-[#2563EB]/10 border border-[#DBEAFE] dark:border-[#2563EB]/30 p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#1E40AF] dark:text-[#93C5FD]">Need a template?</p>
                <p className="text-[10px] text-[#6B7280] mt-0.5">Name, Email, Role, Batch/Department, College, Phone</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg px-3 border-[#BFDBFE] text-[#2563EB]"
                onClick={() => {
                  const csv = "data:text/csv;charset=utf-8,Name,Email,Role,Batch,Department,College,Phone\nJohn Doe,john@example.com,student,Batch 2026-A,,State University,9876543210\nJane Smith,jane@example.com,trainer,,Engineering,,,9123456789";
                  const link = document.createElement("a");
                  link.href = encodeURI(csv);
                  link.download = "user_bulk_import_template.csv";
                  link.click();
                }}
              >
                Download Template
              </Button>
            </div>

            {/* File Upload Area */}
            <label className="block border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl p-6 text-center cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] transition-colors">
              <UploadCloud className="h-8 w-8 text-[#2563EB] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#111827] dark:text-white">Click to select file</p>
              <p className="text-[11px] text-[#6B7280] mt-1">Supports .csv, .xlsx, .xls</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const { rows } = await safeParseSpreadsheet(file);
                    if (!rows || rows.length === 0) { toast({ title: "Empty File", variant: "destructive" }); return; }
                    const parsed = rows.map((r: any, i) => {
                      const name = String(r["Name"] || r["name"] || r["Full Name"] || "").trim();
                      const email = String(r["Email"] || r["email"] || r["Email Address"] || "").trim().toLowerCase();
                      const role = String(r["Role"] || r["role"] || "student").trim().toLowerCase();
                      const batch = String(r["Batch"] || r["batch"] || "").trim();
                      const department = String(r["Department"] || r["department"] || "").trim();
                      const college = String(r["College"] || r["college"] || "").trim();
                      const phone = String(r["Phone"] || r["phone"] || "").trim();
                      const isValid = !!email && email.includes("@") && !!name;
                      return { id: `row-${i}`, name, email, role: ["student","trainer","admin","manager"].includes(role) ? role : "student", batch, department, college, phone, isValid, error: !isValid ? (!name ? "Name required" : "Invalid email") : undefined };
                    }).filter((r: any) => r.name || r.email);
                    setBulkPreviewRows(parsed);
                  } catch (err: any) {
                    toast({ title: "Parse Error", description: err.message, variant: "destructive" });
                  }
                  e.target.value = "";
                }}
              />
            </label>

            {/* Preview Table */}
            {bulkPreviewRows.length > 0 && (
              <div className="border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-zinc-900 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                    {bulkPreviewRows.filter((r: any) => r.isValid).length} valid / {bulkPreviewRows.filter((r: any) => !r.isValid).length} invalid rows
                  </span>
                  <button onClick={() => setBulkPreviewRows([])} className="text-xs text-slate-400 hover:text-slate-700">Clear</button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                  {bulkPreviewRows.map((row: any) => (
                    <div key={row.id} className={`px-4 py-2 flex items-center gap-3 text-xs ${row.isValid ? "" : "bg-rose-50/40 dark:bg-rose-950/20"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.isValid ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span className="font-medium text-slate-800 dark:text-zinc-100 w-32 truncate">{row.name || "—"}</span>
                      <span className="text-slate-500 dark:text-zinc-400 flex-1 truncate">{row.email}</span>
                      <span className="uppercase text-[10px] font-bold text-slate-400 w-16">{row.role}</span>
                      {row.error && <span className="text-rose-500 text-[10px]">{row.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 mt-2 border-t border-[#E5E7EB] dark:border-[#27272A] flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setIsBulkUploadOpen(false); setBulkPreviewRows([]); }} className="h-11 px-6 rounded-xl font-bold text-xs">Cancel</Button>
            <Button
              disabled={isBulkImporting || bulkPreviewRows.filter((r: any) => r.isValid).length === 0}
              onClick={async () => {
                const validRows = bulkPreviewRows.filter((r: any) => r.isValid);
                setIsBulkImporting(true);
                let success = 0, failed = 0;
                for (const row of validRows) {
                  try {
                    const res = await fetch("/api/admin/users", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: row.name, email: row.email, role: row.role, batch_id: row.batch || undefined, department: row.department || undefined, college: row.college || undefined, phone: row.phone || undefined }),
                    });
                    if (res.ok) success++; else failed++;
                  } catch { failed++; }
                }
                setIsBulkImporting(false);
                setIsBulkUploadOpen(false);
                setBulkPreviewRows([]);
                await fetchUsers();
                toast({ title: `Import Complete`, description: `${success} users created${failed > 0 ? `, ${failed} failed` : ""}.` });
              }}
              className="h-11 px-8 text-white rounded-xl font-bold text-xs shadow-md bg-[#2563EB] hover:bg-[#1D4ED8]"
            >
              {isBulkImporting ? "Importing..." : `Import ${bulkPreviewRows.filter((r: any) => r.isValid).length} Users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MANAGE INSTITUTION EXISTING BATCHES FULL-SCREEN WORKSPACE ── */}
      <Dialog open={isManageBatchesOpen} onOpenChange={setIsManageBatchesOpen}>
        <DialogContent 
          showCloseButton={false}
          className="!w-[94vw] !max-w-[94vw] sm:!max-w-[94vw] lg:!max-w-[94vw] !h-[92vh] !max-h-[92vh] bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col gap-0 overflow-hidden"
        >
          {/* Workspace Enterprise Header */}
          <div className="pb-5 border-b border-slate-200 dark:border-zinc-800 shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">
                    Institution
                  </span>
                  {selectedInstForBatches?.branch && (
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                      {selectedInstForBatches.branch}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {selectedInstForBatches?.college || selectedInstForBatches?.name || "Institution"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
                  Manage and assign existing LMS batches for this academic partner institution.
                </DialogDescription>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0">
                <div className="flex flex-col lg:items-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Institution SPOC
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-medium text-slate-900 dark:text-zinc-200">
                    {selectedInstForBatches?.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManageBatchesOpen(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons & Search */}
          {(() => {
            const instCollege = (selectedInstForBatches?.college || selectedInstForBatches?.name || "").trim().toLowerCase();
            const assignedList = allBatches.filter(
              (b) => (b.collegeName || "").trim().toLowerCase() === instCollege
            );
            const availableList = allBatches.filter(
              (b) => (b.collegeName || "").trim().toLowerCase() !== instCollege
            );
            const filteredBatchesList = (
              batchModalFilter === "assigned"
                ? assignedList
                : batchModalFilter === "available"
                ? availableList
                : allBatches
            ).filter((b) => {
              if (!batchModalSearch.trim()) return true;
              const q = batchModalSearch.toLowerCase();
              return (
                b.name.toLowerCase().includes(q) ||
                b.code.toLowerCase().includes(q) ||
                (b.course && b.course.toLowerCase().includes(q)) ||
                (b.trainer && b.trainer.toLowerCase().includes(q)) ||
                (b.collegeName && b.collegeName.toLowerCase().includes(q))
              );
            });

            return (
              <>
                <div className="py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      type="button"
                      onClick={() => setBatchModalFilter("all")}
                      className={`h-9 px-4 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                        batchModalFilter === "all"
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      All Existing Batches ({allBatches.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchModalFilter("assigned")}
                      className={`h-9 px-4 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                        batchModalFilter === "assigned"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      Assigned ({assignedList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchModalFilter("available")}
                      className={`h-9 px-4 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                        batchModalFilter === "available"
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      Available to Assign ({availableList.length})
                    </button>
                  </div>

                  <div className="w-full md:w-80 shrink-0">
                    <input
                      type="text"
                      placeholder="Search batch or code..."
                      value={batchModalSearch}
                      onChange={(e) => setBatchModalSearch(e.target.value)}
                      className="h-9 w-full px-3.5 text-xs bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Batches Workspace Table */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950/40">
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="py-3 px-6 w-[28%]">Batch</th>
                          <th className="py-3 px-4 w-[20%]">Lead Trainer</th>
                          <th className="py-3 px-4 w-[14%]">Enrolled</th>
                          <th className="py-3 px-4 w-[16%]">Status</th>
                          <th className="py-3 px-6 w-[22%] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                        {filteredBatchesList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-20 text-center text-slate-500 dark:text-zinc-400">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white">
                                {batchModalSearch ? "No matching batches found." : "No batches in this view."}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                                {batchModalSearch ? "Try adjusting your search criteria." : "There are no batches currently matching this filter."}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredBatchesList.map((batch) => {
                            const isAssigned = (batch.collegeName || "").trim().toLowerCase() === instCollege;
                            const isAssignedOther = Boolean(batch.collegeName && !isAssigned);
                            const isBusy = assigningBatchId === batch.id;

                            return (
                              <tr key={batch.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                                <td className="py-3.5 px-6">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                                      {batch.batchName}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                                      <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                        {batch.code}
                                      </span>
                                      {batch.course && (
                                        <>
                                          <span>·</span>
                                          <span className="truncate max-w-[280px]">{batch.course}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                                    {batch.trainer || "Unassigned"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                    {batch.studentCount} {batch.studentCount === 1 ? "student" : "students"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  {isAssigned ? (
                                    <span className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                      Assigned
                                    </span>
                                  ) : isAssignedOther ? (
                                    <span 
                                      className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 max-w-[200px] truncate" 
                                      title={`Assigned to ${batch.collegeName}`}
                                    >
                                      Linked: {batch.collegeName}
                                    </span>
                                  ) : (
                                    <span className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400">
                                      Available
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-6 text-right">
                                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => setViewingBatchDetail(batch)}
                                      className="h-8 px-3 text-xs font-semibold rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs"
                                      title="View batch details"
                                    >
                                      View
                                    </button>

                                    {isAssigned ? (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleAssignBatchToInstitution(batch.id, "")}
                                        className="h-8 px-3.5 text-xs font-semibold rounded-md border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer transition-colors disabled:opacity-50 shadow-2xs"
                                        title="Delete batch assignment from this institution"
                                      >
                                        {isBusy ? "Deleting..." : "Delete"}
                                      </button>
                                    ) : isAssignedOther ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => {
                                            const targetCollege = selectedInstForBatches?.college || selectedInstForBatches?.name || "";
                                            handleAssignBatchToInstitution(batch.id, targetCollege);
                                          }}
                                          className="h-8 px-3.5 text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                                          title={`Reassign from ${batch.collegeName} to this institution`}
                                        >
                                          {isBusy ? "Assigning..." : "Reassign"}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => handleAssignBatchToInstitution(batch.id, "")}
                                          className="h-8 px-3.5 text-xs font-semibold rounded-md border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer transition-colors disabled:opacity-50 shadow-2xs"
                                          title={`Delete assignment (unlink from ${batch.collegeName})`}
                                        >
                                          {isBusy ? "Deleting..." : "Delete"}
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => {
                                          const targetCollege = selectedInstForBatches?.college || selectedInstForBatches?.name || "";
                                          handleAssignBatchToInstitution(batch.id, targetCollege);
                                        }}
                                        className="h-8 px-4 text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                                        title="Assign this existing batch to this institution"
                                      >
                                        {isBusy ? "Assigning..." : "Assign"}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Workspace Footer */}
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Any batch assigned here instantly syncs with the Institution&apos;s dashboard and performance portal.
            </p>
            <Button
              type="button"
              onClick={() => setIsManageBatchesOpen(false)}
              className="h-9 px-6 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs self-end sm:self-auto"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── BATCH DETAIL PREVIEW MODAL ── */}
      <Dialog open={!!viewingBatchDetail} onOpenChange={(open) => { if (!open) setViewingBatchDetail(null); }}>
        <DialogContent showCloseButton={false} className="max-w-md bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 p-6 rounded-xl shadow-xl">
          <div className="pb-3 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {viewingBatchDetail?.batchName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-mono mt-0.5">
                Code: {viewingBatchDetail?.code}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setViewingBatchDetail(null)}
              className="h-7 px-2.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>

          {viewingBatchDetail && (
            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 font-medium">Linked Institution:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">
                  {viewingBatchDetail.collegeName || "None (Unassigned)"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 font-medium">Course Track:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">
                  {viewingBatchDetail.course || "General Track"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 font-medium">Lead Trainer:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">
                  {viewingBatchDetail.trainer || "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 font-medium">Enrolled Students:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                  {viewingBatchDetail.studentCount} students
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 font-medium">Batch Status:</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  viewingBatchDetail.status === "active" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
                    : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                }`}>
                  {viewingBatchDetail.status}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Start Date:</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200">
                  {viewingBatchDetail.startDate ? new Date(viewingBatchDetail.startDate).toLocaleDateString() : "Not specified"}
                </span>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
            <Button asChild variant="outline" size="sm" className="text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50">
              <Link href="/admin/batches">
                Full Batch Hub
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingBatchDetail(null)}
              className="text-xs font-semibold rounded-lg"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
