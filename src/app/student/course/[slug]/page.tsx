"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast, toast as directToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { CustomVideoPlayer } from "@/components/video/custom-video-player";
import { 
  computeCourseProgress,
  markLessonCompleted,
  useCourseProgressVersion,
  getStoredCompletedLessonIds,
} from "@/lib/course-progress";
import { 
  Play, 
  CheckCircle2, 
  BookOpen, 
  Code2, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  ChevronLeft,
  Check, 
  AlertCircle, 
  Clock,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  ChevronsDownUp,
  ChevronsUpDown,
  List,
  Minus,
  Plus,
  ArrowLeft,
  ArrowRight,
  User,
  Video,
  Layers,
  Sparkles
} from "lucide-react";

export interface VideoPlayerConfig {
  type: "direct" | "iframe" | "empty";
  src: string;
}

export function getVideoPlayerConfig(url?: string): VideoPlayerConfig {
  if (!url || !url.trim()) {
    return { type: "empty", src: "" };
  }

  const trimmed = url.trim();

  // 1. Direct Video files (.mp4, .webm, .ogg, .mov, .m4v, blob, storage streams)
  const isDirectVideo =
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed) ||
    trimmed.startsWith("blob:") ||
    trimmed.includes("supabase.co/storage/v1/object/public/") ||
    trimmed.includes("firebasestorage.googleapis.com");

  if (isDirectVideo) {
    return { type: "direct", src: trimmed };
  }

  // 2. YouTube (Watch, Share, Shorts, Embed, Live, etc.)
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    let params = "?rel=0&modestbranding=1&iv_load_policy=3";
    const timeMatch = trimmed.match(/[?&]t=(\d+)/);
    if (timeMatch && timeMatch[1]) {
      params += `&start=${timeMatch[1]}`;
    }
    return {
      type: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${videoId}${params}`,
    };
  }

  // 3. Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "iframe",
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // 4. Loom
  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9_-]+)/i);
  if (loomMatch && loomMatch[1]) {
    return {
      type: "iframe",
      src: `https://www.loom.com/embed/${loomMatch[1]}`,
    };
  }

  // 5. Google Drive Video
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return {
      type: "iframe",
      src: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
    };
  }

  // 6. Generic embed fallback
  return { type: "iframe", src: trimmed };
}

type ContentType = "video" | "mcq" | "coding" | "reading";

interface QuizQuestionItem {
  id: string;
  question: string;
  type: "single" | "multiple";
  options: string[];
  correctIndex?: number;
  correctIndexes?: number[];
  explanation?: string;
}

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
  notes?: string;
  readingContent?: string;
  resources?: LessonResource[];
  quizQuestionsList?: QuizQuestionItem[];
  codingData?: {
    problemStatement: string;
    starterCode: Record<string, string>;
    sampleInput?: string;
    sampleOutput: string;
  };
}

interface CourseSyllabusSubModule {
  id: string;
  title: string;
  duration: string;
  type: "video" | "reading" | "quiz" | "coding";
  videoUrl?: string;
  notes?: string;
  readingContent?: string;
  practiceDescription?: string;
  practiceTestCases?: string;
  practiceStarterCode?: string;
  quizQuestions?: string;
}

interface CourseSyllabusModule {
  id: string;
  title: string;
  description?: string;
  subModules: CourseSyllabusSubModule[];
}

function normalizeCourseModules(rawModules: any[] = []): CourseSyllabusModule[] {
  if (!rawModules || !Array.isArray(rawModules)) return [];
  return rawModules.map((m, idx) => {
    // Format 1: Hierarchical module with subModules
    if (m.subModules && Array.isArray(m.subModules) && m.subModules.length > 0) {
      return {
        id: m.id || `mod_${idx + 1}`,
        title: m.title || `Module ${idx + 1}`,
        description: m.description || "",
        subModules: m.subModules.map((sub: any, sIdx: number) => ({
          id: sub.id || `sub_${idx + 1}_${sIdx + 1}`,
          title: sub.title || `Lesson ${idx + 1}.${sIdx + 1}`,
          duration: sub.duration || "45 mins",
          type: sub.type || "video",
          videoUrl: sub.videoUrl || sub.video_url || "",
          notes: sub.notes || sub.description || "",
          readingContent: sub.readingContent || sub.content || "",
          practiceDescription: sub.practiceDescription || "",
          practiceTestCases: sub.practiceTestCases || "",
          practiceStarterCode: sub.practiceStarterCode || "",
          quizQuestions: sub.quizQuestions || "",
        })),
      };
    }

    // Format 2: Hierarchical module with lessons array
    if (m.lessons && Array.isArray(m.lessons) && m.lessons.length > 0) {
      return {
        id: m.id || `mod_${idx + 1}`,
        title: m.title || `Module ${idx + 1}`,
        description: m.description || "",
        subModules: m.lessons.map((les: any, sIdx: number) => ({
          id: les.id || `sub_${idx + 1}_${sIdx + 1}`,
          title: les.title || `Lesson ${idx + 1}.${sIdx + 1}`,
          duration: les.duration ? (typeof les.duration === "number" ? `${les.duration} mins` : String(les.duration)) : "45 mins",
          type: les.type || (les.video_url || les.videoUrl ? "video" : "reading"),
          videoUrl: les.video_url || les.videoUrl || "",
          notes: les.notes || les.description || "",
          readingContent: les.content || les.readingContent || "",
          practiceDescription: les.practiceDescription || "",
          practiceTestCases: les.practiceTestCases || "",
          practiceStarterCode: les.practiceStarterCode || "",
          quizQuestions: les.quizQuestions || "",
        })),
      };
    }

    // Format 3: Legacy flat module item
    if (m.type || m.videoUrl || m.video_url || m.duration || m.notes || m.quizQuestions || m.practiceDescription) {
      return {
        id: m.id || `mod_${idx + 1}`,
        title: m.title || `Module ${idx + 1}`,
        description: m.description || "",
        subModules: [
          {
            id: `sub_${m.id || idx + 1}_1`,
            title: m.title || `Lesson ${idx + 1}.1`,
            duration: m.duration || "45 mins",
            type: m.type || "video",
            videoUrl: m.videoUrl || m.video_url || "",
            notes: m.notes || "",
            readingContent: m.readingContent || "",
            practiceDescription: m.practiceDescription || "",
            practiceTestCases: m.practiceTestCases || "",
            practiceStarterCode: m.practiceStarterCode || "",
            quizQuestions: m.quizQuestions || "",
          },
        ],
      };
    }

    return {
      id: m.id || `mod_${idx + 1}`,
      title: m.title || `Module ${idx + 1}`,
      description: m.description || "",
      subModules: [],
    };
  });
}

function parseQuizQuestions(rawQuiz?: string): QuizQuestionItem[] {
  if (!rawQuiz) return [];
  try {
    const parsed = JSON.parse(rawQuiz);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((q: any, idx: number) => ({
        id: q.id || `q_${idx + 1}`,
        question: q.question || `Question ${idx + 1}`,
        type: q.type === "multiple" ? "multiple" : "single",
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        correctIndexes: Array.isArray(q.correctIndexes) ? q.correctIndexes : [typeof q.correctIndex === "number" ? q.correctIndex : 0],
        explanation: q.explanation || "Instructor assessment review."
      }));
    }
  } catch (e) {
    if (rawQuiz && !rawQuiz.startsWith("[")) {
      return [{
        id: "q_1",
        question: rawQuiz,
        type: "single",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctIndex: 0,
        correctIndexes: [0],
        explanation: "Instructor assessment review."
      }];
    }
  }
  return [];
}

function convertSubToLesson(sub: CourseSyllabusSubModule): Lesson {
  let type: ContentType = "video";
  if (sub.type === "quiz") type = "mcq";
  else if (sub.type === "coding") type = "coding";
  else if (sub.type === "reading") type = "reading";
  else type = "video";

  return {
    id: sub.id,
    title: sub.title,
    duration: sub.duration || "45 mins",
    type,
    completed: false,
    videoUrl: sub.videoUrl,
    notes: sub.notes,
    readingContent: sub.readingContent,
    quizQuestionsList: parseQuizQuestions(sub.quizQuestions),
    codingData: sub.practiceDescription ? {
      problemStatement: sub.practiceDescription,
      starterCode: {
        javascript: sub.practiceStarterCode || "// Write your solution here\nfunction solve() {\n  \n}",
        python: "# Write your solution here\ndef solve():\n    pass",
        typescript: "// Write your solution here\nfunction solve(): void {\n  \n}"
      },
      sampleOutput: sub.practiceTestCases || "Output verified"
    } : undefined
  };
}

export default function StudentCoursePlayerPage() {
  const params = useParams();
  const rawSlug = params?.slug;
  const slug = (typeof rawSlug === "string" ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : "fullstack-web-development") || "fullstack-web-development";

  const toastObj = useToast();
  const toast = toastObj?.toast || directToast;

  const [rawCourseData, setRawCourseData] = useState<any>(null);
  const [courseTitle, setCourseTitle] = useState(slug.replace(/-/g, " "));
  const [courseCategory, setCourseCategory] = useState("General");
  const [courseInstructor, setCourseInstructor] = useState("Lead Technical Trainer");
  const [modules, setModules] = useState<CourseSyllabusModule[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  const [activeLesson, setActiveLesson] = useState<Lesson>({
    id: "l1",
    title: "1.1 Introduction & Setup",
    duration: "45 mins",
    type: "video",
    completed: false,
  });

  // Safe event-driven progress subscriber
  const progressVersion = useCourseProgressVersion();

  // Authoritative dynamic course progress calculation
  const courseProgress = useMemo(() => {
    return computeCourseProgress(
      {
        ...(rawCourseData || {}),
        id: rawCourseData?.id || slug,
        slug: rawCourseData?.slug || slug,
        title: courseTitle,
        category: courseCategory,
        instructor: courseInstructor,
        modules,
        completedLessonIds,
      },
      true
    );
  }, [rawCourseData, slug, courseTitle, courseCategory, courseInstructor, modules, completedLessonIds, progressVersion]);

  // Marks the active lesson completed persistently
  const markActiveLessonCompleted = useCallback(() => {
    if (!activeLesson?.id) return;
    const targetCourseId = rawCourseData?.id || slug;
    markLessonCompleted(targetCourseId, activeLesson.id, {
      ...(rawCourseData || {}),
      id: targetCourseId,
      slug,
      modules,
    }).then((res) => {
      setCompletedLessonIds(res.completedLessonIds);
    });
  }, [activeLesson?.id, rawCourseData, slug, modules]);

  useEffect(() => {
    async function fetchCourse() {
      try {
        let courseMatch: any = null;

        // 1. Try direct student course endpoint first
        try {
          const res = await fetch(`/api/student/courses/${encodeURIComponent(slug)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.course) {
              courseMatch = data.course;
            }
          }
        } catch (e) {
          console.warn("Direct course lookup error:", e);
        }

        // 2. Fallback to student course list
        if (!courseMatch) {
          const res = await fetch("/api/student/courses");
          if (res.ok) {
            const data = await res.json();
            if (data.courses && Array.isArray(data.courses)) {
              courseMatch = data.courses.find((c: any) =>
                c.id === slug ||
                c.slug === slug ||
                c.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug.toLowerCase() ||
                c.id?.toLowerCase() === slug.toLowerCase()
              ) || data.courses[0];
            }
          }
        }

        // 3. Fallback to admin courses if needed
        if (!courseMatch) {
          const res = await fetch("/api/admin/courses");
          if (res.ok) {
            const data = await res.json();
            if (data.courses && Array.isArray(data.courses)) {
              courseMatch = data.courses.find((c: any) =>
                c.id === slug ||
                c.slug === slug ||
                c.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug.toLowerCase() ||
                c.id?.toLowerCase() === slug.toLowerCase()
              ) || data.courses[0];
            }
          }
        }

        if (courseMatch) {
          setRawCourseData(courseMatch);
          setCourseTitle(courseMatch.title);
          setCourseCategory(courseMatch.category || "General");
          setCourseInstructor(courseMatch.instructor || "Lead Technical Trainer");
          const norm = normalizeCourseModules(courseMatch.modules);
          setModules(norm);

          const stored = getStoredCompletedLessonIds(courseMatch.id || slug);
          setCompletedLessonIds(stored);

          const expMap: Record<string, boolean> = {};
          norm.forEach((m) => { expMap[m.id] = true; });
          setExpandedModules(expMap);

          if (norm[0]?.subModules?.[0]) {
            setActiveLesson(convertSubToLesson(norm[0].subModules[0]));
          }
        }
      } catch (err) {
        console.error("Failed to load course", err);
      }
    }
    fetchCourse();
  }, [slug]);

  // Quiz Multi-Choice & Single-Choice State
  const [currentQuizQIdx, setCurrentQuizQIdx] = useState(0);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, number[]>>({});
  const [quizSubmittedMap, setQuizSubmittedMap] = useState<Record<string, boolean>>({});

  // Coding Lesson State
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  const [codeOutput, setCodeOutput] = useState<string | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);

  const toggleModuleExpand = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const collapseAllModules = () => {
    const newMap: Record<string, boolean> = {};
    modules.forEach((m) => {
      newMap[m.id] = false;
    });
    setExpandedModules(newMap);
  };

  const expandAllModules = () => {
    const newMap: Record<string, boolean> = {};
    modules.forEach((m) => {
      newMap[m.id] = true;
    });
    setExpandedModules(newMap);
  };

  const areAllModulesCollapsed = modules.length > 0 && modules.every((m) => expandedModules[m.id] === false);

  const handleLessonSelect = (sub: CourseSyllabusSubModule) => {
    const les = convertSubToLesson(sub);
    setActiveLesson(les);
    setCurrentQuizQIdx(0);
    setSelectedQuizAnswers({});
    setQuizSubmittedMap({});
    setCodeOutput(null);
    if (les.type === "coding" && les.codingData) {
      setCodeContent(les.codingData.starterCode[selectedLanguage] || les.codingData.starterCode["javascript"] || "");
    }
  };

  const handleNextLesson = () => {
    for (let m = 0; m < modules.length; m++) {
      const mod = modules[m];
      if (!mod) continue;
      const subModules = mod.subModules || [];
      for (let s = 0; s < subModules.length; s++) {
        const currentSub = subModules[s];
        if (currentSub?.id === activeLesson.id) {
          const nextInMod = subModules[s + 1];
          if (nextInMod) {
            handleLessonSelect(nextInMod);
            toast({ title: "Next Lesson Loaded", description: nextInMod.title });
            return;
          }
          const nextMod = modules[m + 1];
          const firstInNextMod = nextMod?.subModules?.[0];
          if (firstInNextMod) {
            handleLessonSelect(firstInNextMod);
            toast({ title: "Next Module Lesson Loaded", description: firstInNextMod.title });
            return;
          }
        }
      }
    }
    toast({ title: "Course Completed!", description: "You have reached the end of the course curriculum." });
  };

  const handleOptionSelect = (qId: string, optIdx: number, type: "single" | "multiple") => {
    if (quizSubmittedMap[qId]) return;

    if (type === "single") {
      setSelectedQuizAnswers((prev) => ({ ...prev, [qId]: [optIdx] }));
    } else {
      setSelectedQuizAnswers((prev) => {
        const curr = prev[qId] || [];
        const next = curr.includes(optIdx)
          ? curr.filter((i) => i !== optIdx)
          : [...curr, optIdx].sort((a, b) => a - b);
        return { ...prev, [qId]: next };
      });
    }
  };

  const handleQuizSubmit = (qId: string) => {
    const chosen = selectedQuizAnswers[qId] || [];
    if (chosen.length === 0) {
      toast({ variant: "destructive", title: "Please select an answer option" });
      return;
    }
    setQuizSubmittedMap((prev) => ({ ...prev, [qId]: true }));
    markActiveLessonCompleted();
    toast({ title: "Quiz Answer Submitted!", description: "Lesson marked completed." });
  };

  const handleRunCode = async () => {
    if (!codeContent.trim()) {
      toast({ variant: "destructive", title: "Empty Code", description: "Please write some code first" });
      return;
    }
    setIsRunningCode(true);
    setCodeOutput(null);
    try {
      const response = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code: codeContent,
          stdin: activeLesson.codingData?.sampleInput ?? "",
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Code execution failed");
      }

      const result = await response.json();
      const outputText = result.stdout || result.stderr || result.compile_output || "No output";
      setCodeOutput(`[Jobe Engine Status: ${result.status?.description ?? "Success"}]\nExecution Time: ${result.time ?? "0.00"}s\n\nOutput:\n${outputText}`);
      markActiveLessonCompleted();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setCodeOutput(`[Jobe Execution Error]\n${msg}`);
      toast({ variant: "destructive", title: "Execution Failed", description: msg });
    } finally {
      setIsRunningCode(false);
    }
  };

  const currentQuizList = activeLesson.quizQuestionsList || [];
  const currentQuizQ = currentQuizList[currentQuizQIdx] || currentQuizList[0];

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header - Spacious Enterprise MNC Course Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-xs overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Column: Breadcrumb + Course Title + Instructor Metadata */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Breadcrumb Navigation */}
            <div>
              <Link
                href="/student/my-courses"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0.5"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back to My Courses</span>
              </Link>
            </div>

            {/* Course Title */}
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight py-0.5">
              {courseTitle}
            </h1>

            {/* Active Lesson Information */}
            {activeLesson?.title && (
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 dark:text-zinc-400 flex-wrap pt-0.5">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 shrink-0" />
                  <span>Current Lesson: <strong className="font-semibold text-slate-800 dark:text-white">{activeLesson.title}</strong></span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT / CENTER: Multi-format Lesson Player (Video / MCQ / Coding / Notes) */}
        <div className={isSidebarMinimized ? "lg:col-span-3 space-y-6" : "lg:col-span-2 space-y-6"}>
          <Card className="bg-card border border-border overflow-hidden shadow-xs rounded-2xl">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {activeLesson.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Duration: {activeLesson.duration}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs font-semibold text-[#2563EB] border-[#2563EB]/30 uppercase">
                  {activeLesson.type}
                </Badge>
                {isSidebarMinimized && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSidebarMinimized(false)}
                    className="h-7 px-2.5 text-xs text-[#2563EB] border-[#2563EB]/30 bg-[#2563EB]/5 rounded-lg flex items-center gap-1 hover:bg-[#2563EB]/10"
                  >
                    <PanelRightOpen className="h-3.5 w-3.5" />
                    <span>View Curriculum</span>
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* FORMAT 1: CUSTOM ENTERPRISE LMS VIDEO PLAYER */}
            {activeLesson.type === "video" && (
              <div className="p-3 sm:p-6 space-y-4">
                <CustomVideoPlayer
                  key={activeLesson.id + (activeLesson.videoUrl || "")}
                  src={activeLesson.videoUrl}
                  title={activeLesson.title}
                  instructor={courseInstructor}
                  onNextLesson={handleNextLesson}
                  onTimeUpdate={(currentTime, duration) => {
                    if (duration > 0 && currentTime / duration >= 0.9) {
                      markActiveLessonCompleted();
                    }
                  }}
                  onEnded={() => {
                    markActiveLessonCompleted();
                    toast({ title: "Lesson Completed!", description: `You finished ${activeLesson.title}` });
                  }}
                />

                {activeLesson.notes && (
                  <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                    <div className="text-xs font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      Lesson Notes & Key Takeaways
                    </div>
                    <div className="text-xs text-[#374151] dark:text-[#D1D5DB] leading-relaxed whitespace-pre-wrap">
                      {activeLesson.notes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FORMAT 2: READING DOCUMENT */}
            {activeLesson.type === "reading" && (
              <div className="p-6 space-y-4">
                <div className="p-5 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] space-y-3">
                  <div className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">
                    Article Documentation
                  </div>
                  <div className="text-sm text-[#111827] dark:text-[#FAFAFA] leading-relaxed whitespace-pre-wrap">
                    {activeLesson.readingContent || "No article text provided for this lesson."}
                  </div>
                </div>
              </div>
            )}

            {/* FORMAT 3: MCQ QUIZ LESSON (SINGLE AND MULTIPLE CHOICE) */}
            {activeLesson.type === "mcq" && (
              <div className="p-6 space-y-6">
                {!currentQuizQ ? (
                  <div className="text-center py-10 text-xs text-[#6B7280]">
                    No quiz questions configured for this lesson yet.
                  </div>
                ) : (
                  <>
                    {/* Question Header & Navigation */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#2563EB] text-white text-xs">
                          Question {currentQuizQIdx + 1} of {currentQuizList.length}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-[#2563EB] border-[#2563EB]/30">
                          {currentQuizQ.type === "multiple" ? "Multiple Choice (Select All That Apply)" : "Single Choice (Select One)"}
                        </Badge>
                      </div>

                      {currentQuizList.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={currentQuizQIdx === 0}
                            onClick={() => setCurrentQuizQIdx((prev) => prev - 1)}
                            className="h-8 px-2.5 text-xs font-semibold"
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={currentQuizQIdx === currentQuizList.length - 1}
                            onClick={() => setCurrentQuizQIdx((prev) => prev + 1)}
                            className="h-8 px-2.5 text-xs font-semibold"
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Question Statement */}
                    <div className="p-4 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl">
                      <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">
                        {currentQuizQ.question}
                      </p>
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-3">
                      {currentQuizQ.options.map((opt, idx) => {
                        const chosenList = selectedQuizAnswers[currentQuizQ.id] || [];
                        const isSelected = chosenList.includes(idx);
                        const isSubmitted = quizSubmittedMap[currentQuizQ.id] ?? false;

                        const correctSet = new Set(
                          currentQuizQ.type === "multiple"
                            ? (currentQuizQ.correctIndexes || [])
                            : [currentQuizQ.correctIndex ?? 0]
                        );
                        const isCorrectOption = correctSet.has(idx);

                        let optionStyle = "border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]";

                        if (isSubmitted) {
                          if (isCorrectOption) {
                            optionStyle = "border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A] font-semibold";
                          } else if (isSelected && !isCorrectOption) {
                            optionStyle = "border-[#DC2626] bg-[#DC2626]/10 text-[#DC2626]";
                          }
                        } else if (isSelected) {
                          optionStyle = "border-[#2563EB] bg-[#2563EB]/10 font-semibold text-[#2563EB]";
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleOptionSelect(currentQuizQ.id, idx, currentQuizQ.type)}
                            className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between ${optionStyle}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs text-[#6B7280]">
                                {currentQuizQ.type === "multiple"
                                   ? (isSelected ? "[x]" : "[ ]")
                                  : (isSelected ? "(o)" : "( )")}
                              </span>
                              <span>{opt}</span>
                            </div>

                            {isSelected && !isSubmitted && (
                              <span className="text-xs font-bold text-[#2563EB]">Selected</span>
                            )}
                            {isSubmitted && isCorrectOption && (
                              <span className="text-xs font-bold text-[#16A34A]">Correct Answer</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Actions and Result */}
                    {!quizSubmittedMap[currentQuizQ.id] ? (
                      <Button
                        className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl shadow-sm"
                        onClick={() => handleQuizSubmit(currentQuizQ.id)}
                      >
                        Submit Answer
                      </Button>
                    ) : (
                      <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                        <p className="text-xs font-bold text-[#16A34A] uppercase">Explanation & Learning Takeaway</p>
                        <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                          {currentQuizQ.explanation || "Instructor assessment review."}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* FORMAT 4: CODING PRACTICE LESSON */}
            {activeLesson.type === "coding" && activeLesson.codingData && (
              <div className="p-6 space-y-5">
                <div className="p-4 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">Coding Hands-on Problem</p>
                  <p className="text-sm text-[#111827] dark:text-[#FAFAFA] leading-relaxed">
                    {activeLesson.codingData.problemStatement}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Code Editor</Label>
                  <Textarea
                    className="font-mono text-xs leading-relaxed min-h-[180px] bg-[#09090B] text-[#FAFAFA] border-[#27272A] p-4 rounded-xl"
                    value={codeContent || (activeLesson.codingData.starterCode[selectedLanguage] || "")}
                    onChange={(e) => setCodeContent(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl shadow-sm"
                    onClick={handleRunCode}
                    disabled={isRunningCode}
                  >
                    {isRunningCode ? "Running Tests..." : "Run & Test Code"}
                  </Button>
                </div>

                {codeOutput && (
                  <div className="p-4 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                    <p className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider">Console Output & Test Results</p>
                    <pre className="text-xs text-white font-mono leading-relaxed whitespace-pre-wrap">{codeOutput}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Lesson Footer Action Bar */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-zinc-900/60 border-t border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {completedLessonIds.includes(activeLesson.id) ? (
                  <Badge className="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 py-1 px-3">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-semibold text-xs">Completed</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 dark:text-zinc-400 border-slate-300 dark:border-zinc-700 text-xs py-1 px-3">
                    <span>In Progress</span>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {!completedLessonIds.includes(activeLesson.id) && (
                  <Button
                    onClick={() => {
                      markActiveLessonCompleted();
                      toast({ title: "Lesson Completed!", description: `You finished ${activeLesson.title}` });
                    }}
                    variant="outline"
                    className="flex-1 sm:flex-initial h-9 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Mark as Completed</span>
                  </Button>
                )}

                <Button
                  onClick={handleNextLesson}
                  className="flex-1 sm:flex-initial h-9 text-xs font-semibold gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs cursor-pointer"
                >
                  <span>Next Lesson</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT SIDEBAR: Course Curriculum Tree (Main Modules & Nested Sub-Modules) */}
        {!isSidebarMinimized && (
          <div className="space-y-4">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm overflow-hidden sticky top-4">
              <CardHeader className="p-4 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#2563EB]" />
                    Course Curriculum
                  </CardTitle>
                  <CardDescription className="text-xs text-[#6B7280]">
                    {modules.reduce((acc, m) => acc + (m.subModules?.length || 0), 0)} Lessons in {modules.length} Modules
                  </CardDescription>
                </div>

                {/* Minimize Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={areAllModulesCollapsed ? expandAllModules : collapseAllModules}
                    className="h-8 px-2 text-xs text-[#6B7280] hover:text-[#2563EB] flex items-center gap-1 rounded-lg"
                    title={areAllModulesCollapsed ? "Expand all modules" : "Collapse all modules"}
                  >
                    {areAllModulesCollapsed ? (
                      <>
                        <ChevronsUpDown className="h-3.5 w-3.5 text-[#2563EB]" />
                        <span className="text-[11px] font-medium hidden sm:inline">Expand All</span>
                      </>
                    ) : (
                      <>
                        <ChevronsDownUp className="h-3.5 w-3.5 text-[#6B7280]" />
                        <span className="text-[11px] font-medium hidden sm:inline">Collapse All</span>
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarMinimized(true)}
                    className="h-8 w-8 text-[#6B7280] hover:text-[#2563EB] rounded-lg"
                    title="Minimize sidebar to wide view"
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {/* Dynamic Overall Progress Banner */}
                <div className="p-3 bg-slate-50 dark:bg-zinc-900/70 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-200">
                      <Layers className="h-3.5 w-3.5 text-blue-600" />
                      <span>{courseProgress.formattedLessonCount}</span>
                    </span>
                    <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{courseProgress.formattedCompletion}</span>
                  </div>
                  <Progress value={courseProgress.progressPercentage} className="h-1.5 bg-slate-200 dark:bg-zinc-800" />
                </div>

                {modules.length === 0 ? (
                  <div className="text-center py-8 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
                    <p className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">No curriculum available</p>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">Lessons will appear once authored.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                    {modules.map((mainMod, mIdx) => {
                      const isExpanded = expandedModules[mainMod.id] ?? true;
                      const modSubModules = mainMod.subModules || [];
                      const modCompletedCount = modSubModules.filter((s) => completedLessonIds.includes(s.id)).length;
                      const modTotal = modSubModules.length;
                      const modPercentage = modTotal > 0 ? Math.round((modCompletedCount / modTotal) * 100) : 0;
                      const isModCompleted = modTotal > 0 && modCompletedCount === modTotal;

                      return (
                        <div
                          key={mainMod.id}
                          className="rounded-xl border border-[#E5E7EB] dark:border-[#27272A] overflow-hidden bg-[#FAFAFA] dark:bg-[#09090B]/60 transition-all shadow-2xs"
                        >
                          {/* Main Module Accordion Header */}
                          <button
                            type="button"
                            onClick={() => toggleModuleExpand(mainMod.id)}
                            className="w-full p-3 bg-white dark:bg-[#18181B] hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]/50 transition-colors flex items-center justify-between text-left gap-2 border-b border-[#E5E7EB] dark:border-[#27272A] group cursor-pointer"
                            title={isExpanded ? "Click to minimize module" : "Click to expand module"}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="p-1 rounded-md bg-[#2563EB]/10 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </span>
                              <span className="text-xs font-mono font-bold text-[#2563EB] shrink-0">
                                {isExpanded ? "[-]" : "[+]"}
                              </span>
                              <span className="text-xs font-bold text-foreground truncate">
                                Module {mIdx + 1}: {mainMod.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className={`text-[10px] font-semibold ${isModCompleted ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : "text-blue-600 dark:text-blue-400 bg-blue-600/5 border-blue-600/20"}`}>
                                {modCompletedCount}/{modTotal} ({modPercentage}%)
                              </Badge>
                            </div>
                          </button>

                          {/* Sub-Modules List */}
                          {isExpanded && (
                            <div className="p-2 space-y-1.5 transition-all duration-200">
                              {modSubModules.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground italic p-2 text-center">
                                  No sub-modules in this module.
                                </p>
                              ) : (
                                modSubModules.map((sub, sIdx) => {
                                  const isSelected = activeLesson.id === sub.id;
                                  const isSubCompleted = completedLessonIds.includes(sub.id);

                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => handleLessonSelect(sub)}
                                      className={`w-full p-2.5 rounded-lg text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                        isSelected
                                          ? "bg-blue-600 text-white shadow-xs font-bold"
                                          : "bg-card text-foreground hover:bg-accent border border-border"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {isSubCompleted ? (
                                          <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-white" : "text-emerald-500"}`} />
                                        ) : (
                                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                            isSelected ? "bg-white/20 text-white" : "bg-[#2563EB]/10 text-[#2563EB]"
                                          }`}>
                                            {mIdx + 1}.{sIdx + 1}
                                          </span>
                                        )}
                                        <span className="truncate">{sub.title}</span>
                                      </div>
                                      <Badge
                                        className={`text-[9px] capitalize shrink-0 ${
                                          isSelected
                                            ? "bg-white/20 text-white"
                                            : "bg-[#2563EB]/10 text-[#2563EB]"
                                        }`}
                                      >
                                        {sub.type}
                                      </Badge>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Floating Restore Button when Sidebar is Minimized */}
      {isSidebarMinimized && (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Button
            onClick={() => setIsSidebarMinimized(false)}
            className="h-11 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-full shadow-xl flex items-center gap-2.5 border border-blue-400/40 hover:scale-105 transition-all cursor-pointer"
          >
            <PanelRightOpen className="h-4 w-4" />
            <span>Show Curriculum ({modules.reduce((acc, m) => acc + (m.subModules?.length || 0), 0)} Lessons)</span>
          </Button>
        </div>
      )}
    </div>
  );
}
