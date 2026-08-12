import { createClient } from "@/lib/supabase/client";


export class StudentService {
  static async getStudents(): Promise<any[]> { // Using any[] temporarily, should match StudentUserRecord or StudentRecord
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*, batches(name)")
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((s: any) => ({
          id: s.id,
          employeeId: "EMP-" + s.id.substring(0, 8),
          name: `${s.first_name} ${s.last_name}`,
          email: s.email || `${s.first_name.toLowerCase()}@example.com`,
          department: s.department || "General",
          designation: s.designation || "Student",
          techTrack: s.tech_track || "General Track",
          role: s.role,
          status: s.status,
          avgScore: s.avg_score || 0,
          mcqAccuracy: s.mcq_accuracy || 0,
          codingAccuracy: s.coding_accuracy || 0,
          proctoringCompliance: s.proctoring_compliance || 100,
          violationCount: s.violation_count || 0,
          joinedDate: s.joined_date || s.created_at.slice(0, 10),
          batchId: s.batch_id || undefined,
          batch: s.batches ? s.batches.name : s.batch_name || "Not Assigned",
          skills: s.skills || [],
          githubUrl: s.github_url || "",
          linkedinUrl: s.linkedin_url || "",
          certificationsEarned: [],
          testsTaken: [],
          practicesSubmitted: [],
          dailyProgress: [],
          proctoringLogs: [],
          activityLogs: [],
          systemInfo: {
            os: "Unknown",
            browser: "Unknown",
            ipAddress: "Unknown",
            lastActive: "Unknown",
            status: "Idle",
            currentPage: "/student/dashboard",
          },
        }));
      }
    } catch {
      // Supabase connection unconfigured or failed
    }
    return [];
  }
}
