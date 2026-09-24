import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminSession } from "../_auth";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin", "trainer"]);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { adminClient } = auth;
    if (!adminClient) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const batchFilter = (searchParams.get("batch") || "").trim();
    const statusFilter = (searchParams.get("status") || "").trim();
    const sortField = searchParams.get("sort") || "created_at";
    const sortOrder = searchParams.get("order")?.toLowerCase() === "asc";

    // Whitelist sort fields to prevent unsafe queries
    const allowedSortFields = ["created_at", "first_name", "last_name", "email", "status"];
    const activeSortField = allowedSortFields.includes(sortField) ? sortField : "created_at";

    // 1. Fetch batches lookup to map batch_id to batch names
    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name");

    const batchMap = new Map<string, string>();
    (batchesData || []).forEach((b: any) => {
      const bName = b.name || b.batch_name || "Unnamed Batch";
      batchMap.set(b.id, bName);
    });

    // 2. Build profile query for students
    let query = adminClient
      .from("profiles")
      .select("*", { count: "exact" })
      .eq("role", "student");

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (batchFilter && batchFilter !== "all") {
      query = query.or(`batch_name.ilike.%${batchFilter}%,batch.ilike.%${batchFilter}%`);
    }

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,college.ilike.%${search}%,branch.ilike.%${search}%`
      );
    }

    // Range for pagination
    const offset = (page - 1) * limit;
    query = query
      .order(activeSortField, { ascending: sortOrder })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("GET /api/admin/students error:", error);
      throw error;
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const students = (data || []).map((s: any, idx: number) => {
      const resolvedBatch =
        s.batch_name ||
        s.batch ||
        (s.batch_id ? batchMap.get(s.batch_id) : null) ||
        "Not Assigned";

      const name = `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email?.split("@")[0] || "Student";
      const studentId = s.id ? `EMP-${s.id.substring(0, 8)}` : `STU-${offset + idx + 1}`;

      return {
        id: s.id,
        employeeId: studentId,
        name,
        firstName: s.first_name || "",
        lastName: s.last_name || "",
        email: s.email || "",
        department: s.department || "Engineering",
        designation: s.designation || "Student",
        techTrack: s.tech_track || s.branch || "Computer Science",
        college: s.college || "",
        branch: s.branch || "",
        role: "student",
        status: s.status || "active",
        avgScore: s.avg_score || 0,
        mcqAccuracy: s.mcq_accuracy || 0,
        codingAccuracy: s.coding_accuracy || 0,
        proctoringCompliance: s.proctoring_compliance || 100,
        violationCount: s.violation_count || 0,
        joinedDate: s.created_at ? s.created_at.slice(0, 10) : "",
        batchId: s.batch_id || undefined,
        batch: resolvedBatch,
        skills: s.skills || [],
        githubUrl: s.github || s.github_url || "",
        linkedinUrl: s.linkedin || s.linkedin_url || "",
      };
    });

    return NextResponse.json({
      success: true,
      data: students,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/admin/students error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
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
    const email = (body.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const firstName = (body.firstName || body.name?.split(" ")[0] || "Student").trim();
    const lastName = (body.lastName || body.name?.split(" ").slice(1).join(" ") || "").trim();

    const payload: any = {
      first_name: firstName,
      last_name: lastName,
      email,
      role: "student",
      status: body.status || "active",
      batch_name: body.batch || body.batchName || null,
      batch: body.batch || body.batchName || null,
      college: body.college || null,
      branch: body.branch || null,
      updated_at: new Date().toISOString(),
    };

    if (body.batchId) {
      payload.batch_id = body.batchId;
    }

    // Check if profile exists by email
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await adminClient
        .from("profiles")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      payload.created_at = new Date().toISOString();
      const { data, error } = await adminClient
        .from("profiles")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, student: result });
  } catch (error) {
    console.error("POST /api/admin/students error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminSession(["super_admin", "admin"]);
    if (auth.errorResponse) return auth.errorResponse;

    const { adminClient } = auth;
    if (!adminClient) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Student ID required." }, { status: 400 });
    }

    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.firstName !== undefined) payload.first_name = updates.firstName;
    if (updates.lastName !== undefined) payload.last_name = updates.lastName;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.batch !== undefined) {
      payload.batch = updates.batch;
      payload.batch_name = updates.batch;
    }
    if (updates.batchId !== undefined) payload.batch_id = updates.batchId;
    if (updates.college !== undefined) payload.college = updates.college;
    if (updates.branch !== undefined) payload.branch = updates.branch;

    const { data, error } = await adminClient
      .from("profiles")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, student: data });
  } catch (error) {
    console.error("PATCH /api/admin/students error:", error);
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
      return NextResponse.json({ error: "Missing student ID." }, { status: 400 });
    }

    const { error } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/students error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
