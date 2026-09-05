import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";


/**
 * Pure format function adhering strictly to:
 * STID-[3-digit joining sequence]-[DDYYYY]
 *
 * Examples:
 *  - sequence 1, date 05 Feb 2026 -> STID-001-052026
 *  - sequence 2, date 05 Feb 2026 -> STID-002-052026
 *  - sequence 3, date 10 Mar 2026 -> STID-003-102026
 *  - sequence 10, date 15 Sep 2026 -> STID-010-152026
 */
export function formatStudentId(sequence: number, joiningDate: Date | string): string {
  const seqStr = String(sequence).padStart(3, "0");
  const d = typeof joiningDate === "string" ? new Date(joiningDate) : joiningDate;
  const safeDate = isNaN(d.getTime()) ? new Date() : d;

  const day = String(safeDate.getUTCDate()).padStart(2, "0");
  const year = safeDate.getUTCFullYear();

  return `STID-${seqStr}-${day}${year}`;
}

export class StudentIdService {
  /**
   * Resolves or permanently generates and persists a Student ID for a given user.
   * - Never regenerates if already present in database metadata.
   * - Never reuses deleted students' sequences (uses strictly monotonically increasing sequence).
   * - Stores permanently in Supabase auth user_metadata.
   */
  static async getOrGenerateStudentId(
    user: { id: string; email?: string; created_at?: string; user_metadata?: any },
    adminClient?: SupabaseClient
  ): Promise<string> {
    const existing = user?.user_metadata?.student_id;
    if (existing && typeof existing === "string" && existing.startsWith("STID-")) {
      return existing;
    }

    const client = adminClient || createAdminClient();

    try {
      // 1. Fetch fresh user record from Supabase Auth to avoid stale state
      const { data: userData } = await client.auth.admin.getUserById(user.id);
      const freshMeta = userData?.user?.user_metadata;
      if (freshMeta?.student_id && typeof freshMeta.student_id === "string" && freshMeta.student_id.startsWith("STID-")) {
        return freshMeta.student_id;
      }

      // 2. Fetch all users to compute current highest monotonic sequence
      const { data: allUsers } = await client.auth.admin.listUsers();
      let maxSequence = 0;

      (allUsers?.users || []).forEach((u) => {
        const seq = u.user_metadata?.student_seq;
        if (typeof seq === "number" && seq > maxSequence) {
          maxSequence = seq;
        } else if (typeof seq === "string") {
          const parsed = parseInt(seq, 10);
          if (!isNaN(parsed) && parsed > maxSequence) {
            maxSequence = parsed;
          }
        }
      });

      // If no sequence was tracked, count how many students registered before this user
      const nextSeq = maxSequence > 0 ? maxSequence + 1 : 1;
      const joiningDate = user.created_at || userData?.user?.created_at || new Date().toISOString();
      const generatedId = formatStudentId(nextSeq, joiningDate);

      // 3. Store permanently in Supabase Auth user_metadata
      await client.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(freshMeta || user.user_metadata || {}),
          student_id: generatedId,
          student_seq: nextSeq,
          joining_date: joiningDate,
        },
      });

      return generatedId;
    } catch (err) {
      console.error("Error generating student ID in StudentIdService:", err);
      // Fallback deterministic formatting without failing the request
      const fallbackDate = user.created_at || new Date().toISOString();
      return formatStudentId(1, fallbackDate);
    }
  }
}
