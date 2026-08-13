"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell, FolderKanban, Clock, ArrowRight, CheckCircle2, Play,
  Search, BookOpen, Code2, AlertCircle, RefreshCw, Layers, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface PracticeTrack {
  id: string;
  title: string;
  category: string;
  description: string;
  thumbnail?: string;
  assignedByName: string;
  totalModules: number;
  totalProblems: number;
  completedModules: number;
  progressPercentage: number;
  subModules: any[];
}

export default function StudentPracticesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<PracticeTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPractices = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/student/practices");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load practice tracks");
      setTracks(data.tracks || []);
    } catch (err: any) {
      console.error("Error loading practices:", err);
      setErrorMsg("Unable to load your practice modules. Please try again.");
      toast({
        title: "Error loading practices",
        description: err.message || "Failed to connect to practice service",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPractices();
  }, []);

  const categories = Array.from(new Set(tracks.map(t => t.category).filter(Boolean)));

  const filteredTracks = tracks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                          t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto w-full">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#2563EB]/10 flex items-center justify-center">
            <Dumbbell className="h-6 w-6 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              My Practices
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Practice tracks and modules assigned to you
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search practices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B]"
          />
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <Button
            size="sm"
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
            className={`rounded-xl text-xs font-semibold h-8 ${selectedCategory === "all" ? "bg-[#2563EB] text-white" : ""}`}
          >
            All Tracks ({tracks.length})
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl text-xs font-semibold h-8 ${selectedCategory === cat ? "bg-[#2563EB] text-white" : ""}`}
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* 3. Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 bg-muted/60 rounded-2xl" />
          ))}
        </div>
      ) : errorMsg ? (
        <Card className="text-center py-16 bg-white dark:bg-[#18181B] border-destructive/30 rounded-2xl">
          <CardContent className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <CardTitle className="text-lg">{errorMsg}</CardTitle>
            <Button onClick={loadPractices} variant="outline" className="gap-2 rounded-xl">
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredTracks.length === 0 ? (
        <Card className="text-center py-20 bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] rounded-2xl shadow-sm">
          <CardContent className="space-y-3 max-w-md mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <FolderKanban className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">
              No Practice Modules Assigned
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground leading-relaxed">
              Your Admin or Trainer has not assigned any practice modules to you yet.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTracks.map((track) => {
            const isFullyCompleted = track.progressPercentage === 100;
            const isStarted = track.progressPercentage > 0;

            return (
              <Card
                key={track.id}
                className="flex flex-col overflow-hidden hover:shadow-lg transition-all border-[#E5E7EB] dark:border-[#27272A] rounded-2xl group bg-white dark:bg-[#18181B]"
              >
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <Badge className="bg-[#2563EB] text-white text-xs font-semibold px-2.5 py-0.5">
                      {track.category}
                    </Badge>
                    {isFullyCompleted && (
                      <Badge className="bg-[#16A34A] text-white text-[10px] uppercase font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </Badge>
                    )}
                    {isStarted && !isFullyCompleted && (
                      <Badge className="bg-amber-500 text-white text-[10px] uppercase font-bold flex items-center gap-1">
                        <Play className="h-3 w-3" /> {track.progressPercentage}%
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA] line-clamp-1 group-hover:text-[#2563EB] transition-colors">
                    {track.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs mt-1 h-8">
                    {track.description || "Practice track for building coding skills."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-5 flex-1 space-y-4">
                  {/* Track Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Completion Progress</span>
                      <span className="text-[#2563EB] font-bold">{track.progressPercentage}%</span>
                    </div>
                    <Progress value={track.progressPercentage} className="h-2 bg-muted rounded-full" />
                  </div>

                  {/* Modules & Problems Summary Grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-xs">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#2563EB]" />
                      <div>
                        <p className="text-muted-foreground text-[10px]">Modules</p>
                        <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">{track.totalModules} Modules</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-[#9333EA]" />
                      <div>
                        <p className="text-muted-foreground text-[10px]">Exercises</p>
                        <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">{track.totalProblems} Problems</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Instructor: <strong className="text-foreground">{track.assignedByName}</strong></span>
                    <span>{track.completedModules} of {track.totalModules} Completed</span>
                  </div>
                </CardContent>

                <CardFooter className="pt-0 pb-5 px-5">
                  <Button
                    className={`w-full font-bold h-11 rounded-xl transition-all ${
                      isFullyCompleted
                        ? "bg-muted text-foreground hover:bg-muted/80"
                        : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm"
                    }`}
                    onClick={() => router.push(`/student/practices/${track.id}`)}
                  >
                    {isFullyCompleted ? "Review Track" : isStarted ? "Continue Practice" : "Start Practice Track"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
