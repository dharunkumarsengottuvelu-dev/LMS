/**
 * Enterprise Role-Based Access Control (RBAC) & Permission Matrix
 * Supports Super Admin, Admin, Trainer, Student, and Recruiter roles.
 */

export type UserRole = "super_admin" | "admin" | "trainer" | "student" | "recruiter";

export type Permission =
  // User Governance
  | "users:create"
  | "users:read"
  | "users:update"
  | "users:delete"
  | "users:manage_roles"
  // Course Management
  | "courses:create"
  | "courses:read"
  | "courses:update"
  | "courses:delete"
  | "courses:assign"
  // Assessment & Proctoring
  | "tests:create"
  | "tests:read"
  | "tests:update"
  | "tests:delete"
  | "tests:proctor"
  | "tests:attempt"
  // Assignments & Practice
  | "assignments:grade"
  | "assignments:submit"
  | "practices:attempt"
  // Candidate & Placement Review (Recruiter)
  | "candidates:evaluate"
  | "candidates:read_analytics"
  // Analytics & Reports
  | "analytics:read_global"
  | "analytics:read_batch"
  | "analytics:read_self";

const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  super_admin: [
    "users:create", "users:read", "users:update", "users:delete", "users:manage_roles",
    "courses:create", "courses:read", "courses:update", "courses:delete", "courses:assign",
    "tests:create", "tests:read", "tests:update", "tests:delete", "tests:proctor", "tests:attempt",
    "assignments:grade", "assignments:submit", "practices:attempt",
    "candidates:evaluate", "candidates:read_analytics",
    "analytics:read_global", "analytics:read_batch", "analytics:read_self",
  ],

  admin: [
    "users:create", "users:read", "users:update", "users:manage_roles",
    "courses:create", "courses:read", "courses:update", "courses:delete", "courses:assign",
    "tests:create", "tests:read", "tests:update", "tests:delete", "tests:proctor",
    "assignments:grade",
    "candidates:evaluate", "candidates:read_analytics",
    "analytics:read_global", "analytics:read_batch",
  ],

  trainer: [
    "users:read",
    "courses:create", "courses:read", "courses:update", "courses:assign",
    "tests:create", "tests:read", "tests:update", "tests:proctor",
    "assignments:grade",
    "candidates:read_analytics",
    "analytics:read_batch",
  ],

  student: [
    "courses:read",
    "tests:read", "tests:attempt",
    "assignments:submit", "practices:attempt",
    "analytics:read_self",
  ],

  recruiter: [
    "users:read",
    "courses:read",
    "candidates:evaluate", "candidates:read_analytics",
    "analytics:read_batch",
  ],
};

/**
 * Validates if a given role possesses a specific permission
 */
export function hasPermission(role: UserRole | string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const userPermissions = ROLE_PERMISSIONS_MAP[role as UserRole];
  if (!userPermissions) return false;
  return userPermissions.includes(permission);
}

/**
 * Checks resource ownership — returns true if user is owner or has admin privilege
 */
export function validateResourceOwnership(
  userId: string,
  resourceOwnerId: string,
  role: UserRole | string
): boolean {
  if (role === "super_admin" || role === "admin") return true;
  return userId === resourceOwnerId;
}
