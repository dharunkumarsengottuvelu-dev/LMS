import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required").optional(),

  // Jobe Code Execution Server
  JOBE_URL: z.string().url("Invalid JOBE_URL").default("http://localhost/jobe/index.php/restapi"),
  JOBE_API_KEY: z.string().optional(),
  JOBE_TIMEOUT: z.coerce.number().default(10000),
  JOBE_DEFAULT_TIME_LIMIT: z.coerce.number().default(5),
  JOBE_DEFAULT_MEMORY_LIMIT: z.coerce.number().default(256),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("FALCON"),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().default("FALCON Learning Technologies — Enterprise Learning Platform"),

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
