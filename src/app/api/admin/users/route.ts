import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminSession } from "@/app/api/admin/_auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin", "trainer"]);
    if (auth.errorResponse) return auth.errorResponse;
    const adminClient = auth.adminClient!;

    // 1 & 2. Concurrently fetch profiles and auth users to eliminate waterfall
    const [profRes, authDataRes] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, role, status, avatar_url, batch_id, batch, batch_name, created_at, updated_at")
        .order("created_at", { ascending: false }),
      adminClient.auth.admin.listUsers({ perPage: 1000 }).catch((e) => {
        console.warn("Could not list auth users:", e);
        return { data: { users: [] } };
      }),
    ]);

    const profiles = profRes.data || [];
    const authUsers = (authDataRes as any)?.data?.users || [];

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
            : metaRole === "admin"
            ? "admin"
            : metaRole === "trainer"
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

    // 3.5. Fetch batches and batch_members to accurately resolve student batch names
    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, code");

    const batchNameMap = new Map<string, string>();
    (batchesData || []).forEach((b: any) => {
      const bName = b.name || b.batch_name || b.code || `Batch #${b.id}`;
      batchNameMap.set(String(b.id), bName);
    });

    const { data: batchMembersData } = await adminClient
      .from("batch_members")
      .select("batch_id, user_id");

    const userAssignedBatchesMap = new Map<string, string[]>();
    (batchMembersData || []).forEach((bm: any) => {
      if (!bm.user_id || !bm.batch_id) return;
      const bName = batchNameMap.get(String(bm.batch_id)) || String(bm.batch_id);
      const existing = userAssignedBatchesMap.get(bm.user_id) || [];
      if (!existing.includes(bName)) {
        existing.push(bName);
      }
      userAssignedBatchesMap.set(bm.user_id, existing);
    });

    // 4. Return formatted users list with resolved batches
    const mappedUsers = mergedUsers.map((p: any) => {
      const first = p.first_name || "";
      const last = p.last_name || "";
      const fullName = (first || last) ? `${first} ${last}`.trim() : (p.email?.split("@")[0] || "User");
      const role = p.role || "student";
      const isStudent = role === "student";
      const isInstitution = role === "institution";

      // Authoritative batch resolution:
      const directMemberships = [
        ...(userAssignedBatchesMap.get(p.id) || []),
        ...(userAssignedBatchesMap.get(p.user_id) || []),
      ];

      let resolvedBatch: string | undefined = undefined;
      if (directMemberships.length > 0) {
        resolvedBatch = Array.from(new Set(directMemberships)).join(", ");
      } else if (p.batch_name && p.batch_name.trim() && p.batch_name.trim().toLowerCase() !== "null" && p.batch_name.trim().toLowerCase() !== "undefined") {
        resolvedBatch = p.batch_name.trim();
      } else if (p.batch && p.batch.trim() && p.batch.trim().toLowerCase() !== "null" && p.batch.trim().toLowerCase() !== "undefined") {
        resolvedBatch = p.batch.trim();
      } else if (p.batch_id && batchNameMap.has(String(p.batch_id))) {
        resolvedBatch = batchNameMap.get(String(p.batch_id));
      } else if (p.batch_id && p.batch_id.trim() && p.batch_id.trim().toLowerCase() !== "null") {
        resolvedBatch = p.batch_id.trim();
      }

      // If resolvedBatch is explicitly "Unassigned" or empty, normalize it:
      const finalBatch = (resolvedBatch && resolvedBatch.toLowerCase() !== "unassigned")
        ? resolvedBatch
        : (isStudent ? "Unassigned" : undefined);

      return {
        id: p.id || p.user_id,
        user_id: p.user_id || p.id,
        name: fullName,
        email: p.email || "",
        role: role,
        status: p.status || "active",
        joined: p.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        type: isStudent ? "student" : isInstitution ? "institution" : "employee",
        department: p.department || (role === "trainer" ? "Training & Instruction" : role === "admin" ? "Administration" : undefined),
        batch: finalBatch,
        batch_id: p.batch_id || undefined,
        college: p.college || undefined,
        branch: p.branch || undefined,
        phone: p.phone || undefined,
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
    const auth = await authenticateAdminSession(["super_admin", "admin", "trainer"]);
    if (auth.errorResponse) return auth.errorResponse;
    const adminClient = auth.adminClient!;

    const body = await request.json();
    const { name, email, password, role, batch_id, department, college, branch, phone } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const nameParts = (name || "").trim().split(" ");
    const firstName = nameParts[0] || email.split("@")[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || "";
    const userRole = role || "student";

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: password || "Sensilearn@2026",
      email_confirm: true,
      user_metadata: {
        full_name: name,
        first_name: firstName,
        last_name: lastName,
        role: userRole,
        college: college || (userRole === "institution" ? (name || "Partner Institution") : undefined),
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
        college: college || (userRole === "institution" ? (name || "Partner Institution") : null),
        branch: branch || null,
        phone: phone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();

    if (profError) {
      console.error("Profile upsert error:", profError);
    }

    // If student and batch provided, also link in batch_members table
    let resolvedBatchName = batch_id;
    if (userRole === "student" && batch_id && batch_id.trim() && batch_id !== "Unassigned") {
      try {
        const trimmedBatch = batch_id.trim();
        let { data: targetBatch } = await adminClient
          .from("batches")
          .select("id, name, batch_name")
          .or(`id.eq."${trimmedBatch}",name.ilike."${trimmedBatch}",batch_name.ilike."${trimmedBatch}"`)
          .maybeSingle();

        if (!targetBatch) {
          const { data: newBatch } = await adminClient
            .from("batches")
            .insert([{
              name: trimmedBatch,
              batch_name: trimmedBatch,
              code: `BAT-${Date.now().toString().slice(-4)}`,
              status: "active",
            }])
            .select()
            .single();
          targetBatch = newBatch;
        }

        if (targetBatch) {
          resolvedBatchName = targetBatch.name || targetBatch.batch_name || trimmedBatch;
          const authUserId = profile?.user_id || authUser?.user?.id || profile?.id;
          if (authUserId) {
            await adminClient.from("batch_members").upsert(
              [{ batch_id: targetBatch.id, user_id: authUserId }],
              { onConflict: "batch_id,user_id" }
            );
            await adminClient.from("profiles").update({
              batch_id: targetBatch.id,
              batch_name: resolvedBatchName,
              batch: resolvedBatchName,
            }).eq("id", profile?.id || authUserId);
          }
        }
      } catch (bErr) {
        console.warn("Notice: Error syncing batch_members on create:", bErr);
      }
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
        type: userRole === "student" ? "student" : userRole === "institution" ? "institution" : "employee",
        batch: resolvedBatchName || (userRole === "student" ? "Unassigned" : undefined),
        department,
        college: college || (userRole === "institution" ? (name || "Partner Institution") : undefined),
        branch,
        phone,
      },
    });
  } catch (error: any) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin", "trainer"]);
    if (auth.errorResponse) return auth.errorResponse;
    const adminClient = auth.adminClient!;

    const body = await request.json();
    const { id, name, email, role, batch_id, batch, department, college, branch, phone } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // 1. Get existing profile
    const { data: existingProfile, error: fetchErr } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existingProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const nameParts = (name || "").trim().split(" ");
    const firstName = nameParts[0] || existingProfile.first_name || "User";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : (existingProfile.last_name || "");
    const userRole = role || existingProfile.role || "student";
    const studentUserId = existingProfile.user_id || existingProfile.id;

    // 2. Resolve batch assignment if student
    const selectedBatch = (batch_id || batch || "").trim();
    let resolvedBatchName = selectedBatch;
    let resolvedBatchId: string | null = null;

    if (userRole === "student") {
      if (!selectedBatch || selectedBatch.toLowerCase() === "unassigned" || selectedBatch === "no_batches") {
        // Unassign batch
        resolvedBatchName = "Unassigned";
        resolvedBatchId = null;
        if (studentUserId) {
          await adminClient.from("batch_members").delete().eq("user_id", studentUserId);
        }
      } else {
        // Find or create the batch
        let { data: targetBatch } = await adminClient
          .from("batches")
          .select("id, name, batch_name")
          .or(`id.eq."${selectedBatch}",name.ilike."${selectedBatch}",batch_name.ilike."${selectedBatch}"`)
          .maybeSingle();

        if (!targetBatch) {
          const { data: newBatch } = await adminClient
            .from("batches")
            .insert([{
              name: selectedBatch,
              batch_name: selectedBatch,
              code: `BAT-${Date.now().toString().slice(-4)}`,
              status: "active",
            }])
            .select()
            .single();
          targetBatch = newBatch;
        }

        if (targetBatch) {
          resolvedBatchId = targetBatch.id;
          resolvedBatchName = targetBatch.name || targetBatch.batch_name || selectedBatch;

          if (studentUserId) {
            await adminClient.from("batch_members").upsert(
              [{ batch_id: targetBatch.id, user_id: studentUserId }],
              { onConflict: "batch_id,user_id" }
            );
          }
        }
      }
    }

    // 3. Update public.profiles
    const updatePayload: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      role: userRole,
      department: userRole === "employee" ? department || "General" : null,
      batch_id: userRole === "student" ? resolvedBatchId : null,
      batch_name: userRole === "student" ? (resolvedBatchName !== "Unassigned" ? resolvedBatchName : null) : null,
      batch: userRole === "student" ? (resolvedBatchName !== "Unassigned" ? resolvedBatchName : null) : null,
      college: userRole === "institution" ? (college || name) : null,
      branch: userRole === "institution" ? (branch || null) : null,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    };

    if (email && email.trim()) {
      updatePayload.email = email.trim().toLowerCase();
    }

    const { data: updatedProfile, error: updateErr } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) {
      console.error("Error updating profile:", updateErr);
      return NextResponse.json({ error: updateErr.message || "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedProfile.id,
        user_id: updatedProfile.user_id || updatedProfile.id,
        name: `${firstName} ${lastName}`.trim(),
        email: updatedProfile.email,
        role: updatedProfile.role,
        status: updatedProfile.status || "active",
        joined: updatedProfile.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        type: userRole === "student" ? "student" : userRole === "institution" ? "institution" : "employee",
        batch: userRole === "student" ? (resolvedBatchName || "Unassigned") : undefined,
        batch_id: resolvedBatchId || undefined,
        department: updatedProfile.department,
        college: updatedProfile.college,
        branch: updatedProfile.branch,
        phone: updatedProfile.phone,
      },
    });
  } catch (error: any) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin"]);
    if (auth.errorResponse) return auth.errorResponse;
    const adminClient = auth.adminClient!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

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
