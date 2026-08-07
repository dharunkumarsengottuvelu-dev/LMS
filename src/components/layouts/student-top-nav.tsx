"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User, LogOut, LayoutDashboard, BookOpen, Dumbbell, ClipboardList, FileText } from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

const studentNavItems = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Assigned Courses", href: "/student/my-courses", icon: BookOpen },
  { label: "Practices", href: "/student/assessments", icon: Dumbbell },
  { label: "Assessments", href: "/student/tests", icon: ClipboardList },
  { label: "Submissions", href: "/student/assignments", icon: FileText },
];

export function StudentTopNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { profile, user, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between px-6 lg:px-10">
      {/* Brand Logo */}
      <Link href="/student/dashboard" suppressHydrationWarning className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-bold text-base shadow-sm">
          E
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            EduNexus
          </span>
          <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 text-[10px] font-bold px-2 py-0.5">
            STUDENT
          </Badge>
        </div>
      </Link>

      {/* Centered Nav Links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2">
        {studentNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all",
                isActive
                  ? "bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#2563EB]/20 dark:text-[#60A5FA]"
                  : "text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">

          {/* Notifications */}
          <Link
            href="/student/notifications"
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Link>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 rounded-full cursor-pointer overflow-hidden border border-[#E5E7EB] dark:border-[#27272A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] text-xs font-bold">
                  {getInitials(profile?.full_name ?? "Student User")}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {profile?.full_name ?? "Dharunkumar S"}
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    {user?.email || "dharunkumar@gmail.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E5E7EB] dark:bg-[#27272A]" />
              <DropdownMenuItem
                className="cursor-pointer text-xs flex items-center gap-2"
                onClick={() => window.location.href = "/student/profile"}
              >
                <User className="h-3.5 w-3.5 text-[#6B7280]" /> Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#E5E7EB] dark:bg-[#27272A]" />
              <DropdownMenuItem
                className="cursor-pointer text-xs text-[#DC2626] focus:text-[#DC2626] focus:bg-[#DC2626]/10 flex items-center gap-2"
                onClick={() => signOut()}
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    </header>
  );
}
