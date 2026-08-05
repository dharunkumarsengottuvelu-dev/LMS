import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { AdminTopNav } from "@/components/layouts/admin-top-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s | Enterprise Admin", default: "Enterprise Admin — EduNexus" },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  const profile = profileData as { role?: string; status?: string } | null;

  if (!profile || profile.role !== "admin") {
    redirect("/unauthorized");
  }

  if (profile.status === "suspended") {
    redirect("/auth/login?error=suspended");
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B]">
      <AdminSidebar />
      <AdminTopNav />
      <main className="lg:ml-[280px] pt-[72px] min-h-screen">
        <div className="max-w-[1440px] mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
