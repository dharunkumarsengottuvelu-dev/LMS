export interface ManagedModuleItem {
  id: string;
  courseId?: string;
  courseTitle: string;
  title: string;
  duration: string;
  type: "video" | "coding" | "mcq" | "reading" | "quiz";
  sequenceOrder: number;
  contentSummary: string;
  assignedBatches: string[];
  assignedStudents: string[];
  videoUrl?: string;
  notes?: string;
  practiceDescription?: string;
  practiceTestCases?: string;
  practiceStarterCode?: string;
  quizQuestions?: string;
  lessons?: any[];
}

export class ModuleService {
  static async getModules(): Promise<ManagedModuleItem[]> {
    try {
      const res = await fetch("/api/admin/modules");
      if (res.ok) {
        const json = await res.json();
        if (json.modules && Array.isArray(json.modules)) {
          return json.modules;
        }
      }
    } catch (e) {
      console.warn("Direct fetch /api/admin/modules failed in ModuleService:", e);
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("modules")
        .select("*, course:courses(title)")
        .order("order_index", { ascending: true });

      if (!error && data) {
        return data.map((d: any) => {
          let meta: any = {};
          if (d.description && d.description.startsWith("{")) {
            try {
              meta = JSON.parse(d.description);
            } catch {}
          }
          return {
            id: d.id,
            courseId: d.course_id,
            courseTitle: d.course?.title || meta.courseTitle || "Enterprise Course",
            title: d.title,
            duration: meta.duration || "45 mins",
            type: meta.type || "video",
            sequenceOrder: d.order_index || 0,
            contentSummary: meta.summary || d.description || "",
            assignedBatches: meta.assignedBatches || [],
            assignedStudents: meta.assignedStudents || [],
            videoUrl: meta.videoUrl,
            notes: meta.notes,
          };
        });
      }
    } catch (e) {
      console.error("ModuleService direct query failed:", e);
    }

    return [];
  }

  static async upsertModule(mod: ManagedModuleItem): Promise<{ success: boolean; module?: any; error?: string }> {
    try {
      const res = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mod),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save module");
      return { success: true, module: data.module };
    } catch (e: any) {
      console.error("ModuleService upsert error:", e);
      return { success: false, error: e.message };
    }
  }

  static async deleteModule(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/modules?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete module");
      return { success: true };
    } catch (e: any) {
      console.error("ModuleService delete error:", e);
      return { success: false, error: e.message };
    }
  }
}
