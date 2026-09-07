"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Layers,
  Users,
  RotateCw,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
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
      <div className="space-y-6 pt-2 animate-pulse max-w-4xl">
        <div className="h-24 bg-card rounded-2xl border border-border" />
        <div className="h-72 bg-card rounded-2xl border border-border" />
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <Card className="bg-card border-border rounded-2xl p-12 text-center shadow-xs max-w-xl mx-auto">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3 opacity-80" />
        <h3 className="text-sm font-bold text-foreground">Profile Unavailable</h3>
        <p className="text-xs text-muted-foreground mt-1">{errorMsg || "Institution record not found."}</p>
        <Button variant="outline" size="sm" onClick={fetchProfile} className="mt-4 rounded-xl text-xs">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up max-w-4xl">
      {/* Page Header */}
      <PageHeader
        title="Institution Profile"
        description="Registered institutional credentials, allocated cohorts, and administrative contact records."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProfile}
            className="h-9 px-3.5 gap-2 text-xs font-semibold rounded-xl border-border hover:bg-accent"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Main Profile Dossier Card */}
      <Card className="bg-card border-border rounded-2xl shadow-xs overflow-hidden">
        {/* Banner / Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 via-background to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 rounded-2xl border-2 border-primary/20 shadow-xs">
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
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Verified Institutional Partner
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div className="bg-background border border-border rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Campus / College Name
              </span>
              <p className="font-semibold text-sm text-foreground">
                {profile.college || profile.name || "Academic Campus"}
              </p>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Official Email
              </span>
              <p className="font-mono text-sm text-foreground">{profile.email || "Not specified"}</p>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Contact Phone
              </span>
              <p className="font-mono text-sm text-foreground">{profile.phone || "Not specified"}</p>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Institutional Identifier
              </span>
              <p className="font-mono text-xs text-muted-foreground truncate">{profile.id}</p>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 space-y-1 sm:col-span-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Campus Address & Telemetry Description
              </span>
              <p className="text-foreground leading-relaxed text-xs">
                {profile.address || "Registered academic institution partner under Falcon Learning Technologies enterprise framework."}
              </p>
            </div>
          </div>

          {/* Academic Engagement Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-background border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allocated Batches</p>
                <h3 className="text-2xl font-bold text-foreground mt-1 font-mono">{profile.totalBatches}</h3>
                <p className="text-[11px] text-muted-foreground">Active cohorts</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled Learners</p>
                <h3 className="text-2xl font-bold text-foreground mt-1 font-mono">{profile.totalStudents}</h3>
                <p className="text-[11px] text-muted-foreground">Student accounts</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
