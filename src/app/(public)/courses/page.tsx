"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Star, Clock, Users, ArrowRight, Code2, BarChart3, ClipboardList, Dumbbell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { useLMSStore } from "@/lib/store/lms-store";

export default function PublicCoursesPage() {
  const [search, setSearch] = useState("");
  const { courses: storeCourses } = useLMSStore();

  const coursesList = storeCourses.map((c: any) => {
    const catStr = typeof c.category === "string" ? c.category : (c.category?.name || "General");
    return {
      id: c.id,
      title: c.title,
      category: catStr,
      icon: Code2,
      color: "#9333EA",
      rating: 5.0,
      students: "Enrolled",
      duration: "Self-paced",
      modules: c.modules?.length || 0,
      level: c.level || "All Levels",
      description: c.description || "Interactive course module.",
      topics: ["Curriculum Modules", "Live Practice", "Proctored Tests"],
    };
  });

  const filtered = coursesList.filter(
    (c) => c.title.toLowerCase().includes(search.toLowerCase()) || String(c.category).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-[#111827]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E5E7EB] h-[68px]">
        <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white font-bold text-base shadow-md">
              E
            </div>
            <span className="font-bold text-base text-[#111827] tracking-tight">EduNexus</span>
            <span className="hidden sm:inline text-[10px] font-semibold text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-full tracking-widest">ENTERPRISE LMS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B7280]">
            <Link href="/" className="hover:text-[#111827] transition-colors">Home</Link>
            <Link href="/courses" className="text-[#2563EB] font-bold border-b-2 border-[#2563EB] pb-0.5">Courses</Link>
            <Link href="/about" className="hover:text-[#111827] transition-colors">About</Link>
          </nav>

          <Button className="h-[40px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg shadow-md" asChild>
            <Link href="/login">Get Started <ArrowRight className="h-4 w-4 ml-1.5 inline" /></Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-36 pb-16 px-6 text-center bg-gradient-to-b from-[#EFF6FF] to-white">
        <div className="max-w-[1280px] mx-auto space-y-5">
          <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-xs font-bold tracking-widest px-3 py-1">COURSE CATALOG</Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#111827]">
            Courses Built for <span className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#16A34A] bg-clip-text text-transparent">Your Role</span>
          </h1>
          <p className="text-[#6B7280] text-lg max-w-xl mx-auto">
            Assigned by your trainer, tracked by your admin — access courses built exactly for your learning path.
          </p>
          <div className="relative max-w-lg mx-auto pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input
              placeholder="Search by course title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-[48px] text-sm rounded-xl border-[#E5E7EB] bg-white text-[#111827] placeholder:text-[#9CA3AF] focus-visible:ring-[#2563EB] shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* ── Courses Grid ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => {
            const Icon = course.icon;
            return (
              <div key={course.id} className="group bg-white border border-[#E5E7EB] hover:border-[#2563EB]/30 hover:shadow-lg rounded-2xl p-6 space-y-4 transition-all duration-200 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${course.color}12`, border: `1px solid ${course.color}25` }}>
                    <Icon className="h-5 w-5" style={{ color: course.color }} />
                  </div>
                  <Badge className="text-[10px] font-black tracking-widest px-2.5 py-0.5" style={{ color: course.color, background: `${course.color}12`, border: `1px solid ${course.color}25` }}>
                    {course.category.toUpperCase()}
                  </Badge>
                </div>

                {/* Title & Desc */}
                <div className="space-y-2 flex-1">
                  <h3 className="text-base font-bold text-[#111827] group-hover:text-[#2563EB] transition-colors leading-snug">{course.title}</h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed">{course.description}</p>
                </div>

                {/* Topics */}
                <div className="flex flex-wrap gap-1.5">
                  {course.topics.map((t) => (
                    <span key={t} className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] text-[#4B5563]">{t}</span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-[#6B7280] border-t border-[#E5E7EB] pt-3">
                  <span className="flex items-center gap-1 font-bold text-[#F59E0B]"><Star className="h-3.5 w-3.5 fill-current" /> {course.rating}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.students} enrolled</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold" style={{ color: course.color }}>{course.level}</span>
                  <Link href="/login">
                    <Button size="sm" className="h-8 px-4 text-xs font-bold gap-1 text-white shadow-sm" style={{ background: course.color }}>
                      Enroll Now <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-[#9CA3AF]">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No courses found for &quot;{search}&quot;</p>
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-[#E5E7EB] bg-white">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#6B7280]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white font-bold text-sm">E</div>
            <span className="font-bold text-sm text-[#111827]">EduNexus</span>
            <span className="text-[#9CA3AF]">Enterprise Learning Platform</span>
          </div>
          <p>© {new Date().getFullYear()} EduNexus Platform. Built for modern engineering teams.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[#111827] transition-colors">Home</Link>
            <Link href="/courses" className="hover:text-[#111827] transition-colors">Courses</Link>
            <Link href="/about" className="hover:text-[#111827] transition-colors">About</Link>
            <Link href="/login" className="hover:text-[#111827] transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
