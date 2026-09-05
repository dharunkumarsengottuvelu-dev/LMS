import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

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

    // Resolve current user's profile
    const { data: myProfile } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, role, email")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    const myProfileId = myProfile?.id || user.id;
    const myIds = Array.from(
      new Set([myProfile?.id, myProfile?.user_id, user.id].filter(Boolean) as string[])
    );

    // 1. Fetch messages where I am the recipient (user_id in myIds)
    const { data: receivedMessages, error: rError } = await adminClient
      .from("notifications")
      .select("*")
      .eq("type", "direct_message")
      .in("user_id", myIds)
      .order("created_at", { ascending: true });

    if (rError) {
      console.error("Error fetching received messages:", rError);
    }

    // 2. Fetch messages where I am the sender (metadata->sender_id in myIds)
    const idListStr = `("${myIds.join('","')}")`;
    const { data: sentMessages, error: sError } = await adminClient
      .from("notifications")
      .select("*")
      .eq("type", "direct_message")
      .filter("metadata->>sender_id", "in", idListStr)
      .order("created_at", { ascending: true });

    if (sError) {
      console.error("Error fetching sent messages:", sError);
    }

    // Merge & deduplicate
    const messageMap = new Map<string, any>();
    for (const msg of [...(receivedMessages || []), ...(sentMessages || [])]) {
      messageMap.set(msg.id, msg);
    }
    const allMessages = Array.from(messageMap.values());
    allMessages.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Group into conversations by conversation_id
    const conversationMap = new Map<string, any>();
    for (const msg of allMessages) {
      const convId = msg.metadata?.conversation_id || msg.id;
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, { conversation_id: convId, messages: [] });
      }
      conversationMap.get(convId)!.messages.push({
        id: msg.id,
        conversation_id: convId,
        sender_id: msg.metadata?.sender_id || "",
        sender_auth_id: msg.metadata?.sender_auth_id || "",
        sender_name: msg.metadata?.sender_name || "Unknown",
        sender_role: msg.metadata?.sender_role || "student",
        recipient_id: msg.metadata?.recipient_id || msg.user_id,
        recipient_name: msg.metadata?.recipient_name || "Unknown",
        recipient_role: msg.metadata?.recipient_role || "student",
        content: msg.message,
        title: msg.title,
        is_read: msg.is_read,
        created_at: msg.created_at,
      });
    }

    // Build conversation summaries
    const myIdSet = new Set(myIds);
    const conversations = Array.from(conversationMap.values()).map((conv) => {
      const msgs = conv.messages as any[];
      const last = msgs[msgs.length - 1];

      const isSenderMe =
        myIdSet.has(last.sender_id) || (last.sender_auth_id && myIdSet.has(last.sender_auth_id));

      const otherParticipantId = isSenderMe ? last.recipient_id : last.sender_id;
      const otherParticipantName = isSenderMe ? last.recipient_name : last.sender_name;
      const otherParticipantRole = isSenderMe
        ? last.recipient_role || "unknown"
        : last.sender_role;

      // Count unread messages received by me
      const unreadCount = msgs.filter((m) => {
        const msgSentByMe =
          myIdSet.has(m.sender_id) || (m.sender_auth_id && myIdSet.has(m.sender_auth_id));
        return !m.is_read && !msgSentByMe;
      }).length;

      return {
        conversation_id: conv.conversation_id,
        other_participant_id: otherParticipantId,
        other_participant_name: otherParticipantName,
        other_participant_role: otherParticipantRole,
        last_message: last.content,
        last_message_at: last.created_at,
        unread_count: unreadCount,
        messages: msgs,
      };
    });

    // Sort by latest message descending
    conversations.sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    return NextResponse.json({ success: true, conversations, myProfileId, myIds });
  } catch (err: any) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err), conversations: [] },
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Resolve sender profile
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, role, email")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    const senderId = senderProfile?.id || user.id;
    let senderName =
      `${senderProfile?.first_name || ""} ${senderProfile?.last_name || ""}`.trim() ||
      senderProfile?.email?.split("@")[0] ||
      user.email?.split("@")[0] ||
      "User";

    const senderRole = (senderProfile?.role || "student").toLowerCase();
    if (senderRole === "admin" && senderName.toLowerCase() === "super") {
      senderName = "Super Admin";
    }

    const body = await request.json();
    const { recipient_id, content, conversation_id: existingConvId } = body;

    if (!recipient_id || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: "recipient_id and content are required" },
        { status: 400 }
      );
    }

    // Resolve recipient profile
    const { data: recipientProfile } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, role, email")
      .or(`id.eq.${recipient_id},user_id.eq.${recipient_id}`)
      .maybeSingle();

    let targetUserId = recipientProfile?.id || recipient_id;
    let recipientName = "User";
    let recipientRole = "student";

    if (recipientProfile) {
      const rawName = `${recipientProfile.first_name || ""} ${recipientProfile.last_name || ""}`.trim();
      recipientName = rawName || recipientProfile.email?.split("@")[0] || "User";
      recipientRole = (recipientProfile.role || "student").toLowerCase();
      if (recipientRole === "admin" && recipientName.toLowerCase() === "super") {
        recipientName = "Super Admin";
      }
    } else {
      // Try fallback to auth user
      try {
        const { data: authUser } = await adminClient.auth.admin.getUserById(recipient_id);
        if (authUser?.user) {
          const meta = authUser.user.user_metadata || {};
          recipientName =
            meta.full_name ||
            `${meta.first_name || ""} ${meta.last_name || ""}`.trim() ||
            authUser.user.email?.split("@")[0] ||
            "User";
          recipientRole = (meta.role || "admin").toLowerCase();
          if (recipientRole === "admin" && recipientName.toLowerCase() === "super") {
            recipientName = "Super Admin";
          }
        }
      } catch {}
    }

    // Use existing conversation ID or generate a new UUID
    const conversationId = existingConvId || uuidv4();
    const messageTitle = `Message from ${senderName}`;

    // Insert the message as a notification record for the recipient
    const { data: insertedMsg, error: insertError } = await adminClient
      .from("notifications")
      .insert([
        {
          user_id: targetUserId,
          title: messageTitle,
          message: content.trim(),
          type: "direct_message",
          is_read: false,
          metadata: {
            conversation_id: conversationId,
            sender_id: senderId,
            sender_auth_id: user.id,
            sender_name: senderName,
            sender_role: senderRole,
            recipient_id: targetUserId,
            recipient_auth_id: recipientProfile?.user_id || recipient_id,
            recipient_name: recipientName,
            recipient_role: recipientRole,
          },
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting direct_message notification:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
      message: {
        id: insertedMsg.id,
        conversation_id: conversationId,
        sender_id: senderId,
        sender_auth_id: user.id,
        sender_name: senderName,
        sender_role: senderRole,
        recipient_id: targetUserId,
        recipient_name: recipientName,
        recipient_role: recipientRole,
        content: content.trim(),
        is_read: false,
        created_at: insertedMsg.created_at,
      },
    });
  } catch (err: any) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
