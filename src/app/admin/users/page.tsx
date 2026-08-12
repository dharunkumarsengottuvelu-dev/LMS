"use client";

import { useState, useEffect } from "react";
import { Users, Search, Plus, UserCheck, Shield, Trash2, Edit, GraduationCap, Building2, Briefcase, Mail, Key, Upload, FileSpreadsheet, X } from "lucide-react";
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

type UserRole = "admin" | "manager" | "trainer" | "student";
type UserStatus = "active" | "pending" | "suspended";
type UserType = "employee" | "student";

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
}

const initialUsers: SystemUser[] = [];

export default function AdminUsersPage() {
  const { toast } = useToast();
  const { batches: storeBatches } = useLMSStore();
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("student");
  
  // Fetch users from DB
  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && !error) {
        const mappedUsers: SystemUser[] = data.map((p: any) => ({
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email?.split("@")[0] || "Unknown",
          email: p.email || "",
          role: p.role as UserRole,
          status: p.status as UserStatus || "active",
          joined: p.created_at?.split("T")[0] || "",
          type: p.role === "student" ? "student" : "employee",
          department: p.department || undefined,
          batch: p.batch_id || undefined,
        }));
        setUsers(mappedUsers);
      } else if (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);
  
  // Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [newUserType, setNewUserType] = useState<UserType>("student");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("student");
  const [newUserDept, setNewUserDept] = useState("");
  const [newUserBatch, setNewUserBatch] = useState("");
  const [customBatch, setCustomBatch] = useState("");

  const filtered = users.filter(
    (u) => 
      u.type === activeTab && 
      (u.name.toLowerCase().includes(search.toLowerCase()) || 
       u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddUser = () => {
    if (!newUserName || !newUserEmail) return;

    const newUser: SystemUser = {
      id: `u_${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: "active",
      joined: new Date().toISOString().split("T")[0] ?? "",
      type: newUserType,
      department: newUserType === "employee" ? newUserDept || "General" : undefined,
      batch: newUserType === "student" ? (newUserBatch === "custom" ? customBatch : newUserBatch) : undefined,
    };

    setUsers([newUser, ...users]);
    setIsAddOpen(false);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setCustomBatch("");
    
    toast({
      title: "User Successfully Added",
      description: `${newUserName} has been added as a ${newUserRole}.`,
    });
  };

  const handleEditUser = (id: string) => {
    const userToEdit = users.find(u => u.id === id);
    if (userToEdit) {
      setNewUserType(userToEdit.type);
      setNewUserName(userToEdit.name);
      setNewUserEmail(userToEdit.email);
      setNewUserRole(userToEdit.role);
      setNewUserDept(userToEdit.department || "");
      
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
          role: newUserRole,
          department: newUserType === "employee" ? newUserDept || "General" : undefined,
          batch: newUserType === "student" ? (newUserBatch === "custom" ? customBatch : newUserBatch) : undefined,
        };
      }
      return u;
    }));
    setIsEditOpen(false);
    toast({ title: "Profile Updated", description: "User details saved successfully." });
  };

  const handleDeleteUser = (id: string, name: string) => {
    setUsers(users.filter(u => u.id !== id));
    toast({
      title: "User Removed",
      description: `${name} has been removed from the system.`,
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-10">
      {/* Top Banner */}
      <PageHeader
        title="Enterprise Access & Directory"
        description="Manage system roles, secure access, and view complete directory profiles"
        actions={
          <>
            <Button 
              onClick={() => setIsBulkUploadOpen(true)}
              variant="outline"
              className="h-[44px] text-[#4B5563] dark:text-[#D4D4D8] font-bold gap-2 px-5 rounded-xl border-[#E5E7EB] dark:border-[#27272A] shadow-sm transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" /> Bulk Import (CSV)
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
                  <div className="flex items-center gap-3 p-1 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => { setNewUserType("student"); setNewUserRole("student"); }}
                      className={`px-8 py-2 text-xs font-bold rounded-lg transition-all ${
                        newUserType === "student"
                          ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-sm border border-[#E5E7EB] dark:border-[#27272A]"
                          : "text-[#6B7280] hover:text-[#111827]"
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewUserType("employee"); setNewUserRole("trainer"); }}
                      className={`px-8 py-2 text-xs font-bold rounded-lg transition-all ${
                        newUserType === "employee"
                          ? "bg-white dark:bg-[#18181B] text-[#9333EA] shadow-sm border border-[#E5E7EB] dark:border-[#27272A]"
                          : "text-[#6B7280] hover:text-[#111827]"
                      }`}
                    >
                      Employee
                    </button>
                  </div>
                </div>
              )}

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
                      className="h-[42px] text-xs bg-[#F9FAFB] mt-2 border-[#2563EB]/40 focus:border-[#2563EB]"
                    />
                  )}
                </div>
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
              <Button onClick={isEditOpen ? saveEditUser : handleAddUser} className={`h-10 px-8 text-white rounded-xl font-bold text-xs shadow-md ${newUserType === 'student' ? 'bg-[#2563EB] hover:bg-[#1D4ED8]' : 'bg-[#9333EA] hover:bg-[#7E22CE]'}`}>
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
              className="data-[state=active]:bg-white data-[state=active]:text-[#9333EA] data-[state=active]:shadow-sm rounded-lg py-2.5 px-6 font-bold text-xs gap-2 transition-all"
            >
              <Briefcase className="h-4 w-4" /> Employees & Trainers
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input 
              placeholder={`Search ${activeTab === 'student' ? 'students' : 'employees'}...`}
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
                          <span className="text-xs font-semibold text-[#4B5563] dark:text-[#D4D4D8] flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-[#9CA3AF]" />
                            {user.department}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={`capitalize text-[10px] font-bold ${
                            user.role === "manager" 
                              ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20" 
                              : "bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/20"
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
      </Tabs>


      {/* Bulk Upload Modal */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">Bulk Import Users</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Upload a CSV or Excel spreadsheet to provision multiple users at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] transition-colors">
              <Upload className="h-10 w-10 text-[#6B7280] mb-3" />
              <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Drag and drop your file here</p>
              <p className="text-[11px] text-[#6B7280] mt-1">Supports .csv, .xlsx, .xls</p>
              <Button variant="outline" className="mt-4 h-9 rounded-lg text-xs font-semibold px-4 bg-white dark:bg-[#18181B]">
                Browse Files
              </Button>
            </div>
            <div className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 border border-[#BFDBFE] dark:border-[#1E3A8A]/50 p-3 rounded-xl flex items-start gap-3">
              <div className="bg-white dark:bg-[#0F172A] p-1.5 rounded-md mt-0.5">
                <FileSpreadsheet className="h-4 w-4 text-[#2563EB]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1E3A8A] dark:text-[#93C5FD]">Need a template?</p>
                <p 
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Name,Email,Type,Role,Department,Batch\nJohn Doe,john@example.com,student,student,,Batch 2026-A\nJane Smith,jane@example.com,employee,trainer,Engineering,";
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "user_import_template.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-[10px] text-[#3B82F6] dark:text-[#BFDBFE] mt-0.5 cursor-pointer hover:underline"
                >
                  Download CSV Template
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 mt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button variant="outline" onClick={() => setIsBulkUploadOpen(false)} className="h-11 px-6 rounded-xl font-bold text-xs">Cancel</Button>
            <Button onClick={() => {
              setIsBulkUploadOpen(false);
              toast({ title: "Import Started", description: "Your file is being processed. Users will appear shortly." });
            }} className="h-11 px-8 text-white rounded-xl font-bold text-xs shadow-md bg-[#2563EB] hover:bg-[#1D4ED8]">
              Upload & Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
