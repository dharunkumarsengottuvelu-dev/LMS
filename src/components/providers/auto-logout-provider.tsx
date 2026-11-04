"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { usePathname } from "next/navigation";

// 2 hours in milliseconds
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

function getPageTitle(pathname: string, role?: string): string {
  if (!pathname || pathname === "/") {
    return "SensiLearn";
  }

  const normalized = pathname.toLowerCase().replace(/\/$/, "");

  // Auth pages
  if (normalized === "/login" || normalized === "/auth/login") return "SensiLearn | Login";
  if (normalized === "/register" || normalized === "/auth/register") return "SensiLearn | Register";
  if (normalized === "/forgot-password") return "SensiLearn | Forgot Password";
  if (normalized === "/reset-password") return "SensiLearn | Reset Password";

  // Public pages
  if (normalized === "/about") return "SensiLearn | About";
  if (normalized === "/contact") return "SensiLearn | Contact";
  if (normalized === "/courses") return "SensiLearn | Courses";
  if (normalized === "/pricing") return "SensiLearn | Pricing";
  if (normalized === "/unauthorized") return "SensiLearn | Unauthorized";

  // Student portal pages
  if (normalized === "/student/dashboard") return "SensiLearn | Dashboard";
  if (normalized === "/student/classes" || normalized === "/student/batches") return "SensiLearn | Batches";
  if (normalized === "/student/my-courses") return "SensiLearn | Courses";
  if (normalized.startsWith("/student/course/")) return "SensiLearn | Courses";
  if (normalized === "/student/practices") return "SensiLearn | Practice";
  if (normalized.startsWith("/student/practices/coding/")) return "SensiLearn | Coding Practice";
  if (normalized.startsWith("/student/practices/")) return "SensiLearn | Practice";
  if (normalized === "/student/assessments") return "SensiLearn | Assessments";
  if (normalized.startsWith("/student/assessments/tracks/")) return "SensiLearn | Assessment Track";
  if (normalized.startsWith("/student/assessments/")) return "SensiLearn | Assessment";
  if (normalized === "/student/coding") return "SensiLearn | Challenges";
  if (normalized === "/student/assignments") return "SensiLearn | Assignments";
  if (normalized === "/student/tests") return "SensiLearn | Assessments";
  if (normalized.startsWith("/student/tests/")) return "SensiLearn | Assessment";
  if (normalized === "/student/certificates") return "SensiLearn | Certificates";
  if (normalized === "/student/live-classes") return "SensiLearn | Live Classes";
  if (normalized.startsWith("/student/live-classes/")) return "SensiLearn | Live Class";
  if (normalized === "/student/messages") return "SensiLearn | Messages";
  if (normalized === "/student/notifications") return "SensiLearn | Notifications";
  if (normalized === "/student/reports") return "SensiLearn | Reports";
  if (normalized === "/student/profile") return "SensiLearn | Profile";
  if (normalized === "/student/settings") return "SensiLearn | Settings";

  // Trainer portal pages
  if (normalized === "/trainer/dashboard") return "SensiLearn | Dashboard";
  if (normalized === "/trainer/students") return "SensiLearn | Learners";
  if (normalized === "/trainer/classes" || normalized === "/trainer/batches") return "SensiLearn | Batches";
  if (normalized === "/trainer/courses") return "SensiLearn | Courses";
  if (normalized === "/trainer/modules") return "SensiLearn | Modules";
  if (normalized === "/trainer/practices") return "SensiLearn | Practice";
  if (normalized === "/trainer/assessments") return "SensiLearn | Assessments";
  if (normalized === "/trainer/assignments") return "SensiLearn | Assignments";
  if (normalized === "/trainer/coding") return "SensiLearn | Challenges";
  if (normalized === "/trainer/analytics") return "SensiLearn | Analytics";
  if (normalized === "/trainer/live-classes") return "SensiLearn | Live Classes";
  if (normalized === "/trainer/live-classes/new") return "SensiLearn | Schedule Live Class";
  if (normalized.startsWith("/trainer/live-classes/")) return "SensiLearn | Live Class";
  if (normalized === "/trainer/messages") return "SensiLearn | Messages";
  if (normalized === "/trainer/notifications") return "SensiLearn | Notifications";
  if (normalized === "/trainer/profile") return "SensiLearn | Profile";

  // Admin portal pages
  if (normalized === "/admin/dashboard") return "SensiLearn | Dashboard";
  if (normalized === "/admin/student-performance" || normalized === "/admin/students") return "SensiLearn | Learners";
  if (normalized === "/admin/batches" || normalized === "/admin/classes") return "SensiLearn | Batches";
  if (normalized === "/admin/courses" || normalized === "/admin/assigned-courses") return "SensiLearn | Courses";
  if (normalized === "/admin/modules") return "SensiLearn | Modules";
  if (normalized === "/admin/lessons") return "SensiLearn | Lessons";
  if (normalized === "/admin/categories") return "SensiLearn | Categories";
  if (normalized === "/admin/practices") return "SensiLearn | Practice";
  if (normalized === "/admin/assessments") return "SensiLearn | Assessments";
  if (normalized === "/admin/assignments") return "SensiLearn | Assignments";
  if (normalized === "/admin/submissions") return "SensiLearn | Submissions";
  if (normalized === "/admin/tests") return "SensiLearn | Assessments";
  if (normalized.startsWith("/admin/tests/inspect/")) return "SensiLearn | Assessment Inspection";
  if (normalized === "/admin/coding") return "SensiLearn | Challenges";
  if (normalized === "/admin/compiler") return "SensiLearn | Online Compiler";
  if (normalized === "/admin/trainers") return "SensiLearn | Trainers";
  if (normalized === "/admin/users") return "SensiLearn | User Management";
  if (normalized === "/admin/certificates") return "SensiLearn | Certificates";
  if (normalized === "/admin/analytics") return "SensiLearn | Analytics";
  if (normalized === "/admin/reports") return "SensiLearn | Reports";
  if (normalized === "/admin/live-classes") return "SensiLearn | Live Classes";
  if (normalized === "/admin/live-classes/new") return "SensiLearn | Schedule Live Class";
  if (normalized.startsWith("/admin/live-classes/")) return "SensiLearn | Live Class";
  if (normalized === "/admin/messages") return "SensiLearn | Messages";
  if (normalized === "/admin/notifications") return "SensiLearn | Notifications";
  if (normalized === "/admin/profile") return "SensiLearn | Profile";
  if (normalized === "/admin/settings") return "SensiLearn | Settings";

  // Institution portal pages
  if (normalized === "/institution" || normalized === "/institution/overview") {
    const userRole = (role || "").toLowerCase();
    if (userRole === "hod") return "SensiLearn | HOD Dashboard";
    if (userRole === "principal") return "SensiLearn | Principal Dashboard";
    return "SensiLearn | Institution Dashboard";
  }
  if (normalized === "/institution/performance") return "SensiLearn | Performance";
  if (normalized === "/institution/batches") return "SensiLearn | Batches";
  if (normalized === "/institution/reports") return "SensiLearn | Reports";
  if (normalized === "/institution/profile") return "SensiLearn | Profile";

  // Coding & IDE pages
  if (normalized === "/coding" || normalized === "/coding/problems") return "SensiLearn | Challenges";
  if (normalized.startsWith("/coding/problems/")) return "SensiLearn | Challenges";
  if (normalized === "/ide/playground") return "SensiLearn | Code Playground";

  // Fallback formatting for any unmapped nested route
  const segments = normalized.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (last) {
    const formatted = last
      .split(/[-_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return `SensiLearn | ${formatted}`;
  }

  return "SensiLearn";
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
