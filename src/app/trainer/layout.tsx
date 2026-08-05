import { TrainerSidebar } from "@/components/layouts/trainer-sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s | Trainer — EduNexus", default: "Trainer — EduNexus" },
};

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/unauthorized");
  const profileData = profile as { role: string; status: string };
  if (!["admin", "trainer"].includes(profileData.role)) redirect("/unauthorized");
  if (profileData.status === "suspended") redirect("/auth/login?error=suspended");

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B]">
      <TrainerSidebar />
      <main className="lg:ml-[280px] min-h-screen">
        <div className="max-w-[1440px] mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
