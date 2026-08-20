import { SupabaseClient } from "@supabase/supabase-js";

export interface StudentBatchContext {
  profile: any;
  profileId: string;
  studentUserId: string;
  studentEmail: string;
  studentFullName: string;
  batchIds: string[];
  batchNames: string[];
  allTargetIdentifiers: Set<string>;
}

/**
 * Resolves a student's full batch context including all memberships from batch_members,
 * direct profile references, batch IDs, and human-readable batch names.
 */
export async function getStudentBatchAccess(
  adminClient: SupabaseClient,
  user: { id: string; email?: string }
): Promise<StudentBatchContext> {
  const studentUserId = user.id;

  // 1. Get student profile
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .or(`user_id.eq.${studentUserId},id.eq.${studentUserId}${user.email ? `,email.eq.${user.email}` : ""}`)
    .maybeSingle() as any;

  const profileId = profile?.id || studentUserId;
  const studentEmail = user.email || profile?.email || "";
  const studentFullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

  // 2. Query all batch memberships
  const { data: batchMembers } = await adminClient
    .from("batch_members")
    .select("batch_id")
    .or(`user_id.eq.${profileId},user_id.eq.${studentUserId}`) as any;

  const batchIdsSet = new Set<string>();
  (batchMembers || []).forEach((bm: any) => {
    if (bm.batch_id) batchIdsSet.add(String(bm.batch_id));
  });

  if (profile?.batch_id) {
    batchIdsSet.add(String(profile.batch_id));
  }

  const batchIds = Array.from(batchIdsSet);
  const batchNamesSet = new Set<string>();

  if (profile?.batch_name) batchNamesSet.add(profile.batch_name.trim());
  if (profile?.batch && profile.batch !== "Not Assigned" && profile.batch !== "Unassigned") {
    batchNamesSet.add(profile.batch.trim());
  }

  if (batchIds.length > 0) {
    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name")
      .in("id", batchIds) as any;

    if (batchesData) {
      batchesData.forEach((b: any) => {
        if (b.name) batchNamesSet.add(b.name.trim());
        if (b.batch_name) batchNamesSet.add(b.batch_name.trim());
      });
    }
  }

  const batchNames = Array.from(batchNamesSet);

  // 3. Compile target identifiers for rapid matching (all lowercased)
  const allTargetIdentifiers = new Set<string>([
    String(studentUserId).toLowerCase(),
    String(profileId).toLowerCase(),
    String(studentEmail).toLowerCase(),
    String(studentFullName).toLowerCase(),
    ...batchIds.map((id) => String(id).toLowerCase()),
    ...batchNames.map((name) => String(name).toLowerCase()),
  ]);

  return {
    profile,
    profileId,
    studentUserId,
    studentEmail,
    studentFullName,
    batchIds,
    batchNames,
    allTargetIdentifiers,
  };
}

/**
 * Checks whether a given content item (Course, Practice, Assessment, Assignment)
 * is visible to the student based on Common vs. Specific Batch assignment rules.
 */
export function isContentVisibleToStudent(
  content: {
    is_common?: boolean;
    isCommon?: boolean;
    visibility_scope?: string;
    assigned_batches?: string[];
    assignedBatches?: string[];
    assigned_students?: string[];
    assignedStudents?: string[];
  },
  batchContext: StudentBatchContext
): boolean {
  const isExplicitlyCommon =
    content.is_common === true ||
    String(content.is_common) === "true" ||
    content.isCommon === true ||
    String(content.isCommon) === "true" ||
    content.visibility_scope === "common";

  const rawAssignedBatches = content.assigned_batches || content.assignedBatches || [];
  const rawAssignedStudents = content.assigned_students || content.assignedStudents || [];

  const assignedBatches = rawAssignedBatches.map((b) => String(b).trim().toLowerCase());
  const assignedStudents = rawAssignedStudents.map((s) => String(s).trim().toLowerCase());

  // Rule 3: If marked Common or contains "common" / "all" or has no specific batch/student restriction, it is visible to ALL students
  if (
    isExplicitlyCommon ||
    assignedBatches.includes("common") ||
    assignedBatches.includes("all") ||
    assignedBatches.includes("all batches") ||
    assignedBatches.includes("all students") ||
    (assignedBatches.length === 0 && assignedStudents.length === 0)
  ) {
    return true;
  }

  // Rule 4 & 5: If assigned to specific batches, student must belong to at least one assigned batch
  const hasMatchingBatch = assignedBatches.some((b) => {
    if (!b) return false;
    const directMatch =
      (batchContext.allTargetIdentifiers && batchContext.allTargetIdentifiers.has(b)) ||
      (batchContext.batchIds && batchContext.batchIds.some((id) => id.toLowerCase() === b)) ||
      (batchContext.batchNames && batchContext.batchNames.some((name) => name.toLowerCase() === b));

    if (directMatch) return true;

    // Substring / fuzzy match (e.g., "Batch A" matching "Batch A 2026")
    const fuzzyMatch = (batchContext.batchNames || []).some((name) => {
      const lowerName = name.toLowerCase();
      return lowerName.includes(b) || b.includes(lowerName);
    });

    return fuzzyMatch;
  });

  if (hasMatchingBatch) {
    return true;
  }

  // Check direct student assignment
  const hasMatchingStudent = assignedStudents.some((s) => {
    if (!s) return false;
    return (
      (batchContext.allTargetIdentifiers && batchContext.allTargetIdentifiers.has(s)) ||
      (batchContext.studentUserId && s === batchContext.studentUserId.toLowerCase()) ||
      (batchContext.profileId && s === batchContext.profileId.toLowerCase()) ||
      (batchContext.studentEmail && s === batchContext.studentEmail.toLowerCase())
    );
  });

  if (hasMatchingStudent) {
    return true;
  }

  return false;
}
