import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { first_name, last_name, email, password } = body;

    if (!email || !password || !first_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Check if user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      // User exists, update password and confirm email automatically
      userId = existingUser.id;
      await admin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: { first_name, last_name, role: "student" },
      });
    } else {
      // Create user with email_confirm: true
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { first_name, last_name, role: "student" },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      userId = newUser.user.id;
    }

    // 2. Auto-upsert profile
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        user_id: userId,
        first_name: first_name,
        last_name: last_name || "",
        role: "student",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error("Profile upsert warning:", profileError);
    }

    return NextResponse.json({
      success: true,
      message: "Account created and confirmed",
      userId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
