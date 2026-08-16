"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FolderKanban, Clock, CheckCircle2, Play, Code2, Layers,
  ClipboardList, ShieldCheck, MonitorCheck, Maximize, CopyX, Award, Check,
  ChevronRight, BookOpen, AlertCircle, Loader2, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { WaveLoader } from "@/components/ui/wave-loader";

interface SubModuleItem {
  id: string;
  subModuleNumber: string;
  title: string;
  description: string;
  type: "mcq" | "coding" | "mixed";
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  status: "not_started" | "in_progress" | "completed";
  score?: number;
  codingProblems?: any[];
}

interface PracticeTrack {
  id: string;
  title: string;
  category: string;
  description: string;
  thumbnail?: string;
  assignedByName: string;
  totalSubModules: number;
  completedCount: number;
  progressPercentage: number;
  subModules: SubModuleItem[];
}

export default function StudentTrackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const trackId = (params?.id as string) || "";
  const [track, setTrack] = useState<PracticeTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTrackDetails = async () => {
    if (!trackId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/student/practices/${trackId}`);
      const data = await res.json();
      
      if (res.ok && data.track) {
        setTrack(data.track);
        return;
      }
      
      throw new Error(data.error || "Failed to load practice track");
    } catch (err: any) {
      console.error("Error fetching practice track from API:", err);
      
      setErrorMsg(err.message || "Failed to load practice track.");
      toast({
        title: "Access Error",
        description: err.message || "You may not be assigned to this practice track.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackDetails();
  }, [trackId]);

  const handleStartSubModule = (subModule: SubModuleItem) => {
    router.push(`/student/assessments/${subModule.id}?trackId=${trackId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <WaveLoader
          label="Loading Practice Track Details..."
          subLabel="Fetching sub-modules, coding challenges and curriculum structure"
        />
      </div>
    );
  }

  if (errorMsg || !track) {
    return (
      <div className="w-full space-y-6 pb-12">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
          onClick={() => router.push("/student/practices")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Practices
        </Button>
        <Card className="text-center py-16 bg-white dark:bg-[#18181B] border-destructive/30 rounded-2xl">
          <CardContent className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <CardTitle className="text-lg">{errorMsg || "Practice track not found"}</CardTitle>
            <Button onClick={fetchTrackDetails} variant="outline" className="gap-2 rounded-xl">
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A] rounded-xl hover:bg-muted"
        onClick={() => router.push("/student/practices")}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Practices
      </Button>

      {/* Track Title Header */}
      <div className="space-y-4 pb-6 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                {track.title}
              </h1>
              <Badge className="bg-[#2563EB] text-white text-xs font-semibold px-3 py-0.5">
                {track.category}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
              {track.description || "Interactive practice track for hands-on learning."}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              <span>Assigned By: <strong className="text-foreground">{track.assignedByName}</strong></span>
              <span>•</span>
              <span>{track.totalSubModules} Practice Modules</span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-sm shrink-0 space-y-2.5 min-w-[260px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Track Completion:</span>
              <span className="font-bold text-[#16A34A]">{track.progressPercentage}%</span>
            </div>
            <Progress value={track.progressPercentage} className="h-2.5 bg-muted rounded-full" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>{track.completedCount} of {track.totalSubModules} Modules Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[#2563EB]" /> Practice Modules ({track.subModules.length})
          </h2>
          <Badge variant="outline" className="text-xs font-bold border-[#2563EB] text-[#2563EB]">
            {track.totalSubModules} Total Modules
          </Badge>
        </div>

        <div className="space-y-4">
          {track.subModules.map((sub, idx) => {
            const isCompleted = sub.status === "completed";
            const isInProgress = sub.status === "in_progress";

            return (
              <Card
                key={sub.id}
                className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden hover:border-[#2563EB]/60 transition-all"
              >
                <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  {/* Left Module Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs font-bold border-[#2563EB]/40 text-[#2563EB] bg-[#2563EB]/5">
                        Module {idx + 1}
                      </Badge>

                      <Badge className={`text-[10px] font-bold uppercase ${
                        sub.type === "coding" ? "bg-[#9333EA] text-white" : sub.type === "mcq" ? "bg-[#2563EB] text-white" : "bg-[#F59E0B] text-white"
                      }`}>
                        {sub.type === "coding" ? "Coding Exercise" : sub.type === "mcq" ? "MCQ Suite" : "Mixed Practice"}
                      </Badge>

                      {isCompleted && (
                        <Badge className="bg-[#16A34A] text-white text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completed {sub.score ? `(${sub.score} Marks)` : ""}
                        </Badge>
                      )}
                      {isInProgress && (
                        <Badge className="bg-[#F59E0B] text-white text-[10px] font-bold">
                          In Progress
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-base md:text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">
                      {sub.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {sub.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#2563EB]" /> {sub.durationMinutes} mins</span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-[#2563EB]" /> {sub.questionCount} Problems ({sub.totalMarks} Marks)</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0">
                    <Button
                      className={`h-11 px-6 font-bold gap-2 rounded-xl ${
                        isCompleted
                          ? "bg-muted text-foreground hover:bg-muted/80"
                          : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm"
                      }`}
                      onClick={() => handleStartSubModule(sub)}
                    >
                      <Play className="h-4 w-4" />
                      {isCompleted ? "Re-take Module" : isInProgress ? "Continue Practice" : "Start Module"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
