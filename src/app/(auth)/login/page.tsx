"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

function resolveRoleDestination(role: string, nextUrl: string | null): string {
  const isSuperAdminOrAdmin = role === "super_admin" || role === "admin";
  const isInstitution = role === "institution";
  const isTrainer = role === "trainer";
  const isRecruiter = role === "recruiter";

  if (!nextUrl || !nextUrl.startsWith("/") || nextUrl.startsWith("/login") || nextUrl.startsWith("/register")) {
    switch (role) {
      case "super_admin":
      case "admin":
        return "/admin/dashboard";
      case "trainer":
        return "/trainer/dashboard";
      case "institution":
        return "/institution/overview";
      case "recruiter":
        return "/admin/students";
      default:
        return "/student/dashboard";
    }
  }

  const commonAllowedPrefixes = [
    "/courses",
    "/coding",
    "/ide",
    "/dashboard",
    "/practice",
    "/challenges",
    "/assessments",
    "/live-classes",
  ];
  const isCommon = commonAllowedPrefixes.some(
    (prefix) => nextUrl === prefix || nextUrl.startsWith(prefix + "/") || nextUrl.startsWith(prefix + "?")
  );

  // Strict role boundaries: users must only land in their dedicated portal
  if (isSuperAdminOrAdmin) {
    if (nextUrl.startsWith("/admin") || nextUrl.startsWith("/student") || isCommon) {
      return nextUrl;
    }
    return "/admin/dashboard";
  }

  if (isInstitution) {
    if (nextUrl.startsWith("/institution") || nextUrl.startsWith("/dashboard")) {
      return nextUrl;
    }
    return "/institution/overview";
  }

  if (isTrainer) {
    if (nextUrl.startsWith("/trainer") || nextUrl.startsWith("/student") || isCommon) {
      return nextUrl;
    }
    return "/trainer/dashboard";
  }

  if (isRecruiter) {
    return "/admin/students";
  }

  // Student / Learner
  if (nextUrl.startsWith("/admin") || nextUrl.startsWith("/trainer") || nextUrl.startsWith("/institution")) {
    return "/student/dashboard";
  }
  return nextUrl;
}

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleWidth, setGoogleWidth] = useState<string>("380");
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window !== "undefined") {
        const w = Math.max(220, Math.min(window.innerWidth - 48, 400));
        setGoogleWidth(String(w));
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Add your Google Client ID here (or use env variables: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
  const GOOGLE_CLIENT_ID = "658302087365-lurl6cagv36c4bm8ub4gs7b29930l846.apps.googleusercontent.com";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const remember = watch("remember");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam === "session_expired") {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please sign in again to continue.",
        variant: "destructive",
      });
    } else if (errorParam === "suspended") {
      toast({
        title: "Account Suspended",
        description: "Your account has been suspended. Please contact your administrator.",
        variant: "destructive",
      });
    }
  }, [toast]);

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    try {
      // 1. Call server API to ensure profile exists and establish role
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Authentication failed");
      }

      const serverAuthData = await res.json().catch(() => null);

      // 2. Sign in with password via Supabase
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message === "Invalid login credentials"
            ? "Incorrect email or password. Please try again."
            : error.message || "Failed to sign in.",
          variant: "destructive",
        });
        return;
      }

      if (authData.user) {
        await processSuccessfulLogin(authData.user, serverAuthData?.role);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected login error occurred.";
      toast({ title: "Login failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  // Handles the ID token received directly from the frontend Google popup
  async function handleGoogleSuccess(credentialResponse: any) {
    setIsGoogleLoading(true);
    try {
      const idToken = credentialResponse.credential;
      if (!idToken) throw new Error("No credential received from Google");

      // Pass the frontend token to Supabase
      const { data: authData, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) throw error;

      if (authData.user) {
        await processSuccessfulLogin(authData.user, null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      toast({ title: "Google Sign-In Error", description: message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  // Extracted shared routing logic for both Email and Google auth
  async function processSuccessfulLogin(user: any, serverRole: string | null) {
    if (typeof window !== "undefined") {
      const firstLoginKey = `first_login_${user.id}`;
      if (!localStorage.getItem(firstLoginKey)) {
        const initialDate = user.created_at || new Date().toISOString();
        localStorage.setItem(firstLoginKey, initialDate);
      }
    }

    let profileRole = (
      serverRole ||
      (user.user_metadata?.role as string) ||
      (user.app_metadata?.role as string) ||
      ""
    ).toLowerCase();

    if (!profileRole) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();
      profileRole = ((profileData as { role?: string } | null)?.role || "").toLowerCase();
    }

    toast({ title: "Welcome back", description: "Logged in successfully." });

    const effectiveRole = profileRole || "student";
    const nextUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    const target = resolveRoleDestination(effectiveRole, nextUrl);

    router.push(target);
    router.refresh();
  }

  return (
    // Wrap the component in the Provider so Google APIs can load
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="w-full max-w-[420px] mx-auto space-y-4 select-none">
        
        {/* MNC Enterprise Header */}
        <div className="space-y-1 text-left">
          <h1 
            className="text-[26px] font-semibold tracking-[-0.025em] text-slate-900 leading-tight"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif' }}
          >
            Welcome back
          </h1>
          <p 
            className="text-[13px] text-slate-500 font-normal leading-normal"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif' }}
          >
            Sign in to your Sensilearn account to continue.
          </p>
        </div>

        {/* Official Google Sign-in Component */}
        <div className="w-full flex justify-center">
          <div className="w-full relative [&>div]:w-full [&>div>div]:w-full min-h-[44px]">
            {mounted ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast({ 
                  title: "Login Interrupted", 
                  description: "The Google sign-in window was closed or failed to load. You can sign in using your email and password below.", 
                  variant: "destructive" 
                })}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width={googleWidth}
              />
            ) : (
              <div className="w-full h-11 rounded-lg bg-slate-100 dark:bg-zinc-800 animate-pulse" />
            )}
          </div>
        </div>

        {/* Subtle Text Divider */}
        <div className="relative flex items-center justify-center pt-2 pb-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative px-3 bg-white text-xs text-slate-400 font-medium uppercase tracking-wider">
            OR
          </span>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          
          {/* Email Address */}
          <div className="space-y-1 text-left">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email address
            </Label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              disabled={isLoading || isGoogleLoading}
              {...register("email")}
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors disabled:bg-slate-50 disabled:text-slate-500"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 font-normal">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading || isGoogleLoading}
                {...register("password")}
                className="w-full h-11 pl-3.5 pr-14 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors disabled:bg-slate-50 disabled:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors select-none py-1 px-1"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 font-normal">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2 pt-0.5">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(checked) =>
                setValue("remember", checked === true)
              }
              className="rounded-[4px] border-slate-300 data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
            />
            <Label htmlFor="remember" className="text-sm font-normal text-slate-600 cursor-pointer select-none">
              Remember me on this device
            </Label>
          </div>

          {/* Primary Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60 shadow-none"
          >
            {isLoading ? "Signing in..." : "Sign in to SensiLearn"}
          </Button>
        </form>

        {/* Prominent Register Link */}
        <div className="pt-2 text-center text-sm text-slate-600 font-normal">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-[#2563EB] font-semibold hover:underline transition-colors"
          >
            Register
          </Link>
        </div>

      </div>
    </GoogleOAuthProvider>
  );
}