"use client";

import { Bell, Search, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import type { BreadcrumbItem } from "@/types";

interface TopNavProps {
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
  notificationCount?: number;
}

export function AdminTopNav({ breadcrumbs, title, notificationCount = 0 }: TopNavProps) {
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[280px] z-20 h-[72px] bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] flex items-center px-8 gap-6">
      {/* Breadcrumbs / Page Title */}
      <div className="flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#A1A1AA]">
            {breadcrumbs.map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span>/</span>}
                {item.href ? (
                  <Link href={item.href} className="hover:text-[#111827] dark:hover:text-[#FAFAFA] transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : title ? (
          <h2 className="text-lg font-semibold text-[#111827] dark:text-[#FAFAFA] truncate">
            {title}
          </h2>
        ) : null}
      </div>

      {/* Search Input (44px height) */}
      <div className="relative hidden md:block w-72">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280] dark:text-[#A1A1AA]" />
        <Input placeholder="Search system..." className="pl-10 h-[44px] text-sm bg-[#FAFAFA] dark:bg-[#09090B]" />
      </div>

      {/* Theme Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="icon" className="h-[44px] w-[44px]">
            {theme === "dark" ? (
              <Moon className="h-5 w-5 text-[#FAFAFA]" />
            ) : theme === "light" ? (
              <Sun className="h-5 w-5 text-[#111827]" />
            ) : (
              <Monitor className="h-5 w-5 text-[#6B7280]" />
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

      {/* Notifications */}
      <Link href="/admin/notifications" className="relative inline-flex items-center justify-center h-[44px] w-[44px] rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#27272A] transition-colors">
        <Bell className="h-5 w-5 text-[#6B7280] dark:text-[#A1A1AA]" />
        {notificationCount > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#DC2626]" />
        )}
      </Link>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="h-9 w-9 rounded-full cursor-pointer overflow-hidden border border-[#E5E7EB] dark:border-[#27272A]">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold">
                {getInitials(`${profile?.first_name ?? "A"} ${profile?.last_name ?? ""}`)}
              </AvatarFallback>
            </Avatar>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal p-3">
            <p className="font-semibold text-sm text-[#111827] dark:text-[#FAFAFA]">{profile?.first_name} {profile?.last_name}</p>
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">Administrator</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Link href="/admin/profile" className="w-full">Profile Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/admin/settings" className="w-full">System Configuration</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-[#DC2626] focus:text-[#DC2626]">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
