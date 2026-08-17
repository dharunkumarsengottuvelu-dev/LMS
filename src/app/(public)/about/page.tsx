"use client";

import React from "react";
import Link from "next/link";
import {
  Shield, BookOpen, Code2, BarChart3,
  ClipboardList, FileText, Dumbbell, ArrowRight,
  CheckCircle2, Target, Layers, Briefcase,
  Brain, Laptop, Award, TrendingUp, Building2,
  Compass, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const team = [
  {
    name: "Dharunkumar S",
    role: "Founder & Chief Executive Officer",
    initials: "DS",
    color: "#2563EB",
    bio: "Visionary founder steering FALCON towards bridging academic education and industry-grade practical capability.",
    skills: ["System Architecture", "Product Strategy", "Technical Leadership", "Capability Design"],
  },
  {
    name: "Kaaviya Dharun",
    role: "Platform Lead & Full-Stack Engineer",
    initials: "KD",
    color: "#1D4ED8",
    bio: "Architecting modern next-gen learning engines, real-time code sandboxes, and secure proctoring ecosystems.",
    skills: ["Next.js", "React", "Supabase", "System Design"],
  },
  {
    name: "Arun Prasath",
    role: "Trainer & Technical Curriculum Lead",
    initials: "AP",
    color: "#16A34A",
    bio: "Curating industry-aligned practical tracks, hands-on coding challenges, and measurable assessment rubrics.",
    skills: ["Python", "Data Science", "Cloud", "Curriculum Design"],
  },
];

const falconCommitments = [
  { letter: "F", name: "Focused", desc: "Purpose-driven and learner-centric throughout the journey." },
  { letter: "A", name: "Adaptive", desc: "Designed to evolve with learner needs and industry changes." },
  { letter: "L", name: "Learning", desc: "Connecting foundational concepts with practical execution." },
  { letter: "C", name: "Curated", desc: "Built around relevant, structured, and high-impact learning content." },
  { letter: "O", name: "Organized", desc: "Systematic, measurable, and seamless to navigate." },
  { letter: "N", name: "Next-Gen", desc: "Powered by modern technologies and outcome-oriented methodologies." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border h-[72px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary/25 group-hover:scale-105 transition-transform duration-200">
              F
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-foreground tracking-tight">FALCON</span>
                <Badge variant="outline" className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20 text-[10px] font-extrabold px-2 py-0.5 tracking-wider">
                  LEARNING TECHNOLOGIES
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold hidden sm:block tracking-tight">Part of SENSI Group</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
            <Link href="/about" className="text-primary font-bold border-b-2 border-primary pb-0.5">About</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex rounded-xl font-semibold border-border" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-hover text-white font-bold rounded-xl gap-1.5 shadow-md shadow-primary/20" asChild>
              <Link href="/login">Get Started <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-36 pb-20 px-4 sm:px-6 lg:px-8 text-center bg-gradient-to-b from-primary/10 via-background to-background border-b border-border">
        <div className="max-w-4xl mx-auto space-y-6">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold tracking-widest px-3.5 py-1">
            ABOUT FALCON LEARNING TECHNOLOGIES
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.1] tracking-tight text-foreground">
            Transforming Theory Into{" "}
            <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Practical Capability
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            FALCON is a next-generation learning and technology-driven training company under <strong>SENSI Group of Companies</strong>, built to bridge academic education and real-world career readiness.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-semibold text-muted-foreground">
            {["Outcome-Oriented", "Hands-On Practice", "Measurable Progress", "SENSI Group Company"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leadership & Founder ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs font-bold tracking-widest px-3 py-1">
              LEADERSHIP &amp; TEAM
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">The People Behind FALCON</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto font-medium">
              Driven by a shared mission to empower learners and build future-ready talent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((member) => (
              <div key={member.name} className="bg-background border border-border rounded-2xl p-7 space-y-5 hover:border-primary/40 hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md"
                    style={{ background: `linear-gradient(135deg, ${member.color}, ${member.color}99)` }}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <p className="font-extrabold text-foreground text-base">{member.name}</p>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">{member.role}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                  {member.bio}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {member.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
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

      {/* ── Commitments ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold tracking-widest px-3 py-1">OUR COMMITMENT</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Creating Meaningful Learning Experiences</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Our core principles that define how every course, practice drill, and assessment is engineered.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {falconCommitments.map((c) => (
              <div key={c.name} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-primary text-white font-black text-sm flex items-center justify-center shadow-sm">
                    {c.letter}
                  </span>
                  <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SENSI Group Ecosystem Banner ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-900/10 via-primary/10 to-background border-b border-border">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto shadow-md">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Part of SENSI Group of Companies
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            FALCON Learning Technologies operates under the SENSI Group of Companies umbrella. Together, we are committed to shaping the future of technology, practical education, and continuous capability development across global industries.
          </p>
          <div className="pt-2">
            <Button className="h-[48px] px-8 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md" asChild>
              <Link href="/login">Explore the Ecosystem <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-black text-sm">F</div>
            <span className="font-extrabold text-sm text-foreground">FALCON Learning Technologies</span>
            <span className="text-muted-foreground">• SENSI Group</span>
          </div>
          <p>© {new Date().getFullYear()} FALCON Learning Technologies. All rights reserved.</p>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
