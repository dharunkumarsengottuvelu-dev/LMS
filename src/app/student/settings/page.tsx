"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function StudentSettingsPage() {
  const router = useRouter();

  return (
    <div className="space-y-8 pb-12 w-full">
      {/* Top Header - Spacious Enterprise MNC Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 shadow-xs overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Left Column: Breadcrumb + Title + Subtitle */}
          <div className="space-y-2 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0.5"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-normal">
              Account Settings & Security
            </h1>
          </div>
        </div>
      </div>

      <Card className="max-w-xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">New Password</Label>
            <Input type="password" placeholder="Enter new password" className="h-10 text-xs rounded-xl" />
          </div>
          <Button className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs">
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
