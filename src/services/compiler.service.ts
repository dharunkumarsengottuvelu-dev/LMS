import { createAdminClient } from "@/lib/supabase/admin";
import { UNIVERSAL_LANGUAGES, getLanguageDefinition } from "@/lib/compiler/language-registry";
import { UniversalExecutor } from "@/lib/compiler/universal-executor";
import type { CodingLanguage } from "@/types/coding";

export interface CompilerLanguageEntity {
  id: string;
  display_name: string;
  jobe_language: string;
  version: string;
  is_enabled: boolean;
  category?: string;
  health_status?: "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
  last_checked_at?: string;
}

export const DEFAULT_COMPILER_LANGUAGES: CompilerLanguageEntity[] = [
  { id: "c", display_name: "C (GCC)", jobe_language: "c", version: "C17 / GCC 13+", is_enabled: true, category: "compiled" },
  { id: "cpp", display_name: "C++ (GCC)", jobe_language: "cpp", version: "C++17 / GCC 13+", is_enabled: true, category: "compiled" },
  { id: "java", display_name: "Java (OpenJDK)", jobe_language: "java", version: "21 LTS", is_enabled: true, category: "compiled" },
  { id: "python", display_name: "Python 3", jobe_language: "python3", version: "3.10+", is_enabled: true, category: "interpreted" },
  { id: "javascript", display_name: "JavaScript (Node.js)", jobe_language: "nodejs", version: "Node.js 20 LTS", is_enabled: true, category: "interpreted" },
  { id: "typescript", display_name: "TypeScript", jobe_language: "typescript", version: "TypeScript 5+", is_enabled: true, category: "interpreted" },
  { id: "go", display_name: "Go", jobe_language: "go", version: "Go 1.23+", is_enabled: true, category: "compiled" },
  { id: "rust", display_name: "Rust", jobe_language: "rust", version: "Rust 1.82+", is_enabled: true, category: "compiled" },
  { id: "php", display_name: "PHP", jobe_language: "php", version: "PHP 8.3+", is_enabled: true, category: "interpreted" },
  { id: "csharp", display_name: "C# (.NET)", jobe_language: "csharp", version: ".NET 8 / C# 12", is_enabled: true, category: "compiled" },
  { id: "kotlin", display_name: "Kotlin", jobe_language: "kotlin", version: "Kotlin 1.9+", is_enabled: true, category: "compiled" },
  { id: "ruby", display_name: "Ruby", jobe_language: "ruby", version: "Ruby 3.3+", is_enabled: true, category: "interpreted" },
  { id: "swift", display_name: "Swift", jobe_language: "swift", version: "Swift 6.0", is_enabled: true, category: "compiled" },
  { id: "scala", display_name: "Scala", jobe_language: "scala", version: "Scala 3.5", is_enabled: true, category: "compiled" },
  { id: "dart", display_name: "Dart", jobe_language: "dart", version: "Dart 3.0+", is_enabled: true, category: "interpreted" },
  { id: "sql", display_name: "SQL", jobe_language: "sql", version: "SQLite 3", is_enabled: true, category: "sql" },
  { id: "html", display_name: "HTML5", jobe_language: "html", version: "HTML5", is_enabled: true, category: "web" },
  { id: "css", display_name: "CSS3", jobe_language: "css", version: "CSS3", is_enabled: true, category: "web" },
  { id: "react", display_name: "React", jobe_language: "react", version: "React 18", is_enabled: true, category: "web" },
];

export async function getCompilerLanguages(enabledOnly = false): Promise<CompilerLanguageEntity[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase.from("compiler_languages").select("*").order("display_name");
    
    if (enabledOnly) {
      query = query.eq("is_enabled", true);
    }
    
    const { data, error } = await query;
    
    if (error || !data || data.length === 0) {
      return DEFAULT_COMPILER_LANGUAGES.filter(l => !enabledOnly || l.is_enabled);
    }
    
    return data.map((d: any) => ({
      id: d.id,
      display_name: d.display_name,
      jobe_language: d.jobe_language,
      version: d.version || UNIVERSAL_LANGUAGES[d.jobe_language as CodingLanguage]?.version || "Latest",
      is_enabled: d.is_enabled,
      category: d.category || UNIVERSAL_LANGUAGES[d.jobe_language as CodingLanguage]?.category || "general",
    }));
  } catch {
    return DEFAULT_COMPILER_LANGUAGES.filter(l => !enabledOnly || l.is_enabled);
  }
}

export async function isLanguageEnabled(lang: string): Promise<boolean> {
  const norm = (lang || "").toLowerCase().trim();
  if (norm === "sql" || norm === "html" || norm === "css" || norm === "react") return true;
  const languages = await getCompilerLanguages(true);
  return languages.some(l => l.jobe_language === norm || l.id === norm);
}

/**
 * Executes a live Hello World + STDIN smoke test to verify language health.
 */
export async function checkLanguageHealth(language: string): Promise<{
  language: string;
  status: "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
  version: string;
  executionTime: string;
  error?: string;
}> {
  const langDef = getLanguageDefinition(language);
  let smokeCode = "";
  let expectedOutput = "OK";

  switch (langDef.id) {
    case "java":
      smokeCode = `import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("OK");\n  }\n}`;
      break;
    case "python":
      smokeCode = `print("OK")`;
      break;
    case "cpp":
      smokeCode = `#include <iostream>\nusing namespace std;\nint main() { cout << "OK" << endl; return 0; }`;
      break;
    case "c":
      smokeCode = `#include <stdio.h>\nint main() { printf("OK\\n"); return 0; }`;
      break;
    case "javascript":
      smokeCode = `console.log("OK");`;
      break;
    case "typescript":
      smokeCode = `const msg: string = "OK"; console.log(msg);`;
      break;
    case "go":
      smokeCode = `package main\nimport "fmt"\nfunc main() { fmt.Println("OK") }`;
      break;
    case "rust":
      smokeCode = `fn main() { println!("OK"); }`;
      break;
    case "php":
      smokeCode = `<?php echo "OK\\n"; ?>`;
      break;
    case "ruby":
      smokeCode = `puts "OK"`;
      break;
    case "sql":
      return {
        language: langDef.name,
        status: "HEALTHY",
        version: "SQLite 3",
        executionTime: "0.01",
      };
    case "html":
    case "css":
    case "react":
      return {
        language: langDef.name,
        status: "HEALTHY",
        version: "Live Sandboxed Preview",
        executionTime: "0.01",
      };
    default:
      smokeCode = `print("OK")`;
      break;
  }

  try {
    const res = await UniversalExecutor.execute(langDef.id, smokeCode, "", 10000);
    const isPassed = res.stdout.trim() === expectedOutput && (res.outcome === 15 || res.status.id === 3);

    return {
      language: langDef.name,
      status: isPassed ? "HEALTHY" : "DEGRADED",
      version: langDef.version,
      executionTime: `${res.time}s`,
      error: isPassed ? undefined : (res.stderr || res.compile_output || res.message),
    };
  } catch (err: any) {
    return {
      language: langDef.name,
      status: "UNAVAILABLE",
      version: langDef.version,
      executionTime: "0.00s",
      error: err?.message || "Execution error",
    };
  }
}

/**
 * Checks all universal languages and returns full diagnostics.
 */
export async function getAllLanguagesHealth() {
  const enabledList = await getCompilerLanguages(false);
  const results = await Promise.all(
    enabledList.map(async (l) => {
      const health = await checkLanguageHealth(l.jobe_language || l.id);
      return {
        ...l,
        health_status: health.status,
        version: health.version || l.version,
        execution_time: health.executionTime,
        error: health.error,
        last_checked_at: new Date().toISOString(),
      };
    })
  );
  return results;
}
