import { TrainerTopNav } from "@/components/layouts/trainer-top-nav";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "SensilLearn | %s", default: "SensilLearn | Trainer Dashboard" },
};

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const currentPath = headersList.get("x-pathname") || "";
  const currentSearch = headersList.get("x-search") || "";
  const fullOriginalPath = currentPath ? `${currentPath}${currentSearch}` : "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const nextTarget = fullOriginalPath || "/trainer/dashboard";
    redirect(`/login?error=session_expired&next=${encodeURIComponent(nextTarget)}`);
  }

  let { data: profileData } = await supabase
    .from("profiles")
    .select("role, status")
    .or(`user_id.eq.${user.id},id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ""}`)
    .maybeSingle();

  if (!profileData) {
    try {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("profiles")
        .select("role, status")
        .or(`user_id.eq.${user.id},id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ""}`)
        .maybeSingle();
      if (data) profileData = data as any;
    } catch (e) {
      console.warn("Trainer layout: fallback profile fetch error", e);
    }
  }

  const profile = profileData as { role?: string; status?: string } | null;
  if (profile?.status === "suspended") {
    redirect("/login?error=suspended");
  }

  const role = (profile?.role || user.user_metadata?.role || user.app_metadata?.role || "").toLowerCase();

  const isTrainer = role === "trainer";
  const isAdmin = role === "admin" || role === "super_admin" || role === "founder" || role === "ceo";

  if (!isTrainer && !isAdmin) {
    if (role === "institution") {
      redirect("/institution/overview");
    } else {
      redirect("/student/dashboard");
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <TrainerTopNav />
      <main className="pt-[88px] lms-page-container pb-12 animate-fade-up">
        {children}
      </main>
    </div>
  );
}

