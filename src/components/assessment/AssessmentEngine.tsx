"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Loader2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CodeEditor } from "@/components/coding/code-editor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { StudentTopNav } from "@/components/layouts/student-top-nav";

export function AssessmentEngine({ assessment, questions, initialAttempt }: any) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [attempt, setAttempt] = useState<any>(initialAttempt);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string[]>>(
    initialAttempt?.answers || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNavigator, setShowNavigator] = useState(true);

  // Time remaining
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (attempt?.status === "in_progress" && attempt.expires_at) {
      const interval = setInterval(() => {
        const remaining = new Date(attempt.expires_at).getTime() - Date.now();
        if (remaining <= 0) {
          setTimeLeft(0);
          handleFinalSubmit(); // auto-submit
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [attempt]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/student/assessments/${assessment.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAttempt(data.attempt);
    } catch (err: any) {
      toast({ title: "Failed to start", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveMcqAnswer = async (questionId: string, answerId: string) => {
    const newAnswers = { ...mcqAnswers, [questionId]: [answerId] }; // simple single choice for now
    setMcqAnswers(newAnswers);

    if (attempt) {
      setIsSaving(true);
      try {
        await fetch(`/api/student/assessments/${assessment.id}/attempt`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attempt_id: attempt.id, answers: newAnswers })
        });
      } catch (err) {
        console.error("Failed to save MCQ answer", err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleFinalSubmit = async () => {
    if (!attempt) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/student/assessments/${assessment.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", attempt_id: attempt.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAttempt(data.result);
      toast({ title: "Assessment Submitted!", description: "Your results have been recorded." });
    } catch (err: any) {
      toast({ title: "Submit Failed", description: err.message, variant: "destructive" });
      setIsSubmitting(false); // only re-enable if failed
    }
  };

  const handleCodingSubmit = async (code: string, language: string) => {
    try {
      setIsSubmitting(true);
      const activeQ = questions[currentIdx];
      const res = await fetch("/api/code/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: activeQ.id,
          language,
          code,
          assessment_attempt_id: attempt.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Code Submitted", description: "Test cases evaluated and saved." });
      // In a real app we'd save this result into a map to show pass/fail state immediately.
    } catch (err: any) {
      toast({ title: "Code Execution Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!attempt || attempt.status !== "in_progress") {
    return (
      <div className="flex flex-col h-screen bg-[#F9FAFB] dark:bg-[#09090B]">
        <StudentTopNav />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-xl border-t-4 border-t-[#2563EB]">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold mb-2">{assessment.title}</h1>
              {attempt?.status === "submitted" ? (
                <>
                  <CheckCircle2 className="w-16 h-16 text-[#16A34A] mb-4" />
                  <p className="text-muted-foreground mb-6">You have completed this assessment.</p>
                  <p className="text-xl font-bold">Score: {attempt.score} / {attempt.total_marks}</p>
                  <Button className="mt-6 w-full" onClick={() => router.push("/student/assessments")}>
                    Back to Assessments
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-6">
                    {assessment.description || "You are about to start a timed assessment."}
                  </p>
                  <div className="flex gap-4 text-sm font-medium mb-8 bg-muted p-4 rounded-xl w-full justify-around">
                    <div className="flex flex-col items-center"><span className="text-xs text-muted-foreground">Questions</span>{questions.length}</div>
                    <div className="flex flex-col items-center"><span className="text-xs text-muted-foreground">Duration</span>{assessment.duration_minutes}m</div>
                  </div>
                  <Button 
                    className="w-full h-12 text-lg font-bold bg-[#2563EB] hover:bg-[#1D4ED8]" 
                    onClick={handleStart}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Start Assessment"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeQ = questions[currentIdx];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-[#111827] dark:text-[#FAFAFA]">
      {/* HEADER */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-4 z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowNavigator(!showNavigator)}>
            <List className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-sm">{assessment.title}</h1>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-2">
              Question {currentIdx + 1} of {questions.length}
              {isSaving && <span className="text-[#2563EB] flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Saving</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono font-bold bg-muted px-3 py-1.5 rounded-md text-sm border border-border">
            <Clock className={`h-4 w-4 ${timeLeft < 300000 ? "text-red-500 animate-pulse" : "text-primary"}`} />
            <span className={timeLeft < 300000 ? "text-red-500" : ""}>{formatTime(timeLeft)}</span>
          </div>
          <Button 
            variant="default" 
            className="bg-[#16A34A] hover:bg-[#15803D] h-9 px-6 font-semibold"
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Assessment
          </Button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* NAVIGATOR SIDEBAR */}
        {showNavigator && (
          <div className="w-64 border-r border-border bg-card/50 flex flex-col p-3 overflow-y-auto shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-2">Navigator</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q: any, idx: number) => {
                const isAnswered = q.qType === "mcq" ? !!mcqAnswers[q.id] : false; // Coding state logic requires deeper tracking
                const isActive = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`
                      aspect-square rounded flex items-center justify-center text-xs font-bold transition-all
                      ${isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary text-primary-foreground" : 
                        isAnswered ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800" : 
                        "bg-muted hover:bg-muted/80 border border-border"}
                    `}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ACTIVE QUESTION RENDERER */}
        <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
          {activeQ.qType === "mcq" ? (
            <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
              <Badge className="mb-4 bg-[#2563EB]">Multiple Choice ({activeQ.marks} Marks)</Badge>
              <h2 className="text-lg font-medium mb-8 leading-relaxed whitespace-pre-wrap">{activeQ.text}</h2>
              <RadioGroup 
                value={mcqAnswers[activeQ.id]?.[0] || ""} 
                onValueChange={(val) => saveMcqAnswer(activeQ.id, val)}
                className="space-y-3"
              >
                {activeQ.options.map((opt: any) => (
                  <Label 
                    key={opt.id}
                    className={`
                      flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all hover:bg-muted/50
                      ${mcqAnswers[activeQ.id]?.[0] === opt.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}
                    `}
                  >
                    <RadioGroupItem value={opt.id} id={opt.id} />
                    <span className="text-sm font-medium">{opt.text}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          ) : (
            <div className="flex-1 h-full flex flex-col">
              <CodeEditor
                problem={{
                  ...activeQ,
                  test_cases: activeQ.sample_test_cases // Map correctly for the editor
                }}
                defaultLanguage="java"
                height="100%"
                showSubmit={true}
                isSubmitting={isSubmitting}
                onSubmit={handleCodingSubmit}
                showQuestionToggle={false}
                showNavigatorToggle={false}
              />
            </div>
          )}

          {/* QUESTION FOOTER (for MCQs or general nav) */}
          {activeQ.qType === "mcq" && (
            <div className="h-16 border-t border-border bg-card/80 backdrop-blur flex items-center justify-between px-6 shrink-0 mt-auto">
              <Button 
                variant="outline" 
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
              <Button 
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIdx === questions.length - 1}
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
