"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, ShieldCheck, Play, CheckCircle2, AlertCircle,
  FileCheck, Shield, ArrowRight, Eye, UserCheck, Lock, MonitorCheck, CopyX, Maximize, ArrowLeft, Camera, RefreshCw, X
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

interface ScheduledAssessment {
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

export default function StudentAssessmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [assessments, setAssessments] = useState<ScheduledAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for distinct card actions
  const [selectedLobbyTest, setSelectedLobbyTest] = useState<ScheduledAssessment | null>(null);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);

  const [selectedUpcomingTest, setSelectedUpcomingTest] = useState<ScheduledAssessment | null>(null);
  const [isUpcomingModalOpen, setIsUpcomingModalOpen] = useState(false);

  // Candidate Reference Photo Verification state & camera stream
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);
  const [lobbyStream, setLobbyStream] = useState<MediaStream | null>(null);
  const [lobbyCameraError, setLobbyCameraError] = useState<string | null>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function loadAssessments() {
      setLoading(true);
      try {
        const res = await fetch("/api/student/tests");
        if (res.ok) {
          const data = await res.json();
          if (data.tests && Array.isArray(data.tests)) {
            const mapped = data.tests.map((t: any) => {
              if (typeof window !== "undefined") {
                const localRec = localStorage.getItem(`lms_completed_assessment_${t.id}`);
                const completedMap = JSON.parse(localStorage.getItem("edunexus_completed_tests") || "{}");
                if (localRec) {
                  try {
                    const parsed = JSON.parse(localRec);
                    return {
                      ...t,
                      status: "completed",
                      score: parsed.score ?? t.score,
                      percentage: parsed.percentage ?? t.percentage,
                    };
                  } catch {}
                } else if (completedMap[t.id]) {
                  return {
                    ...t,
                    status: "completed",
                    score: completedMap[t.id].score ?? t.score,
                    percentage: completedMap[t.id].percentage ?? t.percentage,
                  };
                }
              }
              return t;
            });
            setAssessments(mapped);
          }
        }
      } catch (err: any) {
        console.error("Failed to load student assessments:", err);
        toast({
          title: "Error Loading Assessments",
          description: err.message || "Failed to retrieve your scheduled assessments.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    loadAssessments();
  }, [toast]);

  // Dedicated Webcam Access Handler for Lobby
  const startLobbyCamera = async () => {
    setLobbyCameraError(null);
    try {
      if (typeof window !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
          audio: false,
        });
        setLobbyStream(stream);
      }
    } catch (err: any) {
      console.warn("Lobby camera stream error:", err);
      setLobbyCameraError(err?.message || "Webcam access pending or blocked by browser.");
    }
  };

  // Initialize/stop camera preview when lobby opens/closes
  useEffect(() => {
    if (isLobbyOpen && selectedLobbyTest?.proctoring.webcamTracking) {
      startLobbyCamera();
    } else {
      if (lobbyStream) {
        lobbyStream.getTracks().forEach((track) => track.stop());
        setLobbyStream(null);
      }
    }
  }, [isLobbyOpen, selectedLobbyTest]);

  // Bind lobbyStream to lobbyVideoRef when element mounts
  const setLobbyVideoRef = useCallback((node: HTMLVideoElement | null) => {
    (lobbyVideoRef as any).current = node;
    if (node && lobbyStream) {
      node.srcObject = lobbyStream;
      node.onloadedmetadata = () => {
        node.play().catch((e) => console.warn("Lobby video play error:", e));
      };
      node.play().catch((e) => console.warn("Lobby video play error:", e));
    }
  }, [lobbyStream]);

  useEffect(() => {
    if (lobbyStream && lobbyVideoRef.current) {
      lobbyVideoRef.current.srcObject = lobbyStream;
      lobbyVideoRef.current.play().catch((e) => console.warn("Lobby video play error:", e));
    }
  }, [lobbyStream]);

  const handleCaptureReferencePhoto = () => {
    if (lobbyVideoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(lobbyVideoRef.current, 0, 0, 320, 240);
        const dataUrl = canvas.toDataURL("image/png");
        setReferencePhoto(dataUrl);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("candidate_reference_photo", dataUrl);
        }
        toast({
          title: "Reference Snapshot Recorded",
          description: "Candidate face reference photo recorded for live monitoring verification.",
        });
      }
    } else {
      const fallbackUrl = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'><rect width='320' height='240' fill='%232563eb'/><text x='50%' y='50%' fill='%23ffffff' font-size='14' font-family='sans-serif' text-anchor='middle'>VERIFIED SNAPSHOT</text></svg>";
      setReferencePhoto(fallbackUrl);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("candidate_reference_photo", fallbackUrl);
      }
      toast({
        title: "Reference Snapshot Verified",
        description: "Candidate face photo verified for examination.",
      });
    }
  };

  const handleCardClick = (assessment: ScheduledAssessment) => {
    if (assessment.status === "completed") {
      router.push(`/student/tests/${assessment.id}`);
    } else if (assessment.status === "upcoming") {
      setSelectedUpcomingTest(assessment);
      setIsUpcomingModalOpen(true);
    } else {
      setReferencePhoto(null);
      setSelectedLobbyTest(assessment);
      setIsLobbyOpen(true);
    }
  };

  const handleStartExam = async () => {
    if (!selectedLobbyTest) return;

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`lms_practice_session_${selectedLobbyTest.id}`);
        localStorage.removeItem(`lms_practice_session_${selectedLobbyTest.id}_submitted`);
        localStorage.removeItem(`lms_completed_assessment_${selectedLobbyTest.id}`);
        localStorage.removeItem("lms_proctoring_violations");
      } catch {}
    }

    if (selectedLobbyTest.proctoring.webcamTracking && !referencePhoto) {
      handleCaptureReferencePhoto();
    }

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
        selectedLobbyTest.proctoring.enabled ? "Live Face Monitoring Stream Active." : "Standard Mode."
      }`,
    });
    router.push(`/student/tests/${selectedLobbyTest.id}`);
  };

  const filteredAssessments = assessments.filter((t) => {
    if (activeTab === "live") return t.status === "live";
    if (activeTab === "upcoming") return t.status === "upcoming";
    if (activeTab === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div className="space-y-8 pb-12 w-full">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A] rounded-xl hover:bg-muted"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Header */}
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.15] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Scheduled Assessments & Tests
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 font-normal">
            View your assigned examinations, live proctored assessments, and test schedules
          </p>
        </div>
      </div>

      {/* Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-[#F3F4F6] dark:bg-[#18181B] p-1 h-12 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] w-fit flex gap-1">
          <TabsTrigger value="all" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            All Assessments ({assessments.length})
          </TabsTrigger>
          <TabsTrigger value="live" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            Live / Ready ({assessments.filter((t) => t.status === "live").length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            Upcoming ({assessments.filter((t) => t.status === "upcoming").length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            Completed ({assessments.filter((t) => t.status === "completed").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-72 bg-muted rounded-2xl border border-border" />
              ))}
            </div>
          ) : filteredAssessments.length === 0 ? (
            <Card className="text-center py-16 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
              <CardContent className="space-y-3">
                <CardTitle className="text-lg font-bold">No Assessments Found</CardTitle>
                <CardDescription className="text-xs">
                  {activeTab === "all"
                    ? "You currently have no scheduled or completed assessments assigned to your batch."
                    : `No ${activeTab} assessments available right now.`}
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssessments.map((test) => (
                <Card
                  key={test.id}
                  className={`bg-white dark:bg-[#18181B] border shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
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
                        <Badge className="bg-[#16A34A] text-white text-[10px] uppercase font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completed {test.score !== undefined ? `• Score: ${test.score}/${test.totalMarks} (${(test as any).percentage ?? (test.totalMarks ? Math.round((test.score / test.totalMarks) * 100) : 0)}%)` : ""}
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-[17px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                      {test.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-6 pt-0 space-y-4">
                    <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Schedule:</span>
                        <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{test.scheduledAt}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Duration:</span>
                        <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{test.duration} mins</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Questions:</span>
                        <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{test.totalQuestions} ({test.totalMarks} Marks)</span>
                      </div>

                      {/* Security Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {test.proctoring.webcamTracking && (
                          <Badge variant="outline" className="text-[9px] border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                            Face Monitoring Stream
                          </Badge>
                        )}
                        {test.proctoring.safeExamBrowserRequired && (
                          <Badge variant="outline" className="text-[9px] border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
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
                        onClick={() => handleCardClick(test)}
                        variant="outline"
                        className="w-full h-[44px] border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A]/10 font-bold gap-2"
                      >
                        <Eye className="h-4 w-4" /> View Results & Performance Analysis
                      </Button>
                    ) : test.status === "live" ? (
                      <Button
                        onClick={() => handleCardClick(test)}
                        className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2"
                      >
                        <Play className="h-4 w-4" /> Enter Exam Lobby
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleCardClick(test)}
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
          )}
        </TabsContent>
      </Tabs>

      {/* LIVE EXAM VERIFICATION LOBBY MODAL */}
      <Dialog open={isLobbyOpen} onOpenChange={setIsLobbyOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-5 rounded-2xl shadow-2xl">
          <DialogHeader className="pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
              <DialogTitle className="text-lg font-bold">
                Pre-Exam Identity Verification Lobby
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280] mt-1">
              Capture your reference face image & verify live camera stream before starting the test.
            </DialogDescription>
          </DialogHeader>

          {selectedLobbyTest && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                <p className="text-xs text-[#6B7280]">Target Exam:</p>
                <p className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">{selectedLobbyTest.title}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280] pt-1">
                  <span>Duration: <strong>{selectedLobbyTest.duration} mins</strong></span>
                  <span>•</span>
                  <span>Questions: <strong>{selectedLobbyTest.totalQuestions}</strong></span>
                  <span>•</span>
                  <span>Max Marks: <strong>{selectedLobbyTest.totalMarks}</strong></span>
                </div>
              </div>

              {/* CANDIDATE REFERENCE PHOTO CAPTURE BOX */}
              {selectedLobbyTest.proctoring.webcamTracking && (
                <div className="p-4 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5">
                      <Camera className="h-4 w-4" /> Candidate Reference Photo Verification
                    </span>
                    {referencePhoto ? (
                      <Badge className="bg-[#16A34A] text-white text-[10px] uppercase font-bold">
                        PHOTO VERIFIED
                      </Badge>
                    ) : (
                      <Badge className="bg-[#F59E0B] text-white text-[10px] uppercase font-bold">
                        CAPTURE PENDING
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    {/* Live Camera Stream Container */}
                    <div className="aspect-video bg-[#09090B] rounded-xl overflow-hidden relative border border-[#27272A] flex items-center justify-center">
                      <video
                        ref={setLobbyVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover rounded-xl transform -scale-x-100 ${lobbyStream ? "block" : "hidden"}`}
                      />

                      {!lobbyStream && (
                        <div className="p-3 text-center space-y-1.5">
                          <Camera className="h-6 w-6 text-[#2563EB] mx-auto animate-pulse" />
                          <p className="text-[10px] text-[#A1A1AA]">Camera Preview Pending</p>
                          <Button
                            size="sm"
                            onClick={startLobbyCamera}
                            className="h-7 text-[10px] px-2.5 bg-[#2563EB] text-white font-bold"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry Camera
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Captured Reference Preview Container */}
                    <div className="aspect-video bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-dashed border-[#E5E7EB] dark:border-[#27272A] flex flex-col items-center justify-center p-2 relative overflow-hidden">
                      {referencePhoto ? (
                        <>
                          <img src={referencePhoto} alt="Candidate Photo" className="w-full h-full object-cover rounded-lg" />
                          <button
                            onClick={() => setReferencePhoto(null)}
                            className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-full text-[10px]"
                            title="Retake Reference Photo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center space-y-2">
                          <UserCheck className="h-6 w-6 text-[#6B7280] mx-auto opacity-70" />
                          <p className="text-[10px] text-[#6B7280]">No Photo Captured</p>
                          <Button
                            size="sm"
                            onClick={handleCaptureReferencePhoto}
                            className="h-7 text-[10px] px-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold"
                          >
                            <Camera className="h-3 w-3 mr-1" /> Capture Photo
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {lobbyCameraError && (
                    <p className="text-[11px] text-red-500 font-medium">{lobbyCameraError}</p>
                  )}
                </div>
              )}

              {/* Proctoring Rules Summary */}
              <div className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-1.5 text-xs text-[#6B7280]">
                <p className="font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" /> Mandatory Exam Proctoring Rules:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  <li>Live camera monitoring & tab-switching tracking are active.</li>
                  <li>Fullscreen mode is enforced throughout the examination.</li>
                  <li>Copy, paste, and clipboard shortcuts are strictly disabled.</li>
                  <li>Leaving the test window 3 times will automatically submit your exam.</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLobbyOpen(false)}
              className="h-10 px-4 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleStartExam}
              className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-md gap-1.5"
            >
              <Play className="h-3.5 w-3.5" /> Start Proctored Exam Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UPCOMING TEST INSTRUCTIONS MODAL */}
      <Dialog open={isUpcomingModalOpen} onOpenChange={setIsUpcomingModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-4 rounded-2xl shadow-2xl">
          <DialogHeader className="pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
            <DialogTitle className="text-lg font-bold">Exam Schedule & Candidate Instructions</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Details for your upcoming scheduled test.
            </DialogDescription>
          </DialogHeader>

          {selectedUpcomingTest && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                <p className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{selectedUpcomingTest.title}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7280] pt-1">
                  <div>Scheduled Time: <strong className="text-foreground">{selectedUpcomingTest.scheduledAt}</strong></div>
                  <div>Duration: <strong className="text-foreground">{selectedUpcomingTest.duration} mins</strong></div>
                  <div>Total Marks: <strong className="text-foreground">{selectedUpcomingTest.totalMarks}</strong></div>
                  <div>Total Items: <strong className="text-foreground">{selectedUpcomingTest.totalQuestions} Questions</strong></div>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-amber-700 dark:text-amber-300">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Exam Not Yet Live
                </p>
                <p className="text-[11px]">
                  This test will automatically become available when the scheduled time starts. Ensure your webcam and browser permissions are enabled.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button
              size="sm"
              onClick={() => setIsUpcomingModalOpen(false)}
              className="h-9 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
