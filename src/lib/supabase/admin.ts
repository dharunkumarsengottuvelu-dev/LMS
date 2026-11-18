import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable. Ensure it is configured securely in server environment variables."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}



// This client is used in the browser and triggers the Google Sign-In
export function createBrowserClient() {
  const proxyUrl = process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!proxyUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PROXY_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(proxyUrl, anonKey);
}