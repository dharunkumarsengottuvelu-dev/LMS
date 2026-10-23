import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccessToken } from "livekit-server-sdk";

export const dynamic = "force-dynamic";

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
    const { classId, userName } = body;

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, first_name, last_name")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const actualRole = (
      profile?.role ||
      user.user_metadata?.role ||
      user.app_metadata?.role ||
      "student"
    ).toLowerCase();

    const isHost = ["super_admin", "admin", "trainer"].includes(actualRole);
    const participantIdentity = user.id;
    const profileName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "";
    const participantName = userName || profileName || user.email?.split("@")[0] || "Participant";

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

    // If LiveKit credentials are provided in env, generate a production JWT AccessToken
    if (apiKey && apiSecret && wsUrl) {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: participantIdentity,
        name: participantName,
        ttl: "6h",
      });

      at.addGrant({
        room: `sensilearn_room_${classId}`,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: isHost,
      });

      const jwt = await at.toJwt();

      return NextResponse.json({
        sfuConfigured: true,
        serverUrl: wsUrl,
        token: jwt,
        identity: participantIdentity,
        roomName: `sensilearn_room_${classId}`,
        isHost,
      });
    }

    // Fallback mode when LiveKit Cloud is not yet configured in environment variables
    return NextResponse.json({
      sfuConfigured: false,
      serverUrl: null,
      token: null,
      identity: participantIdentity,
      roomName: `sensilearn_room_${classId}`,
      isHost,
    });
  } catch (error: any) {
    console.error("Error generating meeting token:", error);
    return NextResponse.json({ error: error.message || "Failed to generate meeting token" }, { status: 500 });
  }
}
