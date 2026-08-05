"use client";
import { User, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminProfilePage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">Admin Profile</h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">Manage administrator account credentials and contact details</p>
      </div>
      <Card className="max-w-xl">
        <CardHeader className="p-6 pb-4"><CardTitle className="text-[18px]">Profile Details</CardTitle></CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <Input className="h-[44px]" defaultValue="System Administrator" />
          <Button className="h-[44px] bg-[#2563EB] text-white gap-2"><Save className="h-4 w-4" /> Save Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
