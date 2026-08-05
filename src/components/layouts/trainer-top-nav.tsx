"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User, LogOut, LayoutDashboard, Users, BookOpen, ClipboardList, FileText, Dumbbell } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const trainerNavItems = [
  { href: "/trainer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trainer/students", label: "Cohort Students", icon: Users },
  { href: "/trainer/courses", label: "Assigned Courses", icon: BookOpen },
  { href: "/trainer/practices", label: "Practices", icon: Dumbbell },
  { href: "/trainer/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/trainer/assignments", label: "Submissions", icon: FileText },
];

export function TrainerTopNav() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between px-6 lg:px-10">
      {/* Brand Logo */}
      <Link href="/trainer/dashboard" className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#9333EA] flex items-center justify-center text-white font-bold text-base shadow-sm">
          E
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            EduNexus
          </span>
          <Badge className="bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/30 text-[10px] font-bold px-2 py-0.5">
            TRAINER
          </Badge>
        </div>
      </Link>

      {/* Centered Nav Links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2">
        {trainerNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/trainer/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all",
                isActive
                  ? "bg-[#9333EA]/10 text-[#9333EA] dark:bg-[#9333EA]/20 dark:text-[#C084FC]"
                  : "text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls & User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#F9FAFB] dark:hover:bg-[#27272A] transition-colors cursor-pointer border border-[#E5E7EB] dark:border-[#27272A]">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#9333EA]/10 text-[#9333EA] text-xs font-bold">
                  {getInitials(`${profile?.first_name ?? "T"} ${profile?.last_name ?? ""}`)}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-1 rounded-xl shadow-xl">
            <DropdownMenuLabel className="font-normal p-3">
              <p className="font-bold text-xs text-[#111827] dark:text-[#FAFAFA]">
                {profile?.first_name || "Trainer"} {profile?.last_name || "Instructor"}
              </p>
              <p className="text-[11px] text-[#6B7280]">Lead Technical Trainer</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-[#DC2626] font-bold text-xs cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
