"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Users, ShieldAlert, Video, EyeOff, LayoutDashboard,
  AlertTriangle, Activity, VolumeX, Maximize, CheckCircle2, XCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layouts/page-header";

export function LiveInspectionHub({ examId }: { examId: string }) {
  const [activeTab, setActiveTab] = useState("grid");

  const mockStudents: any[] = [];

  const recentLogs: any[] = [];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            Live Proctored Session
            <Badge className="bg-[#16A34A] text-white gap-1.5 px-2.5 py-0.5 animate-pulse text-xs">
              <div className="h-2 w-2 rounded-full bg-white"></div> LIVE
            </Badge>
          </div>
        }
        description={`Exam ID: ${examId} • Enterprise AI Proctoring Active`}
        backAction={{ href: "/admin/tests", label: "Back" }}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl p-1">
              <Button 
                onClick={() => setActiveTab("grid")}
                variant={activeTab === "grid" ? "default" : "ghost"} 
                className={`h-8 text-xs font-bold rounded-lg px-3 ${activeTab === "grid" ? "bg-[#111827] dark:bg-white text-white dark:text-[#111827]" : "text-[#6B7280]"}`}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" /> Camera Grid
              </Button>
              <Button 
                onClick={() => setActiveTab("logs")}
                variant={activeTab === "logs" ? "default" : "ghost"} 
                className={`h-8 text-xs font-bold rounded-lg px-3 ${activeTab === "logs" ? "bg-[#111827] dark:bg-white text-white dark:text-[#111827]" : "text-[#6B7280]"}`}
              >
                <Activity className="h-4 w-4 mr-2" /> Live Event Logs
              </Button>
            </div>
            <Button variant="destructive" className="h-10 text-xs font-bold rounded-xl gap-2 shadow-sm">
              <ShieldAlert className="h-4 w-4" /> Halt Exam
            </Button>
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Left Side: Feeds */}
        <div className="lg:col-span-3 flex flex-col overflow-hidden space-y-4">
          <div className="grid grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
            <div className="col-span-3 text-center py-20">
              <Video className="h-12 w-12 text-[#9CA3AF] mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">No Live Streams</h3>
              <p className="text-xs text-[#6B7280] mt-1">No students are currently active in this examination.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Log Stream */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]">
            <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#2563EB]" /> Real-Time Event Log
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    {log.type === 'critical' ? (
                      <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      </div>
                    ) : log.type === 'warning' ? (
                      <div className="h-6 w-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{log.student}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{log.event}</p>
                    <p className="text-[9px] font-mono text-[#9CA3AF] mt-1">{log.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-[#6B7280]">
                No recent logs available.
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]">
            <Button variant="outline" className="w-full h-8 text-[10px] font-bold">Export Logs</Button>
          </div>
        </div>

      </div>
    </div>
  );
}
