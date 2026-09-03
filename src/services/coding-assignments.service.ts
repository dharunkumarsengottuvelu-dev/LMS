export interface CodingAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  problemIds: string[];
  trainerName: string;
  maxScore: number;
  assignedCohort: string;
  status: "pending" | "in_progress" | "completed";
}

// Clean initial assignments array - no fake mock assignments
export const SAMPLE_ASSIGNMENTS: CodingAssignment[] = [];

const LOCAL_STORAGE_KEY_CODING_ASSIGNMENTS = "falcon_coding_assignments_v2";

export class CodingAssignmentsService {
  public static getAssignments(): CodingAssignment[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_CODING_ASSIGNMENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to load assignments from storage:", e);
    }
    return [];
  }

  public static getAssignmentById(id: string): CodingAssignment | undefined {
    return this.getAssignments().find((a) => a.id === id);
  }

  public static saveAssignment(assignment: CodingAssignment): void {
    if (typeof window === "undefined") return;
    try {
      const list = this.getAssignments();
      const idx = list.findIndex((a) => a.id === assignment.id);
      if (idx >= 0) {
        list[idx] = assignment;
      } else {
        list.unshift(assignment);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY_CODING_ASSIGNMENTS, JSON.stringify(list));
    } catch (e) {
      console.error("Failed to save assignment:", e);
    }
  }
}
