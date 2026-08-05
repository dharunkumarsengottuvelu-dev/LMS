"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Star, Clock, Users, ArrowRight, CheckCircle2, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const publicCourses = [
  {
    id: "c1",
    title: "Full Stack Next.js 16 & React 19 Enterprise Masterclass",
    category: "Web Development",
    rating: 4.9,
    students: "14,200",
    duration: "24 Hours",
    level: "Intermediate to Advanced",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
    description: "Build production-ready enterprise web applications using Server Components, Supabase, TailwindCSS, and AI integration.",
  },
  {
    id: "c2",
    title: "Python AI & LLM Machine Learning Engineering",
    category: "Artificial Intelligence",
    rating: 4.95,
    students: "18,900",
    duration: "32 Hours",
    level: "All Levels",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
    description: "Master PyTorch, Transformers, OpenAI API, and automated prompt engineering for enterprise AI solutions.",
  },
  {
    id: "c3",
    title: "PostgreSQL & Supabase High-Performance Database Systems",
    category: "Database Architecture",
    rating: 4.85,
    students: "9,600",
    duration: "18 Hours",
    level: "Intermediate",
    image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80",
    description: "Design fault-tolerant relational databases, Row Level Security (RLS) policies, B-Tree indexes, and WAL replication.",
  },
  {
    id: "c4",
    title: "DevOps, Kubernetes & Cloud Architecture Pipeline",
    category: "DevOps & Cloud",
    rating: 4.88,
    students: "11,400",
    duration: "28 Hours",
    level: "Advanced",
    image: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=800&q=80",
    description: "Automate CI/CD pipelines, Docker containerization, AWS deployment, and zero-downtime microservices orchestration.",
  },
];

export default function PublicCoursesPage() {
  const [search, setSearch] = useState("");

  const filtered = publicCourses.filter(
    (c) => c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] pt-24 pb-16">
      {/* Top Navbar Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold">
              E
            </div>
            <span className="font-bold text-lg text-[#111827] dark:text-[#FAFAFA]">
              EduNexus
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4B5563] dark:text-[#A1A1AA]">
            <Link href="/courses" className="text-[#2563EB] font-bold">Courses</Link>
            <Link href="/pricing" className="hover:text-[#111827] dark:hover:text-[#FAFAFA]">Pricing</Link>
            <Link href="/about" className="hover:text-[#111827] dark:hover:text-[#FAFAFA]">About</Link>
            <Link href="/contact" className="hover:text-[#111827] dark:hover:text-[#FAFAFA]">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold" asChild>
              <Link href="/register">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 space-y-10">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 font-bold px-3 py-1">
            EXPLORE CATALOG
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Enterprise Training Courses & Skill Tracks
          </h1>
          <p className="text-base text-[#6B7280] dark:text-[#A1A1AA]">
            Master modern technologies with hands-on coding environments, real-world projects, and verified digital certificates.
          </p>

          <div className="relative max-w-xl mx-auto pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search courses by title or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-[48px] text-sm rounded-xl border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#18181B]"
            />
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filtered.map((course) => (
            <Card key={course.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="h-48 overflow-hidden relative">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                <Badge className="absolute top-3 left-3 bg-[#09090B]/80 text-white border-0 text-xs font-bold">
                  {course.category}
                </Badge>
              </div>

              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span className="flex items-center gap-1 font-bold text-[#F59E0B]">
                    <Star className="h-3.5 w-3.5 fill-current" /> {course.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#2563EB]" /> {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-[#16A34A]" /> {course.students} Learners
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                  {course.title}
                </h3>

                <p className="text-xs text-[#6B7280] leading-relaxed">
                  {course.description}
                </p>

                <div className="pt-2 flex items-center justify-between border-t border-[#E5E7EB] dark:border-[#27272A]">
                  <span className="text-xs font-bold text-[#2563EB]">{course.level}</span>
                  <Link href="/login">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1 text-xs">
                      Enroll Course <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
