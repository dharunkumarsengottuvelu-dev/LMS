"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
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
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "My Courses", href: "/student/my-courses" },
  { label: "Practice Tracks", href: "/student/assessments" },
  { label: "Scheduled Tests", href: "/student/tests" },
  { label: "Assignments", href: "/student/assignments" },
];

export function StudentTopNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { profile, user, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[68px] bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] shadow-xs backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between gap-6 px-6 md:px-8">
        
        {/* Left Brand Logo */}
        <Link href="/student/dashboard" className="flex items-center gap-3 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
            E
          </div>
          <span className="font-bold text-lg text-[#111827] dark:text-[#FAFAFA] tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
            EduNexus
          </span>
        </Link>

        {/* Center Nav Links (100% Centered Content with Perfect Active Underline) */}
        <nav className="hidden md:flex items-center justify-center gap-6 flex-1 mx-4 overflow-x-auto no-scrollbar">
          {studentNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/student/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "h-[68px] flex items-center text-xs font-semibold whitespace-nowrap transition-all duration-150 relative px-1",
                  isActive
                    ? "text-[#2563EB] font-bold"
                    : "text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                )}
              >
                <span className="relative flex items-center h-full">
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2563EB] rounded-t-full" />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">

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
      </div>
    </header>
  );
}
