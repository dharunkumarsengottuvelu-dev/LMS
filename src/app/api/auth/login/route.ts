import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const admin = createAdminClient();

    // Fast path: Targeted indexed profile lookup by email (< 20ms)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, user_id, role, status, first_name, last_name")
      .eq("email", lowerEmail)
      .maybeSingle();

    if (existingProfile && existingProfile.user_id) {
      const effectiveRole = existingProfile.role || "student";

      // Non-blocking background email confirmation check if needed
      admin.auth.admin.getUserById(existingProfile.user_id).then(({ data }) => {
        if (data?.user && !data.user.email_confirmed_at) {
          admin.auth.admin.updateUserById(existingProfile.user_id, { email_confirm: true }).catch(() => {});
        }
      }).catch(() => {});

      return NextResponse.json({ success: true, role: effectiveRole });
    }

    // Fallback path: If profile not created yet, check auth user directly
    const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    const existingUser = usersData?.users?.find((u) => u.email?.toLowerCase() === lowerEmail);

    if (existingUser) {
      if (!existingUser.email_confirmed_at) {
        await admin.auth.admin.updateUserById(existingUser.id, { email_confirm: true });
      }

      const userMetadataRole = (existingUser.user_metadata?.role as string) || (existingUser.app_metadata?.role as string) || "";
      const effectiveRole = userMetadataRole || "student";

      await admin.from("profiles").upsert({
        user_id: existingUser.id,
        first_name: existingUser.user_metadata?.first_name || lowerEmail.split("@")[0],
        last_name: existingUser.user_metadata?.last_name || "",
        email: lowerEmail,
        role: effectiveRole,
        status: "active",
      }, { onConflict: "user_id" });

      return NextResponse.json({ success: true, role: effectiveRole });
    } else {
      return NextResponse.json({ error: "Account not found. Please register first." }, { status: 404 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
