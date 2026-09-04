import { createAdminClient } from "@/lib/supabase/admin";

export interface StudentSessionRecord {
  sessionId: string;
  studentId: string;
  studentEmail?: string;
  startedAt: string;
  lastHeartbeatAt: string;
  durationSeconds: number;
  isClosed: boolean;
  closedAt?: string;
  deviceInfo?: string;
}

export interface StudentActiveTimeData {
  studentId: string;
  studentEmail?: string;
  totalActiveSeconds: number;
  todayActiveSeconds: number;
  weekActiveSeconds: number;
  monthActiveSeconds: number;
  dailyBreakdown: Record<string, number>; // YYYY-MM-DD -> seconds
  sessions: StudentSessionRecord[];
  lastActiveAt?: string;
}

export class ActiveTimeService {
  private static async resolveProfileId(admin: any, studentIdOrUserId: string): Promise<string> {
    if (!studentIdOrUserId) return "";
    try {
      // Check if it's already a profile id
      const { data: p1 } = await admin
        .from("profiles")
        .select("id")
        .eq("id", studentIdOrUserId)
        .maybeSingle();

      if (p1?.id) return p1.id;

      // Check if it's a user_id from auth.users
      const { data: p2 } = await admin
        .from("profiles")
        .select("id")
        .eq("user_id", studentIdOrUserId)
        .maybeSingle();

      if (p2?.id) return p2.id;
    } catch (e) {
      console.error("Error resolving profile ID in ActiveTimeService:", e);
    }
    return studentIdOrUserId;
  }

  /**
   * Records a validated heartbeat from the client directly in Supabase PostgreSQL.
   * Enforces security constraints to prevent fake/jumped time.
   */
  public static async recordHeartbeat(params: {
    studentId: string;
    studentEmail?: string;
    sessionId: string;
    incrementSeconds?: number;
    isIdle?: boolean;
    isHidden?: boolean;
    deviceInfo?: string;
  }): Promise<{
    totalActiveSeconds: number;
    todayActiveSeconds: number;
    sessionActiveSeconds: number;
    isTracking: boolean;
  }> {
    const {
      studentId,
      studentEmail,
      sessionId,
      incrementSeconds = 15,
      isIdle = false,
      isHidden = false,
      deviceInfo = "Desktop/Browser",
    } = params;

    if (!studentId || !sessionId) {
      return { totalActiveSeconds: 0, todayActiveSeconds: 0, sessionActiveSeconds: 0, isTracking: false };
    }

    const admin = createAdminClient();
    const profileId = await this.resolveProfileId(admin, studentId);

    const isTracking = !isIdle && !isHidden;
    const safeIncrement = isTracking ? Math.min(Math.max(0, Math.round(incrementSeconds)), 30) : 0;
    const nowIso = new Date().toISOString();
    const todayIso = nowIso.slice(0, 10);

    let sessionActiveSeconds = 0;

    try {
      // Find existing active session row
      const { data: existingSession } = await admin
        .from("notifications")
        .select("id, metadata")
        .eq("type", "session_heartbeat")
        .eq("user_id", profileId)
        .eq("message", sessionId)
        .maybeSingle();

      if (existingSession) {
        const prevMeta = existingSession.metadata || {};
        const prevDuration = Number(prevMeta.durationSeconds || 0);
        sessionActiveSeconds = prevDuration + safeIncrement;

        await admin
          .from("notifications")
          .update({
            metadata: {
              ...prevMeta,
              sessionId,
              durationSeconds: sessionActiveSeconds,
              todayIso: prevMeta.todayIso || todayIso,
              lastHeartbeatAt: nowIso,
              isClosed: false,
              deviceInfo,
            },
            created_at: nowIso,
          })
          .eq("id", existingSession.id);
      } else {
        sessionActiveSeconds = safeIncrement;
        await admin.from("notifications").insert({
          user_id: profileId,
          title: "Active Learning Session",
          message: sessionId,
          type: "session_heartbeat",
          metadata: {
            sessionId,
            durationSeconds: sessionActiveSeconds,
            todayIso,
            startedAt: nowIso,
            lastHeartbeatAt: nowIso,
            isClosed: false,
            deviceInfo,
            studentEmail,
          },
          created_at: nowIso,
        });
      }
    } catch (err) {
      console.error("Error recording heartbeat in database:", err);
    }

    // Query aggregated authoritative metrics for this student
    const metrics = await this.getStudentActiveTime(profileId);

    return {
      totalActiveSeconds: metrics.totalActiveSeconds,
      todayActiveSeconds: metrics.todayActiveSeconds,
      sessionActiveSeconds,
      isTracking,
    };
  }

  /**
   * Retrieves the authoritative active time metrics for a student from Supabase PostgreSQL.
   */
  public static async getStudentActiveTime(studentId: string): Promise<StudentActiveTimeData> {
    const emptyResult: StudentActiveTimeData = {
      studentId,
      totalActiveSeconds: 0,
      todayActiveSeconds: 0,
      weekActiveSeconds: 0,
      monthActiveSeconds: 0,
      dailyBreakdown: {},
      sessions: [],
    };

    if (!studentId) return emptyResult;

    try {
      const admin = createAdminClient();
      const profileId = await this.resolveProfileId(admin, studentId);

      const { data: rows, error } = await admin
        .from("notifications")
        .select("id, user_id, message, metadata, created_at")
        .eq("type", "session_heartbeat")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

      if (error || !rows || rows.length === 0) {
        return emptyResult;
      }

      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalActiveSeconds = 0;
      let todayActiveSeconds = 0;
      let weekActiveSeconds = 0;
      let monthActiveSeconds = 0;
      const dailyBreakdown: Record<string, number> = {};
      const sessions: StudentSessionRecord[] = [];
      let lastActiveAt: string | undefined = undefined;

      rows.forEach((r: any) => {
        const meta = r.metadata || {};
        const dur = Number(meta.durationSeconds || 0);
        const dateStr = meta.todayIso || (r.created_at ? r.created_at.slice(0, 10) : todayIso);
        const createdAtDate = new Date(r.created_at || Date.now());

        totalActiveSeconds += dur;
        dailyBreakdown[dateStr] = (dailyBreakdown[dateStr] || 0) + dur;

        if (dateStr === todayIso) {
          todayActiveSeconds += dur;
        }
        if (createdAtDate >= weekAgo) {
          weekActiveSeconds += dur;
        }
        if (createdAtDate >= monthAgo) {
          monthActiveSeconds += dur;
        }

        if (!lastActiveAt || (r.created_at && r.created_at > lastActiveAt)) {
          lastActiveAt = r.created_at;
        }

        sessions.push({
          sessionId: meta.sessionId || r.message || r.id,
          studentId: profileId,
          studentEmail: meta.studentEmail,
          startedAt: meta.startedAt || r.created_at,
          lastHeartbeatAt: meta.lastHeartbeatAt || r.created_at,
          durationSeconds: dur,
          isClosed: !!meta.isClosed,
          closedAt: meta.closedAt,
          deviceInfo: meta.deviceInfo,
        });
      });

      return {
        studentId: profileId,
        totalActiveSeconds,
        todayActiveSeconds,
        weekActiveSeconds,
        monthActiveSeconds,
        dailyBreakdown,
        sessions,
        lastActiveAt,
      };
    } catch (err) {
      console.error("Error retrieving student active time from database:", err);
      return emptyResult;
    }
  }

  /**
   * Closes a session cleanly in the database (e.g. on logout or tab close).
   */
  public static async closeSession(sessionId: string, studentId?: string): Promise<boolean> {
    if (!sessionId) return false;
    try {
      const admin = createAdminClient();
      let query = admin
        .from("notifications")
        .select("id, metadata")
        .eq("type", "session_heartbeat")
        .eq("message", sessionId);

      if (studentId) {
        const profileId = await this.resolveProfileId(admin, studentId);
        query = query.eq("user_id", profileId);
      }

      const { data: rows } = await query;
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const meta = row.metadata || {};
          await admin
            .from("notifications")
            .update({
              metadata: {
                ...meta,
                isClosed: true,
                closedAt: new Date().toISOString(),
              },
            })
            .eq("id", row.id);
        }
        return true;
      }
    } catch (e) {
      console.error("Error closing session in database:", e);
    }
    return false;
  }

  /**
   * Gets active time for all students (for Admin / Trainer directory and reporting views).
   */
  public static async getAllStudentsActiveTime(): Promise<
    Record<string, { totalActiveSeconds: number; todayActiveSeconds: number; lastActiveAt?: string }>
  > {
    const result: Record<string, { totalActiveSeconds: number; todayActiveSeconds: number; lastActiveAt?: string }> = {};
    try {
      const admin = createAdminClient();
      const { data: rows } = await admin
        .from("notifications")
        .select("user_id, metadata, created_at")
        .eq("type", "session_heartbeat");

      if (!rows || rows.length === 0) return result;

      const todayIso = new Date().toISOString().slice(0, 10);

      rows.forEach((r: any) => {
        const uId = r.user_id;
        if (!uId) return;

        if (!result[uId]) {
          result[uId] = { totalActiveSeconds: 0, todayActiveSeconds: 0 };
        }

        const meta = r.metadata || {};
        const dur = Number(meta.durationSeconds || 0);
        const dateStr = meta.todayIso || (r.created_at ? r.created_at.slice(0, 10) : todayIso);

        result[uId].totalActiveSeconds += dur;
        if (dateStr === todayIso) {
          result[uId].todayActiveSeconds += dur;
        }

        if (!result[uId].lastActiveAt || (r.created_at && r.created_at > result[uId].lastActiveAt!)) {
          result[uId].lastActiveAt = r.created_at;
        }
      });
    } catch (err) {
      console.error("Error getting all students active time from database:", err);
    }
    return result;
  }
}
