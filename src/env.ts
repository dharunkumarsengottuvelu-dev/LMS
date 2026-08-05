import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required").optional(),

  // Judge0
  JUDGE0_API_KEY: z.string().min(1, "Judge0 API key is required").optional(),
  JUDGE0_API_HOST: z.string().default("judge0-ce.p.rapidapi.com"),
  JUDGE0_BASE_URL: z.string().url().default("https://judge0-ce.p.rapidapi.com"),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("EduNexus"),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().default("Enterprise Learning Management System"),

  // Node
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
    );
    // In development, warn but don't crash so dev can proceed with setup
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("Invalid environment variables");
    }
  }

  return parsed.data ?? (process.env as unknown as Env);
}

export const env = validateEnv();
