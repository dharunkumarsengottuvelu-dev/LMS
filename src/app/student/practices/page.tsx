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
  assignedBy: "Admin" | "Trainer";
  assignedByName: string;
  subModules: SubModuleItem[];
}

const defaultPracticeTracks: PracticeCourseTrack[] = [];

export default function StudentPracticesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [storePracticeTracks, setStorePracticeTracks] = useState<any[]>([]);

  useEffect(() => {
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
  }, []);

  const formattedStoreTracks: PracticeCourseTrack[] = storePracticeTracks.map(t => ({
    id: t.id,
    title: t.title,
    category: t.category,
    description: t.description || "Practice Track",
    thumbnail: t.thumbnail_url || t.thumbnail || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
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
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12 w-full">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border animate-fade-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-foreground">
            Practice Tracks & Coding Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            Assigned Practice Tracks & Problem Sets
          </h2>
          <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">
            {filteredTracks.length} Tracks Available
          </Badge>
        </div>

        {filteredTracks.length === 0 ? (
          <Card className="bg-card border border-border p-12 text-center rounded-[var(--radius-xl)] w-full shadow-sm">
            <Dumbbell className="h-12 w-12 text-primary mx-auto mb-4 opacity-80" />
            <h3 className="text-xl font-bold text-foreground">No Matching Practice Tracks</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
              Try adjusting your search criteria.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {filteredTracks.map((track) => {
              const completedCount = track.subModules.filter((m) => m.status === "completed").length;
              const totalCount = track.subModules.length;
              const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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

                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">{totalCount} Modules</span>
                        <span className="font-bold text-foreground">{progressPercentage}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-1 bg-border" />
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
