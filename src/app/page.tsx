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
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/10">

      {/* ── Top Navigation Bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-[68px] transition-colors duration-200">
        <div className="mnc-container h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-sm group-hover:scale-105 transition-transform duration-200">
              E
            </div>
            <span className="font-bold text-base text-foreground tracking-tight">EduNexus</span>
            <Badge variant="outline" className="hidden sm:inline-flex bg-primary/5 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5">
              ENTERPRISE LMS
            </Badge>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <Link href="/" className="text-primary font-bold border-b-2 border-primary pb-0.5">Home</Link>
            <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-hover text-white font-semibold gap-1.5 shadow-sm" asChild>
              <Link href="/login">Get Started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative pt-36 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mnc-container text-center relative z-10 space-y-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            MNC-GRADE ENTERPRISE LEARNING MANAGEMENT PLATFORM
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight max-w-4xl mx-auto text-foreground">
            The Learning System Built for <br />
            <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Modern Enterprises & Academies
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            Structured course authoring, live code playgrounds, proctored exams, and real-time performance analytics — all in one unified, role-isolated platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button className="h-[50px] px-8 bg-primary hover:bg-primary-hover text-white font-bold text-base rounded-xl shadow-lg gap-2.5 w-full sm:w-auto" asChild>
              <Link href="/login">
                Access Portal <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" className="h-[50px] px-8 border-border text-foreground hover:bg-accent font-semibold text-base rounded-xl w-full sm:w-auto" asChild>
              <Link href="/courses">Explore Courses</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-muted-foreground">
            {["Role-Based Access Control", "Proctored Exam Engine", "Live Code Execution", "Submission Grading"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Platform Stats ── */}
      <section className="py-14 border-y border-border bg-card">
        <div className="mnc-container grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center space-y-1">
              <p className="text-4xl sm:text-5xl font-black text-primary tracking-tight">{s.value}</p>
              <p className="text-sm font-bold text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground font-medium">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform Features Grid ── */}
      <section id="features" className="py-24 bg-background">
        <div className="mnc-container space-y-16">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-3 py-1">
              PLATFORM FEATURES
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Everything Your Organization Needs
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto font-medium">
              From course authoring to proctored assessments — purpose-built for enterprise workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="ui-card group hover:border-primary/40 space-y-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 border-t border-border bg-card">
        <div className="mnc-container space-y-16">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold px-3 py-1">
              WORKFLOW PIPELINE
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              A Seamless Learning Cycle
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto font-medium">
              From user provisioning to assessment grading — the entire lifecycle runs smoothly inside EduNexus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step) => (
              <div key={step.step} className="ui-card space-y-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-black text-primary">{step.step}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call To Action Banner ── */}
      <section className="py-20 bg-background">
        <div className="mnc-container">
          <div className="relative overflow-hidden rounded-2xl bg-primary p-10 sm:p-14 text-center space-y-6 shadow-elevated text-primary-foreground">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white relative z-10">
              Ready to Upgrade Your Learning Operations?
            </h2>
            <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto relative z-10 font-medium">
              Log in to your portal and start managing courses, conducting assessments, and tracking real-time performance today.
            </p>
            <div className="flex justify-center pt-2 relative z-10">
              <Button className="h-[48px] px-8 bg-white text-primary hover:bg-white/90 font-bold text-base rounded-xl shadow-md" asChild>
                <Link href="/login">
                  Go to Your Dashboard <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="mnc-container flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              E
            </div>
            <span className="font-bold text-sm text-foreground">EduNexus Platform</span>
          </div>
          <p>© {new Date().getFullYear()} EduNexus Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
