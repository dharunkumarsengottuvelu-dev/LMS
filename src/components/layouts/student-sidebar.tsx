"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookOpen, ClipboardList, Calendar,
  FileText, Code2, Award, Bell, Settings, LogOut, Menu, X, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";

const studentNavItems = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "My Courses", href: "/student/my-courses", icon: BookOpen },
  { label: "Practice", href: "/student/assessments", icon: ClipboardList },
  { label: "Tests", href: "/student/tests", icon: Calendar },
  { label: "Assignments", href: "/student/assignments", icon: FileText },
  { label: "Notifications", href: "/student/notifications", icon: Bell },
  { label: "Profile", href: "/student/profile", icon: User },
  { label: "Settings", href: "/student/settings", icon: Settings },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#18181B] border-r border-[#E5E7EB] dark:border-[#27272A]">
      {/* 72px Top Header */}
      <div className="flex items-center gap-3 px-6 h-[72px] border-b border-[#E5E7EB] dark:border-[#27272A] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-semibold text-sm">
          E
        </div>
        <div>
          <p className="font-semibold text-sm text-[#111827] dark:text-[#FAFAFA]" style={{ fontFamily: "Inter, sans-serif" }}>
            EduNexus
          </p>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">Student Portal</p>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {studentNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 h-11 rounded-lg text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-[#F5F5F5] dark:bg-[#27272A] text-[#2563EB] dark:text-[#2563EB] font-semibold border-l-2 border-[#2563EB] rounded-l-none"
                  : "text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F5F5F5] dark:hover:bg-[#27272A]"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-[#E5E7EB] dark:border-[#27272A] shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#27272A] transition-colors">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold">
              {getInitials(`${profile?.first_name ?? "S"} ${profile?.last_name ?? ""}`)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#111827] dark:text-[#FAFAFA] truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] truncate">Student</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#6B7280] hover:text-[#DC2626]"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar 280px */}
      <aside className="hidden lg:block w-[280px] h-screen fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden h-10 w-10"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 top-0 h-screen w-[280px] z-50 lg:hidden"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
