import type { OutputComparisonMode } from "./language-registry";

export type StandardExecutionStatus =
  | "QUEUED"
  | "RUNNING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILE_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "SYSTEM_ERROR"
  | "CANCELLED";

export interface EvaluationResult {
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  status: StandardExecutionStatus;
  error?: string;
}

/**
 * Strips sensitive server paths, temp directory names, and private runtime internals
 * from compiler stderr and runtime errors before returning to students.
 */
export function sanitizeCompilerOutput(raw: string, filename?: string): string {
  if (!raw) return "";

  let cleaned = raw;

  // 1. Remove Windows temporary sandbox paths (e.g. C:\Users\...\AppData\Local\Temp\lms_sandbox_12345\)
  cleaned = cleaned.replace(/[A-Za-z]:\\[^:\n\r]+?lms_sandbox_[A-Za-z0-9_\\-]+\\/g, "");
  cleaned = cleaned.replace(/[A-Za-z]:\\[^:\n\r]+?\\Temp\\/g, "");

  // 2. Remove Linux/Unix temporary sandbox paths (e.g. /tmp/lms_sandbox_12345/)
  cleaned = cleaned.replace(/\/tmp\/lms_sandbox_[A-Za-z0-9_\/-]+\//g, "");
  cleaned = cleaned.replace(/\/tmp\//g, "");

  // 3. Remove user home paths (e.g. /home/user/... or C:\Users\username\...)
  cleaned = cleaned.replace(/\/home\/[A-Za-z0-9_-]+\//g, "");
  cleaned = cleaned.replace(/[A-Za-z]:\\Users\\[A-Za-z0-9_-]+\\/g, "");

  // 4. Remove Docker socket and container paths
  cleaned = cleaned.replace(/\/var\/run\/docker\.sock/g, "[isolated-sandbox]");
  cleaned = cleaned.replace(/docker-container-[a-f0-9]+/g, "[sandbox]");

  // 5. Clean up Wandbox internal paths (e.g. prog.java, /wandbox/...)
  cleaned = cleaned.replace(/\/wandbox\/[A-Za-z0-9_\/-]+\//g, "");
  if (filename) {
    cleaned = cleaned.replace(/prog\.[a-z0-9]+/g, filename);
  }

  // 6. Strip leading/trailing blank lines
  return cleaned.trim();
}

/**
 * Normalizes string for whitespace-insensitive output comparison:
 * - Converts CRLF (\r\n) to LF (\n)
 * - Trims trailing whitespace on each line
 * - Collapses multiple trailing newlines
 * - Replaces multiple internal spaces/tabs with single space if specified
 */
export function normalizeWhitespace(str: string, collapseInternalSpaces = false): string {
  if (!str) return "";
  let norm = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = norm.split("\n").map((l) => l.trimEnd());
  norm = lines.join("\n").trim();
  if (collapseInternalSpaces) {
    norm = norm.replace(/[ \t]+/g, " ");
  }
  return norm;
}

/**
 * Compares student actual output against test case expected output
 * using the specified comparison mode.
 */
export function compareOutput(
  actual: string,
  expected: string,
  mode: OutputComparisonMode = "WHITESPACE_NORMALIZED"
): boolean {
  if (mode === "EXACT") {
    return actual === expected;
  }

  if (mode === "TRIMMED") {
    return actual.trim() === expected.trim();
  }

  if (mode === "CASE_INSENSITIVE") {
    const act = normalizeWhitespace(actual).toLowerCase();
    const exp = normalizeWhitespace(expected).toLowerCase();
    return act === exp;
  }

  // Default: WHITESPACE_NORMALIZED
  const act = normalizeWhitespace(actual, true);
  const exp = normalizeWhitespace(expected, true);
  return act === exp;
}

/**
 * Maps raw outcome codes or error messages to standardized LMS execution statuses.
 */
export function resolveStandardStatus(
  outcome: number | undefined,
  stderr: string,
  compileOutput: string,
  timedOut: boolean,
  passed: boolean
): StandardExecutionStatus {
  if (timedOut || outcome === 13) {
    return "TIME_LIMIT_EXCEEDED";
  }

  if (outcome === 17) {
    return "MEMORY_LIMIT_EXCEEDED";
  }

  if (outcome === 11 || (compileOutput && compileOutput.trim().length > 0)) {
    return "COMPILE_ERROR";
  }

  if (outcome === 12 || (outcome !== 15 && outcome !== 0 && outcome !== undefined)) {
    return "RUNTIME_ERROR";
  }

  const combinedError = `${stderr} ${compileOutput}`.toLowerCase();
  if (combinedError.includes("syntax error") || combinedError.includes("compilation error") || combinedError.includes("cannot find symbol")) {
    return "COMPILE_ERROR";
  }

  if (combinedError.includes("exception in thread") || combinedError.includes("traceback") || combinedError.includes("segmentation fault") || combinedError.includes("panic:")) {
    return "RUNTIME_ERROR";
  }

  return passed ? "ACCEPTED" : "WRONG_ANSWER";
}
