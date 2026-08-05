"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, ShieldCheck, Play, CheckCircle2, AlertCircle,
  FileCheck, Shield, ArrowRight, Eye, UserCheck, Lock, MonitorCheck, CopyX, Maximize, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ProctoringConfig {
  enabled: boolean;
  webcamTracking: boolean;
  tabSwitchLock: boolean;
  fullscreenLock: boolean;
  safeExamBrowserRequired: boolean;
  copyPasteRestricted: boolean;
  assignedBy: "Admin" | "Trainer";
  assignedByName: string;
}

interface ScheduledTest {
  id: string;
  title: string;
  type: string;
  scheduledAt: string;
  duration: number; // in minutes
  totalQuestions: number;
  totalMarks: number;
  status: "live" | "upcoming" | "completed";
  proctoring: ProctoringConfig;
  score?: number;
  maxScore?: number;
  passed?: boolean;
}

const initialTestsData: ScheduledTest[] = [
  {
    id: "t1",
    title: "Mid-Term Proctored Evaluation — Batch 2026-A",
    type: "Proctored Examination",
    scheduledAt: "Today, Available Now",
    duration: 60,
    totalQuestions: 5,
    totalMarks: 100,
    status: "live",
    proctoring: {
      enabled: true,
      webcamTracking: true,
      tabSwitchLock: true,
      fullscreenLock: true,
      safeExamBrowserRequired: true,
      copyPasteRestricted: true,
      assignedBy: "Trainer",
      assignedByName: "Dr. Arunkumar (Lead Technical Trainer)",
    },
  },
  {
    id: "t2",
    title: "Final Technical Readiness Assessment",
    type: "Mock Interview Test",
    scheduledAt: "2026-08-25 02:00 PM",
    duration: 90,
    totalQuestions: 8,
    totalMarks: 150,
    status: "upcoming",
    proctoring: {
      enabled: true,
      webcamTracking: true,
      tabSwitchLock: true,
      fullscreenLock: false,
      safeExamBrowserRequired: false,
      copyPasteRestricted: true,
      assignedBy: "Admin",
      assignedByName: "System Admin",
    },
  },
  {
    id: "t3",
    title: "Fullstack Core Concepts Evaluation",
    type: "Cohort Progress Test",
    scheduledAt: "2026-07-28 10:00 AM",
    duration: 45,
    totalQuestions: 1,
    totalMarks: 50,
    status: "completed",
    score: 92,
    maxScore: 100,
    passed: true,
    proctoring: {
      enabled: false,
      webcamTracking: false,
      tabSwitchLock: false,
      fullscreenLock: false,
      safeExamBrowserRequired: false,
      copyPasteRestricted: false,
      assignedBy: "Admin",
      assignedByName: "Dharunkumar S",
    },
  },
];

export default function StudentTestsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("all");
  const [testsData, setTestsData] = useState<ScheduledTest[]>(initialTestsData);
  const [selectedLobbyTest, setSelectedLobbyTest] = useState<ScheduledTest | null>(null);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);

  // Sync completed test scores from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const completedMap = JSON.parse(localStorage.getItem("edunexus_completed_tests") || "{}");
        if (Object.keys(completedMap).length > 0) {
          setTestsData((prev) =>
            prev.map((t) => {
              if (completedMap[t.id]) {
                return {
                  ...t,
                  status: "completed",
                  score: completedMap[t.id].score,
                  passed: completedMap[t.id].score >= 60,
                };
              }
              return t;
            })
          );
        }
      } catch (e) {
        console.warn("Could not read completed tests from localStorage:", e);
      }
    }
  }, []);

  const handleOpenLobby = (test: ScheduledTest) => {
    if (test.status === "completed") return; // Prevent completed tests from re-opening lobby!
    setSelectedLobbyTest(test);
    setIsLobbyOpen(true);
  };

  const handleStartExam = async () => {
    if (!selectedLobbyTest) return;
    setIsLobbyOpen(false);

    if (selectedLobbyTest.proctoring.fullscreenLock) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen error:", err);
      }
    }

    toast({
      title: "Entering Exam Environment",
      description: `Starting ${selectedLobbyTest.title}... ${
        selectedLobbyTest.proctoring.enabled ? "Proctoring & Security Controls Active." : "Standard Mode."
      }`,
    });
    router.push(`/student/tests/${selectedLobbyTest.id}`);
  };

  const filteredTests = testsData.filter((t) => {
    if (activeTab === "live") return t.status === "live";
    if (activeTab === "upcoming") return t.status === "upcoming";
    if (activeTab === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 pb-12 w-full">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* 1. Header */}
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[36px] font-bold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Scheduled Tests & Proctored Exams
          </h1>
        </div>
      </div>

      {/* 2. Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-[#F3F4F6] dark:bg-[#18181B] p-1 h-12 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] w-fit flex gap-1">
          <TabsTrigger value="all" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            All Tests ({testsData.length})
          </TabsTrigger>
          <TabsTrigger value="live" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            Live / Ready ({testsData.filter((t) => t.status === "live").length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            Upcoming ({testsData.filter((t) => t.status === "upcoming").length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            Completed ({testsData.filter((t) => t.status === "completed").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => (
              <Card
                key={test.id}
                className={`bg-white dark:bg-[#18181B] border shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                  test.status === "completed" ? "border-[#16A34A]/30" : "border-[#E5E7EB] dark:border-[#27272A]"
                }`}
              >
                <CardHeader className="p-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                      {test.type}
                    </Badge>

                    {test.status === "live" && (
                      <Badge className="bg-[#DC2626] text-white text-[10px] uppercase font-bold animate-pulse">
                        Live Now
                      </Badge>
                    )}
                    {test.status === "upcoming" && (
                      <Badge className="bg-[#F59E0B] text-white text-[10px] uppercase font-bold">
                        Scheduled
                      </Badge>
                    )}
                    {test.status === "completed" && (
                      <Badge className="bg-[#16A34A] text-white text-[10px] uppercase font-bold">
                        Completed (Score: {test.score ?? 90}%)
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                    {test.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280] flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#2563EB]" /> Schedule:
                      </span>
                      <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{test.scheduledAt}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280] flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#2563EB]" /> Duration:
                      </span>
                      <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{test.duration} mins</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280] flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-[#2563EB]" /> Questions:
                      </span>
                      <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{test.totalQuestions} ({test.totalMarks} Marks)</span>
                    </div>

                    {/* Security Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {test.proctoring.safeExamBrowserRequired && (
                        <Badge variant="outline" className="text-[9px] border-[#9333EA]/30 text-[#9333EA] bg-[#9333EA]/5">
                          SEB Required
                        </Badge>
                      )}
                      {test.proctoring.fullscreenLock && (
                        <Badge variant="outline" className="text-[9px] border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                          Fullscreen Lock
                        </Badge>
                      )}
                      {test.proctoring.copyPasteRestricted && (
                        <Badge variant="outline" className="text-[9px] border-[#DC2626]/30 text-[#DC2626] bg-[#DC2626]/5">
                          Copy-Paste Disabled
                        </Badge>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between text-[11px]">
                      <span className="text-[#6B7280]">Assigned By:</span>
                      <span className="font-bold text-[#2563EB]">{test.proctoring.assignedBy}: {test.proctoring.assignedByName}</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-6 pt-0">
                  {test.status === "completed" ? (
                    <Button
                      onClick={() => router.push(`/student/tests/${test.id}`)}
                      variant="outline"
                      className="w-full h-[44px] border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A]/10 font-bold gap-2"
                    >
                      <Eye className="h-4 w-4" /> View Results & Performance Analysis
                    </Button>
                  ) : test.status === "live" ? (
                    <Button
                      onClick={() => handleOpenLobby(test)}
                      className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2"
                    >
                      <Play className="h-4 w-4" /> Enter Exam Lobby
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleOpenLobby(test)}
                      variant="outline"
                      className="w-full h-[44px] border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10 font-bold gap-2"
                    >
                      <Clock className="h-4 w-4" /> View Exam Instructions
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 3. EXAM LOBBY & PRE-EXAM VERIFICATION MODAL */}
      <Dialog open={isLobbyOpen} onOpenChange={setIsLobbyOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
              <DialogTitle className="text-lg font-bold">
                Pre-Exam Proctoring Verification Lobby
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280]">
              Review exam security policies configured by your instructor before starting.
            </DialogDescription>
          </DialogHeader>

          {selectedLobbyTest && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                <p className="text-xs text-[#6B7280]">Target Exam:</p>
                <p className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">{selectedLobbyTest.title}</p>
                <div className="flex items-center gap-4 text-xs text-[#6B7280] pt-1">
                  <span>Duration: <strong>{selectedLobbyTest.duration} mins</strong></span>
                  <span>•</span>
                  <span>Questions: <strong>{selectedLobbyTest.totalQuestions}</strong></span>
                  <span>•</span>
                  <span>Max Marks: <strong>{selectedLobbyTest.totalMarks}</strong></span>
                </div>
              </div>

              <div className="p-4 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl space-y-2">
                <p className="font-bold text-[#2563EB] uppercase text-[11px]">
                  {selectedLobbyTest?.proctoring.enabled ? "Proctoring & Security (Enabled by Instructor)" : "Standard Test Rules"}
                </p>
                {selectedLobbyTest?.proctoring.enabled ? (
                  <ul className="list-disc list-inside space-y-1.5 text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed text-xs">
                    {selectedLobbyTest.proctoring.safeExamBrowserRequired && (
                      <li className="font-semibold text-[#9333EA]">Safe Exam Browser (SEB) Environment: <strong>Required & Enforced</strong></li>
                    )}
                    {selectedLobbyTest.proctoring.fullscreenLock && (
                      <li>Mandatory Fullscreen Mode: <strong>Enforced (Auto-exit warning)</strong></li>
                    )}
                    {selectedLobbyTest.proctoring.copyPasteRestricted && (
                      <li>Copy / Paste & Clipboard Restrictions: <strong>Blocked</strong></li>
                    )}
                    <li>Live Camera & AI Proctoring Stream: <strong>Active</strong></li>
                  </ul>
                ) : (
                  <p className="text-xs text-[#4B5563]">This test is running in standard practice evaluation mode.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2"
              onClick={handleStartExam}
            >
              <Play className="h-4 w-4" /> Start Proctored Examination Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
