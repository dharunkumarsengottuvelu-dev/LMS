"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Search, Filter, Clock, Play, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const mockCourses = [
  {
    id: "c1",
    slug: "react-19-nextjs-16-masterclass",
    title: "React 19 & Next.js 16 Enterprise Production Masterclass",
    category: "Frontend Development",
    difficulty: "Intermediate",
    progress: 65,
    completedLessons: 18,
    totalLessons: 28,
    instructor: "Dharunkumar Sengottuvelu",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "c2",
    slug: "data-structures-and-algorithms-mastery",
    title: "Data Structures & Algorithms Problem Solving Track",
    category: "Algorithms & Logic",
    difficulty: "Advanced",
    progress: 30,
    completedLessons: 9,
    totalLessons: 30,
    instructor: "Dr. Arunkumar (Lead Technical Trainer)",
    thumbnail: "https://images.unsplash.com/photo-1516116211223-4c714cf99465?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "c3",
    slug: "system-design-cloud-database-architecture",
    title: "Fullstack Architecture & System Design Track",
    category: "System Engineering",
    difficulty: "Advanced",
    progress: 100,
    completedLessons: 24,
    totalLessons: 24,
    instructor: "Alex Rivera (Cloud Architect)",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "c4",
    slug: "python-data-science-machine-learning",
    title: "Python Data Science & AI Engineering Masterclass",
    category: "Data Science & AI",
    difficulty: "Intermediate",
    progress: 45,
    completedLessons: 12,
    totalLessons: 26,
    instructor: "Sarah Chen (AI Research Lead)",
    thumbnail: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&auto=format&fit=crop&q=80",
  },
];

export default function StudentCoursesPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const router = useRouter();

  const filteredCourses = mockCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase());
    if (tab === "in-progress") return matchesSearch && course.progress > 0 && course.progress < 100;
    if (tab === "completed") return matchesSearch && course.progress === 100;
    return matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-12 w-full">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            My Enrolled Courses
          </h1>
          <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Access your active training modules with playable YouTube video lessons and practice labs
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
          <TabsTrigger value="all" className="text-xs font-semibold">
            All Courses ({mockCourses.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="text-xs font-semibold">
            In Progress ({mockCourses.filter((c) => c.progress > 0 && c.progress < 100).length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs font-semibold">
            Completed ({mockCourses.filter((c) => c.progress === 100).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="h-full flex flex-col justify-between overflow-hidden hover:border-[#2563EB]/40 transition-colors bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl shadow-sm">
            {/* Thumbnail Header */}
            <div className="relative w-full h-44 overflow-hidden border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F1F5F9] dark:bg-[#09090B]">
              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
            </div>

            <CardHeader className="p-6 pb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs font-semibold border-[#2563EB]/30 text-[#2563EB]">
                  {course.category}
                </Badge>
                <Badge variant="secondary" className="text-xs font-medium capitalize">
                  {course.difficulty}
                </Badge>
              </div>
              <CardTitle className="text-[18px] leading-snug line-clamp-2 font-bold text-[#111827] dark:text-[#FAFAFA]">
                {course.title}
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Instructor: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{course.instructor}</span>
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
                className={`w-full h-[44px] gap-2 font-semibold text-xs ${
                  course.progress === 100
                    ? "bg-[#22C55E] hover:bg-[#16A34A] text-white"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
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
    </div>
  );
}
