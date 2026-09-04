"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, LayoutDashboard, BookOpen, Dumbbell, ClipboardList, FileText, Menu, User, Settings, Code2, BarChart3 } from "lucide-react";
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
import { NotificationBellDropdown } from "@/components/notifications/notification-bell-dropdown";
import { studentNavigation, adminNavigation, trainerNavigation } from "@/config/navigation";

export function StudentTopNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { profile, user, signOut } = useAuth();

  const userRole = (
    profile?.role ||
    (user?.email?.toLowerCase().includes("admin")
      ? "admin"
      : user?.email?.toLowerCase().includes("trainer")
      ? "trainer"
      : "student")
  ).toLowerCase();

  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const isTrainer = userRole === "trainer";

  const navItems = isAdmin
    ? adminNavigation
    : isTrainer
    ? trainerNavigation
    : studentNavigation.slice(0, 6);

  const mobileNavItems = isAdmin
    ? adminNavigation
    : isTrainer
    ? trainerNavigation
    : studentNavigation;

  const homeHref = isAdmin ? "/admin/dashboard" : isTrainer ? "/trainer/dashboard" : "/student/dashboard";

  const emailStr = user?.email || "";
  const emailParts = (emailStr.split("@")[0] || "").split(/[\.\-_]/);
  const defaultFirstName = emailParts[0] ? emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) : "Student";
  const defaultLastName = emailParts.length > 1 && emailParts[1] ? emailParts[1].charAt(0).toUpperCase() : "";
  const displayName = profile?.full_name && profile.full_name !== "User" && profile.full_name !== "Student User" 
    ? profile.full_name 
    : `${defaultFirstName} ${defaultLastName}`.trim();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-background/80 backdrop-blur-md border-b border-border transition-colors duration-200">
      <div className="lms-page-container h-full flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center shrink-0">
          <Link href={homeHref} suppressHydrationWarning className="flex items-center gap-2 shrink-0 group">
            <span className="font-extrabold text-xl tracking-tight text-foreground">
              FALCON<span className="text-primary font-black">.</span>
            </span>
            {isAdmin && (
              <Badge variant="outline" className="hidden sm:inline-flex bg-primary/5 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5">
                ADMIN
              </Badge>
            )}
            {isTrainer && (
              <Badge variant="outline" className="hidden sm:inline-flex bg-[#2563EB]/5 text-[#2563EB] border-[#2563EB]/20 text-[10px] font-bold px-2 py-0.5">
                TRAINER
              </Badge>
            )}
          </Link>
        </div>

        {/* Centered Desktop Nav Links */}
        <div className="hidden lg:flex flex-1 items-center justify-center min-w-0 px-2">
          <nav className="flex items-center gap-0.5 xl:gap-1.5 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => {
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
          {/* Notifications Icon with Dynamic Dropdown & Badge */}
          <NotificationBellDropdown />

          {/* Mobile Hamburger Menu Trigger */}
          <Sheet>
            <SheetTrigger className="lg:hidden inline-flex items-center justify-center rounded-lg h-9 w-9 text-muted-foreground hover:bg-accent border border-input shadow-sm transition-all duration-200">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-background border-l border-border p-6">
            <SheetHeader className="text-left pb-4 border-b border-border">
              <SheetTitle className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-foreground">
                  FALCON<span className="text-primary font-black">.</span>
                </span>
                {isAdmin && (
                  <Badge variant="outline" className="bg-primary/10 text-primary text-[9px] font-bold border-primary/20">ADMIN</Badge>
                )}
                {isTrainer && (
                  <Badge variant="outline" className="bg-[#2563EB]/10 text-[#2563EB] text-[9px] font-bold border-[#2563EB]/30">TRAINER</Badge>
                )}
              </SheetTitle>
            </SheetHeader>

            <nav className="flex flex-col gap-1.5 pt-6">
              {mobileNavItems.map((item) => {
                const isExact = pathname === item.href;
                const isSubpath = !item.href.endsWith("/dashboard") && pathname.startsWith(item.href);
                const isAlias = (item.aliases || []).some((alias) => pathname === alias || (!alias.endsWith("/dashboard") && pathname.startsWith(alias)));
                const isActive = isExact || isSubpath || isAlias;
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
            {((profile?.role as string) === "admin" || (profile?.role as string) === "super_admin" || user?.email?.toLowerCase().includes("admin")) && (
              <DropdownMenuItem className="cursor-pointer font-bold text-xs text-primary bg-primary/5 hover:bg-primary/10 transition-colors">
                <Link href="/admin/dashboard" className="flex items-center w-full">
                  <LayoutDashboard className="h-4 w-4 mr-2 text-primary" /> Switch to Admin Portal
                </Link>
              </DropdownMenuItem>
            )}
            {(profile?.role === "trainer" || user?.email?.toLowerCase().includes("trainer")) && (
              <DropdownMenuItem className="cursor-pointer font-bold text-xs text-primary bg-primary/5 hover:bg-primary/10 transition-colors">
                <Link href="/trainer/dashboard" className="flex items-center w-full">
                  <LayoutDashboard className="h-4 w-4 mr-2 text-primary" /> Switch to Trainer Portal
                </Link>
              </DropdownMenuItem>
            )}
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
