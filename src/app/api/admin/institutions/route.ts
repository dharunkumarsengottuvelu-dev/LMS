import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

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
      throw pErr;
    }

    // 2. Fetch all batches to calculate count of assigned cohorts per college
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

    const institutions = (instProfiles || []).map((p: any) => {
      const college = p.college || p.first_name || "Institution";
      const collegeLower = college.trim().toLowerCase();
      const code = p.branch || p.code || (college ? college.slice(0, 6).toUpperCase() : "INST");
      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || college || "Partner Institution";

      return {
        id: p.id,
        userId: p.user_id || p.id,
        name,
        college,
        code,
        email: p.email,
        phone: p.phone || "",
        batchCount: batchCountByCollege.get(collegeLower) || 0,
        createdAt: p.created_at,
      };
    });

    return NextResponse.json({ institutions });
  } catch (error) {
    console.error("GET /api/admin/institutions error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
