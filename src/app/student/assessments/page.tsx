"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Clock, ArrowRight, CheckCircle2, Play, AlertCircle, Dumbbell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function StudentAssessmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssessments() {
      try {
        let items: any[] = [];
        try {
          const res = await fetch("/api/student/assessments");
          if (res.ok) {
            const data = await res.json();
            if (data.assessments && Array.isArray(data.assessments)) {
              items = [...data.assessments];
            }
          }
        } catch (e) {
          console.warn("API assessments fetch error:", e);
        }

        if (typeof window !== "undefined") {
          try {
            const savedAssessmentsRaw = localStorage.getItem("enterprise_lms_assessments_v2") ||
                                        localStorage.getItem("edunexus_assessments_v5");
            if (savedAssessmentsRaw) {
              const saved = JSON.parse(savedAssessmentsRaw);
              if (Array.isArray(saved)) {
                saved.forEach((a: any) => {
                  if (!items.some(it => it.id === a.id)) {
                    items.push({
                      id: a.id,
                      title: a.title,
                      description: a.description || "Assessment",
                      type: a.type || "mcq",
                      duration_minutes: a.duration_minutes || 60,
                      total_marks: a.total_marks || 100,
                      my_attempts: []
                    });
                  }
                });
              }
            }
          } catch (e) {}
        }

        setAssessments(items);
      } catch (err: any) {
        toast({ title: "Error loading assessments", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    loadAssessments();
  }, [toast]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center">
          <Dumbbell className="h-5 w-5 text-[#2563EB]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">My Assessments</h1>
          <p className="text-sm text-muted-foreground">View and attempt your assigned assessments</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted rounded-xl" />)}
        </div>
      ) : assessments.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Assessments Found</CardTitle>
            <CardDescription>You have no pending or active assessments assigned to you.</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map(assessment => {
            const myAttempts = assessment.my_attempts || [];
            const latestAttempt = myAttempts[0];
            const isCompleted = latestAttempt?.status === "submitted";
            const inProgress = latestAttempt?.status === "in_progress";

            return (
              <Card key={assessment.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-all border-[#E5E7EB] dark:border-[#27272A] rounded-2xl group bg-white dark:bg-[#09090B]">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={
                      assessment.type === "mcq" ? "bg-[#2563EB] text-white" :
                      assessment.type === "coding" ? "bg-[#9333EA] text-white" :
                      "bg-[#D97706] text-white"
                    }>
                      {assessment.type.toUpperCase()}
                    </Badge>
                    {isCompleted && <Badge className="bg-[#16A34A] text-white"><CheckCircle2 className="h-3 w-3 mr-1"/> Completed</Badge>}
                    {inProgress && <Badge className="bg-amber-500 text-white"><Play className="h-3 w-3 mr-1"/> In Progress</Badge>}
                  </div>
                  <CardTitle className="text-base line-clamp-1 group-hover:text-[#2563EB] transition-colors">{assessment.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs mt-1 h-8">{assessment.description || "No description provided."}</CardDescription>
                </CardHeader>
                <CardContent className="py-4 flex-1">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{assessment.duration_minutes} mins</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ClipboardList className="h-4 w-4" />
                      <span className="font-medium">{assessment.total_marks} Marks</span>
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
                    onClick={() => router.push(`/student/assessments/${assessment.id}`)}
                  >
                    {isCompleted ? "View Result" : inProgress ? "Resume Assessment" : "Start Assessment"}
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
