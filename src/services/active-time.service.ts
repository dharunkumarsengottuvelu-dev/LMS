import fs from "fs";
import path from "path";

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
  dailyBreakdown: Record<string, number>; // YYYY-MM-DD -> seconds
  sessions: StudentSessionRecord[];
  lastActiveAt?: string;
}

interface ActiveSessionsStore {
  students: Record<string, StudentActiveTimeData>;
  lastUpdated: string;
}

const DATA_DIR = path.resolve(process.cwd(), "src/data");
const STORE_FILE = path.join(DATA_DIR, "active-sessions-store.json");

// Ensure store directory exists
function ensureStoreExists(): ActiveSessionsStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      if (raw && raw.trim().length > 0) {
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.error("Error reading active sessions store:", err);
  }

  const initialStore: ActiveSessionsStore = {
    students: {},
    lastUpdated: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(initialStore, null, 2), "utf-8");
  } catch (err) {
    console.error("Error creating active sessions store:", err);
  }

  return initialStore;
}

function saveStore(store: ActiveSessionsStore) {
  try {
    store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving active sessions store:", err);
  }
}

export class ActiveTimeService {
  /**
   * Records a validated heartbeat from the client.
   * Enforces security constraints to prevent fake/jumped time.
   */
  public static recordHeartbeat(params: {
    studentId: string;
    studentEmail?: string;
    sessionId: string;
    incrementSeconds?: number;
    isIdle?: boolean;
    isHidden?: boolean;
    deviceInfo?: string;
  }): {
    totalActiveSeconds: number;
    todayActiveSeconds: number;
    sessionActiveSeconds: number;
    isTracking: boolean;
  } {
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

    const store = ensureStoreExists();
    if (!store.students[studentId]) {
      store.students[studentId] = {
        studentId,
        studentEmail,
        totalActiveSeconds: 0,
        dailyBreakdown: {},
        sessions: [],
        lastActiveAt: new Date().toISOString(),
      };
    }

    const studentData = store.students[studentId];
    if (studentEmail && !studentData.studentEmail) {
      studentData.studentEmail = studentEmail;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const todayIso = nowIso.slice(0, 10); // YYYY-MM-DD

    // Find or create the active session
    let session = studentData.sessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      session = {
        sessionId,
        studentId,
        studentEmail,
        startedAt: nowIso,
        lastHeartbeatAt: nowIso,
        durationSeconds: 0,
        isClosed: false,
        deviceInfo,
      };
      // Keep up to 100 recent sessions per student to manage storage
      studentData.sessions.unshift(session);
      if (studentData.sessions.length > 100) {
        studentData.sessions = studentData.sessions.slice(0, 100);
      }
    }

    // Determine if tracking should advance
    const isTracking = !isIdle && !isHidden && !session.isClosed;

    if (isTracking) {
      // Security Validation:
      // Client cannot send arbitrary values like 999999 seconds.
      // Maximum allowed increment per heartbeat is capped to 30 seconds.
      const safeIncrement = Math.min(Math.max(0, Math.round(incrementSeconds)), 30);
      const effectiveIncrement = safeIncrement;

      session.durationSeconds += effectiveIncrement;
      session.lastHeartbeatAt = nowIso;
      studentData.totalActiveSeconds += effectiveIncrement;
      studentData.dailyBreakdown[todayIso] = (studentData.dailyBreakdown[todayIso] || 0) + effectiveIncrement;
      studentData.lastActiveAt = nowIso;

      saveStore(store);
    } else {
      session.lastHeartbeatAt = nowIso;
      saveStore(store);
    }

    const todayActive = studentData.dailyBreakdown[todayIso] || 0;

    return {
      totalActiveSeconds: studentData.totalActiveSeconds,
      todayActiveSeconds: todayActive,
      sessionActiveSeconds: session.durationSeconds,
      isTracking,
    };
  }

  /**
   * Retrieves the authoritative active time metrics for a student.
   */
  public static getStudentActiveTime(studentId: string): {
    totalActiveSeconds: number;
    todayActiveSeconds: number;
    weekActiveSeconds: number;
    monthActiveSeconds: number;
    dailyBreakdown: Record<string, number>;
    sessions: StudentSessionRecord[];
    lastActiveAt?: string;
  } {
    if (!studentId) {
      return {
        totalActiveSeconds: 0,
        todayActiveSeconds: 0,
        weekActiveSeconds: 0,
        monthActiveSeconds: 0,
        dailyBreakdown: {},
        sessions: [],
      };
    }

    const store = ensureStoreExists();
    const data = store.students[studentId];

    if (!data) {
      return {
        totalActiveSeconds: 0,
        todayActiveSeconds: 0,
        weekActiveSeconds: 0,
        monthActiveSeconds: 0,
        dailyBreakdown: {},
        sessions: [],
      };
    }

    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const todayActiveSeconds = data.dailyBreakdown[todayIso] || 0;

    // Calculate this week (last 7 days)
    let weekActiveSeconds = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      weekActiveSeconds += data.dailyBreakdown[d] || 0;
    }

    // Calculate this month (last 30 days)
    let monthActiveSeconds = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      monthActiveSeconds += data.dailyBreakdown[d] || 0;
    }

    return {
      totalActiveSeconds: data.totalActiveSeconds,
      todayActiveSeconds,
      weekActiveSeconds,
      monthActiveSeconds,
      dailyBreakdown: data.dailyBreakdown,
      sessions: data.sessions || [],
      lastActiveAt: data.lastActiveAt,
    };
  }

  /**
   * Closes a session cleanly (e.g. on logout or tab close).
   */
  public static closeSession(sessionId: string, studentId?: string): boolean {
    if (!sessionId) return false;
    const store = ensureStoreExists();

    const checkStudent = (sData: StudentActiveTimeData) => {
      const s = sData.sessions.find((sess) => sess.sessionId === sessionId);
      if (s) {
        s.isClosed = true;
        s.closedAt = new Date().toISOString();
        return true;
      }
      return false;
    };

    if (studentId && store.students[studentId]) {
      if (checkStudent(store.students[studentId])) {
        saveStore(store);
        return true;
      }
    } else {
      for (const sId of Object.keys(store.students)) {
        const sData = store.students[sId];
        if (sData && checkStudent(sData)) {
          saveStore(store);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Gets active time for all students (for Admin / Trainer directory views).
   */
  public static getAllStudentsActiveTime(): Record<string, { totalActiveSeconds: number; todayActiveSeconds: number; lastActiveAt?: string }> {
    const store = ensureStoreExists();
    const result: Record<string, { totalActiveSeconds: number; todayActiveSeconds: number; lastActiveAt?: string }> = {};

    const todayIso = new Date().toISOString().slice(0, 10);
    for (const [sId, data] of Object.entries(store.students)) {
      result[sId] = {
        totalActiveSeconds: data.totalActiveSeconds,
        todayActiveSeconds: data.dailyBreakdown[todayIso] || 0,
        lastActiveAt: data.lastActiveAt,
      };
    }

    return result;
  }
}
