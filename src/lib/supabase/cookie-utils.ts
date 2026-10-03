/**
 * Cookie utilities for resilient Supabase SSR authentication.
 * Prevents stale/duplicate path-scoped cookies from shadowing active sessions.
 * Per RFC 6265, browsers list longer paths (/student) before shorter paths (/).
 * Deduplicating by keeping the last occurrence guarantees the root (/) cookie wins.
 */

export function deduplicateCookies(cookies: { name: string; value: string }[]): { name: string; value: string }[] {
  const map = new Map<string, string>();
  for (const c of cookies) {
    if (c && c.name && c.value) {
      map.set(c.name, c.value);
    }
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}
