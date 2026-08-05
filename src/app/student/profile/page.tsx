"use client";

import { useState } from "react";
import { User, Mail, Save, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";

export default function StudentProfilePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(profile?.first_name || "Student");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [bio, setBio] = useState(profile?.bio || "Enthusiastic enterprise learner focused on fullstack software development.");

  const handleSave = () => {
    toast({ title: "Profile updated", description: "Your profile details have been saved successfully." });
  };

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          My Profile
        </h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
          Manage your personal information, technical bio, and contact preferences
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-[18px]">Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">First Name</Label>
              <Input className="h-[44px]" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Last Name</Label>
              <Input className="h-[44px]" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Professional Bio</Label>
            <Textarea className="min-h-[100px] text-sm" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          <Button className="h-[44px] bg-[#2563EB] text-white gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" /> Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
