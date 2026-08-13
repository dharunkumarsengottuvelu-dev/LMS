"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AssessmentEngine } from "@/components/assessment/AssessmentEngine";
import { useToast } from "@/hooks/use-toast";

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const assessmentId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ assessment: any, questions: any[], attempt: any } | null>(null);

  useEffect(() => {
    if (!assessmentId) return;

    const fetchAssessment = async () => {
      try {
        const res = await fetch(`/api/student/assessments/${assessmentId}`);
        const result = await res.json();
        
        if (!res.ok) {
          throw new Error(result.error || "Failed to load assessment");
        }
        
        setData({
          assessment: result.assessment,
          questions: result.questions,
          attempt: result.attempt
        });
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        router.push("/student/assessments");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId, router, toast]);

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9FAFB] dark:bg-[#09090B]">
        <Loader2 className="h-10 w-10 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  return (
    <AssessmentEngine 
      assessment={data.assessment} 
      questions={data.questions} 
      initialAttempt={data.attempt} 
    />
  );
}
