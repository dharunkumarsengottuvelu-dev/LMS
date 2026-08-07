/**
 * Enterprise Password Policy & Account Lockout Tracker
 * Follows NIST SP 800-63B Guidelines
 */

export interface PasswordPolicyResult {
  isValid: boolean;
  score: number; // 0 to 4
  errors: string[];
}

interface LockoutRecord {
  failedAttempts: number;
  lockoutUntil: number | null;
}

const lockoutStore = new Map<string, LockoutRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Validates password against enterprise complexity rules
 */
export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  let score = 0;

  if (!password || password.length < 12) {
    errors.push("Password must be at least 12 characters long.");
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter (A-Z).");
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter (a-z).");
  } else {
    score += 1;
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number (0-9).");
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*).");
  }

  return {
    isValid: errors.length === 0,
    score,
    errors,
  };
}

/**
 * Checks if an account/IP is locked due to multiple failed login attempts
 */
export function isAccountLocked(key: string): { isLocked: boolean; remainingMinutes: number } {
  const record = lockoutStore.get(key);
  if (!record || !record.lockoutUntil) {
    return { isLocked: false, remainingMinutes: 0 };
  }

  const now = Date.now();
  if (now > record.lockoutUntil) {
    lockoutStore.delete(key);
    return { isLocked: false, remainingMinutes: 0 };
  }

  const remainingMs = record.lockoutUntil - now;
  return {
    isLocked: true,
    remainingMinutes: Math.ceil(remainingMs / 60000),
  };
}

/**
 * Records a failed login attempt and locks account if threshold exceeded
 */
export function recordFailedLogin(key: string): { locked: boolean; attemptsLeft: number } {
  const now = Date.now();
  const record = lockoutStore.get(key) || { failedAttempts: 0, lockoutUntil: null };

  record.failedAttempts += 1;

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    lockoutStore.set(key, record);
    return { locked: true, attemptsLeft: 0 };
  }

  lockoutStore.set(key, record);
  return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - record.failedAttempts };
}

/**
 * Resets failed attempts after successful authentication
 */
export function resetLoginAttempts(key: string): void {
  lockoutStore.delete(key);
}
