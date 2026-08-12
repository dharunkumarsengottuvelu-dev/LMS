"use client";
import { TrendingUp, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="Analytics & Batch Metrics"
        description="Deep analytics on skill acquisition, completion rates, and test scores"
      />
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">Interactive analytics graphs and metrics overview.</CardContent></Card>
    </div>
  );
}
