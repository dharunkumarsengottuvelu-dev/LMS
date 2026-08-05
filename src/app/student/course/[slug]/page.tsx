"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Play, CheckCircle2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
}

const mockModules = [
  {
    id: "m1",
    title: "Module 1: Introduction to Next.js 16 App Router",
    lessons: [
      { id: "l1", title: "1.1 Architecture & Server Components Overview", duration: "12 mins", completed: true },
      { id: "l2", title: "1.2 Layouts, Pages, and Nested Routes", duration: "18 mins", completed: true },
      { id: "l3", title: "1.3 Server Actions & Mutation Pipelines", duration: "25 mins", completed: false },
    ],
  },
  {
    id: "m2",
    title: "Module 2: Supabase Integration & RLS Security",
    lessons: [
      { id: "l4", title: "2.1 Database Schema & PostgreSQL Enums", duration: "15 mins", completed: false },
      { id: "l5", title: "2.2 Writing Row Level Security Policies", duration: "22 mins", completed: false },
    ],
  },
];

export default function StudentCoursePlayerPage() {
  const params = useParams();
  const rawSlug = params?.slug;
  const slug = (typeof rawSlug === "string" ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : "fullstack-web-development") || "fullstack-web-development";

  const initialLesson: Lesson = {
    id: "l1",
    title: "1.1 Architecture & Server Components Overview",
    duration: "12 mins",
    completed: true,
  };
  const [activeLesson, setActiveLesson] = useState<Lesson>(initialLesson);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
          <Link href="/student/my-courses">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827] dark:text-[#FAFAFA] capitalize">
            {slug.replace(/-/g, " ")}
          </h1>
          <p className="text-xs text-[#6B7280]">Course Progress: 65% Completed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video / Content Player */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <div className="aspect-video bg-[#09090B] flex items-center justify-center text-white relative">
              <div className="text-center space-y-3 p-6">
                <Play className="h-16 w-16 mx-auto text-[#2563EB] fill-current" />
                <p className="text-lg font-semibold">{activeLesson.title}</p>
                <p className="text-xs text-white/60">Click to start streaming interactive video lesson ({activeLesson.duration})</p>
              </div>
            </div>
            <CardContent className="p-6 space-y-3">
              <h2 className="text-[18px] font-semibold text-[#111827] dark:text-[#FAFAFA]">{activeLesson.title}</h2>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                In this lesson, you will learn standard production patterns for structuring Next.js App Router applications, implementing strict server components, and utilizing Tailwind CSS design tokens.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Modules & Lessons Drawer */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-6 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <CardTitle className="text-[16px]">Course Curriculum</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {mockModules.map((mod) => (
                <div key={mod.id} className="space-y-2">
                  <p className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">{mod.title}</p>
                  <div className="space-y-1">
                    {mod.lessons.map((les) => (
                      <button
                        key={les.id}
                        onClick={() => setActiveLesson(les)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs text-left transition-colors ${
                          activeLesson.id === les.id
                            ? "bg-[#2563EB]/10 text-[#2563EB] font-semibold"
                            : "hover:bg-[#F5F5F5] dark:hover:bg-[#27272A] text-[#6B7280]"
                        }`}
                      >
                        <span className="truncate flex-1">{les.title}</span>
                        {les.completed && <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0 ml-2" />}
                      </button>
                    ))}
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
