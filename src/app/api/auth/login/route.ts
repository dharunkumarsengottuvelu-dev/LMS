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
    const determinedRole = lowerEmail.includes("admin")
      ? "admin"
      : lowerEmail.includes("trainer")
      ? "trainer"
      : "student";

    const admin = createAdminClient();

    // Find user by email across any domain
    const { data: usersData } = await admin.auth.admin.listUsers();
    const existingUser = usersData?.users?.find((u) => u.email?.toLowerCase() === lowerEmail);

    if (existingUser) {
      // Auto confirm email if unconfirmed
      if (!existingUser.email_confirmed_at) {
        await admin.auth.admin.updateUserById(existingUser.id, { email_confirm: true });
      }

      // Ensure profile exists in profiles table with correct role
      const { data: profile } = await admin.from("profiles").select("id, role").eq("user_id", existingUser.id).maybeSingle();
      if (!profile) {
        await admin.from("profiles").insert({
          user_id: existingUser.id,
          first_name: existingUser.user_metadata?.first_name || lowerEmail.split("@")[0],
          last_name: "",
          role: determinedRole,
          status: "active",
        });
      } else if (profile.role !== determinedRole) {
        // Update role if user is logging into a role-specific account
        await admin.from("profiles").update({ role: determinedRole }).eq("user_id", existingUser.id);
      }
    } else {
      // Auto-register user seamlessly with role matching email
      const { data: newUser } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: lowerEmail.split("@")[0],
          last_name: "",
          role: determinedRole,
        },
      });

      if (newUser?.user) {
        await admin.from("profiles").insert({
          user_id: newUser.user.id,
          first_name: lowerEmail.split("@")[0],
          last_name: "",
          role: determinedRole,
          status: "active",
        });
      }
    }

    return NextResponse.json({ success: true, role: determinedRole });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
