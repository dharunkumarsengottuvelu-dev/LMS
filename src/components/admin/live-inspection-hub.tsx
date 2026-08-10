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

export function LiveInspectionHub({ examId }: { examId: string }) {
  const [activeTab, setActiveTab] = useState("grid");

  const mockStudents: any[] = [];
  const recentLogs: any[] = [];

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin/tests">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white dark:bg-[#18181B]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                Live Proctored Session
              </h1>
              <Badge className="bg-[#16A34A] text-white gap-1.5 px-2.5 py-0.5 animate-pulse">
                <div className="h-2 w-2 rounded-full bg-white"></div> LIVE
              </Badge>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">Exam ID: {examId} • Enterprise AI Proctoring Active</p>
          </div>
        </div>

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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Left Side: Feeds */}
        <div className="lg:col-span-3 flex flex-col overflow-hidden space-y-4">
          {mockStudents.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
              {mockStudents.map(student => (
                <div key={student.id} className="relative group rounded-2xl overflow-hidden border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-sm flex flex-col">
                  <div className="relative aspect-video bg-[#F3F4F6] dark:bg-[#09090B] flex items-center justify-center overflow-hidden">
                    {student.status === "Offline" ? (
                      <Video className="h-10 w-10 text-[#9CA3AF] opacity-50" />
                    ) : student.status === "Suspicious" ? (
                      <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center border-2 border-red-500 box-border">
                        <AlertTriangle className="h-12 w-12 text-red-500 opacity-80" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-[#E5E7EB] dark:bg-[#27272A] flex items-center justify-center">
                        <Users className="h-12 w-12 text-[#9CA3AF] dark:text-[#52525B]" />
                      </div>
                    )}
                    
                    {/* Status Overlay */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {student.warnings > 0 && (
                        <Badge variant="destructive" className="text-[10px] font-bold px-2 shadow-sm backdrop-blur-md">
                          {student.warnings} Warnings
                        </Badge>
                      )}
                    </div>
                    
                    {/* Bottom Action Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-2">
                      <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border-none">
                        <VolumeX className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border-none">
                        <Maximize className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{student.name}</h4>
                      <span className={`h-2 w-2 rounded-full ${student.status === 'Active' ? 'bg-[#16A34A]' : student.status === 'Offline' ? 'bg-[#6B7280]' : student.status === 'Warning' ? 'bg-[#EAB308]' : 'bg-[#EF4444]'}`}></span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                        <span>Camera:</span>
                        <span className={`font-medium ${student.camera !== 'Live' ? 'text-[#EF4444]' : 'text-[#16A34A]'}`}>{student.camera}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                        <span>Screen:</span>
                        <span className={`font-medium ${student.screen !== 'Live' ? 'text-[#EAB308]' : 'text-[#16A34A]'}`}>{student.screen}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
              <Video className="h-12 w-12 text-[#9CA3AF] dark:text-[#52525B] mb-4" />
              <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">No active participants</h3>
              <p className="text-xs text-[#6B7280] mt-1 text-center max-w-sm">Students will appear here once they begin the examination and start broadcasting.</p>
            </div>
          )}
        </div>

        {/* Right Side: Log Stream */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]">
            <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#2563EB]" /> Real-Time Event Log
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {recentLogs.length > 0 ? recentLogs.map((log, i) => (
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
            )) : (
              <div className="h-full flex flex-col items-center justify-center">
                <Activity className="h-8 w-8 text-[#9CA3AF] dark:text-[#52525B] mb-3 opacity-50" />
                <p className="text-xs text-[#6B7280]">No events recorded yet.</p>
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
