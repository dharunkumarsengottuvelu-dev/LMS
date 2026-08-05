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
  const [enrollmentsRes, testsRes, notificationsRes, certificatesRes] =
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
      supabase
        .from("certificates")
        .select("id, issued_at, course_id")
        .eq("student_id", profileId)
        .limit(5),
    ]);

  // Fetch course details for enrollments
  const courseIds = (enrollmentsRes.data ?? [])
    .map((e) => (e as unknown as { course_id: string }).course_id)
    .filter(Boolean);

  const { data: coursesData } = courseIds.length > 0
    ? await supabase
        .from("courses")
        .select("id, title, thumbnail_url, slug, difficulty")
        .in("id", courseIds)
    : { data: [] };

  const coursesById: Record<string, unknown> = {};
  for (const course of coursesData ?? []) {
    const c = course as unknown as { id: string };
    coursesById[c.id] = course;
  }

  // Build enrollments with course data
  const enrollments = (enrollmentsRes.data ?? []).map((e) => {
    const enr = e as unknown as {
      id: string;
      course_id: string;
      progress_percentage: number;
      status: string;
      enrolled_at: string;
    };
    return {
      id: enr.id,
      course_id: enr.course_id,
      progress_percentage: enr.progress_percentage ?? 0,
      status: enr.status,
      enrolled_at: enr.enrolled_at,
      courses: (coursesById[enr.course_id] as {
        id: string;
        title: string;
        thumbnail_url: string | null;
        slug: string;
        difficulty: string;
      } | undefined) ?? null,
    };
  });

  const completedCount = enrollments.filter((e) => e.status === "completed").length;

  return {
    profile: profile as unknown as import("@/types").UserProfile | null,
    enrollments,
    assessments: [] as { assessment_id: string; assessments: { id: string; title: string; type: string; duration_minutes: number; expires_at: string | null } | null }[],
    tests: (testsRes.data ?? []) as unknown as { id: string; title: string; type: string; scheduled_at: string; duration_minutes: number; status: string }[],
    assignments: [] as { id: string; status: string; assignments: { id: string; title: string; deadline: string; max_marks: number } | null }[],
    notifications: (notificationsRes.data ?? []) as unknown as { id: string; type: string; title: string; message: string; is_read: boolean; created_at: string }[],
    certificates: (certificatesRes.data ?? []) as unknown as { id: string; issued_at: string; courses: { title: string } | null }[],
    progressData: {},
    stats: {
      enrolledCourses: enrollments.length,
      completedCourses: completedCount,
      certificates: certificatesRes.data?.length ?? 0,
    },
  };
}

export default async function StudentDashboardPage() {
  const data = await getStudentData();
  return <StudentDashboardClient data={data} />;
}
