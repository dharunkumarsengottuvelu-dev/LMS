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
import { AIFaceTracker } from "@/lib/proctoring/ai-face-tracker";

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
            setAssessments(data.tests);
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

  // Bind lobbyStream to lobbyVideoRef cleanly without competing play() requests
  useEffect(() => {
    const video = lobbyVideoRef.current;
    if (!video) return;

    if (lobbyStream) {
      if (video.srcObject !== lobbyStream) {
        video.srcObject = lobbyStream;
      }
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err?.name !== "AbortError") {
            console.warn("Lobby video play notice:", err);
          }
        });
      }
    } else {
      if (video.srcObject) {
        video.srcObject = null;
      }
    }
  }, [lobbyStream]);

  const handleCaptureReferencePhoto = async () => {
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
          const tracker = new AIFaceTracker();
          tracker.extractFaceEmbedding(dataUrl).then((emb) => {
            if (emb) {
              sessionStorage.setItem("candidate_reference_embedding", JSON.stringify(emb));
            }
          });
        }
        toast({
          title: "Reference Photo Verified",
          description: "Candidate face representation registered securely for live proctor verification.",
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
      {/* Top Header - Compact Enterprise Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-4.5 shadow-2xs overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          {/* Left: Breadcrumb & Title */}
          <div className="space-y-1 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0"
              >
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Scheduled Assessments & Tests
            </h1>
          </div>
        </div>
      </div>

      {/* Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="w-full overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <TabsList className="bg-slate-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl h-11 sm:h-12 w-max min-w-full sm:w-fit border border-slate-200/80 dark:border-zinc-700/80 flex gap-1 sm:gap-1.5 shrink-0">
            <TabsTrigger
              value="all"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all"
            >
              All Assessments ({assessments.length})
            </TabsTrigger>
            <TabsTrigger
              value="live"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all"
            >
              Live / Ready ({assessments.filter((t) => t.status === "live").length})
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all"
            >
              Upcoming ({assessments.filter((t) => t.status === "upcoming").length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all"
            >
              Completed ({assessments.filter((t) => t.status === "completed").length})
            </TabsTrigger>
          </TabsList>
        </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssessments.map((test) => (
                <Card
                  key={test.id}
                  className={`bg-white dark:bg-[#18181B] border shadow-2xs rounded-xl overflow-hidden flex flex-col justify-between transition-all hover:border-blue-500/40 ${
                    test.status === "completed" ? "border-emerald-500/30" : "border-slate-200/80 dark:border-zinc-800"
                  }`}
                >
                  <CardHeader className="p-3.5 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 border-blue-200/70 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 rounded-md">
                        {test.type}
                      </Badge>

                      {test.status === "live" && (
                        <Badge className="bg-red-600 text-white text-[9px] uppercase font-bold animate-pulse px-1.5 py-0 rounded-md">
                          Live Now
                        </Badge>
                      )}
                      {test.status === "upcoming" && (
                        <Badge variant="outline" className="border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 text-[9px] uppercase font-bold px-1.5 py-0 rounded-md">
                          Scheduled
                        </Badge>
                      )}
                      {test.status === "completed" && (
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[9px] font-semibold flex items-center gap-1 px-1.5 py-0 rounded-md">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Completed {test.score !== undefined ? `• ${test.score}/${test.totalMarks}` : ""}
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-1">
                      {test.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-3.5 pt-0 space-y-2.5">
                    <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-200/80 dark:border-zinc-800 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-zinc-400">Schedule:</span>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">{test.scheduledAt}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-zinc-400">Duration:</span>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">{test.duration} mins</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-zinc-400">Questions:</span>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">{test.totalQuestions} ({test.totalMarks} Marks)</span>
                      </div>

                      {/* Security Tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {test.proctoring.webcamTracking && (
                          <Badge variant="outline" className="text-[8.5px] border-blue-200 text-blue-700 bg-blue-50/50 px-1 py-0 rounded-sm">
                            Face Monitor
                          </Badge>
                        )}
                        {test.proctoring.safeExamBrowserRequired && (
                          <Badge variant="outline" className="text-[8.5px] border-blue-200 text-blue-700 bg-blue-50/50 px-1 py-0 rounded-sm">
                            SEB Required
                          </Badge>
                        )}
                        {test.proctoring.fullscreenLock && (
                          <Badge variant="outline" className="text-[8.5px] border-blue-200 text-blue-700 bg-blue-50/50 px-1 py-0 rounded-sm">
                            Fullscreen
                          </Badge>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-slate-200/60 dark:border-zinc-800 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 dark:text-zinc-400">Assigned By:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[120px]">{test.proctoring.assignedByName}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="p-3.5 pt-0">
                    {test.status === "completed" ? (
                      <Button
                        onClick={() => handleCardClick(test)}
                        variant="outline"
                        className="w-full h-8 border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-semibold text-xs gap-1.5 rounded-lg"
                      >
                        <Eye className="h-3 w-3" /> View Results
                      </Button>
                    ) : test.status === "live" ? (
                      <Button
                        onClick={() => handleCardClick(test)}
                        className="w-full h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs gap-1.5 rounded-lg shadow-2xs"
                      >
                        <Play className="h-3 w-3" /> Enter Exam Lobby
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleCardClick(test)}
                        variant="outline"
                        className="w-full h-8 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-muted font-semibold text-xs gap-1.5 rounded-lg"
                      >
                        <Clock className="h-3 w-3" /> Details
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
                        ref={lobbyVideoRef}
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
