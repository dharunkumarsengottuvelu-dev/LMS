import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StudentDashboardClient } from "./dashboard-client";
import { redirect } from "next/navigation";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";
import { getTopicThumbnail } from "@/lib/utils";

export const metadata: Metadata = { title: "Student Dashboard" };
export const dynamic = "force-dynamic";

async function getStudentData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      profile: null,
      initialCourses: [],
      initialTracks: [],
      enrollments: [],
      assessments: [],
      tests: [],
      assignments: [],
      notifications: [],
      certificates: [],
      stats: { enrolledCourses: 0, completedCourses: 0, certificates: 0 },
    };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    adminClient = supabase;
  }

  // 1. Resolve student batch & profile
  const batchContext = await getStudentBatchAccess(adminClient, user);
  const pData = (batchContext.profile || {}) as any;

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
    role: pData?.role || "student",
    status: pData?.status || "active",
  };

  // 2. Fetch live data from database with batch authorization (selecting only needed columns)
  const [coursesRes, tracksRes, testsRes, notificationsRes, codingRes] = await Promise.all([
    adminClient.from("courses").select("id, slug, title, status, assigned_batches, is_common, tags, created_at").order("created_at", { ascending: false }),
    adminClient.from("practice_tracks").select("id, title, category, difficulty, description, thumbnail, assigned_by_name, assigned_batches, assigned_students, sub_modules, is_common, status, created_at, tags").order("created_at", { ascending: false }),
    adminClient.from("assessments").select("id, title, description, duration_minutes, total_marks, passing_marks, status, scheduled_at, assigned_batches, is_common, tags, created_at").order("created_at", { ascending: false }),
    adminClient.from("notifications").select("id, title, message, type, read, created_at").order("created_at", { ascending: false }).limit(8),
    adminClient.from("coding_problems").select("id, title, slug, difficulty, category, topic_tags, points, created_at, starter_code").order("created_at", { ascending: false }).limit(20),
  ]);

  const rawCourses = ((coursesRes.data as any[]) || [])
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

  const rawTracks = ((tracksRes.data as any[]) || [])
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

  return {
    profile: resolvedProfile as any,
    initialCourses: rawCourses,
    initialTracks: rawTracks,
    initialCodingProblems: (((codingRes?.data as any[]) || []).filter((p: any) => {
      const extra = typeof p.starter_code === "object" && p.starter_code !== null ? p.starter_code : {};
      return extra.scope !== "practice" && !extra.module_id;
    })).slice(0, 6),
    enrollments: rawCourses as any,
    assessments: ((testsRes.data as any[]) || []) as any,
    tests: ((testsRes.data as any[]) || []) as any,
    assignments: [],
    notifications: ((notificationsRes.data as any[]) || []) as any,
    certificates: [],
    stats: {
      enrolledCourses: rawCourses.length,
      completedCourses: 0,
      certificates: 0,
    },
  };
}

export default async function StudentDashboardPage() {
  const data = await getStudentData();
  return <StudentDashboardClient data={data} />;
}
