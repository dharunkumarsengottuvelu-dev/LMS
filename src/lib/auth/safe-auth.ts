import type { SupabaseClient, User, Session, AuthError } from "@supabase/supabase-js";

/**
 * Detects whether a user object is the Supabase GoTrue `userNotAvailableProxy`.
 * When `@supabase/ssr` is used with `tokens-only` or when `userStorage` is empty,
 * GoTrue creates a Proxy for `session.user` that throws on any property access:
 * "@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage."
 */
export function isProxyUser(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  try {
    return Boolean((user as Record<string, unknown>).__isUserNotAvailableProxy);
  } catch {
    // If accessing property threw an error, it is definitely the proxy!
    return true;
  }
}

/**
 * Safely fetches the currently authenticated user using authoritative `getUser()`.
 * Never throws runtime errors if the user storage is empty, cookies are missing,
 * or the session is expired.
 */
export async function getSafeUser(
  client: SupabaseClient<any, any, any>
): Promise<{ user: User | null; error: AuthError | Error | null }> {
  try {
    const { data, error } = await client.auth.getUser();

    if (error) {
      return { user: null, error };
    }

    if (!data?.user || isProxyUser(data.user)) {
      return { user: null, error: null };
    }

    return { user: data.user, error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { user: null, error };
  }
}

/**
 * Safely fetches the current session.
 * Does NOT access properties on `session.user` to avoid triggering the userStorage proxy.
 */
export async function getSafeSession(
  client: SupabaseClient<any, any, any>
): Promise<{ session: Session | null; error: AuthError | Error | null }> {
  try {
    const { data, error } = await client.auth.getSession();

    if (error) {
      return { session: null, error };
    }

    return { session: data?.session ?? null, error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { session: null, error };
  }
}

/**
 * Returns the authenticated user or null. Safe to call anywhere without throwing.
 */
export async function getAuthenticatedUser(
  client: SupabaseClient<any, any, any>
): Promise<User | null> {
  const { user } = await getSafeUser(client);
  return user;
}
