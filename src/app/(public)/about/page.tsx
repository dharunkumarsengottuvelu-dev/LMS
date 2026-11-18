"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Building2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SensilearnLogo } from "@/components/brand/sensilearn-logo";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
  ScrollCard,
} from "@/components/ui/scroll-reveal";

const team = [
  {
    name: "Dharunkumar S",
    role: "Founder & Chief Executive Officer",
    initials: "DS",
    color: "#2563EB",
    bio: "Visionary founder steering SensiLearn towards bridging academic education and industry-grade practical capability.",
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border h-[72px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <SensilearnLogo
            size="md"
            variant="mark"
            href="/"
            priority
          />

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/about" className="text-primary font-bold border-b-2 border-primary pb-0.5">About</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button variant="outline" size="sm" className="rounded-xl font-semibold border-border text-xs px-2.5 sm:px-3" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-hover text-white font-bold rounded-xl gap-1.5 shadow-md shadow-primary/20 text-xs px-3 sm:px-4" asChild>
              <Link href="/login">Get Started <ArrowRight className="h-4 w-4 ml-0.5 hidden sm:inline" /></Link>
            </Button>

            {/* Mobile Sheet Trigger */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger className="md:hidden p-2 rounded-lg border border-border inline-flex items-center justify-center text-foreground hover:bg-accent">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[340px] bg-background border-border p-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <SheetHeader className="text-left pb-4 border-b border-border">
                    <SensilearnLogo
                      size="sm"
                      variant="mark"
                      href="/"
                    />
                  </SheetHeader>

                  <nav className="flex flex-col gap-3 text-sm font-semibold text-foreground">
                    <Link href="/" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-accent">Home</Link>
                    <Link href="/courses" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-accent">Courses</Link>
                    <Link href="/pricing" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-accent">Pricing</Link>
                    <Link href="/about" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg bg-primary/10 text-primary font-bold">About</Link>
                    <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-accent">Contact</Link>
                  </nav>
                </div>

                <div className="pt-6 border-t border-border space-y-2.5">
                  <Button variant="outline" className="w-full justify-center text-xs font-semibold h-10 border-border" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button className="w-full justify-center bg-primary hover:bg-primary-hover text-white text-xs font-semibold h-10" asChild>
                    <Link href="/login">Get Started</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-36 pb-20 px-4 sm:px-6 lg:px-8 text-center bg-gradient-to-b from-primary/10 via-background to-background border-b border-border">
        <ScrollReveal className="max-w-4xl mx-auto space-y-6">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold tracking-widest px-3.5 py-1">
            ABOUT SENSILEARN
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.1] tracking-tight text-foreground">
            Transforming Theory Into{" "}
            <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Practical Capability
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            SensiLearn is a next-generation learning and technology-driven training platform, built to bridge academic education and real-world career readiness.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-semibold text-muted-foreground">
            {["Outcome-Oriented", "Hands-On Practice", "Measurable Progress", "Enterprise Standards"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ── Leadership & Founder ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <ScrollReveal className="text-center space-y-3">
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs font-bold tracking-widest px-3 py-1">
              LEADERSHIP &amp; TEAM
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">The People Behind SensiLearn</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto font-medium">
              Driven by a shared mission to empower learners and build future-ready talent.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((member, idx) => (
              <ScrollCard key={member.name} index={idx} className="bg-background border border-border rounded-2xl p-7 space-y-5 hover:border-primary/40 hover:shadow-lg transition-all">
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
              </ScrollCard>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Commitments ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto space-y-14">
          <ScrollReveal className="text-center space-y-3">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold tracking-widest px-3 py-1">OUR COMMITMENT</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Creating Meaningful Learning Experiences</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Our core principles that define how every course, practice drill, and assessment is engineered.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {falconCommitments.map((c, idx) => (
              <ScrollCard key={c.name} index={idx} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-primary text-white font-black text-sm flex items-center justify-center shadow-sm">
                    {c.letter}
                  </span>
                  <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </ScrollCard>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Learning Ecosystem Banner ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-900/10 via-primary/10 to-background border-b border-border">
        <ScrollReveal className="max-w-4xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto shadow-md">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            A Comprehensive Learning Ecosystem
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            SensiLearn brings learning, practice, coding, assessment, and performance analytics together to shape the future of practical education and career capability.
          </p>
          <div className="pt-2">
            <Button className="h-[48px] px-8 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md" asChild>
              <Link href="/login">Explore the Platform <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <SensilearnLogo size="xs" variant="mark" href="/" />
            <span className="font-extrabold text-sm text-foreground">SensiLearn</span>
          </div>
          <p>© {new Date().getFullYear()} SensiLearn. All rights reserved.</p>
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
