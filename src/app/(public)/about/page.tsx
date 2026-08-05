"use client";

import React from "react";
import Link from "next/link";
import { Shield, Users, Award, Globe, CheckCircle2, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PublicAboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] pt-24 pb-16">
      {/* Top Header */}
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
            <Link href="/courses" className="hover:text-[#111827] dark:hover:text-[#FAFAFA]">Courses</Link>
            <Link href="/pricing" className="hover:text-[#111827] dark:hover:text-[#FAFAFA]">Pricing</Link>
            <Link href="/about" className="text-[#2563EB] font-bold">About</Link>
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

      <div className="max-w-5xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 font-bold px-3 py-1">
            OUR MISSION & VISION
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Empowering Enterprise Teams Through AI & Security-First Learning
          </h1>
          <p className="text-base text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
            EduNexus is a next-generation Enterprise LMS trusted by Fortune 500 tech companies to deliver proctored assessments, interactive coding challenges, and corporate skill evaluation.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="p-6 text-center border-[#E5E7EB] dark:border-[#27272A]">
            <p className="text-3xl font-bold text-[#2563EB]">50,000+</p>
            <p className="text-xs text-[#6B7280] mt-1 font-medium">Active Learners</p>
          </Card>
          <Card className="p-6 text-center border-[#E5E7EB] dark:border-[#27272A]">
            <p className="text-3xl font-bold text-[#16A34A]">1,200+</p>
            <p className="text-xs text-[#6B7280] mt-1 font-medium">Interactive Courses</p>
          </Card>
          <Card className="p-6 text-center border-[#E5E7EB] dark:border-[#27272A]">
            <p className="text-3xl font-bold text-[#9333EA]">500+</p>
            <p className="text-xs text-[#6B7280] mt-1 font-medium">Enterprise Clients</p>
          </Card>
          <Card className="p-6 text-center border-[#E5E7EB] dark:border-[#27272A]">
            <p className="text-3xl font-bold text-[#F59E0B]">99.8%</p>
            <p className="text-xs text-[#6B7280] mt-1 font-medium">Proctoring Accuracy</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
