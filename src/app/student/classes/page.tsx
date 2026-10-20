import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";
import Link from "next/link";
import { Boxes, BookOpen, Video, Users, Calendar, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "SensilLearn | Batches",
};
export const dynamic = "force-dynamic";

export default async function StudentClassesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    adminClient = supabase;
  }

  const batchContext = await getStudentBatchAccess(adminClient, user);
  const profile = (batchContext.profile || {}) as any;

  // Resolve assigned batch names & details
  const primaryBatchName =
    batchContext.batchNames[0] ||
    profile.batch_name ||
    (profile.batch && profile.batch !== "Unassigned" ? profile.batch : null) ||
    "Core Training Cohort";

  // Query batch metadata if available
  let batchDetails: any = null;
  if (batchContext.batchIds.length > 0) {
    const { data: bDataRaw } = await (adminClient as any)
      .from("batches")
      .select("id, name, batch_name, code, description, start_date, status, trainer_id")
      .in("id", batchContext.batchIds)
      .limit(1)
      .maybeSingle();

    const bData = bDataRaw as any;
    if (bData) {
      let meta: any = {};
      try {
        if (bData.description && typeof bData.description === "string" && bData.description.startsWith("{")) {
          meta = JSON.parse(bData.description);
        }
      } catch {}

      batchDetails = {
        ...bData,
        collegeName: meta.collegeName || meta.college_name || profile.college || "Academic Campus",
        courseName: meta.courseName || meta.course || "Comprehensive Enterprise Track",
        code: bData.code || `BAT-${String(bData.id || "").slice(0, 6).toUpperCase()}`,
      };
    }
  }

  // Fetch courses assigned to student's class
  const { data: coursesData } = await adminClient
    .from("courses")
    .select("id, slug, title, status, assigned_batches, is_common, tags, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const assignedCourses = (coursesData || [])
    .map((c: any) => {
      let meta: any = {};
      if (c.tags && c.tags[0]) {
        try { meta = JSON.parse(c.tags[0]); } catch {}
      }
      const assignedBatches = c.assigned_batches || meta.assignedBatches || [];
      const isCommon = c.is_common !== undefined ? c.is_common : (assignedBatches.length === 0);
      return {
        id: c.id,
        slug: c.slug || c.id,
        title: c.title,
        assigned_batches: assignedBatches,
        is_common: isCommon,
        status: c.status || meta.status || "published",
        modules: meta.modules || [],
      };
    })
    .filter((c: any) => c.status !== "draft" && isContentVisibleToStudent(c, batchContext));

  // Fetch live classes assigned to student's class
  const { data: liveClassesData } = await (adminClient as any)
    .from("live_classes")
    .select("id, title, status, scheduled_date, start_time, meeting_url, trainer_name, assigned_batches, is_common")
    .order("scheduled_date", { ascending: true })
    .limit(10);

  const classLiveSessions: any[] = ((liveClassesData as any[]) || [])
    .filter((lc: any) => lc.status !== "cancelled" && isContentVisibleToStudent(lc, batchContext));

  return (
    <div className="space-y-6 pb-12 animate-fade-up max-w-7xl mx-auto px-4 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Batches</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5">
              Enrolled
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Your enrolled academic class cohort, assigned curriculum, and scheduled live lectures.
          </p>
        </div>
        <Link href="/student/live-classes">
          <Button variant="outline" size="sm" className="gap-2 text-xs font-medium">
            <Video className="h-4 w-4 text-primary" /> Live Sessions
          </Button>
        </Link>
      </div>

      {/* Primary Class Overview Card */}
      <Card className="border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border-b border-border/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Enrolled Cohort</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground font-mono">{batchDetails?.code || "BAT-STD"}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                {primaryBatchName}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Institution: <strong className="text-foreground">{batchDetails?.collegeName || profile.college || "SensiLearn University"}</strong>
                {batchDetails?.courseName && (
                  <> • Track: <strong className="text-foreground">{batchDetails.courseName}</strong></>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-background/80 border border-border shadow-xs text-xs font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Active Status</span>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-card">
          <div className="p-4 rounded-xl bg-accent/40 border border-border/60">
            <span className="text-xs font-medium text-muted-foreground">Class Curriculum</span>
            <p className="text-2xl font-bold text-foreground mt-1">{assignedCourses.length}</p>
            <span className="text-[11px] text-muted-foreground">Assigned Courses</span>
          </div>

          <div className="p-4 rounded-xl bg-accent/40 border border-border/60">
            <span className="text-xs font-medium text-muted-foreground">Live Sessions</span>
            <p className="text-2xl font-bold text-foreground mt-1">{classLiveSessions.length}</p>
            <span className="text-[11px] text-muted-foreground">Interactive Lectures</span>
          </div>

          <div className="p-4 rounded-xl bg-accent/40 border border-border/60">
            <span className="text-xs font-medium text-muted-foreground">Academic Status</span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">Verified</p>
            <span className="text-[11px] text-muted-foreground">Full Class Access</span>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Class Courses & Upcoming Live Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Courses */}
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardHeader className="p-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Class Courses ({assignedCourses.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Curriculum syllabus assigned specifically to your class
              </CardDescription>
            </div>
            <Link href="/student/my-courses">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary gap-1">
                All Courses <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {assignedCourses.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No active courses currently assigned to this class cohort.
              </div>
            ) : (
              assignedCourses.slice(0, 4).map((course) => (
                <div
                  key={course.id}
                  className="p-3.5 rounded-xl border border-border/60 bg-accent/20 hover:bg-accent/40 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{course.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {course.modules?.length || 0} modules in syllabus
                    </p>
                  </div>
                  <Link href={`/student/course/${course.slug || course.id}`}>
                    <Button size="sm" variant="outline" className="text-xs font-medium shrink-0 h-8">
                      Study
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Class Live Sessions */}
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardHeader className="p-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" /> Class Live Lectures ({classLiveSessions.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Scheduled real-time training lectures for your class
              </CardDescription>
            </div>
            <Link href="/student/live-classes">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary gap-1">
                View Schedule <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {classLiveSessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No upcoming live classes scheduled for your class at this moment.
              </div>
            ) : (
              classLiveSessions.slice(0, 4).map((cls) => (
                <div
                  key={cls.id}
                  className="p-3.5 rounded-xl border border-border/60 bg-accent/20 hover:bg-accent/40 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{cls.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {cls.scheduled_date} • {cls.start_time || "TBD"} {cls.trainer_name ? `• ${cls.trainer_name}` : ""}
                    </p>
                  </div>
                  <Link href={`/student/live-classes`}>
                    <Button size="sm" className="text-xs font-semibold shrink-0 h-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                      Join
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
