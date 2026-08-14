"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Clock, ArrowRight, CheckCircle2, Play, AlertCircle, Dumbbell, Code2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface PracticeItem {
  id: string;
  title: string;
  description?: string;
  type: "mcq" | "coding" | "mixed";
  duration_minutes: number;
  total_marks: number;
  my_attempts?: any[];
}

export default function StudentAssessmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [practices, setPractices] = useState<PracticeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPractices() {
      try {
        let items: PracticeItem[] = [];

        // 1. Fetch from API
        try {
          const res = await fetch("/api/student/assessments");
          if (res.ok) {
            const data = await res.json();
            if (data.assessments && Array.isArray(data.assessments)) {
              items = [...data.assessments];
            }
          }
        } catch (e) {
          console.warn("API assessments fetch fallback:", e);
        }

        // 2. Fetch from practices API
        try {
          const resPractices = await fetch("/api/student/practices");
          if (resPractices.ok) {
            const dataPractices = await resPractices.json();
            if (dataPractices.tracks && Array.isArray(dataPractices.tracks)) {
              dataPractices.tracks.forEach((track: any) => {
                if (track.subModules && Array.isArray(track.subModules)) {
                  track.subModules.forEach((sm: any) => {
                    if (!items.some(it => it.id === sm.id)) {
                      items.push({
                        id: sm.id,
                        title: sm.title,
                        description: `${track.title} GÇó ${sm.description || "Practice Module"}`,
                        type: sm.type || "coding",
                        duration_minutes: sm.durationMinutes || sm.duration_minutes || 30,
                        total_marks: sm.totalMarks || sm.total_marks || 100,
                        my_attempts: sm.status === "completed" ? [{ status: "submitted", score: sm.score || sm.totalMarks || 100, total_marks: sm.totalMarks || 100 }] : []
                      });
                    }
                  });
                }
              });
            }
          }
        } catch (e) {
          console.warn("API practices fetch fallback:", e);
        }



        setPractices(items);
      } catch (err: any) {
        console.error("Error loading practices:", err);
        toast({ title: "Error loading practices", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }

    loadPractices();
  }, [toast]);

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center">
          <Dumbbell className="h-5 w-5 text-[#2563EB]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">My Practices</h1>
          <p className="text-sm text-muted-foreground">View and attempt your assigned practices</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted rounded-xl" />)}
        </div>
      ) : practices.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Practices Found</CardTitle>
            <CardDescription>You have no pending or active practices assigned to you.</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {practices.map(practice => {
            const myAttempts = practice.my_attempts || [];
            const latestAttempt = myAttempts[0];
            const isCompleted = latestAttempt?.status === "submitted";
            const inProgress = latestAttempt?.status === "in_progress";

            return (
              <Card key={practice.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-all border-[#E5E7EB] dark:border-[#27272A] rounded-2xl group bg-white dark:bg-[#09090B]">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={
                      practice.type === "mcq" ? "bg-[#2563EB] text-white" :
                      practice.type === "coding" ? "bg-[#9333EA] text-white" :
                      "bg-[#D97706] text-white"
                    }>
                      {practice.type.toUpperCase()}
                    </Badge>
                    {isCompleted && <Badge className="bg-[#16A34A] text-white"><CheckCircle2 className="h-3 w-3 mr-1"/> Completed</Badge>}
                    {inProgress && <Badge className="bg-amber-500 text-white"><Play className="h-3 w-3 mr-1"/> In Progress</Badge>}
                  </div>
                  <CardTitle className="text-base line-clamp-1 group-hover:text-[#2563EB] transition-colors">{practice.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs mt-1 h-8">{practice.description || "No description provided."}</CardDescription>
                </CardHeader>
                <CardContent className="py-4 flex-1">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{practice.duration_minutes} mins</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ClipboardList className="h-4 w-4" />
                      <span className="font-medium">{practice.total_marks} Marks</span>
                    </div>
                  </div>
                  {isCompleted && latestAttempt && (
                    <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                      <p className="text-xs font-semibold text-green-800 dark:text-green-400">Score: {latestAttempt.score} / {latestAttempt.total_marks}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 pb-4 px-4">
                  <Button 
                    className={`w-full font-bold h-10 ${isCompleted ? 'bg-muted text-foreground' : 'bg-[#111827] dark:bg-white text-white dark:text-black hover:bg-[#2563EB] dark:hover:bg-[#2563EB] hover:text-white transition-colors'}`}
                    onClick={() => router.push(`/student/assessments/${practice.id}`)}
                  >
                    {isCompleted ? "View Result" : inProgress ? "Resume Practice" : "Start Practice"}
                    {!isCompleted && <ArrowRight className="h-4 w-4 ml-2" />}
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
