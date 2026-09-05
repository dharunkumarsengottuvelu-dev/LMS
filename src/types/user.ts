export type UserRole = "super_admin" | "admin" | "trainer" | "student" | "recruiter" | "institution";
export type UserStatus = "active" | "suspended" | "pending";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: UserProfile;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  skills: string[];
  role: UserRole;
  status: UserStatus;
  student_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserInput {
  first_name?: string;
  last_name?: string;
  bio?: string;
  phone?: string;
  avatar_url?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  website_url?: string;
  skills?: string[];
}

export interface UpdatePasswordInput {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface Batch {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  created_by: string;
  created_at: string;
  members?: BatchMember[];
  member_count?: number;
}

export interface BatchMember {
  id: string;
  batch_id: string;
  user_id: string;
  joined_at: string;
  user?: UserProfile;
}
