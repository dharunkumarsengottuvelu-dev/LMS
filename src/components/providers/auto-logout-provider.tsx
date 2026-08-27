"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { usePathname } from "next/navigation";

// 2 hours in milliseconds
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  
  // Use a ref for the timeout ID so we can clear it properly
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only track idle time if the user is logged in, is a student, and not on auth pages
    if (!user || profile?.role !== "student" || pathname?.startsWith("/auth")) return;

    const handleActivity = () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      
      timeoutIdRef.current = setTimeout(() => {
        toast({
          title: "Session Expired",
          description: "You have been logged out due to inactivity.",
          variant: "destructive",
        });
        signOut();
      }, IDLE_TIMEOUT_MS);
    };

    // Set initial timeout
    handleActivity();

    // We throttle the event listener slightly to avoid performance issues with mousemove
    let isThrottled = false;
    const throttledHandleActivity = () => {
      if (isThrottled) return;
      isThrottled = true;
      handleActivity();
      setTimeout(() => {
        isThrottled = false;
      }, 500); // Only reset timer max once every 500ms
    };

    // Attach event listeners for user activity
    const events = ["mousemove", "keydown", "wheel", "touchstart", "click"];
    events.forEach((event) => 
      window.addEventListener(event, throttledHandleActivity, { passive: true })
    );

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      events.forEach((event) => 
        window.removeEventListener(event, throttledHandleActivity)
      );
    };
  }, [user, profile?.role, pathname, signOut, toast]);

  return <>{children}</>;
}
