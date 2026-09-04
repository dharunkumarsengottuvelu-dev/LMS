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

export const SAMPLE_ASSIGNMENTS: CodingAssignment[] = [];

let cachedAssignments: CodingAssignment[] = [];

export class CodingAssignmentsService {
  /**
   * Fetches coding assignments dynamically from the database API route
   */
  public static async fetchAssignments(): Promise<CodingAssignment[]> {
    try {
      const res = await fetch("/api/coding/assignments", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Failed to fetch assignments, status:", res.status);
        return cachedAssignments;
      }

      const data = await res.json();
      if (data && Array.isArray(data.assignments)) {
        cachedAssignments = data.assignments;
        return data.assignments;
      }
    } catch (e) {
      console.error("Failed to load assignments from API:", e);
    }
    return cachedAssignments;
  }

  /**
   * Synchronous getter returning latest cached assignments from database
   */
  public static getAssignments(): CodingAssignment[] {
    return cachedAssignments;
  }

  public static getAssignmentById(id: string): CodingAssignment | undefined {
    return cachedAssignments.find((a) => a.id === id);
  }

  /**
   * Saves or creates a coding assignment by sending a POST request to backend API
   */
  public static async saveAssignment(assignment: Omit<CodingAssignment, "id"> & { id?: string }): Promise<boolean> {
    try {
      const res = await fetch("/api/coding/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignment),
      });

      if (res.ok) {
        await this.fetchAssignments();
        return true;
      }
    } catch (e) {
      console.error("Failed to save assignment to database:", e);
    }
    return false;
  }
}
