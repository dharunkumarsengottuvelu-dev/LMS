"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, User } from "lucide-react";
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
import { NotificationBellDropdown } from "@/components/notifications/notification-bell-dropdown";

const institutionNavigation = [
  { label: "Overview", href: "/institution/overview", aliases: ["/institution"] },
  { label: "Batches", href: "/institution/batches" },
  { label: "Performance", href: "/institution/performance" },
  { label: "Reports", href: "/institution/reports" },
];

export function InstitutionTopNav() {
  const pathname = usePathname();
  const { profile, user, signOut } = useAuth();

  const collegeName = (profile as any)?.college || profile?.first_name || "Institution";
  const userRole = (profile?.role || user?.user_metadata?.role || "institution").toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-background/80 backdrop-blur-md border-b border-border transition-colors duration-200">
      <div className="lms-page-container h-full flex items-center justify-between gap-4">
        {/* Brand Logo & Portal Identification */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/institution/overview" className="flex items-center gap-2.5 shrink-0 group">
            <span className="font-extrabold text-xl tracking-tight text-foreground">
              FALCON<span className="text-primary font-black">.</span>
            </span>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex bg-primary/5 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5 tracking-wider"
            >
              INSTITUTION
            </Badge>
          </Link>
        </div>

        {/* Centered Desktop Clean Navigation Tabs (No Decorative Icons) */}
        <div className="hidden lg:flex flex-1 items-center justify-center min-w-0 px-2">
          <nav className="flex items-center gap-1 xl:gap-2 overflow-x-auto no-scrollbar py-1">
            {institutionNavigation.map((item) => {
              const isActive =
                item.href === "/institution/overview"
                  ? pathname === "/institution/overview" || pathname === "/institution"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center px-3 xl:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap duration-150 ease-out hover:-translate-y-[0.5px]",
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

        {/* Right Section: Identity, Notifications, Account Menu, Mobile Drawer */}
        <div className="flex items-center gap-3 shrink-0">
          <NotificationBellDropdown />

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-foreground tracking-tight max-w-[160px] truncate">
              {collegeName}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {userRole}
            </span>
          </div>

          {/* Mobile Sheet Menu */}
          <Sheet>
            <SheetTrigger className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-card border-r border-border p-6">
              <SheetHeader className="text-left pb-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-foreground">
                    FALCON<span className="text-primary font-black">.</span>
                  </span>
                  <Badge variant="outline" className="bg-primary/10 text-primary text-[9px] font-bold border-primary/20">
                    INSTITUTION
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1.5 pt-6">
                {institutionNavigation.map((item) => {
                  const isActive =
                    item.href === "/institution/overview"
                      ? pathname === "/institution/overview" || pathname === "/institution"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
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

          {/* Profile Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="flex items-center gap-2 p-1 rounded-full hover:bg-accent transition-colors cursor-pointer border border-input">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(collegeName || "IN")}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-popover border-border p-1 rounded-xl shadow-modal">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground tracking-tight truncate">
                    {collegeName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email || "institution@portal"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="cursor-pointer font-medium text-xs">
                <Link href="/institution/profile" className="flex items-center w-full text-foreground hover:text-primary transition-colors">
                  <User className="h-4 w-4 mr-2 text-primary" /> Institution Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive font-medium text-xs cursor-pointer hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
