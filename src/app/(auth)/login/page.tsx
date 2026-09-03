"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

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
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        const profile = profileData as { role?: string } | null;
        toast({ title: "Welcome back", description: "Logged in successfully." });

        const emailLower = authData.user.email?.toLowerCase() || "";
        const profileRole = (
          profile?.role ||
          (authData.user.user_metadata?.role as string) ||
          (authData.user.app_metadata?.role as string) ||
          ""
        ).toLowerCase();

        const isSuperAdminOrAdmin =
          profileRole === "super_admin" ||
          profileRole === "admin" ||
          emailLower.includes("admin");

        const isTrainer =
          profileRole === "trainer" ||
          emailLower.includes("trainer");

        const isRecruiter = profileRole === "recruiter";

        const defaultDestination = isSuperAdminOrAdmin
          ? "/admin/dashboard"
          : isTrainer
          ? "/trainer/dashboard"
          : isRecruiter
          ? "/admin/students"
          : "/student/dashboard";

        const nextUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
        const target = nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("/login") && !nextUrl.startsWith("/register")
          ? nextUrl
          : defaultDestination;

        router.push(target);
        router.refresh();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected login error occurred.";
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleCredentialResponse = useCallback(async (response: { credential?: string }) => {
    if (!response.credential) {
      setIsGoogleLoading(false);
      return;
    }

    setIsGoogleLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });

      if (error) throw error;

      if (authData.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        const profile = profileData as { role?: string } | null;
        toast({ title: "Welcome back", description: "Signed in with Google successfully." });

        const emailLower = authData.user.email?.toLowerCase() || "";
        const profileRole = (
          profile?.role ||
          (authData.user.user_metadata?.role as string) ||
          (authData.user.app_metadata?.role as string) ||
          ""
        ).toLowerCase();

        const isSuperAdminOrAdmin =
          profileRole === "super_admin" ||
          profileRole === "admin" ||
          emailLower.includes("admin");

        const isTrainer =
          profileRole === "trainer" ||
          emailLower.includes("trainer");

        const isRecruiter = profileRole === "recruiter";

        const defaultDestination = isSuperAdminOrAdmin
          ? "/admin/dashboard"
          : isTrainer
          ? "/trainer/dashboard"
          : isRecruiter
          ? "/admin/students"
          : "/student/dashboard";

        const nextUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
        const target = nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("/login") && !nextUrl.startsWith("/register")
          ? nextUrl
          : defaultDestination;

        router.push(target);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google authentication error";
      toast({ title: "Google Sign-In Error", description: msg, variant: "destructive" });
      setIsGoogleLoading(false);
    }
  }, [supabase, router, toast]);

  // Initialize Google Identity Services when script loads
  useEffect(() => {
    const clientId = process.env["NEXT_PUBLIC_GOOGLE_CLIENT_ID"];
    if (!clientId || typeof window === "undefined") return;

    function initGsi() {
      const googleObj = (window as unknown as { google?: { accounts?: { id?: { initialize: (c: unknown) => void } } } }).google;
      if (googleObj?.accounts?.id) {
        googleObj.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    }

    if (isGsiLoaded) {
      initGsi();
    }
  }, [isGsiLoaded, handleGoogleCredentialResponse]);

  async function performOAuthRedirect() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) throw error;
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    try {
      const clientId = process.env["NEXT_PUBLIC_GOOGLE_CLIENT_ID"];
      const googleObj = typeof window !== "undefined"
        ? (window as unknown as { google?: { accounts?: { id?: { prompt: (cb?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void } } } }).google
        : null;

      if (googleObj?.accounts?.id && clientId) {
        googleObj.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If Google Identity prompt is suppressed or closed, fall back to standard redirect
            performOAuthRedirect().catch((err) => {
              const msg = err instanceof Error ? err.message : "Google login failed";
              toast({ title: "Error", description: msg, variant: "destructive" });
              setIsGoogleLoading(false);
            });
          }
        });
      } else {
        await performOAuthRedirect();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Google login failed";
      toast({ title: "Error", description: message, variant: "destructive" });
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] mx-auto space-y-4 select-none">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setIsGsiLoaded(true)}
      />
      
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
          Sign in to your Falcon account to continue.
        </p>
      </div>

      {/* Google Sign-in Action */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || isLoading}
        className="w-full h-11 px-4 flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition-colors disabled:opacity-60 cursor-pointer"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>{isGoogleLoading ? "Connecting..." : "Continue with Google"}</span>
      </button>

      {/* Subtle Text Divider */}
      <div className="relative flex items-center justify-center">
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
              href="/auth/forgot-password"
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
          {isLoading ? "Signing in..." : "Sign in to FALCON"}
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
  );
}
