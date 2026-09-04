import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    let user: any = null;
    try {
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();
      user = authData?.user || null;
    } catch {
      // ignore
    }

    if (user) {
      const { data: prof } = await adminClient
        .from("profiles")
        .select("role")
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();
      if (prof && prof.role === "student") {
        return NextResponse.json({ error: "Forbidden: Admin or Trainer authorization required" }, { status: 403 });
      }
    }

    // 1. Fetch all profiles from public.profiles
    const { data: profiles, error: profError } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profError) {
      console.error("Error fetching profiles:", profError);
    }

    // 2. Fetch all registered auth users from Supabase Auth
    let authUsers: any[] = [];
    try {
      const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      authUsers = authData?.users || [];
    } catch (e) {
      console.warn("Could not list auth users:", e);
    }

    const profileUserIdSet = new Set((profiles || []).map((p: any) => p.user_id));
    const mergedUsers: any[] = [...(profiles || [])];

    // 3. Auto-sync any auth user missing from profiles
    for (const au of authUsers) {
      if (!profileUserIdSet.has(au.id)) {
        const meta = au.user_metadata || {};
        const fullName = (meta.full_name || meta.name || "").trim();
        const nameParts = fullName.split(" ");
        const emailPrefix = au.email ? au.email.split("@")[0] : "User";
        const formattedEmailName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        const firstName = meta.first_name || nameParts[0] || formattedEmailName;
        const lastName = meta.last_name || nameParts.slice(1).join(" ") || "";
        const metaRole = (meta.role || "").toLowerCase();
        const role =
          metaRole === "super_admin"
            ? "super_admin"
            : metaRole === "admin" || au.email?.includes("admin")
            ? "admin"
            : metaRole === "trainer" || au.email?.includes("trainer")
            ? "trainer"
            : metaRole || "student";

        // Insert into profiles
        const newProfile = {
          user_id: au.id,
          first_name: firstName,
          last_name: lastName,
          email: au.email,
          role,
          status: "active",
          created_at: au.created_at || new Date().toISOString(),
          updated_at: au.updated_at || new Date().toISOString(),
        };

        const { data: inserted } = await adminClient
          .from("profiles")
          .insert(newProfile)
          .select("*")
          .maybeSingle();

        if (inserted) {
          mergedUsers.push(inserted);
        } else {
          mergedUsers.push({ ...newProfile, id: au.id });
        }
      }
    }

    // 4. Return formatted users list
    const mappedUsers = mergedUsers.map((p: any) => {
      const first = p.first_name || "";
      const last = p.last_name || "";
      const fullName = (first || last) ? `${first} ${last}`.trim() : (p.email?.split("@")[0] || "User");
      const role = p.role || (p.email?.includes("admin") ? "admin" : p.email?.includes("trainer") ? "trainer" : "student");
      const isStudent = role === "student";

      return {
        id: p.id || p.user_id,
        user_id: p.user_id || p.id,
        name: fullName,
        email: p.email || "",
        role: role,
        status: p.status || "active",
        joined: p.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        type: isStudent ? "student" : "employee",
        department: p.department || (role === "trainer" ? "Training & Instruction" : role === "admin" ? "Administration" : undefined),
        batch: p.batch_name || p.batch || p.batch_id || undefined,
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (error: any) {
    console.error("Admin users API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role, batch_id, department } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const nameParts = (name || "").trim().split(" ");
    const firstName = nameParts[0] || email.split("@")[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || "";
    const userRole = role || "student";

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: password || "Falcon@2026",
      email_confirm: true,
      user_metadata: {
        full_name: name,
        first_name: firstName,
        last_name: lastName,
        role: userRole,
      },
    });

    if (authError && !authError.message.includes("already registered")) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authUser?.user?.id || (await adminClient.from("profiles").select("id").eq("email", email).maybeSingle()).data?.id;

    // 2. Upsert profile in public.profiles
    const { data: profile, error: profError } = await adminClient
      .from("profiles")
      .upsert({
        user_id: authUser?.user?.id,
        first_name: firstName,
        last_name: lastName,
        email,
        role: userRole,
        status: "active",
        batch_id: userRole === "student" ? batch_id || null : null,
        batch_name: userRole === "student" ? batch_id || null : null,
        batch: userRole === "student" ? batch_id || null : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();

    if (profError) {
      console.error("Profile upsert error:", profError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile?.id || userId,
        name: `${firstName} ${lastName}`.trim(),
        email,
        role: userRole,
        status: "active",
        joined: new Date().toISOString().split("T")[0],
        type: userRole === "student" ? "student" : "employee",
        batch: batch_id,
        department,
      },
    });
  } catch (error: any) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Get user_id from profile
    const { data: prof } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    const authUserId = prof?.user_id || id;

    // Delete from profiles
    await adminClient.from("profiles").delete().or(`id.eq.${id},user_id.eq.${authUserId}`);

    // Delete from Auth if exists
    try {
      await adminClient.auth.admin.deleteUser(authUserId);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}
