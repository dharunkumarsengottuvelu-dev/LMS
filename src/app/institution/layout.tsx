import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InstitutionTopNav } from "@/components/layouts/institution-top-nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "SensilLearn | %s",
    default: "SensilLearn | Institution Dashboard",
  },
  description: "Academic and learner performance portal for partner institutions.",
};

export default async function InstitutionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const currentPath = headersList.get("x-pathname") || "";
  const currentSearch = headersList.get("x-search") || "";
  const fullOriginalPath = currentPath ? `${currentPath}${currentSearch}` : "";

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    const nextTarget = fullOriginalPath || "/institution/overview";
    redirect(`/login?error=session_expired&next=${encodeURIComponent(nextTarget)}`);
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("role, status, college")
    .or(`user_id.eq.${user.id},id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ""}`)
    .maybeSingle();

  if (!profile) {
    try {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("profiles")
        .select("role, status, college")
        .or(`user_id.eq.${user.id},id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ""}`)
        .maybeSingle();
      if (data) profile = data as any;
    } catch (e) {
      console.warn("Institution layout: fallback profile fetch error", e);
    }
  }

  const userProfile = profile as any;
  if (userProfile?.status === "suspended") {
    redirect("/login?error=suspended");
  }

  const role = (
    userProfile?.role ||
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    ""
  ).toLowerCase();

  const isAllowed =
    role === "institution" ||
    role === "admin" ||
    role === "super_admin";

  if (!isAllowed) {
    if (role === "trainer") {
      redirect("/trainer/dashboard");
    } else {
      redirect("/student/dashboard");
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground flex flex-col">
      <InstitutionTopNav />
      <main className="pt-[88px] lms-page-container pb-12 flex-1 animate-fade-up">
        {children}
      </main>
    </div>
  );
}

