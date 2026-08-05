export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface SearchParams {
  query?: string;
}

export interface FilterParams {
  [key: string]: string | number | boolean | string[] | undefined;
}

export type QueryParams = PaginationParams & SortParams & SearchParams & FilterParams;

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  change_type?: "increase" | "decrease" | "neutral";
  icon: string;
  color: string;
  href?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  children?: NavigationItem[];
  roles?: string[];
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  name: string;
  type: string;
}

export interface StudentProgress {
  student_id: string;
  course_id: string;
  completed_lessons: number;
  total_lessons: number;
  progress_percentage: number;
  last_accessed: string | null;
  started_at: string;
  completed_at: string | null;
  time_spent_minutes: number;
}

export interface DashboardStats {
  total_students: number;
  total_trainers: number;
  total_courses: number;
  total_assessments: number;
  total_tests: number;
  total_coding_problems: number;
  recent_registrations: number;
  active_enrollments: number;
}

export interface LeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  score: number;
  assessments_completed: number;
  courses_completed: number;
  streak_days: number;
}
