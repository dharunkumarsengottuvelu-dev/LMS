"use client";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">Analytics & Cohort Metrics</h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">Deep analytics on skill acquisition, completion rates, and test scores</p>
      </div>
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">Interactive analytics graphs and metrics overview.</CardContent></Card>
    </div>
  );
}
