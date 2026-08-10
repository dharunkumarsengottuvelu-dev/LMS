import { StudentLayoutWrapper } from "@/components/layouts/student-layout-wrapper";
import { LMSProvider } from "@/lib/store/lms-store";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s | EduNexus", default: "Student Portal — EduNexus" },
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/auth/login");
  const profileData = profile as { role: string; status: string };
  if (profileData.status === "suspended") redirect("/auth/login?error=suspended");

  return (
    <LMSProvider>
      <StudentLayoutWrapper>{children}</StudentLayoutWrapper>
    </LMSProvider>
  );
}
