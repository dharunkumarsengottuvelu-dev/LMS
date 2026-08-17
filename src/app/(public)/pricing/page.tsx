"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Shield, Zap, Globe, Users, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PublicPricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] pt-24 pb-16">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-extrabold text-xl text-[#111827] dark:text-[#FAFAFA] tracking-tight">
              FALCON<span className="text-[#2563EB] font-black">.</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4B5563] dark:text-[#A1A1AA]">
            <Link href="/courses" className="hover:text-[#111827] dark:hover:text-[#FAFAFA]">Courses</Link>
            <Link href="/pricing" className="text-[#2563EB] font-bold">Pricing</Link>
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

      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 font-bold px-3 py-1">
            TRANSPARENT ENTERPRISE PRICING
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Flexible Plans Built for Teams of Any Size
          </h1>
          <p className="text-base text-[#6B7280] dark:text-[#A1A1AA]">
            Scale enterprise learning with automated proctoring, live coding judge, customized assessments, and dedicated account support.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase text-[#6B7280] tracking-wider">Starter Team</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#111827] dark:text-[#FAFAFA]">$49</span>
                <span className="text-xs text-[#6B7280]">/ seat / month</span>
              </div>
              <p className="text-xs text-[#6B7280]">Ideal for growing tech teams and small bootcamps.</p>
              <ul className="space-y-2.5 text-xs text-[#4B5563] dark:text-[#D1D5DB] pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Up to 50 active learners</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Full Course Library access</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Judge0 Coding Environment</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Basic Face Monitoring</li>
              </ul>
            </div>
            <div className="pt-6">
              <Link href="/register">
                <Button variant="outline" className="w-full h-[44px] border-[#2563EB] text-[#2563EB] font-bold">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </Card>

          {/* Pro Enterprise Plan */}
          <Card className="bg-[#2563EB]/5 dark:bg-[#18181B] border-2 border-[#2563EB] rounded-2xl p-6 shadow-lg relative flex flex-col justify-between">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[10px] uppercase font-bold px-3 py-0.5">
              MOST POPULAR
            </Badge>
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase text-[#2563EB] tracking-wider">Enterprise Pro</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#111827] dark:text-[#FAFAFA]">$89</span>
                <span className="text-xs text-[#6B7280]">/ seat / month</span>
              </div>
              <p className="text-xs text-[#6B7280]">Complete solution for scaling enterprise organizations.</p>
              <ul className="space-y-2.5 text-xs text-[#4B5563] dark:text-[#D1D5DB] pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Unlimited active learners</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> 12 Camera Monitoring Rules Engine</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Safe Exam Browser (SEB) Mode</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Live Violation Security Audit Logs</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Custom Certificate Issuance</li>
              </ul>
            </div>
            <div className="pt-6">
              <Link href="/register">
                <Button className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </Card>

          {/* Custom Plan */}
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase text-[#6B7280] tracking-wider">Custom Enterprise</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#111827] dark:text-[#FAFAFA]">Custom</span>
              </div>
              <p className="text-xs text-[#6B7280]">For Fortune 500 companies requiring dedicated infrastructure.</p>
              <ul className="space-y-2.5 text-xs text-[#4B5563] dark:text-[#D1D5DB] pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Dedicated Single-Tenant Database</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Custom SSO (SAML 2.0 / Okta)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> 24/7 Priority SLA Account Manager</li>
              </ul>
            </div>
            <div className="pt-6">
              <Link href="/contact">
                <Button variant="outline" className="w-full h-[44px] border-[#111827] dark:border-[#FAFAFA] font-bold">
                  Contact Enterprise Sales
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
