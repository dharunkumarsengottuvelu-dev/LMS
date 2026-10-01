"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getSafeUser, getSafeSession, isProxyUser } from "@/lib/auth/safe-auth";
import type { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function fetchProfile(userId: string, email?: string) {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`user_id.eq.${userId},id.eq.${userId}${email ? `,email.eq.${email}` : ""}`)
        .maybeSingle();

      if (error) {
        console.warn("Profile fetch warning:", error.message);
      }

      const userEmail = email?.toLowerCase() || user?.email?.toLowerCase() || "";
      const defaultRole = "student";

      let currentAuthUser = user && !isProxyUser(user) ? user : null;
      if (!currentAuthUser) {
        const { user: authUser } = await getSafeUser(supabase);
        currentAuthUser = authUser;
      }

      const meta = currentAuthUser?.user_metadata || {};
      const fullName = (meta.full_name || meta.name || "").trim();
      const nameParts = fullName.split(" ");
      const emailPrefix = userEmail.split("@")[0] || "User";
      const formattedEmailName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      const metaFirstName = meta.first_name || nameParts[0] || formattedEmailName;
      const metaLastName = meta.last_name || nameParts.slice(1).join(" ") || "";

      if (data) {
        const dAny = data as any;
        const resolvedFirst = dAny.first_name || metaFirstName;
        const resolvedLast = dAny.last_name || metaLastName;
        const resolvedAvatar =
          dAny.avatar_url ||
          meta.avatar_url ||
          meta.picture ||
          meta.photo_url ||
          (userEmail ? `https://unavatar.io/${encodeURIComponent(userEmail)}?fallback=false` : null);

        // If avatar wasn't saved in database but was discovered from email/OAuth, persist it in the background
        if (!dAny.avatar_url && resolvedAvatar) {
          (supabase.from("profiles") as any)
            .update({ avatar_url: resolvedAvatar })
            .eq("user_id", userId)
            .then(() => {});
        }

        setProfile({
          ...dAny,
          first_name: resolvedFirst,
          last_name: resolvedLast,
          full_name: dAny.full_name || `${resolvedFirst} ${resolvedLast}`.trim(),
          avatar_url: resolvedAvatar,
          student_id: meta.student_id || dAny.student_id || undefined,
        } as UserProfile);
      } else {
        const fallbackAvatar =
          meta.avatar_url ||
          meta.picture ||
          meta.photo_url ||
          (userEmail ? `https://unavatar.io/${encodeURIComponent(userEmail)}?fallback=false` : null);

        setProfile({
          id: userId,
          user_id: userId,
          first_name: metaFirstName,
          last_name: metaLastName,
          full_name: `${metaFirstName} ${metaLastName}`.trim(),
          role: defaultRole,
          status: "active",
          avatar_url: fallbackAvatar,
          student_id: meta.student_id || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserProfile);
      }
    } catch (err) {
      console.error("Profile fetch exception:", err);
    }
  }

  async function refreshProfile() {
    let activeUser = user && !isProxyUser(user) ? user : null;
    if (!activeUser) {
      const { user: authUser } = await getSafeUser(supabase);
      activeUser = authUser;
    }
    if (activeUser) {
      await fetchProfile(activeUser.id, activeUser.email);
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out notice:", err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    // 1. Authoritative initial auth verification using getUser()
    async function initAuth() {
      try {
        const { user: authUser, error: userError } = await getSafeUser(supabase);
        if (!isMounted) return;

        if (userError) {
          console.warn("Initial auth notice:", userError.message);
        }

        if (!authUser) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(authUser);

        // Fetch session safely without accessing session.user properties
        try {
          const { session: currentSession } = await getSafeSession(supabase);
          if (isMounted) {
            setSession(currentSession);
          }
        } catch {}

        if (typeof window !== "undefined") {
          const firstLoginKey = `first_login_${authUser.id}`;
          if (!localStorage.getItem(firstLoginKey)) {
            const initialDate = authUser.created_at || new Date().toISOString();
            localStorage.setItem(firstLoginKey, initialDate);
          }
        }

        await fetchProfile(authUser.id, authUser.email);
      } catch (err) {
        console.warn("Auth initialization notice:", err);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // 2. Listen for auth changes safely
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !newSession) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // On auth change (SIGNED_IN, TOKEN_REFRESHED, etc.), use authoritative getUser()
      try {
        const { user: authUser } = await getSafeUser(supabase);
        if (!isMounted) return;

        if (!authUser) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(authUser);
        setSession(newSession);

        if (typeof window !== "undefined") {
          const firstLoginKey = `first_login_${authUser.id}`;
          if (!localStorage.getItem(firstLoginKey)) {
            const initialDate = authUser.created_at || new Date().toISOString();
            localStorage.setItem(firstLoginKey, initialDate);
          }
        }

        await fetchProfile(authUser.id, authUser.email);
      } catch (err) {
        console.warn("Auth state change notice:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
