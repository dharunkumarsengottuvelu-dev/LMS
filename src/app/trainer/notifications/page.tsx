"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Send,
  Users,
  LayoutList,
  CheckCircle,
  XCircle,
  Clock,
  Megaphone,
  RotateCw,
  Mail,
  Link as LinkIcon,
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
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TrainerNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const [targetType, setTargetType] = useState<"common" | "batch">("common");
  const [batchId, setBatchId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sendEmailFlag, setSendEmailFlag] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/notifications/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {} finally {
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

  useEffect(() => { fetchHistory(); fetchBatches(); }, [fetchHistory, fetchBatches]);

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
      if (data.success) { setTitle(""); setMessage(""); setLinkUrl(""); setBatchId(""); setBatchName(""); setSendEmailFlag(false); fetchHistory(); }
    } catch (e: any) {
      setSendResult({ success: false, error: e?.message || "Network error" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader title="Send Notifications" description="Broadcast notifications to your batch students" />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-5">
          <Card className="border border-slate-200/80 dark:border-zinc-800 shadow-sm bg-white dark:bg-[#18181B] rounded-2xl">
            <CardHeader className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Megaphone className="h-4 w-4 text-[#2563EB]" />
                Compose Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Target Audience</Label>
                <div className="flex gap-2">
                  {(["common", "batch"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTargetType(t)} className={cn("flex-1 py-2 px-4 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer", targetType === t ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm" : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-blue-300")}>
                      {t === "common" ? <span className="flex items-center justify-center gap-1.5"><Users className="h-3.5 w-3.5" />All Students</span> : <span className="flex items-center justify-center gap-1.5"><LayoutList className="h-3.5 w-3.5" />My Batch</span>}
                    </button>
                  ))}
                </div>
              </div>

              {targetType === "batch" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Select Batch</Label>
                  {batches.length > 0 ? (
                    <select value={batchId} onChange={(e) => { const sel = batches.find((b) => String(b.id) === e.target.value); setBatchId(e.target.value); setBatchName(sel?.name || sel?.batch_name || e.target.value); }} className="w-full h-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Select a batch —</option>
                      {batches.map((b: any) => <option key={b.id} value={b.id}>{b.name || b.batch_name || b.id}</option>)}
                    </select>
                  ) : (
                    <Input value={batchId} onChange={(e) => { setBatchId(e.target.value); setBatchName(e.target.value); }} placeholder="Enter batch ID or name" className="h-10 rounded-xl text-sm" />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Type</Label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Title <span className="text-red-500">*</span></Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Assignment Due Tomorrow" className="h-10 rounded-xl text-sm" maxLength={120} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Message <span className="text-red-500">*</span></Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message..." rows={4} className="rounded-xl text-sm resize-none" maxLength={1000} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5" />Related Link (optional)</Label>
                <select value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {LINK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={sendEmailFlag} onChange={(e) => setSendEmailFlag(e.target.checked)} className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer" />
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Also send Email</span>
              </label>

              {sendResult && (
                <div className={cn("flex items-start gap-3 p-4 rounded-xl text-sm border", sendResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300" : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300")}>
                  {sendResult.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />}
                  <p className="font-medium text-xs leading-relaxed">{sendResult.message || sendResult.error}</p>
                </div>
              )}

              <Button onClick={handleSend} disabled={!title.trim() || !message.trim() || isSending} className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl gap-2 text-sm shadow-sm disabled:opacity-60">
                {isSending ? <><RotateCw className="h-4 w-4 animate-spin" />Sending...</> : <><Send className="h-4 w-4" />Send Notification</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card className="border border-slate-200/80 dark:border-zinc-800 shadow-sm bg-white dark:bg-[#18181B] rounded-2xl">
            <CardHeader className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#2563EB]" />
                Sent History
              </CardTitle>
              <button type="button" onClick={fetchHistory} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer">
                <RotateCw className={cn("h-3.5 w-3.5", isLoadingHistory && "animate-spin")} />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingHistory ? (
                <div className="py-12 text-center"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Bell className="h-8 w-8 text-slate-200 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">No broadcasts sent yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 max-h-[500px] overflow-y-auto">
                  {history.map((h) => (
                    <div key={h.id} className="p-4 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">{h.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2">{h.message}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{h.recipient_count} students</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(h.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
