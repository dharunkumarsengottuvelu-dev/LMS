"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  User, Mail, Phone, Globe, Save, Lock, Shield, Edit3, X,
  BookOpen, CheckCircle2, Award, Calendar, Layers, Key, Code2, Link2,
  ExternalLink, Terminal, Cpu, BarChart3, Clock, TrendingUp, ArrowUpRight,
  Dumbbell, ClipboardList, Check, Filter, Search, Inbox, Laptop, Download, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getInitials, cn } from "@/lib/utils";

export default function StudentProfilePage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  // Basic counters
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [practiceCount, setPracticeCount] = useState(0);
  const [submissionsCount, setSubmissionsCount] = useState(0);

  // Tab State
  const [activeTab, setActiveTab] = useState<"personal" | "coding" | "security" | "reports">("personal");
  const [reportSubTab, setReportSubTab] = useState<"courses" | "practices" | "assessments" | "time">("courses");
  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "all">("7d");
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Reports data
  const [reportSummary, setReportSummary] = useState<any>({});
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [practicesList, setPracticesList] = useState<any[]>([]);
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [dailyTimeSpent, setDailyTimeSpent] = useState<any[]>([]);
  const [loginActivities, setLoginActivities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Mode Toggles
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingCoding, setIsEditingCoding] = useState(false);

  // Personal Info States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");

  // Coding Links States
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [leetcodeUrl, setLeetcodeUrl] = useState("");
  const [hackerrankUrl, setHackerrankUrl] = useState("");
  const [codechefUrl, setCodechefUrl] = useState("");
  const [codeforcesUrl, setCodeforcesUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Initialize from user / profile
  useEffect(() => {
    if (user || profile) {
      const p = profile as any;
      const emailStr = user?.email || p?.email || "";
      const emailPrefix = emailStr.split("@")[0] || "";
      const parts = emailPrefix.split(/[._-]/);

      const defaultFirst = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Student";
      const defaultLast = parts.length > 1 && parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "";

      setFirstName(p?.first_name || defaultFirst);
      setLastName(p?.last_name || defaultLast);
      setEmail(emailStr);
      setPhone(p?.phone || "");
      setBio(p?.bio || "");
      setSkills(Array.isArray(p?.skills) ? p.skills.join(", ") : "");

      setGithubUrl(p?.github_url || "");
      setLinkedinUrl(p?.linkedin_url || "");
      setPortfolioUrl(p?.website_url || "");
      setLeetcodeUrl(p?.leetcode_url || "");
      setHackerrankUrl(p?.hackerrank_url || "");
      setCodechefUrl(p?.codechef_url || "");
      setCodeforcesUrl(p?.codeforces_url || "");
    }
  }, [user, profile]);

  // Fetch Reports Data dynamically
  const fetchReportData = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const repRes = await fetch(`/api/student/reports?range=${dateRange}`);
      const repData = await repRes.json();
      if (repData.reports) {
        const sum = repData.reports.summary || {};
        setReportSummary(sum);
        setEnrolledCount(sum.enrolledCoursesCount || 0);
        setPracticeCount(sum.practicesCount || 0);
        setSubmissionsCount(sum.totalSubmissionsCount || 0);
        setCoursesList(repData.reports.coursesList || []);
        setPracticesList(repData.reports.practicesList || []);
        setAssessmentsList(repData.reports.assessmentsList || []);
        setDailyTimeSpent(repData.reports.dailyTimeSpent || []);
        setLoginActivities(repData.reports.loginActivities || []);
      }
    } catch (err) {
      console.error("Failed to load reports in profile", err);
    } finally {
      setIsLoadingReports(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const dateRangeLabel = useMemo(() => {
    switch (dateRange) {
      case "7d":
        return "Last 7 days";
      case "14d":
        return "Last 14 days";
      case "30d":
        return "Last 30 days";
      case "all":
        return "All time";
    }
  }, [dateRange]);

  const formatTimeSpent = (secs: number) => {
    if (!secs || secs === 0) return "0 h 0 min 0 s";
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hours} h ${mins} min ${s} s`;
  };

  const loginDate = useMemo(() => {
    if (user?.last_sign_in_at) {
      return new Date(user.last_sign_in_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [user]);

  const accountStatus = profile?.status || "active";

  // Filter lists by search query
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return coursesList;
    return coursesList.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [coursesList, searchQuery]);

  const filteredPractices = useMemo(() => {
    if (!searchQuery.trim()) return practicesList;
    return practicesList.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [practicesList, searchQuery]);

  const filteredAssessments = useMemo(() => {
    if (!searchQuery.trim()) return assessmentsList;
    return assessmentsList.filter((a) => a.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [assessmentsList, searchQuery]);

  // Handlers
  const handleSavePersonalInfo = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const skillsArray = skills.split(",").map((s) => s.trim()).filter(Boolean);

      const { error } = await (supabase.from("profiles") as any)
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          bio,
          skills: skillsArray,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id || "");

      if (error) throw error;
      toast({ title: "Profile Updated", description: "Personal details saved successfully." });
      setIsEditingPersonal(false);
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveCodingLinks = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await (supabase.from("profiles") as any)
        .update({
          github_url: githubUrl,
          linkedin_url: linkedinUrl,
          website_url: portfolioUrl,
          leetcode_url: leetcodeUrl,
          hackerrank_url: hackerrankUrl,
          codechef_url: codechefUrl,
          codeforces_url: codeforcesUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id || "");

      if (error) throw error;
      toast({ title: "Links Saved", description: "Coding profiles updated successfully." });
      setIsEditingCoding(false);
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Invalid Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords Mismatch", description: "Confirmation does not match.", variant: "destructive" });
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password Updated", description: "Your security credentials have been changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Password Update Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] dark:text-[#FAFAFA] tracking-tight">
            Student Profile
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Manage your personal profile, credentials, and detailed learning analyses
          </p>
        </div>
      </div>

      {/* 2. 2-Column Layout */}
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

              {/* Dynamic Stats Summary */}
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
                <span>Reports & Analyses</span>
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
                {!isEditingPersonal ? (
                  <Button
                    onClick={() => setIsEditingPersonal(true)}
                    variant="outline"
                    className="h-9 px-4 text-xs font-bold gap-1.5 border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsEditingPersonal(false)}
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-medium text-[#6B7280]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSavePersonalInfo}
                      size="sm"
                      className="h-8 px-3 text-xs font-bold gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                    >
                      <Save className="h-3.5 w-3.5" /> Save Changes
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#6B7280]">First Name</Label>
                    <Input
                      disabled={!isEditingPersonal}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-10 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#6B7280]">Last Name</Label>
                    <Input
                      disabled={!isEditingPersonal}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-10 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#6B7280]">Email Address (Primary)</Label>
                    <Input disabled value={email} className="h-10 text-xs font-medium bg-[#F9FAFB] dark:bg-[#09090B]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#6B7280]">Phone Number</Label>
                    <Input
                      disabled={!isEditingPersonal}
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#6B7280]">Technical Bio</Label>
                  <Textarea
                    disabled={!isEditingPersonal}
                    placeholder="Briefly describe your programming passion, stack, or target career roles..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#6B7280]">Tech Stack & Skills</Label>
                  <Input
                    disabled={!isEditingPersonal}
                    placeholder="Java, Python, Data Structures, Spring Boot, React, SQL..."
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: CODING PROFILES & LINKS */}
          {activeTab === "coding" && (
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Coding Profiles & External Repositories
                  </CardTitle>
                  <CardDescription className="text-xs text-[#6B7280]">
                    Connect your GitHub, LinkedIn, LeetCode, and competitive coding portfolios
                  </CardDescription>
                </div>
                {!isEditingCoding ? (
                  <Button
                    onClick={() => setIsEditingCoding(true)}
                    variant="outline"
                    className="h-9 px-4 text-xs font-bold gap-1.5 border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Links
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsEditingCoding(false)}
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-medium text-[#6B7280]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveCodingLinks}
                      size="sm"
                      className="h-8 px-3 text-xs font-bold gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                    >
                      <Save className="h-3.5 w-3.5" /> Save Links
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#6B7280]">GitHub Profile URL</Label>
                    <Input
                      disabled={!isEditingCoding}
                      placeholder="https://github.com/username"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="h-10 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#6B7280]">LinkedIn Profile URL</Label>
                    <Input
                      disabled={!isEditingCoding}
                      placeholder="https://linkedin.com/in/username"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="h-10 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#6B7280]">LeetCode URL</Label>
                    <Input
                      disabled={!isEditingCoding}
                      placeholder="https://leetcode.com/username"
                      value={leetcodeUrl}
                      onChange={(e) => setLeetcodeUrl(e.target.value)}
                      className="h-10 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#6B7280]">HackerRank URL</Label>
                    <Input
                      disabled={!isEditingCoding}
                      placeholder="https://hackerrank.com/username"
                      value={hackerrankUrl}
                      onChange={(e) => setHackerrankUrl(e.target.value)}
                      className="h-10 text-xs font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: ACCOUNT & SECURITY */}
          {activeTab === "security" && (
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
                <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Account & Security Credentials
                </CardTitle>
                <CardDescription className="text-xs text-[#6B7280]">
                  Update your authentication password and maintain access security
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#6B7280]">New Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    className="h-10 text-xs"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#6B7280]">Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="Re-enter new password"
                    className="h-10 text-xs"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
                  <Button
                    className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs gap-2"
                    onClick={handleUpdatePassword}
                  >
                    <Key className="h-4 w-4" /> Update Account Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: REPORTS & ANALYSES (SEPARATE COURSES, PRACTICES, ASSESSMENTS + CUSTOM DATE FILTER) */}
          {activeTab === "reports" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header with Custom Date Dropdown (Image 3 Style) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
                <div>
                  <h3 className="text-base font-extrabold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#2563EB]" /> Learning Reports & Performance Analyses
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    Dedicated analysis for Courses, Practice Labs, and Proctored Assessments
                  </p>
                </div>

                {/* Date Dropdown exactly as in Image 3 */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-9 px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-xs font-bold text-[#2563EB] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] flex items-center gap-2 shadow-xs transition-colors">
                      <span>{dateRangeLabel}</span>
                      <Filter className="h-3.5 w-3.5 text-[#6B7280]" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-1.5 rounded-xl shadow-lg">
                      <DropdownMenuItem
                        onClick={() => setDateRange("7d")}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                          dateRange === "7d" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                        )}
                      >
                        <span>Last 7 days</span>
                        {dateRange === "7d" && <Check className="h-4 w-4 text-[#2563EB]" />}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => setDateRange("14d")}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                          dateRange === "14d" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                        )}
                      >
                        <span>Last 14 days</span>
                        {dateRange === "14d" && <Check className="h-4 w-4 text-[#2563EB]" />}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => setDateRange("30d")}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                          dateRange === "30d" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                        )}
                      >
                        <span>Last 30 days</span>
                        {dateRange === "30d" && <Check className="h-4 w-4 text-[#2563EB]" />}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => setDateRange("all")}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                          dateRange === "all" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                        )}
                      >
                        <span>All time</span>
                        {dateRange === "all" && <Check className="h-4 w-4 text-[#2563EB]" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Sub-tabs: Courses | Practices | Assessments | Time & Logins */}
              <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-[#27272A] pb-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setReportSubTab("courses")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
                    reportSubTab === "courses"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5" /> Courses Report ({coursesList.length})
                </button>

                <button
                  onClick={() => setReportSubTab("practices")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
                    reportSubTab === "practices"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
                  )}
                >
                  <Dumbbell className="h-3.5 w-3.5" /> Practices Report ({practicesList.length})
                </button>

                <button
                  onClick={() => setReportSubTab("assessments")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
                    reportSubTab === "assessments"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
                  )}
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Assessments Report ({assessmentsList.length})
                </button>

                <button
                  onClick={() => setReportSubTab("time")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
                    reportSubTab === "time"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
                  )}
                >
                  <Clock className="h-3.5 w-3.5" /> Time & Logins
                </button>
              </div>

              {/* Sub-tab 1: COURSES REPORT */}
              {reportSubTab === "courses" && (
                <div className="space-y-4">
                  {coursesList.length === 0 ? (
                    <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                      <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                      <p className="text-xs font-semibold text-[#6B7280]">No assigned courses found for your batch.</p>
                    </Card>
                  ) : (
                    coursesList.map((course) => (
                      <Card key={course.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-[#2563EB]" /> {course.title}
                            </CardTitle>
                            <CardDescription className="text-[11px] text-[#6B7280]">
                              {course.category} • {course.completedModules} of {course.totalModules} modules finished
                            </CardDescription>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-extrabold text-[#0D9488]">{course.progress}% Completed</span>
                            <Badge className={cn("text-[10px] font-bold", course.progress === 100 ? "bg-[#16A34A] text-white" : "bg-[#2563EB]/10 text-[#2563EB]")}>
                              {course.status}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="p-5 space-y-3">
                          <div className="h-2 w-full bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden">
                            <div className="h-full bg-[#0D9488] rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }} />
                          </div>

                          {/* Module Completion Details */}
                          <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A] pt-1">
                            {(course.modules || []).map((m: any, mIdx: number) => (
                              <div key={m.id || mIdx} className="py-2.5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <Layers className="h-3.5 w-3.5 text-[#2563EB]" />
                                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{m.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-[#6B7280]">
                                    {m.completedAt ? `Completed: ${new Date(m.completedAt).toLocaleDateString()}` : "In progress"}
                                  </span>
                                  <Badge className={cn("text-[9px] font-bold", m.completed ? "bg-[#16A34A] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                    {m.completed ? "Done" : "Pending"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Sub-tab 2: PRACTICES REPORT */}
              {reportSubTab === "practices" && (
                <div className="space-y-4">
                  {practicesList.length === 0 ? (
                    <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                      <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                      <p className="text-xs font-semibold text-[#6B7280]">No practice tracks assigned yet.</p>
                    </Card>
                  ) : (
                    practicesList.map((track) => (
                      <Card key={track.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                              <Dumbbell className="h-4 w-4 text-[#16A34A]" /> {track.title}
                            </CardTitle>
                            <CardDescription className="text-[11px] text-[#6B7280]">
                              {track.completedChallenges} of {track.totalChallenges} challenges solved
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-extrabold text-[#16A34A]">{track.progress}% Solved</span>
                            <Badge className={cn("text-[10px] font-bold", track.progress === 100 ? "bg-[#16A34A] text-white" : "bg-[#16A34A]/10 text-[#16A34A]")}>
                              {track.status}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="p-5 space-y-2.5">
                          <div className="h-2 w-full bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden">
                            <div className="h-full bg-[#16A34A] rounded-full transition-all duration-500" style={{ width: `${track.progress}%` }} />
                          </div>

                          <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A] pt-1">
                            {(track.challenges || []).map((ch: any, chIdx: number) => (
                              <div key={ch.id || chIdx} className="py-2.5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <Code2 className="h-3.5 w-3.5 text-[#16A34A]" />
                                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{ch.title}</span>
                                  <Badge variant="outline" className="text-[9px] font-semibold">{ch.difficulty}</Badge>
                                </div>

                                <div className="flex items-center gap-3">
                                  {ch.score !== undefined && (
                                    <span className="font-bold text-[#16A34A] text-[11px]">{ch.score}% Score</span>
                                  )}
                                  <span className="text-[11px] text-[#6B7280]">
                                    {ch.completedAt ? `Solved: ${ch.completedAt}` : "Not attempted"}
                                  </span>
                                  <Badge className={cn("text-[9px] font-bold", ch.completed ? "bg-[#16A34A] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                    {ch.completed ? "Solved" : "Pending"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Sub-tab 3: ASSESSMENTS REPORT */}
              {reportSubTab === "assessments" && (
                <div className="space-y-4">
                  {assessmentsList.length === 0 ? (
                    <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                      <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                      <p className="text-xs font-semibold text-[#6B7280]">No assessments assigned or attempted yet.</p>
                    </Card>
                  ) : (
                    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] font-bold">
                            <tr>
                              <th className="p-4 pl-6">Assessment Title</th>
                              <th className="p-4">Type</th>
                              <th className="p-4">Score Obtained</th>
                              <th className="p-4">Completed Date</th>
                              <th className="p-4">Integrity Flags</th>
                              <th className="p-4 pr-6 text-right">Evaluation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                            {assessmentsList.map((a) => (
                              <tr key={a.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                                <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                                  {a.title}
                                </td>
                                <td className="p-4 text-[#6B7280]">{a.type}</td>
                                <td className="p-4 font-bold text-[#16A34A]">{a.scoreObtained}</td>
                                <td className="p-4 text-[#6B7280]">{a.completedDate}</td>
                                <td className="p-4 text-[#6B7280]">{a.integrityViolations}</td>
                                <td className="p-4 pr-6 text-right">
                                  <Badge className={cn("text-[10px] font-bold", a.attempted ? "bg-[#16A34A] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                    {a.evaluation}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Sub-tab 4: TIME & LOGINS */}
              {reportSubTab === "time" && (
                <div className="space-y-6">
                  {/* Daily Time Chart */}
                  <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">My Time Spent On Site</h4>
                        <p className="text-xs text-[#6B7280]">Total Active Time: <strong>{formatTimeSpent(reportSummary.totalTimeSpentSeconds || 0)}</strong></p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold">{dateRangeLabel}</Badge>
                    </div>

                    <div className="h-36 w-full flex items-end justify-between px-2 pt-4">
                      {dailyTimeSpent.map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center flex-1 max-w-[45px]">
                          <div className="w-full flex items-end justify-center h-24">
                            <div
                              style={{ height: `${Math.max(6, item.height)}%` }}
                              className="w-3.5 sm:w-4 rounded-t-md bg-gradient-to-t from-[#2563EB] to-[#60A5FA]"
                            />
                          </div>
                          <span className="text-[10px] text-[#6B7280] mt-1.5">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Logins Table */}
                  <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
                      <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                        Student Login History
                      </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] font-bold">
                          <tr>
                            <th className="p-4 pl-6">Login Timestamp</th>
                            <th className="p-4">Device / Source</th>
                            <th className="p-4">Session Duration</th>
                            <th className="p-4 pr-6 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                          {loginActivities.map((log) => (
                            <tr key={log.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                              <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-[#2563EB]" /> {log.timestamp}
                              </td>
                              <td className="p-4 text-[#6B7280]">{log.device}</td>
                              <td className="p-4 font-bold text-[#111827] dark:text-[#FAFAFA]">{log.duration}</td>
                              <td className="p-4 pr-6 text-right">
                                <Badge className="bg-[#16A34A] text-white text-[10px] font-bold">{log.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
