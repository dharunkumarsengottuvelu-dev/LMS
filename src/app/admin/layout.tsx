import { AdminTopNav } from "@/components/layouts/admin-top-nav";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "SensilLearn | %s", default: "SensilLearn | Admin Dashboard" },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const currentPath = headersList.get("x-pathname") || "";
  const currentSearch = headersList.get("x-search") || "";
  const fullOriginalPath = currentPath ? `${currentPath}${currentSearch}` : "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const nextTarget = fullOriginalPath || "/admin/dashboard";
    redirect(`/login?error=session_expired&next=${encodeURIComponent(nextTarget)}`);
  }

  let { data: profileData } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profileData) {
    try {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("profiles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) profileData = data as any;
    } catch (e) {
      console.warn("Admin layout: fallback profile fetch error", e);
    }
  }

  const profile = profileData as { role?: string; status?: string } | null;
  if (profile?.status === "suspended") {
    redirect("/login?error=suspended");
  }

  const role = (profile?.role || user.user_metadata?.role || user.app_metadata?.role || "").toLowerCase();
  const isAdmin =
    role === "admin" ||
    role === "super_admin" ||
    role === "founder" ||
    role === "ceo";

  if (!isAdmin) {
    if (role === "trainer") {
      redirect("/trainer/dashboard");
    } else if (role === "institution") {
      redirect("/institution/overview");
    } else {
      redirect("/student/dashboard");
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <AdminTopNav />
      <main className="pt-[88px] lms-page-container pb-12 animate-fade-up">
        {children}
      </main>
    </div>
  );
}

