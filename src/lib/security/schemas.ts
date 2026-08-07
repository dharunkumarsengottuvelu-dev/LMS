/**
 * Comprehensive Zod Validation Schemas
 * Server-Side & Client-Side Input Security Layer
 */

import { z } from "zod";

// ── Auth Schemas ─────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address format")
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty"),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Full name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address format")
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(12, "Password must be at least 12 characters long")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  role: z.enum(["admin", "trainer", "student", "recruiter"]).default("student"),
});

export const passwordResetSchema = z.object({
  password: z
    .string()
    .min(12, "Password must be at least 12 characters long")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ── Course & Content Schemas ─────────────────────────────────

export const courseCreateSchema = z.object({
  title: z
    .string({ required_error: "Course title is required" })
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters")
    .trim(),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  level: z.enum(["Beginner", "Intermediate", "Advanced", "All Levels"]),
});

// ── File Upload Validation Schema ────────────────────────────

export const fileUploadSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().max(10 * 1024 * 1024, "File size cannot exceed 10MB"), // 10MB limit
  mimeType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "image/png",
    "image/jpeg",
  ], {
    invalid_type_error: "Only PDF, DOCX, PNG, and JPEG files are allowed.",
  }),
});
