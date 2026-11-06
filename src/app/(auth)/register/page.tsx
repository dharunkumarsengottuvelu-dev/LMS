"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLMSStore } from "@/lib/store/lms-store";

// ============================================================================
// CURATED TAMIL NADU COLLEGES & HIGHER EDUCATION INSTITUTIONS (PURE TEXT)
// ============================================================================

export const TAMIL_NADU_COLLEGES = [
  "Sri Shanmugha College of Engineering and Technology (SSCET), Salem",
  "Anna University - CEG Campus, Chennai",
  "Anna University - MIT Campus, Chromepet, Chennai",
  "Anna University - ACT Campus, Guindy, Chennai",
  "PSG College of Technology (PSG Tech), Coimbatore",
  "PSG Institute of Technology and Applied Research (PSG iTech), Coimbatore",
  "Coimbatore Institute of Technology (CIT), Coimbatore",
  "Government College of Technology (GCT), Coimbatore",
  "Kumaraguru College of Technology (KCT), Coimbatore",
  "Sri Krishna College of Engineering and Technology (SKCET), Coimbatore",
  "Sri Krishna College of Technology (SKCT), Coimbatore",
  "Kongu Engineering College (KEC), Perundurai, Erode",
  "Bannari Amman Institute of Technology (BIT), Sathyamangalam",
  "Sri Sivasubramaniya Nadar College of Engineering (SSN), Chennai",
  "Thiagarajar College of Engineering (TCE), Madurai",
  "Sona College of Technology, Salem",
  "Government College of Engineering (GCE), Salem",
  "Government College of Engineering, Tirunelveli",
  "Government College of Engineering, Bargur",
  "Government College of Engineering, Thanjavur",
  "Government College of Engineering, Bodinayakkanur",
  "Sri Eshwar College of Engineering (SECE), Coimbatore",
  "Sri Ramakrishna Engineering College (SREC), Coimbatore",
  "Sri Ramakrishna Institute of Technology (SRIT), Coimbatore",
  "Chennai Institute of Technology (CIT), Chennai",
  "Rajalakshmi Engineering College (REC), Chennai",
  "Rajalakshmi Institute of Technology (RIT), Chennai",
  "Velammal Engineering College, Chennai",
  "St. Joseph's College of Engineering, Chennai",
  "Sri Venkateswara College of Engineering (SVCE), Sriperumbudur",
  "Easwari Engineering College, Chennai",
  "R.M.K. Engineering College, Chennai",
  "Panimalar Engineering College, Chennai",
  "Saveetha Engineering College, Chennai",
  "Meenakshi Sundararajan Engineering College, Chennai",
  "Loyola-ICAM College of Engineering and Technology (LICET), Chennai",
  "KPR Institute of Engineering and Technology, Coimbatore",
  "Karpagam College of Engineering, Coimbatore",
  "Dr. Mahalingam College of Engineering and Technology (MCET), Pollachi",
  "Hindusthan College of Engineering and Technology, Coimbatore",
  "Sri Shakthi Institute of Engineering and Technology, Coimbatore",
  "SNS College of Technology, Coimbatore",
  "SNS College of Engineering, Coimbatore",
  "Mepco Schlenk Engineering College, Sivakasi",
  "National Engineering College, Kovilpatti",
  "PSNA College of Engineering and Technology, Dindigul",
  "K.L.N. College of Engineering, Madurai",
  "Kamaraj College of Engineering and Technology, Virudhunagar",
  "Alagappa Chettiar Government College of Engineering and Technology, Karaikudi",
  "Sethu Institute of Technology, Kariapatti",
  "Francis Xavier Engineering College, Tirunelveli",
  "Saranathan College of Engineering, Tiruchirappalli",
  "K.S. Rangasamy College of Technology (KSRCT), Tiruchengode",
  "Vivekanandha College of Engineering for Women, Tiruchengode",
  "Paavai Engineering College, Namakkal",
  "Muthayammal Engineering College, Rasipuram",
  "Knowledge Institute of Technology (KIOT), Salem",
  "Mahendra Engineering College, Mallasamudram",
  "Excel Engineering College, Komarapalayam",
  "Indian Institute of Technology Madras (IIT Madras)",
  "National Institute of Technology, Tiruchirappalli (NIT Trichy)",
  "Indian Institute of Information Technology, Design and Manufacturing (IIITDM), Kancheepuram",
  "SRM Institute of Science and Technology, Kattankulathur",
  "Vellore Institute of Technology (VIT), Vellore",
  "Vellore Institute of Technology (VIT), Chennai",
  "SASTRA Deemed University, Thanjavur",
  "Amrita Vishwa Vidyapeetham, Coimbatore",
  "Sathyabama Institute of Science and Technology, Chennai",
  "Hindustan Institute of Technology and Science (HITS), Chennai",
  "B.S. Abdur Rahman Crescent Institute of Science and Technology, Chennai",
  "Kalasalingam Academy of Research and Education, Krishnankoil",
  "Periyar Maniammai Institute of Science & Technology, Thanjavur",
  "Bharath Institute of Higher Education and Research, Chennai",
  "Dr. M.G.R. Educational and Research Institute, Chennai",
  "Vels Institute of Science, Technology & Advanced Studies (VISTAS), Chennai",
  "Karunya Institute of Technology and Sciences, Coimbatore",
  "University of Madras, Chennai",
  "Bharathiar University, Coimbatore",
  "Madurai Kamaraj University, Madurai",
  "Bharathidasan University, Tiruchirappalli",
  "Periyar University, Salem",
  "Manonmaniam Sundaranar University, Tirunelveli",
  "Alagappa University, Karaikudi",
  "Annamalai University, Chidambaram",
  "Thiruvalluvar University, Vellore",
  "Loyola College, Chennai",
  "Madras Christian College (MCC), Chennai",
  "Presidency College, Chennai",
  "PSG College of Arts & Science, Coimbatore",
  "St. Joseph's College, Tiruchirappalli",
  "Bishop Heber College, Tiruchirappalli",
  "The American College, Madurai",
  "Stella Maris College, Chennai",
  "Women's Christian College (WCC), Chennai",
  "Ethiraj College for Women, Chennai",
];

export const COMMON_DEPARTMENTS = [
  "Computer Science & Engineering (CSE)",
  "Artificial Intelligence & Data Science (AI & DS)",
  "Information Technology (IT)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering",
  "Civil Engineering",
  "Computer Science & Business Systems (CSBS)",
  "Artificial Intelligence & Machine Learning (AI & ML)",
  "Cyber Security / Information Security",
  "Mechatronics Engineering",
  "Biomedical Engineering",
  "Biotechnology",
  "Chemical Engineering",
  "Robotics & Automation",
  "Master of Computer Applications (MCA)",
  "Other Department / Major",
];

export const DEGREE_OPTIONS = [
  "B.E. / B.Tech",
  "M.E. / M.Tech",
  "MCA",
  "BCA",
  "B.Sc",
  "M.Sc",
  "MBA",
  "Other Degree",
];

export const ACADEMIC_YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

export const SEMESTERS = [
  "Semester 1",
  "Semester 2",
  "Semester 3",
  "Semester 4",
  "Semester 5",
  "Semester 6",
  "Semester 7",
  "Semester 8",
];

export const GRADUATION_YEARS = [
  "2024",
  "2025",
  "2026",
  "2027",
  "2028",
  "2029",
  "2030",
];

// ============================================================================
// FORM VALIDATION SCHEMA
// ============================================================================

const studentRegistrationSchema = z
  .object({
    // Step 1: Personal Profile
    first_name: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters")
      .regex(/^[a-zA-Z\s.-]+$/, "First name can only contain letters, spaces, and periods"),
    last_name: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .regex(/^[a-zA-Z\s.-]+$/, "Last name can only contain letters, spaces, and periods"),
    email: z
      .string()
      .trim()
      .email("Please enter a valid student email address"),
    phone: z
      .string()
      .trim()
      .min(10, "Please enter a valid 10-digit mobile number")
      .regex(/^[0-9+\s()-]{10,15}$/, "Please enter a valid phone number"),
    gender: z.string().optional(),

    // Step 2: Academic Profile (Tamil Nadu Colleges, No Batch Allocation, No Institution Code)
    institution_name: z
      .string()
      .trim()
      .min(2, "Please select or enter your college / university name"),
    is_custom_institution: z.boolean().optional(),
    custom_institution_name: z.string().optional(),
    department: z.string().trim().min(2, "Department / major is required"),
    custom_department: z.string().optional(),
    degree: z.string().trim().min(2, "Degree program is required"),
    academic_year: z.string().min(1, "Academic year is required"),
    semester: z.string().min(1, "Current semester is required"),
    register_number: z
      .string()
      .trim()
      .min(2, "Student register / roll number is required"),
    graduation_year: z.string().min(4, "Graduation year is required"),

    // Step 3: Account Security
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one number or special character"),
    confirm_password: z.string().min(1, "Please confirm your password"),

    // Step 4: Terms & Consent
    agree_terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the Terms of Service and Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type StudentRegistrationValues = z.infer<typeof studentRegistrationSchema>;

export default function StudentRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const { addStudent } = useLMSStore();

  // Wizard step state: 1 = Personal, 2 = Academic, 3 = Security, 4 = Review & Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Password visibility (Text toggle: Show / Hide)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form submission loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // College dropdown & search state
  const [isCollegeDropdownOpen, setIsCollegeDropdownOpen] = useState(false);
  const [collegeSearchQuery, setCollegeSearchQuery] = useState("");
  const collegeDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic colleges list
  const [allColleges, setAllColleges] = useState<string[]>(TAMIL_NADU_COLLEGES);

  // React Hook Form initialization
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentRegistrationValues>({
    resolver: zodResolver(studentRegistrationSchema),
    mode: "onTouched",
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      gender: "male",
      institution_name: "Sri Shanmugha College of Engineering and Technology (SSCET), Salem",
      is_custom_institution: false,
      custom_institution_name: "",
      department: "Computer Science & Engineering (CSE)",
      custom_department: "",
      degree: "B.E. / B.Tech",
      academic_year: "3rd Year",
      semester: "Semester 6",
      register_number: "",
      graduation_year: "2026",
      password: "",
      confirm_password: "",
      agree_terms: false,
    },
  });

  const formValues = watch();

  // Load partner colleges from backend if available and merge
  useEffect(() => {
    async function fetchBackendColleges() {
      try {
        const res = await fetch("/api/auth/register");
        if (res.ok) {
          const data = await res.json();
          if (data.institutions && Array.isArray(data.institutions)) {
            const backendNames = data.institutions
              .map((inst: any) => inst.college || inst.name)
              .filter(Boolean);

            const combined = Array.from(new Set([...backendNames, ...TAMIL_NADU_COLLEGES]));
            setAllColleges(combined);
          }
        }
      } catch (err) {
        console.warn("Notice: Error loading backend institutions:", err);
      }
    }
    fetchBackendColleges();
  }, []);

  // Close college dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        collegeDropdownRef.current &&
        !collegeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCollegeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter colleges based on search query
  const filteredColleges = useMemo(() => {
    const q = collegeSearchQuery.trim().toLowerCase();
    if (!q) return allColleges;
    return allColleges.filter((c) => c.toLowerCase().includes(q));
  }, [allColleges, collegeSearchQuery]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pwd = formValues.password || "";
    if (!pwd) return { score: 0, label: "Empty", color: "bg-slate-200" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-600" };
    if (score <= 3) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-600" };
    if (score <= 4) return { score: 3, label: "Good", color: "bg-blue-600", text: "text-blue-600" };
    return { score: 4, label: "Strong", color: "bg-emerald-600", text: "text-emerald-600" };
  }, [formValues.password]);

  // Step validation handler
  const handleProceedStep = async (targetStep: 2 | 3 | 4) => {
    if (targetStep === 2) {
      const isStep1Valid = await trigger(["first_name", "last_name", "email", "phone"]);
      if (isStep1Valid) setCurrentStep(2);
    } else if (targetStep === 3) {
      if (formValues.is_custom_institution && formValues.custom_institution_name?.trim()) {
        setValue("institution_name", formValues.custom_institution_name.trim());
      }
      if (formValues.department === "Other Department / Major" && formValues.custom_department?.trim()) {
        setValue("department", formValues.custom_department.trim());
      }

      const isStep2Valid = await trigger([
        "institution_name",
        "department",
        "degree",
        "academic_year",
        "semester",
        "register_number",
        "graduation_year",
      ]);
      if (isStep2Valid) setCurrentStep(3);
    } else if (targetStep === 4) {
      const isStep3Valid = await trigger(["password", "confirm_password"]);
      if (isStep3Valid) setCurrentStep(4);
    }
  };

  // Google OAuth sign up
  async function handleGoogleSignUp() {
    setIsGoogleLoading(true);
    try {
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : process.env["NEXT_PUBLIC_APP_URL"] || "https://sensilearn.com";
      const callbackUrl = new URL("/api/auth/callback", origin);
      callbackUrl.searchParams.set("next", "/student/dashboard");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
      if (data?.url && typeof window !== "undefined") {
        window.location.assign(data.url);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Google registration failed";
      toast({ title: "Google Registration Error", description: message, variant: "destructive" });
      setIsGoogleLoading(false);
    }
  }

  // Final Form Submission
  async function onSubmit(data: StudentRegistrationValues) {
    setIsSubmitting(true);
    try {
      const finalInstitution =
        data.is_custom_institution && data.custom_institution_name?.trim()
          ? data.custom_institution_name.trim()
          : data.institution_name;

      const finalDepartment =
        data.department === "Other Department / Major" && data.custom_department?.trim()
          ? data.custom_department.trim()
          : data.department;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          gender: data.gender,
          institution_name: finalInstitution,
          department: finalDepartment,
          degree: data.degree,
          academic_year: data.academic_year,
          semester: data.semester,
          register_number: data.register_number,
          graduation_year: data.graduation_year,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Student registration failed.");
      }

      const fullName = `${data.first_name} ${data.last_name}`;

      addStudent({
        id: json.userId || `std_${Date.now()}`,
        employeeId: json.studentId || data.register_number,
        name: fullName,
        email: data.email,
        batch: "Self-Paced",
        college: finalInstitution,
        department: finalDepartment,
        designation: "Student Learner",
        techTrack: finalDepartment,
        role: "student",
        status: "active",
        avgScore: 0,
        proctoringCompliance: 100,
        violationCount: 0,
        joinedDate: new Date().toISOString().slice(0, 10),
      });

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        console.warn("Auto-signin notice:", signInError.message);
      }

      toast({
        title: "Account Created",
        description: `Welcome ${fullName}! Your registration is complete.`,
      });

      router.push("/student/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      toast({
        title: "Registration Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-6 py-2">
      {/* ─────────────────────────────────────────────────────────────
          TOP BRAND / STEP HEADER (PURE MNC ENTERPRISE TYPOGRAPHY)
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-blue-700 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full uppercase">
            STUDENT REGISTRATION
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Step {currentStep} of 4
          </span>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {currentStep === 1 && "Personal Profile"}
            {currentStep === 2 && "Academic Details"}
            {currentStep === 3 && "Account Security"}
            {currentStep === 4 && "Review & Confirm"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {currentStep === 1 && "Enter your basic contact details to create your LMS profile."}
            {currentStep === 2 && "Select your Tamil Nadu college and branch information."}
            {currentStep === 3 && "Create a secure password to protect your learning portal."}
            {currentStep === 4 && "Confirm your details to finalize your student account."}
          </p>
        </div>

        {/* Minimalist Segmented Step Bar (No icons, pure typography) */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[
            { step: 1, label: "01 Personal" },
            { step: 2, label: "02 Academic" },
            { step: 3, label: "03 Security" },
            { step: 4, label: "04 Review" },
          ].map((item) => (
            <div key={item.step} className="space-y-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep === item.step
                    ? "bg-[#2563EB]"
                    : currentStep > item.step
                    ? "bg-slate-700"
                    : "bg-slate-100"
                }`}
              />
              <span
                className={`text-[11px] font-semibold block text-center truncate ${
                  currentStep === item.step
                    ? "text-[#2563EB]"
                    : currentStep > item.step
                    ? "text-slate-800"
                    : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FORM BODY (CLEAN MNC INPUTS - ZERO ICONS, ZERO EMOJIS)
          ───────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ========================================================= */}
        {/* STEP 1: PERSONAL INFORMATION                              */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Google Quick Sign-Up (Clean MNC Corporate Button) */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 transition-all shadow-xs cursor-pointer disabled:opacity-60 text-center"
            >
              {isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 my-2">
              <Separator className="flex-1 bg-slate-200" />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Or enter details
              </span>
              <Separator className="flex-1 bg-slate-200" />
            </div>

            {/* First Name & Last Name (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs font-semibold text-slate-800">
                  First Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="e.g. Aravind"
                  className="px-3.5 h-11 bg-white border-slate-300 text-slate-900 rounded-xl focus:border-[#2563EB] focus:ring-2 focus:ring-blue-600/15 text-xs sm:text-sm"
                  {...register("first_name")}
                />
                {errors.first_name && (
                  <p className="text-rose-600 text-[11px] font-medium">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs font-semibold text-slate-800">
                  Last Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="e.g. Kumar"
                  className="px-3.5 h-11 bg-white border-slate-300 text-slate-900 rounded-xl focus:border-[#2563EB] focus:ring-2 focus:ring-blue-600/15 text-xs sm:text-sm"
                  {...register("last_name")}
                />
                {errors.last_name && (
                  <p className="text-rose-600 text-[11px] font-medium">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Student Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-800">
                Student Email Address <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. student@college.edu or name@gmail.com"
                className="px-3.5 h-11 bg-white border-slate-300 text-slate-900 rounded-xl focus:border-[#2563EB] focus:ring-2 focus:ring-blue-600/15 text-xs sm:text-sm"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-rose-600 text-[11px] font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Mobile Number & Gender (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-800">
                  Mobile Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  className="px-3.5 h-11 bg-white border-slate-300 text-slate-900 rounded-xl focus:border-[#2563EB] focus:ring-2 focus:ring-blue-600/15 text-xs sm:text-sm"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-rose-600 text-[11px] font-medium">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-xs font-semibold text-slate-800">
                  Gender
                </Label>
                <Select
                  value={formValues.gender || "male"}
                  onValueChange={(val: any) => setValue("gender", val)}
                >
                  <SelectTrigger className="px-3.5 h-11 bg-white border-slate-300 rounded-xl text-xs sm:text-sm">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Continue Button (Pure Text) */}
            <Button
              type="button"
              onClick={() => handleProceedStep(2)}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-sm mt-2 cursor-pointer"
            >
              Continue to Academic Details
            </Button>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: ACADEMIC & INSTITUTION (TAMIL NADU COLLEGES)       */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* College / Institution Searchable Combobox (Clean MNC Text) */}
            <div className="space-y-1.5" ref={collegeDropdownRef}>
              <Label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>College / University <span className="text-rose-500">*</span></span>
                <span className="text-[11px] font-normal text-slate-400">Tamil Nadu Institutions</span>
              </Label>

              <div className="relative">
                {/* Clickable Trigger Button */}
                <div
                  onClick={() => setIsCollegeDropdownOpen(!isCollegeDropdownOpen)}
                  className={`w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between gap-2 bg-white border rounded-xl text-xs sm:text-sm cursor-pointer transition-all ${
                    isCollegeDropdownOpen
                      ? "border-[#2563EB] ring-2 ring-blue-600/15"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <span className="truncate font-medium text-slate-900">
                    {formValues.is_custom_institution
                      ? formValues.custom_institution_name || "Custom College Selected"
                      : formValues.institution_name || "Select your college"}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium shrink-0">
                    {isCollegeDropdownOpen ? "Close" : "Change"}
                  </span>
                </div>

                {/* Searchable Dropdown Overlay (No icons, pure clean layout) */}
                {isCollegeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 p-2.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 space-y-2 animate-in fade-in-50 zoom-in-95 duration-100">
                    {/* Search Field inside Dropdown */}
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Type to search Tamil Nadu colleges..."
                        value={collegeSearchQuery}
                        onChange={(e) => setCollegeSearchQuery(e.target.value)}
                        autoFocus
                        className="px-3 pr-14 h-9 text-xs bg-slate-50 border-slate-200 rounded-lg focus:bg-white"
                      />
                      {collegeSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCollegeSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 hover:text-slate-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Scrollable College List */}
                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                      {/* Option for Other College (No emoji) */}
                      <div
                        onClick={() => {
                          setValue("is_custom_institution", true);
                          setValue("institution_name", "Other College");
                          setIsCollegeDropdownOpen(false);
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${
                          formValues.is_custom_institution
                            ? "bg-blue-50 text-[#2563EB]"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>Other College / Outside Tamil Nadu</span>
                        {formValues.is_custom_institution && (
                          <span className="text-[11px] font-bold text-blue-600">Selected</span>
                        )}
                      </div>

                      <div className="h-px bg-slate-100 my-1" />

                      {filteredColleges.length > 0 ? (
                        filteredColleges.map((college) => {
                          const isSelected =
                            !formValues.is_custom_institution &&
                            formValues.institution_name === college;
                          return (
                            <div
                              key={college}
                              onClick={() => {
                                setValue("is_custom_institution", false);
                                setValue("institution_name", college);
                                setIsCollegeDropdownOpen(false);
                                setCollegeSearchQuery("");
                              }}
                              className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "bg-blue-50 text-[#2563EB] font-semibold"
                                  : "text-slate-700 hover:bg-slate-50 font-normal"
                              }`}
                            >
                              <span className="truncate pr-2">{college}</span>
                              {isSelected && (
                                <span className="text-[11px] font-bold text-blue-600 shrink-0">Selected</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center space-y-2">
                          <p className="text-xs text-slate-500">No matching college found in list.</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setValue("is_custom_institution", true);
                              setValue("custom_institution_name", collegeSearchQuery);
                              setValue("institution_name", collegeSearchQuery);
                              setIsCollegeDropdownOpen(false);
                            }}
                            className="text-xs h-8 border-blue-200 text-[#2563EB] bg-blue-50/50 hover:bg-blue-50"
                          >
                            Use &quot;{collegeSearchQuery}&quot; as college
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom College Name Input if Other is selected */}
              {formValues.is_custom_institution && (
                <div className="pt-1 space-y-1 animate-in fade-in-50 duration-100">
                  <Input
                    placeholder="Enter your college / university full name"
                    value={formValues.custom_institution_name || ""}
                    onChange={(e) => {
                      setValue("custom_institution_name", e.target.value);
                      setValue("institution_name", e.target.value);
                    }}
                    className="px-3.5 h-10 bg-white border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                  {errors.institution_name && (
                    <p className="text-rose-600 text-[11px] font-medium">{errors.institution_name.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Department & Degree (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-semibold text-slate-800">
                  Department / Branch <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formValues.department}
                  onValueChange={(val: any) => setValue("department", val)}
                >
                  <SelectTrigger className="px-3.5 h-11 bg-white border-slate-300 rounded-xl text-xs sm:text-sm">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-56">
                    {COMMON_DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept} className="text-xs sm:text-sm">
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formValues.department === "Other Department / Major" && (
                  <Input
                    placeholder="Enter department name"
                    value={formValues.custom_department || ""}
                    onChange={(e) => setValue("custom_department", e.target.value)}
                    className="px-3.5 h-10 mt-1 bg-white border-slate-300 rounded-xl text-xs"
                  />
                )}
                {errors.department && (
                  <p className="text-rose-600 text-[11px] font-medium">{errors.department.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="degree" className="text-xs font-semibold text-slate-800">
                  Degree / Program <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formValues.degree}
                  onValueChange={(val: any) => setValue("degree", val)}
                >
                  <SelectTrigger className="px-3.5 h-11 bg-white border-slate-300 rounded-xl text-xs sm:text-sm">
                    <SelectValue placeholder="Select Degree" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DEGREE_OPTIONS.map((deg) => (
                      <SelectItem key={deg} value={deg} className="text-xs sm:text-sm">
                        {deg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.degree && (
                  <p className="text-rose-600 text-[11px] font-medium">{errors.degree.message}</p>
                )}
              </div>
            </div>

            {/* Academic Year & Semester (2 columns) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Academic Year <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formValues.academic_year}
                  onValueChange={(val: any) => setValue("academic_year", val)}
                >
                  <SelectTrigger className="px-3.5 h-11 bg-white border-slate-300 rounded-xl text-xs sm:text-sm">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {ACADEMIC_YEARS.map((yr) => (
                      <SelectItem key={yr} value={yr}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Current Semester <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formValues.semester}
                  onValueChange={(val: any) => setValue("semester", val)}
                >
                  <SelectTrigger className="px-3.5 h-11 bg-white border-slate-300 rounded-xl text-xs sm:text-sm">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SEMESTERS.map((sem) => (
                      <SelectItem key={sem} value={sem}>
                        {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Student Register Number & Graduation Year (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="register_number" className="text-xs font-semibold text-slate-800">
                  Register No / Roll No <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="register_number"
                  placeholder="e.g. 7376222AL101"
                  className="px-3.5 h-11 uppercase font-mono bg-white border-slate-300 rounded-xl text-xs sm:text-sm"
                  {...register("register_number")}
                />
                {errors.register_number && (
                  <p className="text-rose-600 text-[11px] font-medium">{errors.register_number.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="graduation_year" className="text-xs font-semibold text-slate-800">
                  Graduation Year <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formValues.graduation_year}
                  onValueChange={(val: any) => setValue("graduation_year", val)}
                >
                  <SelectTrigger className="px-3.5 h-11 bg-white border-slate-300 rounded-xl text-xs sm:text-sm">
                    <SelectValue placeholder="Graduation" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {GRADUATION_YEARS.map((yr) => (
                      <SelectItem key={yr} value={yr}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Navigation Buttons (Pure Text) */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="h-11 px-5 text-xs font-semibold rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => handleProceedStep(3)}
                className="flex-1 h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm cursor-pointer"
              >
                Continue to Security
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: ACCOUNT SECURITY                                  */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-800">
                Password <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="px-3.5 pr-14 h-11 bg-white border-slate-300 rounded-xl text-xs sm:text-sm"
                  autoComplete="new-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-600 text-[11px] font-medium">{errors.password.message}</p>
              )}

              {/* Password Strength Meter */}
              {formValues.password && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Security strength:</span>
                    <span className={`font-semibold ${passwordStrength.text}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`h-full flex-1 transition-all duration-300 ${
                          seg <= passwordStrength.score ? passwordStrength.color : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password" className="text-xs font-semibold text-slate-800">
                Confirm Password <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  className="px-3.5 pr-14 h-11 bg-white border-slate-300 rounded-xl text-xs sm:text-sm"
                  autoComplete="new-password"
                  {...register("confirm_password")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-rose-600 text-[11px] font-medium">{errors.confirm_password.message}</p>
              )}
              {formValues.password &&
                formValues.confirm_password &&
                formValues.password === formValues.confirm_password && (
                  <p className="text-emerald-700 text-[11px] font-semibold mt-0.5">
                    Passwords match
                  </p>
                )}
            </div>

            {/* Clean Password Guidelines (Pure Typography, Zero Emojis) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                Password Requirements:
              </span>
              <ul className="space-y-1.5 text-[11px]">
                <li
                  className={`flex items-center justify-between ${
                    (formValues.password || "").length >= 8
                      ? "text-emerald-700 font-semibold"
                      : "text-slate-500"
                  }`}
                >
                  <span>Minimum 8 characters</span>
                  <span>{(formValues.password || "").length >= 8 ? "Met" : "Required"}</span>
                </li>
                <li
                  className={`flex items-center justify-between ${
                    /[a-zA-Z]/.test(formValues.password || "")
                      ? "text-emerald-700 font-semibold"
                      : "text-slate-500"
                  }`}
                >
                  <span>Contains letters (A-Z, a-z)</span>
                  <span>{/[a-zA-Z]/.test(formValues.password || "") ? "Met" : "Required"}</span>
                </li>
                <li
                  className={`flex items-center justify-between ${
                    /[0-9!@#$%^&*]/.test(formValues.password || "")
                      ? "text-emerald-700 font-semibold"
                      : "text-slate-500"
                  }`}
                >
                  <span>Contains numbers or special characters</span>
                  <span>{/[0-9!@#$%^&*]/.test(formValues.password || "") ? "Met" : "Required"}</span>
                </li>
              </ul>
            </div>

            {/* Navigation Buttons (Pure Text) */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="h-11 px-5 text-xs font-semibold rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => handleProceedStep(4)}
                className="flex-1 h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm cursor-pointer"
              >
                Review & Confirm
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: REVIEW & CONFIRM                                  */}
        {/* ========================================================= */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Student Dossier Summary Card (Executive MNC Standard) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Registration Summary
                </span>
                <span className="text-[11px] font-semibold text-[#2563EB] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  Student Role
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Full Name</span>
                  <span className="font-bold text-slate-900">
                    {formValues.first_name} {formValues.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Register No</span>
                  <span className="font-mono font-bold text-[#2563EB]">
                    {formValues.register_number}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Email</span>
                  <span className="text-slate-800 truncate block">{formValues.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Mobile</span>
                  <span className="text-slate-800">{formValues.phone}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">College / University</span>
                  <span className="font-bold text-slate-900 block truncate">
                    {formValues.is_custom_institution
                      ? formValues.custom_institution_name || formValues.institution_name
                      : formValues.institution_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Department</span>
                  <span className="text-slate-800 truncate block">
                    {formValues.department === "Other Department / Major" && formValues.custom_department
                      ? formValues.custom_department
                      : formValues.department}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Degree & Year</span>
                  <span className="text-slate-800">
                    {formValues.degree} • {formValues.academic_year}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms & Privacy Checkbox */}
            <div className="pt-1 space-y-1">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="agree_terms"
                  checked={formValues.agree_terms}
                  onCheckedChange={(checked) => setValue("agree_terms", Boolean(checked))}
                  className="mt-0.5 rounded border-slate-300 data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
                />
                <Label htmlFor="agree_terms" className="text-xs text-slate-600 font-medium leading-relaxed cursor-pointer">
                  I agree to the Sensilearn{" "}
                  <Link href="/terms" target="_blank" className="text-[#2563EB] font-semibold hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" className="text-[#2563EB] font-semibold hover:underline">
                    Privacy Policy
                  </Link>.
                </Label>
              </div>
              {errors.agree_terms && (
                <p className="text-rose-600 text-[11px] font-medium ml-6">{errors.agree_terms.message}</p>
              )}
            </div>

            {/* Submit & Back Buttons (Pure Text) */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setCurrentStep(3)}
                className="h-11 px-5 text-xs font-semibold rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? "Creating Student Account..." : "Complete Student Registration"}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM FOOTER: SIGN IN LINK
          ───────────────────────────────────────────────────────────── */}
      <div className="pt-2 text-center border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Already have a Sensilearn account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline transition-colors"
          >
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
