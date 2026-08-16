"use client";

import { useState } from "react";
import {
  User, Mail, Phone, Globe, Save, Lock, Shield, Edit3, X,
  BookOpen, CheckCircle2, Award, Calendar, Layers, Key, Code2, Link2,
  ExternalLink, Terminal, Cpu, GraduationCap, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layouts/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function TrainerProfilePage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"personal" | "expertise" | "security">("personal");

  // Edit Mode Toggles
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingExpertise, setIsEditingExpertise] = useState(false);

  // Personal Info States
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [email] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [bio, setBio] = useState(
    profile?.bio || ""
  );

  // Expertise & Social Links States
  const [specializations, setSpecializations] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");

  // Security States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSavePersonal = () => {
    setIsEditingPersonal(false);
    toast({
      title: "Trainer Information Saved",
      description: "Your trainer profile details have been updated successfully.",
    });
  };

  const handleSaveExpertise = () => {
    setIsEditingExpertise(false);
    toast({
      title: "Expertise Profile Saved",
      description: "Your technical specializations and professional links have been updated.",
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
      title: "Password Credentials Updated",
      description: "Your trainer security credentials have been saved.",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* 1. Page Header */}
      <PageHeader 
        title="Trainer Profile"
        description="Manage your instructor credentials, assigned batches, technical specializations, and account security"
      />

      {/* 2. Top Profile Hero Card */}
      <Card className="bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <Avatar className="h-24 w-24 border-2 border-[#9333EA]/30 ring-4 ring-[#9333EA]/10 shadow-md">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[#9333EA]/10 text-[#9333EA] text-2xl font-bold">
              {getInitials(`${firstName} ${lastName}`)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col items-center justify-center md:items-start md:justify-start gap-2">
              <h2 className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA] break-all text-center md:text-left">
                {firstName} {lastName ? lastName.charAt(0).toUpperCase() : ""}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <Badge className="bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/30 text-xs font-bold px-2.5 py-0.5">
                  LEAD TRAINER
                </Badge>
              </div>
            </div>

            <p className="text-sm font-semibold text-[#9333EA] dark:text-[#C084FC]">
              {designation}
            </p>
            <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] max-w-3xl leading-relaxed">
              {bio}
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-3 text-xs text-[#4B5563] dark:text-[#A1A1AA]">
              <span className="flex items-center gap-1.5 font-medium">
                <BookOpen className="h-4 w-4 text-[#9333EA]" /> 4 Assigned Courses
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <GraduationCap className="h-4 w-4 text-[#9333EA]" /> 128 Enrolled Students
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Award className="h-4 w-4 text-[#9333EA]" /> 98.4% Passing Benchmark Rate
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-[#E5E7EB] dark:border-[#27272A] gap-8">
        <button
          onClick={() => setActiveTab("personal")}
          className={cn(
            "pb-3.5 text-sm font-bold transition-all relative",
            activeTab === "personal"
              ? "text-[#9333EA] border-b-2 border-[#9333EA]"
              : "text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827]"
          )}
        >
          <User className="h-4 w-4 inline mr-2" /> Personal & Contact Info
        </button>

        <button
          onClick={() => setActiveTab("expertise")}
          className={cn(
            "pb-3.5 text-sm font-bold transition-all relative",
            activeTab === "expertise"
              ? "text-[#9333EA] border-b-2 border-[#9333EA]"
              : "text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827]"
          )}
        >
          <Briefcase className="h-4 w-4 inline mr-2" /> Specializations & Social Links
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={cn(
            "pb-3.5 text-sm font-bold transition-all relative",
            activeTab === "security"
              ? "text-[#9333EA] border-b-2 border-[#9333EA]"
              : "text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827]"
          )}
        >
          <Shield className="h-4 w-4 inline mr-2" /> Security & Password
        </button>
      </div>

      {/* 4. Tab 1: Personal & Contact Info */}
      {activeTab === "personal" && (
        <Card className="bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl">
          <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">
                Instructor Details
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Update your contact details and bio visible to assigned student batches
              </CardDescription>
            </div>

            {!isEditingPersonal ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingPersonal(true)}
                className="h-9 px-4 font-semibold text-xs border-[#E5E7EB] dark:border-[#27272A]"
              >
                <Edit3 className="h-4 w-4 mr-2 text-[#9333EA]" /> Edit Profile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingPersonal(false)}
                  className="h-9 px-3 text-xs"
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSavePersonal}
                  className="h-9 px-4 text-xs font-semibold bg-[#9333EA] hover:bg-[#7E22CE] text-white"
                >
                  <Save className="h-4 w-4 mr-1.5" /> Save Changes
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">First Name</Label>
                <Input
                  disabled={!isEditingPersonal}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">Last Name</Label>
                <Input
                  disabled={!isEditingPersonal}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">Trainer Email (Verified)</Label>
                <Input
                  disabled
                  value={email}
                  className="h-11 bg-[#F3F4F6] dark:bg-[#1F1F23] cursor-not-allowed text-[#6B7280]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">Contact Phone</Label>
                <Input
                  disabled={!isEditingPersonal}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">Designation Title</Label>
              <Input
                disabled={!isEditingPersonal}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">Biography & Training Background</Label>
              <Textarea
                disabled={!isEditingPersonal}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="bg-[#F9FAFB] dark:bg-[#27272A] resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Tab 2: Specializations & Social Links */}
      {activeTab === "expertise" && (
        <Card className="bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl">
          <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">
                Technical Specializations & Professional Links
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Highlight core domains and public GitHub/LinkedIn profiles for student verification
              </CardDescription>
            </div>

            {!isEditingExpertise ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingExpertise(true)}
                className="h-9 px-4 font-semibold text-xs border-[#E5E7EB] dark:border-[#27272A]"
              >
                <Edit3 className="h-4 w-4 mr-2 text-[#9333EA]" /> Edit Profiles
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingExpertise(false)}
                  className="h-9 px-3 text-xs"
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveExpertise}
                  className="h-9 px-4 text-xs font-semibold bg-[#9333EA] hover:bg-[#7E22CE] text-white"
                >
                  <Save className="h-4 w-4 mr-1.5" /> Save Profiles
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">Core Specializations (Comma Separated)</Label>
              <Input
                disabled={!isEditingExpertise}
                value={specializations}
                onChange={(e) => setSpecializations(e.target.value)}
                className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">GitHub Repository Profile</Label>
                <Input
                  disabled={!isEditingExpertise}
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">LinkedIn Profile URL</Label>
                <Input
                  disabled={!isEditingExpertise}
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">Personal / Tech Portfolio Website</Label>
                <Input
                  disabled={!isEditingExpertise}
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Tab 3: Security & Password */}
      {activeTab === "security" && (
        <Card className="bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl max-w-2xl">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">
              Security & Credentials Management
            </CardTitle>
            <CardDescription className="text-xs text-[#6B7280]">
              Update your account password and security authentication keys
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">Current Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password (min. 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">Confirm New Password</Label>
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 bg-[#F9FAFB] dark:bg-[#27272A]"
              />
            </div>

            <Button
              onClick={handleUpdatePassword}
              className="h-11 px-6 font-semibold bg-[#9333EA] hover:bg-[#7E22CE] text-white text-xs"
            >
              <Key className="h-4 w-4 mr-2" /> Update Trainer Password
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
