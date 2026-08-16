"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye, EyeOff, Mail, Lock, User, Loader2, Building2, BookOpen,
  Boxes, CheckCircle2, UserCheck, ArrowRight, ArrowLeft, ShieldCheck, Sparkles
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLMSStore } from "@/lib/store/lms-store";

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Step 2 & 3 State
  const [collegeName, setCollegeName] = useState("ABC College");
  const [courseProgram, setCourseProgram] = useState("Java Development");
  const [batchChoice, setBatchChoice] = useState<"batch" | "none">("batch");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const { batches, addStudent } = useLMSStore();

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
      const message = error instanceof Error ? error.message : "Google sign up failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  // Active batches matching college/course or all active batches
  const availableMatchingBatches = useMemo(() => {
    const active = batches.filter((b) => b.status === "active");
    const exact = active.filter(
      (b) =>
        b.collegeName.toLowerCase().includes(collegeName.toLowerCase()) ||
        b.course.toLowerCase().includes(courseProgram.toLowerCase())
    );
    return exact.length > 0 ? exact : active;
  }, [batches, collegeName, courseProgram]);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleNextStep = async () => {
    if (step === 1) {
      const isValid = await trigger(["first_name", "last_name", "email", "password", "confirm_password"]);
      if (isValid) setStep(2);
    } else if (step === 2) {
      if (!collegeName.trim() || !courseProgram.trim()) {
        toast({
          title: "Please complete details",
          description: "College name and Course program are required.",
          variant: "destructive",
        });
        return;
      }
      // Auto select first batch if available
      if (availableMatchingBatches.length > 0 && !selectedBatchId && availableMatchingBatches[0]) {
        setSelectedBatchId(availableMatchingBatches[0].id);
      }
      setStep(3);
    }
  };

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

      // 2. Determine final Batch Name
      let assignedBatchName = "Not Assigned";
      let assignedBatchId: string | undefined = undefined;

      if (batchChoice === "batch" && selectedBatchId) {
        const matched = batches.find((b) => b.id === selectedBatchId);
        if (matched) {
          assignedBatchName = matched.batchName;
          assignedBatchId = matched.id;
        }
      }

      // 3. Register Student record in global LMS store
      const fullName = `${data.first_name} ${data.last_name}`;
      addStudent({
        id: `std_${Date.now()}`,
        employeeId: `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        name: fullName,
        email: data.email,
        batch: assignedBatchName,
        college: collegeName,
        course: courseProgram,
        batchId: assignedBatchId,
        department: courseProgram,
        designation: "Student Learner",
        techTrack: courseProgram,
        role: "student",
        status: "active",
        avgScore: 0,
        proctoringCompliance: 100,
        violationCount: 0,
        joinedDate: new Date().toISOString().slice(0, 10),
      });

      // 4. Auto-login immediately
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (loginError) {
        console.warn("Auto sign-in notice:", loginError.message);
      }

      toast({
        title: "Account Created!",
        description: `Welcome ${fullName}! Assigned Batch: ${assignedBatchName}`,
      });

      // 5. Immediate redirect to student dashboard
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
    <div className="space-y-6 relative z-10 w-full max-w-[440px] mx-auto py-8">
      {/* Step Progress Header */}
      <div className="space-y-3 text-center sm:text-left">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
            Step {step} of 3
          </span>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {step === 1 ? "Account Setup" : step === 2 ? "College & Course" : "Batch Selection"}
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden flex">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="pt-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {step === 1 && "Create account"}
            {step === 2 && "Select institution"}
            {step === 3 && "Join a batch"}
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {step === 1 && "Join thousands of enterprise learners on FALCON"}
            {step === 2 && "Tell us your college and course for personalized learning"}
            {step === 3 && "Join an existing batch or continue without a batch"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* STEP 1: ACCOUNT DETAILS */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            {/* Continue with Google */}
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
                <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
              )}
              Continue with Google
            </Button>

            <div className="flex items-center gap-4 px-2 my-2">
              <Separator className="flex-1 bg-border" />
              <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">
                Or sign up with email
              </span>
              <Separator className="flex-1 bg-border" />
            </div>

            {/* First Name & Last Name Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs font-bold text-foreground">First name</Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="first_name"
                    placeholder="John"
                    className="pl-10 h-[46px] bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register("first_name")}
                  />
                </div>
                {errors.first_name && (
                  <p className="text-destructive text-[11px] mt-1 font-medium">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs font-bold text-foreground">Last name</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  className="h-[46px] px-3 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register("last_name")}
                />
                {errors.last_name && (
                  <p className="text-destructive text-[11px] mt-1 font-medium">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-email" className="text-xs font-bold text-foreground">Email address</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="reg-email"
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
              <Label htmlFor="reg-password" className="text-xs font-bold text-foreground">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="pl-10 pr-10 h-[46px] bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                  autoComplete="new-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-[11px] mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password" className="text-xs font-bold text-foreground">Confirm password</Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
                  className="pl-10 pr-10 h-[46px] bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                  autoComplete="new-password"
                  {...register("confirm_password")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-destructive text-[11px] mt-1 font-medium">{errors.confirm_password.message}</p>
              )}
            </div>

            <Button
              type="button"
              onClick={handleNextStep}
              className="w-full h-[48px] bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition-all shadow-md mt-2 gap-2"
            >
              Continue to Institution Details <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* STEP 2: COLLEGE & COURSE SELECTION */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">College / Institution Name</Label>
              <div className="relative group">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="e.g. ABC College or PSG Tech"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="pl-10 h-[46px] bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Course / Degree Program</Label>
              <div className="relative group">
                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="e.g. Java Development, Computer Science..."
                  value={courseProgram}
                  onChange={(e) => setCourseProgram(e.target.value)}
                  className="pl-10 h-[46px] bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="h-[48px] px-4 font-bold text-xs rounded-xl gap-1 border-border bg-card hover:bg-accent text-foreground transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                type="button"
                onClick={handleNextStep}
                className="flex-1 h-[48px] bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm gap-2 shadow-md transition-all"
              >
                Continue to Batch Options <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* STEP 3: BATCH SELECTION & SUBMISSION */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            {/* Option 1 vs Option 2 Cards */}
            <div className="space-y-3">
              {/* Option 1: Join Existing Batch */}
              <div
                onClick={() => setBatchChoice("batch")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  batchChoice === "batch"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Boxes className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Join an Existing Batch</h4>
                      <p className="text-xs text-muted-foreground font-medium">Select an active batch matching your institution</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="batchChoice"
                    checked={batchChoice === "batch"}
                    onChange={() => setBatchChoice("batch")}
                    className="w-4 h-4 text-primary"
                  />
                </div>

                {/* Dropdown of available matching active batches */}
                {batchChoice === "batch" && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <Label className="text-xs font-bold text-foreground">Available Active Batches</Label>
                    <Select value={selectedBatchId} onValueChange={(val: string | null) => setSelectedBatchId(val ?? "")}>
                      <SelectTrigger className="h-[46px] rounded-xl text-sm bg-card border-border text-foreground">
                        <SelectValue placeholder="Select active batch" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableMatchingBatches.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-sm rounded-lg">
                            {b.batchName} ({b.collegeName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Option 2: Continue Without Batch */}
              <div
                onClick={() => setBatchChoice("none")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  batchChoice === "none"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-amber-500" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Continue Without Batch</h4>
                      <p className="text-xs text-muted-foreground font-medium">Register as self-paced learner (Batch: "Not Assigned")</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="batchChoice"
                    checked={batchChoice === "none"}
                    onChange={() => setBatchChoice("none")}
                    className="w-4 h-4 text-primary"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground font-medium">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline font-bold">Terms of Service</Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline font-bold">Privacy Policy</Link>.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="h-[48px] px-4 font-bold text-xs rounded-xl gap-1 border-border bg-card hover:bg-accent text-foreground transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                type="submit"
                className="flex-1 h-[48px] bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition-all shadow-md gap-2"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Registration & Sign In
              </Button>
            </div>
          </div>
        )}
      </form>

      <p className="text-center text-sm font-medium text-muted-foreground pt-2">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-bold hover:underline transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
