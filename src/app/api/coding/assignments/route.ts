import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CodingAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  problemIds: string[];
  trainerName: string;
  maxScore: number;
  assignedCohort: string;
  status: "pending" | "in_progress" | "completed";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminClient = createAdminClient();

    // Query assignments tagged with coding or all active assignments
    const { data: rows, error } = await adminClient
      .from("assignments")
      .select("*, profiles:created_by(first_name, last_name)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        assignments: [],
      });
    }

    const assignments: CodingAssignment[] = rows.map((a: any) => {
      const trainer = a.profiles
        ? `${a.profiles.first_name || ""} ${a.profiles.last_name || ""}`.trim() || "Lead Trainer"
        : "Lead Trainer";

      // Tags can store problem slugs/ids
      const problemIds = (a.tags || []).filter((t: string) => t !== "coding");

      return {
        id: a.id,
        title: a.title,
        description: a.description || "",
        dueDate: a.due_date || a.created_at,
        problemIds,
        trainerName: trainer,
        maxScore: a.max_score || 100,
        assignedCohort: a.batch_id ? `Batch #${a.batch_id.slice(0, 6)}` : "All Cohorts",
        status: (a.status === "completed" || a.status === "in_progress") ? a.status : "pending",
      };
    });

    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error: any) {
    console.error("GET /api/coding/assignments error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch coding assignments." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, dueDate, problemIds = [], maxScore = 100, batchId } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    const createdBy = profile?.id || null;

    const { data: inserted, error } = await adminClient
      .from("assignments")
      .insert({
        title,
        description: description || "",
        due_date: dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
        max_score: maxScore,
        batch_id: batchId || null,
        is_common: !batchId,
        tags: ["coding", ...problemIds],
        status: "published",
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      assignment: inserted,
    });
  } catch (error: any) {
    console.error("POST /api/coding/assignments error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create coding assignment." },
      { status: 500 }
    );
  }
}
