import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InstitutionTopNav } from "@/components/layouts/institution-top-nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Institution Performance Portal",
    default: "Institution Performance Portal — FALCON LMS",
  },
  description: "Enterprise Academic & Learner Performance Portal for Partner Institutions.",
};

export default async function InstitutionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    redirect("/login?next=/institution/overview");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, college")
    .eq("user_id", user.id)
    .maybeSingle();

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
    role === "super_admin" ||
    user.email?.toLowerCase().includes("admin") ||
    user.email?.toLowerCase().includes("institution");

  if (!isAllowed) {
    if (role === "trainer" || user.email?.toLowerCase().includes("trainer")) {
      redirect("/trainer/dashboard");
    } else {
      redirect("/student/dashboard");
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground flex flex-col">
      <InstitutionTopNav />
      <main className="pt-[76px] md:pt-[84px] lms-page-container pb-16 flex-1 animate-fade-up">
        {children}
      </main>
    </div>
  );
}
