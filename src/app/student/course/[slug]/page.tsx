"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Play, CheckCircle2, ArrowLeft, Video, HelpCircle, Code2,
  Terminal, PlayCircle, CheckSquare, Sparkles, Send, RefreshCw, FileText,
  Download, Paperclip, FileCode, FileSpreadsheet, ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

function getYouTubeEmbedUrl(url?: string): string {
  if (!url) return "https://www.youtube.com/embed/wm5gMKCOm4U";
  if (url.includes("youtube.com/embed/")) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return url;
}

type ContentType = "video" | "mcq" | "coding";

interface LessonResource {
  id: string;
  title: string;
  format: "pdf" | "word" | "docx";
  size: string;
  downloadUrl: string;
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: ContentType;
  completed: boolean;
  videoUrl?: string;
  resources?: LessonResource[];
  mcqData?: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  };
  codingData?: {
    problemStatement: string;
    starterCode: Record<string, string>;
    sampleOutput: string;
  };
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

const mockModules: Module[] = [
  {
    id: "m1",
    title: "Module 1: Introduction to Next.js 16 App Router",
    lessons: [
      {
        id: "l1",
        title: "1.1 Architecture & Server Components Overview",
        duration: "12 mins",
        type: "video",
        completed: true,
        videoUrl: "https://www.youtube.com/embed/Sklc_poWXJ4",
        resources: [
          {
            id: "r1",
            title: "NextJS_16_App_Router_Architecture_Cheatsheet.pdf",
            format: "pdf",
            size: "2.4 MB",
            downloadUrl: "#"
          },
          {
            id: "r2",
            title: "Server_vs_Client_Components_Guide.docx",
            format: "docx",
            size: "1.2 MB",
            downloadUrl: "#"
          }
        ]
      },
      {
        id: "l2",
        title: "1.2 Quiz: Test your App Router & RLS Knowledge",
        duration: "10 mins",
        type: "mcq",
        completed: true,
        resources: [
          {
            id: "r3",
            title: "App_Router_Quiz_Study_Summary.pdf",
            format: "pdf",
            size: "850 KB",
            downloadUrl: "#"
          }
        ],
        mcqData: {
          question: "Which directive is used in Next.js 16 to declare a component as a Client Component?",
          options: [
            "'use server'",
            "'use client'",
            "'use react'",
            "'use static'"
          ],
          correctAnswer: 1,
          explanation: "In Next.js App Router, placing 'use client' at the top of a file boundary marks it as a Client Component, allowing hook usage like useState and useEffect."
        }
      },
      {
        id: "l3",
        title: "1.3 Hands-on Coding: Build a Dynamic Route Handler",
        duration: "25 mins",
        type: "coding",
        completed: false,
        resources: [
          {
            id: "r4",
            title: "Route_Handler_Code_Snippets.docx",
            format: "word",
            size: "1.8 MB",
            downloadUrl: "#"
          }
        ],
        codingData: {
          problemStatement: "Write a function `calculateProgress(completed, total)` that takes completed lessons and total lessons, and returns the percentage rounded to the nearest integer.",
          starterCode: {
            javascript: "function calculateProgress(completed, total) {\n  // Write your code here\n  return Math.round((completed / total) * 100);\n}\n\nconsole.log(calculateProgress(8, 10));",
            python: "def calculate_progress(completed, total):\n    # Write your code here\n    return round((completed / total) * 100)\n\nprint(calculate_progress(8, 10))",
            typescript: "function calculateProgress(completed: number, total: number): number {\n  return Math.round((completed / total) * 100);\n}\n\nconsole.log(calculateProgress(8, 10));",
          },
          sampleOutput: "80%",
        }
      },
    ],
  },
  {
    id: "m2",
    title: "Module 2: Supabase Integration & RLS Security",
    lessons: [
      {
        id: "l4",
        title: "2.1 Database Schema & PostgreSQL Enums",
        duration: "15 mins",
        type: "video",
        completed: false,
        resources: [
          {
            id: "r5",
            title: "PostgreSQL_Enums_and_Types_Reference.pdf",
            format: "pdf",
            size: "3.1 MB",
            downloadUrl: "#"
          }
        ]
      },
      {
        id: "l5",
        title: "2.2 Practice Quiz: Row Level Security Policies",
        duration: "12 mins",
        type: "mcq",
        completed: false,
        mcqData: {
          question: "What does Supabase Row Level Security (RLS) `auth.uid()` represent in a policy condition?",
          options: [
            "The database admin superuser ID",
            "The currently authenticated user's unique UUID",
            "The IP address of the requesting browser",
            "The table primary key ID"
          ],
          correctAnswer: 1,
          explanation: "auth.uid() is a Supabase helper function that returns the unique UUID of the currently authenticated user in PostgreSQL policies."
        }
      },
      {
        id: "l6",
        title: "2.3 Coding Challenge: Secure RLS Policy Filter",
        duration: "30 mins",
        type: "coding",
        completed: false,
        codingData: {
          problemStatement: "Implement a filter function that validates if a user with role `student` can access a resource owned by `user_id`.",
          starterCode: {
            javascript: "function canAccess(userId, resourceOwnerId, role) {\n  if (role === 'admin') return true;\n  return userId === resourceOwnerId;\n}\n\nconsole.log(canAccess('user_123', 'user_123', 'student'));",
            python: "def can_access(user_id, resource_owner_id, role):\n    if role == 'admin':\n        return True\n    return user_id == resource_owner_id\n\nprint(can_access('user_123', 'user_123', 'student'))",
          },
          sampleOutput: "true",
        }
      }
    ],
  },
];

export default function StudentCoursePlayerPage() {
  const params = useParams();
  const rawSlug = params?.slug;
  const slug = (typeof rawSlug === "string" ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : "fullstack-web-development") || "fullstack-web-development";

  const { toast } = useToast();

  const [activeLesson, setActiveLesson] = useState<Lesson>(
    mockModules[0]?.lessons[0] || {
      id: "l1",
      title: "1.1 Architecture & Server Components Overview",
      duration: "12 mins",
      type: "video",
      completed: true,
    }
  );

  // MCQ State
  const [selectedMcqOption, setSelectedMcqOption] = useState<number | null>(null);
  const [mcqSubmitted, setMcqSubmitted] = useState(false);

  // Coding Lesson State
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  const [codeOutput, setCodeOutput] = useState<string | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);

  const handleLessonSelect = (les: Lesson) => {
    setActiveLesson(les);
    setSelectedMcqOption(null);
    setMcqSubmitted(false);
    setCodeOutput(null);
    if (les.type === "coding" && les.codingData) {
      setCodeContent(les.codingData.starterCode[selectedLanguage] || les.codingData.starterCode["javascript"] || "");
    }
  };

  const handleMcqSubmit = () => {
    if (selectedMcqOption === null) {
      toast({ variant: "destructive", title: "Please select an answer option" });
      return;
    }
    setMcqSubmitted(true);
  };

  const handleRunCode = () => {
    setIsRunningCode(true);
    setTimeout(() => {
      setIsRunningCode(false);
      setCodeOutput(`[Executing ${selectedLanguage.toUpperCase()} Code...]\nOutput:\n80%\n✔ Test Case 1 Passed (Output matched sample)`);
    }, 800);
  };

  const handleDownloadResource = (res: LessonResource) => {
    toast({
      title: `Downloading ${res.format.toUpperCase()} Note`,
      description: `Preparing download for ${res.title} (${res.size})...`,
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href="/student/my-courses">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-bold text-[#111827] dark:text-[#FAFAFA] capitalize">
                {slug.replace(/-/g, " ")}
              </h1>
              <Badge variant="outline" className="text-[10px] text-[#2563EB] border-[#2563EB]/30 bg-[#2563EB]/5">
                Instructor Configured
              </Badge>
            </div>
            <p className="text-xs text-[#6B7280]">Course Progress: 65% Completed</p>
          </div>
        </div>

        {/* Content Type Badge indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <Badge className={`px-3 py-1 text-xs font-semibold uppercase ${
            activeLesson.type === "video" ? "bg-[#2563EB] text-white" :
            activeLesson.type === "mcq" ? "bg-[#9333EA] text-white" :
            "bg-[#16A34A] text-white"
          }`}>
            {activeLesson.type === "video" && "Video Lesson"}
            {activeLesson.type === "mcq" && "MCQ Quiz Lesson"}
            {activeLesson.type === "coding" && "Coding Practice Lesson"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT / CENTER: Multi-format Lesson Player (Video / MCQ / Coding) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] overflow-hidden shadow-sm">
            <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {activeLesson.type === "video" && <Video className="h-5 w-5 text-[#2563EB]" />}
                  {activeLesson.type === "mcq" && <HelpCircle className="h-5 w-5 text-[#9333EA]" />}
                  {activeLesson.type === "coding" && <Code2 className="h-5 w-5 text-[#16A34A]" />}
                  <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {activeLesson.title}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-[#6B7280] mt-0.5">
                  Est. Duration: {activeLesson.duration}
                </CardDescription>
              </div>
            </CardHeader>
            {/* FORMAT 1: VIDEO LESSON PLAYER */}
            {activeLesson.type === "video" && (
              <div className="p-6 space-y-4">
                <div className="aspect-video bg-[#09090B] rounded-xl overflow-hidden shadow-md border border-[#E5E7EB] dark:border-[#27272A]">
                  <iframe
                    src={getYouTubeEmbedUrl(activeLesson.videoUrl)}
                    title={activeLesson.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-lg border border-[#E5E7EB] dark:border-[#27272A]">
                  <h3 className="text-xs font-bold uppercase text-[#111827] dark:text-[#FAFAFA] mb-1">Lesson Notes & Highlights</h3>
                  <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                    In this video lesson, you will learn architecture patterns for Next.js App Router applications, implementing strict server components, and utilizing Tailwind CSS design tokens.
                  </p>
                </div>
              </div>
            )}

            {/* FORMAT 2: MCQ QUIZ LESSON */}
            {activeLesson.type === "mcq" && activeLesson.mcqData && (
              <div className="p-6 space-y-6">
                <div className="p-4 bg-[#9333EA]/5 border border-[#9333EA]/20 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-[#9333EA] uppercase tracking-wider">Module Quiz Question</p>
                  <p className="text-base font-semibold text-[#111827] dark:text-[#FAFAFA]">
                    {activeLesson.mcqData.question}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {activeLesson.mcqData.options.map((opt, idx) => {
                    const isSelected = selectedMcqOption === idx;
                    const isCorrect = idx === activeLesson.mcqData?.correctAnswer;
                    let optionStyle = "border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]";

                    if (mcqSubmitted) {
                      if (isCorrect) optionStyle = "border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A] font-semibold";
                      else if (isSelected && !isCorrect) optionStyle = "border-[#DC2626] bg-[#DC2626]/10 text-[#DC2626]";
                    } else if (isSelected) {
                      optionStyle = "border-[#9333EA] bg-[#9333EA]/10 font-semibold text-[#9333EA]";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => !mcqSubmitted && setSelectedMcqOption(idx)}
                        className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between ${optionStyle}`}
                      >
                        <span>{opt}</span>
                        {isSelected && !mcqSubmitted && <CheckCircle2 className="h-4 w-4 text-[#9333EA]" />}
                        {mcqSubmitted && isCorrect && <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />}
                      </button>
                    );
                  })}
                </div>

                {!mcqSubmitted ? (
                  <Button className="h-[44px] px-6 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold" onClick={handleMcqSubmit}>
                    Submit Answer
                  </Button>
                ) : (
                  <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                    <p className="text-xs font-bold text-[#16A34A] uppercase">Explanation</p>
                    <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                      {activeLesson.mcqData.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* FORMAT 3: CODING PRACTICE LESSON */}
            {activeLesson.type === "coding" && activeLesson.codingData && (
              <div className="p-6 space-y-5">
                {/* Problem Statement */}
                <div className="p-4 bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">Coding Hands-on Problem</p>
                  <p className="text-sm text-[#111827] dark:text-[#FAFAFA] leading-relaxed">
                    {activeLesson.codingData.problemStatement}
                  </p>
                </div>

                {/* Editor Header: Language Switcher */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Code Editor</Label>
                  <Select value={selectedLanguage} onValueChange={(val: string | null) => {
                    if (!val) return;
                    setSelectedLanguage(val);
                    if (activeLesson.codingData && val in activeLesson.codingData.starterCode) {
                      setCodeContent(activeLesson.codingData.starterCode[val] ?? "");
                    }
                  }}>
                    <SelectTrigger className="w-36 h-9 text-xs">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript (Node)</SelectItem>
                      <SelectItem value="python">Python 3</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Code Textarea */}
                <Textarea
                  className="font-mono text-xs leading-relaxed min-h-[160px] bg-[#09090B] text-[#FAFAFA] border-[#27272A] p-4"
                  value={codeContent || (activeLesson.codingData.starterCode[selectedLanguage] || "")}
                  onChange={(e) => setCodeContent(e.target.value)}
                />

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <Button
                    className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold gap-2"
                    onClick={handleRunCode}
                    disabled={isRunningCode}
                  >
                    {isRunningCode ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Terminal className="h-4 w-4" />}
                    {isRunningCode ? "Running Tests..." : "Run & Test Code"}
                  </Button>

                  <p className="text-xs text-[#6B7280]">Sample Expected Output: <code className="bg-[#F3F4F6] dark:bg-[#27272A] px-1.5 py-0.5 rounded text-[#111827] dark:text-[#FAFAFA] font-bold">{activeLesson.codingData.sampleOutput}</code></p>
                </div>

                {/* Code Output Terminal */}
                {codeOutput && (
                  <div className="p-4 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                    <p className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider">Console Output & Test Results</p>
                    <pre className="text-xs text-white font-mono leading-relaxed whitespace-pre-wrap">{codeOutput}</pre>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ATTACHED STUDY NOTES / PDF & WORD DOCUMENTS SECTION */}
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-6 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#2563EB]" />
                <CardTitle className="text-[16px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Lesson Notes & Study Material (.PDF / .DOCX)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-[#6B7280]">
                Download or view attached PDF notes and Word reference documents provided by the instructor
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {activeLesson.resources && activeLesson.resources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeLesson.resources.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex items-center justify-between gap-3 group hover:border-[#2563EB] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          res.format === "pdf" ? "bg-[#DC2626]/10 text-[#DC2626]" : "bg-[#2563EB]/10 text-[#2563EB]"
                        }`}>
                          {res.format.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] truncate">
                            {res.title}
                          </p>
                          <p className="text-[11px] text-[#6B7280] font-medium">{res.size}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A] group-hover:border-[#2563EB] group-hover:text-[#2563EB]"
                        onClick={() => handleDownloadResource(res)}
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                  <p className="text-xs text-[#6B7280]">No additional PDF/Word attachments for this lesson.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDEBAR: Course Curriculum List (Video / MCQ / Coding / Attachment Icons) */}
        <div className="space-y-4">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-6 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <CardTitle className="text-[16px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                Course Curriculum
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Lessons configured with Videos, Quizzes, Coding, & PDF/Word Notes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {mockModules.map((mod) => (
                <div key={mod.id} className="space-y-2">
                  <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{mod.title}</p>
                  <div className="space-y-1">
                    {mod.lessons.map((les) => {
                      const isActive = activeLesson.id === les.id;
                      const hasNotes = les.resources && les.resources.length > 0;

                      return (
                        <button
                          key={les.id}
                          onClick={() => handleLessonSelect(les)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg text-xs text-left transition-all ${
                            isActive
                              ? "bg-[#2563EB]/10 border border-[#2563EB] text-[#2563EB] font-bold shadow-xs"
                              : "hover:bg-[#F5F5F5] dark:hover:bg-[#27272A] text-[#4B5563] dark:text-[#D1D5DB]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {les.type === "video" && <Video className="h-4 w-4 text-[#2563EB] shrink-0" />}
                            {les.type === "mcq" && <HelpCircle className="h-4 w-4 text-[#9333EA] shrink-0" />}
                            {les.type === "coding" && <Code2 className="h-4 w-4 text-[#16A34A] shrink-0" />}
                            <span className="truncate">{les.title}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {hasNotes && (
                              <FileText className="h-3.5 w-3.5 text-[#2563EB]" />
                            )}
                            <Badge variant="outline" className={`text-[9px] uppercase px-1.5 py-0 ${
                              les.type === "video" ? "border-[#2563EB]/30 text-[#2563EB]" :
                              les.type === "mcq" ? "border-[#9333EA]/30 text-[#9333EA]" :
                              "border-[#16A34A]/30 text-[#16A34A]"
                            }`}>
                              {les.type}
                            </Badge>
                            {les.completed && <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
