import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { authenticateAdminSession } from "../_auth";

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch profiles where role = 'institution'
    const { data: instProfiles, error: pErr } = await adminClient
      .from("profiles")
      .select("*")
      .eq("role", "institution")
      .order("created_at", { ascending: false });

    if (pErr) {
      console.error("Error fetching institution profiles:", pErr);
    }

    // 2. Also fetch from institutions table if populated
    const { data: dedicatedInstitutions } = await adminClient
      .from("institutions")
      .select("*")
      .order("created_at", { ascending: false });

    // 3. Fetch all batches to calculate count of assigned cohorts per college
    const { data: batches } = await adminClient
      .from("batches")
      .select("id, name, description");

    const batchCountByCollege = new Map<string, number>();
    (batches || []).forEach((b: any) => {
      let collegeName = "";
      try {
        if (b.description && b.description.startsWith("{")) {
          const meta = JSON.parse(b.description);
          collegeName = meta.collegeName || meta.college_name || "";
        }
      } catch {}

      if (collegeName) {
        const cLower = collegeName.trim().toLowerCase();
        batchCountByCollege.set(cLower, (batchCountByCollege.get(cLower) || 0) + 1);
      }
    });

    const seenIds = new Set<string>();
    const institutions: any[] = [];

    // Map profiles
    (instProfiles || []).forEach((p: any) => {
      seenIds.add(p.id);
      if (p.user_id) seenIds.add(p.user_id);

      const college = p.college || p.first_name || "Institution";
      const collegeLower = college.trim().toLowerCase();
      const code = p.branch || p.code || (college ? college.slice(0, 6).toUpperCase() : "INST");
      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || college || "Partner Institution";

      institutions.push({
        id: p.id,
        userId: p.user_id || p.id,
        name,
        college,
        code,
        email: p.email,
        phone: p.phone || "",
        batchCount: batchCountByCollege.get(collegeLower) || 0,
        createdAt: p.created_at,
      });
    });

    // Merge dedicated institutions table records if not already added
    (dedicatedInstitutions || []).forEach((inst: any) => {
      if (!seenIds.has(inst.id)) {
        seenIds.add(inst.id);
        const collegeLower = (inst.name || "").trim().toLowerCase();
        institutions.push({
          id: inst.id,
          userId: inst.id,
          name: inst.name,
          college: inst.name,
          code: inst.code,
          email: inst.contact_email || "",
          phone: inst.contact_phone || "",
          batchCount: batchCountByCollege.get(collegeLower) || 0,
          createdAt: inst.created_at,
        });
      }
    });

    return NextResponse.json({ institutions });
  } catch (error) {
    console.error("GET /api/admin/institutions error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin"]);
    if (auth.errorResponse) return auth.errorResponse;

    const { adminClient } = auth;
    if (!adminClient) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    const body = await request.json();
    const name = (body.name || body.college || "").trim();
    const email = (body.email || body.contactEmail || "").trim().toLowerCase();

    if (!name) {
      return NextResponse.json({ error: "Institution name is required" }, { status: 400 });
    }

    const code = (body.code || name.replace(/[^A-Za-z0-9]/g, "").slice(0, 8)).toUpperCase();

    // 1. Insert/upsert into institutions table
    const { data: instData, error: instErr } = await adminClient
      .from("institutions")
      .upsert({
        name,
        code,
        contact_email: email || null,
        contact_phone: body.phone || null,
        address: body.address || null,
        website: body.website || null,
        status: body.status || "active",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (instErr) {
      console.warn("Could not insert into institutions table, falling back to profiles only:", instErr);
    }

    // 2. Also ensure a profile with role='institution' exists
    const profilePayload: any = {
      first_name: name,
      last_name: "Institution",
      email: email || `${code.toLowerCase()}@institution.lms`,
      role: "institution",
      college: name,
      branch: code,
      phone: body.phone || null,
      status: body.status || "active",
      updated_at: new Date().toISOString(),
    };

    if (instData?.id) {
      profilePayload.institution_id = instData.id;
    }

    const { data: profData, error: profErr } = await adminClient
      .from("profiles")
      .insert(profilePayload)
      .select()
      .single();

    if (profErr) {
      console.warn("Could not insert into profiles table:", profErr);
    }

    return NextResponse.json({
      success: true,
      institution: instData || profData || { name, code, email },
    });
  } catch (error) {
    console.error("POST /api/admin/institutions error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin"]);
    if (auth.errorResponse) return auth.errorResponse;

    const { adminClient } = auth;
    if (!adminClient) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing institution ID" }, { status: 400 });
    }

    // Attempt delete from both tables
    await adminClient.from("institutions").delete().eq("id", id);
    await adminClient.from("profiles").delete().eq("id", id);

    return NextResponse.json({ success: true, message: "Institution deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/institutions error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
