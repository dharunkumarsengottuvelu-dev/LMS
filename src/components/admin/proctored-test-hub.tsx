"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList, Plus, Search, ShieldAlert, ShieldCheck, Clock, Users,
  Award, Eye, Trash2, Play, ArrowLeft, Sparkles, Lock, FileText, CheckSquare, Settings,
  CheckCircle2, AlertCircle, Send, Check, Code2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CodingProblemCreator } from "@/components/admin/coding-problem-creator";

export interface ScheduledTest {
  id: string;
  title: string;
  batch: string;
  duration: number;
  totalQuestions: number;
  maxMarks: number;
  status: "live" | "scheduled" | "completed";
  submissionsCount: number;
  totalEnrolled: number;
  proctoringFlags: string[];
  assignedBatches?: string[];
  questions?: TestQuestion[];
  allowedQuestionTypes?: "coding" | "mcq" | "both";
  sections?: string[];
}

export interface TestQuestion {
  id: string;
  title: string;
  type: "coding" | "mcq" | "msq" | "both";
  marks: number;
  section: string;
}

const initialTests: ScheduledTest[] = [];

type ViewState = "list" | "wizard" | "exam-dashboard" | "add-question";

import { useLMSStore } from "@/lib/store/lms-store";
import type { Assessment } from "@/types/assessment";

export function ProctoredTestHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const { assessments: storeAssessments, updateAssessmentsList, batches: storeBatches, students: storeStudents } = useLMSStore();

  const allBatches = storeBatches.length > 0
    ? storeBatches.map((b: any) => b.batchName || b.id)
    : Array.from(new Set(storeStudents.map((s) => s.batch || s.batchId).filter((b): b is string => Boolean(b))));

  const [tests, setTests] = useState<ScheduledTest[]>(() => {
    return storeAssessments.length > 0 ? (storeAssessments as unknown as ScheduledTest[]) : initialTests;
  });

  useEffect(() => {
    if (storeAssessments) {
      setTests(storeAssessments as unknown as ScheduledTest[]);
    }
  }, [storeAssessments]);

  const syncTestsToStore = (newTests: ScheduledTest[]) => {
    setTests(newTests);
    updateAssessmentsList(newTests as unknown as Assessment[]);
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedTest, setSelectedTest] = useState<ScheduledTest | null>(null);

  // Form State for Create Wizard
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newDuration, setNewDuration] = useState(60);
  const [newStatus, setNewStatus] = useState<"live" | "scheduled">("scheduled");
  const [secWebcam, setSecWebcam] = useState(true);
  const [secFullscreen, setSecFullscreen] = useState(true);
  const [secTabSwitch, setSecTabSwitch] = useState(true);
  const [secCopyPaste, setSecCopyPaste] = useState(true);
  const [secMultipleScreens, setSecMultipleScreens] = useState(false);
  const [secSEB, setSecSEB] = useState(false);
  const [newAllowedTypes, setNewAllowedTypes] = useState<"coding" | "mcq" | "both">("both");

  // Form State for Add Question
  const [manualQuestionTitle, setManualQuestionTitle] = useState("");
  const [manualQuestionType, setManualQuestionType] = useState("coding");
  const [manualQuestionSection, setManualQuestionSection] = useState("");
  const [customSectionName, setCustomSectionName] = useState("");
  const [manualQuestionMarks, setManualQuestionMarks] = useState(10);
  const [showCodingProblemBuilder, setShowCodingProblemBuilder] = useState(false);
  const [manualTestCases, setManualTestCases] = useState([{ id: 1, input: "", output: "", isHidden: false }]);
  const [manualMCQOptions, setManualMCQOptions] = useState([
    { id: 1, text: "", isCorrect: false },
    { id: 2, text: "", isCorrect: false }
  ]);

  // Assign Modal State
  const [assigningTest, setAssigningTest] = useState<ScheduledTest | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  
  // Section Management State
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const filtered = tests.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newExam: ScheduledTest = {
      id: `t_${Date.now()}`,
      title: newTitle,
      batch: "Unassigned",
      duration: newDuration,
      totalQuestions: 0,
      maxMarks: 0,
      status: newStatus,
      submissionsCount: 0,
      totalEnrolled: 0,
      proctoringFlags: [
        ...(secWebcam ? ["12 Camera Rules Face Monitoring"] : []),
        ...(secFullscreen ? ["Fullscreen Lock"] : []),
        ...(secTabSwitch ? ["Tab Switch Security"] : []),
        ...(secCopyPaste ? ["Copy-Paste Lock"] : []),
        ...(secMultipleScreens ? ["Multi-Screen Detection"] : []),
        ...(secSEB ? ["Safe Exam Browser (SEB)"] : []),
      ],
      assignedBatches: [],
      questions: [],
      allowedQuestionTypes: newAllowedTypes
    };

    setTests((prev) => [newExam, ...prev]);
    setViewState("list");
    setNewTitle("");
    toast({
      title: "Proctored Exam Created",
      description: `"${newTitle}" has been created. You can now add questions and assign it.`,
    });
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest || !manualQuestionTitle) return;

    const finalSection = manualQuestionSection === "custom" ? customSectionName.trim() : manualQuestionSection.trim();
    const newQ: TestQuestion = {
      id: `q_${Date.now()}`,
      title: manualQuestionTitle,
      type: manualQuestionType as "coding" | "mcq" | "msq" | "both",
      marks: manualQuestionMarks,
      section: finalSection || (manualQuestionType === "coding" ? "Programming Task" : manualQuestionType === "both" ? "Hybrid Task" : "Multiple Choice")
    };

    const updatedTest = {
      ...selectedTest,
      totalQuestions: (selectedTest.totalQuestions || 0) + 1,
      maxMarks: (selectedTest.maxMarks || 0) + manualQuestionMarks,
      questions: [...(selectedTest.questions || []), newQ]
    };

    setTests(prev => prev.map(t => t.id === selectedTest.id ? updatedTest : t));
    setSelectedTest(updatedTest);
    setViewState("exam-dashboard");
    setManualQuestionTitle("");
    setManualQuestionSection("");
    setCustomSectionName("");
    toast({ title: "Question Added", description: "Successfully added to the test pool." });
  };
  
  const handleAddSection = () => {
    if (!newSectionTitle.trim() || !selectedTest) return;
    
    const currentSections = selectedTest.sections || [];
    if (!currentSections.includes(newSectionTitle.trim())) {
      const updatedTest = { ...selectedTest, sections: [...currentSections, newSectionTitle.trim()] };
      setTests(tests.map(t => t.id === selectedTest.id ? updatedTest : t));
      setSelectedTest(updatedTest);
    }
    
    setNewSectionTitle("");
    setIsAddingSection(false);
    toast({ title: "Section Created", description: `Added section: ${newSectionTitle.trim()}` });
  };

  const handleDeleteTest = (id: string, title: string) => {
    setTests((prev) => prev.filter((t) => t.id !== id));
    toast({
      title: "Exam Cancelled",
      description: `${title} removed from schedule.`,
      variant: "destructive",
    });
  };

  const openAssignModal = (test: ScheduledTest) => {
    setAssigningTest(test);
    setSelectedBatches(test.assignedBatches || []);
  };

  const handleSaveAssignments = () => {
    if (!assigningTest) return;
    setTests(prev => prev.map(t => 
      t.id === assigningTest.id ? { 
        ...t, 
        assignedBatches: selectedBatches,
        batch: selectedBatches.length > 0 ? (selectedBatches[0] ?? "Unassigned") : "Unassigned",
        totalEnrolled: selectedBatches.length * 50 // Mock enrollment count
      } : t
    ));
    setAssigningTest(null);
    toast({ title: "Exam Assigned", description: `Assigned to ${selectedBatches.length} batches.` });
  };

  const renderAssignmentModal = () => {
    if (!assigningTest) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <Card className="w-full max-w-lg bg-white dark:bg-[#18181B] border-none shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-5 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">Assign Exam</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Select batches to take "{assigningTest.title}"</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#E5E7EB]" onClick={() => setAssigningTest(null)}>
              X
            </Button>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Select Batches</h4>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-bold text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/10"
                onClick={() => {
                  if (selectedBatches.length === allBatches.length) {
                    setSelectedBatches([]);
                  } else {
                    setSelectedBatches([...allBatches]);
                  }
                }}
              >
                {selectedBatches.length === allBatches.length ? "Deselect All" : "Select All Batches (Assign to Everyone)"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {allBatches.map(batch => {
                const isSelected = selectedBatches.includes(batch);
                return (
                  <div 
                    key={batch} 
                    onClick={() => {
                      if (isSelected) setSelectedBatches(prev => prev.filter(b => b !== batch));
                      else setSelectedBatches(prev => [...prev, batch]);
                    }}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20' 
                        : 'border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9CA3AF]'
                    }`}
                  >
                    <span className={`text-xs font-bold ${isSelected ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-[#4B5563] dark:text-[#D4D4D8]'}`}>
                      {batch}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAssigningTest(null)} className="h-9 text-xs font-bold">Cancel</Button>
            <Button onClick={handleSaveAssignments} className="h-9 text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white">Save Assignments</Button>
          </div>
        </Card>
      </div>
    );
  };

  // --- VIEWS ---

  if (viewState === "wizard") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button onClick={() => setViewState("list")} variant="outline" size="sm" className="h-9 font-bold text-xs">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">Create New Proctored Exam</h1>
            <p className="text-xs text-[#6B7280]">Define basics and security rules. You can add questions later.</p>
          </div>
        </div>

        <form onSubmit={handleCreateTest} className="space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] mb-6 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#2563EB]" /> General Details
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Exam Title</label>
                <Input placeholder="e.g. Core Java Final Assessment" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className="h-[48px] text-sm rounded-xl" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Exam Date</label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required className="h-[48px] text-sm rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Allowed Question Types</label>
                  <Select value={newAllowedTypes} onValueChange={(val) => setNewAllowedTypes((val as any))}>
                    <SelectTrigger className="h-[48px] text-xs rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both Coding & MCQ</SelectItem>
                      <SelectItem value="coding">Coding Only</SelectItem>
                      <SelectItem value="mcq">MCQ Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Start Time</label>
                  <Input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} required className="h-[48px] text-sm rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">End Time</label>
                  <Input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} required className="h-[48px] text-sm rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Duration (Mins)</label>
                  <Input type="number" value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))} required className="h-[48px] text-sm rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Initial Launch Status</label>
                  <Select value={newStatus} onValueChange={(val) => setNewStatus((val as any))}>
                    <SelectTrigger className="h-[48px] text-xs rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled (Starts at set time)</SelectItem>
                      <SelectItem value="live">Live Now (Immediate access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] mb-6 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#9333EA]" /> Anti-Cheating & Security
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex justify-between p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div><p className="text-sm font-bold">Webcam Monitoring</p><p className="text-[11px] text-[#6B7280]">Enforce 12-point facial tracking.</p></div>
                <Switch checked={secWebcam} onCheckedChange={setSecWebcam} />
              </div>
              <div className="flex justify-between p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div><p className="text-sm font-bold">Fullscreen Lock</p><p className="text-[11px] text-[#6B7280]">Force full screen mode.</p></div>
                <Switch checked={secFullscreen} onCheckedChange={setSecFullscreen} />
              </div>
              <div className="flex justify-between p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div><p className="text-sm font-bold">Tab Switch Security</p><p className="text-[11px] text-[#6B7280]">Flag tab switches.</p></div>
                <Switch checked={secTabSwitch} onCheckedChange={setSecTabSwitch} />
              </div>
              <div className="flex justify-between p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div><p className="text-sm font-bold">Copy-Paste Lock</p><p className="text-[11px] text-[#6B7280]">Disable clipboard.</p></div>
                <Switch checked={secCopyPaste} onCheckedChange={setSecCopyPaste} />
              </div>
              <div className="flex justify-between p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div><p className="text-sm font-bold text-[#2563EB]">Safe Exam Browser (SEB)</p><p className="text-[11px] text-[#6B7280]">Force strict OS-level lock down.</p></div>
                <Switch checked={secSEB} onCheckedChange={setSecSEB} />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setViewState("list")} className="h-[48px] px-6 font-bold text-xs rounded-xl">Cancel</Button>
            <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md">
              <Sparkles className="h-4 w-4" /> Create Exam Setup
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (viewState === "exam-dashboard" && selectedTest) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-center gap-3">
            <Button onClick={() => setViewState("list")} variant="outline" size="sm" className="h-9 font-bold text-xs">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">{selectedTest.title}</h1>
              <p className="text-xs text-[#6B7280]">Exam Dashboard • {selectedTest.totalQuestions} Questions • {selectedTest.maxMarks} Marks Total</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-9 font-bold text-xs bg-white dark:bg-[#18181B]" onClick={() => openAssignModal(selectedTest)}>
              <Users className="h-4 w-4 mr-2" /> Assign to Batches
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Assigned Questions & Sections</h3>
            <div className="p-6 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl space-y-6">
              
              {/* Existing Sections */}
              {(selectedTest.sections || []).length === 0 && (!selectedTest.questions || selectedTest.questions.length === 0) ? (
                <div className="p-8 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-center bg-[#F9FAFB] dark:bg-[#09090B]">
                  <ClipboardList className="h-8 w-8 text-[#9CA3AF] mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">No sections yet</h4>
                  <p className="text-xs text-[#6B7280] mt-1 mb-4">Start building your exam by adding a section below.</p>
                </div>
              ) : (
                (selectedTest.sections || []).map((section) => {
                  const sectionQuestions = selectedTest.questions?.map((q, idx) => ({ ...q, originalIndex: idx })).filter(q => q.section === section) || [];
                  return (
                    <div key={section} className="mb-6 last:mb-0">
                      <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-2 mb-4">
                        <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">{section}</h4>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-[11px] font-bold text-[#2563EB] hover:bg-[#2563EB]/10"
                          onClick={() => {
                            setManualQuestionSection(section);
                            setViewState("add-question");
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Question to {section}
                        </Button>
                      </div>
                      
                      {sectionQuestions.length === 0 ? (
                        <p className="text-[11px] text-[#6B7280] italic">No questions in this section yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {sectionQuestions.map((q) => (
                            <div 
                              key={q.id} 
                              className="w-10 h-10 border border-[#E5E7EB] dark:border-[#27272A] rounded-lg flex items-center justify-center text-xs font-bold text-[#4B5563] dark:text-[#D4D4D8] bg-white dark:bg-[#18181B] hover:border-[#2563EB] hover:text-[#2563EB] cursor-pointer transition-colors shadow-sm"
                              title={`${q.originalIndex + 1}. ${q.title} (${q.marks} Marks)`}
                            >
                              {q.originalIndex + 1}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Add New Section UI */}
              <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                {isAddingSection ? (
                  <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Type new section title (e.g. Quantitative Ability)..." 
                        value={newSectionTitle} 
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        className="h-9 text-xs"
                        autoFocus
                      />
                      <Button className="h-9 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D]" onClick={handleAddSection}>
                        Save Section
                      </Button>
                      <Button variant="ghost" className="h-9 text-xs text-[#6B7280]" onClick={() => setIsAddingSection(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-10 border-dashed border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/5 font-bold text-xs"
                    onClick={() => setIsAddingSection(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add New Section
                  </Button>
                )}
              </div>

            </div>
          </div>
          
          <div className="space-y-6">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Live Attendance</h3>
                <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
                  <div className="text-3xl font-black text-[#2563EB]">{selectedTest.submissionsCount}</div>
                  <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mt-1">Out of {selectedTest.totalEnrolled} Enrolled</div>
                </div>
                <Link href={`/admin/tests/inspect/${selectedTest.id}`} className="block w-full">
                  <Button className="w-full h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-2">
                    <Play className="h-4 w-4" /> Inspect Live Test
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Security Posture</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTest.proctoringFlags.map(flag => (
                    <Badge key={flag} variant="outline" className="bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/30 text-[10px] font-bold">
                      <ShieldCheck className="h-3 w-3 mr-1" /> {flag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {renderAssignmentModal()}
      </div>
    );
  }

  if (viewState === "add-question" && selectedTest) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button onClick={() => setViewState("exam-dashboard")} variant="outline" size="sm" className="h-9 font-bold text-xs">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">Build New Question</h1>
            <p className="text-xs text-[#6B7280]">Adding question to: {selectedTest.title} {manualQuestionSection && <span className="font-bold text-[#2563EB] ml-2">• Section: {manualQuestionSection}</span>}</p>
          </div>
        </div>

        <form onSubmit={handleAddQuestion} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[#2563EB]" /> Inline Question Builder
              </h3>
              <Select value={manualQuestionType} onValueChange={(val) => val && setManualQuestionType(val as any)}>
                <SelectTrigger className="h-9 text-xs w-[160px] bg-[#F9FAFB] dark:bg-[#09090B]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(selectedTest.allowedQuestionTypes === "both" || selectedTest.allowedQuestionTypes === "coding" || !selectedTest.allowedQuestionTypes) && (
                    <SelectItem value="coding">Programming Task</SelectItem>
                  )}
                  {(selectedTest.allowedQuestionTypes === "both" || selectedTest.allowedQuestionTypes === "mcq" || !selectedTest.allowedQuestionTypes) && (
                    <>
                      <SelectItem value="mcq">Single Choice (MCQ)</SelectItem>
                      <SelectItem value="msq">Multiple Select (MSQ)</SelectItem>
                    </>
                  )}
                  {(selectedTest.allowedQuestionTypes === "both" || !selectedTest.allowedQuestionTypes) && (
                    <SelectItem value="both">Hybrid (Coding + MCQ)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Problem Statement</label>
                  <textarea 
                    className="w-full min-h-[120px] p-4 text-sm rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] focus:ring-2 focus:ring-[#2563EB] outline-none transition-all resize-y"
                    placeholder="Describe the problem, input constraints, and expected output..."
                    value={manualQuestionTitle}
                    onChange={(e) => setManualQuestionTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Marks Allocated</label>
                  <Input type="number" value={manualQuestionMarks} onChange={(e) => setManualQuestionMarks(Number(e.target.value))} required className="h-10 text-sm rounded-lg" />
                </div>
              </div>

              {(manualQuestionType === "coding" || manualQuestionType === "both") && (
                <div className="space-y-4 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                  <CodingProblemCreator
                    inline
                    initialTitle={manualQuestionTitle || "Find the Largest Element"}
                    onChange={(problem) => {
                      if (!manualQuestionTitle && problem.title) setManualQuestionTitle(problem.title);
                      const allTC = [...problem.publicTestCases, ...problem.hiddenTestCases];
                      if (allTC.length > 0) {
                        setManualTestCases(allTC.map((t, index) => ({
                          id: index + 1,
                          input: t.input,
                          output: t.expected_output,
                          isHidden: t.is_hidden
                        })));
                      }
                    }}
                  />
                </div>
              )}

              {(manualQuestionType === "mcq" || manualQuestionType === "msq" || manualQuestionType === "both") && (
                <div className="space-y-4 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      {manualQuestionType === "msq" ? "Multiple Select Options" : "Single Choice Options"}
                    </label>
                    <Button type="button" onClick={() => setManualMCQOptions([...manualMCQOptions, { id: Date.now(), text: "", isCorrect: false }])} variant="outline" className="h-8 px-3 text-[10px] font-bold">
                      <Plus className="h-3 w-3 mr-1" /> Add Option
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {manualMCQOptions.map((opt, idx) => (
                      <div key={opt.id} className={`flex items-center gap-3 p-3 border ${opt.isCorrect ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20' : 'border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]'} rounded-xl group transition-all`}>
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[10px] font-bold text-[#6B7280]">
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <Input 
                          value={opt.text} 
                          onChange={(e) => setManualMCQOptions(manualMCQOptions.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o))} 
                          placeholder={`Option ${idx + 1}`} 
                          className="h-9 text-xs flex-1 bg-white dark:bg-[#18181B]" 
                        />
                        <label className="flex items-center gap-2 cursor-pointer ml-2 pr-2">
                          {(manualQuestionType === "mcq" || manualQuestionType === "both") ? (
                            <input 
                              type="radio" 
                              name="mcq-correct-answer"
                              checked={opt.isCorrect}
                              onChange={() => setManualMCQOptions(manualMCQOptions.map(o => ({ ...o, isCorrect: o.id === opt.id })))}
                              className="w-4 h-4 text-[#2563EB] cursor-pointer"
                            />
                          ) : (
                            <Switch 
                              checked={opt.isCorrect} 
                              onCheckedChange={(checked) => setManualMCQOptions(manualMCQOptions.map(o => o.id === opt.id ? { ...o, isCorrect: checked } : o))} 
                              className="scale-75" 
                            />
                          )}
                          <span className={`text-[10px] font-bold ${opt.isCorrect ? 'text-[#2563EB]' : 'text-[#6B7280]'}`}>
                            Correct Answer
                          </span>
                        </label>
                        <button type="button" onClick={() => manualMCQOptions.length > 2 && setManualMCQOptions(manualMCQOptions.filter(o => o.id !== opt.id))} className="text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-8">
              <Button type="submit" className="h-10 px-6 bg-[#111827] dark:bg-white text-white dark:text-[#111827] text-xs font-bold rounded-xl shadow-sm gap-2">
                <CheckCircle2 className="h-4 w-4" /> Save Question to Exam
              </Button>
            </div>
          </Card>
        </form>
      </div>
    );
  }

  // --- MAIN LIST VIEW ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {role === "admin" ? "Proctored Examination Manager" : "Assessment & Test Creator"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Build proctored tests, assign them to batches, and monitor live submissions.
          </p>
        </div>

        <Button onClick={() => setViewState("wizard")} className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20">
          <Plus className="h-4 w-4" /> Create New Exam
        </Button>
      </div>

      {/* Premium MNC Level Filter Controls */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-2">
        
        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-x-auto w-full md:w-auto">
          {[
            { id: "all", label: "All Exams" },
            { id: "live", label: "Live Now" },
            { id: "scheduled", label: "Scheduled" },
            { id: "completed", label: "Completed" }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex-shrink-0 ${
                statusFilter === filter.id
                  ? 'bg-white dark:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#18181B]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Enhanced Search Input */}
        <div className="relative w-full md:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
          </div>
          <Input 
            placeholder="Search exams by title..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-10 h-11 text-xs border-transparent bg-[#F9FAFB] dark:bg-[#09090B] hover:bg-[#F3F4F6] dark:hover:bg-[#18181B] focus:border-[#2563EB] focus:bg-white dark:focus:bg-[#18181B] rounded-xl transition-all shadow-none" 
          />
        </div>
      </div>

      {/* Exams Table */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">Assessment Title</th>
                <th className="p-4">Assigned Batches</th>
                <th className="p-4">Duration & Marks</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors group">
                  <td className="p-4 pl-6 space-y-0.5">
                    <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{t.title}</p>
                    <p className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3 text-[#16A34A]" /> {t.proctoringFlags.length} Security Rules Active
                    </p>
                  </td>

                  <td className="p-4">
                    {t.assignedBatches && t.assignedBatches.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.assignedBatches.map(b => (
                          <Badge key={b} variant="outline" className="text-[10px] font-bold border-[#2563EB]/30 text-[#2563EB]">{b}</Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold text-[#9CA3AF] border-dashed">Unassigned</Badge>
                    )}
                  </td>

                  <td className="p-4 text-xs font-medium text-[#6B7280]">
                    <span>{t.duration} mins • {t.totalQuestions} Qs ({t.maxMarks} Marks)</span>
                  </td>

                  <td className="p-4">
                    <Badge className={`text-[10px] font-bold uppercase ${
                      t.status === "live" ? "bg-[#16A34A] text-white" : t.status === "scheduled" ? "bg-[#2563EB] text-white" : "bg-[#6B7280] text-white"
                    }`}>
                      {t.status}
                    </Badge>
                  </td>

                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openAssignModal(t)} className="h-8 text-[11px] font-bold">
                        Assign
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => { setSelectedTest(t); setViewState("exam-dashboard"); }}
                        className="h-8 text-[11px] bg-[#111827] dark:bg-white text-white dark:text-[#111827] font-bold hover:bg-[#374151]"
                      >
                        Manage Exam
                      </Button>
                      <Button onClick={() => handleDeleteTest(t.id, t.title)} variant="ghost" size="icon" className="h-8 w-8 text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {renderAssignmentModal()}

    </div>
  );
}
