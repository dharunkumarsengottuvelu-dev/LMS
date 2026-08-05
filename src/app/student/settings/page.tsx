"use client";

import { Settings, Moon, Sun, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";

export default function StudentSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Account Settings
        </h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
          Configure security, password, and theme preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-[18px]">Appearance Theme</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            <div className="flex gap-3">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                className="flex-1 h-[44px] gap-2"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" /> Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                className="flex-1 h-[44px] gap-2"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" /> Dark
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-[18px]">Change Password</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">New Password</Label>
              <Input type="password" placeholder="Enter new password" className="h-[44px]" />
            </div>
            <Button className="w-full h-[44px] bg-[#2563EB] text-white">Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
