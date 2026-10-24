import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StudentDashboardClient } from "./dashboard-client";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";
import { getTopicThumbnail } from "@/lib/utils";

export const metadata: Metadata = { title: "Student Dashboard" };
export const dynamic = "force-dynamic";

async function getStudentData() {
  console.log("[Dashboard] initialization started");
  console.log("[Dashboard] auth check started");

  let supabase;
  let user = null;

  try {
    supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.warn("[Dashboard] AUTH ERROR:", authError.message);
    }
    user = authData?.user ?? null;
  } catch (err) {
    console.error("[Dashboard] AUTH ERROR exception:", err);
  }

  if (!user) {
    console.log("[Dashboard] auth resolved: unauthenticated (null user)");
    return {
      profile: null,
      initialCourses: [],
      initialTracks: [],
      initialCodingProblems: [],
      enrollments: [],
      assessments: [],
      tests: [],
      assignments: [],
      notifications: [],
      certificates: [],
      stats: { enrolledCourses: 0, completedCourses: 0, certificates: 0 },
    };
  }

  console.log(`[Dashboard] auth resolved: ${user.id}`);

  let adminClient: any;
  try {
    adminClient = createAdminClient();
  } catch {
    adminClient = supabase;
  }

  // 1. Resolve student batch & profile
  console.log("[Dashboard] profile request started");
  let batchContext: any = null;
  let pData: any = {};

  try {
    batchContext = await getStudentBatchAccess(adminClient, user);
    pData = (batchContext?.profile || {}) as any;
  } catch (err) {
    console.error("[Dashboard] PROFILE ERROR: getStudentBatchAccess failed:", err);
    // Safe fallback context
    batchContext = {
      profile: null,
      profileId: user.id,
      studentUserId: user.id,
      studentEmail: user.email || "",
      studentFullName: "",
      batchIds: [],
      batchNames: [],
      allTargetIdentifiers: new Set([user.id.toLowerCase()]),
    };
  }

  const userMeta = user.user_metadata || {};
  const metaFullName = (userMeta.full_name || userMeta.name || "").trim();
  const nameParts = metaFullName.split(" ");
  const emailName = (user.email || "").split("@")[0] || "Student";
  const formattedEmailName = emailName.charAt(0).toUpperCase() + emailName.slice(1);

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
    ...pData,
    id: batchContext.profileId || user.id,
    user_id: user.id,
    first_name: firstName,
    last_name: lastName,
    full_name: fullDisplayName,
    email: user.email,
    role: pData?.role || userMeta.role || "student",
    status: pData?.status || "active",
  };

  console.log(`[Dashboard] profile resolved: ${fullDisplayName} (${resolvedProfile.role})`);

  // 2. Fetch live optional dashboard data concurrently with error resilience
  console.log("[Dashboard] dashboard data loading");

  const [coursesResult, tracksResult, testsResult, notificationsResult, codingResult] =
    await Promise.allSettled([
      adminClient
        .from("courses")
        .select("id, slug, title, status, assigned_batches, is_common, tags, created_at")
        .order("created_at", { ascending: false })
        .limit(40),
      adminClient
        .from("practice_tracks")
        .select("id, title, category, difficulty, description, thumbnail, assigned_by_name, assigned_batches, assigned_students, sub_modules, is_common, status, created_at, tags")
        .order("created_at", { ascending: false })
        .limit(40),
      adminClient
        .from("assessments")
        .select("id, title, description, duration_minutes, total_marks, pass_percentage, status, scheduled_at, assigned_batches, is_common, tags, created_at")
        .order("created_at", { ascending: false })
        .limit(40),
      adminClient
        .from("notifications")
        .select("id, title, message, type, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      adminClient
        .from("coding_problems")
        .select("id, title, slug, difficulty, tags, time_limit_ms, starter_code, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  // Safely extract dataset with section-level error tolerance
  const coursesData = coursesResult.status === "fulfilled" && !coursesResult.value.error
    ? coursesResult.value.data
    : [];
  if (coursesResult.status === "rejected" || (coursesResult.status === "fulfilled" && coursesResult.value.error)) {
    console.warn("[Dashboard] DATA ERROR (courses):", coursesResult.status === "rejected" ? coursesResult.reason : coursesResult.value.error);
  }

  const tracksData = tracksResult.status === "fulfilled" && !tracksResult.value.error
    ? tracksResult.value.data
    : [];
  if (tracksResult.status === "rejected" || (tracksResult.status === "fulfilled" && tracksResult.value.error)) {
    console.warn("[Dashboard] DATA ERROR (practice_tracks):", tracksResult.status === "rejected" ? tracksResult.reason : tracksResult.value.error);
  }

  const testsData = testsResult.status === "fulfilled" && !testsResult.value.error
    ? testsResult.value.data
    : [];
  if (testsResult.status === "rejected" || (testsResult.status === "fulfilled" && testsResult.value.error)) {
    console.warn("[Dashboard] DATA ERROR (assessments):", testsResult.status === "rejected" ? testsResult.reason : testsResult.value.error);
  }

  const notificationsData = notificationsResult.status === "fulfilled" && !notificationsResult.value.error
    ? notificationsResult.value.data
    : [];
  if (notificationsResult.status === "rejected" || (notificationsResult.status === "fulfilled" && notificationsResult.value.error)) {
    console.warn("[Dashboard] DATA ERROR (notifications):", notificationsResult.status === "rejected" ? notificationsResult.reason : notificationsResult.value.error);
  }

  const codingData = codingResult.status === "fulfilled" && !codingResult.value.error
    ? codingResult.value.data
    : [];
  if (codingResult.status === "rejected" || (codingResult.status === "fulfilled" && codingResult.value.error)) {
    console.warn("[Dashboard] DATA ERROR (coding_problems):", codingResult.status === "rejected" ? codingResult.reason : codingResult.value.error);
  }

  const rawCourses = (coursesData || [])
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
        category: meta.category || "Technical Training",
        assigned_batches: assignedBatches,
        is_common: isCommon,
        status: c.status || meta.status || "published",
        modules: meta.modules || [],
      };
    })
    .filter((c: any) => c.status !== "draft" && isContentVisibleToStudent(c, batchContext));

  const rawTracks = (tracksData || [])
    .map((t: any) => {
      let meta: any = {};
      if (t.tags && t.tags[0]) {
        try { meta = JSON.parse(t.tags[0]); } catch {}
      }
      const assignedBatches = t.assigned_batches || meta.assignedBatches || [];
      const assignedStudents = t.assigned_students || meta.assignedStudents || [];
      const isCommon =
        t.is_common === true ||
        String(t.is_common) === "true" ||
        meta.isCommon === true ||
        String(meta.isCommon) === "true" ||
        meta.is_common === true ||
        String(meta.is_common) === "true" ||
        (assignedBatches.length === 0 && assignedStudents.length === 0) ||
        assignedBatches.includes("common") ||
        assignedBatches.includes("all");
      return {
        id: t.id,
        title: t.title,
        category: t.category,
        difficulty: t.difficulty || "medium",
        description: meta.description || t.description || "Practice Track",
        thumbnail: getTopicThumbnail(t.title, t.category, meta.thumbnail || t.thumbnail),
        assigned_by_name: meta.assignedByName || t.assigned_by_name || "Admin",
        assigned_batches: assignedBatches,
        assigned_students: assignedStudents,
        sub_modules: meta.subModules || t.sub_modules || [],
        is_common: isCommon,
        status: t.status || meta.status || "published",
        created_at: t.created_at,
      };
    })
    .filter((track: any) => track.status !== "draft" && isContentVisibleToStudent(track, batchContext));

  const filteredCoding = (codingData || [])
    .filter((p: any) => {
      const extra = typeof p.starter_code === "object" && p.starter_code !== null ? p.starter_code : {};
      return extra.scope !== "practice" && !extra.module_id;
    })
    .slice(0, 6);

  console.log(
    `[Dashboard] dashboard data resolved: ${rawCourses.length} courses, ${rawTracks.length} tracks, ${testsData.length} tests, ${notificationsData.length} notifications, ${filteredCoding.length} coding problems`
  );
  console.log("[Dashboard] initialization completed");

  return {
    profile: resolvedProfile as any,
    initialCourses: rawCourses,
    initialTracks: rawTracks,
    initialCodingProblems: filteredCoding,
    enrollments: rawCourses as any,
    assessments: (testsData || []) as any,
    tests: (testsData || []) as any,
    assignments: [],
    notifications: (notificationsData || []) as any,
    certificates: [],
    stats: {
      enrolledCourses: rawCourses.length,
      completedCourses: 0,
      certificates: 0,
    },
  };
}

export default async function StudentDashboardPage() {
  let data;
  try {
    data = await getStudentData();
  } catch (error) {
    console.error("[Dashboard] Unexpected error in StudentDashboardPage:", error);
    // Graceful fallback UI data instead of staying stuck in Suspense loading forever
    data = {
      profile: null,
      initialCourses: [],
      initialTracks: [],
      initialCodingProblems: [],
      enrollments: [],
      assessments: [],
      tests: [],
      assignments: [],
      notifications: [],
      certificates: [],
      stats: { enrolledCourses: 0, completedCourses: 0, certificates: 0 },
    };
  }

  return <StudentDashboardClient data={data} />;
}
