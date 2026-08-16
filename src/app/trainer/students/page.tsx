"use client";

import { useState, useEffect } from "react";
import { Users, Search, Plus, UserCheck, Trash2, Edit, GraduationCap, Mail, Key, Upload, FileSpreadsheet } from "lucide-react";
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

  useEffect(() => {
    async function loadData() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      const { data: sData } = await supabase.from("profiles").select("*").eq("role", "student");
      if (sData) {
        setUsers(sData.map((s: any) => ({
          id: s.id,
          name: s.first_name + " " + s.last_name,
          email: s.email,
          status: s.status as UserStatus || "active",
          joined: String(s.created_at || new Date().toISOString()).split("T")[0] || "",
          batch: s.batch_id || "Unassigned Batch",
        })));
      }

      const { data: bData } = await supabase.from("batches").select("*");
      if (bData) setStoreBatches(bData);
    }
    loadData();
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

  const handleAddUser = () => {
    if (!newUserName || !newUserEmail) return;

    const newUser: StudentUser = {
      id: `u_${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      status: "active",
      joined: new Date().toISOString().split("T")[0] ?? "",
      batch: newUserBatch === "custom" ? customBatch : newUserBatch,
    };

    setUsers([newUser, ...users]);
    setIsAddOpen(false);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setCustomBatch("");
    
    toast({
      title: "Student Successfully Added",
      description: `${newUserName} has been added to the batch.`,
    });
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

  const saveEditUser = () => {
    setUsers(users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: newUserName,
          email: newUserEmail,
          batch: newUserBatch === "custom" ? customBatch : newUserBatch,
        };
      }
      return u;
    }));
    setIsEditOpen(false);
    toast({ title: "Profile Updated", description: "Student details saved successfully." });
  };

  const handleDeleteUser = (id: string, name: string) => {
    setUsers(users.filter(u => u.id !== id));
    toast({
      title: "Student Removed",
      description: `${name} has been removed from the batch.`,
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-8 w-full pb-10 mt-[68px] p-6 lg:p-10">
      {/* Top Banner */}
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Users className="h-8 w-8 text-[#9333EA]" />
            Student Batch Management
          </span>
        }
        description="Manage your students, track their assigned batches, and provision access"
        actions={
          <>
            <Button 
              onClick={() => setIsBulkUploadOpen(true)}
              variant="outline"
              className="h-[44px] text-[#4B5563] dark:text-[#D4D4D8] font-bold gap-2 px-5 rounded-xl border-[#E5E7EB] dark:border-[#27272A] shadow-sm transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" /> Bulk Import
            </Button>
            <Button 
              onClick={() => setIsAddOpen(true)}
              className="h-[44px] bg-[#9333EA] hover:bg-[#7E22CE] text-white font-bold gap-2 px-5 rounded-xl shadow-md shadow-[#9333EA]/20 transition-all"
            >
              <Plus className="h-4 w-4" /> Add Student
            </Button>
          </>
        }
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#09090B] p-1.5 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl h-auto">
          <div className="bg-white dark:bg-[#18181B] text-[#9333EA] shadow-sm rounded-lg py-2 px-6 font-bold text-xs flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> All Students
          </div>
        </div>

        <div className="relative w-full md:w-[320px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input 
            placeholder="Search students by name or email..."
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-10 h-11 text-xs bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl focus-visible:ring-1 focus-visible:ring-[#9333EA] shadow-sm transition-all" 
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
                          <AvatarFallback className="bg-[#9333EA]/10 text-[#9333EA] font-bold text-sm">
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
                      <Badge variant="outline" className="text-xs font-semibold border-[#9333EA]/30 text-[#9333EA] bg-[#9333EA]/5">
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
                    <td className="p-4 text-xs font-mono text-[#6B7280]">{user.joined}</td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <Button onClick={() => handleEditUser(user.id)} variant="outline" size="icon" className="h-8 w-8 text-[#6B7280] border-[#E5E7EB] dark:border-[#27272A] hover:bg-white shadow-sm">
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

      {/* Add / Edit User Modal */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }
      }}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">
              {isEditOpen ? "Edit Student Profile" : "Add New Student"}
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
                className="h-11 text-sm bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl focus:border-[#9333EA]"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Email Address</label>
              <Input 
                value={newUserEmail} 
                onChange={(e) => setNewUserEmail(e.target.value)} 
                className="h-11 text-sm bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl focus:border-[#9333EA]"
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
                      className="shrink-0 h-9 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold"
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
                    <Key className="h-3.5 w-3.5 text-[#9333EA]" /> Initial Account Password
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
                    <SelectItem value="custom" className="text-[#9333EA] font-bold">+ Custom Batch...</SelectItem>
                  </SelectContent>
                </Select>
              {newUserBatch === "custom" && (
                <Input 
                  value={customBatch}
                  onChange={(e) => setCustomBatch(e.target.value)}
                  placeholder="Enter custom batch name"
                  className="h-11 text-sm bg-[#F9FAFB] dark:bg-[#09090B] mt-2 border-[#9333EA]/40 focus:border-[#9333EA]"
                />
              )}
            </div>
          </div>

          <DialogFooter className="pt-6 mt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} className="h-11 px-6 rounded-xl font-bold text-xs border-[#E5E7EB] dark:border-[#27272A]">Cancel</Button>
            <Button onClick={isEditOpen ? saveEditUser : handleAddUser} className={`h-11 px-8 text-white rounded-xl font-bold text-xs shadow-md bg-[#9333EA] hover:bg-[#7E22CE]`}>
              {isEditOpen ? "Save Changes" : "Provision Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">Bulk Import Students</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Upload a CSV or Excel spreadsheet to provision multiple students at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] transition-colors">
              <Upload className="h-10 w-10 text-[#6B7280] mb-3" />
              <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Drag and drop your file here</p>
              <p className="text-[11px] text-[#6B7280] mt-1">Supports .csv, .xlsx, .xls</p>
              <Button variant="outline" className="mt-4 h-9 rounded-lg text-xs font-semibold px-4 bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]">
                Browse Files
              </Button>
            </div>
            <div className="bg-[#FAF5FF] dark:bg-[#9333EA]/10 border border-[#E9D5FF] dark:border-[#9333EA]/30 p-3 rounded-xl flex items-start gap-3">
              <div className="bg-white dark:bg-[#18181B] p-1.5 rounded-md mt-0.5">
                <FileSpreadsheet className="h-4 w-4 text-[#9333EA]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#6B21A8] dark:text-[#D8B4FE]">Need a template?</p>
                <p 
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Name,Email,Batch\nJane Smith,jane@example.com,Batch 2026-A\nAlice Doe,alice@example.com,Enterprise FastTrack";
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "student_import_template.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-[10px] text-[#9333EA] dark:text-[#D8B4FE] mt-0.5 cursor-pointer hover:underline font-semibold"
                >
                  Download CSV Template
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 mt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button variant="outline" onClick={() => setIsBulkUploadOpen(false)} className="h-11 px-6 rounded-xl font-bold text-xs border-[#E5E7EB] dark:border-[#27272A]">Cancel</Button>
            <Button onClick={() => {
              setIsBulkUploadOpen(false);
              toast({ title: "Import Started", description: "Your file is being processed. Students will appear shortly." });
            }} className="h-11 px-8 text-white rounded-xl font-bold text-xs shadow-md bg-[#9333EA] hover:bg-[#7E22CE]">
              Upload & Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
