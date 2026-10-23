"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Building,
  Shield,
  Bell,
  Cpu,
  CheckCircle2,
  Lock,
  Globe,
  Clock,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"general" | "security" | "notifications" | "compiler">("general");
  const [isSaving, setIsSaving] = useState(false);

  // Organization Settings
  const [orgName, setOrgName] = useState("SensiLearn Technologies");
  const [portalTitle, setPortalTitle] = useState("SensilLearn Enterprise LMS");
  const [supportEmail, setSupportEmail] = useState("support@sensilearn.com");
  const [contactPhone, setContactPhone] = useState("+91 80 4567 8900");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [tagline, setTagline] = useState("Transforming Learning Into Practical Technical Capability");

  // Security Policies
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState("30");
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [minPasswordLength, setMinPasswordLength] = useState("8");
  const [enforceFullscreenAssessments, setEnforceFullscreenAssessments] = useState(true);
  const [restrictCopyPasteByDefault, setRestrictCopyPasteByDefault] = useState(true);

  // Notifications & Alerts
  const [alertOnProctorViolations, setAlertOnProctorViolations] = useState(true);
  const [dailyDigestEmail, setDailyDigestEmail] = useState(true);
  const [maintenanceBannerActive, setMaintenanceBannerActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("Scheduled maintenance window on Sunday 02:00 AM - 04:00 AM IST.");

  // Compiler Execution Defaults
  const [defaultTimeoutSecs, setDefaultTimeoutSecs] = useState("5");
  const [defaultMemoryLimitMb, setDefaultMemoryLimitMb] = useState("256");
  const [sandboxIsolationMode, setSandboxIsolationMode] = useState("docker_jobe");

  // Load persisted settings from localStorage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sensilearn_admin_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.orgName) setOrgName(parsed.orgName);
          if (parsed.portalTitle) setPortalTitle(parsed.portalTitle);
          if (parsed.supportEmail) setSupportEmail(parsed.supportEmail);
          if (parsed.contactPhone) setContactPhone(parsed.contactPhone);
          if (parsed.timezone) setTimezone(parsed.timezone);
          if (parsed.tagline) setTagline(parsed.tagline);
          if (parsed.sessionTimeoutMins) setSessionTimeoutMins(parsed.sessionTimeoutMins);
          if (parsed.maxLoginAttempts) setMaxLoginAttempts(parsed.maxLoginAttempts);
          if (parsed.minPasswordLength) setMinPasswordLength(parsed.minPasswordLength);
          if (typeof parsed.enforceFullscreenAssessments === "boolean") setEnforceFullscreenAssessments(parsed.enforceFullscreenAssessments);
          if (typeof parsed.restrictCopyPasteByDefault === "boolean") setRestrictCopyPasteByDefault(parsed.restrictCopyPasteByDefault);
          if (typeof parsed.alertOnProctorViolations === "boolean") setAlertOnProctorViolations(parsed.alertOnProctorViolations);
          if (typeof parsed.dailyDigestEmail === "boolean") setDailyDigestEmail(parsed.dailyDigestEmail);
          if (typeof parsed.maintenanceBannerActive === "boolean") setMaintenanceBannerActive(parsed.maintenanceBannerActive);
          if (parsed.maintenanceMessage) setMaintenanceMessage(parsed.maintenanceMessage);
          if (parsed.defaultTimeoutSecs) setDefaultTimeoutSecs(parsed.defaultTimeoutSecs);
          if (parsed.defaultMemoryLimitMb) setDefaultMemoryLimitMb(parsed.defaultMemoryLimitMb);
          if (parsed.sandboxIsolationMode) setSandboxIsolationMode(parsed.sandboxIsolationMode);
        }
      } catch (e) {
        console.warn("Could not read local settings", e);
      }
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        orgName,
        portalTitle,
        supportEmail,
        contactPhone,
        timezone,
        tagline,
        sessionTimeoutMins,
        maxLoginAttempts,
        minPasswordLength,
        enforceFullscreenAssessments,
        restrictCopyPasteByDefault,
        alertOnProctorViolations,
        dailyDigestEmail,
        maintenanceBannerActive,
        maintenanceMessage,
        defaultTimeoutSecs,
        defaultMemoryLimitMb,
        sandboxIsolationMode,
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("sensilearn_admin_settings", JSON.stringify(payload));
      }

      toast({
        title: "Platform Settings Saved",
        description: "Organization parameters and system policies updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to update platform settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Platform Settings"
        description="Configure organization identity, security rules, notification workflows, and execution environments."
        actions={
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="h-[44px] bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-5 rounded-xl shadow-xs text-xs"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </Button>
        }
      />

      {/* 2. Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-6">
        <div className="border-b border-slate-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 flex space-x-6 sm:space-x-8">
            <TabsTrigger
              value="general"
              className="py-3 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none text-xs sm:text-sm font-bold whitespace-nowrap rounded-none transition-colors"
            >
              Organization & Identity
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="py-3 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none text-xs sm:text-sm font-bold whitespace-nowrap rounded-none transition-colors"
            >
              Security & Sessions
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="py-3 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none text-xs sm:text-sm font-bold whitespace-nowrap rounded-none transition-colors"
            >
              Notifications & Alerts
            </TabsTrigger>
            <TabsTrigger
              value="compiler"
              className="py-3 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none text-xs sm:text-sm font-bold whitespace-nowrap rounded-none transition-colors"
            >
              Execution & Compiler Limits
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Organization & Identity */}
        <TabsContent value="general" className="mt-0 outline-none">
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                Organization Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Core institutional naming and global contact details displayed across reports and certificates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="orgName" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Organization Legal Name
                  </Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="portalTitle" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Platform Title
                  </Label>
                  <Input
                    id="portalTitle"
                    value={portalTitle}
                    onChange={(e) => setPortalTitle(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="supportEmail" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Support Email
                  </Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Support Contact Phone
                  </Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Default Timezone
                  </Label>
                  <Select value={timezone} onValueChange={(val) => { if (val) setTimezone(val); }}>
                    <SelectTrigger id="timezone" className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</SelectItem>
                      <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST -5:00)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT +0:00)</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore (SGT +8:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tagline" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Portal Tagline / Mission
                  </Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Security & Sessions */}
        <TabsContent value="security" className="mt-0 outline-none">
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Security Policies & Session Inactivity
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Governance rules for candidate authentication, auto-logout, and anti-cheating enforcement.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="sessionTimeout" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Session Timeout (Minutes)
                  </Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="5"
                    max="180"
                    value={sessionTimeoutMins}
                    onChange={(e) => setSessionTimeoutMins(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="maxAttempts" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Max Login Attempts
                  </Label>
                  <Input
                    id="maxAttempts"
                    type="number"
                    min="3"
                    max="10"
                    value={maxLoginAttempts}
                    onChange={(e) => setMaxLoginAttempts(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="minPass" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Password Minimum Length
                  </Label>
                  <Input
                    id="minPass"
                    type="number"
                    min="6"
                    max="16"
                    value={minPasswordLength}
                    onChange={(e) => setMinPasswordLength(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/70 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Enforce Strict Fullscreen on Proctored Evaluations
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Candidates must enter fullscreen mode and will be flagged if they exit the window.
                    </p>
                  </div>
                  <Switch
                    checked={enforceFullscreenAssessments}
                    onCheckedChange={setEnforceFullscreenAssessments}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/70 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Restrict Copy/Paste During Coding Tests
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Prevent external clipboard pasting in code editor during assessments by default.
                    </p>
                  </div>
                  <Switch
                    checked={restrictCopyPasteByDefault}
                    onCheckedChange={setRestrictCopyPasteByDefault}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Notifications & Alerts */}
        <TabsContent value="notifications" className="mt-0 outline-none">
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Notification Routing & System Announcements
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure real-time proctoring alerts and global student notice banners.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/70 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Email Alert on High-Severity Proctoring Flags
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Notify administrators and trainers if a candidate exceeds 3 violation warnings.
                    </p>
                  </div>
                  <Switch
                    checked={alertOnProctorViolations}
                    onCheckedChange={setAlertOnProctorViolations}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/70 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Daily Activity & Submission Digest
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Send automated end-of-day summary reports across all batches.
                    </p>
                  </div>
                  <Switch
                    checked={dailyDigestEmail}
                    onCheckedChange={setDailyDigestEmail}
                  />
                </div>

                <div className="p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Global System Announcement Banner
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Display a top-level notice banner across Student and Trainer portals.
                      </p>
                    </div>
                    <Switch
                      checked={maintenanceBannerActive}
                      onCheckedChange={setMaintenanceBannerActive}
                    />
                  </div>
                  {maintenanceBannerActive && (
                    <div className="space-y-1.5 pt-2">
                      <Label htmlFor="maintMsg" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Banner Message Content
                      </Label>
                      <Input
                        id="maintMsg"
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Execution & Compiler Limits */}
        <TabsContent value="compiler" className="mt-0 outline-none">
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                Universal Compiler Execution Limits
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Resource allocation and timeout safeguards for code compilation and sandbox execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="defTimeout" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Execution Timeout (Seconds)
                  </Label>
                  <Input
                    id="defTimeout"
                    type="number"
                    min="1"
                    max="30"
                    value={defaultTimeoutSecs}
                    onChange={(e) => setDefaultTimeoutSecs(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400">Protects against infinite loops.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="defMemory" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Memory Limit (MB)
                  </Label>
                  <Input
                    id="defMemory"
                    type="number"
                    min="64"
                    max="1024"
                    value={defaultMemoryLimitMb}
                    onChange={(e) => setDefaultMemoryLimitMb(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400">Per process sandbox cap.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sandboxMode" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Sandbox Engine
                  </Label>
                  <Select value={sandboxIsolationMode} onValueChange={(val) => { if (val) setSandboxIsolationMode(val); }}>
                    <SelectTrigger id="sandboxMode" className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-zinc-900">
                      <SelectValue placeholder="Select sandbox mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="docker_jobe">Jobe Server Sandbox (Isolated)</SelectItem>
                      <SelectItem value="universal_fallback">Native Process Fallback</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">Multi-tier execution architecture.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
