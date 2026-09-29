import { AdminTopNav } from "@/components/layouts/admin-top-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s | Enterprise Admin", default: "Enterprise Admin — FALCON" },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/dashboard");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = profileData as { role?: string; status?: string } | null;
  if (profile?.status === "suspended") {
    redirect("/login?error=suspended");
  }

  const role = (profile?.role || user.user_metadata?.role || user.app_metadata?.role || "").toLowerCase();
  const email = (user.email || "").toLowerCase();
  const isAdmin = role === "admin" || role === "super_admin" || role === "founder" || role === "ceo" || email.includes("admin");

  if (!isAdmin) {
    if (role === "trainer" || email.includes("trainer")) {
      redirect("/trainer/dashboard");
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
