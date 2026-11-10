import { StudentLayoutWrapper } from "@/components/layouts/student-layout-wrapper";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { SessionTimeout } from "@/components/providers/session-timeout";
import { getOriginalRequestPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: { template: "SensiLearn | %s", default: "SensiLearn | Student Dashboard" },
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const { currentPath, fullOriginalPath } = getOriginalRequestPath(headersList, "/student/dashboard");

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await getAuthenticatedUser();

  if (!user) {
    const nextTarget = fullOriginalPath || "/student/dashboard";
    redirect(`/login?error=session_expired&next=${encodeURIComponent(nextTarget)}`);
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .or(`user_id.eq.${user.id},id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ""}`)
    .maybeSingle();

  // Robust fallback: query admin client if profile lookup returned null
  if (!profile) {
    try {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("profiles")
        .select("role, status")
        .or(`user_id.eq.${user.id},id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ""}`)
        .maybeSingle();
      if (data) profile = data as any;
    } catch (e) {
      console.warn("Student layout: fallback profile fetch error", e);
    }
  }

  const profileData = profile as { role?: string; status?: string } | null;
  if (profileData?.status === "suspended") {
    redirect("/login?error=suspended");
  }

  const role = (profileData?.role || user.user_metadata?.role || user.app_metadata?.role || "").toLowerCase();

  const isAdmin =
    role === "admin" ||
    role === "super_admin" ||
    role === "founder" ||
    role === "ceo";

  const isTrainer = role === "trainer";
  const isInstitution = role === "institution";

  // Allow admins and trainers to preview and inspect all student learning experiences
  // (courses, practices, assessments, tests, coding challenges, live classes, reports).
  // Only redirect if they explicitly land on the generic student dashboard root.
  const isGenericStudentHome = currentPath === "/student" || currentPath === "/student/" || currentPath === "/student/dashboard";

  if (isAdmin && isGenericStudentHome) {
    redirect("/admin/dashboard");
  } else if (isTrainer && isGenericStudentHome) {
    redirect("/trainer/dashboard");
  } else if (isInstitution && isGenericStudentHome) {
    redirect("/institution/overview");
  }

  return (
    <SessionTimeout>
      <StudentLayoutWrapper>{children}</StudentLayoutWrapper>
    </SessionTimeout>
  );
}

