import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CodingDiscussPost {
  id: string;
  problemId?: string;
  title: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
    role: "student" | "trainer" | "admin";
    badge?: string;
  };
  upvotes: number;
  commentsCount: number;
  tags: string[];
  createdAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get("problemId");

    const adminClient = createAdminClient();

    const { data: rows, error } = await adminClient
      .from("notifications")
      .select("*, profiles:user_id(first_name, last_name, avatar_url, role)")
      .eq("type", "discuss_post")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
      });
    }

    let posts: CodingDiscussPost[] = rows.map((r: any) => {
      const meta = r.metadata || {};
      const authorProf = r.profiles;
      const authorName =
        meta.authorName ||
        (authorProf
          ? `${authorProf.first_name || ""} ${authorProf.last_name || ""}`.trim() || "Community Member"
          : "Community Member");

      return {
        id: r.id,
        problemId: meta.problemId || undefined,
        title: r.title,
        content: r.message,
        author: {
          name: authorName,
          avatar: authorProf?.avatar_url,
          role: (authorProf?.role || meta.authorRole || "student") as any,
        },
        upvotes: Number(meta.upvotes || 0),
        commentsCount: Number(meta.commentsCount || 0),
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        createdAt: r.created_at,
      };
    });

    if (problemId) {
      posts = posts.filter((p) => p.problemId === problemId || !p.problemId);
    }

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (error: any) {
    console.error("GET /api/coding/discuss error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch discussion posts." },
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
    const { title, content, problemId, tags = [] } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, role, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileId = profile?.id || null;
    const authorName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || user.email?.split("@")[0] || "User"
      : user.email?.split("@")[0] || "User";

    const { data: inserted, error } = await adminClient
      .from("notifications")
      .insert({
        user_id: profileId,
        title,
        message: content,
        type: "discuss_post",
        metadata: {
          problemId,
          tags,
          upvotes: 1,
          commentsCount: 0,
          authorName,
          authorRole: profile?.role || "student",
          upvotedUsers: [user.id],
        },
      })
      .select("*, profiles:user_id(first_name, last_name, avatar_url, role)")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      post: {
        id: inserted.id,
        problemId,
        title: inserted.title,
        content: inserted.message,
        author: {
          name: authorName,
          avatar: profile?.avatar_url,
          role: profile?.role || "student",
        },
        upvotes: 1,
        commentsCount: 0,
        tags,
        createdAt: inserted.created_at,
      },
    });
  } catch (error: any) {
    console.error("POST /api/coding/discuss error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create discussion post." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: existing } = await adminClient
      .from("notifications")
      .select("id, metadata")
      .eq("id", id)
      .eq("type", "discuss_post")
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const meta = existing.metadata || {};
    const newUpvotes = Number(meta.upvotes || 0) + 1;

    await adminClient
      .from("notifications")
      .update({
        metadata: {
          ...meta,
          upvotes: newUpvotes,
        },
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      upvotes: newUpvotes,
    });
  } catch (error: any) {
    console.error("PATCH /api/coding/discuss error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upvote post." },
      { status: 500 }
    );
  }
}
