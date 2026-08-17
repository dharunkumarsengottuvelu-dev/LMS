"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Users, BookOpen, ClipboardList, FileText, Dumbbell, Activity, Menu, User, Settings, Bell } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  { href: "/trainer/students", label: "Manage Students", icon: Users },
  { href: "/trainer/analytics", label: "Student Performance", icon: Activity },
  { href: "/trainer/courses", label: "Assigned Courses", icon: BookOpen },
  { href: "/trainer/practices", label: "Practices", icon: Dumbbell },
  { href: "/trainer/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/trainer/assignments", label: "Submissions", icon: FileText },
];

export function TrainerTopNav() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const emailStr = user?.email || "";
  const emailParts = (emailStr.split("@")[0] || "").split(/[\.\-_]/);
  const defaultFirstName = emailParts[0] ? emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) : "Trainer";
  const defaultLastName = emailParts.length > 1 && emailParts[1] ? emailParts[1].charAt(0).toUpperCase() : "";
  const displayName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ""}`.trim() 
    : `${defaultFirstName} ${defaultLastName}`.trim();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-10 transition-colors duration-200">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <Link href="/trainer/dashboard" suppressHydrationWarning className="flex items-center gap-2.5 shrink-0 group">
          <span className="font-extrabold text-xl tracking-tight text-foreground">
            FALCON<span className="text-[#9333EA] font-black">.</span>
          </span>
          <Badge variant="outline" className="hidden sm:inline-flex bg-[#9333EA]/5 text-[#9333EA] border-[#9333EA]/20 text-[10px] font-bold px-2 py-0.5">
            TRAINER
          </Badge>
        </Link>
      </div>

      {/* Centered Desktop Nav Links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2 overflow-x-auto no-scrollbar">
        {trainerNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/trainer/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap duration-200 ease-out hover:-translate-y-[1px]",
                isActive
                  ? "bg-[#9333EA]/10 text-[#9333EA]"
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
        <Link
          href="/trainer/notifications"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200 border border-input shadow-sm"
        >
          <Bell className="h-4 w-4" />
        </Link>

        {/* Mobile Hamburger Menu Trigger */}
        <Sheet>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg h-9 w-9 text-muted-foreground hover:bg-accent border border-input shadow-sm transition-all duration-200">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-background border-l border-border p-6">
            <SheetHeader className="text-left pb-4 border-b border-border">
              <SheetTitle className="flex items-center gap-2.5">
                <span className="font-extrabold text-xl text-foreground">
                  FALCON<span className="text-[#9333EA] font-black">.</span>
                </span>
                <Badge variant="outline" className="bg-[#9333EA]/10 text-[#9333EA] text-[9px] font-bold border-[#9333EA]/30">TRAINER</Badge>
              </SheetTitle>
            </SheetHeader>

            <nav className="flex flex-col gap-1.5 pt-6">
              {trainerNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/trainer/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-[#9333EA]/10 text-[#9333EA] dark:bg-[#9333EA]/20 dark:text-[#C084FC]"
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

        {/* Profile Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-2.5 p-1 rounded-full hover:bg-accent transition-colors cursor-pointer border border-input">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#9333EA]/10 text-[#9333EA] text-xs font-bold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 bg-popover border-border p-1 rounded-xl shadow-modal">
            <DropdownMenuLabel className="font-normal p-3">
              <p className="font-semibold text-sm text-foreground break-all">
                {displayName}
              </p>
              <p className="text-[11px] text-muted-foreground">Lead Technical Trainer</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="cursor-pointer font-medium text-xs">
              <Link href="/trainer/profile" className="flex items-center w-full text-foreground hover:text-[#9333EA] transition-colors">
                <User className="h-4 w-4 mr-2 text-[#9333EA]" /> My Profile
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
