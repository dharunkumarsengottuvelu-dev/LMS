"use client";

import { useState } from "react";
import {
  User, Mail, Phone, Globe, Save, Lock, Shield,
  BookOpen, CheckCircle2, Award, Calendar, Layers, Key, Code2, Link2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";

export default function StudentProfilePage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("profile");
  const [firstName, setFirstName] = useState(profile?.first_name || "Dharunkumar");
  const [lastName, setLastName] = useState(profile?.last_name || "Sengottuvelu");
  const [email] = useState(user?.email || "dharunkumarsengottuvelu@gmail.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [bio, setBio] = useState(
    profile?.bio || "Enthusiastic fullstack enterprise software learner specializing in Next.js 16, React 19, Python, and PostgreSQL architecture."
  );
  const [github, setGithub] = useState("https://github.com/dharunkumarsengottuvelu-dev");
  const [linkedin, setLinkedin] = useState("https://linkedin.com/in/dharunkumar-dev");
  const [skills, setSkills] = useState("React, Next.js, TypeScript, Python, PostgreSQL, Supabase, Tailwind CSS");

  // Account Security States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated Successfully",
      description: "Your student profile details have been saved.",
    });
  };

  const handleUpdatePassword = () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password Error",
        description: "New password must be at least 6 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
      });
      return;
    }
    toast({
      title: "Password Changed",
      description: "Your account password has been updated successfully.",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* 1. Page Header */}
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Student Profile & Settings
        </h1>
        <p className="text-[16px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
          Manage your personal information, technical skills, contact details, and account security
        </p>
      </div>

      {/* 2. Hero Profile Card Summary */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border-2 border-[#2563EB]/20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-[#2563EB] text-white text-2xl font-bold">
                {getInitials(`${firstName} ${lastName}`)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="text-[24px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                  {firstName} {lastName}
                </h2>
                <Badge className="bg-[#2563EB] text-white text-xs font-semibold px-2.5 py-0.5">
                  Student
                </Badge>
              </div>
              <p className="text-sm font-medium text-[#4B5563] dark:text-[#9CA3AF]">{email}</p>
              <p className="text-xs text-[#6B7280] font-semibold">Cohort Batch: Fullstack Engineering 2026</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-[#F9FAFB] dark:bg-[#09090B] p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
            <div className="text-center px-3">
              <p className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">4</p>
              <p className="text-[11px] font-medium text-[#6B7280]">Enrolled</p>
            </div>
            <div className="h-8 w-px bg-[#E5E7EB] dark:bg-[#27272A]" />
            <div className="text-center px-3">
              <p className="text-xl font-bold text-[#16A34A]">8</p>
              <p className="text-[11px] font-medium text-[#6B7280]">Practice Done</p>
            </div>
            <div className="h-8 w-px bg-[#E5E7EB] dark:bg-[#27272A]" />
            <div className="text-center px-3">
              <p className="text-xl font-bold text-[#2563EB]">12</p>
              <p className="text-[11px] font-medium text-[#6B7280]">Submissions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Combined Profile & Account Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#F3F4F6] dark:bg-[#18181B] p-1 h-12 rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
          <TabsTrigger
            value="profile"
            className="h-10 px-6 font-semibold text-xs rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white"
          >
            <User className="h-4 w-4 mr-2" /> Personal & Student Details
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="h-10 px-6 font-semibold text-xs rounded-lg data-[state=active]:bg-[#2563EB] data-[state=active]:text-white"
          >
            <Lock className="h-4 w-4 mr-2" /> Account & Security Settings
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Personal & Student Information */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-[18px] font-semibold text-[#111827] dark:text-[#FAFAFA]">
                Personal Information
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Update your identity details, phone number, and technical bio
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">First Name</Label>
                  <Input className="h-[44px]" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Last Name</Label>
                  <Input className="h-[44px]" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Email Address (Primary)</Label>
                  <Input className="h-[44px] bg-[#F9FAFB] dark:bg-[#09090B]" value={email} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Phone Number</Label>
                  <Input className="h-[44px]" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Technical Bio</Label>
                <Textarea className="min-h-[100px] text-sm leading-relaxed" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Technical Skills (Comma separated)</Label>
                <Input className="h-[44px]" value={skills} onChange={(e) => setSkills(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">GitHub Profile URL</Label>
                  <Input className="h-[44px]" value={github} onChange={(e) => setGithub(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">LinkedIn Profile URL</Label>
                  <Input className="h-[44px]" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
                </div>
              </div>

              <div className="pt-3">
                <Button className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2" onClick={handleSaveProfile}>
                  <Save className="h-4 w-4" /> Save Profile Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Account & Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-[18px] font-semibold text-[#111827] dark:text-[#FAFAFA]">
                Account Security & Password
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Change your account password and review active authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Current Password</Label>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  className="h-[44px]"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">New Password</Label>
                <Input
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  className="h-[44px]"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Confirm New Password</Label>
                <Input
                  type="password"
                  placeholder="Re-enter new password"
                  className="h-[44px]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="pt-3">
                <Button className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2" onClick={handleUpdatePassword}>
                  <Key className="h-4 w-4" /> Update Account Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
