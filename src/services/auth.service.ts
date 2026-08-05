import { createClient } from "@/lib/supabase/server";
import type { UserProfile, CreateUserInput } from "@/types";

export class AuthService {
  static async signIn(email: string, password: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  static async signUp(input: CreateUserInput) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          first_name: input.first_name,
          last_name: input.last_name,
          role: input.role,
        },
      },
    });
    if (error) throw error;
    return data;
  }

  static async signInWithGoogle() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env["NEXT_PUBLIC_APP_URL"]}/api/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
    return data;
  }

  static async signOut() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async requestPasswordReset(email: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env["NEXT_PUBLIC_APP_URL"]}/auth/reset-password`,
    });
    if (error) throw error;
  }

  static async updatePassword(newPassword: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  static async getCurrentUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  }

  static async getCurrentProfile(): Promise<UserProfile | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return data as unknown as UserProfile | null;
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>) {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as UserProfile;
  }
}
