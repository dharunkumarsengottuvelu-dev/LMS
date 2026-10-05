"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatStudentId } from "@/services/student-id.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBellDropdown } from "@/components/notifications/notification-bell-dropdown";
import { studentNavigation } from "@/config/navigation";

export function StudentTopNav() {
  const pathname = usePathname();
  const { profile, user, signOut } = useAuth();

  const emailStr = user?.email || "";
  const emailParts = (emailStr.split("@")[0] || "").split(/[\.\-_]/);
  const defaultFirstName = emailParts[0] ? emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) : "Student";
  const defaultLastName = emailParts.length > 1 && emailParts[1] ? emailParts[1].charAt(0).toUpperCase() : "";
  const displayName = profile?.full_name && profile.full_name !== "User" && profile.full_name !== "Student User" 
    ? profile.full_name 
    : `${defaultFirstName} ${defaultLastName}`.trim();

  const displayAvatar =
    profile?.avatar_url ||
    (user?.user_metadata as any)?.avatar_url ||
    (user?.user_metadata as any)?.picture ||
    undefined;

  const studentId = useMemo(() => {
    const metaId = (user?.user_metadata as any)?.student_id;
    if (metaId && typeof metaId === "string" && metaId.startsWith("STID-")) {
      return metaId;
    }
    const profileId = (profile as any)?.student_id;
    if (profileId && typeof profileId === "string" && profileId.startsWith("STID-")) {
      return profileId;
    }
    const joiningDate = user?.created_at || (profile as any)?.created_at || "2026-08-05T00:00:00.000Z";
    const seq = (user?.user_metadata as any)?.student_seq || 1;
    return formatStudentId(seq, joiningDate);
  }, [profile, user]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-background/80 backdrop-blur-md border-b border-border transition-colors duration-200">
      <div className="lms-page-container h-full flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center shrink-0">
          <Link href="/student/dashboard" suppressHydrationWarning className="flex items-center gap-2 shrink-0 group">
            <span className="font-extrabold text-xl tracking-tight text-foreground">
              SENSILEARN<span className="text-primary font-black">.</span>
            </span>
          </Link>
        </div>

        {/* Centered Desktop Nav Links — Exclusively Student Navigation */}
        <div className="hidden lg:flex flex-1 items-center justify-center min-w-0 px-2">
          <nav className="flex items-center gap-0.5 xl:gap-1.5 overflow-x-auto no-scrollbar py-1">
            {studentNavigation.map((item) => {
              const isExact = pathname === item.href;
              const isSubpath = !item.href.endsWith("/dashboard") && pathname.startsWith(item.href);
              const isAlias = (item.aliases || []).some((alias) => pathname === alias || (!alias.endsWith("/dashboard") && pathname.startsWith(alias)));
              const isActive = isExact || isSubpath || isAlias;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap duration-150 ease-out hover:-translate-y-[0.5px]",
                    isActive
                      ? "bg-primary/10 text-primary font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Controls (Notification, Mobile Menu Drawer, User Profile) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notifications Dropdown */}
          <NotificationBellDropdown />

          {/* Mobile Hamburger Menu Drawer */}
          <Sheet>
            <SheetTrigger className="lg:hidden inline-flex items-center justify-center rounded-lg h-9 w-9 text-muted-foreground hover:bg-accent border border-input shadow-sm transition-all duration-200">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-background border-l border-border p-6">
              <SheetHeader className="text-left pb-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-extrabold text-xl text-foreground">
                    SENSILEARN<span className="text-primary font-black">.</span>
                  </span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1.5 pt-6">
                {studentNavigation.map((item) => {
                  const isExact = pathname === item.href;
                  const isSubpath = !item.href.endsWith("/dashboard") && pathname.startsWith(item.href);
                  const isAlias = (item.aliases || []).some((alias) => pathname === alias || (!alias.endsWith("/dashboard") && pathname.startsWith(alias)));
                  const isActive = isExact || isSubpath || isAlias;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary font-bold"
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
                <AvatarImage src={displayAvatar ?? undefined} />
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
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {studentId}
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
      </div>
    </header>
  );
}
