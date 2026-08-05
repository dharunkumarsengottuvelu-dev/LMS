"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Loader2, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
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
      // 1. Call server API to auto-confirm email if unconfirmed & ensure profile exists
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

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

        const role = profile?.role ?? "student";
        router.push(
          role === "admin"
            ? "/admin/dashboard"
            : role === "trainer"
            ? "/trainer/dashboard"
            : "/student/dashboard"
        );
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Welcome back
        </h1>
        <p className="text-[14px] text-[#6B7280] dark:text-[#A1A1AA]">
          Sign in to your enterprise account to continue
        </p>
      </div>

      {/* Google Login Button (Secondary 44px) */}
      <Button
        type="button"
        variant="secondary"
        className="w-full h-[44px] gap-2 font-medium bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA] hover:bg-[#F5F5F5]"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Globe className="h-4 w-4 text-[#2563EB]" />
        )}
        Continue with Google
      </Button>

      {/* Quick Role Login Presets */}
      <div className="p-3 bg-[#F9FAFB] dark:bg-[#18181B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
        <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Quick Demo Login Presets:</p>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setValue("email", "admin@edunexus.io");
              setValue("password", "Password123");
            }}
            className="h-8 text-[11px] font-bold border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10"
          >
            👑 Admin
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setValue("email", "trainer@edunexus.io");
              setValue("password", "Password123");
            }}
            className="h-8 text-[11px] font-bold border-[#9333EA] text-[#9333EA] hover:bg-[#9333EA]/10"
          >
            👨‍🏫 Trainer
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setValue("email", "student@gmail.com");
              setValue("password", "Password123");
            }}
            className="h-8 text-[11px] font-bold border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A]/10"
          >
            🎓 Student
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Separator className="flex-1 bg-[#E5E7EB] dark:bg-[#27272A]" />
        <span className="text-xs text-[#6B7280] dark:text-[#A1A1AA] whitespace-nowrap">
          or sign in with credentials
        </span>
        <Separator className="flex-1 bg-[#E5E7EB] dark:bg-[#27272A]" />
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA]">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] dark:text-[#A1A1AA]" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-10 h-[44px] bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA] placeholder:text-[#9CA3AF]"
              autoComplete="email"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-[#DC2626] text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA]">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-[#2563EB] hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] dark:text-[#A1A1AA]" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-10 pr-10 h-[44px] bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA] placeholder:text-[#9CA3AF]"
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-[#DC2626] text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(checked) =>
              setValue("remember", checked === true)
            }
          />
          <Label htmlFor="remember" className="text-xs text-[#6B7280] dark:text-[#A1A1AA] cursor-pointer">
            Remember me for 30 days
          </Label>
        </div>

        {/* Submit Primary Button */}
        <Button
          type="submit"
          className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-lg text-sm transition-colors mt-2"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in to EduNexus
        </Button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-[#6B7280] dark:text-[#A1A1AA]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[#2563EB] font-medium hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
