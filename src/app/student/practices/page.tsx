"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Clock, ArrowRight, CheckCircle2, AlertCircle, Search, Filter, Code2, Layers,
  ShieldCheck, MonitorCheck, Maximize, CopyX, Play, Shield, FolderKanban, Check, ChevronRight, ArrowLeft, Dumbbell, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useLMSStore } from "@/lib/store/lms-store";
import { getTopicThumbnail } from "@/lib/utils";

interface SubModuleItem {
  id: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
  duration_minutes: number;
  total_marks: number;
  question_count: number;
  status: "not_started" | "in_progress" | "completed";
  score?: number;
}

interface PracticeCourseTrack {
  id: string;
  title: string;
  category: string;
  description: string;
  thumbnail: string;
  assignedBy?: "Admin" | "Trainer" | string;
  assignedByName: string;
  subModules: SubModuleItem[];
  progressPercentage?: number;
  completedModules?: number;
  totalModules?: number;
  totalProblems?: number;
}

const defaultPracticeTracks: PracticeCourseTrack[] = [];

export default function StudentPracticesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [storePracticeTracks, setStorePracticeTracks] = useState<any[]>([]);
  const [storageTick, setStorageTick] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    async function loadTracks() {
      let apiTracks: any[] = [];
      try {
        const res = await fetch("/api/student/practices");
        const data = await res.json();
        
        if (data.tracks && Array.isArray(data.tracks)) {
          apiTracks = data.tracks;
        }
      } catch (err) {
        console.error("Failed to load tracks from API, falling back to local/supabase", err);
      }

      if (apiTracks.length > 0) {
        setStorePracticeTracks(apiTracks);
        return;
      }

      // Supabase fallback if both empty
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      const { data } = await supabase.from("practice_tracks").select("*");
      if (data) {
        setStorePracticeTracks(data);
      }
    }
    loadTracks();
    setStorageTick((t) => t + 1);

    const handleFocus = () => {
      loadTracks();
      setStorageTick((t) => t + 1);
    };
    const handleStorage = () => {
      setStorageTick((t) => t + 1);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const formattedStoreTracks: PracticeCourseTrack[] = storePracticeTracks.map(t => ({
    id: t.id,
    title: t.title,
    category: t.category,
    description: t.description || "Practice Track",
    thumbnail: getTopicThumbnail(t.title, t.category, t.thumbnail_url || t.thumbnail),
    assignedBy: "Admin",
    assignedByName: t.assignedByName || t.assigned_by_name || "System Admin",
    subModules: t.subModules || t.sub_modules || [] 
  }));

  const allTracks = storePracticeTracks.length > 0 ? formattedStoreTracks : defaultPracticeTracks;

  const filteredTracks = allTracks.filter((track) => {
    const matchesSearch = track.title.toLowerCase().includes(search.toLowerCase()) || track.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || track.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full space-y-6 pb-12">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border animate-fade-up">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.15] tracking-tight text-foreground">
            Practice Tracks & Coding Hub
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 font-normal">
            Access interactive coding IDE practice, algorithmic problem sets, and assigned practice tracks.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80 animate-fade-up stagger-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search practice tracks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-[44px] text-xs bg-background"
          />
        </div>
      </div>


      {/* Practice Tracks Cards Grid */}
      <div className="space-y-4 pt-2 animate-fade-up stagger-2">

        {filteredTracks.length === 0 ? (
          <Card className="bg-card border border-border p-12 text-center rounded-[var(--radius-xl)] w-full shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">No Matching Practice Tracks</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1.5 font-normal">
              Try adjusting your search criteria.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {filteredTracks.map((track) => {
              const subMods = track.subModules || [];
              const totalCount = subMods.length || 1;
              let completedCount = 0;
              let totalTrackQuestions = 0;
              let totalAnsweredQuestions = 0;

              subMods.forEach((m) => {
                const directMcqs = (m as any).mcqQuestions?.length || (m as any).mcqs?.length || 0;
                const directCoding = (m as any).codingQuestions?.length || (m as any).codingProblems?.length || 0;
                const sectionMcqs = (m as any).sections?.flatMap((s: any) => s.mcqQuestions || []).length || 0;
                const sectionCoding = (m as any).sections?.flatMap((s: any) => s.codingQuestions || []).length || 0;
                const mcqsCount = Math.max(directMcqs, sectionMcqs);
                const codingCount = Math.max(
                  directCoding,
                  sectionCoding,
                  (m.type === "coding" || (m as any).problemDescription) && (mcqsCount + directCoding + sectionCoding === 0) ? 1 : 0
                );
                let qCount = mcqsCount + codingCount;
                if (qCount === 0) {
                  qCount = m.question_count || (m as any).questionCount || 1;
                }
                totalTrackQuestions += qCount;

                let isComp = m.status === "completed";
                let inProg = false;
                let ansCount = isComp ? qCount : 0;

                if (isMounted) {
                  const resultKey = `lms_completed_assessment_${m.id}`;
                  const submittedMarker = localStorage.getItem(`lms_practice_session_${m.id}_submitted`);
                  const resStr = localStorage.getItem(resultKey);
                  if (resStr || submittedMarker === "true") {
                    isComp = true;
                    ansCount = qCount;
                  } else if (!isComp) {
                    const sessionKey = `lms_practice_session_${m.id}`;
                    const session = localStorage.getItem(sessionKey);
                    if (session) {
                      try {
                        const parsed = JSON.parse(session);
                        const answeredKeys = new Set<string>();
                        Object.entries(parsed.answers || {}).forEach(([k, v]) => {
                          if (!v) return;
                          if (Array.isArray(v) && v.length > 0) answeredKeys.add(k);
                          else if (typeof v === "string" && v.trim().length > 0) answeredKeys.add(k);
                          else if (typeof v === "object" && (v as any).code && (v as any).code.trim().length > 0) answeredKeys.add(k);
                        });
                        Object.entries(parsed.codeAnswers || {}).forEach(([k, v]: any) => {
                          if (v && v.code && v.code.trim().length > 0) answeredKeys.add(k);
                        });
                        if (answeredKeys.size > 0) {
                          inProg = true;
                          ansCount = Math.min(qCount, answeredKeys.size);
                        }
                      } catch {}
                    }
                  }
                }

                if (isComp) {
                  completedCount++;
                  totalAnsweredQuestions += qCount;
                } else if (inProg) {
                  totalAnsweredQuestions += ansCount;
                }
              });

              const isAllDone = completedCount === totalCount && totalCount > 0;
              const computedPercentage = totalTrackQuestions > 0
                ? Math.round((totalAnsweredQuestions / totalTrackQuestions) * 100)
                : isAllDone
                ? 100
                : 0;

              const progressPercentage = isAllDone
                ? 100
                : track.progressPercentage !== undefined && track.progressPercentage > 0
                ? Math.max(track.progressPercentage, computedPercentage)
                : computedPercentage;

              return (
                <Card key={track.id} className="flex flex-col justify-between overflow-hidden hover:border-primary/40 transition-all duration-200 bg-card border border-border shadow-sm rounded-[var(--radius-xl)] group">
                  {/* Thumbnail Header Image */}
                  <div className="relative w-full h-32 overflow-hidden border-b border-border bg-muted">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 border-primary/20 text-primary bg-primary/5">
                        <FolderKanban className="h-3 w-3 mr-1.5 inline" /> {track.category}
                      </Badge>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {track.assignedByName}
                      </span>
                    </div>

                    <CardTitle className="text-base font-bold text-foreground leading-tight line-clamp-1">
                      {track.title}
                    </CardTitle>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed h-8">
                      {track.description}
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">
                          {completedCount}/{totalCount} {totalCount === 1 ? "Module" : "Modules"} Completed
                        </span>
                        <span className={
                          progressPercentage === 100 ? "font-bold text-[#16A34A]" : progressPercentage > 0 ? "font-bold text-[#F59E0B]" : "font-semibold text-foreground"
                        }>
                          {progressPercentage}%
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-1.5 bg-border rounded-full" />
                      {progressPercentage > 0 && progressPercentage < 100 && totalTrackQuestions > 1 && (
                        <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-0.5">
                          <span>{totalAnsweredQuestions} of {totalTrackQuestions} Questions Solved</span>
                          <span className="text-[#F59E0B] font-semibold">In Progress</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0 gap-3">
                    <Button
                      onClick={() => router.push(`/student/practices/${track.id}`)}
                      className="w-full h-8 text-[11px] font-semibold gap-2 transition-colors rounded-[var(--radius-md)]"
                    >
                      <Layers className="h-3.5 w-3.5" /> Explore Practice Track
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
