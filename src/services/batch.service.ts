import type { LMSBatch } from "@/types/batch";

export class BatchService {
  static async getBatches(): Promise<LMSBatch[]> {
    try {
      const res = await fetch("/api/admin/batches", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.batches && Array.isArray(json.batches)) {
          return json.batches.map((b: any) => ({
            id: b.id,
            batchName: b.name || b.batchName || "Batch",
            collegeName: b.collegeName || "Enterprise Academy",
            course: b.course || b.courseName || "Fullstack Enterprise",
            startDate: b.startDate || "",
            endDate: b.endDate || "",
            joiningTime: b.joiningTime || "",
            trainer: b.trainer || b.trainerName || "Trainer",
            status: (b.status || "active") as "active" | "inactive",
            studentIds: b.studentIds || [],
            createdAt: b.createdAt || new Date().toISOString(),
          }));
        }
      }
    } catch (e) {
      console.warn("Notice: Fetching batches from API:", e);
    }
    return [];
  }

  static async createBatch(
    batchData: Omit<LMSBatch, "id" | "createdAt" | "studentIds">,
    trainerId?: string
  ): Promise<LMSBatch | null> {
    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: batchData.batchName,
          collegeName: batchData.collegeName,
          course: batchData.course,
          courseTrack: batchData.course,
          startDate: batchData.startDate,
          endDate: batchData.endDate,
          joiningTime: batchData.joiningTime,
          trainer: batchData.trainer,
          trainerId: trainerId || null,
          status: batchData.status || "active",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.batch) {
          const b = json.batch;
          return {
            id: b.id,
            batchName: b.name || b.batchName,
            collegeName: b.collegeName || batchData.collegeName || "Enterprise Academy",
            course: b.course || b.courseName || batchData.course || "Fullstack Enterprise",
            startDate: b.startDate || batchData.startDate,
            endDate: batchData.endDate || "",
            joiningTime: batchData.joiningTime || "",
            trainer: b.trainer || batchData.trainer || "Trainer",
            status: (b.status || "active") as "active" | "inactive",
            studentIds: b.studentIds || [],
            createdAt: b.createdAt || new Date().toISOString(),
          };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error("Batch creation failed:", errJson.error || res.statusText);
      }
    } catch (e) {
      console.error("Exception creating batch:", e);
    }
    return null;
  }

  static async deleteBatch(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/batches?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Error deleting batch:", e);
      return false;
    }
  }

  static async assignStudent(batchId: string, studentId: string): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/batches/assign-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, studentId, action: "assign" }),
      });
      return res.ok;
    } catch (e) {
      console.error("Error assigning student to batch:", e);
      return false;
    }
  }

  static async removeStudent(batchId: string, studentId: string): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/batches/assign-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, studentId, action: "remove" }),
      });
      return res.ok;
    } catch (e) {
      console.error("Error removing student from batch:", e);
      return false;
    }
  }
}
