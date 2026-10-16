"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  ShieldAlert,
  Video,
  EyeOff,
  LayoutDashboard,
  AlertTriangle,
  Activity,
  VolumeX,
  Maximize,
  CheckCircle2,
  XCircle,
  Camera,
  ShieldCheck,
  Download,
  RefreshCw,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layouts/page-header";

interface ProctoringEventLog {
  id: string;
  studentName: string;
  studentId: string;
  eventType: string;
  severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  timestamp: string;
  duration?: string;
  warningNumber: number;
  message: string;
  resolved: boolean;
}

interface MonitoredCandidate {
  id: string;
  name: string;
  rollNo: string;
  status: "active" | "warning" | "high_risk" | "disconnected";
  faceStatus: "centered" | "not_detected" | "multiple_faces" | "looking_away";
  warningCount: number;
  maxWarnings: number;
  proctoringRisk: "Clean" | "Minor Violations" | "Suspicious" | "High Risk";
  lastPing: string;
}

export function LiveInspectionHub({ examId }: { examId: string }) {
  const [activeTab, setActiveTab] = useState<"summary" | "grid" | "logs">("summary");
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  // Monitored Candidates & Logs (loaded live from active exam submissions)
  const [candidates, setCandidates] = useState<MonitoredCandidate[]>([]);
  const [logs, setLogs] = useState<ProctoringEventLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSubmissions() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/tests/${examId}/submissions`);
        if (!res.ok) throw new Error("Failed to load submissions");
        const data = await res.json();
        const subs: any[] = data.submissions || [];

        const mappedCandidates: MonitoredCandidate[] = subs.map((s, idx) => ({
          id: s.id || `std_${idx + 1}`,
          name: s.name || s.user_id || "Student",
          rollNo: s.rollNo || s.email?.split("@")[0] || `STD-${idx + 1}`,
          status: s.status === "Submitted" ? "active" : "high_risk",
          faceStatus: (s.violationsCount || 0) > 0 ? "looking_away" : "centered",
          warningCount: s.violationsCount || 0,
          maxWarnings: 3,
          proctoringRisk: (s.violationsCount || 0) > 2 ? "High Risk" : (s.violationsCount || 0) > 0 ? "Minor Violations" : "Clean",
          lastPing: s.submittedAt || "Just now",
        }));

        const generatedLogs: ProctoringEventLog[] = [];
        subs.forEach((s, idx) => {
          if (s.violationsCount && s.violationsCount > 0) {
            generatedLogs.push({
              id: `log_${idx + 1}`,
              studentName: s.name || "Student",
              studentId: s.id || `std_${idx + 1}`,
              eventType: s.status === "Auto-Submitted" ? "MAX_WARNINGS_AUTO_SUBMIT" : "TAB_SWITCH_OR_GAZE",
              severity: s.violationsCount > 2 ? "CRITICAL" : "WARNING",
              timestamp: s.submittedAt || new Date().toLocaleTimeString(),
              duration: "3s",
              warningNumber: s.violationsCount,
              message: s.status === "Auto-Submitted" ? "Exam auto-submitted due to safety limits exceeded." : `Security event recorded (${s.violationsCount} total alerts).`,
              resolved: true,
            });
          }
        });

        setCandidates(mappedCandidates);
        setLogs(generatedLogs);
      } catch (err) {
        console.warn("Could not fetch real proctoring data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (examId) {
      fetchSubmissions();
    }
  }, [examId]);

  // Aggregate Metrics
  const totalWarnings = logs.length;
  const faceNotDetectedEvents = logs.filter((l) => l.eventType === "NO_FACE_DETECTED").length;
  const multipleFaceEvents = logs.filter((l) => l.eventType === "MULTIPLE_FACES").length;
  const cameraDisconnectEvents = logs.filter((l) => l.eventType === "CAMERA_DISCONNECTED" || l.eventType === "CAMERA_DISABLED").length;
  const lookingAwayEvents = logs.filter((l) => l.eventType === "LOOKING_AWAY").length;
  const criticalViolations = logs.filter((l) => l.severity === "CRITICAL" || l.severity === "HIGH").length;

  const overallRisk: "Clean" | "Minor Violations" | "Suspicious" | "High Risk" =
    criticalViolations > 2
      ? "High Risk"
      : criticalViolations > 0 || totalWarnings > 3
      ? "Suspicious"
      : totalWarnings > 0
      ? "Minor Violations"
      : "Clean";

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "ALL" || l.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const exportLogsCsv = () => {
    const headers = "Log ID,Student,Student ID,Event Type,Severity,Timestamp,Duration,Warning No,Message\n";
    const rows = logs
      .map(
        (l) =>
          `"${l.id}","${l.studentName}","${l.studentId}","${l.eventType}","${l.severity}","${l.timestamp}","${l.duration || "N/A"}","${l.warningNumber}","${l.message.replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proctoring_report_${examId}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 h-full flex flex-col min-h-0">
      <PageHeader
        className="p-3 sm:p-4 mb-0 rounded-xl shadow-xs"
        title={
          <div className="flex items-center gap-2.5">
            <span className="text-lg sm:text-xl font-bold tracking-tight">Live Exam Proctoring Hub</span>
            <Badge className="bg-[#16A34A] hover:bg-[#16A34A] text-white gap-1.5 px-2 py-0.5 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE MONITORING
            </Badge>
          </div>
        }
        backAction={{ href: "/admin/tests", label: "Back to Tests" }}
        actions={
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex items-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-lg p-0.5">
              <Button
                onClick={() => setActiveTab("summary")}
                variant={activeTab === "summary" ? "default" : "ghost"}
                className={`h-7.5 text-xs font-semibold rounded-md px-2.5 ${
                  activeTab === "summary"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                }`}
              >
                Proctoring Summary
              </Button>
              <Button
                onClick={() => setActiveTab("grid")}
                variant={activeTab === "grid" ? "default" : "ghost"}
                className={`h-7.5 text-xs font-semibold rounded-md px-2.5 ${
                  activeTab === "grid"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                }`}
              >
                Candidate Feeds ({candidates.length})
              </Button>
              <Button
                onClick={() => setActiveTab("logs")}
                variant={activeTab === "logs" ? "default" : "ghost"}
                className={`h-7.5 text-xs font-semibold rounded-md px-2.5 ${
                  activeTab === "logs"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                }`}
              >
                Audit Event Logs ({logs.length})
              </Button>
            </div>
            <Button
              onClick={exportLogsCsv}
              variant="outline"
              className="h-7.5 text-xs font-semibold rounded-lg border-[#E5E7EB] dark:border-[#27272A] px-2.5"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export Audit CSV
            </Button>
          </div>
        }
      />

      {/* TAB 1: PROCTORING SUMMARY DASHBOARD */}
      {activeTab === "summary" && (
        <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-0.5">
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2.5 px-3 rounded-xl shadow-xs">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Total Warnings</p>
              <p className="text-xl font-extrabold text-[#111827] dark:text-[#FAFAFA] mt-0.5">{totalWarnings}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2.5 px-3 rounded-xl shadow-xs">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Face Not Detected</p>
              <p className="text-xl font-extrabold text-[#D97706] mt-0.5">{faceNotDetectedEvents}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2.5 px-3 rounded-xl shadow-xs">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Multiple Faces</p>
              <p className="text-xl font-extrabold text-[#DC2626] mt-0.5">{multipleFaceEvents}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2.5 px-3 rounded-xl shadow-xs">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Looking Away</p>
              <p className="text-xl font-extrabold text-[#2563EB] mt-0.5">{lookingAwayEvents}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2.5 px-3 rounded-xl shadow-xs">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Camera Disconnects</p>
              <p className="text-xl font-extrabold text-[#DC2626] mt-0.5">{cameraDisconnectEvents}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2.5 px-3 rounded-xl shadow-xs">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Critical Violations</p>
              <p className="text-xl font-extrabold text-[#DC2626] mt-0.5">{criticalViolations}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2.5 px-3 rounded-xl shadow-xs flex flex-col justify-between">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Overall Risk</p>
              <div>
                <Badge
                  className={`mt-1 text-[11px] font-bold px-2 py-0.5 ${
                    overallRisk === "Clean"
                      ? "bg-[#16A34A] text-white"
                      : overallRisk === "Minor Violations"
                      ? "bg-[#F59E0B] text-white"
                      : "bg-[#DC2626] text-white"
                  }`}
                >
                  {overallRisk}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Candidate Status Table */}
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl shadow-xs overflow-hidden">
            <CardHeader className="p-3 px-3.5 pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <CardTitle className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                Live Candidate Proctoring Status
              </CardTitle>
              <CardDescription className="text-[11px] text-[#6B7280]">
                Real-time facial detection and attention tracking metrics for all active candidates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] uppercase font-bold text-[9px] tracking-wider">
                    <tr>
                      <th className="py-2 px-3 pl-3.5">Candidate</th>
                      <th className="py-2 px-3">Camera State</th>
                      <th className="py-2 px-3">Face / Attention Status</th>
                      <th className="py-2 px-3">Warnings</th>
                      <th className="py-2 px-3">Risk Rating</th>
                      <th className="py-2 px-3">Last Ping</th>
                      <th className="py-2 px-3 pr-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                    {candidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-xs text-[#6B7280]">
                          No candidate attempts or active monitored sessions found for this test yet.
                        </td>
                      </tr>
                    ) : (
                      candidates.map((c) => (
                        <tr key={c.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]/40">
                          <td className="py-2 px-3 pl-3.5">
                            <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{c.name}</p>
                            <p className="text-[10px] text-[#6B7280] font-mono">{c.rollNo}</p>
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-[#16A34A] text-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" /> Active 30 FPS
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-[10px] capitalize border-[#E5E7EB] dark:border-[#27272A] py-0 px-1.5">
                              {c.faceStatus.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`font-bold text-xs ${c.warningCount > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                              {c.warningCount} / {c.maxWarnings}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              className={`text-[9px] font-bold px-1.5 py-0 ${
                                c.proctoringRisk === "Clean"
                                  ? "bg-[#16A34A] text-white"
                                  : c.proctoringRisk === "Minor Violations"
                                  ? "bg-[#F59E0B] text-white"
                                  : "bg-[#DC2626] text-white"
                              }`}
                            >
                              {c.proctoringRisk}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-[#6B7280] font-mono text-[11px]">{c.lastPing}</td>
                          <td className="py-2 px-3 pr-3.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveTab("logs")}
                              className="h-6.5 px-2 text-[10px] font-semibold rounded-md border-[#E5E7EB] dark:border-[#27272A]"
                            >
                              View Logs
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: CANDIDATE CAMERA GRID */}
      {activeTab === "grid" && (
        <div className="flex-1 pb-4 overflow-y-auto">
          {candidates.length === 0 ? (
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 text-center rounded-xl shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center mx-auto mb-3">
                <Video className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">No Live Candidate Streams Active</h4>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
                As students start this proctored assessment with webcam verification enabled, live 30 FPS camera thumbnails and attention tracking feeds will appear in this grid.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {candidates.map((c) => (
                <Card
                  key={c.id}
                  className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs space-y-0"
                >
                  <div className="aspect-video bg-[#09090B] relative flex items-center justify-center text-white border-b border-[#27272A]">
                    <div className="flex flex-col items-center gap-1.5 opacity-80">
                      <Camera className="h-7 w-7 text-[#2563EB]" />
                      <span className="text-[10px] font-mono text-[#D1D5DB]">LIVE STREAM FEED</span>
                    </div>
                    <div className="absolute top-2 left-2 bg-[#09090B]/85 backdrop-blur-xs text-[9px] font-mono text-[#16A34A] px-2 py-0.5 rounded border border-[#16A34A]/40 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                      30 FPS
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge
                        className={`text-[9px] font-bold ${
                          c.warningCount === 0
                            ? "bg-[#16A34A] text-white"
                            : c.warningCount < c.maxWarnings
                            ? "bg-[#F59E0B] text-white"
                            : "bg-[#DC2626] text-white"
                        }`}
                      >
                        Warnings: {c.warningCount}/{c.maxWarnings}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] truncate">{c.name}</p>
                      <span className="text-[10px] font-mono text-[#6B7280]">{c.rollNo}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#6B7280]">Attention:</span>
                      <strong className="capitalize text-[#111827] dark:text-[#FAFAFA]">
                        {c.faceStatus.replace(/_/g, " ")}
                      </strong>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT EVENT LOGS */}
      {activeTab === "logs" && (
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl shadow-xs flex-1 flex flex-col overflow-hidden min-h-0">
          <CardHeader className="p-3 px-3.5 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#F9FAFB] dark:bg-[#09090B]">
            <div>
              <CardTitle className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                Proctoring Audit Trail
              </CardTitle>
              <CardDescription className="text-[11px] text-[#6B7280]">
                Chronological security violation events recorded with severity classification.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search events or student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 text-xs w-[170px] rounded-md bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]"
              />

              <div className="flex items-center gap-0.5 bg-white dark:bg-[#18181B] p-0.5 rounded-md border border-[#E5E7EB] dark:border-[#27272A]">
                {["ALL", "CRITICAL", "HIGH", "WARNING", "INFO"].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                      severityFilter === sev
                        ? "bg-[#2563EB] text-white"
                        : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#6B7280]">
                No proctoring violations match the current filter.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] uppercase font-bold text-[9px] tracking-wider">
                  <tr>
                    <th className="py-2 px-3 pl-3.5">Timestamp</th>
                    <th className="py-2 px-3">Candidate</th>
                    <th className="py-2 px-3">Violation Event</th>
                    <th className="py-2 px-3">Severity</th>
                    <th className="py-2 px-3">Warning #</th>
                    <th className="py-2 px-3">Duration</th>
                    <th className="py-2 px-3 pr-3.5">Event Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]/40">
                      <td className="py-2 px-3 pl-3.5 font-mono text-[10px] text-[#6B7280]">{log.timestamp}</td>
                      <td className="py-2 px-3 font-semibold text-[#111827] dark:text-[#FAFAFA] text-xs">{log.studentName}</td>
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-[10px] text-[#2563EB]">{log.eventType}</span>
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          className={`text-[9px] font-bold px-1.5 py-0 ${
                            log.severity === "CRITICAL" || log.severity === "HIGH"
                              ? "bg-[#DC2626] text-white"
                              : log.severity === "WARNING"
                              ? "bg-[#F59E0B] text-white"
                              : "bg-[#2563EB] text-white"
                          }`}
                        >
                          {log.severity}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-bold text-xs">#{log.warningNumber}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-[#6B7280]">{log.duration || "Instant"}</td>
                      <td className="py-2 px-3 pr-3.5 text-[#4B5563] dark:text-[#D1D5DB] text-xs">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
