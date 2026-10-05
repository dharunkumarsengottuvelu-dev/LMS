"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";

interface PracticeMainModule {
  id: string;
  name: string;
  title: string;
  category: string;
  description: string;
  assignedByName: string;
  submodules: any[];
  totalSubmodules: number;
  totalModules: number;
  completedModules: number;
  totalProblems: number;
  progressPercentage: number;
  display_order: number;
}

export default function StudentPracticesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState<PracticeMainModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTracks() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/student/practices");
        const data = await res.json();
        if (data.tracks && Array.isArray(data.tracks)) {
          setTracks(data.tracks);
        }
      } catch (err) {
        console.error("Failed to load student practice tracks:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTracks();

    // Supabase Realtime subscription for live track updates from database
    const supabase = createClient();
    const channel = supabase
      .channel("student_practice_tracks_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "practice_tracks" },
        () => {
          loadTracks();
        }
      )
      .subscribe();

    const handleFocus = () => loadTracks();
    window.addEventListener("focus", handleFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const filteredTracks = tracks.filter((track) => {
    const q = search.toLowerCase();
    const name = (track.name || track.title || "").toLowerCase();
    const cat = (track.category || "").toLowerCase();
    const desc = (track.description || "").toLowerCase();
    return name.includes(q) || cat.includes(q) || desc.includes(q);
  });

  return (
    <div className="w-full space-y-6 pb-12 font-sans">
      {/* ─── MNC PAGE HEADER (PURE TEXT, ZERO ICONS) ────────────────────── */}
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Practice Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Select a module to access topic-specific submodules and practice exercises.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <Input
              placeholder="Search practice modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-700 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* ─── MAIN MODULES LIST ─────────────────────────────────────────── */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-8 text-center rounded-xl shadow-2xs">
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Loading practice modules from database...
            </p>
          </Card>
        ) : filteredTracks.length === 0 ? (
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-12 text-center rounded-xl shadow-2xs">
            <div className="max-w-md mx-auto space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                PRACTICE
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No practice modules available.
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                There are currently no active practice modules assigned to your cohort.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
            {filteredTracks.map((track) => {
              const subCount = track.totalSubmodules || track.submodules?.length || 0;
              const modCount = track.totalModules || 0;
              const progress = track.progressPercentage || 0;

              return (
                <Card
                  key={track.id}
                  className="flex flex-col justify-between overflow-hidden hover:border-blue-500/50 transition-all bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 shadow-2xs rounded-xl"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40">
                        Practice Track
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {track.category || "General"}
                      </span>
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-1">
                      {track.name || track.title}
                    </CardTitle>

                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed min-h-[36px]">
                      {track.description || "Hands-on curriculum with structured submodules and practice challenges."}
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800/80 pt-2">
                      <span>{subCount} {subCount === 1 ? "Submodule" : "Submodules"}</span>
                      <span>{modCount} {modCount === 1 ? "Module" : "Modules"}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Progress</span>
                        <span className={progress === 100 ? "text-emerald-600" : "text-blue-600"}>
                          {progress}%
                        </span>
                      </div>
                      <Progress
                        value={progress}
                        className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full"
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    <Button
                      type="button"
                      onClick={() => router.push(`/student/practices/${track.id}`)}
                      className="w-full h-8.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                    >
                      Explore Module
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
