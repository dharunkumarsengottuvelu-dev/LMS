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
      {/* Top Header - Spacious Enterprise MNC Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 shadow-xs overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Left: Breadcrumb & Title */}
          <div className="space-y-2 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0.5"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-normal">
              My Enrolled Courses
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed font-normal">
              Access your active training modules with playable video lessons and practice labs
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search my courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 text-xs bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-700 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-muted p-1 rounded-xl h-auto">
          <TabsTrigger value="all" className="text-xs font-semibold">
            All Courses ({allCoursesList.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="text-xs font-semibold">
            In Progress ({allCoursesList.filter((c) => c.progress > 0 && c.progress < 100).length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs font-semibold">
            Completed ({allCoursesList.filter((c) => c.progress === 100).length})
          </TabsTrigger>
        </TabsList>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up stagger-2">
          {filteredCourses.map((course) => (
          <Card key={course.id} className="h-full flex flex-col justify-between overflow-hidden hover:border-primary/40 transition-colors bg-card border border-border rounded-[var(--radius-xl)] shadow-sm group">
            {/* Thumbnail Header */}
            <div className="relative w-full h-44 overflow-hidden border-b border-border bg-muted">
              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            </div>

            <CardHeader className="p-6 pb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary bg-primary/5">
                  {course.category}
                </Badge>
                <Badge variant="secondary" className="text-xs font-medium capitalize bg-secondary text-secondary-foreground">
                  {course.difficulty}
                </Badge>
              </div>
              <CardTitle className="text-lg leading-snug line-clamp-2 font-bold text-foreground">
                {course.title}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-medium">
                Instructor: <span className="font-semibold text-foreground">{course.instructor}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-4">
              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>{course.completedLessons} of {course.totalLessons} lessons</span>
                  <span className="font-semibold text-foreground">{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-2 bg-border" />
              </div>

              {/* Action Button */}
              <Button
                className={`w-full h-[44px] gap-2 font-semibold text-xs ${
                  course.progress === 100
                    ? "bg-[#22C55E] hover:bg-[#16A34A] text-white"
                    : ""
                }`}
                asChild
              >
                <Link href={`/student/course/${course.slug}`}>
                  {course.progress === 100 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Review Course Syllabus
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" /> Watch Video & Learn
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
