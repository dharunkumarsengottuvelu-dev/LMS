import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StudentDashboardClient } from "./dashboard-client";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

async function getStudentData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get profile first
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const profile = profileData as Record<string, unknown> | null;
  const profileId = (profile?.id as string) ?? "";

  // Parallel data fetching
  const [enrollmentsRes, testsRes, notificationsRes] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("id, course_id, progress_percentage, status, enrolled_at")
        .eq("student_id", profileId)
        .neq("status", "dropped")
        .order("enrolled_at", { ascending: false })
        .limit(6),
      supabase
        .from("tests")
        .select("id, title, type, scheduled_at, duration_minutes, status")
        .gte("scheduled_at", new Date().toISOString())
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true })
        .limit(5),
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const enrollments = enrollmentsRes.data ?? [];
  const tests = testsRes.data ?? [];
  const notifications = notificationsRes.data ?? [];

  const enrolledCount = enrollments.length;
  const completedCount = enrollments.filter((e: any) => e.progress_percentage === 100).length;

  return {
    profile: profile as any,
    enrollments: enrollments as any,
    assessments: [],
    tests: tests as any,
    assignments: [],
    notifications: notifications as any,
    certificates: [],
    stats: {
      enrolledCourses: enrolledCount,
      completedCourses: completedCount,
      certificates: 0,
    },
  };
}

export default async function StudentDashboardPage() {
  const data = await getStudentData();
  return <StudentDashboardClient data={data} />;
}
