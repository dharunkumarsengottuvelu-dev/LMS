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
  Code2,
  MessageSquare,
  Boxes,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon?: any;
  aliases?: string[];
}

/**
 * Enterprise Admin Portal Navigation
 * Exactly: Dashboard | Learners | Classes | Courses | Practice | Challenges | Assessments | Live Classes | User Management
 */
export const adminNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Learners",
    href: "/admin/student-performance",
    aliases: ["/admin/students", "/admin/student-performance", "/admin/analytics"],
    icon: Users,
  },
  {
    label: "Batches",
    href: "/admin/batches",
    aliases: ["/admin/batches", "/admin/classes"],
    icon: Boxes,
  },
  {
    label: "Courses",
    href: "/admin/assigned-courses",
    aliases: ["/admin/courses", "/admin/assigned-courses", "/admin/modules", "/admin/lessons", "/admin/categories"],
    icon: BookOpen,
  },
  {
    label: "Practice",
    href: "/admin/practices",
    aliases: ["/admin/practices"],
    icon: Dumbbell,
  },
  {
    label: "Challenges",
    href: "/admin/coding",
    aliases: ["/admin/coding", "/coding", "/admin/compiler"],
    icon: Code2,
  },
  {
    label: "Assessments",
    href: "/admin/assessments",
    aliases: ["/admin/tests", "/admin/assessments"],
    icon: ClipboardList,
  },
  {
    label: "Live Classes",
    href: "/admin/live-classes",
    aliases: ["/admin/live-classes"],
    icon: Video,
  },
  {
    label: "User Management",
    href: "/admin/users",
    aliases: ["/admin/users", "/admin/trainers", "/admin/settings"],
    icon: ShieldCheck,
  },
];

/**
 * Student Learning Portal Navigation
 * Exactly: Dashboard | Courses | Practice | Challenges | Assessments | Live Classes
 */
export const studentNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Courses",
    href: "/student/my-courses",
    aliases: ["/student/courses", "/student/my-courses", "/courses", "/student/course"],
    icon: BookOpen,
  },
  {
    label: "Practice",
    href: "/student/practices",
    aliases: ["/student/practices"],
    icon: Dumbbell,
  },
  {
    label: "Challenges",
    href: "/coding",
    aliases: [
      "/coding/problems",
      "/student/coding",
      "/coding/assignments",
      "/coding/submissions",
      "/coding/leaderboard",
      "/coding",
    ],
    icon: Code2,
  },
  {
    label: "Assessments",
    href: "/student/tests",
    aliases: ["/student/assessments", "/student/tests", "/assessments"],
    icon: ClipboardList,
  },
  {
    label: "Live Classes",
    href: "/student/live-classes",
    aliases: ["/student/live", "/student/live-classes", "/live"],
    icon: Video,
  },
];

/**
 * Trainer Portal Navigation
 * Exactly: Dashboard | Learners | Batches | Courses | Practice | Challenges | Assessments | Live Classes
 */
export const trainerNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/trainer/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Learners",
    href: "/trainer/students",
    aliases: ["/trainer/students", "/trainer/learners"],
    icon: Users,
  },
  {
    label: "Batches",
    href: "/trainer/classes",
    aliases: ["/trainer/classes", "/trainer/batches"],
    icon: Boxes,
  },
  {
    label: "Courses",
    href: "/trainer/courses",
    aliases: ["/trainer/courses", "/trainer/modules", "/trainer/my-courses"],
    icon: BookOpen,
  },
  {
    label: "Practice",
    href: "/trainer/practices",
    aliases: ["/trainer/practices"],
    icon: Dumbbell,
  },
  {
    label: "Challenges",
    href: "/trainer/coding",
    aliases: ["/trainer/coding", "/coding"],
    icon: Code2,
  },
  {
    label: "Assessments",
    href: "/trainer/assessments",
    aliases: ["/trainer/assessments", "/trainer/tests"],
    icon: ClipboardList,
  },
  {
    label: "Live Classes",
    href: "/trainer/live-classes",
    aliases: ["/trainer/live-classes"],
    icon: Video,
  },
];
