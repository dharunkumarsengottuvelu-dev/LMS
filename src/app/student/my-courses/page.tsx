"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Filter, Clock, Play, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const mockCourses = [
  {
    id: "c1",
    slug: "fullstack-web-development",
    title: "Fullstack Web Development with Next.js & React 19",
    category: "Web Development",
    difficulty: "Intermediate",
    progress: 65,
    completedLessons: 18,
    totalLessons: 28,
    instructor: "Alex Rivera",
  },
  {
    id: "c2",
    slug: "python-data-structures-algorithms",
    title: "Data Structures & Algorithms in Python",
    category: "Computer Science",
    difficulty: "Advanced",
    progress: 30,
    completedLessons: 9,
    totalLessons: 30,
    instructor: "Dr. Elena Rostova",
  },
  {
    id: "c3",
    slug: "system-design-cloud-architecture",
    title: "Enterprise System Design & Microservices Architecture",
    category: "Cloud & DevOps",
    difficulty: "Advanced",
    progress: 100,
    completedLessons: 24,
    totalLessons: 24,
    instructor: "Marcus Vance",
  },
];

export default function StudentCoursesPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filteredCourses = mockCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase());
    if (tab === "in-progress") return matchesSearch && course.progress > 0 && course.progress < 100;
    if (tab === "completed") return matchesSearch && course.progress === 100;
    return matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            My Courses
          </h1>
          <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Access your enrolled training modules and track learning progress
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search my courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-[44px] bg-white dark:bg-[#18181B]"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" onValueChange={setTab}>
        <TabsList className="h-[44px] bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-1">
          <TabsTrigger value="all" className="h-[36px] px-4 text-xs font-medium">All Courses ({mockCourses.length})</TabsTrigger>
          <TabsTrigger value="in-progress" className="h-[36px] px-4 text-xs font-medium">In Progress (2)</TabsTrigger>
          <TabsTrigger value="completed" className="h-[36px] px-4 text-xs font-medium">Completed (1)</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Courses List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="h-full flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors">
            <CardHeader className="p-6 pb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {course.category}
                </Badge>
                <Badge variant="secondary" className="text-xs font-medium capitalize">
                  {course.difficulty}
                </Badge>
              </div>
              <CardTitle className="text-[18px] leading-snug line-clamp-2">
                {course.title}
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Instructor: {course.instructor}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-4">
              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span>{course.completedLessons} of {course.totalLessons} lessons</span>
                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-2" />
              </div>

              {/* Action Button */}
              <Button
                className={`w-full h-[44px] gap-2 font-medium text-sm ${
                  course.progress === 100
                    ? "bg-[#16A34A] hover:bg-[#15803D] text-white"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                }`}
                asChild
              >
                <Link href={`/student/course/${course.slug}`}>
                  {course.progress === 100 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Review Course
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" /> Continue Learning
                    </>
                  )}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
