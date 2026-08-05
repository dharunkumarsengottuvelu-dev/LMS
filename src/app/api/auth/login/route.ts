import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find user by email
    const { data: usersData } = await admin.auth.admin.listUsers();
    const user = usersData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      // Auto confirm email if not confirmed yet
      if (!user.email_confirmed_at) {
        await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
      }

      // Ensure profile exists in profiles table
      const { data: profile } = await admin.from("profiles").select("id, role").eq("user_id", user.id).single();
      if (!profile) {
        await admin.from("profiles").insert({
          user_id: user.id,
          first_name: user.user_metadata?.first_name || "User",
          last_name: user.user_metadata?.last_name || "",
          role: user.user_metadata?.role || "student",
          status: "active",
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
