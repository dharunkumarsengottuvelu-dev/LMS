import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code2, BookOpen, BarChart3, Users,
  ArrowRight, CheckCircle2, ClipboardList,
  FileText
} from "lucide-react";

export const metadata: Metadata = {
  title: "EduNexus — Enterprise Learning Management System",
  description: "The complete corporate LMS with role-based portals, embedded coding assessments, proctored exams, and real-time performance analytics.",
};

const features = [
  { icon: Users,         title: "3 Role-Based Portals",         desc: "Dedicated dashboards for Admins, Trainers, and Students — each with role-specific controls, analytics, and workflows.", color: "#2563EB" },
  { icon: BookOpen,      title: "Course Authoring Studio",       desc: "Build rich multi-module courses with video lessons, reading materials, quizzes, and coding assignments — all in one wizard.", color: "#9333EA" },
  { icon: Code2,         title: "Embedded Code Playground",      desc: "Monaco-powered in-browser coding environment supporting 14+ languages with live output and test case validation.", color: "#16A34A" },
  { icon: ClipboardList, title: "Proctored Assessments",         desc: "Secure, timed exams with MCQ, multi-select, and coding question types — fully managed from the trainer panel.", color: "#D97706" },
  { icon: BarChart3,     title: "Student Performance Analytics", desc: "Live tracking of course progress, assignment scores, code submission quality, and overall capability metrics per student.", color: "#0891B2" },
  { icon: FileText,      title: "Assignment Grading System",     desc: "Structured submission and grading workflow — students submit, trainers review and grade with inline feedback.", color: "#DC2626" },
];

const stats = [
  { value: "3",    label: "Dedicated Portals",  sub: "Admin, Trainer, Student" },
  { value: "14+",  label: "Coding Languages",   sub: "Monaco + Judge0 Engine" },
  { value: "100%", label: "Role Isolated",       sub: "Secure RBAC Access" },
  { value: "24/7", label: "Live Analytics",      sub: "Real-time Performance" },
];

const howItWorks = [
  { step: "01", title: "Admin Sets Up",    desc: "Admin creates user accounts, assigns roles (trainer/student), creates course catalog, and organizes student batches." },
  { step: "02", title: "Trainer Authors",  desc: "Trainers build rich course modules, schedule assessments, and assign coursework to their designated student groups." },
  { step: "03", title: "Students Learn",   desc: "Students access their assigned courses, complete practices, attempt proctored exams, and submit assignments." },
  { step: "04", title: "Track & Improve",  desc: "Trainers and Admins monitor progress, grade submissions, and review analytics to identify improvement areas." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#111827]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Top Navigation ── */}
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
            <Link href="/" className="text-[#2563EB] font-bold border-b-2 border-[#2563EB] pb-0.5">Home</Link>
            <Link href="/courses" className="hover:text-[#111827] transition-colors">Courses</Link>
            <Link href="/about" className="hover:text-[#111827] transition-colors">About</Link>
          </nav>

          <Button className="h-[40px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg shadow-md" asChild>
            <Link href="/login">Get Started <ArrowRight className="h-4 w-4 ml-1.5 inline" /></Link>
          </Button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative pt-40 pb-28 px-6 overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-[#F5F3FF]/40 to-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-[#BFDBFE]/40 via-[#DDD6FE]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1280px] mx-auto text-center relative z-10 space-y-7">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2563EB]/8 border border-[#2563EB]/20 text-xs font-semibold text-[#2563EB] tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            ENTERPRISE LEARNING MANAGEMENT SYSTEM
          </div>

          <h1 className="text-5xl md:text-[72px] font-black leading-[1.05] tracking-tight max-w-4xl mx-auto">
            <span className="text-[#111827]">The LMS Built for</span>
            <br />
            <span className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#16A34A] bg-clip-text text-transparent">
              Modern Enterprises
            </span>
          </h1>

          <p className="text-xl text-[#6B7280] max-w-2xl mx-auto leading-relaxed font-medium">
            Structured learning, live code assessments, proctored exams, and real-time analytics — delivered through dedicated portals for Admins, Trainers, and Students.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button className="h-[52px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base rounded-xl shadow-xl shadow-blue-200 gap-2 w-full sm:w-auto" asChild>
              <Link href="/login">
                Start Your Portal <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" className="h-[52px] px-8 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] font-semibold text-base rounded-xl w-full sm:w-auto" asChild>
              <Link href="/courses">Explore Courses</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-[#6B7280]">
            {["Role-Based Access Control", "Proctored Exam Engine", "Live Code Execution", "Assignment Grading"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" />
                <span className="font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 border-y border-[#E5E7EB] bg-white">
        <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center space-y-1.5">
              <p className="text-5xl font-black text-[#2563EB]">{s.value}</p>
              <p className="text-sm font-bold text-[#111827]">{s.label}</p>
              <p className="text-xs text-[#9CA3AF]">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform Features ── */}
      <section id="features" className="py-28 px-6 bg-[#F9FAFB]">
        <div className="max-w-[1280px] mx-auto space-y-16">
          <div className="text-center space-y-3">
            <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-xs font-semibold tracking-wider px-3 py-1">PLATFORM FEATURES</Badge>
            <h2 className="text-4xl font-black text-[#111827] tracking-tight">Everything Your Teams Need</h2>
            <p className="text-[#6B7280] text-lg max-w-xl mx-auto">From course authoring to proctored exams — every feature is built for real enterprise workflows.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group bg-white border border-[#E5E7EB] hover:border-[#2563EB]/30 hover:shadow-lg rounded-2xl p-6 space-y-4 transition-all duration-200">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${f.color}12`, border: `1px solid ${f.color}25` }}>
                    <Icon className="h-5 w-5" style={{ color: f.color }} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-[#111827] group-hover:text-[#2563EB] transition-colors">{f.title}</h3>
                    <p className="text-sm text-[#6B7280] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-28 px-6 bg-[#F9FAFB]">
        <div className="max-w-[1280px] mx-auto space-y-16">
          <div className="text-center space-y-3">
            <Badge className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20 text-xs font-semibold tracking-wider px-3 py-1">HOW IT WORKS</Badge>
            <h2 className="text-4xl font-black text-[#111827] tracking-tight">A Seamless Learning Cycle</h2>
            <p className="text-[#6B7280] text-lg max-w-xl mx-auto">From setup to assessment — the entire workflow runs inside EduNexus.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step) => (
              <div key={step.step} className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] border border-[#BFDBFE] flex items-center justify-center">
                  <span className="text-2xl font-black text-[#2563EB]">{step.step}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-[#111827]">{step.title}</h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#7C3AED] p-12 md:p-16 text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight relative z-10">Ready to Transform Your Training?</h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto relative z-10">Log in to your portal and start managing courses, conducting assessments, and tracking real-time performance today.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 relative z-10">
              <Button className="h-[52px] px-10 bg-white text-[#1E3A8A] hover:bg-white/90 font-black text-base rounded-xl shadow-xl w-full sm:w-auto" asChild>
                <Link href="/login">Go to Your Dashboard <ArrowRight className="h-5 w-5 ml-2 inline" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 border-t border-[#E5E7EB] bg-white">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#9CA3AF]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white font-bold text-sm">E</div>
            <span className="font-bold text-sm text-[#111827]">EduNexus</span>
            <span className="text-[#9CA3AF]">Enterprise Learning Platform</span>
          </div>
          <p>© {new Date().getFullYear()} EduNexus Platform. Built for modern engineering teams.</p>
          <div className="flex items-center gap-6">
            <Link href="/about"  className="hover:text-[#111827] transition-colors">About</Link>
            <Link href="/courses" className="hover:text-[#111827] transition-colors">Courses</Link>
            <Link href="/login"  className="hover:text-[#111827] transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
