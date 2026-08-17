"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, FileText,
  BarChart3, Bell, Settings, ChevronDown, ChevronRight,
  Shield, Code2, Calendar, Award, FolderOpen, LogOut,
  Menu, X, Boxes, ClipboardList, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: string | number;
  children?: NavItem[];
}

const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    label: "Users",
    icon: Users,
    children: [
      { label: "All Users", href: "/admin/users", icon: Users },
      { label: "Students", href: "/admin/students", icon: GraduationCap },
      { label: "Trainers", href: "/admin/trainers", icon: Shield },
      { label: "Batches", href: "/admin/batches", icon: Boxes },
    ],
  },
  {
    label: "Content",
    icon: BookOpen,
    children: [
      { label: "Courses", href: "/admin/courses", icon: BookOpen },
      { label: "Categories", href: "/admin/categories", icon: FolderOpen },
      { label: "Modules", href: "/admin/modules", icon: FileText },
      { label: "Lessons", href: "/admin/lessons", icon: FileText },
    ],
  },
  {
    label: "Practice Modules",
    icon: ClipboardList,
    children: [
      { label: "All Practice Modules", href: "/admin/assessments", icon: ClipboardList },
      { label: "Scheduled Tests", href: "/admin/tests", icon: Calendar },
      { label: "Assignments", href: "/admin/assignments", icon: FileText },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    ],
  },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function NavItemComponent({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() =>
    item.children?.some((c) => c.href && pathname.startsWith(c.href)) ?? false
  );

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false;
  const Icon = item.icon;

  if (item.children) {
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-3 px-3.5 h-11 rounded-lg text-sm font-medium transition-colors",
            "text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F5F5F5] dark:hover:bg-[#27272A]",
            open && "text-[#111827] dark:text-[#FAFAFA]"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? (
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#6B7280]" />
          )}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden pl-4 space-y-0.5"
            >
              {item.children.map((child) => (
                <NavItemComponent key={child.href ?? child.label} item={child} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 px-3.5 h-11 rounded-lg text-sm font-medium transition-colors relative",
        isActive
          ? "bg-[#F5F5F5] dark:bg-[#27272A] text-[#2563EB] dark:text-[#2563EB] font-semibold border-l-2 border-[#2563EB] rounded-l-none"
          : "text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F5F5F5] dark:hover:bg-[#27272A]"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <Badge variant="secondary" className="text-xs px-2 py-0.5">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}

export function AdminSidebar() {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#18181B] border-r border-[#E5E7EB] dark:border-[#27272A]">
      {/* 72px Top Header */}
      <div className="flex items-center gap-3 px-6 h-[72px] border-b border-[#E5E7EB] dark:border-[#27272A] shrink-0">
        <div>
          <p className="font-extrabold text-xl text-[#111827] dark:text-[#FAFAFA] tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
            FALCON<span className="text-[#2563EB] font-black">.</span>
          </p>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">Enterprise Admin</p>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {adminNavItems.map((item) => (
          <NavItemComponent key={item.href ?? item.label} item={item} />
        ))}
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-[#E5E7EB] dark:border-[#27272A] shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#27272A] transition-colors">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold">
              {getInitials(`${profile?.first_name ?? "A"} ${profile?.last_name ?? ""}`)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#111827] dark:text-[#FAFAFA] truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] truncate">Administrator</p>
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
