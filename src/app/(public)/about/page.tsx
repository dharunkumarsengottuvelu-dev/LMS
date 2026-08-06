"use client";

import React from "react";
import Link from "next/link";
import {
  Shield, BookOpen, Code2, BarChart3,
  ClipboardList, FileText, Dumbbell, ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const team = [
  {
    name: "Kaaviya Dharun",
    role: "Platform Lead & Full-Stack Engineer",
    initials: "KD",
    color: "#2563EB",
    skills: ["Next.js", "React", "Supabase", "System Design"],
  },
  {
    name: "Arun Prasath",
    role: "Trainer & Course Author",
    initials: "AP",
    color: "#9333EA",
    skills: ["Python", "Data Science", "Pandas", "Scikit-learn"],
  },
  {
    name: "Dharunkumar S",
    role: "Student & Beta Tester",
    initials: "DS",
    color: "#16A34A",
    skills: ["DSA", "Java", "SQL", "Problem Solving"],
  },
];

const platform = [
  { icon: BookOpen,      label: "Course Authoring",       desc: "Video, reading, quiz & coding modules",     color: "#2563EB" },
  { icon: Code2,         label: "Live Code Playground",   desc: "Monaco editor, 14+ languages, test cases",  color: "#16A34A" },
  { icon: ClipboardList, label: "Proctored Assessments",  desc: "Timed MCQ & coding exams by trainers",      color: "#D97706" },
  { icon: FileText,      label: "Assignment Grading",     desc: "Student submissions graded by trainers",    color: "#DC2626" },
  { icon: BarChart3,     label: "Performance Analytics",  desc: "Real-time progress tracking per student",   color: "#0891B2" },
  { icon: Dumbbell,      label: "Practice Tracks",        desc: "Self-paced coding drills with feedback",    color: "#9333EA" },
];

const enterprisePillars = [
  {
    title: "Integrated Assessment & Learning",
    desc: "Seamlessly combine video lessons, reading materials, live Monaco code execution, and proctored exams into unified learning paths.",
    icon: BookOpen,
    color: "#2563EB",
    badge: "UNIFIED PLATFORM",
  },
  {
    title: "Role-Based Security & Governance",
    desc: "Strict permission boundaries for Admins, Trainers, and Students ensure focused workflows, data privacy, and system security.",
    icon: Shield,
    color: "#9333EA",
    badge: "ROLE ISOLATED",
  },
  {
    title: "Actionable Capability Metrics",
    desc: "Track student performance, test case pass rates, assignment submission quality, and cohort progress with real-time analytics.",
    icon: BarChart3,
    color: "#16A34A",
    badge: "REAL-TIME METRICS",
  },
];

export default function AboutPage() {
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
            <Link href="/courses" className="hover:text-[#111827] transition-colors">Courses</Link>
            <Link href="/about" className="text-[#2563EB] font-bold border-b-2 border-[#2563EB] pb-0.5">About</Link>
          </nav>

          <Button className="h-[40px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg shadow-md" asChild>
            <Link href="/login">Get Started <ArrowRight className="h-4 w-4 ml-1.5 inline" /></Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-36 pb-20 px-6 text-center bg-gradient-to-b from-[#EFF6FF] to-white">
        <div className="max-w-[1280px] mx-auto space-y-6">
          <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-xs font-bold tracking-widest px-3 py-1">ABOUT EDUNEXUS</Badge>
          <h1 className="text-5xl md:text-[68px] font-black leading-[1.05] tracking-tight max-w-4xl mx-auto text-[#111827]">
            One Platform.{" "}
            <span className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#16A34A] bg-clip-text text-transparent">
              Three Portals.
            </span>
          </h1>
          <p className="text-xl text-[#6B7280] max-w-2xl mx-auto leading-relaxed">
            EduNexus is an enterprise-grade Learning Management System built for structured corporate training — with dedicated portals for Admins, Trainers, and Students.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-[#6B7280]">
            {["Role-Based Access", "Live Code Execution", "Proctored Exams", "Assignment Grading", "Performance Analytics"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" />
                <span className="font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Team ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-[1280px] mx-auto space-y-14">
          <div className="text-center space-y-3">
            <Badge className="bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/20 text-xs font-bold tracking-widest px-3 py-1">OUR TEAM</Badge>
            <h2 className="text-4xl font-black text-[#111827] tracking-tight">The People Behind EduNexus</h2>
            <p className="text-[#6B7280] text-lg max-w-xl mx-auto">
              A focused team working together to build, teach, and learn on the same platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((member) => (
              <div key={member.name} className="bg-white border border-[#E5E7EB] rounded-2xl p-7 space-y-5 hover:border-[#2563EB]/30 hover:shadow-lg transition-all duration-200">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md"
                    style={{ background: `linear-gradient(135deg, ${member.color}, ${member.color}99)` }}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <p className="font-bold text-[#111827] text-base">{member.name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{member.role}</p>
                  </div>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-2">
                  {member.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ color: member.color, background: `${member.color}12`, border: `1px solid ${member.color}25` }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Capabilities ── */}
      <section className="py-24 px-6 bg-[#F9FAFB] border-y border-[#E5E7EB]">
        <div className="max-w-[1280px] mx-auto space-y-14">
          <div className="text-center space-y-3">
            <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-xs font-bold tracking-widest px-3 py-1">PLATFORM CAPABILITIES</Badge>
            <h2 className="text-4xl font-black text-[#111827] tracking-tight">What&apos;s Inside the Platform</h2>
            <p className="text-[#6B7280] text-lg max-w-xl mx-auto">
              Six core modules covering every step from course creation to performance tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {platform.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-4 bg-white border border-[#E5E7EB] rounded-2xl p-5 hover:border-[#2563EB]/30 hover:shadow-md transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}12`, border: `1px solid ${item.color}25` }}>
                    <Icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#111827]">{item.label}</p>
                    <p className="text-xs text-[#6B7280] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Enterprise Platform Standards ── */}
      <section className="py-24 px-6 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-[1280px] mx-auto space-y-14">
          <div className="text-center space-y-3">
            <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-xs font-bold tracking-widest px-3 py-1">ENTERPRISE STANDARDS</Badge>
            <h2 className="text-4xl font-black text-[#111827] tracking-tight">Why Corporate Teams Trust EduNexus</h2>
            <p className="text-[#6B7280] text-lg max-w-xl mx-auto">
              Architected to meet the continuous skill development and assessment demands of modern organizations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {enterprisePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="rounded-2xl border border-[#E5E7EB] bg-white p-7 space-y-5 hover:border-[#2563EB]/30 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${pillar.color}12`, border: `1px solid ${pillar.color}25` }}>
                      <Icon className="h-6 w-6" style={{ color: pillar.color }} />
                    </div>
                    <span className="text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full" style={{ color: pillar.color, background: `${pillar.color}12`, border: `1px solid ${pillar.color}25` }}>
                      {pillar.badge}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-[#111827] text-lg leading-snug">{pillar.title}</h3>
                    <p className="text-sm text-[#6B7280] leading-relaxed">{pillar.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] border-t border-[#E5E7EB]">
        <div className="max-w-[1280px] mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-black text-[#111827] tracking-tight">
            Ready to See It in Action?
          </h2>
          <p className="text-lg text-[#6B7280] max-w-xl mx-auto">
            Log in to your portal and experience the full EduNexus platform — courses, assessments, analytics, and more.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button className="h-[52px] px-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-base rounded-xl shadow-lg w-full sm:w-auto" asChild>
              <Link href="/login">Go to Your Dashboard <ArrowRight className="h-5 w-5 ml-2 inline" /></Link>
            </Button>
            <Button variant="outline" className="h-[52px] px-8 border-[#E5E7EB] text-[#6B7280] hover:bg-white hover:text-[#111827] font-semibold text-base rounded-xl w-full sm:w-auto" asChild>
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </div>
        </div>
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
            <Link href="/login" className="hover:text-[#111827] transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
