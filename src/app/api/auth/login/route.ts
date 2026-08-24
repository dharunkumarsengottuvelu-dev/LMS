import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase();
    const admin = createAdminClient();

    // Find user by email across any domain
    const { data: usersData } = await admin.auth.admin.listUsers();
    const existingUser = usersData?.users?.find((u) => u.email?.toLowerCase() === lowerEmail);

    if (existingUser) {
      // Auto confirm email if unconfirmed
      if (!existingUser.email_confirmed_at) {
        await admin.auth.admin.updateUserById(existingUser.id, { email_confirm: true });
      }

      // Check existing profile
      const { data: profile } = await admin
        .from("profiles")
        .select("id, role")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      const userMetadataRole = (existingUser.user_metadata?.role as string) || (existingUser.app_metadata?.role as string) || "";
      const isEmailAdmin = lowerEmail.includes("admin");
      const isEmailTrainer = lowerEmail.includes("trainer");

      let effectiveRole = profile?.role || userMetadataRole;

      if (!effectiveRole) {
        effectiveRole = isEmailAdmin ? "admin" : isEmailTrainer ? "trainer" : "student";
      } else if (effectiveRole === "student" && isEmailAdmin) {
        effectiveRole = "admin";
      } else if (effectiveRole === "student" && isEmailTrainer) {
        effectiveRole = "trainer";
      }

      if (!profile) {
        await admin.from("profiles").insert({
          user_id: existingUser.id,
          first_name: existingUser.user_metadata?.first_name || lowerEmail.split("@")[0],
          last_name: existingUser.user_metadata?.last_name || "",
          email: lowerEmail,
          role: effectiveRole,
          status: "active",
        });
      } else if (profile.role === "student" && (isEmailAdmin || isEmailTrainer)) {
        await admin.from("profiles").update({ role: effectiveRole }).eq("user_id", existingUser.id);
      }

      return NextResponse.json({ success: true, role: effectiveRole });
    } else {
      return NextResponse.json({ error: "Account not found. Please register first." }, { status: 404 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
