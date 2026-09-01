import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const problemId = searchParams.get("problem_id");
    const language = searchParams.get("language");

    const draftKey = key || (problemId ? `draft_${problemId}_${language || "all"}` : null);

    if (!draftKey) {
      return NextResponse.json({ error: "Missing key or problem_id" }, { status: 400 });
    }

    const drafts = (user.user_metadata?.code_drafts || {}) as Record<string, any>;
    const draftData = drafts[draftKey] || null;

    return NextResponse.json({ draft: draftData }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
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
    const { key, problem_id, language, code, data } = body;

    const draftKey = key || (problem_id ? `draft_${problem_id}_${language || "all"}` : null);

    if (!draftKey) {
      return NextResponse.json({ error: "Missing key or problem_id" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: authUser } = await adminClient.auth.admin.getUserById(user.id);

    const existingDrafts = (authUser?.user?.user_metadata?.code_drafts || {}) as Record<string, any>;
    
    // Clean up older drafts if there are more than 100 to keep metadata lightweight
    const draftKeys = Object.keys(existingDrafts);
    if (draftKeys.length > 100) {
      const sortedKeys = draftKeys.sort(
        (a, b) => new Date(existingDrafts[a]?.updatedAt || 0).getTime() - new Date(existingDrafts[b]?.updatedAt || 0).getTime()
      );
      // Remove oldest 20
      for (let i = 0; i < 20; i++) {
        const k = sortedKeys[i];
        if (k) delete existingDrafts[k];
      }
    }

    existingDrafts[draftKey] = {
      code: code !== undefined ? code : data?.code,
      data: data !== undefined ? data : undefined,
      language,
      problem_id,
      updatedAt: new Date().toISOString(),
    };

    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(authUser?.user?.user_metadata || {}),
        code_drafts: existingDrafts,
      },
    });

    return NextResponse.json({ success: true, key: draftKey }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
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
    const key = searchParams.get("key");
    const problemId = searchParams.get("problem_id");

    const draftKey = key || (problemId ? `draft_${problemId}` : null);

    if (!draftKey) {
      return NextResponse.json({ error: "Missing key or problem_id" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: authUser } = await adminClient.auth.admin.getUserById(user.id);

    const existingDrafts = (authUser?.user?.user_metadata?.code_drafts || {}) as Record<string, any>;
    
    // Remove all keys matching the prefix
    Object.keys(existingDrafts).forEach((k) => {
      if (k === draftKey || k.startsWith(draftKey)) {
        delete existingDrafts[k];
      }
    });

    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(authUser?.user?.user_metadata || {}),
        code_drafts: existingDrafts,
      },
    });

    return NextResponse.json({ success: true, cleared: draftKey }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
