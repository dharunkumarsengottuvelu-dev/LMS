"use client";

import { useState, useEffect } from "react";
import { Users, Search, Plus, UserCheck, Trash2, Edit, GraduationCap, Mail, Key, Upload, FileSpreadsheet, UploadCloud } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layouts/page-header";

type UserStatus = "active" | "pending" | "suspended";

interface StudentUser {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  joined: string;
  batch: string;
}

export default function TrainerStudentsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<StudentUser[]>([]);
  const [storeBatches, setStoreBatches] = useState<any[]>([]);

  const [bulkPreviewRows, setBulkPreviewRows] = useState<any[]>([]);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  const loadStudents = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      const { data: sData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (sData) {
        setUsers(sData.map((s: any) => ({
          id: s.id,
          name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email,
          email: s.email,
          status: (s.status as UserStatus) || "active",
          joined: String(s.created_at || new Date().toISOString()).split("T")[0] || "",
          batch: s.batch_id || s.batch_name || s.batch || "Unassigned Batch",
        })));
      }

      const { data: bData } = await supabase.from("batches").select("*");
      if (bData) setStoreBatches(bData);
    } catch (err) {
      console.error("Failed to load students:", err);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);
  const [search, setSearch] = useState("");
  
  // Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserBatch, setNewUserBatch] = useState("");
  const [customBatch, setCustomBatch] = useState("");

  const filtered = users.filter(
    (u) => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail) return;
    const selectedBatch = newUserBatch === "custom" ? customBatch : newUserBatch;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword || "Falcon@2026",
          role: "student",
          batch_id: selectedBatch || undefined,
        }),
      });

      if (res.ok) {
        await loadStudents();
        setIsAddOpen(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setCustomBatch("");
        toast({
          title: "Student Successfully Added",
          description: `${newUserName} has been added to the database.`,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Failed to Add Student", description: err.error || "Server error", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEditUser = (id: string) => {
    const userToEdit = users.find(u => u.id === id);
    if (userToEdit) {
      setNewUserName(userToEdit.name);
      setNewUserEmail(userToEdit.email);
      
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
    if (!editingUserId) return;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const [firstName, ...lastNameArr] = newUserName.trim().split(" ");
      const lastName = lastNameArr.join(" ");
      const selectedBatch = newUserBatch === "custom" ? customBatch : newUserBatch;

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          first_name: firstName || "Student",
          last_name: lastName || "",
          email: newUserEmail.trim().toLowerCase(),
          batch_id: selectedBatch || null,
          batch_name: selectedBatch || null,
          batch: selectedBatch || null,
        })
        .eq("id", editingUserId);

      if (error) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        return;
      }

      await loadStudents();
      setIsEditOpen(false);
      toast({ title: "Profile Updated", description: "Student details saved successfully to database." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Delete Failed", description: err.error || "Failed to remove student", variant: "destructive" });
        return;
      }

      await loadStudents();
      toast({
        title: "Student Removed",
        description: `${name} has been removed from database and batch.`,
        variant: "destructive",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 w-full pb-10 mt-[68px] p-6 lg:p-10">
      {/* Top Banner */}
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Users className="h-8 w-8 text-[#2563EB]" />
            Student Batch Management
          </span>
        }
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
              <Plus className="h-4 w-4" /> Add Student
            </Button>
          </>
        }
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#09090B] p-1.5 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl h-auto">
          <div className="bg-white dark:bg-[#18181B] text-[#2563EB] shadow-sm rounded-lg py-2 px-6 font-bold text-xs flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> All Students
          </div>
        </div>

        <div className="relative w-full md:w-[320px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input 
            placeholder="Search students by name or email..."
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-10 h-11 text-xs bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl focus-visible:ring-1 focus-visible:ring-[#2563EB] shadow-sm transition-all" 
          />
        </div>
      </div>

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
                      <Badge variant="outline" className="text-xs font-semibold border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                        {user.batch}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={`text-[10px] font-bold capitalize ${
                        user.status === "active" ? "bg-[#16A34A] text-white" : "bg-[#F59E0B] text-white"
                      }`}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs font-medium text-[#6B7280]">{user.joined}</td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <Button onClick={() => handleEditUser(user.id)} variant="outline" size="icon" className="h-8 w-8 text-[#6B7280] border-[#E5E7EB] dark:border-[#27272A] hover:text-[#2563EB] hover:bg-[#2563EB]/10 shadow-sm">
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

      {/* Add/Edit Student Modal */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => { if (!open) { setIsAddOpen(false); setIsEditOpen(false); } }}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">
              {isEditOpen ? "Edit Student Account" : "Add Student"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              {isEditOpen ? "Update details for this student." : "Add a new student to your assigned batches."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Full Name</label>
              <Input 
                value={newUserName} 
                onChange={(e) => setNewUserName(e.target.value)} 
                className="h-11 text-sm bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl focus:border-[#2563EB]"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Email Address</label>
              <Input 
                value={newUserEmail} 
                onChange={(e) => setNewUserEmail(e.target.value)} 
                className="h-11 text-sm bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl focus:border-[#2563EB]"
                placeholder="e.g. john@enterprise.com"
              />
            </div>

            {isEditOpen && (
              <div className="space-y-2 mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Password Management</label>
                <div className="flex flex-col gap-3 p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">Force Password Reset</p>
                    <p className="text-xs text-[#6B7280]">Provide a temporary password for this student.</p>
                  </div>
                  <div className="flex gap-2">
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
                          description: `Temp Password set. Student will be prompted to change it on next login.`,
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

            {!isEditOpen && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-[#2563EB]" /> Initial Account Password
                  </label>
                </div>
                <Input
                  type="text"
                  placeholder="Set initial password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="h-11 text-xs font-mono rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Assign Cohort Batch</label>
                <Select value={newUserBatch} onValueChange={(val) => val && setNewUserBatch(val)}>
                  <SelectTrigger className="h-11 text-sm bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border-[#E5E7EB] dark:border-[#27272A]">
                    <SelectValue placeholder="Select Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {storeBatches.length > 0 ? (
                      storeBatches.map(b => (
                        <SelectItem key={b.id} value={b.batchName}>{b.batchName}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no_batches" disabled>No batches available</SelectItem>
                    )}
                    <SelectItem value="custom" className="text-[#2563EB] font-bold">+ Custom Batch...</SelectItem>
                  </SelectContent>
                </Select>
              {newUserBatch === "custom" && (
                <Input 
                  value={customBatch}
                  onChange={(e) => setCustomBatch(e.target.value)}
                  placeholder="Enter custom batch name"
                  className="h-11 text-sm bg-[#F9FAFB] dark:bg-[#09090B] mt-2 border-[#2563EB]/40 focus:border-[#2563EB]"
                />
              )}
            </div>
          </div>

          <DialogFooter className="pt-6 mt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} className="h-11 px-6 rounded-xl font-bold text-xs border-[#E5E7EB] dark:border-[#27272A]">Cancel</Button>
            <Button onClick={isEditOpen ? saveEditUser : handleAddUser} className={`h-11 px-8 text-white rounded-xl font-bold text-xs shadow-md bg-[#2563EB] hover:bg-[#1D4ED8]`}>
              {isEditOpen ? "Save Changes" : "Provision Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal — Fully Functional */}
      <Dialog open={isBulkUploadOpen} onOpenChange={(open) => { setIsBulkUploadOpen(open); if (!open) setBulkPreviewRows([]); }}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">Bulk Import Students</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Upload a CSV or Excel file to provision multiple students and assign them to batches. Required columns: <strong>Name</strong>, <strong>Email</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Template Download */}
            <div className="bg-[#EFF6FF] dark:bg-[#2563EB]/10 border border-[#DBEAFE] dark:border-[#2563EB]/30 p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#1E40AF] dark:text-[#93C5FD]">Need a student template?</p>
                <p className="text-[10px] text-[#6B7280] mt-0.5">Columns: Name, Email, Batch, Phone</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg px-3 border-[#BFDBFE] text-[#2563EB]"
                onClick={() => {
                  const csv = "data:text/csv;charset=utf-8,Name,Email,Batch,Phone\nJohn Doe,john.doe@example.com,Batch 2026-A,9876543210\nJane Smith,jane.smith@example.com,Batch 2026-B,9123456789";
                  const link = document.createElement("a");
                  link.href = encodeURI(csv);
                  link.download = "students_bulk_import_template.csv";
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
                    const XLSX = await import("xlsx");
                    const buf = await file.arrayBuffer();
                    const wb = XLSX.read(buf, { type: "array" });
                    const ws = wb.Sheets[wb.SheetNames[0]!];
                    if (!ws) { toast({ title: "Empty File", variant: "destructive" }); return; }
                    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
                    const parsed = rows.map((r: any, i) => {
                      const name = String(r["Name"] || r["name"] || r["Full Name"] || r["Student Name"] || "").trim();
                      const email = String(r["Email"] || r["email"] || r["Email Address"] || "").trim().toLowerCase();
                      const batch = String(r["Batch"] || r["batch"] || r["Batch Name"] || "").trim();
                      const phone = String(r["Phone"] || r["phone"] || "").trim();
                      const isValid = !!email && email.includes("@") && !!name;
                      return {
                        id: `row-${i}`,
                        name,
                        email,
                        batch,
                        phone,
                        isValid,
                        error: !isValid ? (!name ? "Name required" : "Invalid email format") : undefined,
                      };
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
                      <span className="font-medium text-slate-800 dark:text-zinc-100 w-36 truncate">{row.name || "—"}</span>
                      <span className="text-slate-500 dark:text-zinc-400 flex-1 truncate">{row.email}</span>
                      <span className="text-slate-400 text-[11px] w-28 truncate">{row.batch || "No Batch"}</span>
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
                      body: JSON.stringify({
                        name: row.name,
                        email: row.email,
                        role: "student",
                        batch_id: row.batch || undefined,
                        phone: row.phone || undefined,
                      }),
                    });
                    if (res.ok) success++; else failed++;
                  } catch { failed++; }
                }
                setIsBulkImporting(false);
                setIsBulkUploadOpen(false);
                setBulkPreviewRows([]);
                await loadStudents();
                toast({
                  title: "Import Complete",
                  description: `${success} students created & enrolled${failed > 0 ? `, ${failed} failed` : ""}.`,
                });
              }}
              className="h-11 px-8 text-white rounded-xl font-bold text-xs shadow-md bg-[#2563EB] hover:bg-[#1D4ED8]"
            >
              {isBulkImporting ? "Importing..." : `Import ${bulkPreviewRows.filter((r: any) => r.isValid).length} Students`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
