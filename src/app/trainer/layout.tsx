import { TrainerTopNav } from "@/components/layouts/trainer-top-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s | Trainer — FALCON", default: "Trainer — FALCON" },
};

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const profile = profileData as { role?: string; status?: string } | null;
    if (profile?.status === "suspended") {
      redirect("/login?error=suspended");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TrainerTopNav />
      <main className="pt-[88px] w-full px-4 sm:px-6 lg:px-8 pb-12 animate-fade-up">
        {children}
      </main>
    </div>
  );
}
