import { createClient } from "@/lib/supabase/client";

export class StudentService {
  static async getStudents(params?: {
    page?: number;
    limit?: number;
    search?: string;
    batch?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      if (typeof window !== "undefined") {
        const q = new URLSearchParams();
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        if (params?.search) q.set("search", params.search);
        if (params?.batch) q.set("batch", params.batch);
        if (params?.status) q.set("status", params.status);

        const res = await fetch(`/api/admin/students?${q.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            return json.data;
          }
        }
      }
    } catch (e) {
      console.warn("Direct API fetch failed in StudentService, falling back to direct Supabase query:", e);
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((s: any) => ({
          id: s.id,
          employeeId: "EMP-" + s.id.substring(0, 8),
          name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email?.split("@")[0] || "Student",
          firstName: s.first_name || "",
          lastName: s.last_name || "",
          email: s.email || "",
          department: s.department || "Engineering",
          designation: s.designation || "Student",
          techTrack: s.tech_track || s.branch || "Computer Science",
          role: s.role || "student",
          status: s.status || "active",
          avgScore: s.avg_score || 0,
          mcqAccuracy: s.mcq_accuracy || 0,
          codingAccuracy: s.coding_accuracy || 0,
          proctoringCompliance: s.proctoring_compliance || 100,
          violationCount: s.violation_count || 0,
          joinedDate: s.created_at ? s.created_at.slice(0, 10) : "",
          batchId: s.batch_id || undefined,
          batch: s.batch_name || s.batch || "Not Assigned",
          skills: s.skills || [],
          githubUrl: s.github || s.github_url || "",
          linkedinUrl: s.linkedin || s.linkedin_url || "",
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
    } catch (err) {
      console.error("Supabase direct query failed:", err);
    }
    return [];
  }

  static async createStudent(payload: {
    email: string;
    firstName: string;
    lastName?: string;
    batch?: string;
    college?: string;
    branch?: string;
  }): Promise<{ success: boolean; student?: any; error?: string }> {
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create student");
      return { success: true, student: data.student };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async updateStudent(id: string, updates: any): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update student");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async deleteStudent(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/students?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete student");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
