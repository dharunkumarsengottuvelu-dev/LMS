import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Singleton pattern for browser client
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

export function createClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  return client;
}
