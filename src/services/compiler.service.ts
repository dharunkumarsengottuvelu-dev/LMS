import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_COMPILER_LANGUAGES = [
  { id: "fallback-c", display_name: "C", jobe_language: "c", version: "9.4", is_enabled: true },
  { id: "fallback-cpp", display_name: "C++", jobe_language: "cpp", version: "9.4", is_enabled: true },
  { id: "fallback-java", display_name: "Java", jobe_language: "java", version: "11", is_enabled: true },
  { id: "fallback-python", display_name: "Python", jobe_language: "python", version: "3.10", is_enabled: true },
  { id: "fallback-javascript", display_name: "JavaScript", jobe_language: "javascript", version: "18", is_enabled: true },
  { id: "fallback-csharp", display_name: "C#", jobe_language: "csharp", version: "", is_enabled: true },
  { id: "fallback-go", display_name: "Go", jobe_language: "go", version: "", is_enabled: true },
  { id: "fallback-php", display_name: "PHP", jobe_language: "php", version: "", is_enabled: true },
];

export async function getCompilerLanguages(enabledOnly = false) {
  try {
    const supabase = createAdminClient();
    let query = supabase.from("compiler_languages").select("*").order("display_name");
    
    if (enabledOnly) {
      query = query.eq("is_enabled", true);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.warn("DB fetch for compiler_languages failed, using fallback:", error.message);
      return DEFAULT_COMPILER_LANGUAGES.filter(l => !enabledOnly || l.is_enabled);
    }
    
    return data || [];
  } catch (error) {
    console.warn("Exception fetching compiler_languages, using fallback:", error);
    return DEFAULT_COMPILER_LANGUAGES.filter(l => !enabledOnly || l.is_enabled);
  }
}

export async function isLanguageEnabled(jobe_language: string): Promise<boolean> {
  const languages = await getCompilerLanguages(true);
  return languages.some(l => l.jobe_language === jobe_language);
}
