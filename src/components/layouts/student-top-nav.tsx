"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, LayoutDashboard, BookOpen, Dumbbell, ClipboardList, FileText, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn, getInitials } from "@/lib/utils";
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
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between px-4 sm:px-6 lg:px-10">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <Link href="/student/dashboard" suppressHydrationWarning className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-bold text-base shadow-sm">
            E
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              EduNexus
            </span>
            <Badge className="hidden sm:inline-flex bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 text-[10px] font-bold px-2 py-0.5">
              STUDENT
            </Badge>
          </div>
        </Link>
      </div>

      {/* Centered Desktop Nav Links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2 overflow-x-auto no-scrollbar">
        {studentNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
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

      {/* Right Controls (Notification, Mobile Menu Drawer, User Profile) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notifications Icon */}
        <Link
          href="/student/notifications"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] transition-colors border border-[#E5E7EB] dark:border-[#27272A]"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Link>

        {/* Mobile Hamburger Menu Trigger (Placed Right Next to Notification) */}
        <Sheet>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg h-9 w-9 text-[#4B5563] dark:text-[#A1A1AA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] border border-[#E5E7EB] dark:border-[#27272A]">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-white dark:bg-[#18181B] border-l border-[#E5E7EB] dark:border-[#27272A] p-6">
            <SheetHeader className="text-left pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <SheetTitle className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm">
                  E
                </div>
                <span className="font-bold text-base text-[#111827] dark:text-[#FAFAFA]">EduNexus</span>
                <Badge className="bg-[#2563EB]/10 text-[#2563EB] text-[9px] font-bold">STUDENT</Badge>
              </SheetTitle>
            </SheetHeader>

            <nav className="flex flex-col gap-1.5 pt-6">
              {studentNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all",
                      isActive
                        ? "bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#2563EB]/20 dark:text-[#60A5FA]"
                        : "text-[#6B7280] dark:text-[#A1A1AA] hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

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
                  {profile?.full_name ?? "Student User"}
                </p>
                <p className="text-[11px] text-[#6B7280]">
                  {user?.email || "student@edunexus.edu"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#E5E7EB] dark:bg-[#27272A]" />
            <DropdownMenuItem onClick={signOut} className="text-[#DC2626] font-bold text-xs cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
