"use client";
import { Settings, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">Platform Settings</h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">Configure Judge0 API endpoints, Supabase keys, and organization branding</p>
      </div>
      <Card className="max-w-xl">
        <CardHeader className="p-6 pb-4"><CardTitle className="text-[18px]">Organization Config</CardTitle></CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <Input className="h-[44px]" defaultValue="EduNexus Enterprise" />
          <Button className="h-[44px] bg-[#2563EB] text-white gap-2"><Save className="h-4 w-4" /> Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
