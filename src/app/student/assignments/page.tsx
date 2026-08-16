"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Upload, CheckCircle2, Clock, Link as LinkIcon, FileCheck,
  AlertCircle, ChevronRight, Award, ExternalLink, Download, MessageSquare, Send, Check, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface AssignmentItem {
  id: string;
  title: string;
  course: string;
  deadline: string;
  maxMarks: number;
  status: "pending" | "submitted" | "graded";
  instructions: string;
  attachmentName?: string;
  score?: number;
  trainerFeedback?: string;
  submittedUrl?: string;
  submittedFileName?: string;
  submittedNotes?: string;
  submittedAt?: string;
}

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("all");
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/assignments");
      if (res.ok) {
        const data = await res.json();
        if (data.assignments) {
          setAssignments(data.assignments);
        }
      }
    } catch (err) {
      console.error("Failed to load student assignments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Form State
  const [repoUrl, setRepoUrl] = useState("");
  const [remarksNotes, setRemarksNotes] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenSubmitModal = (item: AssignmentItem) => {
    setSelectedAssignment(item);
    setRepoUrl(item.submittedUrl || "");
    setRemarksNotes(item.submittedNotes || "");
    setUploadedFileName(item.submittedFileName || "");
    setIsSubmitModalOpen(true);
  };

  const handleOpenDetailsModal = (item: AssignmentItem) => {
    setSelectedAssignment(item);
    setIsViewDetailsModalOpen(true);
  };

  const handleFileUploadSimulated = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      toast({
        title: "File Attached",
        description: `Attached ${e.target.files[0].name}`,
      });
    }
  };

  const handleFinalizeSubmission = async () => {
    if (!selectedAssignment) return;
    if (!repoUrl && !uploadedFileName) {
      toast({
        variant: "destructive",
        title: "Submission Required",
        description: "Please provide either a GitHub/Live App URL or upload a solution document.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/student/assignments/${selectedAssignment.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUrl: repoUrl,
          solutionFileUrl: uploadedFileName,
          remarks: remarksNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit assignment");
      }

      toast({
        title: "Assignment Solution Submitted",
        description: "Your submission has been sent to your trainer for evaluation.",
      });
      setIsSubmitModalOpen(false);
      fetchAssignments();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssignments = assignments.filter((item) => {
    if (activeTab === "pending") return item.status === "pending";
    if (activeTab === "submitted") return item.status === "submitted";
    if (activeTab === "graded") return item.status === "graded";
    return true;
  });

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* 1. Header */}
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[36px] font-bold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Assignments & Project Submissions
          </h1>
        </div>
      </div>

      {/* 2. Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-[#F3F4F6] dark:bg-[#18181B] p-1 h-12 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] w-fit flex gap-1">
          <TabsTrigger value="all" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            All Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            Pending Submission ({assignments.filter((a) => a.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            Submitted ({assignments.filter((a) => a.status === "submitted").length})
          </TabsTrigger>
          <TabsTrigger value="graded" className="h-10 px-5 text-xs font-semibold rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">
            Graded ({assignments.filter((a) => a.status === "graded").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="w-full mt-6">
          {filteredAssignments.length === 0 ? (
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-12 text-center rounded-2xl w-full">
              <FileText className="h-12 w-12 text-[#2563EB] mx-auto mb-4 opacity-80" />
              <h3 className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">No Assignments Assigned Yet</h3>
              <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] max-w-md mx-auto mt-2">
                Assignments created or assigned in the Admin or Trainer panel will appear here automatically in real-time.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {filteredAssignments.map((item) => (
              <Card
                key={item.id}
                className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm hover:border-[#2563EB]/50 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-6 pb-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                      {item.course}
                    </Badge>

                    {item.status === "pending" && (
                      <Badge className="bg-[#F59E0B] text-white text-[10px] uppercase font-bold">
                        Pending
                      </Badge>
                    )}
                    {item.status === "submitted" && (
                      <Badge className="bg-[#2563EB] text-white text-[10px] uppercase font-bold">
                        Under Review
                      </Badge>
                    )}
                    {item.status === "graded" && (
                      <Badge className="bg-[#16A34A] text-white text-[10px] uppercase font-bold">
                        Graded ({item.score}/{item.maxMarks})
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                    {item.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280] flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#2563EB]" /> Deadline:
                      </span>
                      <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{item.deadline}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280] flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-[#2563EB]" /> Max Score:
                      </span>
                      <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{item.maxMarks} Marks</span>
                    </div>

                    {item.attachmentName && (
                      <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between text-[11px]">
                        <span className="text-[#6B7280]">Brief:</span>
                        <span className="font-bold text-[#2563EB] flex items-center gap-1">
                          <Download className="h-3 w-3" /> {item.attachmentName}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] line-clamp-2 leading-relaxed">
                    {item.instructions}
                  </p>
                </CardContent>

                <CardFooter className="p-6 pt-0 flex gap-2">
                  {item.status === "pending" ? (
                    <Button
                      onClick={() => handleOpenSubmitModal(item)}
                      className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2"
                    >
                      <Upload className="h-4 w-4" /> Submit Solution
                    </Button>
                  ) : item.status === "submitted" ? (
                    <Button
                      onClick={() => handleOpenSubmitModal(item)}
                      variant="outline"
                      className="w-full h-[44px] border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10 font-bold gap-2"
                    >
                      <Upload className="h-4 w-4" /> Resubmit Solution
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleOpenDetailsModal(item)}
                      variant="secondary"
                      className="w-full h-[44px] font-bold gap-2"
                    >
                      <Award className="h-4 w-4 text-[#16A34A]" /> View Evaluation Feedback
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 3. INTERACTIVE SUBMISSION MODAL */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
              Submit Assignment Solution
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280] pt-1">
              {selectedAssignment?.title} ({selectedAssignment?.course})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            
            {/* GitHub / Live URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">
                GitHub Repository or Live App URL
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-[#6B7280]" />
                <Input
                  placeholder="https://github.com/username/project-repo"
                  className="pl-9 h-[44px] text-xs"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Document Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">
                Upload Solution File (.pdf, .docx, .zip)
              </Label>
              <div className="border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl p-4 text-center space-y-2 relative bg-[#F9FAFB] dark:bg-[#09090B]">
                <Upload className="h-6 w-6 text-[#2563EB] mx-auto" />
                <p className="text-xs text-[#6B7280]">
                  {uploadedFileName ? (
                    <strong className="text-[#16A34A]">{uploadedFileName}</strong>
                  ) : (
                    "Click to attach your submission document"
                  )}
                </p>
                <input
                  type="file"
                  onChange={handleFileUploadSimulated}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Student Remarks */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">
                Remarks / Notes for Trainer
              </Label>
              <Textarea
                placeholder="Add notes about your implementation architecture or setup steps..."
                className="text-xs min-h-[90px]"
                value={remarksNotes}
                onChange={(e) => setRemarksNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button variant="outline" className="h-[44px] px-5 text-xs font-semibold" onClick={() => setIsSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isSubmitting}
              className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2"
              onClick={handleFinalizeSubmission}
            >
              {isSubmitting ? "Submitting Solution..." : "Finalize & Submit Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. GRADED DETAILS & TRAINER FEEDBACK MODAL */}
      <Dialog open={isViewDetailsModalOpen} onOpenChange={setIsViewDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#16A34A]">
              <Award className="h-6 w-6" />
              <DialogTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                Trainer Evaluation Feedback
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280] pt-1">
              {selectedAssignment?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#16A34A]">Evaluation Grade Score</p>
                <p className="text-2xl font-extrabold text-[#111827] dark:text-[#FAFAFA]">
                  {selectedAssignment?.score} / {selectedAssignment?.maxMarks} Marks
                </p>
              </div>
              <Badge className="bg-[#16A34A] text-white text-xs font-bold px-3 py-1">
                Passed (96%)
              </Badge>
            </div>

            <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
              <p className="font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-[#2563EB]" /> Trainer Feedback Comments
              </p>
              <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                "{selectedAssignment?.trainerFeedback}"
              </p>
            </div>

            {selectedAssignment?.submittedUrl && (
              <div className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-1">
                <p className="text-[11px] font-bold text-[#6B7280]">Submitted GitHub Repository</p>
                <a
                  href={selectedAssignment.submittedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  {selectedAssignment.submittedUrl} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button className="w-full h-[44px] font-bold" onClick={() => setIsViewDetailsModalOpen(false)}>
              Close Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
