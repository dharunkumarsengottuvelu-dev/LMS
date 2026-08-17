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

  // Get profile from database
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .or(`user_id.eq.${user.id},id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ""}`)
    .maybeSingle();

  const userMeta = user.user_metadata || {};
  const metaFullName = (userMeta.full_name || userMeta.name || "").trim();
  const nameParts = metaFullName.split(" ");
  const emailName = (user.email || "").split("@")[0] || "Student";
  const formattedEmailName = emailName.charAt(0).toUpperCase() + emailName.slice(1);

  const pData = profileData as any;
  const firstName =
    pData?.first_name ||
    userMeta.first_name ||
    (nameParts[0] || formattedEmailName);

  const lastName =
    pData?.last_name ||
    userMeta.last_name ||
    (nameParts.slice(1).join(" ") || "");

  const fullDisplayName = `${firstName} ${lastName}`.trim() || formattedEmailName;

  const resolvedProfile = {
    ...(pData || {}),
    id: pData?.id || user.id,
    user_id: user.id,
    first_name: firstName,
    last_name: lastName,
    full_name: fullDisplayName,
    email: user.email,
    role: pData?.role || "student",
    status: pData?.status || "active",
  };

  const profileId = (resolvedProfile.id as string) || user.id;

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
    profile: resolvedProfile as any,
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
