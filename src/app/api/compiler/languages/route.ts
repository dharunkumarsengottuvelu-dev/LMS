import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get("enabled") === "true";

    const supabase = createAdminClient();
    
    let query = supabase.from("compiler_languages").select("*").order("display_name");
    if (enabledOnly) {
      query = query.eq("is_enabled", true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ languages: data || [] }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/compiler/languages Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_enabled } = body;

    if (!id || typeof is_enabled !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("compiler_languages")
      .update({ is_enabled, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ language: data }, { status: 200 });
  } catch (error: unknown) {
    console.error("PUT /api/compiler/languages Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
