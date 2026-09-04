import { createClient } from "@/lib/supabase/client";

export interface ManagedModuleItem {
  id: string;
  courseTitle: string;
  title: string;
  duration: string;
  type: "video" | "coding" | "mcq";
  sequenceOrder: number;
  contentSummary: string;
  assignedBatches: string[];
  assignedStudents: string[];
  videoUrl?: string;
  notes?: string;
  practiceDescription?: string;
  practiceTestCases?: string;
  practiceStarterCode?: string;
}

export class ModuleService {
  static async getModules(): Promise<ManagedModuleItem[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("lessons")
        .select("*");
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          courseTitle: d.courses?.title || "Unknown Course",
          title: d.title,
          duration: `${d.video_duration || 30} mins`,
          type: d.type === "quiz" ? "mcq" : d.type,
          sequenceOrder: d.order || 0,
          contentSummary: d.content || "",
          assignedBatches: [], // Mocking for now
          assignedStudents: [],
          videoUrl: d.video_url
        }));
      }
    } catch (e) {
      console.error(e);
    }
    
    return [];
  }

  static async upsertModule(mod: ManagedModuleItem): Promise<boolean> {
    try {
      const supabase = createClient();
      const { error } = await (supabase as any).from("lessons").upsert({
        id: mod.id.startsWith("mod_") ? undefined : mod.id,
        course_id: "00000000-0000-0000-0000-000000000000",
        module_id: "00000000-0000-0000-0000-000000000000",
        title: mod.title,
        type: mod.type === "mcq" ? "quiz" : mod.type,
        content: mod.contentSummary,
        order: mod.sequenceOrder,
        video_url: mod.videoUrl
      });
      if (error) {
        console.error("Error upserting module", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error(e);
    }
    return false;
  }
}
