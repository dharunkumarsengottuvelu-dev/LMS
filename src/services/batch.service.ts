import { createClient } from "@/lib/supabase/client";
import type { LMSBatch } from "@/types/batch";

export class BatchService {
  static async getBatches(): Promise<LMSBatch[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("batches")
        .select(`*, profiles(first_name, last_name)`)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((b: any) => ({
          id: b.id,
          batchName: b.name,
          collegeName: b.college_name || "Unknown College",
          course: b.course_name || "Unknown Course",
          startDate: b.start_date,
          endDate: b.end_date || "",
          joiningTime: b.joining_time || "",
          trainer: b.trainer_name || (b.profiles ? `${b.profiles.first_name} ${b.profiles.last_name}` : "Unknown Trainer"),
          status: b.status as "active" | "inactive",
          studentIds: [], // We fetch batch_members separately if needed, or handle it via UI local state for now
          createdAt: b.created_at,
        }));
      }
    } catch {
      // Supabase connection unconfigured or failed
    }
    return [];
  }

  static async createBatch(batchData: Omit<LMSBatch, "id" | "createdAt" | "studentIds">, trainerId?: string): Promise<LMSBatch | null> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("batches")
        .insert([{
          name: batchData.batchName,
          college_name: batchData.collegeName,
          course_name: batchData.course,
          start_date: batchData.startDate,
          end_date: batchData.endDate,
          joining_time: batchData.joiningTime,
          trainer_name: batchData.trainer,
          status: batchData.status,
          created_by: trainerId || null,
        }])
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          batchName: data.name,
          collegeName: data.college_name,
          course: data.course_name,
          startDate: data.start_date,
          endDate: data.end_date,
          joiningTime: data.joining_time,
          trainer: data.trainer_name,
          status: data.status as "active" | "inactive",
          studentIds: [],
          createdAt: data.created_at,
        };
      } else {
        console.error("Error creating batch:", error);
      }
    } catch (e) {
      console.error("Exception creating batch:", e);
    }
    return null;
  }
}
