import { StudentLayoutWrapper } from "@/components/layouts/student-layout-wrapper";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { SessionTimeout } from "@/components/providers/session-timeout";

export const metadata: Metadata = {
  title: { template: "SensilLearn | %s", default: "SensilLearn | Student Dashboard" },
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const currentPath = headersList.get("x-pathname") || "";
  const currentSearch = headersList.get("x-search") || "";
  const fullOriginalPath = currentPath ? `${currentPath}${currentSearch}` : "";

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (!user) {
    const nextTarget = fullOriginalPath || "/student/dashboard";
    redirect(`/login?error=session_expired&next=${encodeURIComponent(nextTarget)}`);
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  // Robust fallback: query admin client if profile lookup returned null
  if (!profile) {
    try {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("profiles")
        .select("role, status")
        .eq("user_id", user.id)
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

  // Allow admins and trainers to preview student courses, practices, or tests without kicking them back to dashboard
  const isContentPreview =
    currentPath.startsWith("/student/course/") ||
    currentPath.startsWith("/courses/") ||
    currentPath.startsWith("/student/practices") ||
    currentPath.startsWith("/practice") ||
    currentPath.startsWith("/coding");

  if (isAdmin && !isContentPreview) {
    redirect("/admin/dashboard");
  } else if (isTrainer && !isContentPreview) {
    redirect("/trainer/dashboard");
  } else if (isInstitution && !isContentPreview) {
    redirect("/institution/overview");
  }

  return (
    <SessionTimeout>
      <StudentLayoutWrapper>{children}</StudentLayoutWrapper>
    </SessionTimeout>
  );
}

