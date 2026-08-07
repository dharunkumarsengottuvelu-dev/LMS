/**
 * Structured Security & Audit Trail Logger
 * Captures security events for compliance and threat analysis.
 */

export type SecurityEventType =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTH_LOGOUT"
  | "RBAC_VIOLATION"
  | "EXAM_PROCTORING_ALERT"
  | "EXAM_TERMINATED"
  | "ADMIN_ACTION"
  | "RATE_LIMIT_EXCEEDED"
  | "FILE_UPLOAD_BLOCKED";

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  userId?: string;
  userEmail?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
}

const securityLogStore: SecurityEvent[] = [];
const MAX_LOG_HISTORY = 1000;

/**
 * Logs a structured security audit event
 */
export function logSecurityEvent(
  type: SecurityEventType,
  details: Record<string, unknown>,
  context?: { userId?: string; userEmail?: string; role?: string; ipAddress?: string; userAgent?: string }
): SecurityEvent {
  const event: SecurityEvent = {
    id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    type,
    userId: context?.userId,
    userEmail: context?.userEmail,
    role: context?.role,
    ipAddress: context?.ipAddress || "127.0.0.1",
    userAgent: context?.userAgent || "Standard Browser",
    details,
  };

  securityLogStore.unshift(event);
  if (securityLogStore.length > MAX_LOG_HISTORY) {
    securityLogStore.pop();
  }

  // Print structured console output in development / server logs
  console.log(`[SECURITY AUDIT] [${event.type}] [${event.timestamp}]`, {
    user: event.userEmail || event.userId || "anonymous",
    details: event.details,
  });

  return event;
}

/**
 * Retrieves audit trail logs (filterable by event type or user ID)
 */
export function getSecurityLogs(filter?: { type?: SecurityEventType; userId?: string; limit?: number }): SecurityEvent[] {
  let logs = securityLogStore;
  if (filter?.type) {
    logs = logs.filter((l) => l.type === filter.type);
  }
  if (filter?.userId) {
    logs = logs.filter((l) => l.userId === filter.userId);
  }
  return logs.slice(0, filter?.limit || 100);
}
