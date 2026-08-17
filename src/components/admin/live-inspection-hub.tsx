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

  // Monitored Candidates & Logs (loaded from active session / mock data)
  const [candidates, setCandidates] = useState<MonitoredCandidate[]>([
    {
      id: "std_01",
      name: "Kaaviya Dharun",
      rollNo: "CS2026-081",
      status: "active",
      faceStatus: "centered",
      warningCount: 0,
      maxWarnings: 3,
      proctoringRisk: "Clean",
      lastPing: "Just now",
    },
    {
      id: "std_02",
      name: "Alex Rivera",
      rollNo: "IT2026-104",
      status: "warning",
      faceStatus: "looking_away",
      warningCount: 1,
      maxWarnings: 3,
      proctoringRisk: "Minor Violations",
      lastPing: "2s ago",
    },
    {
      id: "std_03",
      name: "Sophia Chen",
      rollNo: "CS2026-042",
      status: "high_risk",
      faceStatus: "multiple_faces",
      warningCount: 2,
      maxWarnings: 3,
      proctoringRisk: "Suspicious",
      lastPing: "5s ago",
    },
    {
      id: "std_04",
      name: "Marcus Vance",
      rollNo: "ECE2026-019",
      status: "active",
      faceStatus: "centered",
      warningCount: 0,
      maxWarnings: 3,
      proctoringRisk: "Clean",
      lastPing: "Just now",
    },
  ]);

  const [logs, setLogs] = useState<ProctoringEventLog[]>([
    {
      id: "log_1",
      studentName: "Sophia Chen",
      studentId: "std_03",
      eventType: "MULTIPLE_FACES",
      severity: "HIGH",
      timestamp: "10:14:22 AM",
      duration: "4s",
      warningNumber: 2,
      message: "Multiple faces detected. Only the registered candidate should be visible.",
      resolved: false,
    },
    {
      id: "log_2",
      studentName: "Alex Rivera",
      studentId: "std_02",
      eventType: "LOOKING_AWAY",
      severity: "WARNING",
      timestamp: "10:12:05 AM",
      duration: "6s",
      warningNumber: 1,
      message: "Please keep your face toward the screen (prolonged look away).",
      resolved: true,
    },
    {
      id: "log_3",
      studentName: "Sophia Chen",
      studentId: "std_03",
      eventType: "FACE_POSITION_UNEVEN",
      severity: "WARNING",
      timestamp: "10:08:44 AM",
      duration: "5s",
      warningNumber: 1,
      message: "Please move back into the camera frame.",
      resolved: true,
    },
    {
      id: "log_4",
      studentName: "Marcus Vance",
      studentId: "std_04",
      eventType: "TAB_SWITCH",
      severity: "HIGH",
      timestamp: "10:02:19 AM",
      warningNumber: 1,
      message: "Tab switch detected! Leaving the exam screen violates security policy.",
      resolved: true,
    },
  ]);

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
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Live Exam Proctoring Hub</span>
            <Badge className="bg-[#16A34A] text-white gap-1.5 px-2.5 py-0.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> LIVE MONITORING
            </Badge>
          </div>
        }
        description={`Exam ID: ${examId} • Enterprise AI Facial Tracking & Integrity Engine`}
        backAction={{ href: "/admin/tests", label: "Back to Tests" }}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl p-1">
              <Button
                onClick={() => setActiveTab("summary")}
                variant={activeTab === "summary" ? "default" : "ghost"}
                className={`h-8 text-xs font-semibold rounded-lg px-3 ${
                  activeTab === "summary"
                    ? "bg-[#2563EB] text-white"
                    : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                }`}
              >
                Proctoring Summary
              </Button>
              <Button
                onClick={() => setActiveTab("grid")}
                variant={activeTab === "grid" ? "default" : "ghost"}
                className={`h-8 text-xs font-semibold rounded-lg px-3 ${
                  activeTab === "grid"
                    ? "bg-[#2563EB] text-white"
                    : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                }`}
              >
                Candidate Feeds ({candidates.length})
              </Button>
              <Button
                onClick={() => setActiveTab("logs")}
                variant={activeTab === "logs" ? "default" : "ghost"}
                className={`h-8 text-xs font-semibold rounded-lg px-3 ${
                  activeTab === "logs"
                    ? "bg-[#2563EB] text-white"
                    : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                }`}
              >
                Audit Event Logs ({logs.length})
              </Button>
            </div>
            <Button
              onClick={exportLogsCsv}
              variant="outline"
              className="h-10 text-xs font-semibold rounded-xl border-[#E5E7EB] dark:border-[#27272A]"
            >
              <Download className="h-4 w-4 mr-1.5" /> Export Audit CSV
            </Button>
          </div>
        }
      />

      {/* TAB 1: PROCTORING SUMMARY DASHBOARD */}
      {activeTab === "summary" && (
        <div className="space-y-6 overflow-y-auto">
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase">Total Warnings</p>
              <p className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA] mt-1">{totalWarnings}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase">Face Not Detected</p>
              <p className="text-2xl font-bold text-[#D97706] mt-1">{faceNotDetectedEvents}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase">Multiple Faces</p>
              <p className="text-2xl font-bold text-[#DC2626] mt-1">{multipleFaceEvents}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase">Looking Away</p>
              <p className="text-2xl font-bold text-[#2563EB] mt-1">{lookingAwayEvents}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase">Camera Disconnects</p>
              <p className="text-2xl font-bold text-[#DC2626] mt-1">{cameraDisconnectEvents}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase">Critical Violations</p>
              <p className="text-2xl font-bold text-[#DC2626] mt-1">{criticalViolations}</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase">Overall Risk</p>
              <Badge
                className={`mt-1.5 text-xs font-bold ${
                  overallRisk === "Clean"
                    ? "bg-[#16A34A] text-white"
                    : overallRisk === "Minor Violations"
                    ? "bg-[#F59E0B] text-white"
                    : "bg-[#DC2626] text-white"
                }`}
              >
                {overallRisk}
              </Badge>
            </Card>
          </div>

          {/* Candidate Status Table */}
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <CardTitle className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
                Live Candidate Proctoring Status
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Real-time facial detection and attention tracking metrics for all active candidates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3.5 pl-5">Candidate</th>
                      <th className="p-3.5">Camera State</th>
                      <th className="p-3.5">Face / Attention Status</th>
                      <th className="p-3.5">Warnings</th>
                      <th className="p-3.5">Risk Rating</th>
                      <th className="p-3.5">Last Ping</th>
                      <th className="p-3.5 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                    {candidates.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]/40">
                        <td className="p-3.5 pl-5">
                          <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">{c.name}</p>
                          <p className="text-[10px] text-[#6B7280] font-mono">{c.rollNo}</p>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#16A34A]">
                            <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" /> Active 30 FPS
                          </span>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[10px] capitalize border-[#E5E7EB] dark:border-[#27272A]">
                            {c.faceStatus.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <span className={`font-bold ${c.warningCount > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                            {c.warningCount} / {c.maxWarnings}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={`text-[10px] font-bold ${
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
                        <td className="p-3.5 text-[#6B7280] font-mono">{c.lastPing}</td>
                        <td className="p-3.5 pr-5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTab("logs")}
                            className="h-7 px-2.5 text-[11px] font-semibold rounded-lg"
                          >
                            View Logs
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: CANDIDATE CAMERA GRID */}
      {activeTab === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto flex-1 pb-6">
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

      {/* TAB 3: AUDIT EVENT LOGS */}
      {activeTab === "logs" && (
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
          <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F9FAFB] dark:bg-[#09090B]">
            <div>
              <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                Proctoring Audit Trail
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Chronological security violation events recorded with severity classification.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search events or student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-xs w-[180px] rounded-lg bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]"
              />

              <div className="flex items-center gap-1 bg-white dark:bg-[#18181B] p-0.5 rounded-lg border border-[#E5E7EB] dark:border-[#27272A]">
                {["ALL", "CRITICAL", "HIGH", "WARNING", "INFO"].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
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

          <CardContent className="p-0 flex-1 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#6B7280]">
                No proctoring violations match the current filter.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3 pl-5">Timestamp</th>
                    <th className="p-3">Candidate</th>
                    <th className="p-3">Violation Event</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Warning #</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3 pr-5">Event Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]/40">
                      <td className="p-3 pl-5 font-mono text-[11px] text-[#6B7280]">{log.timestamp}</td>
                      <td className="p-3 font-semibold text-[#111827] dark:text-[#FAFAFA]">{log.studentName}</td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-[11px] text-[#2563EB]">{log.eventType}</span>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`text-[9px] font-bold ${
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
                      <td className="p-3 font-bold">#{log.warningNumber}</td>
                      <td className="p-3 font-mono text-[#6B7280]">{log.duration || "Instant"}</td>
                      <td className="p-3 pr-5 text-[#4B5563] dark:text-[#D1D5DB]">{log.message}</td>
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
