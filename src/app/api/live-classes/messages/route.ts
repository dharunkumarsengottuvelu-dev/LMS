import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export const dynamic = "force-dynamic";

// In-memory fallback cache for live classroom messages (keyed by classId)
const liveChatCache: Record<string, any[]> = {};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    // Try fetching from database table if it exists
    let dbMessages: any[] = [];
    try {
      const { data, error } = await adminClient
        .from("live_class_messages")
        .select("*")
        .eq("live_class_id", classId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!error && data) {
        dbMessages = data.map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name || "Participant",
          senderRole: m.sender_role || "student",
          text: m.message || m.text || "",
          timestamp: m.created_at
            ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: m.created_at,
        }));
      }
    } catch {
      // Table doesn't exist yet, use in-memory cache
    }

    const cached = liveChatCache[classId] || [];
    const combined = [...dbMessages];
    const seenIds = new Set(combined.map((m) => m.id));

    cached.forEach((cm) => {
      if (!seenIds.has(cm.id)) {
        combined.push(cm);
        seenIds.add(cm.id);
      }
    });

    combined.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    return NextResponse.json({ messages: combined });
  } catch (error) {
    console.error("GET /api/live-classes/messages error:", error);
    return NextResponse.json({ error: getErrorMessage(error), messages: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { classId, text, senderName, senderRole } = body;

    if (!classId || !text || !text.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const messageObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      live_class_id: classId,
      sender_id: user.id,
      sender_name: senderName || user.email?.split("@")[0] || "Participant",
      sender_role: senderRole || "student",
      message: text.trim(),
      created_at: new Date().toISOString(),
    };

    // Store in cache
    if (!liveChatCache[classId]) {
      liveChatCache[classId] = [];
    }
    liveChatCache[classId].push({
      id: messageObj.id,
      senderId: messageObj.sender_id,
      senderName: messageObj.sender_name,
      senderRole: messageObj.sender_role,
      text: messageObj.message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: messageObj.created_at,
    });

    // Keep cache bounded
    if (liveChatCache[classId].length > 300) {
      liveChatCache[classId].shift();
    }

    // Try persisting to DB
    try {
      await adminClient.from("live_class_messages").insert({
        id: messageObj.id,
        live_class_id: classId,
        sender_id: user.id,
        sender_name: messageObj.sender_name,
        sender_role: messageObj.sender_role,
        message: messageObj.message,
        created_at: messageObj.created_at,
      });
    } catch {
      // Graceful fallback if table is not yet migrated in Supabase
    }

    return NextResponse.json({
      success: true,
      message: {
        id: messageObj.id,
        senderId: messageObj.sender_id,
        senderName: messageObj.sender_name,
        senderRole: messageObj.sender_role,
        text: messageObj.message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: messageObj.created_at,
      },
    });
  } catch (error) {
    console.error("POST /api/live-classes/messages error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
