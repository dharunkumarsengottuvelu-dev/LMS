"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  User, Mail, Phone, Globe, Save, Lock, Shield, Edit3, X,
  BookOpen, CheckCircle2, Award, Calendar, Layers, Key, Code2, Link2,
  ExternalLink, Terminal, Cpu, BarChart3, Clock, TrendingUp, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

import { useLMSStore } from "@/lib/store/lms-store";

export default function StudentProfilePage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [practiceCount, setPracticeCount] = useState(0);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [reportTimeSpent, setReportTimeSpent] = useState("0h 0m");
  const [reportCompletedCourses, setReportCompletedCourses] = useState(0);
  const [reportCourses, setReportCourses] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCounts() {
      if (!user?.id) return;
      
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      const { count: eCount } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setEnrolledCount(eCount || 0);
      
      const { count: sCount } = await supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const { count: aCount } = await supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setSubmissionsCount((sCount || 0) + (aCount || 0));

      try {
        const repRes = await fetch("/api/student/reports?range=7d");
        const repData = await repRes.json();
        if (repData.reports) {
          setEnrolledCount(repData.reports.totalCoursesEnrolled || 0);
          setReportCompletedCourses(repData.reports.completedCoursesCount || 0);
          setReportCourses(repData.reports.courses || []);
          const totalSecs = repData.reports.totalTimeSpentSeconds || 0;
          const hrs = Math.floor(totalSecs / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          setReportTimeSpent(`${hrs}h ${mins}m`);
        }
      } catch (err) {
        console.error("Failed to load reports in profile", err);
      }
    }
    fetchCounts();
  }, [user]);

  const [activeTab, setActiveTab] = useState<"personal" | "coding" | "security" | "reports">("personal");

  // Edit Mode Toggles
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingCoding, setIsEditingCoding] = useState(false);

  // Personal Info States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  
  useEffect(() => {
    if (user?.email) setEmail(user.email);
    
    // Extract First Name
    if (profile?.first_name && profile.first_name !== "User") {
      setFirstName(profile.first_name);
    } else if (user?.user_metadata?.full_name) {
      const nameStr = String(user.user_metadata.full_name || "");
      setFirstName(nameStr.split(" ")[0] || "");
    } else if (user?.email) {
      const emailStr = String(user?.email || "");
      const parts = (emailStr.split("@")[0] || "").split(/[\.\-_]/);
      if (parts[0]) setFirstName(parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
    }

    // Extract Last Name
    if (profile?.last_name) {
      setLastName(profile.last_name);
    } else if (user?.user_metadata?.full_name) {
      const nameStr = String(user.user_metadata.full_name || "");
      const parts = nameStr.split(" ") || [];
      setLastName(parts.length > 1 ? parts.slice(1).join(" ") : "");
    } else if (user?.email) {
      const emailStr = String(user?.email || "");
      const parts = (emailStr.split("@")[0] || "").split(/[\.\-_]/);
      if (parts.length > 1 && parts[1]) {
        setLastName(parts[1].charAt(0).toUpperCase() + parts[1].slice(1));
      } else {
        setLastName("");
      }
    }
  }, [profile, user]);

  const [phone, setPhone] = useState(profile?.phone || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [skills, setSkills] = useState(profile?.skills?.join(", ") || "");

  // Coding & Social Links States
  const pAny = profile as any;
  const [leetcode, setLeetcode] = useState(pAny?.leetcode || "");
  const [hackerrank, setHackerrank] = useState(pAny?.hackerrank || "");
  const [codechef, setCodechef] = useState(pAny?.codechef || "");
  const [github, setGithub] = useState(profile?.github_url || pAny?.github || "");
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url || pAny?.linkedin || "");
  const [portfolio, setPortfolio] = useState(profile?.website_url || pAny?.portfolio || "");

  // Security States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSavePersonal = () => {
    setIsEditingPersonal(false);
    toast({
      title: "Personal Information Saved",
      description: "Your student profile details have been updated successfully.",
    });
  };

  const handleSaveCoding = () => {
    setIsEditingCoding(false);
    toast({
      title: "Coding Profiles Saved",
      description: "Your LeetCode, HackerRank, and CodeChef URLs have been updated.",
    });
  };

  const handleUpdatePassword = () => {
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
    toast({
      title: "Password Updated",
      description: "Your security credentials have been updated successfully.",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const batchName = (profile as any)?.batch_id || "Not Assigned";
  const loginDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A";
  const accountStatus = (profile as any)?.status || "active";

  return (
    <div className="w-full space-y-8 pb-12">
      {/* 1. Page Header */}
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Student Profile
        </h1>
      </div>

      {/* 2. Professional 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT SIDEBAR: Student Summary & Nav Menu */}
        <div className="lg:col-span-1 space-y-6">
          {/* Student Profile Summary Card */}
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm overflow-hidden">
            <div className="h-24 bg-[#2563EB]/10 border-b border-[#E5E7EB] dark:border-[#27272A]" />
            <CardContent className="p-6 pt-0 text-center relative space-y-4">
              <Avatar className="h-24 w-24 border-4 border-white dark:border-[#18181B] mx-auto -mt-12 shadow-md">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#2563EB] text-white text-2xl font-bold">
                  {getInitials(`${firstName} ${lastName}`)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <h2 className="text-[20px] font-bold text-[#111827] dark:text-[#FAFAFA] text-center break-all">
                    {firstName} {lastName ? lastName.charAt(0).toUpperCase() : ""}
                  </h2>
                  <Badge className="bg-[#2563EB] text-white text-[10px] uppercase font-bold px-2 py-0.5">
                    Student
                  </Badge>
                </div>
                <p className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] break-all px-2 uppercase tracking-wider">
                  {email ? `@${email.split('@')[0]}` : ""}
                </p>
                

              </div>

              {/* Structured Profile Breakdown */}
              <div className="text-left space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-[#27272A] text-xs text-[#6B7280]">
                <div className="flex justify-between">
                  <span>Login Date:</span>
                  <strong className="text-[#111827] dark:text-[#FAFAFA]">{loginDate}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Account Status:</span>
                  <Badge className={`text-[10px] font-bold capitalize ${accountStatus === "active" ? "bg-[#16A34A] text-white" : "bg-[#DC2626] text-white"}`}>
                    {accountStatus}
                  </Badge>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-2 bg-[#F9FAFB] dark:bg-[#09090B] p-3 rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
                <div>
                  <p className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">{enrolledCount}</p>
                  <p className="text-[10px] font-semibold text-[#6B7280]">Enrolled</p>
                </div>
                <div>
                  <p className="text-base font-bold text-[#16A34A]">{practiceCount}</p>
                  <p className="text-[10px] font-semibold text-[#6B7280]">Practice</p>
                </div>
                <div>
                  <p className="text-base font-bold text-[#2563EB]">{submissionsCount}</p>
                  <p className="text-[10px] font-semibold text-[#6B7280]">Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Navigation Menu Options */}
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2 space-y-1">
            <button
              onClick={() => setActiveTab("personal")}
              className={cn(
                "w-full flex items-center justify-between p-3.5 rounded-lg text-xs font-semibold transition-all text-left",
                activeTab === "personal"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-[#4B5563] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
              )}
            >
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4 shrink-0" />
                <span>Personal Information</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("coding")}
              className={cn(
                "w-full flex items-center justify-between p-3.5 rounded-lg text-xs font-semibold transition-all text-left",
                activeTab === "coding"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-[#4B5563] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Code2 className="h-4 w-4 shrink-0" />
                <span>Coding Profiles & Links</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={cn(
                "w-full flex items-center justify-between p-3.5 rounded-lg text-xs font-semibold transition-all text-left",
                activeTab === "security"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-[#4B5563] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Account & Security</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("reports")}
              className={cn(
                "w-full flex items-center justify-between p-3.5 rounded-lg text-xs font-semibold transition-all text-left",
                activeTab === "reports"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-[#4B5563] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
              )}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span>Reports & Analytics</span>
              </div>
              <Badge className="bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#1E3A8A]/30 border-0 text-[10px] font-bold">
                Live
              </Badge>
            </button>
          </Card>
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB 1: PERSONAL INFORMATION */}
          {activeTab === "personal" && (
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Personal & Academic Details
                  </CardTitle>
                  <CardDescription className="text-xs text-[#6B7280]">
                    View and manage your identity details, phone number, and technical bio
                  </CardDescription>
                </div>

                {/* Edit Toggle Button */}
                {!isEditingPersonal ? (
                  <Button
                    onClick={() => setIsEditingPersonal(true)}
                    variant="outline"
                    className="h-9 px-4 text-xs font-semibold gap-1.5 border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsEditingPersonal(false)}
                    variant="ghost"
                    className="h-9 px-3 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 gap-1"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">First Name</Label>
                    <Input
                      className="h-[44px]"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={!isEditingPersonal}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Last Name</Label>
                    <Input
                      className="h-[44px]"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={!isEditingPersonal}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Email Address (Primary)</Label>
                    <Input className="h-[44px] bg-[#F9FAFB] dark:bg-[#09090B]" value={email} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Phone Number</Label>
                    <Input
                      className="h-[44px]"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isEditingPersonal}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Technical Bio</Label>
                  <Textarea
                    className="min-h-[110px] text-sm leading-relaxed"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={!isEditingPersonal}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Tech Stack & Skills</Label>
                  <Input
                    className="h-[44px]"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    disabled={!isEditingPersonal}
                  />
                </div>

                {/* Only Show Save Button when Edit Mode is Active */}
                {isEditingPersonal && (
                  <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center gap-3">
                    <Button className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2" onClick={handleSavePersonal}>
                      <Save className="h-4 w-4" /> Save Personal Information
                    </Button>
                    <Button variant="outline" className="h-[44px] px-5 text-xs font-semibold" onClick={() => setIsEditingPersonal(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 2: CODING PROFILES & URLS */}
          {activeTab === "coding" && (
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Competitive Coding & Social Profiles
                  </CardTitle>
                  <CardDescription className="text-xs text-[#6B7280]">
                    Manage your LeetCode, HackerRank, CodeChef, GitHub, and LinkedIn profile URLs
                  </CardDescription>
                </div>

                {/* Edit Toggle Button */}
                {!isEditingCoding ? (
                  <Button
                    onClick={() => setIsEditingCoding(true)}
                    variant="outline"
                    className="h-9 px-4 text-xs font-semibold gap-1.5 border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Coding Links
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsEditingCoding(false)}
                    variant="ghost"
                    className="h-9 px-3 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 gap-1"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                
                {/* LeetCode URL */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                    <span>LeetCode Profile URL</span>
                    <a href={leetcode} target="_blank" rel="noreferrer" className="text-[11px] text-[#2563EB] hover:underline flex items-center gap-1">
                      Visit Profile <ExternalLink className="h-3 w-3" />
                    </a>
                  </Label>
                  <Input
                    className="h-[44px]"
                    placeholder="https://leetcode.com/u/your-username"
                    value={leetcode}
                    onChange={(e) => setLeetcode(e.target.value)}
                    disabled={!isEditingCoding}
                  />
                </div>

                {/* HackerRank URL */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                    <span>HackerRank Profile URL</span>
                    <a href={hackerrank} target="_blank" rel="noreferrer" className="text-[11px] text-[#2563EB] hover:underline flex items-center gap-1">
                      Visit Profile <ExternalLink className="h-3 w-3" />
                    </a>
                  </Label>
                  <Input
                    className="h-[44px]"
                    placeholder="https://hackerrank.com/profile/your-username"
                    value={hackerrank}
                    onChange={(e) => setHackerrank(e.target.value)}
                    disabled={!isEditingCoding}
                  />
                </div>

                {/* CodeChef URL */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                    <span>CodeChef Profile URL</span>
                    <a href={codechef} target="_blank" rel="noreferrer" className="text-[11px] text-[#2563EB] hover:underline flex items-center gap-1">
                      Visit Profile <ExternalLink className="h-3 w-3" />
                    </a>
                  </Label>
                  <Input
                    className="h-[44px]"
                    placeholder="https://codechef.com/users/your-username"
                    value={codechef}
                    onChange={(e) => setCodechef(e.target.value)}
                    disabled={!isEditingCoding}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GitHub URL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">GitHub Profile URL</Label>
                    <Input
                      className="h-[44px]"
                      placeholder="https://github.com/your-username"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      disabled={!isEditingCoding}
                    />
                  </div>

                  {/* LinkedIn URL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">LinkedIn Profile URL</Label>
                    <Input
                      className="h-[44px]"
                      placeholder="https://linkedin.com/in/your-username"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      disabled={!isEditingCoding}
                    />
                  </div>
                </div>

                {/* Portfolio Website URL */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Portfolio Website URL</Label>
                  <Input
                    className="h-[44px]"
                    placeholder="https://yourportfolio.com"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    disabled={!isEditingCoding}
                  />
                </div>

                {/* Only Show Save Button when Edit Mode is Active */}
                {isEditingCoding && (
                  <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center gap-3">
                    <Button className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2" onClick={handleSaveCoding}>
                      <Save className="h-4 w-4" /> Save Coding Profiles & Links
                    </Button>
                    <Button variant="outline" className="h-[44px] px-5 text-xs font-semibold" onClick={() => setIsEditingCoding(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: ACCOUNT & SECURITY */}
          {activeTab === "security" && (
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
                <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Account Security & Password
                </CardTitle>
                <CardDescription className="text-xs text-[#6B7280]">
                  Update your authentication credentials and password preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Current Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    className="h-[44px]"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">New Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    className="h-[44px]"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="Re-enter new password"
                    className="h-[44px]"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
                  <Button className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2" onClick={handleUpdatePassword}>
                    <Key className="h-4 w-4" /> Update Account Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: REPORTS & ANALYTICS PREVIEW */}
          {activeTab === "reports" && (
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#2563EB]" /> Learning Reports & Analytics Summary
                  </CardTitle>
                  <CardDescription className="text-xs text-[#6B7280]">
                    Overview of your course progress, module milestones, and active time spent
                  </CardDescription>
                </div>

                <Link href="/student/reports">
                  <Button className="h-9 px-4 text-xs font-bold gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs">
                    Open Full Reports Dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* 4 Summary Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[10px] font-bold uppercase text-[#6B7280]">Enrolled Courses</span>
                    <p className="text-2xl font-extrabold text-[#D97706] mt-1">{enrolledCount}</p>
                    <p className="text-[10px] text-[#6B7280]">Assigned tracks</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[10px] font-bold uppercase text-[#6B7280]">Activities Done</span>
                    <p className="text-2xl font-extrabold text-[#16A34A] mt-1">{submissionsCount}</p>
                    <p className="text-[10px] text-[#16A34A] font-semibold">Live Submissions</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[10px] font-bold uppercase text-[#6B7280]">Time Spent</span>
                    <p className="text-2xl font-extrabold text-[#111827] dark:text-[#FAFAFA] mt-1">{reportTimeSpent}</p>
                    <p className="text-[10px] text-[#6B7280]">Active evaluation</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[10px] font-bold uppercase text-[#6B7280]">Completed Tracks</span>
                    <p className="text-2xl font-extrabold text-[#2563EB] mt-1">{reportCompletedCourses}</p>
                    <p className="text-[10px] text-[#6B7280]">Certificates ready</p>
                  </div>
                </div>

                {/* Module Progress Highlights */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-[#2563EB]" /> Course Completion Highlights
                    </h3>
                    <Link href="/student/reports" className="text-[11px] font-bold text-[#2563EB] hover:underline">
                      View all details →
                    </Link>
                  </div>

                  {reportCourses.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#6B7280] bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
                      No enrolled courses found for your batch.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reportCourses.slice(0, 3).map((c, i) => (
                        <div key={c.id || i}>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="truncate max-w-[280px]">{c.title}</span>
                            <span className="text-[#0D9488] font-bold">{c.progress}%</span>
                          </div>
                          <div className="h-2 w-full bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#0D9488] rounded-full transition-all duration-500"
                              style={{ width: `${c.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Banner CTA */}
                <div className="p-4 rounded-xl bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 border border-[#2563EB]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-5 w-5 text-[#2563EB] shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                        Detailed Login Records & Daily Time Spent
                      </h4>
                      <p className="text-[11px] text-[#6B7280]">
                        Audit your exact login sessions, IP addresses, and day-by-day learning timestamps.
                      </p>
                    </div>
                  </div>

                  <Link href="/student/reports">
                    <Button size="sm" className="h-8 text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shrink-0">
                      Explore Reports
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
