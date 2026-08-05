"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Clock, ArrowRight, CheckCircle2, AlertCircle, Search, Filter, Code2, Layers,
  ShieldCheck, MonitorCheck, Maximize, CopyX, Play, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface PracticeModule {
  id: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
  duration_minutes: number;
  total_marks: number;
  question_count: number;
  passing_marks: number;
  my_status: "not_started" | "in_progress" | "completed";
  score?: number;
  assignedBy: "Admin" | "Trainer";
  assignedByName: string;
  category: string;
  proctoring: {
    enabled: boolean;
    webcamTracking: boolean;
    tabSwitchLock: boolean;
    fullscreenLock: boolean;
    safeExamBrowserRequired: boolean;
    copyPasteRestricted: boolean;
  };
}

const mockPracticeModules: PracticeModule[] = [
  {
    id: "p1",
    title: "React 19 & Next.js App Router Evaluation",
    type: "mcq",
    duration_minutes: 30,
    total_marks: 100,
    question_count: 10,
    passing_marks: 70,
    my_status: "not_started",
    assignedBy: "Admin",
    assignedByName: "Dharunkumar S",
    category: "Frontend Development",
    proctoring: {
      enabled: true,
      webcamTracking: true,
      tabSwitchLock: true,
      fullscreenLock: true,
      safeExamBrowserRequired: true,
      copyPasteRestricted: true,
    },
  },
  {
    id: "p2",
    title: "Data Structures & Algorithms - Arrays & Strings",
    type: "coding",
    duration_minutes: 45,
    total_marks: 150,
    question_count: 3,
    passing_marks: 100,
    my_status: "in_progress",
    assignedBy: "Trainer",
    assignedByName: "Dr. Arunkumar (Lead Technical Trainer)",
    category: "Algorithms",
    proctoring: {
      enabled: true,
      webcamTracking: true,
      tabSwitchLock: true,
      fullscreenLock: true,
      safeExamBrowserRequired: false,
      copyPasteRestricted: true,
    },
  },
  {
    id: "p3",
    title: "Fullstack Architecture & System Design",
    type: "mixed",
    duration_minutes: 60,
    total_marks: 200,
    question_count: 12,
    passing_marks: 140,
    my_status: "completed",
    score: 180,
    assignedBy: "Admin",
    assignedByName: "System Admin",
    category: "Fullstack Engineering",
    proctoring: {
      enabled: false,
      webcamTracking: false,
      tabSwitchLock: false,
      fullscreenLock: false,
      safeExamBrowserRequired: false,
      copyPasteRestricted: false,
    },
  },
];

export default function StudentPracticePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "mcq" | "coding" | "mixed">("all");
  const [selectedLobbyModule, setSelectedLobbyModule] = useState<PracticeModule | null>(null);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);

  const handleOpenLobby = (module: PracticeModule) => {
    setSelectedLobbyModule(module);
    setIsLobbyOpen(true);
  };

  const handleStartPractice = async () => {
    if (!selectedLobbyModule) return;
    setIsLobbyOpen(false);

    // Trigger Fullscreen directly on user click gesture
    if (selectedLobbyModule.proctoring.fullscreenLock) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen error:", err);
      }
    }

    toast({
      title: "Starting Practice Environment",
      description: `Launching ${selectedLobbyModule.title}... ${
        selectedLobbyModule.proctoring.enabled ? "Security & Proctoring Active." : "Standard Practice Mode."
      }`,
    });
    router.push(`/student/assessments/${selectedLobbyModule.id}`);
  };

  const filteredModules = mockPracticeModules.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || p.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 pb-12 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-bold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Practice Modules Hub
          </h1>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4B5563]" />
          <Input
            placeholder="Search practice modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-[44px] text-xs bg-white dark:bg-[#18181B]"
          />
        </div>
      </div>

      {/* Format Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-[#27272A] pb-3 overflow-x-auto">
        <Button
          variant={filterType === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("all")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterType === "all" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          All Practice Modules
        </Button>
        <Button
          variant={filterType === "mcq" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("mcq")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterType === "mcq" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          MCQ Format
        </Button>
        <Button
          variant={filterType === "coding" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("coding")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterType === "coding" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          Coding Format
        </Button>
        <Button
          variant={filterType === "mixed" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("mixed")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterType === "mixed" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          Mixed (MCQ + Coding)
        </Button>
      </div>

      {/* Practice Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {filteredModules.map((module) => (
          <Card key={module.id} className="flex flex-col justify-between hover:border-[#2563EB]/50 transition-all duration-200 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-6 pb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                {/* Format Badges */}
                {module.type === "mcq" && (
                  <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-xs font-semibold px-2.5 py-0.5">
                    <ClipboardList className="h-3 w-3 mr-1 inline" /> MCQ Format
                  </Badge>
                )}
                {module.type === "coding" && (
                  <Badge className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20 text-xs font-semibold px-2.5 py-0.5">
                    <Code2 className="h-3 w-3 mr-1 inline" /> Coding Format
                  </Badge>
                )}
                {module.type === "mixed" && (
                  <Badge className="bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/20 text-xs font-semibold px-2.5 py-0.5">
                    <Layers className="h-3 w-3 mr-1 inline" /> Mixed (MCQ + Coding)
                  </Badge>
                )}

                <span className="text-[11px] font-bold text-[#2563EB]">
                  {module.assignedBy}: {module.assignedByName}
                </span>
              </div>

              <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                {module.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-4">
              <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280]">Duration:</span>
                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{module.duration_minutes} Mins</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280]">Questions:</span>
                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{module.question_count} Items</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280]">Total Marks:</span>
                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{module.total_marks} Marks</span>
                </div>

                {/* Security Config Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#E5E7EB] dark:border-[#27272A]">
                  {module.proctoring.safeExamBrowserRequired && (
                    <Badge variant="outline" className="text-[9px] border-[#9333EA]/30 text-[#9333EA] bg-[#9333EA]/5">
                      SEB Required
                    </Badge>
                  )}
                  {module.proctoring.fullscreenLock && (
                    <Badge variant="outline" className="text-[9px] border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                      Fullscreen Lock
                    </Badge>
                  )}
                  {module.proctoring.copyPasteRestricted && (
                    <Badge variant="outline" className="text-[9px] border-[#DC2626]/30 text-[#DC2626] bg-[#DC2626]/5">
                      Copy-Paste Disabled
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0">
              {module.my_status === "completed" ? (
                <Button variant="secondary" className="w-full h-[44px] font-bold gap-2" onClick={() => router.push(`/student/assessments/${module.id}`)}>
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Score: {module.score}/{module.total_marks} (Passed)
                </Button>
              ) : (
                <Button className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2" onClick={() => handleOpenLobby(module)}>
                  <Play className="h-4 w-4" /> {module.my_status === "in_progress" ? "Resume Practice" : "Start Practice"}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* PRACTICE LOBBY MODAL */}
      <Dialog open={isLobbyOpen} onOpenChange={setIsLobbyOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#2563EB]" />
              <DialogTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                Practice Lobby & Instructor Security Controls
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280] pt-1">
              Configured by {selectedLobbyModule?.assignedBy} ({selectedLobbyModule?.assignedByName})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
              <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{selectedLobbyModule?.title}</p>
              <div className="flex justify-between text-[#6B7280]">
                <span>Duration: <strong className="text-[#111827] dark:text-[#FAFAFA]">{selectedLobbyModule?.duration_minutes} mins</strong></span>
                <span>Questions: <strong className="text-[#111827] dark:text-[#FAFAFA]">{selectedLobbyModule?.question_count}</strong></span>
                <span>Total Marks: <strong className="text-[#111827] dark:text-[#FAFAFA]">{selectedLobbyModule?.total_marks}</strong></span>
              </div>
            </div>

            {/* Configured Proctoring & Security Options Box */}
            <div className="p-4 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl space-y-2">
              <p className="font-bold text-[#2563EB] uppercase text-[11px]">
                {selectedLobbyModule?.proctoring.enabled ? "🔒 Practice Security Controls (Enabled by Instructor)" : "ℹ️ Standard Practice Rules"}
              </p>
              {selectedLobbyModule?.proctoring.enabled ? (
                <ul className="list-disc list-inside space-y-1.5 text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                  {selectedLobbyModule.proctoring.safeExamBrowserRequired && (
                    <li className="font-semibold text-[#9333EA]">Safe Exam Browser (SEB) Environment: <strong>Required & Enforced</strong></li>
                  )}
                  {selectedLobbyModule.proctoring.fullscreenLock && (
                    <li>Mandatory Fullscreen Mode: <strong>Enforced</strong></li>
                  )}
                  {selectedLobbyModule.proctoring.copyPasteRestricted && (
                    <li>Copy / Paste & Clipboard Restrictions: <strong>Blocked</strong></li>
                  )}
                  {selectedLobbyModule.proctoring.webcamTracking && <li>Webcam AI Face & Eye Tracking: <strong>Active</strong></li>}
                </ul>
              ) : (
                <p className="text-[#4B5563] dark:text-[#D1D5DB]">
                  This practice module was configured for standard self-learning. Security restrictions are disabled.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button variant="outline" className="h-[44px] px-5 text-xs font-semibold" onClick={() => setIsLobbyOpen(false)}>
              Cancel
            </Button>
            <Button className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2" onClick={handleStartPractice}>
              Start Practice Now <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
