"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    setIsLoading(true);
    try {
      // 1. Call server API to create confirmed user & profile
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password: data.password,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Registration failed");
      }

      // 2. Auto-login immediately
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (loginError) {
        throw loginError;
      }

      toast({ title: "Account created!", description: "Welcome to EduNexus. Redirecting to dashboard..." });

      // 3. Immediate redirect to student dashboard
      router.push("/student/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An error occurred during registration.";
      toast({ title: "Registration failed", description: errMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Create your account
        </h1>
        <p className="text-[14px] text-[#6B7280] dark:text-[#A1A1AA]">
          Join thousands of enterprise learners on EduNexus
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* First Name & Last Name Grid (Accepts 1+ character) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first_name" className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA]">First name</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] dark:text-[#A1A1AA]" />
              <Input
                id="first_name"
                placeholder="John"
                className="pl-10 h-[44px] bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA] placeholder:text-[#9CA3AF]"
                {...register("first_name")}
              />
            </div>
            {errors.first_name && (
              <p className="text-[#DC2626] text-xs mt-1">{errors.first_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="last_name" className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA]">Last name</Label>
            <Input
              id="last_name"
              placeholder="Doe"
              className="h-[44px] bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA] placeholder:text-[#9CA3AF]"
              {...register("last_name")}
            />
            {errors.last_name && (
              <p className="text-[#DC2626] text-xs mt-1">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-email" className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA]">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] dark:text-[#A1A1AA]" />
            <Input
              id="reg-email"
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
          <Label htmlFor="reg-password" className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA]">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] dark:text-[#A1A1AA]" />
            <Input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              className="pl-10 pr-10 h-[44px] bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA] placeholder:text-[#9CA3AF]"
              autoComplete="new-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[#DC2626] text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password" className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA]">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] dark:text-[#A1A1AA]" />
            <Input
              id="confirm_password"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your password"
              className="pl-10 pr-10 h-[44px] bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA] placeholder:text-[#9CA3AF]"
              autoComplete="new-password"
              {...register("confirm_password")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] transition-colors"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-[#DC2626] text-xs mt-1">{errors.confirm_password.message}</p>
          )}
        </div>

        <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] pt-1">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-[#2563EB] hover:underline font-medium">Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#2563EB] hover:underline font-medium">Privacy Policy</Link>.
        </p>

        {/* Solid #2563EB Primary Button */}
        <Button
          type="submit"
          className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-lg text-sm transition-colors mt-2"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account & Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-[#6B7280] dark:text-[#A1A1AA]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#2563EB] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
