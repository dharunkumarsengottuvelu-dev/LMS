export interface LMSBatch {
  id: string;
  batchName: string;         // e.g. "ABC College – Java Development – Batch 01"
  collegeName: string;       // e.g. "ABC College"
  course: string;            // e.g. "Java Development"
  startDate: string;         // e.g. "2026-08-01"
  endDate: string;           // e.g. "2026-12-31"
  joiningTime: string;       // e.g. "Morning Session (09:00 AM)"
  trainer: string;           // e.g. "Dr. Aris Thorne"
  status: "active" | "inactive";
  studentIds: string[];      // List of assigned student IDs
  createdAt: string;
}
