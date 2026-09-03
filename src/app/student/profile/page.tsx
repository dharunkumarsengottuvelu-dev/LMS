"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  User, Mail, Phone, Globe, Save, Lock, Shield, Edit3, X, ArrowLeft,
  BookOpen, CheckCircle2, Award, Calendar, Layers, Key, Code2, Link2,
  ExternalLink, Terminal, Cpu, BarChart3, Clock, TrendingUp, ArrowUpRight,
  Dumbbell, ClipboardList, Check, Filter, Search, Inbox, Laptop, Download, Loader2, CalendarDays
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getInitials, cn } from "@/lib/utils";

export default function StudentProfilePage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  // Basic counters
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [practiceCount, setPracticeCount] = useState(0);
  const [submissionsCount, setSubmissionsCount] = useState(0);

  // Tab State
  const [activeTab, setActiveTab] = useState<"personal" | "coding" | "security" | "reports">("personal");
  const [reportSubTab, setReportSubTab] = useState<"courses" | "practices" | "assessments" | "time">("courses");
  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "all" | "custom">("7d");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Reports data
  const [reportSummary, setReportSummary] = useState<any>({});
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [practicesList, setPracticesList] = useState<any[]>([]);
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [dailyTimeSpent, setDailyTimeSpent] = useState<any[]>([]);
  const [loginActivities, setLoginActivities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredTimePointIndex, setHoveredTimePointIndex] = useState<number | null>(null);

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
      let url = `/api/student/reports?range=${dateRange}`;
      if (dateRange === "custom" && customFromDate && customToDate) {
        url = `/api/student/reports?from=${customFromDate}&to=${customToDate}`;
      }

      const repRes = await fetch(url);
      const repData = await repRes.json();
      if (repData.reports) {
        const sum = repData.reports.summary || {};
        setReportSummary(sum);
        setEnrolledCount(sum.enrolledCoursesCount || 0);
        setPracticeCount(sum.practicesCount || 0);
        setSubmissionsCount(sum.totalSubmissionsCount || 0);
        setCoursesList(repData.reports.coursesList || []);

        let rawPractices = repData.reports.practicesList || [];
        if (typeof window !== "undefined") {
          rawPractices = rawPractices.map((track: any) => {
            let totalTrackQ = 0;
            let totalAnsweredQ = 0;
            let allCompleted = true;

            const challenges = (track.challenges || []).map((ch: any) => {
              let answeredCount = ch.answeredCount || 0;
              let totalQ = ch.totalQuestions || ch.questionCount || 10;
              let isDone = ch.completed || false;
              let startedAt = ch.startedAt || "Not started";
              let completedAt = ch.completedAt || null;

              try {
                const sessionKey = `lms_practice_session_${ch.id}`;
                const session = localStorage.getItem(sessionKey);
                const submittedMarker = localStorage.getItem(`${sessionKey}_submitted`);
                const resultKey = `lms_completed_assessment_${ch.id}`;
                const resStr = localStorage.getItem(resultKey);

                if (session && !submittedMarker) {
                  const parsed = JSON.parse(session);
                  const answeredKeys = new Set<string>();
                  Object.entries(parsed.answers || {}).forEach(([k, v]) => {
                    if (v && ((Array.isArray(v) && v.length > 0) || (typeof v === "string" && v.trim().length > 0) || (typeof v === "object" && (v as any).code?.trim().length > 0))) {
                      answeredKeys.add(k);
                    }
                  });
                  Object.entries(parsed.codeAnswers || {}).forEach(([k, v]: any) => {
                    if (v && v.code && v.code.trim().length > 0) answeredKeys.add(k);
                  });
                  answeredCount = Math.min(totalQ, answeredKeys.size);
                  if (answeredCount > 0) {
                    startedAt = startedAt === "Not started" || startedAt === "Not Started" ? "Today" : startedAt;
                  }
                }
                if (resStr || submittedMarker === "true") {
                  isDone = true;
                  answeredCount = totalQ;
                  completedAt = completedAt || "Completed";
                }
              } catch {}

              totalTrackQ += totalQ;
              totalAnsweredQ += isDone ? totalQ : answeredCount;
              if (!isDone) allCompleted = false;

              const chProgress = isDone ? 100 : totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
              const status = isDone ? "Completed" : answeredCount > 0 ? `In Progress (${answeredCount}/${totalQ} Qs)` : "Pending";

              return {
                ...ch,
                totalQuestions: totalQ,
                answeredCount,
                progress: chProgress,
                status,
                completed: isDone,
                startedAt,
                completedAt,
                attemptsCount: isDone || answeredCount > 0 ? Math.max(ch.attemptsCount || 0, 1) : 0,
              };
            });

            const trackProgress = totalTrackQ > 0 ? Math.round((totalAnsweredQ / totalTrackQ) * 100) : allCompleted ? 100 : 0;
            const trackStatus = trackProgress === 100 ? "Completed" : trackProgress > 0 ? "In Progress" : "Not Started";

            return {
              ...track,
              progress: trackProgress,
              status: trackStatus,
              completedChallenges: challenges.filter((c: any) => c.completed).length,
              totalTrackQ,
              totalAnsweredQ,
              challenges,
            };
          });
        }

        setPracticesList(rawPractices);
        setAssessmentsList(repData.reports.assessmentsList || []);
        setDailyTimeSpent(repData.reports.dailyTimeSpent || []);
        setLoginActivities(repData.reports.loginActivities || []);
      }
    } catch (err) {
      console.error("Failed to load reports in profile", err);
    } finally {
      setIsLoadingReports(false);
    }
  }, [dateRange, customFromDate, customToDate]);

  useEffect(() => {
    if (dateRange !== "custom" || (customFromDate && customToDate)) {
      fetchReportData();
    }
  }, [fetchReportData, dateRange]);

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
      case "custom":
        if (customFromDate && customToDate) {
          const f = new Date(customFromDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const t = new Date(customToDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          return `${f} - ${t}`;
        }
        return "Custom Range";
    }
  }, [dateRange, customFromDate, customToDate]);

  const handleApplyCustomRange = () => {
    if (!customFromDate || !customToDate) {
      toast({
        title: "Incomplete Date Range",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }
    if (new Date(customFromDate) > new Date(customToDate)) {
      toast({
        title: "Invalid Range",
        description: "Start date cannot be after end date.",
        variant: "destructive",
      });
      return;
    }
    setDateRange("custom");
    setIsCustomModalOpen(false);
    toast({
      title: "Date Filter Applied",
      description: `Showing report data from ${customFromDate} to ${customToDate}.`,
    });
  };

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
      {/* 1. Page Header - Spacious Enterprise MNC Card */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 shadow-xs overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Left Column: Breadcrumb + Title + Subtitle */}
          <div className="space-y-2 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0.5"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-normal">
              Student Profile & Account
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed font-normal">
              Manage your personal profile, credentials, and detailed learning analyses
            </p>
          </div>
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

                      <DropdownMenuSeparator className="my-1 bg-[#E5E7EB] dark:bg-[#27272A]" />

                      <DropdownMenuItem
                        onClick={() => setIsCustomModalOpen(true)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                          dateRange === "custom" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-[#2563EB]" />
                          <span>Custom Date to Date...</span>
                        </div>
                        {dateRange === "custom" && <Check className="h-4 w-4 text-[#2563EB]" />}
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
                              <div key={m.id || mIdx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                <div className="flex items-center gap-2">
                                  <Layers className="h-3.5 w-3.5 text-[#2563EB]" />
                                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{m.title}</span>
                                  {m.attemptsCount !== undefined && (
                                    <Badge variant="outline" className="text-[9px] font-semibold text-[#6B7280]">
                                      {m.attemptsCount} {m.attemptsCount === 1 ? "attempt" : "attempts"}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="text-[11px] text-[#6B7280]">
                                    {m.startedAt && m.startedAt !== "Not Started" ? `Started: ${m.startedAt}` : "Not Started"}
                                  </span>
                                  <span className="text-[11px] text-[#6B7280]">
                                    {m.completedAt ? `Completed: ${m.completedAt}` : "Pending"}
                                  </span>
                                  <Badge className={cn("text-[9px] font-bold", m.completed ? "bg-[#16A34A] text-white" : m.startedAt && m.startedAt !== "Not Started" ? "bg-[#D97706] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                    {m.completed ? "Completed" : m.startedAt && m.startedAt !== "Not Started" ? "In Progress" : "Pending"}
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
                            <Badge className={cn("text-[10px] font-bold", track.progress === 100 ? "bg-[#16A34A] text-white" : track.progress > 0 ? "bg-[#D97706] text-white" : "bg-[#16A34A]/10 text-[#16A34A]")}>
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
                              <div key={ch.id || chIdx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Code2 className="h-3.5 w-3.5 text-[#16A34A]" />
                                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{ch.title}</span>
                                  <Badge variant="outline" className="text-[9px] font-semibold">{ch.difficulty}</Badge>
                                  {ch.attemptsCount !== undefined && (
                                    <Badge variant="outline" className="text-[9px] font-semibold text-[#6B7280]">
                                      {ch.attemptsCount} {ch.attemptsCount === 1 ? "attempt" : "attempts"}
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                  {ch.score !== undefined && (
                                    <span className="font-bold text-[#16A34A] text-[11px]">{ch.score}% Score</span>
                                  )}
                                  <span className="text-[11px] text-[#6B7280]">
                                    {ch.startedAt && ch.startedAt !== "Not Started" ? `Started: ${ch.startedAt}` : "Not started"}
                                  </span>
                                  <span className="text-[11px] text-[#6B7280]">
                                    {ch.completedAt ? `Completed: ${ch.completedAt}` : "Pending"}
                                  </span>
                                  <Badge className={cn("text-[9px] font-bold", ch.completed ? "bg-[#16A34A] text-white" : ch.startedAt && ch.startedAt !== "Not Started" ? "bg-[#D97706] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                    {ch.completed ? "Solved" : ch.startedAt && ch.startedAt !== "Not Started" ? "In Progress" : "Pending"}
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
                              <th className="p-4">Attempts</th>
                              <th className="p-4">Started Date</th>
                              <th className="p-4">Completed Date</th>
                              <th className="p-4">Score Obtained</th>
                              <th className="p-4">Integrity Flags</th>
                              <th className="p-4 pr-6 text-right">Status / Evaluation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                            {assessmentsList.map((a) => (
                              <tr key={a.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                                <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                                  {a.title}
                                </td>
                                <td className="p-4 text-[#6B7280]">{a.type}</td>
                                <td className="p-4 text-[#6B7280]">
                                  <Badge variant="outline" className="text-[10px] font-semibold">
                                    {a.attemptsCount || (a.attempted ? 1 : 0)} {(a.attemptsCount || (a.attempted ? 1 : 0)) === 1 ? "attempt" : "attempts"}
                                  </Badge>
                                </td>
                                <td className="p-4 text-[#6B7280]">{a.startedAt || "Not Started"}</td>
                                <td className="p-4 text-[#6B7280]">{a.completedDate || "Pending"}</td>
                                <td className="p-4 font-bold text-[#16A34A]">{a.scoreObtained}</td>
                                <td className="p-4 text-[#6B7280]">{a.integrityViolations}</td>
                                <td className="p-4 pr-6 text-right">
                                  <Badge className={cn("text-[10px] font-bold", a.attempted ? (a.rawScore >= 50 ? "bg-[#16A34A] text-white" : "bg-[#D97706] text-white") : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                    {a.evaluation || a.status || "Pending"}
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
                  {/* 1. Interactive SVG Area Line Chart */}
                  <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-[#2563EB]" />
                          My Time Spent On Site (Line Chart)
                        </h4>
                        <p className="text-xs text-[#6B7280]">
                          Total Active Time: <strong className="text-[#2563EB] dark:text-[#60A5FA] font-extrabold">{formatTimeSpent(reportSummary.totalTimeSpentSeconds || 0)}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[10px] text-[#6B7280] italic hidden sm:inline">Hover on the line to see daily tasks & time</span>
                        <Badge variant="outline" className="text-[10px] font-bold">{dateRangeLabel}</Badge>
                      </div>
                    </div>

                    {(() => {
                      const data = dailyTimeSpent;
                      if (!data || data.length === 0) {
                        return <p className="text-xs text-muted-foreground py-6 text-center">No time activity recorded in this period.</p>;
                      }

                      const width = 800;
                      const height = 190;
                      const paddingX = 35;
                      const paddingY = 30;
                      const chartWidth = width - paddingX * 2;
                      const chartHeight = height - paddingY * 2;
                      const maxMins = Math.max(...data.map((d: any) => d.minutes || 0), 60);

                      const points = data.map((item: any, index: number) => {
                        const x = paddingX + (index / Math.max(1, data.length - 1)) * chartWidth;
                        const y = height - paddingY - ((item.minutes || 0) / maxMins) * chartHeight;
                        return { x, y, item, index };
                      });

                      const firstPt = points[0];
                      const lastPt = points[points.length - 1];
                      if (!firstPt || !lastPt) return null;

                      let pathD = `M ${firstPt.x},${firstPt.y}`;
                      for (let i = 0; i < points.length - 1; i++) {
                        const p0 = points[i];
                        const p1 = points[i + 1];
                        if (p0 && p1) {
                          const cpX1 = p0.x + (p1.x - p0.x) / 2;
                          const cpY1 = p0.y;
                          const cpX2 = p0.x + (p1.x - p0.x) / 2;
                          const cpY2 = p1.y;
                          pathD += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p1.x},${p1.y}`;
                        }
                      }
                      const areaD = `${pathD} L ${lastPt.x},${height - paddingY} L ${firstPt.x},${height - paddingY} Z`;
                      const activePt = hoveredTimePointIndex !== null ? points[hoveredTimePointIndex] : null;

                      return (
                        <div
                          className="relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#F0F7FF]/50 dark:from-[#1E3A8A]/10 to-transparent p-3 border border-[#E5E7EB]/60 dark:border-[#27272A]"
                          onMouseLeave={() => setHoveredTimePointIndex(null)}
                          onPointerLeave={() => setHoveredTimePointIndex(null)}
                        >
                          <svg
                            viewBox={`0 0 ${width} ${height}`}
                            className="w-full h-48 sm:h-56 overflow-visible"
                            onMouseLeave={() => setHoveredTimePointIndex(null)}
                            onPointerLeave={() => setHoveredTimePointIndex(null)}
                          >
                            <defs>
                              <linearGradient id="profileTimeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                              </linearGradient>
                              <linearGradient id="profileTimeStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#3B82F6" />
                                <stop offset="50%" stopColor="#2563EB" />
                                <stop offset="100%" stopColor="#1D4ED8" />
                              </linearGradient>
                            </defs>
                            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
                            <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
                            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="currentColor" strokeOpacity="0.15" />
                            <path d={areaD} fill="url(#profileTimeAreaGrad)" />
                            <path d={pathD} fill="none" stroke="url(#profileTimeStrokeGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                            {/* Hover Crosshair Vertical Guide */}
                            {activePt && (
                              <line
                                x1={activePt.x}
                                y1={paddingY - 5}
                                x2={activePt.x}
                                y2={height - paddingY}
                                stroke="#2563EB"
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                                className="transition-all duration-150"
                              />
                            )}

                            {/* Invisible vertical hover capture bands */}
                            {points.map((pt: any, i: number) => {
                              const colWidth = chartWidth / Math.max(1, points.length - 1);
                              const xLeft = Math.max(0, pt.x - colWidth / 2);
                              return (
                                <rect
                                  key={`band-${i}`}
                                  x={xLeft}
                                  y={0}
                                  width={colWidth}
                                  height={height}
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredTimePointIndex(i)}
                                  onMouseLeave={() => setHoveredTimePointIndex(null)}
                                />
                              );
                            })}

                            {/* Interactive Data Points */}
                            {points.map((pt: any, i: number) => (
                              <g key={i} className="cursor-pointer pointer-events-none">
                                {hoveredTimePointIndex === i && (
                                  <circle cx={pt.x} cy={pt.y} r="10" fill="#2563EB" fillOpacity="0.25" className="animate-ping" />
                                )}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={hoveredTimePointIndex === i ? 6.5 : pt.item.minutes > 0 ? 4.5 : 3}
                                  fill={hoveredTimePointIndex === i ? "#2563EB" : pt.item.minutes > 0 ? "#2563EB" : "#9CA3AF"}
                                  stroke="#FFFFFF"
                                  strokeWidth={hoveredTimePointIndex === i ? 2.5 : 1.5}
                                />
                              </g>
                            ))}
                          </svg>

                          {/* Rich Glassmorphic Tooltip Card */}
                          {activePt && (
                            <div
                              className="absolute top-2 z-30 transform -translate-x-1/2 transition-all duration-150 pointer-events-none"
                              style={{
                                left: `${Math.max(18, Math.min(82, (activePt.x / width) * 100))}%`,
                              }}
                            >
                              <div className="bg-[#0F172A]/95 dark:bg-[#090D16]/95 backdrop-blur-md text-white border border-[#334155] rounded-xl p-3.5 shadow-2xl min-w-[240px] max-w-[320px] text-xs space-y-2.5">
                                <div className="flex items-center justify-between border-b border-[#334155] pb-2 gap-2">
                                  <div>
                                    <p className="text-[11px] font-bold text-[#94A3B8]">
                                      {activePt.item.fullDate || activePt.item.label}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <Clock className="h-3.5 w-3.5 text-[#60A5FA]" />
                                      <span className="text-sm font-extrabold text-[#60A5FA]">
                                        {activePt.item.minutes > 0 ? (activePt.item.display || `${activePt.item.minutes}m`) : "0m"} on site
                                      </span>
                                    </div>
                                  </div>
                                  <Badge
                                    className={cn(
                                      "text-[9px] font-bold",
                                      activePt.item.minutes >= 45
                                        ? "bg-[#16A34A] text-white"
                                        : activePt.item.minutes > 0
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-[#334155] text-[#94A3B8]"
                                    )}
                                  >
                                    {activePt.item.minutes >= 45 ? "High Activity" : activePt.item.minutes > 0 ? "Active" : "Rest Day"}
                                  </Badge>
                                </div>

                                <div className="space-y-1.5 pt-0.5">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Candidate Activity on this Day:</p>
                                  {activePt.item.minutes > 0 ? (
                                    <div className="space-y-1 text-[11px]">
                                      <div className="flex items-center justify-between text-[#F1F5F9]">
                                        <span className="flex items-center gap-1.5">
                                          <Code2 className="h-3 w-3 text-[#16A34A]" /> Practice & Coding:
                                        </span>
                                        <strong className="text-white">
                                          {activePt.item.activities?.codingCount ? `${activePt.item.activities.codingCount} problem runs` : "Interactive labs"}
                                        </strong>
                                      </div>

                                      <div className="flex items-center justify-between text-[#F1F5F9]">
                                        <span className="flex items-center gap-1.5">
                                          <ClipboardList className="h-3 w-3 text-[#D97706]" /> Exams & Assessments:
                                        </span>
                                        <strong className="text-white">
                                          {activePt.item.activities?.assessmentsCount ? `${activePt.item.activities.assessmentsCount} tests taken` : "Evaluations"}
                                        </strong>
                                      </div>

                                      <div className="flex items-center justify-between text-[#F1F5F9]">
                                        <span className="flex items-center gap-1.5">
                                          <BookOpen className="h-3 w-3 text-[#2563EB]" /> Course Syllabus:
                                        </span>
                                        <strong className="text-white">
                                          {activePt.item.activities?.courseModulesCount ? `${activePt.item.activities.courseModulesCount} lessons finished` : "Lessons progress"}
                                        </strong>
                                      </div>

                                      <div className="flex items-center justify-between text-[#F1F5F9]">
                                        <span className="flex items-center gap-1.5">
                                          <Laptop className="h-3 w-3 text-[#A855F7]" /> Platform Logins:
                                        </span>
                                        <strong className="text-white">
                                          {activePt.item.activities?.loginsCount || 1} active session
                                        </strong>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-[#94A3B8] italic">No candidate learning activity recorded on this day.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div
                            className="flex justify-between items-center px-4 pt-2 text-[10px] text-[#6B7280] font-semibold overflow-x-auto no-scrollbar"
                            onMouseLeave={() => setHoveredTimePointIndex(null)}
                          >
                            {data.map((item: any, idx: number) => {
                              const showLabel = data.length <= 10 || idx % Math.ceil(data.length / 8) === 0 || idx === data.length - 1;
                              return (
                                <span
                                  key={idx}
                                  className={cn("whitespace-nowrap transition-colors cursor-pointer", hoveredTimePointIndex === idx ? "text-[#2563EB] font-bold" : "")}
                                  onMouseEnter={() => setHoveredTimePointIndex(idx)}
                                  onMouseLeave={() => setHoveredTimePointIndex(null)}
                                >
                                  {showLabel ? item.label : ""}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </Card>

                  {/* 2. Total Site Usage Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                      <span className="text-[11px] font-bold uppercase text-[#6B7280]">Total Active Time</span>
                      <p className="text-2xl font-extrabold text-[#2563EB]">{formatTimeSpent(reportSummary.totalTimeSpentSeconds || 0)}</p>
                      <p className="text-[11px] text-[#6B7280]">Time spent actively using the LMS</p>
                    </Card>
                    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                      <span className="text-[11px] font-bold uppercase text-[#6B7280]">Course Modules</span>
                      <p className="text-2xl font-extrabold text-[#0D9488]">{coursesList.reduce((acc, c) => acc + (c.completedModules || 0), 0)} Completed</p>
                      <p className="text-[11px] text-[#6B7280]">Video lessons & syllabus</p>
                    </Card>
                    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                      <span className="text-[11px] font-bold uppercase text-[#6B7280]">Practice Labs</span>
                      <p className="text-2xl font-extrabold text-[#16A34A]">{practicesList.reduce((acc, p) => acc + (p.completedChallenges || 0), 0)} Solved</p>
                      <p className="text-[11px] text-[#6B7280]">Coding problem tracks</p>
                    </Card>
                    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                      <span className="text-[11px] font-bold uppercase text-[#6B7280]">Evaluations</span>
                      <p className="text-2xl font-extrabold text-[#D97706]">{assessmentsList.filter((a) => a.attempted).length} Finished</p>
                      <p className="text-[11px] text-[#6B7280]">Proctored exams taken</p>
                    </Card>
                  </div>

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

      {/* Custom Date to Date Modal Dialog */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#2563EB]" /> Custom Date Range Filter
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Select start date and end date to filter your student learning activities and reports.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">From Date</Label>
              <Input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">To Date</Label>
              <Input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomModalOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyCustomRange}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold gap-1.5"
            >
              Apply Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
