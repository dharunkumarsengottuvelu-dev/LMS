import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Code2, BookOpen, BarChart3, Award, Users, Shield,
  ArrowRight, CheckCircle2, Star, Globe
} from "lucide-react";

export const metadata: Metadata = {
  title: "EduNexus — Enterprise Learning Platform",
  description: "Minimalist corporate training SaaS with interactive courses, coding assessments, and real-time analytics.",
};

const features = [
  { icon: BookOpen, title: "Interactive Courses", desc: "Structured video modules, documents, quizzes, and practical projects for enterprise teams." },
  { icon: Code2, title: "Coding Assessments", desc: "Embedded Monaco editor with 14+ languages powered by Judge0 execution engine." },
  { icon: BarChart3, title: "Real-time Analytics", desc: "Comprehensive score tracking, skill acquisition, and cohort performance dashboards." },
  { icon: Award, title: "Certificates", desc: "Automated verification and issuance of digital completion certificates." },
  { icon: Users, title: "Team Management", desc: "Cohort batching, role-based access control, and automated enrollment pipelines." },
  { icon: Shield, title: "Enterprise Security", desc: "Multi-layered RBAC, Row Level Security, audit logs, and SOC2 compliance standards." },
];

const stats = [
  { value: "50,000+", label: "Active Learners" },
  { value: "1,200+", label: "Verified Courses" },
  { value: "500+", label: "Enterprise Clients" },
  { value: "99.9%", label: "System Uptime" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA]">
      {/* 72px Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] h-[72px]">
        <div className="max-w-[1440px] mx-auto px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-semibold text-sm">
              E
            </div>
            <span className="font-semibold text-base" style={{ fontFamily: "Inter, sans-serif" }}>
              EduNexus
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B7280] dark:text-[#A1A1AA]">
            <Link href="/courses" className="hover:text-[#111827] dark:hover:text-[#FAFAFA] transition-colors">Courses</Link>
            <Link href="/pricing" className="hover:text-[#111827] dark:hover:text-[#FAFAFA] transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-[#111827] dark:hover:text-[#FAFAFA] transition-colors">About</Link>
            <Link href="/contact" className="hover:text-[#111827] dark:hover:text-[#FAFAFA] transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="h-[44px] px-4 text-sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button className="h-[44px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-8">
        <div className="max-w-[1440px] mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            Enterprise Learning Management System
          </div>

          <h1 className="text-[44px] md:text-[60px] font-semibold leading-[1.1] tracking-tight max-w-4xl mx-auto text-[#111827] dark:text-[#FAFAFA]">
            The Minimalist SaaS Platform for Corporate Upskilling
          </h1>

          <p className="text-[18px] text-[#6B7280] dark:text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
            Standardize employee training, deliver verified coding assessments, and track organizational capability metrics in one unified system.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Button className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2" asChild>
              <Link href="/register">
                Start Free Trial <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" className="h-[44px] px-6" asChild>
              <Link href="/ide/playground">Code Playground</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section (Strict 4-Column Responsive Grid) */}
      <section className="py-16 px-8 border-y border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center space-y-1">
              <p className="text-[36px] font-semibold tracking-tight text-[#2563EB]">
                {stat.value}
              </p>
              <p className="text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid (3 Columns) */}
      <section className="py-24 px-8">
        <div className="max-w-[1440px] mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-[24px] font-semibold text-[#111827] dark:text-[#FAFAFA]">
              Built for Modern Engineering & Product Teams
            </h2>
            <p className="text-[#6B7280] dark:text-[#A1A1AA] text-sm">
              Structured learning workflows designed for clarity, efficiency, and compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="h-full hover:border-[#2563EB]/40 transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] dark:bg-[#27272A] flex items-center justify-center text-[#2563EB]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-[18px] font-semibold text-[#111827] dark:text-[#FAFAFA]">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B]">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-[#2563EB] flex items-center justify-center text-white font-semibold text-xs">E</div>
            <span className="font-semibold text-sm text-[#111827] dark:text-[#FAFAFA]">EduNexus SaaS</span>
          </div>
          <p>© {new Date().getFullYear()} EduNexus Platform Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[#111827]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#111827]">Terms</Link>
            <Link href="/security" className="hover:text-[#111827]">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
