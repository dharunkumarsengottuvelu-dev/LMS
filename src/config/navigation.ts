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
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon?: any;
  aliases?: string[];
}

/**
 * Enterprise Admin Portal Navigation
 * Exactly: Overview | Learners | Programs | Skill Lab | Code Lab | Assess | Live | Management
 */
export const adminNavigation: NavItem[] = [
  {
    label: "Overview",
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
    label: "Programs",
    href: "/admin/assigned-courses",
    aliases: ["/admin/courses", "/admin/batches", "/admin/assigned-courses", "/admin/modules"],
    icon: BookOpen,
  },
  {
    label: "Skill Lab",
    href: "/admin/practices",
    aliases: ["/admin/practices"],
    icon: Dumbbell,
  },
  {
    label: "Code Lab",
    href: "/admin/coding",
    aliases: ["/admin/coding", "/coding"],
    icon: Code2,
  },
  {
    label: "Assess",
    href: "/admin/assessments",
    aliases: ["/admin/tests", "/admin/assessments"],
    icon: ClipboardList,
  },
  {
    label: "Live",
    href: "/admin/live-classes",
    aliases: ["/admin/live-classes"],
    icon: Video,
  },
  {
    label: "Management",
    href: "/admin/users",
    aliases: ["/admin/users", "/admin/settings"],
    icon: ShieldCheck,
  },
];

/**
 * Student Learning Portal Navigation
 * Exactly: Home | Learning | Skill Lab | Code Lab | Assess | Live | Profile
 */
export const studentNavigation: NavItem[] = [
  {
    label: "Home",
    href: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Learning",
    href: "/student/my-courses",
    aliases: ["/student/courses", "/student/my-courses", "/courses"],
    icon: BookOpen,
  },
  {
    label: "Skill Lab",
    href: "/student/practices",
    aliases: ["/student/practices"],
    icon: Dumbbell,
  },
  {
    label: "Code Lab",
    href: "/coding",
    aliases: [
      "/coding/problems",
      "/student/coding",
      "/coding/assignments",
      "/coding/submissions",
      "/coding/leaderboard",
    ],
    icon: Code2,
  },
  {
    label: "Assess",
    href: "/student/tests",
    aliases: ["/student/assessments", "/student/tests", "/assessments"],
    icon: ClipboardList,
  },
  {
    label: "Live",
    href: "/student/live-classes",
    aliases: ["/student/live", "/student/live-classes", "/live"],
    icon: Video,
  },
  {
    label: "Profile",
    href: "/student/profile",
    aliases: ["/student/profile", "/profile"],
    icon: User,
  },
];

/**
 * Trainer Portal Navigation
 * Exactly: Overview | Learners | Programs | Skill Lab | Code Lab | Assess | Live | Management
 */
export const trainerNavigation: NavItem[] = [
  {
    label: "Overview",
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
    label: "Programs",
    href: "/trainer/courses",
    aliases: ["/trainer/courses", "/trainer/modules", "/trainer/my-courses"],
    icon: BookOpen,
  },
  {
    label: "Skill Lab",
    href: "/trainer/practices",
    aliases: ["/trainer/practices"],
    icon: Dumbbell,
  },
  {
    label: "Code Lab",
    href: "/trainer/coding",
    aliases: ["/trainer/coding", "/coding"],
    icon: Code2,
  },
  {
    label: "Assess",
    href: "/trainer/assessments",
    aliases: ["/trainer/assessments", "/trainer/tests"],
    icon: ClipboardList,
  },
  {
    label: "Live",
    href: "/trainer/live-classes",
    aliases: ["/trainer/live-classes"],
    icon: Video,
  },
  {
    label: "Management",
    href: "/trainer/analytics",
    aliases: ["/trainer/analytics", "/trainer/reports", "/trainer/management"],
    icon: ShieldCheck,
  },
];
