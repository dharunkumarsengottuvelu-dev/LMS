/**
 * ============================================================================
 * SENSILEARN LMS – CENTRALIZED CODING LANGUAGE CONFIGURATION & VALIDATION
 * ============================================================================
 * Single source of truth for:
 * 1. Language normalization across manual, bulk upload, student practice, and compiler execution.
 * 2. Language mode validation: Single (exactly 1), Multi (>= 2), All (all compiler supported).
 * 3. Consistent data structure:
 *    {
 *      "language_mode": "single" | "multi" | "all",
 *      "allowed_languages": string[],
 *      "default_language": string
 *    }
 */

export type CodingLanguageMode = "single" | "multi" | "all";

export const COMPILER_SUPPORTED_LANGUAGE_IDS = [
  "c",
  "cpp",
  "java",
  "python",
  "javascript",
  "typescript",
  "csharp",
  "go",
  "rust",
  "kotlin",
  "php",
  "ruby",
  "swift",
  "scala",
  "dart",
  "sql",
  "bash",
  "r",
  "lua",
  "perl",
] as const;

export type CompilerLanguageId = (typeof COMPILER_SUPPORTED_LANGUAGE_IDS)[number];

export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  c: "C",
  cpp: "C++",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  kotlin: "Kotlin",
  php: "PHP",
  ruby: "Ruby",
  swift: "Swift",
  scala: "Scala",
  dart: "Dart",
  sql: "SQL",
  bash: "Bash",
  r: "R",
  lua: "Lua",
  perl: "Perl",
};

/**
 * Normalizes any language string (display name, compiler id, alias, file extension)
 * to its canonical compiler language identifier.
 */
export function normalizeLanguageId(raw: unknown): string {
  if (!raw || typeof raw !== "string") return "";
  const cleaned = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");

  // C++ aliases
  if (
    cleaned === "c++" ||
    cleaned === "cpp" ||
    cleaned === "cplusplus" ||
    cleaned === "cpp17" ||
    cleaned === "cpp20" ||
    cleaned === "cpp23" ||
    cleaned === "c++17" ||
    cleaned === "c++20" ||
    cleaned === "c++23"
  ) {
    return "cpp";
  }

  // C aliases
  if (
    cleaned === "c" ||
    cleaned === "c17" ||
    cleaned === "c11" ||
    cleaned === "c99" ||
    cleaned === "c90"
  ) {
    return "c";
  }

  // Python aliases
  if (
    cleaned === "python" ||
    cleaned === "python3" ||
    cleaned === "python314" ||
    cleaned === "python311" ||
    cleaned === "py" ||
    cleaned === "py3"
  ) {
    return "python";
  }

  // Java aliases
  if (
    cleaned === "java" ||
    cleaned === "java17" ||
    cleaned === "java21" ||
    cleaned === "java25" ||
    cleaned === "jdk"
  ) {
    return "java";
  }

  // JavaScript aliases
  if (
    cleaned === "javascript" ||
    cleaned === "js" ||
    cleaned === "node" ||
    cleaned === "nodejs" ||
    cleaned === "node24" ||
    cleaned === "node20"
  ) {
    return "javascript";
  }

  // TypeScript aliases
  if (
    cleaned === "typescript" ||
    cleaned === "ts" ||
    cleaned === "ts5"
  ) {
    return "typescript";
  }

  // C# aliases
  if (
    cleaned === "c#" ||
    cleaned === "csharp" ||
    cleaned === "cs" ||
    cleaned === "csharp10" ||
    cleaned === "dotnet"
  ) {
    return "csharp";
  }

  // Go aliases
  if (cleaned === "go" || cleaned === "golang") {
    return "go";
  }

  // Rust aliases
  if (cleaned === "rust" || cleaned === "rs") {
    return "rust";
  }

  // Kotlin aliases
  if (cleaned === "kotlin" || cleaned === "kt") {
    return "kotlin";
  }

  // PHP aliases
  if (cleaned === "php" || cleaned === "php8") {
    return "php";
  }

  // Ruby aliases
  if (cleaned === "ruby" || cleaned === "rb") {
    return "ruby";
  }

  // Swift aliases
  if (cleaned === "swift") {
    return "swift";
  }

  // Scala aliases
  if (cleaned === "scala") {
    return "scala";
  }

  // Dart aliases
  if (cleaned === "dart") {
    return "dart";
  }

  // SQL aliases
  if (
    cleaned === "sql" ||
    cleaned === "sqlite" ||
    cleaned === "postgresql" ||
    cleaned === "postgres" ||
    cleaned === "mysql" ||
    cleaned === "sqlserver"
  ) {
    return "sql";
  }

  // Bash aliases
  if (
    cleaned === "bash" ||
    cleaned === "sh" ||
    cleaned === "shell"
  ) {
    return "bash";
  }

  // R aliases
  if (cleaned === "r") {
    return "r";
  }

  // Lua aliases
  if (cleaned === "lua") {
    return "lua";
  }

  // Perl aliases
  if (cleaned === "perl" || cleaned === "pl") {
    return "perl";
  }

  return cleaned;
}

/**
 * Checks if a normalized language identifier is supported by the compiler engine.
 */
export function isCompilerSupportedLanguage(lang: string): boolean {
  const norm = normalizeLanguageId(lang);
  return (COMPILER_SUPPORTED_LANGUAGE_IDS as readonly string[]).includes(norm);
}

/**
 * Returns the human-readable display name for a language id or alias.
 */
export function getLanguageDisplayName(lang: string): string {
  const norm = normalizeLanguageId(lang);
  return LANGUAGE_DISPLAY_NAMES[norm] || (norm ? norm.toUpperCase() : "Plain Text");
}

export interface ValidatedLanguageConfig {
  language_mode: CodingLanguageMode;
  allowed_languages: string[];
  default_language: string;
}

/**
 * Validates and normalizes programming language configuration according to
 * Sensilearn LMS enterprise requirements:
 *
 * - SINGLE: exactly 1 valid compiler-supported language.
 * - MULTI: at least 2 distinct valid compiler-supported languages.
 * - ALL: resolves to all compiler-supported languages.
 * - Rejects unsupported languages.
 * - Rejects duplicates.
 */
export function validateLanguageConfiguration(config: {
  language_mode?: unknown;
  allowed_languages?: unknown;
  default_language?: unknown;
  single_language?: unknown;
}): {
  isValid: boolean;
  errors: string[];
  config: ValidatedLanguageConfig;
} {
  const errors: string[] = [];

  // 1. Resolve raw mode
  const rawModeStr = String(config.language_mode || "").toLowerCase().trim();
  let mode: CodingLanguageMode = "all";
  if (rawModeStr === "single" || rawModeStr === "one" || rawModeStr === "locked") {
    mode = "single";
  } else if (rawModeStr === "multi" || rawModeStr === "multiple") {
    mode = "multi";
  } else if (rawModeStr === "all" || rawModeStr === "universal") {
    mode = "all";
  }

  // 2. Extract allowed languages
  let rawAllowedList: string[] = [];
  if (Array.isArray(config.allowed_languages)) {
    rawAllowedList = config.allowed_languages.map((x) => String(x));
  } else if (typeof config.allowed_languages === "string" && config.allowed_languages.trim()) {
    try {
      const parsed = JSON.parse(config.allowed_languages);
      if (Array.isArray(parsed)) {
        rawAllowedList = parsed.map((x) => String(x));
      } else {
        rawAllowedList = config.allowed_languages.split(/[,|;\s]+/);
      }
    } catch {
      rawAllowedList = config.allowed_languages.split(/[,|;\s]+/);
    }
  } else if (config.single_language && typeof config.single_language === "string") {
    rawAllowedList = [config.single_language];
  }

  // Normalize each language item
  const normalizedAllowed: string[] = [];
  const seen = new Set<string>();
  const duplicateErrors = new Set<string>();
  const unsupportedErrors = new Set<string>();

  for (const rawItem of rawAllowedList) {
    const rawTrimmed = String(rawItem || "").trim();
    if (!rawTrimmed) continue;

    const norm = normalizeLanguageId(rawTrimmed);
    if (!isCompilerSupportedLanguage(norm)) {
      unsupportedErrors.add(rawTrimmed);
      continue;
    }

    if (seen.has(norm)) {
      duplicateErrors.add(norm);
    } else {
      seen.add(norm);
      normalizedAllowed.push(norm);
    }
  }

  if (unsupportedErrors.size > 0) {
    errors.push(
      `Unsupported programming language(s): ${Array.from(unsupportedErrors).join(", ")}. Supported languages: [${COMPILER_SUPPORTED_LANGUAGE_IDS.join(", ")}].`
    );
  }

  if (duplicateErrors.size > 0) {
    errors.push(
      `Duplicate programming language(s) specified: ${Array.from(duplicateErrors).map(getLanguageDisplayName).join(", ")}.`
    );
  }

  // Mode-specific validation rules
  let finalAllowed: string[] = [];
  let finalDefault: string = "";

  if (mode === "single") {
    if (normalizedAllowed.length === 0) {
      errors.push("Single language mode requires exactly one selected language.");
      finalAllowed = ["c"]; // safe fallback
    } else if (normalizedAllowed.length > 1) {
      errors.push(
        `Single language mode requires exactly ONE language, but ${normalizedAllowed.length} were provided: [${normalizedAllowed.map(getLanguageDisplayName).join(", ")}]. Use Multi Language mode instead.`
      );
      finalAllowed = [normalizedAllowed[0] || "c"];
    } else {
      finalAllowed = [normalizedAllowed[0] || "c"];
    }
    finalDefault = finalAllowed[0] || "c";
  } else if (mode === "multi") {
    if (normalizedAllowed.length < 2) {
      errors.push(
        `Multi language mode requires at least TWO distinct languages, but only ${normalizedAllowed.length} was provided. Use Single Language mode for a single language.`
      );
      finalAllowed = normalizedAllowed.length === 1 ? [normalizedAllowed[0] || "c", "cpp"] : ["c", "cpp"];
    } else {
      finalAllowed = normalizedAllowed;
    }

    const rawDef = String(config.default_language || "").trim();
    const normDef = normalizeLanguageId(rawDef);
    if (normDef && finalAllowed.includes(normDef)) {
      finalDefault = normDef;
    } else {
      finalDefault = finalAllowed[0] || "c";
    }
  } else {
    // "all" mode
    finalAllowed = Array.from(COMPILER_SUPPORTED_LANGUAGE_IDS);
    const rawDef = String(config.default_language || "").trim();
    const normDef = normalizeLanguageId(rawDef);
    if (normDef && finalAllowed.includes(normDef)) {
      finalDefault = normDef;
    } else {
      finalDefault = "c";
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    config: {
      language_mode: mode,
      allowed_languages: finalAllowed,
      default_language: finalDefault,
    },
  };
}

/**
 * Validates complete fields for a coding problem record (used by both Manual and Bulk creation).
 */
export function validateCodingProblemRecord(problem: Record<string, any>, rowNumber?: number): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const prefix = rowNumber !== undefined ? `Row ${rowNumber} – ` : "";

  // 1. Title
  const title = String(problem.title || "").trim();
  if (!title) {
    errors.push(`${prefix}Missing Problem Title.`);
  }

  // 2. Description
  const description = String(problem.description || problem.problem_statement || "").trim();
  if (!description) {
    errors.push(`${prefix}Missing Problem Description.`);
  }

  // 3. Difficulty Level
  const rawDiff = String(problem.difficulty || "").trim().toLowerCase();
  const validDifficulties = ["easy", "medium", "hard"];
  if (!rawDiff) {
    errors.push(`${prefix}Missing Difficulty Level.`);
  } else if (!validDifficulties.includes(rawDiff)) {
    errors.push(`${prefix}Invalid Difficulty: '${problem.difficulty}'. Allowed: Easy, Medium, Hard.`);
  }

  // 4. Test Cases Validation (At least 1 Public Test Case and at least 1 Hidden Test Case)
  const rawTestCases = Array.isArray(problem.test_cases)
    ? problem.test_cases
    : Array.isArray(problem.testCases)
    ? problem.testCases
    : [];

  const publicCases = rawTestCases.filter((tc: any) => !tc.is_hidden && !tc.isHidden);
  const hiddenCases = rawTestCases.filter((tc: any) => Boolean(tc.is_hidden || tc.isHidden));

  if (rawTestCases.length === 0) {
    errors.push(`${prefix}Missing Test Cases. At least 1 public test case and 1 hidden test case are required.`);
  } else {
    if (publicCases.length === 0) {
      errors.push(`${prefix}Missing Public Test Cases. At least 1 public sample test case is required.`);
    }
    if (hiddenCases.length === 0) {
      errors.push(`${prefix}Missing Hidden Test Cases. At least 1 private/hidden test case is required for submission grading.`);
    }

    // Check that expected outputs are not empty
    rawTestCases.forEach((tc: any, idx: number) => {
      const out = tc.expected_output ?? tc.expectedOutput ?? tc.output;
      if (out === undefined || out === null || String(out).trim() === "") {
        errors.push(`${prefix}Test Case ${idx + 1} has empty Expected Output.`);
      }
    });
  }

  // 5. Language Configuration
  const langValidation = validateLanguageConfiguration({
    language_mode: problem.language_mode,
    allowed_languages: problem.allowed_languages || problem.allowedLanguages,
    default_language: problem.default_language || problem.defaultLanguage,
    single_language: problem.language,
  });

  if (!langValidation.isValid) {
    langValidation.errors.forEach((err) => errors.push(`${prefix}${err}`));
  }

  // 6. Time and Memory Limits
  if (problem.time_limit_ms !== undefined && problem.time_limit_ms !== null) {
    const t = Number(problem.time_limit_ms);
    if (isNaN(t) || t <= 0 || t > 60000) {
      errors.push(`${prefix}Invalid Time Limit: must be between 100ms and 60000ms.`);
    }
  }

  if (problem.memory_limit_mb !== undefined && problem.memory_limit_mb !== null) {
    const m = Number(problem.memory_limit_mb);
    if (isNaN(m) || m <= 0 || m > 4096) {
      errors.push(`${prefix}Invalid Memory Limit: must be between 16MB and 4096MB.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
