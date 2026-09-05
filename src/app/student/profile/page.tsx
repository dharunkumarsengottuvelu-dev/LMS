"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
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
import { StudentActivityHeatmap } from "@/components/student/student-activity-heatmap";
import { formatStudentId } from "@/services/student-id.service";

export default function StudentProfilePage() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();

  // Basic dynamic counters
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [practiceCount, setPracticeCount] = useState(0);
  const [submissionsCount, setSubmissionsCount] = useState(0);

  // Tab State
  const [activeTab, setActiveTab] = useState<"personal" | "coding" | "security" | "reports">("personal");
  const [reportSubTab, setReportSubTab] = useState<"learning" | "skill-lab" | "code-lab" | "assess" | "live" | "time">("learning");
  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "all" | "custom">("7d");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Reports data
  const [reportSummary, setReportSummary] = useState<any>({});
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [practicesList, setPracticesList] = useState<any[]>([]);
  const [skillLabList, setSkillLabList] = useState<any[]>([]);
  const [codeLabList, setCodeLabList] = useState<any[]>([]);
  const [liveClassesList, setLiveClassesList] = useState<any[]>([]);
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
      const meta = (user?.user_metadata as any) || {};
      const emailStr = user?.email || p?.email || "";
      const emailPrefix = emailStr.split("@")[0] || "";
      const parts = emailPrefix.split(/[._-]/);

      let cachedLinks: any = {};
      if (typeof window !== "undefined" && user?.id) {
        try {
          cachedLinks = JSON.parse(localStorage.getItem(`student_coding_profiles_${user.id}`) || "{}");
        } catch {}
      }

      const defaultFirst = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Student";
      const defaultLast = parts.length > 1 && parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "";

      setFirstName(p?.first_name || meta.first_name || defaultFirst);
      setLastName(p?.last_name || meta.last_name || defaultLast);
      setEmail(emailStr);
      setPhone(p?.phone || meta.phone || cachedLinks.phone || "");
      setBio(p?.bio || meta.bio || cachedLinks.bio || "");
      setSkills(Array.isArray(p?.skills) ? p.skills.join(", ") : p?.skills || meta.skills || cachedLinks.skills || "");

      setGithubUrl(p?.github || p?.github_url || meta.github || meta.github_url || cachedLinks.github || "");
      setLinkedinUrl(p?.linkedin || p?.linkedin_url || meta.linkedin || meta.linkedin_url || cachedLinks.linkedin || "");
      setPortfolioUrl(p?.website_url || p?.portfolio || meta.portfolio || meta.website_url || meta.portfolio_url || cachedLinks.portfolio || "");
      setLeetcodeUrl(p?.leetcode || p?.leetcode_url || meta.leetcode || meta.leetcode_url || cachedLinks.leetcode || "");
      setHackerrankUrl(p?.hackerrank || p?.hackerrank_url || meta.hackerrank || meta.hackerrank_url || cachedLinks.hackerrank || "");
      setCodechefUrl(p?.codechef || p?.codechef_url || meta.codechef || meta.codechef_url || cachedLinks.codechef || "");
      setCodeforcesUrl(p?.codeforces || p?.codeforces_url || meta.codeforces || meta.codeforces_url || cachedLinks.codeforces || "");
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

        const codeLab = repData.reports.codeLabList || [];
        const skillLab = repData.reports.skillLabList || repData.reports.practicesList || [];
        const codeLabSolved = codeLab.filter((c: any) => c.completed).length;
        const skillLabSolved = skillLab.reduce((acc: number, p: any) => acc + (p.completedChallenges || 0), 0);
        setPracticeCount(codeLabSolved + skillLabSolved || sum.completedPracticesCount || sum.practicesCount || 0);

        const totalSubs = sum.totalSubmissionsCount || 0;
        setSubmissionsCount(totalSubs);
        setCoursesList(repData.reports.learningList || repData.reports.coursesList || []);
        setCodeLabList(codeLab);
        setLiveClassesList(repData.reports.liveClassesList || []);

        let rawPractices = skillLab;
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
        setSkillLabList(rawPractices);
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
    const handleSync = () => fetchReportData();
    window.addEventListener("student-activity-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("student-activity-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [fetchReportData, dateRange, customFromDate, customToDate]);

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
    const metaFirst = (user?.user_metadata as any)?.first_login_at || (profile as any)?.first_login_at;
    if (metaFirst) {
      return new Date(metaFirst).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    if (typeof window !== "undefined" && user?.id) {
      const storedFirst = localStorage.getItem(`first_login_${user.id}`);
      if (storedFirst) {
        return new Date(storedFirst).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    }

    if (user?.created_at) {
      if (typeof window !== "undefined" && user?.id) {
        localStorage.setItem(`first_login_${user.id}`, user.created_at);
      }
      return new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    if ((profile as any)?.created_at) {
      const pCreated = (profile as any).created_at;
      if (typeof window !== "undefined" && user?.id) {
        localStorage.setItem(`first_login_${user.id}`, pCreated);
      }
      return new Date(pCreated).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    if (typeof window !== "undefined" && user?.id) {
      const fallbackNow = new Date().toISOString();
      localStorage.setItem(`first_login_${user.id}`, fallbackNow);
      return new Date(fallbackNow).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [user, profile]);

  const displayAvatarUrl = useMemo(() => {
    if (profile?.avatar_url) return profile.avatar_url;
    const meta = user?.user_metadata || {};
    if (meta.avatar_url || meta.picture || meta.photo_url) {
      return meta.avatar_url || meta.picture || meta.photo_url;
    }
    const emailToUse = email || user?.email || (profile as any)?.email;
    if (emailToUse) {
      return `https://unavatar.io/${encodeURIComponent(emailToUse)}?fallback=false`;
    }
    return undefined;
  }, [profile?.avatar_url, user, email, profile]);

  const accountStatus = profile?.status || "active";

  const skillBadges = useMemo(() => {
    if (!skills) return [];
    return skills.split(",").map((s) => s.trim()).filter(Boolean);
  }, [skills]);

  const studentId = useMemo(() => {
    const metaId = (user?.user_metadata as any)?.student_id;
    if (metaId && typeof metaId === "string" && metaId.startsWith("STID-")) {
      return metaId;
    }
    const profileId = (profile as any)?.student_id;
    if (profileId && typeof profileId === "string" && profileId.startsWith("STID-")) {
      return profileId;
    }
    const joiningDate = user?.created_at || (profile as any)?.created_at || "2026-08-05T00:00:00.000Z";
    const seq = (user?.user_metadata as any)?.student_seq || 1;
    return formatStudentId(seq, joiningDate);
  }, [profile, user]);

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

      // Sync auth user metadata
      await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          phone,
          bio,
          skills: skillsArray,
        },
      });

      if (refreshProfile) {
        await refreshProfile();
      }

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

      // In profiles table, valid columns are github, linkedin, leetcode
      const { error } = await (supabase.from("profiles") as any)
        .update({
          github: githubUrl,
          linkedin: linkedinUrl,
          leetcode: leetcodeUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id || "");

      if (error) {
        console.warn("Profiles coding columns update notice:", error.message);
      }

      // Persist all 7 profiles in user_metadata & localStorage
      const linksPayload = {
        github: githubUrl,
        linkedin: linkedinUrl,
        portfolio: portfolioUrl,
        website_url: portfolioUrl,
        leetcode: leetcodeUrl,
        hackerrank: hackerrankUrl,
        codechef: codechefUrl,
        codeforces: codeforcesUrl,
      };

      await supabase.auth.updateUser({
        data: linksPayload,
      });

      if (typeof window !== "undefined" && user?.id) {
        localStorage.setItem(`student_coding_profiles_${user.id}`, JSON.stringify(linksPayload));
      }

      if (refreshProfile) {
        await refreshProfile();
      }

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

  const filteredLearning = useMemo(() => {
    if (!searchQuery.trim()) return coursesList;
    return coursesList.filter((c) => (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()));
  }, [coursesList, searchQuery]);

  const filteredSkillLab = useMemo(() => {
    if (!searchQuery.trim()) return skillLabList;
    return skillLabList.filter((p) => (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()));
  }, [skillLabList, searchQuery]);

  const filteredCodeLab = useMemo(() => {
    if (!searchQuery.trim()) return codeLabList;
    return codeLabList.filter((c) =>
      (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [codeLabList, searchQuery]);

  const filteredAssessments = useMemo(() => {
    if (!searchQuery.trim()) return assessmentsList;
    return assessmentsList.filter((a) => (a.title || "").toLowerCase().includes(searchQuery.toLowerCase()));
  }, [assessmentsList, searchQuery]);

  const filteredLiveClasses = useMemo(() => {
    if (!searchQuery.trim()) return liveClassesList;
    return liveClassesList.filter((l) => (l.title || "").toLowerCase().includes(searchQuery.toLowerCase()));
  }, [liveClassesList, searchQuery]);

  return (
    <div className="w-full space-y-6 pb-20">
      
      {/* 1. Page Header & Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 uppercase tracking-wider transition-colors cursor-pointer py-1"
        >
          Back to Dashboard
        </button>
      </div>

      {/* 2. Premium MNC Student Profile Card (Clean, Real Data Only) */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Identity: Avatar + Name + Core Meta */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 text-center sm:text-left">
            <div className="relative shrink-0">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-slate-200 dark:border-zinc-700 shadow-sm overflow-hidden bg-slate-100 dark:bg-zinc-800">
                <AvatarImage src={displayAvatarUrl} alt={`${firstName} ${lastName}`} className="h-full w-full object-cover rounded-full" />
                <AvatarFallback className="h-full w-full flex items-center justify-center bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900 text-2xl font-bold rounded-full">
                  {getInitials(`${firstName} ${lastName}`)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {firstName} {lastName}
                </h1>
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                  Student
                </Badge>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border",
                  accountStatus === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                )}>
                  {accountStatus}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-zinc-400">
                {email}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {studentId}
              </p>

              <p className="text-xs text-slate-500 dark:text-zinc-400">
                First Login: <strong className="text-slate-700 dark:text-zinc-200 font-semibold">{loginDate}</strong>
              </p>
            </div>
          </div>

          {/* Real Dynamic Stats Strip (Enrolled, Practice, Submissions) */}
          <div className="flex items-center justify-center sm:justify-start lg:justify-end gap-3 sm:gap-4 flex-wrap border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-zinc-800">
            <div className="px-5 py-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-center min-w-[100px]">
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{enrolledCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mt-0.5">Enrolled</p>
            </div>

            <div className="px-5 py-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-center min-w-[100px]">
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{practiceCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mt-0.5">Practice</p>
            </div>

            <div className="px-5 py-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-center min-w-[100px]">
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">{submissionsCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mt-0.5">Submissions</p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. MNC High-Contrast Horizontal Tabs (Zero Icons) */}
      <div className="border-b border-slate-200/90 dark:border-zinc-800 mb-6 sm:mb-8 overflow-x-auto no-scrollbar">
        <nav className="-mb-px flex space-x-8" aria-label="Profile Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={cn(
              "py-3.5 px-1 border-b-2 text-sm font-bold whitespace-nowrap transition-colors cursor-pointer",
              activeTab === "personal"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:border-slate-300 dark:hover:border-zinc-700"
            )}
          >
            Personal Information
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={cn(
              "py-3.5 px-1 border-b-2 text-sm font-bold whitespace-nowrap transition-colors cursor-pointer",
              activeTab === "reports"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:border-slate-300 dark:hover:border-zinc-700"
            )}
          >
            Reports & Analyses
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coding")}
            className={cn(
              "py-3.5 px-1 border-b-2 text-sm font-bold whitespace-nowrap transition-colors cursor-pointer",
              activeTab === "coding"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:border-slate-300 dark:hover:border-zinc-700"
            )}
          >
            Coding Profiles & Links
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={cn(
              "py-3.5 px-1 border-b-2 text-sm font-bold whitespace-nowrap transition-colors cursor-pointer",
              activeTab === "security"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:border-slate-300 dark:hover:border-zinc-700"
            )}
          >
            Account & Security
          </button>
        </nav>
      </div>

      {/* 4. TAB 1: PERSONAL INFORMATION */}
      {activeTab === "personal" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl">
            <CardHeader className="p-6 sm:p-7 pb-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Personal Information
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Manage your personal details, contact information, technical biography, and skills
                </CardDescription>
              </div>

              {!isEditingPersonal ? (
                <Button
                  type="button"
                  onClick={() => setIsEditingPersonal(true)}
                  className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setIsEditingPersonal(false)}
                    variant="outline"
                    className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePersonalInfo}
                    className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-6 sm:p-7 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">First Name</Label>
                  <Input
                    disabled={!isEditingPersonal}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Last Name</Label>
                  <Input
                    disabled={!isEditingPersonal}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Student ID</Label>
                  <Input disabled value={studentId} className="h-10 text-xs font-mono font-bold bg-slate-50 dark:bg-zinc-900 rounded-xl text-slate-700 dark:text-zinc-200" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Email Address (Primary)</Label>
                  <Input disabled value={email} className="h-10 text-xs font-medium bg-slate-50 dark:bg-zinc-900 rounded-xl text-slate-500" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Phone Number</Label>
                  <Input
                    disabled={!isEditingPersonal}
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Technical Bio</Label>
                <Textarea
                  disabled={!isEditingPersonal}
                  placeholder="Briefly describe your programming passion, stack expertise, or career goals..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Tech Stack & Skills</Label>
                <Input
                  disabled={!isEditingPersonal}
                  placeholder="Java, Python, Data Structures, Spring Boot, React, SQL..."
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="h-10 text-xs font-medium rounded-xl"
                />
                
                {skillBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skillBadges.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Real-time Activity Heatmap */}
          <StudentActivityHeatmap studentId={user?.id} />
        </div>
      )}

      {/* 5. TAB 2: CODING PROFILES & LINKS */}
      {activeTab === "coding" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl">
            <CardHeader className="p-6 sm:p-7 pb-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Coding Profiles & Links
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Connect your GitHub, LinkedIn, portfolio, and competitive coding platform handles
                </CardDescription>
              </div>

              {!isEditingCoding ? (
                <Button
                  type="button"
                  onClick={() => setIsEditingCoding(true)}
                  className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Edit Links
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setIsEditingCoding(false)}
                    variant="outline"
                    className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveCodingLinks}
                    className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Links
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-6 sm:p-7 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* GitHub */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">GitHub Profile URL</Label>
                    {!isEditingCoding && githubUrl && (
                      <a href={githubUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        Open Profile
                      </a>
                    )}
                  </div>
                  <Input
                    disabled={!isEditingCoding}
                    placeholder="https://github.com/username"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>

                {/* LinkedIn */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">LinkedIn Profile URL</Label>
                    {!isEditingCoding && linkedinUrl && (
                      <a href={linkedinUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        Open Profile
                      </a>
                    )}
                  </div>
                  <Input
                    disabled={!isEditingCoding}
                    placeholder="https://linkedin.com/in/username"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>

                {/* Portfolio */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Personal Portfolio / Website</Label>
                    {!isEditingCoding && portfolioUrl && (
                      <a href={portfolioUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        Open Website
                      </a>
                    )}
                  </div>
                  <Input
                    disabled={!isEditingCoding}
                    placeholder="https://yourportfolio.dev"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>

                {/* LeetCode */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">LeetCode URL</Label>
                    {!isEditingCoding && leetcodeUrl && (
                      <a href={leetcodeUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        Open Profile
                      </a>
                    )}
                  </div>
                  <Input
                    disabled={!isEditingCoding}
                    placeholder="https://leetcode.com/username"
                    value={leetcodeUrl}
                    onChange={(e) => setLeetcodeUrl(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>

                {/* HackerRank */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">HackerRank URL</Label>
                    {!isEditingCoding && hackerrankUrl && (
                      <a href={hackerrankUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        Open Profile
                      </a>
                    )}
                  </div>
                  <Input
                    disabled={!isEditingCoding}
                    placeholder="https://hackerrank.com/username"
                    value={hackerrankUrl}
                    onChange={(e) => setHackerrankUrl(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>

                {/* CodeChef */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">CodeChef URL</Label>
                    {!isEditingCoding && codechefUrl && (
                      <a href={codechefUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        Open Profile
                      </a>
                    )}
                  </div>
                  <Input
                    disabled={!isEditingCoding}
                    placeholder="https://codechef.com/users/username"
                    value={codechefUrl}
                    onChange={(e) => setCodechefUrl(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>

              </div>

              {/* Codeforces */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Codeforces URL</Label>
                  {!isEditingCoding && codeforcesUrl && (
                    <a href={codeforcesUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      Open Profile
                    </a>
                  )}
                </div>
                <Input
                  disabled={!isEditingCoding}
                  placeholder="https://codeforces.com/profile/username"
                  value={codeforcesUrl}
                  onChange={(e) => setCodeforcesUrl(e.target.value)}
                  className="h-10 text-xs font-medium rounded-xl"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. TAB 3: ACCOUNT & SECURITY */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl">
            <CardHeader className="p-6 sm:p-7 pb-4 border-b border-slate-100 dark:border-zinc-800">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Account & Security
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Update your authentication password and manage account security
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 sm:p-7 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">New Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    className="h-10 text-xs rounded-xl"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="Re-enter new password to verify"
                    className="h-10 text-xs rounded-xl"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <Button
                  type="button"
                  className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  onClick={handleUpdatePassword}
                >
                  Update Account Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. TAB 4: REPORTS & ANALYSES */}
      {activeTab === "reports" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Header with Date Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#18181B] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reports & Analyses
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Authoritative session activity, practice lab metrics, and evaluation reports
              </p>
            </div>

            {/* Date Dropdown */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="h-9 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-2xs transition-colors cursor-pointer outline-none">
                  <span>{dateRangeLabel}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-700 p-1.5 rounded-xl shadow-lg">
                  <DropdownMenuItem
                    onClick={() => setDateRange("7d")}
                    className={cn(
                      "p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      dateRange === "7d" ? "text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-zinc-200"
                    )}
                  >
                    Last 7 days
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setDateRange("14d")}
                    className={cn(
                      "p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      dateRange === "14d" ? "text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-zinc-200"
                    )}
                  >
                    Last 14 days
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setDateRange("30d")}
                    className={cn(
                      "p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      dateRange === "30d" ? "text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-zinc-200"
                    )}
                  >
                    Last 30 days
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setDateRange("all")}
                    className={cn(
                      "p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      dateRange === "all" ? "text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-zinc-200"
                    )}
                  >
                    All time
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 bg-slate-200 dark:bg-zinc-700" />

                  <DropdownMenuItem
                    onClick={() => setIsCustomModalOpen(true)}
                    className={cn(
                      "p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      dateRange === "custom" ? "text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-zinc-200"
                    )}
                  >
                    Custom Date Range...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Sub-tabs: Learning | Skill Lab | Code Lab | Assess | Live | Time & Sessions */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setReportSubTab("learning")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                reportSubTab === "learning"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Learning ({coursesList.length})
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab("skill-lab")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                reportSubTab === "skill-lab"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Skill Lab ({skillLabList.reduce((acc, p) => acc + (p.completedChallenges || 0), 0)} Solved)
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab("code-lab")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                reportSubTab === "code-lab"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Code Lab ({codeLabList.filter((c) => c.completed).length} Solved)
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab("assess")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                reportSubTab === "assess"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Assess ({assessmentsList.length})
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab("live")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                reportSubTab === "live"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Live ({liveClassesList.length})
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab("time")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                reportSubTab === "time"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Time & Sessions
            </button>
          </div>

          {/* Sub-tab 1: LEARNING REPORT */}
          {reportSubTab === "learning" && (
            <div className="space-y-4">
              {filteredLearning.length === 0 ? (
                <Card className="p-10 text-center bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">No Assigned Learning Modules</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Course modules and curriculum syllabi assigned to your cohort will appear here.</p>
                </Card>
              ) : (
                filteredLearning.map((course) => (
                  <Card key={course.id} className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                          {course.title}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500 dark:text-zinc-400">
                          {course.category} • {course.completedModules} of {course.totalModules} modules finished
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{course.progress}% Completed</span>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded border", course.progress === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800")}>
                          {course.status}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-3">
                      <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }} />
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-zinc-800 pt-1">
                        {(course.modules || []).map((m: any, mIdx: number) => (
                          <div key={m.id || mIdx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">{m.title}</span>
                              {m.attemptsCount !== undefined && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {m.attemptsCount} {m.attemptsCount === 1 ? "attempt" : "attempts"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-[11px] text-slate-500">
                                {m.startedAt && m.startedAt !== "Not Started" ? `Started: ${m.startedAt}` : "Not Started"}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {m.completedAt ? `Completed: ${m.completedAt}` : "Pending"}
                              </span>
                              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", m.completed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : m.startedAt && m.startedAt !== "Not Started" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400")}>
                                {m.completed ? "Completed" : m.startedAt && m.startedAt !== "Not Started" ? "In Progress" : "Pending"}
                              </span>
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

          {/* Sub-tab 2: SKILL LAB REPORT */}
          {reportSubTab === "skill-lab" && (
            <div className="space-y-4">
              {filteredSkillLab.length === 0 ? (
                <Card className="p-10 text-center bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">No Skill Lab Tracks</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Skill practice tracks and topical question exercises will appear here.</p>
                </Card>
              ) : (
                filteredSkillLab.map((track) => (
                  <Card key={track.id} className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                          {track.title}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500 dark:text-zinc-400">
                          {track.description} • {track.completedChallenges} of {track.totalChallenges} challenges solved
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{track.progress}% Solved</span>
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded border",
                          track.progress === 100
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                            : track.progress > 0
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                            : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                        )}>
                          {track.status}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-3">
                      <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${track.progress}%` }} />
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-zinc-800 pt-1">
                        {(track.challenges || []).map((ch: any, chIdx: number) => (
                          <div key={ch.id || chIdx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">{ch.title}</span>
                              <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.2 rounded border",
                                ch.difficulty === "Easy" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400" :
                                ch.difficulty === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400" :
                                "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400"
                              )}>
                                {ch.difficulty}
                              </span>
                              {ch.attemptsCount !== undefined && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {ch.attemptsCount} {ch.attemptsCount === 1 ? "attempt" : "attempts"}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              {ch.score !== undefined && (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">{ch.score}% Score</span>
                              )}
                              <span className="text-[11px] text-slate-500">
                                {ch.startedAt && ch.startedAt !== "Not Started" ? `Started: ${ch.startedAt}` : "Not started"}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {ch.completedAt ? `Completed: ${ch.completedAt}` : "Pending"}
                              </span>
                              <span className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded border",
                                ch.completed
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                  : ch.startedAt && ch.startedAt !== "Not Started"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                              )}>
                                {ch.completed ? "Solved" : ch.startedAt && ch.startedAt !== "Not Started" ? "In Progress" : "Pending"}
                              </span>
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

          {/* Sub-tab 3: CODE LAB REPORT */}
          {reportSubTab === "code-lab" && (
            <div className="space-y-4">
              {filteredCodeLab.length === 0 ? (
                <Card className="p-10 text-center bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">No Coding Problems Available</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Interactive algorithmic challenges from Code Lab will appear here.</p>
                </Card>
              ) : (
                <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                        Code Lab Problem Solving
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Coding problem submissions, execution performance, and test case pass records
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {codeLabList.filter((c) => c.completed).length} of {codeLabList.length} Solved
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                        {Math.round((codeLabList.filter((c) => c.completed).length / Math.max(1, codeLabList.length)) * 100)}% Pass Rate
                      </span>
                    </div>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200/90 dark:border-zinc-800 text-[11px] text-slate-500 font-semibold">
                        <tr>
                          <th className="p-3.5 pl-5">Problem Statement</th>
                          <th className="p-3.5">Difficulty</th>
                          <th className="p-3.5">Language</th>
                          <th className="p-3.5">Attempts</th>
                          <th className="p-3.5">Started Date</th>
                          <th className="p-3.5">Solved Date</th>
                          <th className="p-3.5">Score</th>
                          <th className="p-3.5 pr-5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {filteredCodeLab.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                            <td className="p-3.5 pl-5">
                              <div className="font-semibold text-slate-900 dark:text-white">{p.title}</div>
                              <div className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 max-w-xs">{p.description}</div>
                            </td>
                            <td className="p-3.5">
                              <span className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded border",
                                p.difficulty === "Easy" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400" :
                                p.difficulty === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400" :
                                "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400"
                              )}>
                                {p.difficulty}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-zinc-400 font-mono text-[11px]">{p.language || "Python"}</td>
                            <td className="p-3.5 text-slate-600 dark:text-zinc-400">
                              {p.attemptsCount || (p.completed ? 1 : 0)} {(p.attemptsCount || (p.completed ? 1 : 0)) === 1 ? "run" : "runs"}
                            </td>
                            <td className="p-3.5 text-slate-500">{p.startedAt || "Not Started"}</td>
                            <td className="p-3.5 text-slate-500">{p.completedAt || "Pending"}</td>
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                              {p.score !== undefined ? `${p.score}%` : p.completed ? "100%" : "—"}
                            </td>
                            <td className="p-3.5 pr-5 text-right">
                              <span className={cn(
                                "inline-block px-2 py-0.5 rounded text-[10px] font-semibold border",
                                p.completed
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                  : p.startedAt && p.startedAt !== "Not Started"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                              )}>
                                {p.status}
                              </span>
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

          {/* Sub-tab 4: ASSESS REPORT */}
          {reportSubTab === "assess" && (
            <div className="space-y-4">
              {filteredAssessments.length === 0 ? (
                <Card className="p-10 text-center bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">No Evaluations Recorded</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">No proctored exams or scheduled assessments are assigned to your profile.</p>
                </Card>
              ) : (
                <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200/90 dark:border-zinc-800 text-[11px] text-slate-500 font-semibold">
                        <tr>
                          <th className="p-3.5 pl-5">Assessment Title</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5">Attempts</th>
                          <th className="p-3.5">Started Date</th>
                          <th className="p-3.5">Completed Date</th>
                          <th className="p-3.5">Score</th>
                          <th className="p-3.5">Integrity Flags</th>
                          <th className="p-3.5 pr-5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {filteredAssessments.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                            <td className="p-3.5 pl-5 font-semibold text-slate-900 dark:text-white">
                              {a.title}
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-zinc-400">{a.type}</td>
                            <td className="p-3.5 text-slate-600 dark:text-zinc-400">
                              {a.attemptsCount || (a.attempted ? 1 : 0)} {(a.attemptsCount || (a.attempted ? 1 : 0)) === 1 ? "attempt" : "attempts"}
                            </td>
                            <td className="p-3.5 text-slate-500">{a.startedAt || "Not Started"}</td>
                            <td className="p-3.5 text-slate-500">{a.completedDate || "Pending"}</td>
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">{a.scoreObtained}</td>
                            <td className="p-3.5 text-slate-500">{a.integrityViolations}</td>
                            <td className="p-3.5 pr-5 text-right">
                              <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-semibold border", a.attempted ? (a.rawScore >= 50 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400") : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400")}>
                                {a.evaluation || a.status || "Pending"}
                              </span>
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

          {/* Sub-tab 5: LIVE CLASSES REPORT */}
          {reportSubTab === "live" && (
            <div className="space-y-4">
              {filteredLiveClasses.length === 0 ? (
                <Card className="p-10 text-center bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">No Live Lectures Scheduled</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Virtual classrooms and instructor-led training sessions will appear here.</p>
                </Card>
              ) : (
                <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200/90 dark:border-zinc-800 text-[11px] text-slate-500 font-semibold">
                        <tr>
                          <th className="p-3.5 pl-5">Session Title</th>
                          <th className="p-3.5">Scheduled Date</th>
                          <th className="p-3.5">Time Window</th>
                          <th className="p-3.5">Duration</th>
                          <th className="p-3.5">Classroom Status</th>
                          <th className="p-3.5 pr-5 text-right">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {filteredLiveClasses.map((cls) => (
                          <tr key={cls.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                            <td className="p-3.5 pl-5 font-semibold text-slate-900 dark:text-white">
                              {cls.title}
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-zinc-400">{cls.scheduledDate}</td>
                            <td className="p-3.5 text-slate-600 dark:text-zinc-400">{cls.timeWindow}</td>
                            <td className="p-3.5 text-slate-600 dark:text-zinc-400">{cls.durationMinutes} mins</td>
                            <td className="p-3.5 text-slate-600 dark:text-zinc-400">{cls.status}</td>
                            <td className="p-3.5 pr-5 text-right">
                              <span className={cn(
                                "inline-block px-2 py-0.5 rounded text-[10px] font-semibold border",
                                cls.attended
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400"
                              )}>
                                {cls.attendanceStatus}
                              </span>
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

          {/* Sub-tab 6: TIME & SESSIONS */}
          {reportSubTab === "time" && (
            <div className="space-y-6">
              {/* 1. Interactive SVG Area Line Chart */}
              <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      Active Learning & Session Time
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Total Active Time: <strong className="text-slate-900 dark:text-white font-bold">{formatTimeSpent(reportSummary.totalTimeSpentSeconds || 0)}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 hidden sm:inline">Hover along points for detailed day metrics</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
                      {dateRangeLabel}
                    </span>
                  </div>
                </div>

                {(() => {
                  const data = dailyTimeSpent;
                  if (!data || data.length === 0) {
                    return <p className="text-xs text-slate-400 py-8 text-center">No time activity recorded in this period.</p>;
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

                  let pathD = `M ${firstPt.x} ${firstPt.y}`;
                  for (let i = 1; i < points.length; i++) {
                    const prev = points[i - 1];
                    const curr = points[i];
                    if (!prev || !curr) continue;
                    const cX1 = prev.x + (curr.x - prev.x) / 2;
                    const cY1 = prev.y;
                    const cX2 = prev.x + (curr.x - prev.x) / 2;
                    const cY2 = curr.y;
                    pathD += ` C ${cX1} ${cY1}, ${cX2} ${cY2}, ${curr.x} ${curr.y}`;
                  }

                  const areaD = `${pathD} L ${lastPt.x} ${height - paddingY} L ${firstPt.x} ${height - paddingY} Z`;
                  const activePt = hoveredTimePointIndex !== null ? points[hoveredTimePointIndex] : null;

                  return (
                    <div className="relative pt-2">
                      <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full h-44 overflow-visible"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id="profileTimeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="profileTimeStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#1D4ED8" />
                          </linearGradient>
                        </defs>
                        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
                        <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
                        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="currentColor" strokeOpacity="0.15" />
                        <path d={areaD} fill="url(#profileTimeAreaGrad)" />
                        <path d={pathD} fill="none" stroke="url(#profileTimeStrokeGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                        {activePt && (
                          <line
                            x1={activePt.x}
                            y1={paddingY - 5}
                            x2={activePt.x}
                            y2={height - paddingY}
                            stroke="#2563EB"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                        )}

                        {points.map((pt: any, i: number) => (
                          <g key={i} className="cursor-pointer pointer-events-none">
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredTimePointIndex === i ? 6 : pt.item.minutes > 0 ? 4 : 2.5}
                              fill={hoveredTimePointIndex === i ? "#2563EB" : pt.item.minutes > 0 ? "#2563EB" : "#94A3B8"}
                              stroke="#FFFFFF"
                              strokeWidth={hoveredTimePointIndex === i ? 2 : 1}
                            />
                          </g>
                        ))}
                      </svg>

                      {activePt && (
                        <div
                          className="absolute top-2 z-30 transform -translate-x-1/2 transition-all duration-150 pointer-events-none"
                          style={{
                            left: `${Math.max(18, Math.min(82, (activePt.x / width) * 100))}%`,
                          }}
                        >
                          <div className="bg-slate-900/95 dark:bg-zinc-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-3.5 shadow-xl min-w-[220px] max-w-[300px] text-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-2 gap-2">
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400">
                                  {activePt.item.fullDate || activePt.item.label}
                                </p>
                                <p className="text-sm font-bold text-white mt-0.5">
                                  {activePt.item.minutes > 0 ? (activePt.item.display || `${activePt.item.minutes}m`) : "0m"} on site
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "text-[9px] font-semibold px-1.5 py-0.5 rounded",
                                  activePt.item.minutes >= 45
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : activePt.item.minutes > 0
                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                    : "bg-slate-800 text-slate-400"
                                )}
                              >
                                {activePt.item.minutes >= 45 ? "High Activity" : activePt.item.minutes > 0 ? "Active" : "Rest Day"}
                              </span>
                            </div>

                            <div className="space-y-1.5 pt-0.5 text-[11px]">
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Coding Practice:</span>
                                <strong className="text-white">
                                  {activePt.item.activities?.codingCount ? `${activePt.item.activities.codingCount} problem runs` : "0"}
                                </strong>
                              </div>
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Evaluations:</span>
                                <strong className="text-white">
                                  {activePt.item.activities?.assessmentsCount ? `${activePt.item.activities.assessmentsCount} tests taken` : "0"}
                                </strong>
                              </div>
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Course Modules:</span>
                                <strong className="text-white">
                                  {activePt.item.activities?.courseModulesCount ? `${activePt.item.activities.courseModulesCount} lessons` : "0"}
                                </strong>
                              </div>
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Portal Sessions:</span>
                                <strong className="text-white">
                                  {activePt.item.activities?.loginsCount || 1} active session
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div
                        className="flex justify-between items-center px-4 pt-2 text-[10px] text-slate-500 dark:text-zinc-400 font-semibold overflow-x-auto no-scrollbar"
                        onMouseLeave={() => setHoveredTimePointIndex(null)}
                      >
                        {data.map((item: any, idx: number) => {
                          const showLabel = data.length <= 10 || idx % Math.ceil(data.length / 8) === 0 || idx === data.length - 1;
                          return (
                            <span
                              key={idx}
                              className={cn("whitespace-nowrap transition-colors cursor-pointer", hoveredTimePointIndex === idx ? "text-blue-600 font-bold" : "")}
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
                <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl p-5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Total Active Time</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{formatTimeSpent(reportSummary.totalTimeSpentSeconds || 0)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Time spent actively on LMS</p>
                </Card>
                <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl p-5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Learning Modules</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{coursesList.reduce((acc, c) => acc + (c.completedModules || 0), 0)} Completed</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Curriculum syllabus lessons</p>
                </Card>
                <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl p-5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Code Lab Problems</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{codeLabList.filter((c) => c.completed).length} Solved</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Coding challenges completed</p>
                </Card>
                <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl p-5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Assessments</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{assessmentsList.filter((a) => a.attempted).length} Finished</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Proctored exams taken</p>
                </Card>
              </div>

              {/* 3. Logins Table */}
              <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Student Session History
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200/90 dark:border-zinc-800 text-[11px] text-slate-500 font-semibold">
                      <tr>
                        <th className="p-3.5 pl-5">Timestamp</th>
                        <th className="p-3.5">Device / Source</th>
                        <th className="p-3.5">Session Duration</th>
                        <th className="p-3.5 pr-5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {loginActivities.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                          <td className="p-3.5 pl-5 font-semibold text-slate-900 dark:text-zinc-100">
                            {log.timestamp}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-zinc-400">{log.device}</td>
                          <td className="p-3.5 font-medium text-slate-700 dark:text-zinc-300">{log.duration}</td>
                          <td className="p-3.5 pr-5 text-right">
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded text-[10px] font-semibold border",
                              log.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                            )}>
                              {log.status}
                            </span>
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

      {/* Custom Date to Date Modal Dialog */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Custom Date Range Filter
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Select start date and end date to filter your student learning activities and reports.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">From Date</Label>
              <Input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">To Date</Label>
              <Input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCustomModalOpen(false)}
              className="text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyCustomRange}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              Apply Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
