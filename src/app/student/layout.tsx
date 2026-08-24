import { StudentLayoutWrapper } from "@/components/layouts/student-layout-wrapper";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s | FALCON", default: "Student Portal — FALCON" },
};

import { SessionTimeout } from "@/components/providers/session-timeout";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileData = profile as { role?: string; status?: string } | null;
    if (profileData?.status === "suspended") redirect("/login?error=suspended");
  }

  return (
    <SessionTimeout>
      <StudentLayoutWrapper>{children}</StudentLayoutWrapper>
    </SessionTimeout>
  );
}
