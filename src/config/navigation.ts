import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  Dumbbell,
  ShieldCheck,
  Bell,
  User,
  GraduationCap,
  Video,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon?: any;
  aliases?: string[];
}

/**
 * Enterprise Admin Portal Navigation
 */
export const adminNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Student Performance",
    href: "/admin/student-performance",
    aliases: ["/admin/students"],
    icon: Users,
  },
  {
    label: "Assigned Courses",
    href: "/admin/assigned-courses",
    aliases: ["/admin/courses"],
    icon: BookOpen,
  },
  {
    label: "Practices",
    href: "/admin/practices",
    icon: Dumbbell,
  },
  {
    label: "Assessments",
    href: "/admin/assessments",
    aliases: ["/admin/tests"],
    icon: ClipboardList,
  },
  {
    label: "Live Classes",
    href: "/admin/live-classes",
    icon: Video,
  },
  {
    label: "Manage Users",
    href: "/admin/users",
    icon: ShieldCheck,
  },
];

/**
 * Student Learning Portal Navigation
 */
export const studentNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Assigned Courses",
    href: "/student/my-courses",
    aliases: ["/student/courses"],
    icon: BookOpen,
  },
  {
    label: "Practices",
    href: "/student/practices",
    icon: Dumbbell,
  },
  {
    label: "Assessments",
    href: "/student/tests",
    aliases: ["/student/assessments"],
    icon: ClipboardList,
  },
  {
    label: "Live Classes",
    href: "/student/live-classes",
    aliases: ["/student/live"],
    icon: Video,
  },
  {
    label: "Notifications",
    href: "/student/notifications",
    icon: Bell,
  },
  {
    label: "Profile",
    href: "/student/profile",
    icon: User,
  },
];

/**
 * Trainer Portal Navigation
 */
export const trainerNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/trainer/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Assigned Courses",
    href: "/trainer/courses",
    icon: BookOpen,
  },
  {
    label: "Practices",
    href: "/trainer/practices",
    icon: Dumbbell,
  },
  {
    label: "Assessments",
    href: "/trainer/assessments",
    icon: ClipboardList,
  },
  {
    label: "Live Classes",
    href: "/trainer/live-classes",
    icon: Video,
  },
  {
    label: "Students",
    href: "/trainer/students",
    icon: Users,
  },
];
