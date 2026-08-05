import type { UserRole } from "@/types";

// Permission matrix for RBAC
const PERMISSIONS = {
  // User management
  "users:create": ["admin"],
  "users:read": ["admin", "trainer"],
  "users:update": ["admin"],
  "users:delete": ["admin"],
  "users:suspend": ["admin"],

  // Course management
  "courses:create": ["admin", "trainer"],
  "courses:read": ["admin", "trainer", "student"],
  "courses:update": ["admin", "trainer"],
  "courses:delete": ["admin"],
  "courses:publish": ["admin", "trainer"],

  // Module & Lesson management
  "modules:create": ["admin", "trainer"],
  "modules:update": ["admin", "trainer"],
  "lessons:create": ["admin", "trainer"],
  "lessons:update": ["admin", "trainer"],

  // Assessment management
  "assessments:create": ["admin", "trainer"],
  "assessments:read": ["admin", "trainer", "student"],
  "assessments:update": ["admin", "trainer"],
  "assessments:delete": ["admin"],
  "assessments:assign": ["admin"],
  "assessments:attempt": ["student"],

  // Coding problems
  "coding:create": ["admin", "trainer"],
  "coding:submit": ["admin", "trainer", "student"],

  // Tests
  "tests:create": ["admin", "trainer"],
  "tests:schedule": ["admin"],
  "tests:attempt": ["student"],

  // Assignments
  "assignments:create": ["admin", "trainer"],
  "assignments:grade": ["admin", "trainer"],
  "assignments:submit": ["student"],

  // Reports
  "reports:view_all": ["admin"],
  "reports:view_own": ["admin", "trainer", "student"],

  // Admin-only
  "admin:settings": ["admin"],
  "admin:analytics": ["admin"],
  "admin:categories": ["admin"],
  "admin:batches": ["admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
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
    admin: "Administrator",
    trainer: "Trainer",
    student: "Student",
  };
  return labels[role];
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: "bg-red-100 text-red-700 border-red-200",
    trainer: "bg-blue-100 text-blue-700 border-blue-200",
    student: "bg-green-100 text-green-700 border-green-200",
  };
  return colors[role];
}
