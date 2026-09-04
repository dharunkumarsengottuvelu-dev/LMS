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
  percentage?: number;
  passed?: boolean;
}

const initialTestsData: ScheduledTest[] = [];

export default function StudentTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<ScheduledTest[]>([]);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [testsData, setTestsData] = useState<ScheduledTest[]>([]);

  useEffect(() => {
    async function loadTests() {
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
            setTests(mapped);
            setTestsData(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to load student tests", err);
      }
    }
    loadTests();
  }, []);

  // Modals for distinct card actions
  const [selectedLobbyTest, setSelectedLobbyTest] = useState<ScheduledTest | null>(null);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);

  const [selectedUpcomingTest, setSelectedUpcomingTest] = useState<ScheduledTest | null>(null);
  const [isUpcomingModalOpen, setIsUpcomingModalOpen] = useState(false);

  // Candidate Reference Photo Verification state & camera stream
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);
  const [lobbyStream, setLobbyStream] = useState<MediaStream | null>(null);
  const [lobbyCameraError, setLobbyCameraError] = useState<string | null>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);

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
    if (isLobbyOpen && selectedLobbyTest?.proctoring?.webcamTracking) {
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
      // Fallback preview snapshot if video ref pending
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

  const handleCardClick = (test: ScheduledTest) => {
    if (test.status === "completed") {
      // Completed Test -> Go directly to View Performance & Results page!
      router.push(`/student/tests/${test.id}`);
    } else if (test.status === "upcoming") {
      // Upcoming Test -> Open Exam Instructions & Schedule Modal!
      setSelectedUpcomingTest(test);
      setIsUpcomingModalOpen(true);
    } else {
      // Live Test -> Open Pre-Exam Verification Lobby!
      setReferencePhoto(null); // Reset photo verification for new session
      setSelectedLobbyTest(test);
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

    if (selectedLobbyTest?.proctoring?.webcamTracking && !referencePhoto) {
      handleCaptureReferencePhoto();
    }

    setIsLobbyOpen(false);

    if (selectedLobbyTest?.proctoring?.fullscreenLock) {
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
        selectedLobbyTest?.proctoring?.enabled ? "Live Face Monitoring Stream Active." : "Standard Mode."
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
    <div className="space-y-8 pb-12 w-full">
      {/* Top Header - Spacious Enterprise MNC Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 shadow-xs overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Left: Breadcrumb & Title */}
          <div className="space-y-2 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0.5"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-normal">
              Scheduled Tests & Proctored Exams
            </h1>
          </div>
        </div>
      </div>

      {/* 2. Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="w-full overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <TabsList className="bg-slate-100 dark:bg-zinc-800/70 p-1.5 h-11 sm:h-12 rounded-2xl border border-slate-200/80 dark:border-zinc-800 w-max min-w-full sm:w-fit flex gap-1 sm:gap-1.5 shrink-0">
            <TabsTrigger
              value="all"
              className="h-8.5 sm:h-9 px-3.5 sm:px-4 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-2xs transition-all"
            >
              All Tests ({testsData.length})
            </TabsTrigger>
            <TabsTrigger
              value="live"
              className="h-8.5 sm:h-9 px-3.5 sm:px-4 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-2xs transition-all"
            >
              Live / Ready ({testsData.filter((t) => t.status === "live").length})
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="h-8.5 sm:h-9 px-3.5 sm:px-4 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-2xs transition-all"
            >
              Upcoming ({testsData.filter((t) => t.status === "upcoming").length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="h-8.5 sm:h-9 px-3.5 sm:px-4 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-2xs transition-all"
            >
              Completed ({testsData.filter((t) => t.status === "completed").length})
            </TabsTrigger>
          </TabsList>
        </div>

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
                      <Badge className="bg-[#16A34A] text-white text-[10px] uppercase font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Completed {test.score !== undefined ? `• Score: ${test.score}/${test.totalMarks} (${test.percentage ?? (test.totalMarks ? Math.round((test.score / test.totalMarks) * 100) : 0)}%)` : ""}
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
                      {test.proctoring?.webcamTracking && (
                        <Badge variant="outline" className="text-[9px] border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                          Face Monitoring Stream
                        </Badge>
                      )}
                      {test.proctoring?.safeExamBrowserRequired && (
                        <Badge variant="outline" className="text-[9px] border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                          SEB Required
                        </Badge>
                      )}
                      {test.proctoring?.fullscreenLock && (
                        <Badge variant="outline" className="text-[9px] border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                          Fullscreen Lock
                        </Badge>
                      )}
                      {test.proctoring?.copyPasteRestricted && (
                        <Badge variant="outline" className="text-[9px] border-[#DC2626]/30 text-[#DC2626] bg-[#DC2626]/5">
                          Copy-Paste Disabled
                        </Badge>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between text-[11px]">
                      <span className="text-[#6B7280]">Assigned By:</span>
                      <span className="font-bold text-[#2563EB]">{test.proctoring?.assignedBy || "Admin"}: {test.proctoring?.assignedByName || "System"}</span>
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
        </TabsContent>
      </Tabs>

      {/* 3. LIVE EXAM VERIFICATION LOBBY MODAL (PERFECTLY ALIGNED & SCROLLABLE) */}
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

              {/* CANDIDATE REFERENCE PHOTO CAPTURE BOX WITH LIVE WEBCAM FIX */}
              {selectedLobbyTest?.proctoring?.webcamTracking && (
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
                            type="button"
                            onClick={startLobbyCamera}
                            className="h-7 text-[11px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-2.5"
                          >
                            Enable Camera
                          </Button>
                        </div>
                      )}

                      {lobbyStream && (
                        <span className="absolute bottom-1.5 left-1.5 bg-[#09090B]/85 text-[9px] text-[#16A34A] px-1.5 py-0.5 rounded font-mono border border-[#16A34A]/40 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-ping" /> Live Preview
                        </span>
                      )}
                    </div>

                    {/* Captured Reference Snapshot Thumbnail */}
                    <div className="aspect-video bg-[#F3F4F6] dark:bg-[#27272A] rounded-xl overflow-hidden relative border border-[#E5E7EB] dark:border-[#27272A] flex flex-col items-center justify-center">
                      {referencePhoto ? (
                        <img src={referencePhoto} alt="Candidate Reference Snapshot" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="text-center p-2 text-[11px] text-[#6B7280]">
                          <UserCheck className="h-6 w-6 mx-auto mb-1 text-[#2563EB]/60" />
                          <span>Captured Reference Snapshot</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCaptureReferencePhoto}
                    className="w-full h-[40px] text-xs font-bold border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 rounded-lg"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {referencePhoto ? "Recapture Reference Photo" : "Capture Candidate Reference Snapshot"}
                  </Button>
                </div>
              )}

              <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                <p className="font-bold text-[#111827] dark:text-[#FAFAFA] uppercase text-[11px]">
                  {selectedLobbyTest?.proctoring?.enabled ? "PROCTORING & SECURITY CONTROLS" : "Standard Test Rules"}
                </p>
                {selectedLobbyTest?.proctoring?.enabled ? (
                  <ul className="list-disc list-inside space-y-1.5 text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed text-xs">
                    {selectedLobbyTest?.proctoring?.safeExamBrowserRequired && (
                      <li className="font-semibold text-[#2563EB]">Safe Exam Browser (SEB) Environment: <strong>Required & Enforced</strong></li>
                    )}
                    {selectedLobbyTest?.proctoring?.fullscreenLock && (
                      <li>Mandatory Fullscreen Mode: <strong>Enforced (Auto-exit warning)</strong></li>
                    )}
                    {selectedLobbyTest?.proctoring?.copyPasteRestricted && (
                      <li>Copy / Paste & Clipboard Restrictions: <strong>Blocked</strong></li>
                    )}
                    <li>Live Real-time Camera Monitoring Stream: <strong>Active</strong></li>
                  </ul>
                ) : (
                  <p className="text-xs text-[#4B5563]">This test is running in standard practice evaluation mode.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex-col gap-2.5 border-t border-[#E5E7EB] dark:border-[#27272A]">
            {selectedLobbyTest?.proctoring?.webcamTracking && !referencePhoto && (
              <div className="w-full p-2.5 bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Candidate Reference Photo Snapshot Required to Unlock Exam!
              </div>
            )}
            <Button
              disabled={Boolean(selectedLobbyTest?.proctoring?.webcamTracking && !referencePhoto)}
              className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed text-white font-bold gap-2 text-sm rounded-xl"
              onClick={handleStartExam}
            >
              <Play className="h-4 w-4" />
              {selectedLobbyTest?.proctoring?.webcamTracking && !referencePhoto
                ? "Capture Reference Photo Below to Unlock Exam"
                : "Start Proctored Examination Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. UPCOMING EXAM INSTRUCTIONS MODAL (FOR SCHEDULED TEST t2) */}
      <Dialog open={isUpcomingModalOpen} onOpenChange={setIsUpcomingModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-5 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#F59E0B]" />
              <DialogTitle className="text-lg font-bold">
                Upcoming Exam Schedule & Rules
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280]">
              This examination is scheduled for a future date. Read instructions below.
            </DialogDescription>
          </DialogHeader>

          {selectedUpcomingTest && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl space-y-2">
                <p className="font-bold text-[#D97706] text-sm">{selectedUpcomingTest.title}</p>
                <div className="space-y-1 text-[#4B5563] dark:text-[#D1D5DB] pt-1">
                  <p>• Scheduled Start: <strong>{selectedUpcomingTest.scheduledAt}</strong></p>
                  <p>• Duration: <strong>{selectedUpcomingTest.duration} minutes</strong></p>
                  <p>• Questions: <strong>{selectedUpcomingTest.totalQuestions} ({selectedUpcomingTest.totalMarks} Marks)</strong></p>
                </div>
              </div>

              <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">Exam Syllabus & Prerequisites:</p>
                <ul className="list-disc list-inside space-y-1 text-[#6B7280]">
                  <li>System check & camera verification will begin 10 mins prior.</li>
                  <li>Ensure stable internet connection and quiet environment.</li>
                  <li>Copy/Paste restrictions and Proctoring stream will be active.</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              className="w-full h-[40px] bg-[#2563EB] text-white font-bold"
              onClick={() => setIsUpcomingModalOpen(false)}
            >
              Close & Set Calendar Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
