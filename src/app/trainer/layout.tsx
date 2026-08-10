import { TrainerTopNav } from "@/components/layouts/trainer-top-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s | Trainer — EduNexus", default: "Trainer — EduNexus" },
};

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = profileData as { role?: string; status?: string } | null;
  const emailLower = user.email?.toLowerCase() || "";
  const isTrainer =
    profile?.role === "trainer" ||
    profile?.role === "admin" ||
    emailLower.includes("trainer") ||
    emailLower.includes("admin");

  if (!isTrainer) {
    redirect("/unauthorized");
  }

  if (profile?.status === "suspended") {
    redirect("/login?error=suspended");
  }

  return (
    <div className="min-h-screen bg-background">
      <TrainerTopNav />
      <main className="pt-[88px] max-w-[1440px] mx-auto px-6 md:px-8 pb-12 animate-fade-up">
        {children}
      </main>
    </div>
  );
}
