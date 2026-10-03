import { StudentLayoutWrapper } from "@/components/layouts/student-layout-wrapper";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SessionTimeout } from "@/components/providers/session-timeout";

export const metadata: Metadata = {
  title: { template: "%s | SensiLearn", default: "Student Portal — SensiLearn" },
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  console.log(`[AUTH] Student layout user exists = ${Boolean(user)}`);

  if (!user) {
    redirect("/login?error=session_expired&next=/student/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileData = profile as { role?: string; status?: string } | null;
  if (profileData?.status === "suspended") {
    console.log("STUDENT LAYOUT: user suspended, redirecting");
    redirect("/login?error=suspended");
  }

  const role = (profileData?.role || user.user_metadata?.role || user.app_metadata?.role || "").toLowerCase();
  const email = (user.email || "").toLowerCase();
  const [localPart = ""] = email.split("@");

  const isAdmin =
    role === "admin" ||
    role === "super_admin" ||
    role === "founder" ||
    role === "ceo";

  const isTrainer = role === "trainer";
  const isInstitution = role === "institution";

  if (isAdmin) {
    console.log("STUDENT LAYOUT: isAdmin, redirecting to admin dashboard");
    redirect("/admin/dashboard");
  } else if (isTrainer) {
    console.log("STUDENT LAYOUT: isTrainer, redirecting to trainer dashboard");
    redirect("/trainer/dashboard");
  } else if (isInstitution) {
    console.log("STUDENT LAYOUT: isInstitution, redirecting to institution overview");
    redirect("/institution/overview");
  }

  return (
    <SessionTimeout>
      <StudentLayoutWrapper>{children}</StudentLayoutWrapper>
    </SessionTimeout>
  );
}
