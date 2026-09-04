"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  BookOpen,
  ShieldCheck,
  Video,
  BarChart3,
  Terminal,
  Check,
  Copy,
  Users,
  GraduationCap,
  Building2,
  Menu,
  ChevronRight,
  ChevronLeft,
  Clock,
  Layers,
  FileText,
  Boxes,
  Lock,
  Search,
  Activity,
  Award,
  TrendingUp,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Approach Cards Data with High-Resolution MNC Corporate Imagery (Clean, Zero Numbers)
const APPROACH_STEPS = [
  {
    title: "LEARN",
    desc: "Structured courses and curated digital learning experiences.",
    image: "/images/approach/learn.jpg",
  },
  {
    title: "PRACTICE",
    desc: "Hands-on engineering practice and targeted assignments.",
    image: "/images/approach/practice.jpg",
  },
  {
    title: "CODE",
    desc: "Real coding problems, test cases, submissions and automated online judge evaluation.",
    image: "/images/approach/code.jpg",
  },
  {
    title: "ASSESS",
    desc: "Technical, aptitude, reasoning and proctored coding assessments.",
    image: "/images/approach/assess.jpg",
  },
  {
    title: "ANALYZE",
    desc: "Performance intelligence, cohort progress and active learning activity.",
    image: "/images/approach/analyze.jpg",
  },
  {
    title: "IMPROVE",
    desc: "Continuous capability development through measurable learning insights.",
    image: "/images/approach/improve.jpg",
  },
];



// WHY FALCON Core Value Propositions (Clean Typography, Zero Icons, Pure Content)
const WHY_FALCON_FEATURES = [
  {
    title: "Connected Learning",
    desc: "Bring courses, practice, assignments, coding and assessments together into one continuous experience.",
  },
  {
    title: "Measurable Skills",
    desc: "Move beyond content consumption and measure practical ability through hands-on technical execution.",
  },
  {
    title: "Intelligent Insights",
    desc: "Use learning and performance data to understand progress, identify gaps, and guide targeted remediation.",
  },
  {
    title: "Built for Institutions",
    desc: "Support students, trainers, administrators, batches and structured learning workflows with granular controls.",
  },
  {
    title: "Practical Evaluation",
    desc: "Evaluate students through real coding, assessments and hands-on activities with anti-cheat protection.",
  },
  {
    title: "Continuous Growth",
    desc: "Track progress and encourage consistent learning with automated activity monitoring and streak tracking.",
  },
];

// Circular 3D Movable Carousel for "WHY FALCON" (Fills Both Sides, Zero Icons, Pure MNC Typography)
function WhyFalconCircular3DCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const total = WHY_FALCON_FEATURES.length; // 6

  // Responsive stage offset to fill both sides seamlessly across all viewports
  const [spacing, setSpacing] = useState(480);

  useEffect(() => {
    const updateSpacing = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      if (w < 640) {
        setSpacing(310);
      } else if (w < 1024) {
        setSpacing(390);
      } else if (w < 1440) {
        setSpacing(460);
      } else {
        setSpacing(510);
      }
    };
    updateSpacing();
    window.addEventListener("resize", updateSpacing);
    return () => window.removeEventListener("resize", updateSpacing);
  }, []);

  // Continuous auto-movement every 3.0 seconds (resumes reliably, never stuck)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isDraggingRef.current) {
        setActiveIndex((prev) => (prev + 1) % total);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [total]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const diff = e.clientX - startXRef.current;
    if (diff > 45) {
      handlePrev();
    } else if (diff < -45) {
      handleNext();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    isDraggingRef.current = true;
    startXRef.current = e.touches[0]!.clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.changedTouches.length === 0) return;
    isDraggingRef.current = false;
    const diff = e.changedTouches[0]!.clientX - startXRef.current;
    if (diff > 45) {
      handlePrev();
    } else if (diff < -45) {
      handleNext();
    }
  };

  // Calculates 3D multi-card position filling both left and right sides
  const getCardPosition = (idx: number) => {
    let diff = (idx - activeIndex) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    if (diff === 0) {
      return {
        transform: "translateX(0px) translateZ(0px) rotateY(0deg) scale(1)",
        opacity: 1,
        zIndex: 30,
        pointerEvents: "auto" as const,
        isCenter: true,
      };
    }
    if (diff === -1) {
      return {
        transform: `translateX(-${spacing}px) translateZ(-60px) rotateY(18deg) scale(0.92)`,
        opacity: 0.85,
        zIndex: 20,
        pointerEvents: "auto" as const,
        isCenter: false,
      };
    }
    if (diff === 1) {
      return {
        transform: `translateX(${spacing}px) translateZ(-60px) rotateY(-18deg) scale(0.92)`,
        opacity: 0.85,
        zIndex: 20,
        pointerEvents: "auto" as const,
        isCenter: false,
      };
    }
    if (diff === -2) {
      return {
        transform: `translateX(-${spacing * 1.72}px) translateZ(-160px) rotateY(28deg) scale(0.82)`,
        opacity: 0.45,
        zIndex: 10,
        pointerEvents: "auto" as const,
        isCenter: false,
      };
    }
    if (diff === 2) {
      return {
        transform: `translateX(${spacing * 1.72}px) translateZ(-160px) rotateY(-28deg) scale(0.82)`,
        opacity: 0.45,
        zIndex: 10,
        pointerEvents: "auto" as const,
        isCenter: false,
      };
    }
    return {
      transform: `translateX(${diff > 0 ? spacing * 2.2 : -spacing * 2.2}px) translateZ(-260px) scale(0.6)`,
      opacity: 0,
      zIndex: 0,
      pointerEvents: "none" as const,
      isCenter: false,
    };
  };

  return (
    <div className="relative w-full max-w-[1520px] mx-auto select-none py-6 overflow-hidden">
      {/* Pure Floating Arrow Navigation Controls */}
      <button
        onClick={handlePrev}
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-40 p-2 text-slate-700 hover:text-slate-950 transition-all duration-200 hover:scale-125 active:scale-95 cursor-pointer"
        title="Previous"
        aria-label="Previous"
      >
        <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10 stroke-[2.5]" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-40 p-2 text-slate-700 hover:text-slate-950 transition-all duration-200 hover:scale-125 active:scale-95 cursor-pointer"
        title="Next"
        aria-label="Next"
      >
        <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10 stroke-[2.5]" />
      </button>

      {/* 3D Perspective Stage that fills both sides */}
      <div
        className="relative w-full h-[320px] sm:h-[350px] flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{
          perspective: "1200px",
          perspectiveOrigin: "50% 50%",
        }}
        onMouseLeave={() => {
          isDraggingRef.current = false;
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {WHY_FALCON_FEATURES.map((item, idx) => {
            const pos = getCardPosition(idx);

            return (
              <div
                key={item.title}
                onClick={() => setActiveIndex(idx)}
                className={`absolute w-[290px] sm:w-[410px] md:w-[460px] p-7 sm:p-9 rounded-2xl bg-white border transition-all duration-500 ease-out flex flex-col justify-center cursor-pointer ${
                  pos.isCenter
                    ? "border-[#2563EB] shadow-[0_25px_50px_-12px_rgba(37,99,235,0.2),0_10px_25px_-5px_rgba(15,23,42,0.1)] cursor-default"
                    : "border-slate-200/90 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.08)] hover:border-slate-300"
                }`}
                style={{
                  transformStyle: "preserve-3d",
                  transform: pos.transform,
                  opacity: pos.opacity,
                  zIndex: pos.zIndex,
                  pointerEvents: pos.pointerEvents,
                  backfaceVisibility: "hidden",
                }}
              >
                <div className="space-y-3 sm:space-y-3.5">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {item.title}
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// WHAT WE DO Core Platform Modules Data (Zero Icons, Pure Typography)
const PLATFORM_MODULES = [
  {
    title: "Courses",
    desc: "Structured learning experiences organized into modules and lessons with multi-provider video support.",
  },
  {
    title: "Practices",
    desc: "Continuous skill development through interactive drills, conceptual exercises, and guided practice tracks.",
  },
  {
    title: "Assignments",
    desc: "Targeted learning activities assigned by trainers and administrators with repository and file submission tracking.",
  },
  {
    title: "Coding",
    desc: "A dedicated coding environment with problems, test cases, execution, submissions and automated evaluation.",
  },
  {
    title: "Assessments",
    desc: "Aptitude, logical reasoning, programming fundamentals and technical assessments with webcam proctoring.",
  },
  {
    title: "Live Classes",
    desc: "Real-time instructor-led learning via in-app classrooms or Google Meet, Zoom, and Teams with automated rosters.",
  },
  {
    title: "Analytics",
    desc: "Meaningful student and institutional performance insights tracking active learning time, submission marks, and cohort progress.",
  },
];

// 3D Kinetic Expanding Horizon Deck for "WHAT WE DO" (MNC Enterprise Level, Ultra-Smooth)
function WhatWeDoHorizonDeck() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const total = PLATFORM_MODULES.length; // 7

  // Continuous auto-movement every 3.2s
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 3200);
    return () => clearInterval(timer);
  }, [isHovered, total]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  return (
    <div 
      className="relative w-full max-w-5xl mx-auto py-2 select-none space-y-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Refined MNC Header Control Bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800">
          {PLATFORM_MODULES[activeIndex]?.title}
        </span>

        {/* Pure Chevron Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1.5 text-slate-600 hover:text-slate-950 transition-all duration-200 hover:scale-120 active:scale-95 cursor-pointer"
            title="Previous Capability"
            aria-label="Previous Capability"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.2]" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 text-slate-600 hover:text-slate-950 transition-all duration-200 hover:scale-120 active:scale-95 cursor-pointer"
            title="Next Capability"
            aria-label="Next Capability"
          >
            <ChevronRight className="h-5 w-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Desktop & Laptop: Compact & Ultra-Smooth 3D Expanding Horizon Blades */}
      <div 
        className="hidden md:flex gap-2.5 h-[260px] w-full"
        style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
      >
        {PLATFORM_MODULES.map((mod, idx) => {
          const isActive = idx === activeIndex;

          return (
            <div
              key={mod.title}
              onClick={() => setActiveIndex(idx)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`group relative rounded-xl bg-white border cursor-pointer overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] ${
                isActive
                  ? "flex-[3.6] min-w-[300px] border-[#2563EB] shadow-[0_16px_36px_-10px_rgba(37,99,235,0.18),0_6px_16px_-4px_rgba(15,23,42,0.05)]"
                  : "flex-1 min-w-[46px] border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs hover:bg-slate-50/60"
              }`}
              style={{
                transform: isActive
                  ? "translateZ(14px)"
                  : idx < activeIndex
                  ? "translateZ(0px) rotateY(3deg)"
                  : "translateZ(0px) rotateY(-3deg)",
                transformStyle: "preserve-3d",
                willChange: "flex, transform",
              }}
            >
              {/* Active Top Accent Line */}
              <div 
                className={`absolute top-0 inset-x-0 h-[2px] bg-[#2563EB] transition-opacity duration-500 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Clean Expanded Content Layer (Compact, Balanced Enterprise Typography) */}
              <div
                className={`absolute inset-0 p-6 sm:p-7 flex flex-col justify-center transition-all duration-500 ease-out ${
                  isActive
                    ? "opacity-100 translate-x-0 pointer-events-auto delay-150"
                    : "opacity-0 -translate-x-3 pointer-events-none"
                }`}
              >
                <div className="space-y-2.5 max-w-lg">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                    {mod.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {mod.desc}
                  </p>
                </div>
              </div>

              {/* Collapsed Vertical Monolith Blade (Compact, Elegant Vertical Typography) */}
              <div
                className={`absolute inset-0 flex items-center justify-center p-2.5 transition-all duration-300 ${
                  isActive
                    ? "opacity-0 pointer-events-none scale-95"
                    : "opacity-100 pointer-events-auto scale-100"
                }`}
              >
                <span className="text-xs sm:text-sm font-semibold text-slate-700 tracking-wider [writing-mode:vertical-rl] rotate-180 select-none whitespace-nowrap group-hover:text-slate-950 transition-colors">
                  {mod.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile & Small Screen: Clean Compact Accordion */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {PLATFORM_MODULES.map((mod, idx) => {
          const isActive = idx === activeIndex;

          return (
            <div
              key={mod.title}
              onClick={() => setActiveIndex(idx)}
              className={`rounded-xl border bg-white p-4 cursor-pointer transition-all duration-300 ${
                isActive
                  ? "border-[#2563EB] shadow-md"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  {mod.title}
                </h3>

                <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${
                  isActive ? "rotate-90 text-[#2563EB]" : "text-slate-400"
                }`} />
              </div>

              {isActive && (
                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed pt-2.5 border-t border-slate-100">
                  {mod.desc}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// HOW IT WORKS - Kinetic Flow Conduit (Step Pipeline)
// ──────────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  {
    num: "01",
    title: "LEARN",
    desc: "Access structured learning through curriculum modules and interactive video lessons.",
  },
  {
    num: "02",
    title: "PRACTICE",
    desc: "Strengthen knowledge through guided practice tracks and conceptual exercises.",
  },
  {
    num: "03",
    title: "APPLY",
    desc: "Solve assignments and coding problems inside the Monaco development environment.",
  },
  {
    num: "04",
    title: "ASSESS",
    desc: "Measure knowledge and practical ability with proctored technical evaluations.",
  },
  {
    num: "05",
    title: "IMPROVE",
    desc: "Use performance insights, activity audits, and streak tracking to grow continuously.",
  },
];

function HowItWorksConduit() {
  const [activeStep, setActiveStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [mouseTilt, setMouseTilt] = useState<{ x: number; y: number; idx: number | null }>({ x: 0, y: 0, idx: null });
  const total = WORKFLOW_STEPS.length; // 5

  // Continuous auto-movement every 3.0s
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % total);
    }, 3000);
    return () => clearInterval(timer);
  }, [isHovered, total]);

  const handlePrev = () => {
    setActiveStep((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % total);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x: y * -10, y: x * 10, idx });
  };

  const handleMouseLeaveCard = () => {
    setMouseTilt({ x: 0, y: 0, idx: null });
  };

  return (
    <div
      className="relative w-full max-w-5xl mx-auto select-none space-y-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseLeaveCard();
      }}
    >
      {/* Top Status & Controls */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800">
          Workflow: <span className="text-[#2563EB] font-bold">{WORKFLOW_STEPS[activeStep]?.title}</span>
        </span>

        {/* Pure Chevron Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1.5 text-slate-600 hover:text-slate-950 transition-all duration-200 hover:scale-120 active:scale-95 cursor-pointer"
            title="Previous Step"
            aria-label="Previous Step"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.2]" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 text-slate-600 hover:text-slate-950 transition-all duration-200 hover:scale-120 active:scale-95 cursor-pointer"
            title="Next Step"
            aria-label="Next Step"
          >
            <ChevronRight className="h-5 w-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* 3D Spatial Amphitheater Stage */}
      <div
        className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 py-3"
        style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
      >
        {WORKFLOW_STEPS.map((step, idx) => {
          const isActive = idx === activeStep;
          const diff = idx - activeStep;

          // 3D Spatial Inward Amphitheater Curve relative to active card
          const baseRotateY = diff === 0 ? 0 : diff < 0 ? Math.min(16, Math.abs(diff) * 8.5) : -Math.min(16, Math.abs(diff) * 8.5);
          const baseTranslateZ = diff === 0 ? 38 : -Math.abs(diff) * 20;
          const baseTranslateY = diff === 0 ? -12 : Math.abs(diff) * 3;
          const baseScale = diff === 0 ? 1.05 : Math.max(0.93, 1 - Math.abs(diff) * 0.035);

          // Real-time micro tilt when cursor moves over card
          const isTilted = mouseTilt.idx === idx;
          const tiltX = isTilted ? mouseTilt.x : 0;
          const tiltY = isTilted ? mouseTilt.y : 0;

          return (
            <div
              key={step.title}
              onClick={() => setActiveStep(idx)}
              onMouseMove={(e) => handleMouseMove(e, idx)}
              onMouseLeave={handleMouseLeaveCard}
              className={`group relative p-6 rounded-xl bg-white border cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between ${
                isActive
                  ? "border-[#2563EB] shadow-[0_28px_60px_-12px_rgba(37,99,235,0.22),0_12px_24px_-6px_rgba(15,23,42,0.06)] z-30"
                  : "border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs z-10"
              }`}
              style={{
                transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${baseRotateY + tiltY}deg) translateZ(${baseTranslateZ}px) translateY(${baseTranslateY}px) scale(${baseScale})`,
                transformStyle: "preserve-3d",
                willChange: "transform",
                opacity: diff === 0 ? 1 : Math.max(0.78, 1 - Math.abs(diff) * 0.08),
              }}
            >
              {/* Ambient radial sheen on active card */}
              {isActive && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    background: "radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.06), transparent 70%)",
                  }}
                />
              )}

              <div className="space-y-2.5">
                <h3
                  className={`text-base font-bold tracking-tight transition-colors duration-300 ${
                    isActive ? "text-slate-950" : "text-slate-800"
                  }`}
                >
                  {step.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// ONE ECOSYSTEM - 3D Spatial Perspective Deck (Role Switcher)
// ──────────────────────────────────────────────────────────
const ECOSYSTEM_ROLES = [
  {
    role: "Students",
    tagline: "Empowered Learning & Hands-on Execution",
    desc: "Personalized course journeys, in-browser Monaco development environments, continuous practice, and transparent progress insights.",
    metrics: "Active Progress • Instant Code Feedback • Skill Mastery",
  },
  {
    role: "Trainers",
    tagline: "High-Visibility Classroom & Assessment Control",
    desc: "Curriculum publishing, automated assignment rubrics, proctored assessments, and deep cohort performance visibility.",
    metrics: "Direct Content Control • Automated Evaluation • Cohort Analytics",
  },
  {
    role: "Administrators",
    tagline: "Centralized Institutional Governance",
    desc: "Multi-batch operations, trainer allocations, role-based security permissions, and operational compliance audit trails.",
    metrics: "Unified Batch Management • Role Security • Audit Logs",
  },
  {
    role: "Institutions",
    tagline: "Scalable Enterprise Education Architecture",
    desc: "End-to-end digital infrastructure bridging students, faculty, and leadership into one cohesive high-performance standard.",
    metrics: "Institutional Scale • Accredited Outcomes • Enterprise Security",
  },
];

function EcosystemSpatialDeck() {
  const [activeRole, setActiveRole] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const total = ECOSYSTEM_ROLES.length; // 4

  // Continuous auto-movement every 3.5s
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveRole((prev) => (prev + 1) % total);
    }, 3500);
    return () => clearInterval(timer);
  }, [isHovered, total]);

  const handlePrev = () => {
    setActiveRole((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setActiveRole((prev) => (prev + 1) % total);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x: y * -10, y: x * 10 });
  };

  const handleMouseLeaveCard = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  const current = ECOSYSTEM_ROLES[activeRole] || ECOSYSTEM_ROLES[0]!;

  return (
    <div
      className="relative w-full max-w-5xl mx-auto select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseLeaveCard();
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Interactive Role Command Rail (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {ECOSYSTEM_ROLES.map((item, idx) => {
            const isActive = idx === activeRole;

            return (
              <div
                key={item.role}
                onClick={() => setActiveRole(idx)}
                className={`relative p-4 rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between border ${
                  isActive
                    ? "bg-white border-[#2563EB] shadow-xs translate-x-1"
                    : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300"
                }`}
              >
                {/* Left Active Accent Indicator */}
                <div
                  className={`absolute left-0 inset-y-2 w-1 rounded-r-full transition-all duration-300 ${
                    isActive ? "bg-[#2563EB] opacity-100" : "opacity-0"
                  }`}
                />

                <div className="pl-2 space-y-0.5">
                  <h3
                    className={`text-sm sm:text-base font-bold transition-colors duration-200 ${
                      isActive ? "text-slate-950" : "text-slate-700"
                    }`}
                  >
                    {item.role}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">
                    {item.tagline}
                  </p>
                </div>

                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 shrink-0 ml-3 ${
                    isActive ? "bg-[#2563EB] scale-110" : "bg-slate-300"
                  }`}
                />
              </div>
            );
          })}

          {/* Controls Bar at bottom of rail */}
          <div className="pt-2 flex items-center justify-between px-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              Role {activeRole + 1} of {total}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-600 hover:text-slate-950 transition-all duration-200 hover:scale-120 active:scale-95 cursor-pointer"
                title="Previous Role"
                aria-label="Previous Role"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2.2]" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-600 hover:text-slate-950 transition-all duration-200 hover:scale-120 active:scale-95 cursor-pointer"
                title="Next Role"
                aria-label="Next Role"
              >
                <ChevronRight className="h-4 w-4 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: 3D Floating Perspective Monolith (7 cols) */}
        <div
          className="lg:col-span-7 relative min-h-[300px]"
          style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
        >
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeaveCard}
            className="relative p-7 sm:p-9 rounded-2xl bg-white border border-[#2563EB]/40 shadow-[0_30px_70px_-15px_rgba(37,99,235,0.18),0_12px_28px_-6px_rgba(15,23,42,0.06)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between min-h-[290px]"
            style={{
              transform: `perspective(1200px) rotateX(${mouseTilt.x}deg) rotateY(${mouseTilt.y}deg) translateZ(10px)`,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            {/* Ambient specular light sheen */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background: "radial-gradient(circle at 40% 0%, rgba(37, 99, 235, 0.07), transparent 70%)",
              }}
            />

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">
                  {current.tagline}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {current.role}
                </h3>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                {current.desc}
              </p>
            </div>

            {/* Bottom Capability Metrics */}
            <div className="pt-5 mt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
              <span className="text-slate-800 font-semibold">{current.metrics}</span>
              <span className="text-[#2563EB] font-semibold">Institutional Grade</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Manual & Auto Navigation State for Approach Cards Carousel
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const scrollPosRef = useRef(0);

  // Viewport intersection observer for refined staggered entrance in WHY FALCON
  const whyFalconRef = useRef<HTMLDivElement>(null);
  const [isWhyFalconVisible, setIsWhyFalconVisible] = useState(false);

  // Viewport intersection observer for WHAT WE DO section
  const platformRef = useRef<HTMLDivElement>(null);
  const [isPlatformVisible, setIsPlatformVisible] = useState(false);

  useEffect(() => {
    const el = whyFalconRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsWhyFalconVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = platformRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsPlatformVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 100% Jitter-Free Delta-Time Auto-Scroll Loop
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animId: number;
    let lastTime = performance.now();

    const step = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (isAutoPlaying && !isHoveredRef.current && !isDraggingRef.current) {
        const halfWidth = el.scrollWidth / 2;
        if (halfWidth > 0) {
          scrollPosRef.current += 45 * dt; // Calm, readable 45px/s
          if (scrollPosRef.current >= halfWidth) {
            scrollPosRef.current -= halfWidth;
          }
          el.scrollLeft = scrollPosRef.current;
        }
      } else if (!isDraggingRef.current) {
        scrollPosRef.current = el.scrollLeft;
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isAutoPlaying]);

  const handleManualScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -344 : 344;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    setTimeout(() => {
      if (scrollRef.current) {
        scrollPosRef.current = scrollRef.current.scrollLeft;
      }
    }, 380);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    startScrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    scrollRef.current.scrollLeft = startScrollLeftRef.current - walk;
    scrollPosRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    if (scrollRef.current) {
      scrollPosRef.current = scrollRef.current.scrollLeft;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollRef.current || e.touches.length === 0) return;
    isDraggingRef.current = true;
    startXRef.current = e.touches[0]!.pageX - scrollRef.current.offsetLeft;
    startScrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !scrollRef.current || e.touches.length === 0) return;
    const x = e.touches[0]!.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    scrollRef.current.scrollLeft = startScrollLeftRef.current - walk;
    scrollPosRef.current = scrollRef.current.scrollLeft;
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    if (scrollRef.current) {
      scrollPosRef.current = scrollRef.current.scrollLeft;
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#2563EB]/15 selection:text-[#2563EB]">

      {/* ──────────────────────────────────────────────────────────
          1. CLEAN ENTERPRISE NAVBAR
          ────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 h-[72px] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          {/* Brand Mark */}
          <Link href="/" className="flex items-center group">
            <div className="flex flex-col">
              <span className="font-extrabold text-xl text-slate-900 tracking-tight leading-none">
                FALCON<span className="text-[#2563EB]">.</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-tight mt-0.5">
                Learning Technologies • SENSI Group
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <Link href="#approach" className="hover:text-slate-900 transition-colors">The Approach</Link>
            <Link href="#why-falcon" className="hover:text-slate-900 transition-colors">Why FALCON</Link>
            <Link href="#platform" className="hover:text-slate-900 transition-colors">What We Do</Link>
            <Link href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</Link>
            <Link href="#ecosystem" className="hover:text-slate-900 transition-colors">Ecosystem</Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-semibold text-slate-600 hover:text-slate-900" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 h-9 rounded-lg shadow-xs transition-colors" asChild>
              <Link href="/login">Get Started</Link>
            </Button>

            {/* Mobile Sheet Trigger */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger className="lg:hidden p-2 rounded-lg border border-slate-200 inline-flex items-center justify-center text-slate-700 hover:bg-slate-100">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[340px] bg-white border-slate-200 p-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <SheetHeader className="text-left pb-4 border-b border-slate-100">
                    <SheetTitle className="text-base font-bold text-slate-900">
                      FALCON<span className="text-[#2563EB]">.</span>
                    </SheetTitle>
                    <p className="text-xs text-slate-500 font-medium">Falcon Learning Technologies</p>
                  </SheetHeader>

                  <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700">
                    <Link href="#approach" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">The Approach</Link>
                    <Link href="#why-falcon" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Why FALCON</Link>
                    <Link href="#platform" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">What We Do</Link>
                    <Link href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">How It Works</Link>
                    <Link href="#ecosystem" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Ecosystem</Link>
                  </nav>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-2.5">
                  <Button variant="outline" className="w-full justify-center text-xs font-semibold h-10 border-slate-200" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button className="w-full justify-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold h-10" asChild>
                    <Link href="/login">Get Started</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </header>


      {/* ──────────────────────────────────────────────────────────
          2. ENTERPRISE HERO SECTION
          ────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 sm:pt-40 lg:pt-44 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white overflow-hidden">
        {/* Subtle Ambient Light Glow behind headline */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[850px] h-[380px] bg-gradient-to-tr from-blue-100/50 via-blue-50/30 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          
          {/* Eyebrow */}
          <div>
            <span className="text-xs sm:text-sm font-bold tracking-widest text-[#2563EB] uppercase">
              FALCON LEARNING TECHNOLOGIES
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
            BUILD SKILLS. PROVE POTENTIAL.{" "}
            <span className="text-[#2563EB] animate-text-shimmer">
              SHAPE THE FUTURE.
            </span>
          </h1>

          {/* Supporting Statement */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            An intelligent learning ecosystem built to transform how institutions, educators, and learners learn, practice, assess, and grow.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button size="lg" className="h-12 px-7 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors" asChild>
              <Link href="/login">
                Explore FALCON <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-7 border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors" asChild>
              <Link href="#approach">
                See How It Works
              </Link>
            </Button>
          </div>

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          3. TRUST / POSITIONING STRIP
          ────────────────────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            ONE CONNECTED LEARNING ECOSYSTEM
          </span>
          <p className="text-sm sm:text-base text-slate-800 font-medium max-w-2xl mx-auto">
            Learning, practice, coding, assessment, and performance — connected in one platform.
          </p>
        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          4. WHAT FALCON CONNECTS (Moving Animated & Manual Cards)
          ────────────────────────────────────────────────────────── */}
      <section id="approach" className="py-20 bg-white border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">THE APPROACH</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              A Connected Path from Learning to Capability
            </h2>
            <p className="text-sm text-slate-600">
              Falcon connects every stage of technical development into an unbroken, measurable pipeline.
            </p>
          </div>

        </div>

        {/* 3D Continuous Moving & Manually Controllable Cards Ribbon */}
        <div 
          className="relative w-full overflow-hidden mt-8 py-6 group"
          style={{ perspective: "1200px" }}
          onMouseEnter={() => { isHoveredRef.current = true; }}
          onMouseLeave={() => { isHoveredRef.current = false; handleMouseUpOrLeave(); }}
        >
          {/* Floating Left & Right Pure Arrow Navigation Controls (No Circles) */}
          <button
            onClick={() => handleManualScroll("left")}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2 text-slate-700 hover:text-slate-950 transition-all duration-200 hover:scale-125 active:scale-95 cursor-pointer"
            title="Previous"
            aria-label="Previous"
          >
            <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10 stroke-[2.5]" />
          </button>

          <button
            onClick={() => handleManualScroll("right")}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2 text-slate-700 hover:text-slate-950 transition-all duration-200 hover:scale-125 active:scale-95 cursor-pointer"
            title="Next"
            aria-label="Next"
          >
            <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10 stroke-[2.5]" />
          </button>

          {/* Left & Right Gradient Edge Fades */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-36 z-20 bg-gradient-to-r from-white via-white/80 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-36 z-20 bg-gradient-to-l from-white via-white/80 to-transparent" />

          {/* Scrollable Track Container (Glitch-Free Auto-scroll + Manual Drag) */}
          <div 
            ref={scrollRef}
            className="flex gap-6 px-4 py-4 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none"
            style={{ transformStyle: "preserve-3d" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {[...APPROACH_STEPS, ...APPROACH_STEPS, ...APPROACH_STEPS, ...APPROACH_STEPS].map((item, idx) => (
              <div
                key={`${item.title}-${idx}`}
                className="w-[300px] sm:w-[320px] shrink-0 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-[0_12px_30px_-6px_rgba(15,23,42,0.08),0_4px_12px_-2px_rgba(15,23,42,0.04)] hover:border-[#2563EB] hover:shadow-[0_28px_60px_-10px_rgba(37,99,235,0.2),0_12px_24px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-3 hover:scale-[1.02] transition-all duration-500 ease-out flex flex-col relative"
                style={{
                  transform: "translate3d(0, 0, 0)",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Full Clean Top Image (Zero Overlaid Badges) */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100 border-b border-slate-100 pointer-events-none">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover/card:scale-108 transition-transform duration-700 ease-out"
                    loading="lazy"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-white/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Clean Card Content (Zero Numbers / Zero Badges / Zero Pipelines) */}
                <div className="p-6 space-y-2 flex-1 flex flex-col justify-start bg-white pointer-events-none">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight group-hover/card:text-[#2563EB] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          5. WHY FALCON (Circular 3D Movable Animation)
          ────────────────────────────────────────────────────────── */}
      <section id="why-falcon" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">WHY FALCON</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ONE PLATFORM. COMPLETE LEARNING JOURNEY.
            </h2>
            <p className="text-sm text-slate-600">
              Designed around demonstrable capability, not superficial course completion.
            </p>
          </div>

          {/* Circular 3D Movable Carousel */}
          <WhyFalconCircular3DCarousel />

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          6. PLATFORM OVERVIEW (7 Core LMS Modules - 3D Kinetic Horizon Deck)
          ────────────────────────────────────────────────────────── */}
      <section id="platform" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">WHAT WE DO</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              EVERYTHING YOUR LEARNING ECOSYSTEM NEEDS
            </h2>
            <p className="text-sm text-slate-600">
              Comprehensive capabilities that consolidate education management, evaluation, and code execution.
            </p>
          </div>

          {/* 3D Kinetic Expanding Horizon Deck (Zero Icons) */}
          <WhatWeDoHorizonDeck />

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          7. HOW IT WORKS (5-Step Enterprise Workflow - Kinetic Flow Conduit)
          ────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">HOW IT WORKS</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              A Clear, Systematic Learning Workflow
            </h2>
          </div>

          {/* Kinetic Flow Conduit Stepper */}
          <HowItWorksConduit />

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          8. ECOSYSTEM (3D Spatial Perspective Deck)
          ────────────────────────────────────────────────────────── */}
      <section id="ecosystem" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200 overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-10">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">ONE ECOSYSTEM</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ONE ECOSYSTEM. MULTIPLE ROLES. ONE SHARED GOAL.
            </h2>
            <p className="text-sm text-slate-600">
              Clear responsibilities and shared visibility across the entire institution.
            </p>
          </div>

          {/* 3D Spatial Perspective Role Deck */}
          <EcosystemSpatialDeck />

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          13. FINAL CTA (MNC-Grade Real-Time Architectural Background)
          ────────────────────────────────────────────────────────── */}
      <section className="relative py-28 sm:py-36 px-4 sm:px-6 lg:px-8 text-white overflow-hidden">
        {/* Real-time High-Resolution Architectural Corporate Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-1000 ease-out"
          style={{ backgroundImage: "url('/images/cta-bg.jpg')" }}
        />

        {/* Multi-layered Cinematic Dark Gradient & Ambient Blue Spotlight Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/75" />
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 35%, rgba(37, 99, 235, 0.22), transparent 65%)"
          }}
        />

        {/* Foreground Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider text-blue-300 bg-blue-950/70 border border-blue-700/50 backdrop-blur-md uppercase shadow-xs">
            FALCON LEARNING TECHNOLOGIES
          </span>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            BUILD A STRONGER LEARNING ECOSYSTEM.
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Bring learning, practice, coding, assessment and performance together with Falcon Learning Technologies.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-12 px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95" asChild>
              <Link href="/login">
                Explore FALCON <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" className="h-12 px-8 bg-white hover:bg-slate-100 text-slate-900 hover:text-slate-950 text-sm font-bold rounded-xl shadow-lg border border-white/90 transition-all hover:scale-105 active:scale-95" asChild>
              <Link href="#how-it-works">
                See How It Works
              </Link>
            </Button>
          </div>
        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          14. ENTERPRISE FOOTER
          ────────────────────────────────────────────────────────── */}
      <footer className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-200">
            
            {/* Brand Column (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                  FALCON<span className="text-[#2563EB]">.</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Falcon Learning Technologies
              </p>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-medium">
                Learn • Build • Lead
              </p>
              <p className="text-xs text-[#2563EB] font-medium pt-1">
                Part of SENSI Group of Companies
              </p>
            </div>

            {/* Platform Column */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Platform</span>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li><Link href="#platform" className="hover:text-slate-900 transition-colors">Courses</Link></li>
                <li><Link href="#platform" className="hover:text-slate-900 transition-colors">Practices</Link></li>
                <li><Link href="#platform" className="hover:text-slate-900 transition-colors">Coding</Link></li>
                <li><Link href="#platform" className="hover:text-slate-900 transition-colors">Assessments</Link></li>
                <li><Link href="#platform" className="hover:text-slate-900 transition-colors">Live Classes</Link></li>
                <li><Link href="#platform" className="hover:text-slate-900 transition-colors">Assignments</Link></li>
              </ul>
            </div>

            {/* Ecosystem Column */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Ecosystem</span>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li><Link href="#who-we-are" className="hover:text-slate-900 transition-colors">Students</Link></li>
                <li><Link href="#who-we-are" className="hover:text-slate-900 transition-colors">Trainers</Link></li>
                <li><Link href="#who-we-are" className="hover:text-slate-900 transition-colors">Institutions</Link></li>
                <li><Link href="#ecosystem" className="hover:text-slate-900 transition-colors">Analytics</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Company</span>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li><Link href="#who-we-are" className="hover:text-slate-900 transition-colors">Who We Are</Link></li>
                <li><Link href="#approach" className="hover:text-slate-900 transition-colors">The Approach</Link></li>
                <li><Link href="#why-falcon" className="hover:text-slate-900 transition-colors">Why FALCON</Link></li>
                <li><Link href="#platform" className="hover:text-slate-900 transition-colors">What We Do</Link></li>
                <li><Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link></li>
              </ul>
            </div>

          </div>

          {/* Copyright & Leadership */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} FALCON Learning Technologies (SENSI Group). All rights reserved.</p>
            <p className="font-medium">Founder &amp; CEO: Dharunkumar S</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
