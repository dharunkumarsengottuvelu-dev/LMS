"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, ClipboardList, Code2, Calendar,
  FileText, Award, Bell, Settings, Sun, Moon, Monitor, LogOut, Search, User
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { label: "My Courses", href: "/student/my-courses", icon: BookOpen },
  { label: "Assessments", href: "/student/assessments", icon: ClipboardList },
  { label: "Coding IDE", href: "/student/coding", icon: Code2 },
  { label: "Tests", href: "/student/tests", icon: Calendar },
  { label: "Assignments", href: "/student/assignments", icon: FileText },
  { label: "Certificates", href: "/student/certificates", icon: Award },
];

export function StudentTopNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[72px] bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] flex items-center px-8 gap-6">
      {/* Brand Logo */}
      <Link href="/student/dashboard" className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-base">
          E
        </div>
        <div>
          <span className="font-semibold text-base text-[#111827] dark:text-[#FAFAFA]" style={{ fontFamily: "Inter, sans-serif" }}>
            EduNexus
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#2563EB] ml-2 px-2 py-0.5 rounded bg-[#2563EB]/10">
            Student
          </span>
        </div>
      </Link>

      {/* Horizontal Nav Links */}
      <nav className="hidden lg:flex items-center gap-1 flex-1 ml-4">
        {studentNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3.5 h-10 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#2563EB] text-white font-semibold shadow-sm"
                  : "text-[#4B5563] dark:text-[#D1D5DB] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Search */}
        <div className="relative hidden md:block w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4B5563]" />
          <Input placeholder="Search portal..." className="pl-9 h-10 text-xs bg-[#F9FAFB] dark:bg-[#09090B]" />
        </div>

        {/* Notifications */}
        <Link
          href="/student/notifications"
          className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5 text-[#4B5563] dark:text-[#D1D5DB]" />
        </Link>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              {theme === "dark" ? (
                <Moon className="h-5 w-5 text-[#FAFAFA]" />
              ) : (
                <Sun className="h-5 w-5 text-[#111827]" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="h-9 w-9 rounded-full cursor-pointer overflow-hidden border border-[#E5E7EB] dark:border-[#27272A]">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold">
                  {getInitials(`${profile?.first_name ?? "S"} ${profile?.last_name ?? ""}`)}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal p-3">
              <p className="font-semibold text-sm text-[#111827] dark:text-[#FAFAFA]">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">Student</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/student/profile" className="w-full flex items-center gap-2">
                <User className="h-4 w-4" /> Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/student/settings" className="w-full flex items-center gap-2">
                <Settings className="h-4 w-4" /> Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-[#DC2626] focus:text-[#DC2626] flex items-center gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
