import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  const [
    students, trainers, courses, assessments, tests, codingProblems, recentUsers, enrollments,
    recentStudents, recentTrainers, recentCourses, recentAssessments
  ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("status", "active"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "trainer").eq("status", "active"),
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("assessments").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("tests").select("id", { count: "exact", head: true }).neq("status", "cancelled"),
      supabase.from("coding_problems").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id, first_name, last_name, role, avatar_url, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("status", "active").gte("created_at", thirtyDaysAgoStr),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "trainer").eq("status", "active").gte("created_at", thirtyDaysAgoStr),
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published").gte("created_at", thirtyDaysAgoStr),
      supabase.from("assessments").select("id", { count: "exact", head: true }).eq("status", "active").gte("created_at", thirtyDaysAgoStr),
    ]);

  const calculateChange = (total: number, recent: number) => {
    if (total === 0) return 0;
    const previous = total - recent;
    if (previous === 0) return 100;
    return Math.round((recent / previous) * 100);
  };

  // Enrollment trend (last 7 days)
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const start = new Date(date.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(date.setHours(23, 59, 59, 999)).toISOString();
    const { count } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .gte("enrolled_at", start)
      .lte("enrolled_at", end);
    trendData.push({
      day: new Date(start).toLocaleDateString("en", { weekday: "short" }),
      enrollments: count ?? 0,
    });
  }

  // Activity logs
  const { data: activities } = await supabase
    .from("activity_logs")
    .select("*, profiles!inner(first_name, last_name, avatar_url, role)")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    stats: {
      total_students: students.count ?? 0,
      total_trainers: trainers.count ?? 0,
      total_courses: courses.count ?? 0,
      total_assessments: assessments.count ?? 0,
      total_tests: tests.count ?? 0,
      total_coding_problems: codingProblems.count ?? 0,
      active_enrollments: enrollments.count ?? 0,
    },
    changes: {
      students: calculateChange(students.count ?? 0, recentStudents.count ?? 0),
      trainers: calculateChange(trainers.count ?? 0, recentTrainers.count ?? 0),
      courses: calculateChange(courses.count ?? 0, recentCourses.count ?? 0),
      assessments: calculateChange(assessments.count ?? 0, recentAssessments.count ?? 0),
    },
    trendData,
    recentUsers: recentUsers.data ?? [],
    activities: activities ?? [],
  };
}

export default async function AdminDashboardPage() {
  const dashboardData = await getDashboardStats();
  return <AdminDashboardClient data={dashboardData} />;
}
