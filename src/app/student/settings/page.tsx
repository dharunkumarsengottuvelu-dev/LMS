"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StudentSettingsPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Account Settings
        </h1>
        <p className="text-[16px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
          Configure security credentials and password preferences
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-[18px]">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">New Password</Label>
            <Input type="password" placeholder="Enter new password" className="h-[44px]" />
          </div>
          <Button className="w-full h-[44px] bg-[#2563EB] text-white font-medium">Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
