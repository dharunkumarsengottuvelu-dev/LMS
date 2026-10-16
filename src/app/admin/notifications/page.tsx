"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Send,
  Users,
  LayoutList,
  CheckCircle,
  XCircle,
  Clock,
  Megaphone,
  ChevronDown,
  RotateCw,
  Mail,
  Link as LinkIcon,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layouts/page-header";
import { cn } from "@/lib/utils";

const LINK_OPTIONS = [
  { label: "— No link —", value: "" },
  { label: "My Courses", value: "/student/my-courses" },
  { label: "Skill Lab", value: "/student/practices" },
  { label: "Code Lab", value: "/coding" },
  { label: "Assessments", value: "/student/tests" },
  { label: "Live Classes", value: "/student/live-classes" },
  { label: "Notifications", value: "/student/notifications" },
  { label: "Profile", value: "/student/profile" },
];

const TYPE_OPTIONS = [
  { label: "Announcement", value: "announcement" },
  { label: "Assessment", value: "assessment_assigned" },
  { label: "Course Update", value: "course_updated" },
  { label: "General", value: "general" },
];

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminNotificationsPage() {
  // Composer state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const [targetType, setTargetType] = useState<"common" | "trainers" | "both" | "batch">("common");
  const [batchId, setBatchId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sendEmailFlag, setSendEmailFlag] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  // SMTP Test state & modal
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState("sensigroup.info@gmail.com");
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Batch list
  const [batches, setBatches] = useState<any[]>([]);

  // History & Delivery stats
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/notifications/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        if (data.stats) {
          setDeliveryStats(data.stats);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch broadcast history", e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchBatches();
  }, [fetchHistory, fetchBatches]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          target_type: targetType,
          batch_id: targetType === "batch" ? batchId : undefined,
          batch_name: targetType === "batch" ? batchName : undefined,
          link_url: linkUrl || undefined,
          send_email: sendEmailFlag,
        }),
      });
      const data = await res.json();
      setSendResult(data);
      if (data.success) {
        setTitle("");
        setMessage("");
        setLinkUrl("");
        setBatchId("");
        setBatchName("");
        setSendEmailFlag(false);
        fetchHistory();
      }
    } catch (e: any) {
      setSendResult({ success: false, error: e?.message || "Network error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleRunSmtpTest = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: smtpTestEmail.trim() }),
      });
      const data = await res.json();
      setSmtpTestResult({
        success: data.success,
        message: data.message || (data.success ? "Verification succeeded" : "Verification failed"),
      });
    } catch (e: any) {
      setSmtpTestResult({
        success: false,
        message: e?.message || "Connection timeout or network failure",
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const isFormValid = title.trim().length > 0 && message.trim().length > 0;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="System Announcements"
          description="Broadcast notifications and automated emails to students and trainers via sensigroup.info@gmail.com"
        />
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSmtpTestResult(null);
              setIsSmtpModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            SMTP Diagnostics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Composer — 3 columns */}
        <div className="xl:col-span-3 space-y-5">
          <Card className="border border-slate-200/80 dark:border-zinc-800 shadow-sm bg-white dark:bg-[#18181B] rounded-2xl">
            <CardHeader className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Megaphone className="h-4 w-4 text-blue-600" />
                Compose Broadcast
              </CardTitle>
              <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                Sender: sensigroup.info@gmail.com
              </span>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Target Type */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Target Audience
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "common", label: "Students", sub: "All active" },
                    { id: "trainers", label: "Trainers", sub: "All active" },
                    { id: "both", label: "All Users", sub: "Students + Trainers" },
                    { id: "batch", label: "Specific Batch", sub: "Cohort based" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetType(t.id as any)}
                      className={cn(
                        "py-2 px-3 rounded-xl text-left border transition-all duration-150 cursor-pointer",
                        targetType === t.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-blue-300"
                      )}
                    >
                      <div className="text-xs font-semibold">{t.label}</div>
                      <div className={cn("text-[10px]", targetType === t.id ? "text-blue-100" : "text-slate-400")}>
                        {t.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Selector */}
              {targetType === "batch" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                    Select Batch
                  </Label>
                  {batches.length > 0 ? (
                    <select
                      value={batchId}
                      onChange={(e) => {
                        const selected = batches.find((b) => String(b.id) === e.target.value);
                        setBatchId(e.target.value);
                        setBatchName(selected?.name || selected?.batch_name || e.target.value);
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Select a batch —</option>
                      {batches.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name || b.batch_name || b.id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={batchId}
                      onChange={(e) => { setBatchId(e.target.value); setBatchName(e.target.value); }}
                      placeholder="Enter batch ID or name"
                      className="h-10 rounded-xl text-sm"
                    />
                  )}
                </div>
              )}

              {/* Notification Type */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Notification Type
                </Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Notification Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Platform Update — New Features Available"
                  className="h-10 rounded-xl text-sm"
                  maxLength={120}
                />
                <p className="text-[11px] text-slate-400">{title.length}/120</p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Message <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your notification message here..."
                  rows={4}
                  className="rounded-xl text-sm resize-none"
                  maxLength={1000}
                />
                <p className="text-[11px] text-slate-400">{message.length}/1000</p>
              </div>

              {/* Related Link */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Related Module / Link (optional)
                </Label>
                <select
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LINK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Delivery Options */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Delivery Options
                </Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div className="w-4 h-4 rounded border-2 border-blue-600 bg-blue-600 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      In-App Notification
                    </span>
                    <Badge className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                      Always active
                    </Badge>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmailFlag}
                      onChange={(e) => setSendEmailFlag(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                    />
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Also send Automated Email (sensigroup.info@gmail.com)
                    </span>
                  </label>
                </div>
              </div>

              {/* Result Banner */}
              {sendResult && (
                <div
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl text-sm border",
                    sendResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
                      : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
                  )}
                >
                  {sendResult.success ? (
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                  )}
                  <p className="font-medium text-xs leading-relaxed">
                    {sendResult.message || sendResult.error || "Unknown result"}
                  </p>
                </div>
              )}

              {/* Send Button */}
              <Button
                onClick={handleSend}
                disabled={!isFormValid || isSending}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl gap-2 text-sm shadow-sm disabled:opacity-60 transition-all"
              >
                {isSending ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Broadcast Notification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Broadcast & Email Delivery Monitoring — 2 columns */}
        <div className="xl:col-span-2 space-y-4">
          {/* Email Monitoring Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total Emails</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {deliveryStats ? deliveryStats.totalEmails : 0}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Sent</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {deliveryStats ? deliveryStats.sent : 0}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Failed</div>
              <div className="text-base font-bold text-slate-700 dark:text-zinc-300 mt-0.5">
                {deliveryStats ? deliveryStats.failed : 0}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Gateway</div>
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 truncate">
                Active (SSL)
              </div>
            </div>
          </div>

          <Card className="border border-slate-200/80 dark:border-zinc-800 shadow-sm bg-white dark:bg-[#18181B] rounded-2xl">
            <CardHeader className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                Broadcast History
              </CardTitle>
              <button
                type="button"
                onClick={fetchHistory}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Refresh"
              >
                <RotateCw className={cn("h-3.5 w-3.5", isLoadingHistory && "animate-spin")} />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingHistory ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Loading history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Bell className="h-8 w-8 text-slate-200 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">No broadcasts yet</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Sent notifications will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 max-h-[600px] overflow-y-auto">
                  {history.map((h) => (
                    <div key={h.id} className="p-4 space-y-2 hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                          {h.title}
                        </p>
                        <Badge
                          className={cn(
                            "text-[10px] shrink-0 font-bold px-1.5",
                            h.target_type === "batch"
                              ? "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800"
                              : h.target_type === "trainers"
                              ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
                              : h.target_type === "both" || h.target_type === "all"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800"
                              : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800"
                          )}
                        >
                          {h.target_type === "batch"
                            ? h.batch_name || "Batch"
                            : h.target_type === "trainers"
                            ? "All Trainers"
                            : h.target_type === "both" || h.target_type === "all"
                            ? "All Users"
                            : "All Students"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {h.message}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {h.recipient_count} recipients
                          </span>
                          {h.email_enabled && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {h.email_sent} sent
                              {h.email_status === "dev_simulated" && " (dev)"}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(h.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MNC-Style SMTP Diagnostic Modal (Strictly Zero Icons) */}
      {isSmtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                SMTP Gateway Verification
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Validate outbound email delivery through Google SMTP infrastructure
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">Configured Sender:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">sensigroup.info@gmail.com</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">Host / Protocol:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">smtp.gmail.com:465 (SSL)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">Authentication:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">Google App Password</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Recipient Test Address
                </label>
                <input
                  type="email"
                  value={smtpTestEmail}
                  onChange={(e) => setSmtpTestEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {smtpTestResult && (
                <div
                  className={cn(
                    "p-3.5 rounded-xl border text-xs leading-relaxed",
                    smtpTestResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
                      : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
                  )}
                >
                  <p className="font-semibold mb-0.5">
                    {smtpTestResult.success ? "Connection Verified" : "Verification Failed"}
                  </p>
                  <p>{smtpTestResult.message}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsSmtpModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleRunSmtpTest}
                disabled={isTestingSmtp || !smtpTestEmail.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isTestingSmtp ? "Testing Gateway..." : "Execute Test Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Check icon for inline use
function Check({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth || 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
