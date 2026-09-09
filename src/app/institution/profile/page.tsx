"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layouts/page-header";
import { getInitials } from "@/lib/utils";

interface InstitutionProfile {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  college: string;
  totalBatches: number;
  totalStudents: number;
  isPlatformAdmin: boolean;
}

export default function InstitutionProfilePage() {
  const [profile, setProfile] = useState<InstitutionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/institution/me");
      if (!res.ok) throw new Error("Unable to fetch institution profile.");
      const data = await res.json();
      setProfile(data.institution || null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="space-y-6 pt-2 animate-pulse w-full">
        <div className="h-24 bg-card rounded-2xl border border-border" />
        <div className="h-72 bg-card rounded-2xl border border-border" />
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <Card className="bg-card border-border rounded-2xl p-12 text-center shadow-xs max-w-xl mx-auto">
        <h3 className="text-sm font-bold text-foreground">Profile Unavailable</h3>
        <p className="text-xs text-muted-foreground mt-1">{errorMsg || "Institution record not found."}</p>
        <Button variant="outline" size="sm" onClick={fetchProfile} className="mt-4 rounded-xl text-xs font-semibold">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up w-full">
      {/* Page Header */}
      <PageHeader
        title="Institution Profile"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProfile}
            className="h-10 px-4 text-xs font-semibold rounded-xl border-border hover:bg-accent"
          >
            Refresh
          </Button>
        }
      />

      {/* Main Profile Dossier Card (Clean MNC Enterprise Architecture) */}
      <Card className="bg-card border-border rounded-2xl shadow-xs overflow-hidden">
        {/* Header Strip */}
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 rounded-2xl border border-border shadow-xs">
              <AvatarFallback className="bg-primary/10 text-primary text-base font-extrabold rounded-2xl">
                {getInitials(profile.name || "IN")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-foreground tracking-tight">{profile.name}</h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono font-bold">
                  {profile.code}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verified Institutional Partner
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            <div className="bg-background border border-border rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Campus / College Name
              </span>
              <p className="font-semibold text-sm text-foreground">
                {profile.college || profile.name || "Academic Campus"}
              </p>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Official Email
              </span>
              <p className="font-mono text-sm text-foreground">{profile.email || "Not specified"}</p>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Contact Phone
              </span>
              <p className="font-mono text-sm text-foreground">{profile.phone || "Not specified"}</p>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Institutional Identifier
              </span>
              <p className="font-mono text-xs text-muted-foreground truncate">{profile.id}</p>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 space-y-1 sm:col-span-2 lg:col-span-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Campus Address & Notes
              </span>
              <p className="text-foreground leading-relaxed text-xs">
                {profile.address || "Not specified"}
              </p>
            </div>
          </div>

          {/* Academic Engagement Metrics (Clean MNC Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <Card className="bg-background border border-border rounded-xl p-5 shadow-xs">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allocated Batches</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground font-mono tracking-tight">{profile.totalBatches}</span>
                <span className="text-xs text-muted-foreground font-medium">Active cohorts</span>
              </div>
            </Card>

            <Card className="bg-background border border-border rounded-xl p-5 shadow-xs">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled Learners</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground font-mono tracking-tight">{profile.totalStudents}</span>
                <span className="text-xs text-muted-foreground font-medium">Student accounts</span>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
