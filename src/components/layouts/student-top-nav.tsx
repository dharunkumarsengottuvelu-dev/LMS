"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, LayoutDashboard, BookOpen, Dumbbell, ClipboardList, FileText, Menu, User, Settings, Code2 } from "lucide-react";
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
  { label: "Practices", href: "/student/practices", icon: Dumbbell },
  { label: "Assessments", href: "/student/assessments", icon: ClipboardList },
  { label: "Submissions", href: "/student/assignments", icon: FileText },
];

export function StudentTopNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { profile, user, signOut } = useAuth();

  const emailStr = user?.email || "";
  const emailParts = (emailStr.split("@")[0] || "").split(/[\.\-_]/);
  const defaultFirstName = emailParts[0] ? emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) : "Student";
  const defaultLastName = emailParts.length > 1 && emailParts[1] ? emailParts[1].charAt(0).toUpperCase() : "";
  const displayName = profile?.full_name && profile.full_name !== "User" && profile.full_name !== "Student User" 
    ? profile.full_name 
    : `${defaultFirstName} ${defaultLastName}`.trim();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-10 transition-colors duration-200">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <Link href="/student/dashboard" suppressHydrationWarning className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-sm transition-transform duration-200 group-hover:scale-105">
            F
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-foreground">
              FALCON
            </span>
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
              prefetch={true}
              className={cn(
                "flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap duration-200 ease-out hover:-translate-y-[1px]",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
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
          prefetch={true}
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200 border border-input shadow-sm"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Link>

        {/* Mobile Hamburger Menu Trigger */}
        <Sheet>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg h-9 w-9 text-muted-foreground hover:bg-accent border border-input shadow-sm transition-all duration-200">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-background border-l border-border p-6">
            <SheetHeader className="text-left pb-4 border-b border-border">
              <SheetTitle className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  F
                </div>
                <span className="font-bold text-base text-foreground">FALCON</span>
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
                    prefetch={true}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="h-9 w-9 rounded-full cursor-pointer overflow-hidden border border-input focus:outline-none focus:ring-2 focus:ring-ring transition-transform hover:scale-105 duration-200">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border p-1 rounded-xl shadow-modal">
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-foreground break-all">
                  {displayName}
                </p>
                <p className="text-[11px] text-muted-foreground break-all uppercase font-medium tracking-wider">
                  {user?.email ? `@${user.email.split('@')[0]}` : "@student"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="cursor-pointer font-medium text-xs">
              <Link href="/student/profile" className="flex items-center w-full text-foreground hover:text-primary transition-colors">
                <User className="h-4 w-4 mr-2 text-primary" /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={signOut} className="text-destructive font-medium text-xs cursor-pointer hover:bg-destructive/10 transition-colors">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
