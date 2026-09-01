"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Search, Filter, Clock, Play, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useLMSStore } from "@/lib/store/lms-store";

const fallbackCourses: any[] = [];

export default function StudentCoursesPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const router = useRouter();
  const [storeCourses, setStoreCourses] = useState<any[]>([]);

  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch("/api/student/courses");
        if (res.ok) {
          const data = await res.json();
          if (data.courses) {
            setStoreCourses(data.courses);
          }
        }
      } catch (err) {
        console.error("Failed to load student courses", err);
      }
    }
    loadCourses();
  }, []);

  const formattedStoreCourses = storeCourses.map(c => ({
    id: c.id,
    slug: c.slug || c.id,
    title: c.title,
    category: c.category || 'General',
    difficulty: c.difficulty || "Beginner",
    progress: c.progress ?? 0,
    completedLessons: 0,
    totalLessons: c.totalLessons || (c.modules?.reduce((acc: number, m: any) => acc + (m.subModules?.length || m.lessons?.length || 1), 0)) || 10,
    instructor: c.instructor || "Lead Technical Trainer",
    thumbnail: c.thumbnail || c.thumbnail_url || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
  }));

  const allCoursesList = storeCourses.length > 0 ? formattedStoreCourses : fallbackCourses;

  const filteredCourses = allCoursesList.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase());
    if (tab === "in-progress") return matchesSearch && course.progress > 0 && course.progress < 100;
    if (tab === "completed") return matchesSearch && course.progress === 100;
    return matchesSearch;
  });

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Top Header - Compact Enterprise Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-4.5 shadow-2xs overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          {/* Left: Breadcrumb & Title */}
          <div className="space-y-1 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0"
              >
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              My Enrolled Courses
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed font-normal line-clamp-1">
              Access your active training modules with playable video lessons and practice labs
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
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all"
            >
              All Courses ({allCoursesList.length})
            </TabsTrigger>
            <TabsTrigger
              value="in-progress"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all"
            >
              In Progress ({allCoursesList.filter((c) => c.progress > 0 && c.progress < 100).length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all"
            >
              Completed ({allCoursesList.filter((c) => c.progress === 100).length})
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Course Cards Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="bg-card border border-border p-12 text-center rounded-[var(--radius-xl)] animate-fade-up stagger-2 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">No Courses Assigned Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1.5 font-normal">
            Courses created or assigned in the Admin or Trainer panel will appear here automatically in real-time.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-up stagger-2">
          {filteredCourses.map((course) => (
          <Card key={course.id} className="h-full flex flex-col justify-between overflow-hidden hover:border-blue-500/40 transition-colors bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-xl shadow-2xs group">
            {/* Thumbnail Header */}
            <div className="relative w-full h-24 overflow-hidden border-b border-slate-100 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800">
              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            </div>

            <CardHeader className="p-3.5 pb-2 space-y-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <Badge variant="outline" className="text-[10px] font-semibold border-blue-200/70 text-blue-700 bg-blue-50/70 dark:border-blue-800/40 dark:text-blue-300 dark:bg-blue-950/30 px-2 py-0 rounded-md">
                  {course.category}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/60 px-2 py-0 rounded-md capitalize">
                  {course.difficulty}
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-1">
                {course.title}
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                Instructor: <span className="font-semibold text-slate-700 dark:text-zinc-300">{course.instructor}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3.5 pt-0 space-y-2.5">
              {/* Progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                  <span>{course.completedLessons} of {course.totalLessons} lessons</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-1 bg-slate-100 dark:bg-zinc-800" />
              </div>

              {/* Action Button */}
              <Button
                className={`w-full h-8 gap-1.5 font-semibold text-xs rounded-lg shadow-2xs ${
                  course.progress === 100
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                }`}
                asChild
              >
                <Link href={`/student/course/${course.slug}`}>
                  {course.progress === 100 ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Review Course
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" /> Learn Now
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
