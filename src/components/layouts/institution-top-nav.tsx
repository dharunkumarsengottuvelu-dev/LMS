"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const institutionNavigation = [
  { label: "Overview", href: "/institution/overview", aliases: ["/institution"] },
  { label: "Batches", href: "/institution/batches" },
  { label: "Performance", href: "/institution/performance" },
  { label: "Reports", href: "/institution/reports" },
  { label: "Profile", href: "/institution/profile" },
];

export function InstitutionTopNav() {
  const pathname = usePathname();
  const { profile, user, signOut } = useAuth();

  const collegeName = (profile as any)?.college || profile?.first_name || "Institution";
  const userRole = (profile?.role || user?.user_metadata?.role || "institution").toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-background/85 backdrop-blur-md border-b border-border transition-colors duration-200">
      <div className="lms-page-container h-full flex items-center justify-between gap-4">
        {/* Brand Logo & Portal Identification */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/institution/overview" className="flex items-center gap-2 group">
            <span className="font-extrabold text-xl tracking-tight text-foreground">
              FALCON<span className="text-primary font-black">.</span>
            </span>
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5 tracking-wider"
            >
              INSTITUTION
            </Badge>
          </Link>
        </div>

        {/* Core Clean Navigation Tabs (Zero Decorative Icons) */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
          {institutionNavigation.map((item) => {
            const isExact = pathname === item.href;
            const isSubpath = !item.href.endsWith("/overview") && pathname.startsWith(item.href);
            const isAlias = (item.aliases || []).some(
              (alias) => pathname === alias || (!alias.endsWith("/overview") && pathname.startsWith(alias))
            );
            const isActive = isExact || isSubpath || isAlias;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 border",
                  isActive
                    ? "bg-primary/10 text-primary border-primary/20 font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Institution Identity & Account */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-foreground tracking-tight max-w-[180px] truncate">
              {collegeName}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {userRole}
            </span>
          </div>

          {/* User Account Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="flex items-center gap-2 p-1 rounded-md hover:bg-accent transition-colors cursor-pointer border border-input">
                <Avatar className="h-7 w-7 rounded-sm">
                  <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-bold rounded-sm">
                    {getInitials(collegeName || "IN")}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-popover border-border p-1 rounded-lg shadow-md">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs text-foreground tracking-tight truncate">
                    {collegeName}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-mono">
                    {user?.email || "institution@portal"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="cursor-pointer font-medium text-xs">
                <Link href="/institution/profile" className="flex items-center w-full text-foreground hover:text-primary transition-colors">
                  Institution Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-medium text-xs">
                <Link href="/institution/reports" className="flex items-center w-full text-foreground hover:text-primary transition-colors">
                  Performance Reports
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive font-medium text-xs cursor-pointer hover:bg-destructive/10 transition-colors"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden border-t border-border/80 bg-background/95 px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {institutionNavigation.map((item) => {
          const isExact = pathname === item.href;
          const isSubpath = !item.href.endsWith("/overview") && pathname.startsWith(item.href);
          const isAlias = (item.aliases || []).some((a) => pathname === a);
          const isActive = isExact || isSubpath || isAlias;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap rounded border",
                isActive
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
