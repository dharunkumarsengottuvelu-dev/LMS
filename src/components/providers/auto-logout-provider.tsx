"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { usePathname } from "next/navigation";

// 2 hours in milliseconds
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

function getPageTitle(pathname: string, role?: string): string {
  if (!pathname || pathname === "/") {
    return "SensilLearn";
  }

  const normalized = pathname.toLowerCase().replace(/\/$/, "");

  // Auth pages
  if (normalized === "/login" || normalized === "/auth/login") return "SensilLearn | Login";
  if (normalized === "/register" || normalized === "/auth/register") return "SensilLearn | Register";
  if (normalized === "/forgot-password") return "SensilLearn | Forgot Password";
  if (normalized === "/reset-password") return "SensilLearn | Reset Password";

  // Public pages
  if (normalized === "/about") return "SensilLearn | About";
  if (normalized === "/contact") return "SensilLearn | Contact";
  if (normalized === "/courses") return "SensilLearn | Courses";
  if (normalized === "/pricing") return "SensilLearn | Pricing";
  if (normalized === "/unauthorized") return "SensilLearn | Unauthorized";

  // Student portal pages
  if (normalized === "/student/dashboard") return "SensilLearn | Student Dashboard";
  if (normalized === "/student/my-courses") return "SensilLearn | Courses";
  if (normalized.startsWith("/student/course/")) return "SensilLearn | Courses";
  if (normalized === "/student/practices") return "SensilLearn | Practice";
  if (normalized.startsWith("/student/practices/coding/")) return "SensilLearn | Coding Practice";
  if (normalized.startsWith("/student/practices/")) return "SensilLearn | Practice";
  if (normalized === "/student/assessments") return "SensilLearn | Assessments";
  if (normalized.startsWith("/student/assessments/tracks/")) return "SensilLearn | Assessment Track";
  if (normalized.startsWith("/student/assessments/")) return "SensilLearn | Assessment";
  if (normalized === "/student/coding") return "SensilLearn | Coding";
  if (normalized === "/student/assignments") return "SensilLearn | Assignments";
  if (normalized === "/student/tests") return "SensilLearn | Tests";
  if (normalized.startsWith("/student/tests/")) return "SensilLearn | Test";
  if (normalized === "/student/certificates") return "SensilLearn | Certificates";
  if (normalized === "/student/live-classes") return "SensilLearn | Live Classes";
  if (normalized.startsWith("/student/live-classes/")) return "SensilLearn | Live Class";
  if (normalized === "/student/messages") return "SensilLearn | Messages";
  if (normalized === "/student/notifications") return "SensilLearn | Notifications";
  if (normalized === "/student/reports") return "SensilLearn | Reports";
  if (normalized === "/student/profile") return "SensilLearn | Profile";
  if (normalized === "/student/settings") return "SensilLearn | Settings";

  // Trainer portal pages
  if (normalized === "/trainer/dashboard") return "SensilLearn | Trainer Dashboard";
  if (normalized === "/trainer/courses") return "SensilLearn | Courses";
  if (normalized === "/trainer/modules") return "SensilLearn | Modules";
  if (normalized === "/trainer/practices") return "SensilLearn | Practice";
  if (normalized === "/trainer/assessments") return "SensilLearn | Assessments";
  if (normalized === "/trainer/assignments") return "SensilLearn | Assignments";
  if (normalized === "/trainer/coding") return "SensilLearn | Coding";
  if (normalized === "/trainer/students") return "SensilLearn | Students";
  if (normalized === "/trainer/analytics") return "SensilLearn | Analytics";
  if (normalized === "/trainer/live-classes") return "SensilLearn | Live Classes";
  if (normalized === "/trainer/live-classes/new") return "SensilLearn | Schedule Live Class";
  if (normalized.startsWith("/trainer/live-classes/")) return "SensilLearn | Live Class";
  if (normalized === "/trainer/messages") return "SensilLearn | Messages";
  if (normalized === "/trainer/notifications") return "SensilLearn | Notifications";
  if (normalized === "/trainer/profile") return "SensilLearn | Profile";

  // Admin portal pages
  if (normalized === "/admin/dashboard") return "SensilLearn | Admin Dashboard";
  if (normalized === "/admin/courses") return "SensilLearn | Courses";
  if (normalized === "/admin/assigned-courses") return "SensilLearn | Assigned Courses";
  if (normalized === "/admin/modules") return "SensilLearn | Modules";
  if (normalized === "/admin/lessons") return "SensilLearn | Lessons";
  if (normalized === "/admin/categories") return "SensilLearn | Categories";
  if (normalized === "/admin/practices") return "SensilLearn | Practice";
  if (normalized === "/admin/assessments") return "SensilLearn | Assessments";
  if (normalized === "/admin/assignments") return "SensilLearn | Assignments";
  if (normalized === "/admin/submissions") return "SensilLearn | Submissions";
  if (normalized === "/admin/tests") return "SensilLearn | Tests";
  if (normalized.startsWith("/admin/tests/inspect/")) return "SensilLearn | Test Inspection";
  if (normalized === "/admin/coding") return "SensilLearn | Coding";
  if (normalized === "/admin/compiler") return "SensilLearn | Online Compiler";
  if (normalized === "/admin/batches") return "SensilLearn | Batches";
  if (normalized === "/admin/students") return "SensilLearn | Students";
  if (normalized === "/admin/trainers") return "SensilLearn | Trainers";
  if (normalized === "/admin/users") return "SensilLearn | Users";
  if (normalized === "/admin/certificates") return "SensilLearn | Certificates";
  if (normalized === "/admin/student-performance") return "SensilLearn | Student Performance";
  if (normalized === "/admin/analytics") return "SensilLearn | Analytics";
  if (normalized === "/admin/reports") return "SensilLearn | Reports";
  if (normalized === "/admin/live-classes") return "SensilLearn | Live Classes";
  if (normalized === "/admin/live-classes/new") return "SensilLearn | Schedule Live Class";
  if (normalized.startsWith("/admin/live-classes/")) return "SensilLearn | Live Class";
  if (normalized === "/admin/messages") return "SensilLearn | Messages";
  if (normalized === "/admin/notifications") return "SensilLearn | Notifications";
  if (normalized === "/admin/profile") return "SensilLearn | Profile";
  if (normalized === "/admin/settings") return "SensilLearn | Settings";

  // Institution portal pages
  if (normalized === "/institution" || normalized === "/institution/overview") {
    const userRole = (role || "").toLowerCase();
    if (userRole === "hod") return "SensilLearn | HOD Dashboard";
    if (userRole === "principal") return "SensilLearn | Principal Dashboard";
    return "SensilLearn | Institution Dashboard";
  }
  if (normalized === "/institution/performance") return "SensilLearn | Performance";
  if (normalized === "/institution/batches") return "SensilLearn | Batches";
  if (normalized === "/institution/reports") return "SensilLearn | Reports";
  if (normalized === "/institution/profile") return "SensilLearn | Profile";

  // Coding & IDE pages
  if (normalized === "/coding" || normalized === "/coding/problems") return "SensilLearn | Coding";
  if (normalized.startsWith("/coding/problems/")) return "SensilLearn | Coding";
  if (normalized === "/ide/playground") return "SensilLearn | Code Playground";

  // Fallback formatting for any unmapped nested route
  const segments = normalized.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (last) {
    const formatted = last
      .split(/[-_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return `SensilLearn | ${formatted}`;
  }

  return "SensilLearn";
}

export function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  
  // Update browser tab title whenever pathname or user role changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = getPageTitle(pathname || "", profile?.role);
    }
  }, [pathname, profile?.role]);

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
