"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  Search, 
  Play, 
  CheckCircle2, 
  ArrowLeft,
  GraduationCap,
  Layers,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  computeCourseProgress, 
  useCourseProgressVersion,
  CourseProgressResult 
} from "@/lib/course-progress";

export default function StudentCoursesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [storeCourses, setStoreCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Safe event-driven progress subscriber
  const progressVersion = useCourseProgressVersion();

  useEffect(() => {
    let isMounted = true;
    async function loadCourses() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/student/courses");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.courses && Array.isArray(data.courses)) {
            setStoreCourses(data.courses);
          }
        }
      } catch (err) {
        console.error("Failed to load student courses", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute 100% dynamic, learning-unit-based progress for each course
  const dynamicCourses = useMemo(() => {
    return storeCourses.map((c) => {
      const progressResult: CourseProgressResult = computeCourseProgress(c, true);

      return {
        id: c.id,
        slug: c.slug || c.id,
        title: c.title,
        category: c.category || "Technical Training",
        difficulty: c.difficulty || "Beginner",
        instructor: c.instructor || "Lead Technical Trainer",
        progress: progressResult.progressPercentage,
        completedLessons: progressResult.completedLearningUnits,
        totalLessons: progressResult.totalLearningUnits,
        status: progressResult.status,
        isCompleted: progressResult.isCompleted,
        isInProgress: progressResult.isInProgress,
        isNotStarted: progressResult.isNotStarted,
        nextLesson: progressResult.nextLessonToResume,
        formattedCount: progressResult.formattedLessonCount,
        formattedCompletion: progressResult.formattedCompletion,
      };
    });
  }, [storeCourses, progressVersion]);

  // Tab counts dynamically calculated from actual learning units
  const counts = useMemo(() => {
    const all = dynamicCourses.length;
    const inProgress = dynamicCourses.filter((c) => c.isInProgress).length;
    const completed = dynamicCourses.filter((c) => c.isCompleted).length;
    return { all, inProgress, completed };
  }, [dynamicCourses]);

  // Filtered by Search and Active Tab
  const filteredCourses = useMemo(() => {
    return dynamicCourses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        course.category.toLowerCase().includes(search.toLowerCase()) ||
        course.instructor.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (tab === "in-progress") return course.isInProgress;
      if (tab === "completed") return course.isCompleted;
      return true;
    });
  }, [dynamicCourses, search, tab]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Header - Compact Enterprise Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-2xs overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          {/* Left: Breadcrumb & Title */}
          <div className="space-y-1 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                My Enrolled Courses
              </h1>
              <Badge variant="outline" className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                {counts.all} Total
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed font-normal line-clamp-1">
              Access your active training modules with real-time video progress tracking and hands-on curriculum
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search my courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8.5 h-8.5 text-xs bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-700 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="w-full overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <TabsList className="bg-slate-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl h-11 sm:h-12 w-max min-w-full sm:w-fit border border-slate-200/80 dark:border-zinc-700/80 flex gap-1 sm:gap-1.5 shrink-0">
            <TabsTrigger
              value="all"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all cursor-pointer"
            >
              All Courses ({counts.all})
            </TabsTrigger>
            <TabsTrigger
              value="in-progress"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all cursor-pointer"
            >
              In Progress ({counts.inProgress})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all cursor-pointer"
            >
              Completed ({counts.completed})
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Course Cards Grid or Clean Empty State */}
      {filteredCourses.length === 0 ? (
        <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-10 sm:p-14 text-center rounded-2xl shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/40 shadow-xs">
              {tab === "completed" ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : tab === "in-progress" ? (
                <Play className="h-6 w-6 fill-current ml-0.5" />
              ) : (
                <BookOpen className="h-6 w-6" />
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {tab === "completed"
                ? "No Completed Courses Yet"
                : tab === "in-progress"
                ? "No Courses in Progress"
                : search
                ? "No Courses Match Your Search"
                : "No Courses Assigned Yet"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              {tab === "completed"
                ? "Complete all lessons and video units in a course to view your completed certifications here."
                : tab === "in-progress"
                ? "You haven't started any assigned course yet. Select a course from All Courses to begin."
                : search
                ? `No courses found matching "${search}". Try searching for another topic or clear the filter.`
                : "Courses assigned to your batch by the training administrator will appear here automatically."}
            </p>
            {tab !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTab("all")}
                className="mt-2 text-xs font-semibold rounded-lg text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                View All Courses ({counts.all})
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4.5 animate-fade-up">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="h-full flex flex-col justify-between overflow-hidden hover:border-blue-500/40 transition-all duration-200 bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs group"
            >
              {/* Header: Badges + Title + Instructor */}
              <CardHeader className="p-4.5 pb-3 space-y-2.5">
                {/* Category & Difficulty Badges */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold border-blue-200/80 text-blue-700 bg-blue-50/80 dark:border-blue-800/40 dark:text-blue-300 dark:bg-blue-950/30 px-2.5 py-0.5 rounded-full"
                  >
                    {course.category}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/60 px-2 py-0.5 rounded-full capitalize"
                  >
                    {course.difficulty}
                  </Badge>
                </div>

                {/* Course Title */}
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {course.title}
                </CardTitle>

                {/* Instructor */}
                <CardDescription className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate pt-0.5">
                  Instructor: <span className="font-semibold text-slate-700 dark:text-zinc-300">{course.instructor}</span>
                </CardDescription>
              </CardHeader>

              {/* Content & Dynamic Progress Bar & Action Button */}
              <CardContent className="p-4.5 pt-0 space-y-3.5">
                {/* Dynamic Learning-Unit Progress */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3 text-slate-400" />
                      <span>{course.formattedCount}</span>
                    </span>
                    <span className="font-bold font-mono text-slate-800 dark:text-zinc-200">
                      {course.formattedCompletion}
                    </span>
                  </div>
                  <Progress
                    value={course.progress}
                    className="h-1.5 bg-slate-100 dark:bg-zinc-800"
                  />
                </div>

                {/* Learn Now / Resume / Review Button */}
                <Button
                  className={`w-full h-9 gap-1.5 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer ${
                    course.isCompleted
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                      : course.isInProgress
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                      : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-600/20"
                  }`}
                  asChild
                >
                  <Link href={`/student/course/${course.slug}`}>
                    {course.isCompleted ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Review Course</span>
                      </>
                    ) : course.isInProgress ? (
                      <>
                        <Play className="h-3 w-3 fill-current" />
                        <span>Resume Learning</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-current" />
                        <span>Start Learning</span>
                      </>
                    )}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
