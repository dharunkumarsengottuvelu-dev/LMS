"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
      // 1. Call server API to ensure profile exists
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Authentication failed");
      }

      // 2. Sign in with password
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

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Google login failed";
      toast({ title: "Error", description: message, variant: "destructive" });
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-6 relative z-10 w-full max-w-[440px] mx-auto py-8">
      {/* Brand Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Sign in to your enterprise account to continue
        </p>
      </div>

      {/* Google Login Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-[48px] gap-3 font-semibold bg-card border-border text-foreground hover:bg-accent shadow-sm rounded-xl transition-all"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        Continue with Google
      </Button>

      <div className="flex items-center gap-4 px-2">
        <Separator className="flex-1 bg-border" />
        <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">
          or sign in with email
        </span>
        <Separator className="flex-1 bg-border" />
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold text-foreground">Email address</Label>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-10 h-[46px] bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
              autoComplete="email"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-destructive text-[11px] mt-1 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-bold text-foreground">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-[11px] text-primary hover:underline font-bold"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-10 pr-10 h-[46px] bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-destructive text-[11px] mt-1 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(checked) =>
              setValue("remember", checked === true)
            }
            className="rounded-[4px] border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label htmlFor="remember" className="text-[11px] font-medium text-muted-foreground cursor-pointer select-none">
            Remember me on this device
          </Label>
        </div>

        {/* Submit Primary Button */}
        <Button
          type="submit"
          className="w-full h-[48px] bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition-all shadow-md mt-2"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in to FALCON
        </Button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm font-medium text-muted-foreground pt-2">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary font-bold hover:underline transition-colors">
          Request Access
        </Link>
      </p>
    </div>
  );
}
