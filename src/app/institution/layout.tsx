import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    redirect("/login?error=session_expired&next=/institution/overview");
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

  const email = (user.email || "").toLowerCase();
  const [localPart = ""] = email.split("@");

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
