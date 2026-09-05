import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Resolve current user's profile and role
    const { data: myProfile } = await adminClient
      .from("profiles")
      .select("id, user_id, role, email")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    const myRole = (myProfile?.role || "student").toLowerCase();
    const isStudent = !["admin", "super_admin", "trainer"].includes(myRole);
    const myId = myProfile?.id || user.id;

    let formattedRecipients: any[] = [];
    let activeBatches: any[] = [];

    if (isStudent) {
      // Students see all admins + trainers
      const { data: staffProfiles, error: staffErr } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role, avatar_url")
        .neq("id", myId)
        .order("first_name", { ascending: true })
        .limit(200);

      if (staffErr) {
        console.error("Error fetching staff profiles:", staffErr);
      }

      const filteredStaff = (staffProfiles || []).filter((p: any) => {
        const r = (p.role || "").toLowerCase();
        return ["admin", "super_admin", "trainer"].includes(r);
      });

      // Also fetch from Supabase auth users list as fallback (admins who may not have profiles)
      let authAdmins: any[] = [];
      try {
        const { data: allAuthUsers } = await adminClient.auth.admin.listUsers({ perPage: 200 });
        authAdmins = (allAuthUsers?.users || []).filter((u) => {
          const meta = u.user_metadata || {};
          const appMeta = u.app_metadata || {};
          const role = (meta.role || appMeta.role || "").toLowerCase();
          return (
            u.id !== user.id &&
            (role === "admin" ||
              role === "super_admin" ||
              role === "trainer" ||
              u.email?.toLowerCase().includes("admin") ||
              u.email?.toLowerCase().includes("trainer"))
          );
        });
      } catch (authErr) {
        console.warn("Could not list auth users fallback:", authErr);
      }

      const knownIds = new Set([
        ...filteredStaff.map((p: any) => p.id),
        ...filteredStaff.map((p: any) => p.user_id).filter(Boolean),
      ]);

      formattedRecipients = [
        ...filteredStaff.map((r: any) => {
          const rawName = `${r.first_name || ""} ${r.last_name || ""}`.trim();
          let displayName = rawName || r.email?.split("@")[0] || "Staff";
          if (r.role?.toLowerCase() === "admin" && displayName.toLowerCase() === "super") {
            displayName = "Super Admin";
          }
          return {
            id: r.id,
            user_id: r.user_id,
            name: displayName,
            email: r.email || "",
            role: (r.role || "admin").toLowerCase(),
            avatar_url: r.avatar_url || null,
          };
        }),
        ...authAdmins
          .filter((u) => !knownIds.has(u.id))
          .map((u) => {
            const meta = u.user_metadata || {};
            const appMeta = u.app_metadata || {};
            const role = (meta.role || appMeta.role || "admin").toLowerCase();
            const rawName =
              meta.full_name ||
              `${meta.first_name || ""} ${meta.last_name || ""}`.trim() ||
              u.email?.split("@")[0] ||
              "Admin";
            let displayName = rawName;
            if (role === "admin" && displayName.toLowerCase() === "super") {
              displayName = "Super Admin";
            }
            return {
              id: u.id,
              user_id: u.id,
              name: displayName,
              email: u.email || "",
              role,
              avatar_url: meta.avatar_url || null,
            };
          }),
      ];
    } else {
      // Admins / trainers see all students from database
      const [studentsRes, batchesRes, batchMembersRes] = await Promise.all([
        adminClient
          .from("profiles")
          .select("id, user_id, first_name, last_name, email, role, avatar_url, batch_name, batch, batch_id")
          .neq("id", myId)
          .order("first_name", { ascending: true })
          .limit(500),
        adminClient
          .from("batches")
          .select("id, name, batch_name")
          .order("created_at", { ascending: false }),
        adminClient
          .from("batch_members")
          .select("batch_id, user_id"),
      ]);

      const allStudentProfiles = studentsRes.data;
      if (studentsRes.error) {
        console.error("Error fetching student profiles:", studentsRes.error);
      }

      const filteredStudents = (allStudentProfiles || []).filter((p: any) => {
        const r = (p.role || "").toLowerCase();
        return r === "student" || (!r && !["admin", "super_admin", "trainer"].includes(r));
      });

      const batchMap = new Map<string, string>();
      activeBatches = (batchesRes.data || []).map((b: any) => {
        const bName = b.name || b.batch_name || "Unnamed Batch";
        batchMap.set(b.id, bName);
        return { id: b.id, name: bName };
      });

      const memberToBatchMap = new Map<string, { batch_id: string; batch_name: string }>();
      (batchMembersRes.data || []).forEach((bm: any) => {
        const bName = batchMap.get(bm.batch_id);
        if (bName) {
          memberToBatchMap.set(bm.user_id, { batch_id: bm.batch_id, batch_name: bName });
        }
      });

      formattedRecipients = filteredStudents.map((r: any) => {
        const rawName = `${r.first_name || ""} ${r.last_name || ""}`.trim();
        const displayName = rawName || r.email?.split("@")[0] || "Student";
        const memberBatch = memberToBatchMap.get(r.id) || memberToBatchMap.get(r.user_id);
        const resolvedBatchId = memberBatch?.batch_id || r.batch_id || null;
        const resolvedBatchName =
          memberBatch?.batch_name ||
          (r.batch_id && batchMap.get(r.batch_id)) ||
          r.batch_name ||
          r.batch ||
          null;

        return {
          id: r.id,
          user_id: r.user_id,
          name: displayName,
          email: r.email || "",
          role: "student",
          avatar_url: r.avatar_url || null,
          batch: resolvedBatchName,
          batch_id: resolvedBatchId,
        };
      });
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = formattedRecipients.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    return NextResponse.json({
      success: true,
      recipients: unique,
      batches: activeBatches,
    });
  } catch (err: any) {
    console.error("GET /api/messages/recipients error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err), recipients: [], batches: [] },
      { status: 500 }
    );
  }
}
