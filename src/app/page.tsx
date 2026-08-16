import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code2, BookOpen, BarChart3, Users,
  ArrowRight, CheckCircle2, ClipboardList,
  Sparkles, Target, Compass, Layers,
  ShieldCheck, Brain, Award, Building2,
  TrendingUp, Laptop, Check, UserCheck,
  Workflow, Zap, ChevronRight, Briefcase
} from "lucide-react";

export const metadata: Metadata = {
  title: "FALCON Learning Technologies — Transforming Learning Into Capability",
  description: "FALCON is a next-generation learning and technology-driven training ecosystem. Focused. Adaptive. Learning. Curated. Organized. Next-Gen. Part of SENSI Group of Companies.",
};

const falconAcronym = [
  { letter: "F", word: "Focused", desc: "Purpose-driven and learner-centric." },
  { letter: "A", word: "Adaptive", desc: "Designed to evolve with learner needs and industry changes." },
  { letter: "L", word: "Learning", desc: "Bridging theoretical knowledge with real-world practice." },
  { letter: "C", word: "Curated", desc: "Built around relevant, structured, and meaningful content." },
  { letter: "O", word: "Organized", desc: "Systematic, measurable, and easy to navigate." },
  { letter: "N", word: "Next-Gen", desc: "Powered by modern technology and forward-looking methodologies." },
];

const falconApproach = [
  {
    step: "01",
    tag: "LEARN",
    title: "Conceptual Foundations",
    desc: "Build strong conceptual foundations through structured and curated learning content.",
    color: "from-blue-600 to-indigo-600",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
    icon: BookOpen,
  },
  {
    step: "02",
    tag: "PRACTICE",
    title: "Hands-On Exercises",
    desc: "Strengthen understanding through hands-on exercises, coding challenges, and guided practice.",
    color: "from-indigo-600 to-violet-600",
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/5",
    icon: Code2,
  },
  {
    step: "03",
    tag: "APPLY",
    title: "Problem Solving",
    desc: "Use acquired knowledge to solve practical and real-world problems with intent.",
    color: "from-violet-600 to-purple-600",
    border: "border-violet-500/20",
    bg: "bg-violet-500/5",
    icon: Target,
  },
  {
    step: "04",
    tag: "BUILD",
    title: "Real-World Projects",
    desc: "Develop projects that demonstrate technical understanding and tangible implementation capability.",
    color: "from-emerald-600 to-teal-600",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
    icon: Laptop,
  },
  {
    step: "05",
    tag: "ASSESS",
    title: "Continuous Evaluation",
    desc: "Measure performance through structured assessments, proctored evaluations, and continuous feedback.",
    color: "from-amber-600 to-orange-600",
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    icon: ClipboardList,
  },
  {
    step: "06",
    tag: "ADVANCE",
    title: "Career Progression",
    desc: "Identify skill gaps, improve capabilities, and progress systematically toward higher levels of expertise.",
    color: "from-cyan-600 to-blue-600",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/5",
    icon: TrendingUp,
  },
];

const whyFalconPillars = [
  {
    title: "Practical by Design",
    desc: "Our learning experiences are built around application. Learners continuously translate concepts into practical implementation.",
    icon: Target,
    badge: "APPLICATION FIRST",
  },
  {
    title: "Structured Learning",
    desc: "Clearly defined learning paths provide a systematic journey from foundational concepts to advanced capabilities.",
    icon: Layers,
    badge: "STEP-BY-STEP",
  },
  {
    title: "Industry Alignment",
    desc: "Our training philosophy focuses on developing skills that are relevant to modern technologies, professional environments, and evolving industry requirements.",
    icon: Briefcase,
    badge: "CAREER RELEVANT",
  },
  {
    title: "Measurable Progress",
    desc: "Continuous assessments and performance insights help learners understand their strengths, identify gaps, and track improvement.",
    icon: BarChart3,
    badge: "DATA DRIVEN",
  },
  {
    title: "Project-Based Experience",
    desc: "Learners gain practical exposure by working on projects and real-world problem-solving scenarios.",
    icon: Code2,
    badge: "HANDS-ON",
  },
  {
    title: "Technology-Enabled",
    desc: "We leverage modern learning technologies to create an accessible, organized, and scalable learning ecosystem.",
    icon: Brain,
    badge: "NEXT-GEN PLATFORM",
  },
];

const whatWeDoList = [
  {
    title: "Technical Learning",
    desc: "Build strong foundations in programming, software technologies, tools, and technical concepts.",
    icon: BookOpen,
  },
  {
    title: "Practical Skill Development",
    desc: "Convert theoretical understanding into hands-on technical capability through structured practice.",
    icon: Code2,
  },
  {
    title: "Project-Based Learning",
    desc: "Develop real-world projects that encourage problem-solving, implementation, collaboration, and innovation.",
    icon: Laptop,
  },
  {
    title: "Assessments & Evaluation",
    desc: "Measure knowledge, practical skills, and learning progress through structured evaluation.",
    icon: ClipboardList,
  },
  {
    title: "Career Readiness",
    desc: "Develop the technical, analytical, and problem-solving capabilities required to navigate modern career opportunities.",
    icon: Award,
  },
  {
    title: "Continuous Development",
    desc: "Support lifelong learning through continuous practice, improvement, and progressive skill development.",
    icon: TrendingUp,
  },
];

const ecosystemSteps = [
  { label: "Learning", sub: "Curated Content" },
  { label: "Practice", sub: "Hands-on Code" },
  { label: "Projects", sub: "Real Solutions" },
  { label: "Assessment", sub: "Proctored Tests" },
  { label: "Performance", sub: "Deep Analytics" },
  { label: "Improvement", sub: "Continuous Growth" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">

      {/* ── Top Navigation Bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border h-[72px] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary/25 group-hover:scale-105 transition-transform duration-200">
              F
            </div>
            <span className="font-extrabold text-xl text-foreground tracking-tight">FALCON</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <Link href="#about" className="hover:text-foreground transition-colors">Who We Are</Link>
            <Link href="#approach" className="hover:text-foreground transition-colors">The Approach</Link>
            <Link href="#why-falcon" className="hover:text-foreground transition-colors">Why FALCON</Link>
            <Link href="#what-we-do" className="hover:text-foreground transition-colors">What We Do</Link>
            <Link href="#ecosystem" className="hover:text-foreground transition-colors">Ecosystem</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex rounded-xl font-semibold border-border" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-hover text-white font-bold rounded-xl gap-1.5 shadow-md shadow-primary/20" asChild>
              <Link href="/login">Get Started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative pt-36 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-primary/10 via-background/60 to-background border-b border-border/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8 animate-fade-up">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-bold text-primary tracking-wide shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>FALCON LEARNING TECHNOLOGIES</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-muted-foreground font-semibold">SENSI Group</span>
          </div>

          <div className="space-y-4">
            <p className="text-sm md:text-base font-extrabold uppercase tracking-[0.25em] text-primary">
              Focused • Adaptive • Learning • Curated • Organized • Next-Gen
            </p>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.08] tracking-tight text-foreground">
              Transforming Learning Into{" "}
              <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Capability
              </span>
            </h1>
          </div>

          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-normal">
            FALCON Learning Technologies is a next-generation learning and technology-driven training company focused on transforming traditional education into practical, measurable, and industry-relevant skill development.
          </p>

          <p className="text-sm sm:text-base font-medium text-foreground/80 max-w-2xl mx-auto">
            We empower learners to move beyond theoretical knowledge by creating structured learning experiences that connect concepts, practice, projects, assessment, and real-world application.
          </p>

          {/* Motto Badge */}
          <div className="inline-block p-4 rounded-2xl bg-card border border-border shadow-sm">
            <p className="text-sm sm:text-base font-bold text-foreground">
              <span className="text-primary">Learn with purpose.</span>{" "}
              <span className="text-indigo-500">Practice with intent.</span>{" "}
              <span className="text-emerald-500">Build with confidence.</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button className="h-[52px] px-8 bg-primary hover:bg-primary-hover text-white font-bold text-base rounded-xl shadow-lg shadow-primary/25 gap-2.5 w-full sm:w-auto" asChild>
              <Link href="#about">
                Explore FALCON <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" className="h-[52px] px-8 border-border text-foreground hover:bg-accent font-semibold text-base rounded-xl w-full sm:w-auto" asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>

          {/* Acronym Pills Grid */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {falconAcronym.map((item) => (
              <div key={item.word} className="p-3.5 rounded-xl bg-card/80 border border-border text-left hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                    {item.letter}
                  </span>
                  <span className="font-bold text-xs text-foreground">{item.word}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug line-clamp-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who We Are Section ── */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold tracking-wider px-3 py-1">
                WHO WE ARE
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-snug">
                Building the Future of Practical Learning
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed text-base">
                <p className="font-semibold text-foreground">
                  The world of work is evolving rapidly. Academic knowledge alone is no longer enough.
                </p>
                <p>
                  FALCON was established with a clear purpose: to bridge the gap between what learners study and what they need to perform in the real world.
                </p>
                <p>
                  We combine structured curriculum, practical training, technology-enabled learning, continuous assessment, and project-based experiences to create a learning ecosystem designed around capability development rather than syllabus completion.
                </p>
                <p className="font-medium text-foreground">
                  Our approach enables learners to transform knowledge into practical skills and practical skills into career readiness.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              {/* Vision Card */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/5 via-blue-500/5 to-indigo-500/10 border border-primary/20 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">OUR VISION</span>
                    <h3 className="text-xl font-bold text-foreground">A World Where Every Learner Can Apply What They Know</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our vision is to build a future-ready learning ecosystem where education is measured not only by what learners understand, but by what they can create, solve, and accomplish with that knowledge.
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  We aspire to become a trusted learning and capability-development platform that prepares individuals for an increasingly technology-driven and competitive world.
                </p>
              </div>

              {/* Philosophy Quote Card */}
              <div className="p-6 rounded-2xl bg-background border border-border space-y-3">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">OUR PHILOSOPHY</span>
                <h4 className="text-lg font-bold text-foreground">Knowledge Is the Foundation. Capability Is the Outcome.</h4>
                <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-4 py-1">
                  «Learning becomes meaningful when knowledge can be applied.»
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Mission Section ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs font-bold tracking-wider px-3 py-1">
              OUR MISSION
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Bridging Knowledge and Real-World Capability
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Our mission is to redefine learning through a practical, structured, and outcome-oriented approach.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Transforming Theory to Capability",
                desc: "Converting theoretical knowledge into actionable, practical skills that work in production environments.",
                icon: Zap,
              },
              {
                title: "Industry-Relevant Skills",
                desc: "Developing technical and professional competencies aligned with modern software and engineering stacks.",
                icon: Briefcase,
              },
              {
                title: "Structured Learning Journeys",
                desc: "Creating systematic, measurable paths that guide learners from foundational basics to advanced mastery.",
                icon: Layers,
              },
              {
                title: "Continuous Practice & Problem Solving",
                desc: "Encouraging regular coding drills, algorithmic challenges, and hands-on debugging exercises.",
                icon: Code2,
              },
              {
                title: "Project-Based Learning",
                desc: "Enabling learners to design, build, and deploy tangible end-to-end applications and solutions.",
                icon: Laptop,
              },
              {
                title: "Career Readiness & Growth",
                desc: "Preparing aspiring engineers and professionals to confidently seize evolving global career opportunities.",
                icon: Award,
              },
            ].map((m, idx) => {
              const Icon = m.icon;
              return (
                <div key={m.title} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all space-y-3 group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{m.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── The FALCON Approach ── */}
      <section id="approach" className="py-24 px-4 sm:px-6 lg:px-8 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold tracking-wider px-3 py-1">
              THE FALCON APPROACH
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              From Knowledge to Capability
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              FALCON follows a structured learning framework designed to take learners beyond conventional classroom education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {falconApproach.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.tag}
                  className={`p-7 rounded-2xl bg-background border ${step.border} space-y-5 hover:shadow-lg transition-all relative overflow-hidden group`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-foreground/20 group-hover:text-primary/40 transition-colors">
                      {step.step}
                    </span>
                    <Badge className={`bg-gradient-to-r ${step.color} text-white font-extrabold text-xs px-3 py-0.5 shadow-sm`}>
                      {step.tag}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why FALCON ── */}
      <section id="why-falcon" className="py-24 px-4 sm:px-6 lg:px-8 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold tracking-wider px-3 py-1">
              WHY FALCON
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Designed Around Outcomes, Not Just Learning
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              We empower learners with high-impact training that translates directly into real performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyFalconPillars.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="p-7 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-extrabold tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                      {p.badge}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── What We Do ── */}
      <section id="what-we-do" className="py-24 px-4 sm:px-6 lg:px-8 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold tracking-wider px-3 py-1">
              WHAT WE DO
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Learning. Training. Capability Development.
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              FALCON delivers technology-enabled learning and training experiences across multiple areas of skill development.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whatWeDoList.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-6 rounded-2xl bg-background border border-border hover:border-primary/40 transition-all space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-indigo-500/15 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Our Learning Ecosystem ── */}
      <section id="ecosystem" className="py-24 px-4 sm:px-6 lg:px-8 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 text-xs font-bold tracking-wider px-3 py-1">
              OUR LEARNING ECOSYSTEM
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              One Platform. A Complete Learning Journey.
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              FALCON is designed to provide an integrated learning environment where learners can experience the complete journey from learning to application.
            </p>
          </div>

          {/* Ecosystem Connected Flow */}
          <div className="p-8 rounded-3xl bg-card border border-border shadow-sm space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 relative">
              {ecosystemSteps.map((s, index) => (
                <div key={s.label} className="flex flex-col items-center text-center p-4 rounded-2xl bg-background border border-border relative group hover:border-primary transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm mb-3">
                    0{index + 1}
                  </div>
                  <p className="font-bold text-sm text-foreground">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{s.sub}</p>
                  {index < 5 && (
                    <ChevronRight className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 z-10" />
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/15 text-center max-w-2xl mx-auto">
              <p className="text-sm font-semibold text-foreground">
                Learning <span className="text-primary">→</span> Practice <span className="text-primary">→</span> Projects <span className="text-primary">→</span> Assessment <span className="text-primary">→</span> Performance <span className="text-primary">→</span> Improvement
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This connected approach enables learners to build skills progressively while maintaining visibility into their development.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Learners Quote Banner ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 via-card to-background border-b border-border">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold tracking-wider px-3 py-1">
            FOR LEARNERS
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Don&apos;t Just Prepare for the Future. Build the Skills for It.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            FALCON helps learners develop the confidence and capabilities required to navigate an evolving professional landscape. Whether building foundational knowledge, developing technical expertise, working on projects, or preparing for career opportunities, learners can follow a structured path designed around continuous growth.
          </p>

          <div className="p-8 rounded-2xl bg-card border border-border shadow-md max-w-xl mx-auto space-y-3">
            <p className="text-base font-bold text-foreground">
              Your potential is the <span className="text-primary">starting point</span>.
            </p>
            <p className="text-base font-bold text-foreground">
              Your skills are the <span className="text-indigo-500">foundation</span>.
            </p>
            <p className="text-base font-bold text-foreground">
              Your application creates the <span className="text-emerald-500">difference</span>.
            </p>
          </div>
        </div>
      </section>

      {/* ── Leadership & SENSI Group Section ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Leadership Profile */}
            <div className="p-8 sm:p-10 rounded-3xl bg-background border border-border space-y-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
                  DS
                </div>
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">LEADERSHIP</span>
                  <h3 className="text-2xl font-black text-foreground">Dharunkumar S</h3>
                  <p className="text-sm font-semibold text-muted-foreground">Founder &amp; Chief Executive Officer</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  FALCON Learning Technologies was founded by Dharunkumar S with a vision to create a modern learning ecosystem that bridges the gap between academic education and practical capability.
                </p>
                <p>
                  Under his leadership, FALCON focuses on building a structured, technology-driven approach to learning that enables students and aspiring professionals to move from theory to practice, practice to capability, and capability to opportunity.
                </p>
              </div>
            </div>

            {/* SENSI Group Connection */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-primary/5 to-background border border-indigo-500/20 space-y-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">GROUP ECOSYSTEM</span>
                  <h3 className="text-2xl font-black text-foreground">SENSI Group of Companies</h3>
                  <p className="text-sm font-semibold text-muted-foreground">Building a Stronger Technology &amp; Learning Ecosystem</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  FALCON Learning Technologies is a proud company under the <strong>SENSI Group of Companies</strong>.
                </p>
                <p>
                  As part of the SENSI ecosystem, FALCON is focused on learning, training, technology-enabled education, and capability development.
                </p>
                <p className="font-medium text-foreground">
                  Our objective is to contribute to a future where technology and education work together to create skilled, adaptable, and future-ready talent.
                </p>
              </div>
            </div>

          </div>

          {/* Our Purpose & Commitment Summary */}
          <div className="p-8 sm:p-12 rounded-3xl bg-primary text-primary-foreground space-y-6 text-center relative overflow-hidden shadow-xl">
            <div className="relative z-10 space-y-4 max-w-3xl mx-auto">
              <span className="text-xs font-black tracking-widest text-white/80 uppercase">OUR PURPOSE</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Empowering People Through Practical Learning
              </h2>
              <p className="text-base sm:text-lg text-white/90 leading-relaxed font-medium">
                We are building more than a training platform. We are building an ecosystem where learners can discover knowledge, develop skills, demonstrate capability, and prepare for the opportunities of tomorrow.
              </p>
              <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                <Button className="h-[48px] px-8 bg-white text-primary hover:bg-white/90 font-extrabold rounded-xl shadow-md transition-all hover:scale-[1.02]" asChild>
                  <Link href="/login">
                    Access FALCON Portal <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button className="h-[48px] px-8 bg-primary-hover/60 hover:bg-white hover:text-primary text-white border border-white/40 font-extrabold rounded-xl transition-all shadow-sm" asChild>
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-14 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-border">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                  F
                </div>
                <span className="font-extrabold text-xl text-foreground tracking-tight">FALCON</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Focused. Adaptive. Learning. Curated. Organized. Next-Gen.
              </p>
              <p className="text-xs text-primary font-semibold">
                Learn. Practice. Build. Evolve. — Transforming Theory Into Practical Capability.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-muted-foreground">
              <Link href="#about" className="hover:text-foreground transition-colors">Who We Are</Link>
              <Link href="#approach" className="hover:text-foreground transition-colors">Approach</Link>
              <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} FALCON Learning Technologies (SENSI Group). All rights reserved.</p>
            <p>Founder &amp; CEO: Dharunkumar S</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
