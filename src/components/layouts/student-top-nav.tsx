"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, User, LogOut, Settings, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
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
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "My Courses", href: "/student/my-courses" },
  { label: "Practice Tracks", href: "/student/assessments" },
  { label: "Scheduled Tests", href: "/student/tests" },
  { label: "Assignments", href: "/student/assignments" },
];

export function StudentTopNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[68px] bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] shadow-xs backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between gap-6 px-6 md:px-8">
        
        {/* MNC Clean Brand Logo (WITHOUT STUDENT TAG) */}
        <Link href="/student/dashboard" className="flex items-center gap-3 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
            E
          </div>
          <span className="font-bold text-lg text-[#111827] dark:text-[#FAFAFA] tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
            EduNexus
          </span>
        </Link>

        {/* MNC Enterprise Horizontal Nav Links (Text-focused, clean, no funky icons) */}
        <nav className="hidden md:flex items-center gap-1 flex-1 mx-4 overflow-x-auto no-scrollbar">
          {studentNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/student/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 h-10 flex items-center text-xs font-semibold whitespace-nowrap transition-all duration-150 relative",
                  isActive
                    ? "text-[#2563EB] font-bold border-b-2 border-[#2563EB]"
                    : "text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                )}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {/* Search Input */}
          <div className="relative hidden lg:block w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
            <Input
              placeholder="Search portal..."
              className="pl-8.5 h-9 text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563EB]"
            />
          </div>

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
                    student@edunexus.io
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
