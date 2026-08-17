"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookOpen, Users, ClipboardList,
  Calendar, FileText, Code2, BarChart3, Bell, LogOut,
  Menu, X, ChevronDown, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";

const trainerNavItems = [
  { label: "Dashboard", href: "/trainer/dashboard", icon: LayoutDashboard },
  { label: "My Courses", href: "/trainer/my-courses", icon: BookOpen },
  { label: "Students", href: "/trainer/students", icon: Users },
  { label: "Assessments", href: "/trainer/assessments", icon: ClipboardList },
  { label: "Coding Problems", href: "/trainer/coding", icon: Code2 },
  { label: "Tests", href: "/trainer/tests", icon: Calendar },
  { label: "Assignments", href: "/trainer/assignments", icon: FileText },
  { label: "Reports", href: "/trainer/reports", icon: BarChart3 },
  { label: "Notifications", href: "/trainer/notifications", icon: Bell },
];

export function TrainerSidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div>
          <p className="font-extrabold text-xl tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
            FALCON<span className="text-[#9333EA] font-black">.</span>
          </p>
          <p className="text-xs text-muted-foreground">Trainer Panel</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {trainerNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(`${profile?.first_name ?? "T"} ${profile?.last_name ?? ""}`)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.first_name} {profile?.last_name}</p>
            <p className="text-xs text-muted-foreground truncate">Trainer</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-card border-r border-border fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>
      <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 lg:hidden" onClick={() => setMobileOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border z-50 lg:hidden">
              <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></Button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
