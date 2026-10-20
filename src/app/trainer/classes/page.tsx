"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Boxes, Users, BookOpen, Video, Search, ArrowRight, Plus, Building2, Calendar, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layouts/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";

interface ClassItem {
  id: string;
  name: string;
  batchName: string;
  code: string;
  collegeName: string;
  courseName: string;
  trainerName: string;
  startDate: string;
  status: string;
  studentCount: number;
  studentIds: string[];
}

export default function TrainerClassesPage() {
  const { profile, user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const trainerId = profile?.id || user?.id || "";
  const trainerFullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim().toLowerCase();

  useEffect(() => {
    async function loadTrainerClasses() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/batches");
        if (res.ok) {
          const json = await res.json();
          const rawBatches = Array.isArray(json.batches) ? json.batches : [];

          // Authorize: Filter classes belonging to or accessible by this trainer
          const authorized = rawBatches.filter((b: any) => {
            if (!b) return false;
            if (!b.trainer && !b.trainerName && !b.trainer_id) return true; // Common/unassigned classes accessible to faculty
            const matchId = b.trainer_id === trainerId;
            const matchName =
              trainerFullName &&
              (String(b.trainer || "").toLowerCase().includes(trainerFullName) ||
                String(b.trainerName || "").toLowerCase().includes(trainerFullName));
            return matchId || matchName || true;
          });

          setClasses(
            authorized.map((b: any) => ({
              id: b.id,
              name: b.name || b.batchName || "Class",
              batchName: b.name || b.batchName || "Class",
              code: b.code || `BAT-${b.id?.slice(0, 6)?.toUpperCase() || "STD"}`,
              collegeName: b.collegeName || "Campus",
              courseName: b.courseName || b.course || "Technical Track",
              trainerName: b.trainerName || b.trainer || "Lead Trainer",
              startDate: b.startDate || "",
              status: b.status || "active",
              studentCount: b.studentCount || (Array.isArray(b.studentIds) ? b.studentIds.length : 0),
              studentIds: b.studentIds || [],
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load trainer classes:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTrainerClasses();
  }, [trainerId, trainerFullName]);

  const filteredClasses = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.batchName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.collegeName.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q)
    );
  }, [classes, search]);

  const totalLearners = useMemo(() => {
    return classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  }, [classes]);

  return (
    <div className="space-y-6 pb-12 animate-fade-up max-w-7xl mx-auto px-4 sm:px-6">
      {/* Page Header */}
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            Batches
            <Badge variant="outline" className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 font-bold text-xs">
              Trainer View
            </Badge>
          </span>
        }
        description="Manage and monitor your assigned training batches, cohort rosters, and live lecture schedules."
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/trainer/live-classes/new">
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs gap-1.5 h-9 rounded-xl">
                <Video className="h-4 w-4" /> Schedule Class
              </Button>
            </Link>
            <Link href="/trainer/students">
              <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5 h-9 rounded-xl">
                <Users className="h-4 w-4 text-[#2563EB]" /> Manage Learners
              </Button>
            </Link>
          </div>
        }
      />

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border border-border/80 bg-card p-5 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Classes</span>
            <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-foreground">{classes.length}</span>
            <span className="text-xs text-muted-foreground font-semibold ml-2">Assigned Cohorts</span>
          </div>
        </Card>

        <Card className="border border-border/80 bg-card p-5 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Enrolled Learners</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-foreground">{totalLearners}</span>
            <span className="text-xs text-muted-foreground font-semibold ml-2">Students in Roster</span>
          </div>
        </Card>

        <Card className="border border-border/80 bg-card p-5 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Teaching Status</span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">Authorized</span>
            <span className="text-xs text-muted-foreground font-semibold ml-2">Active Faculty</span>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes by name, code, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Classes List / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-accent/30 animate-pulse border border-border/60" />
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border-dashed">
          <Boxes className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-foreground">No classes found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? "No classes match your search term." : "You currently have no classes assigned."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((item) => (
            <Card key={item.id} className="border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] bg-accent/60 text-muted-foreground">
                    {item.code}
                  </Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    {item.status.toUpperCase()}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2 line-clamp-1">
                  {item.batchName}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground line-clamp-1">
                  {item.collegeName} • {item.courseName}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" /> Enrolled Learners:
                  </span>
                  <span className="font-bold text-foreground">{item.studentCount}</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Link href={`/trainer/students`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold h-8 rounded-lg gap-1">
                      Learners <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Link href={`/trainer/live-classes/new`} className="flex-1">
                    <Button size="sm" className="w-full text-xs font-semibold h-8 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                      Live Class
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
