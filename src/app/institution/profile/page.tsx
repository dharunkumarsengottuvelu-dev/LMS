"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      <div className="space-y-4 pt-4 max-w-2xl">
        <div className="h-8 w-48 bg-accent/60 rounded animate-pulse" />
        <div className="h-64 bg-accent/30 rounded-lg border border-border animate-pulse" />
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm font-semibold text-destructive">{errorMsg || "Profile not found"}</p>
        <Button variant="outline" size="sm" onClick={fetchProfile}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2 max-w-3xl">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Institution Profile
          </h1>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-mono font-bold">
            {profile.code}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Registered institutional credentials, allocated cohorts, and administrative contact data.
        </p>
      </div>

      {/* Main Profile Dossier Card */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">{profile.name}</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{profile.id}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Institution Code
            </span>
            <p className="font-mono font-bold text-foreground">{profile.code}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Campus / College
            </span>
            <p className="font-semibold text-foreground">
              {profile.college || profile.name || "Academic Campus"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Official Email
            </span>
            <p className="font-mono text-foreground">{profile.email || "Not specified"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Contact Phone
            </span>
            <p className="font-mono text-foreground">{profile.phone || "Not specified"}</p>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Campus Address / Description
            </span>
            <p className="text-foreground leading-relaxed">
              {profile.address || "Registered academic institution partner under Falcon Learning Technologies enterprise framework."}
            </p>
          </div>
        </div>

        {/* Academic Engagement Metrics */}
        <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
          <div className="bg-muted/40 border border-border rounded p-3 text-center space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Allocated Batches
            </span>
            <p className="text-xl font-black text-foreground font-mono">{profile.totalBatches}</p>
          </div>

          <div className="bg-muted/40 border border-border rounded p-3 text-center space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Enrolled Learners
            </span>
            <p className="text-xl font-black text-foreground font-mono">{profile.totalStudents}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
