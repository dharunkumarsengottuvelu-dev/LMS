"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "./auth-provider";
import { usePathname } from "next/navigation";
import { toast } from "@/hooks/use-toast";

// 2 hours in milliseconds
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000;

export function SessionTimeout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const lastActivityRef = useRef<number>(Date.now());

  // Update activity timestamp on user interaction
  const updateActivity = () => {
    const now = Date.now();
    lastActivityRef.current = now;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("edunexus_last_activity", now.toString());
      } catch (err) {
        // Ignore quota/permissions errors
      }
    }
  };

  useEffect(() => {
    // Only apply timeout for logged-in students in the student portal
    if (!profile || profile.role !== "student" || !pathname?.startsWith("/student")) {
      return;
    }

    // Initialize from localStorage in case it was updated in another tab
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("edunexus_last_activity");
        if (stored) {
          lastActivityRef.current = parseInt(stored, 10);
        } else {
          updateActivity();
        }
      } catch (err) {}
    }

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

    // Add event listeners
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, updateActivity, { passive: true });
    });

    // Check inactivity every 1 minute
    const intervalId = setInterval(() => {
      let lastActivity = lastActivityRef.current;
      
      // Sync with localStorage to respect activity in other tabs
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("edunexus_last_activity");
          if (stored) {
            const storedTime = parseInt(stored, 10);
            if (storedTime > lastActivity) {
              lastActivity = storedTime;
              lastActivityRef.current = lastActivity;
            }
          }
        } catch (err) {}
      }

      if (Date.now() - lastActivity >= INACTIVITY_TIMEOUT) {
        clearInterval(intervalId);
        toast({
          title: "Session Expired",
          description: "You have been logged out due to 2 hours of inactivity.",
          variant: "destructive",
        });
        signOut();
      }
    }, 60 * 1000); // Check every minute

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, updateActivity);
      });
      clearInterval(intervalId);
    };
  }, [profile, pathname, signOut]);

  return <>{children}</>;
}
