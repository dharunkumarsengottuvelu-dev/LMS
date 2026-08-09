import type { CodingLanguage } from "@/types/coding";
import { JOBE_LANGUAGE_MAP } from "@/types/coding";

export interface JobeConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  defaultTimeLimitSec: number;
  defaultMemoryLimitMb: number;
}

export function getJobeConfig(): JobeConfig {
  let rawUrl = process.env.JOBE_URL || "http://localhost/jobe/index.php/restapi";

  // Strip trailing slash
  if (rawUrl.endsWith("/")) {
    rawUrl = rawUrl.slice(0, -1);
  }

  // Ensure standard Jobe REST API path is included if only host was provided
  if (!rawUrl.includes("/jobe/index.php/restapi") && !rawUrl.includes("/restapi")) {
    rawUrl = `${rawUrl}/jobe/index.php/restapi`;
  }

  const timeoutMs = parseInt(process.env.JOBE_TIMEOUT || "10000", 10);
  const defaultTimeLimitSec = parseInt(process.env.JOBE_DEFAULT_TIME_LIMIT || "5", 10);
  const defaultMemoryLimitMb = parseInt(process.env.JOBE_DEFAULT_MEMORY_LIMIT || "256", 10);
  const apiKey = process.env.JOBE_API_KEY || undefined;

  return {
    baseUrl: rawUrl,
    apiKey,
    timeoutMs: Number.isNaN(timeoutMs) ? 10000 : timeoutMs,
    defaultTimeLimitSec: Number.isNaN(defaultTimeLimitSec) ? 5 : defaultTimeLimitSec,
    defaultMemoryLimitMb: Number.isNaN(defaultMemoryLimitMb) ? 256 : defaultMemoryLimitMb,
  };
}

export function mapLanguageToJobeId(language: CodingLanguage | string): string {
  const normalized = (language || "").toLowerCase().trim();
  
  if (normalized in JOBE_LANGUAGE_MAP) {
    return JOBE_LANGUAGE_MAP[normalized as keyof typeof JOBE_LANGUAGE_MAP];
  }

  switch (normalized) {
    case "python":
    case "py":
    case "python3":
      return "python3";
    case "java":
    case "java17":
      return "java";
    case "cpp":
    case "c++":
    case "cpp17":
      return "cpp";
    case "c":
      return "c";
    case "js":
    case "javascript":
    case "ts":
    case "typescript":
    case "node":
    case "nodejs":
      return "nodejs";
    case "php":
      return "php";
    case "octave":
      return "octave";
    case "pascal":
      return "pascal";
    case "cs":
    case "csharp":
    case "c#":
      return "cs";
    default:
      return normalized;
  }
}
