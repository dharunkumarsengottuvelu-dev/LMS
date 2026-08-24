import type { UserRole } from "@/types";

// Permission matrix for RBAC
const PERMISSIONS = {
  // User management
  "users:create": ["super_admin", "admin"],
  "users:read": ["super_admin", "admin", "trainer", "recruiter"],
  "users:update": ["super_admin", "admin"],
  "users:delete": ["super_admin", "admin"],
  "users:suspend": ["super_admin", "admin"],

  // Course management
  "courses:create": ["super_admin", "admin", "trainer"],
  "courses:read": ["super_admin", "admin", "trainer", "student"],
  "courses:update": ["super_admin", "admin", "trainer"],
  "courses:delete": ["super_admin", "admin"],
  "courses:publish": ["super_admin", "admin", "trainer"],

  // Module & Lesson management
  "modules:create": ["super_admin", "admin", "trainer"],
  "modules:update": ["super_admin", "admin", "trainer"],
  "lessons:create": ["super_admin", "admin", "trainer"],
  "lessons:update": ["super_admin", "admin", "trainer"],

  // Assessment management
  "assessments:create": ["super_admin", "admin", "trainer"],
  "assessments:read": ["super_admin", "admin", "trainer", "student"],
  "assessments:update": ["super_admin", "admin", "trainer"],
  "assessments:delete": ["super_admin", "admin"],
  "assessments:assign": ["super_admin", "admin"],
  "assessments:attempt": ["student"],

  // Coding problems
  "coding:create": ["super_admin", "admin", "trainer"],
  "coding:submit": ["super_admin", "admin", "trainer", "student"],

  // Tests
  "tests:create": ["super_admin", "admin", "trainer"],
  "tests:schedule": ["super_admin", "admin"],
  "tests:attempt": ["student"],

  // Assignments
  "assignments:create": ["super_admin", "admin", "trainer"],
  "assignments:grade": ["super_admin", "admin", "trainer"],
  "assignments:submit": ["student"],

  // Reports
  "reports:view_all": ["super_admin", "admin"],
  "reports:view_own": ["super_admin", "admin", "trainer", "student"],

  // Admin-only
  "admin:settings": ["super_admin", "admin"],
  "admin:analytics": ["super_admin", "admin"],
  "admin:categories": ["super_admin", "admin"],
  "admin:batches": ["super_admin", "admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (role === "super_admin") return true;
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Unauthorized: role '${role}' cannot perform '${permission}'`);
  }
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) =>
    hasPermission(role, p)
  );
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: "Super Administrator",
    admin: "Administrator",
    trainer: "Trainer",
    student: "Student",
    recruiter: "Recruiter",
  };
  return labels[role] || "User";
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    super_admin: "bg-purple-100 text-purple-700 border-purple-200",
    admin: "bg-red-100 text-red-700 border-red-200",
    trainer: "bg-blue-100 text-blue-700 border-blue-200",
    student: "bg-green-100 text-green-700 border-green-200",
    recruiter: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return colors[role] || "bg-gray-100 text-gray-700 border-gray-200";
}
