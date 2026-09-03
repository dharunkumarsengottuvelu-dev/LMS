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
import { cn } from "@/lib/utils";
import { computeTrackProgress } from "@/lib/practice-progress";

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
      {/* Top Header - Spacious Enterprise MNC Header */}
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
              Practice Tracks & Coding Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-normal line-clamp-1">
              Access interactive coding IDE practice, algorithmic problem sets, and assigned practice tracks.
            </p>
          </div>

          {/* Right: Search Input */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search practice tracks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8.5 h-8.5 text-xs bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-700 rounded-lg"
            />
          </div>
        </div>
      </div>


      {/* Practice Tracks Cards Grid */}
      <div className="space-y-4 pt-2 animate-fade-up stagger-2">

        {filteredTracks.length === 0 ? (
          <Card className="bg-card border border-border p-8 text-center rounded-xl w-full shadow-xs">
            <h3 className="text-base font-semibold text-foreground">No Matching Practice Tracks</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 font-normal">
              Try adjusting your search criteria.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
            {filteredTracks.map((track) => {
              const {
                progressPercentage,
                totalSubModulesCount,
              } = computeTrackProgress(track, isMounted);

              return (
                <Card key={track.id} className="flex flex-col justify-between overflow-hidden hover:border-blue-500/40 hover:shadow-md transition-all duration-200 bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl group">
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-semibold px-2.5 py-0.5 border-blue-200/70 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg">
                        <FolderKanban className="h-3 w-3 mr-1 inline text-blue-600" /> {track.category}
                      </Badge>
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-1">
                      {track.title}
                    </CardTitle>

                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed min-h-[36px]">
                      {track.description}
                    </p>
                  </CardHeader>

                  <CardContent className="p-3.5 pt-1 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">
                          {totalSubModulesCount} {totalSubModulesCount === 1 ? "Module" : "Modules"}
                        </span>
                        <span className={cn(
                          "font-bold",
                          progressPercentage === 100
                            ? "text-emerald-600 dark:text-emerald-400"
                            : progressPercentage >= 50
                            ? "text-blue-600 dark:text-blue-400"
                            : progressPercentage > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-400 dark:text-zinc-500"
                        )}>
                          {progressPercentage}%
                        </span>
                      </div>
                      <Progress
                        value={progressPercentage}
                        className="h-1 bg-slate-100 dark:bg-zinc-800 rounded-full"
                        indicatorClassName={
                          progressPercentage === 100
                            ? "bg-emerald-600 dark:bg-emerald-500"
                            : progressPercentage >= 50
                            ? "bg-blue-600 dark:bg-blue-500"
                            : progressPercentage > 0
                            ? "bg-amber-500"
                            : "bg-primary"
                        }
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="p-3.5 pt-0">
                    <Button
                      onClick={() => router.push(`/student/practices/${track.id}`)}
                      className="w-full h-8 text-xs font-semibold gap-1.5 transition-all rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-2xs"
                    >
                      <Layers className="h-3 w-3" /> Explore Practice Track
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
