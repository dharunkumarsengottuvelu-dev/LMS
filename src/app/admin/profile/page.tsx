"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Lock,
  Key,
  Calendar,
  CheckCircle2,
  Building,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getInitials, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function AdminProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"personal" | "security" | "permissions">("personal");

  // Personal Information State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Security Credentials State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Initialize fields from user & profile
  useEffect(() => {
    if (user || profile) {
      const p = profile as any;
      const meta = (user?.user_metadata as any) || {};
      const emailStr = user?.email || p?.email || "";
      const emailPrefix = emailStr.split("@")[0] || "";
      const parts = emailPrefix.split(/[._-]/);

      const fName =
        p?.first_name ||
        meta?.first_name ||
        (parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "System");
      const lName =
        p?.last_name ||
        meta?.last_name ||
        (parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "Administrator");

      setFirstName(fName);
      setLastName(lName);
      setEmail(emailStr);
      setPhone(p?.phone || meta?.phone || "");
      setDepartment(p?.department || meta?.department || "Enterprise Administration");
      setBio(p?.bio || meta?.bio || "System Administrator overseeing Sensilearn enterprise operations.");
    }
  }, [user, profile]);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonal(true);
    try {
      const supabase = createClient();

      // Update Supabase profiles table
      const { error: profileError } = await (supabase.from("profiles") as any)
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          bio,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id || "");

      if (profileError) {
        console.warn("Profiles update notice:", profileError.message);
      }

      // Update auth user metadata
      await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          phone,
          department,
          bio,
        },
      });

      if (refreshProfile) {
        await refreshProfile();
      }

      toast({
        title: "Profile Saved",
        description: "Your administrator profile details have been updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to save profile changes.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password Error",
        description: "New password must be at least 6 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: "Security Credentials Updated",
        description: "Your administrator account password has been changed.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: err.message || "Could not update password.",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const userRole = (profile?.role || (user?.user_metadata as any)?.role || "admin").toUpperCase();
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Active Session";

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Admin Profile"
        description="Manage your enterprise administrator identity, system credentials, and security configurations."
      />

      {/* 2. Top Identity Banner */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-slate-200 dark:border-zinc-700 shadow-sm bg-primary/10 text-primary">
              <AvatarImage src={profile?.avatar_url || undefined} alt={`${firstName} ${lastName}`} />
              <AvatarFallback className="text-xl sm:text-2xl font-bold bg-primary/10 text-primary">
                {getInitials(`${firstName} ${lastName}`)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {firstName} {lastName}
                </h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                  {userRole}
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                  Active
                </Badge>
              </div>

              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-zinc-400">
                {email}
              </p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 flex items-center justify-center sm:justify-start gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Account created: <strong className="font-semibold text-slate-600 dark:text-zinc-300">{joinedDate}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center min-w-[120px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Security Level</span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 mt-0.5">
                <Shield className="h-4 w-4" /> Root Admin
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Horizontal Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-6">
        <div className="border-b border-slate-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 flex space-x-6 sm:space-x-8">
            <TabsTrigger
              value="personal"
              className="py-3 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none text-xs sm:text-sm font-bold whitespace-nowrap rounded-none transition-colors"
            >
              Personal Details
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="py-3 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none text-xs sm:text-sm font-bold whitespace-nowrap rounded-none transition-colors"
            >
              Security & Credentials
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="py-3 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none text-xs sm:text-sm font-bold whitespace-nowrap rounded-none transition-colors"
            >
              System Permissions
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Personal Details */}
        <TabsContent value="personal" className="mt-0 outline-none">
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Personal Information
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Update your administrative display name, contact phone number, and unit bio.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSavePersonal} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                      placeholder="Admin First Name"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                      placeholder="Admin Last Name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Email Address (Identity)
                    </Label>
                    <Input
                      id="email"
                      value={email}
                      disabled
                      className="h-10 text-xs rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Administrative Department / Role
                  </Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                    placeholder="Enterprise Administration / Academic Affairs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Administrative Bio & Responsibility
                  </Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                    placeholder="Summary of responsibilities..."
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingPersonal}
                    className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSavingPersonal ? "Saving..." : "Save Profile Details"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Security & Credentials */}
        <TabsContent value="security" className="mt-0 outline-none">
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs max-w-2xl">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> Change Admin Password
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ensure your account uses a strong, enterprise-grade password to safeguard system configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="newPass" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    New Password
                  </Label>
                  <Input
                    id="newPass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                    placeholder="Enter at least 6 characters"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPass" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-2"
                  >
                    <Key className="h-4 w-4" />
                    <span>{isUpdatingPassword ? "Updating..." : "Update Password"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: System Permissions */}
        <TabsContent value="permissions" className="mt-0 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs">
              <CardHeader className="p-6 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Granted Privileges
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-xs">
                {[
                  "User Management & Role Provisioning",
                  "Batch & Cohort Configuration",
                  "Curriculum & Course Track Publishing",
                  "Universal Compiler & Sandbox Control",
                  "Proctored Evaluation & Anti-Cheat Inspection",
                  "Institutional Performance Intelligence",
                ].map((priv, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 py-1 text-slate-700 dark:text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{priv}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs">
              <CardHeader className="p-6 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  Session Governance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500">Authentication Method</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Supabase Enterprise Auth</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500">Inactivity Timeout</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Active Heartbeat (30 min)</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500">Access Tier</span>
                  <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/20">
                    SUPERUSER
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Audit Logging</span>
                  <span className="font-semibold text-emerald-600">Enabled</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
