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
  // 1. First test line-level trailing whitespace and newline normalization
  const actTrimmed = normalizeWhitespace(actual, false);
  const expTrimmed = normalizeWhitespace(expected, false);
  if (actTrimmed === expTrimmed) return true;

  // 2. Next test collapsed internal spaces
  const actCollapsed = normalizeWhitespace(actual, true);
  const expCollapsed = normalizeWhitespace(expected, true);
  return actCollapsed === expCollapsed;
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

/**
 * Shared normalization utilities for test cases across Admin, Trainer, and Student workflows.
 * Ensures consistent handling of input, expected output, and public/hidden test case extraction.
 */

export function normalizeTestInput(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  const trimmed = str.trim();
  if (
    trimmed === "No input" ||
    trimmed === "(No input)" ||
    trimmed === "(no input)" ||
    trimmed === "None" ||
    trimmed === "(None)" ||
    trimmed === "(none)" ||
    trimmed === "N/A" ||
    trimmed === "n/a"
  ) {
    return "";
  }
  return str.replace(/\r\n/g, "\n");
}

export function normalizeExpectedOutput(tc: any): string {
  if (tc === null || tc === undefined) return "";
  if (typeof tc === "string") return tc.replace(/\r\n/g, "\n");
  const raw =
    tc.expected_output !== undefined && tc.expected_output !== null
      ? tc.expected_output
      : tc.expectedOutput !== undefined && tc.expectedOutput !== null
      ? tc.expectedOutput
      : tc.output !== undefined && tc.output !== null
      ? tc.output
      : tc.expected !== undefined && tc.expected !== null
      ? tc.expected
      : tc.target_output !== undefined && tc.target_output !== null
      ? tc.target_output
      : "";
  return String(raw).replace(/\r\n/g, "\n");
}

export interface NormalizedTestCase {
  id: string;
  name?: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export function normalizeTestCase(tc: any, index: number = 0): NormalizedTestCase {
  const isHidden = Boolean(tc?.is_hidden || tc?.isHidden || tc?.hidden);
  const rawInput = tc?.input !== undefined && tc?.input !== null ? tc.input : (tc?.stdin !== undefined && tc?.stdin !== null ? tc.stdin : "");
  return {
    id: String(tc?.id || tc?.test_case_id || `tc_${index + 1}`),
    name: tc?.name || `Test Case ${index + 1}`,
    input: normalizeTestInput(rawInput),
    expected_output: normalizeExpectedOutput(tc),
    is_hidden: isHidden,
  };
}

/**
 * Extracts visible/sample test cases from any question format created by Admin or Trainer.
 */
export function extractSampleTestCases(problem: any): NormalizedTestCase[] {
  if (!problem) return [];
  const starter = (typeof problem.starter_code === "object" && problem.starter_code !== null)
    ? problem.starter_code
    : {};

  // 1. Direct sample_test_cases
  const directSample =
    Array.isArray(problem.sample_test_cases) && problem.sample_test_cases.length > 0
      ? problem.sample_test_cases
      : Array.isArray(problem.sampleTestCases) && problem.sampleTestCases.length > 0
      ? problem.sampleTestCases
      : Array.isArray(problem.publicTestCases) && problem.publicTestCases.length > 0
      ? problem.publicTestCases
      : Array.isArray(starter.sample_test_cases) && starter.sample_test_cases.length > 0
      ? starter.sample_test_cases
      : Array.isArray(starter.sampleTestCases) && starter.sampleTestCases.length > 0
      ? starter.sampleTestCases
      : [];

  if (directSample.length > 0) {
    return directSample.map((tc: any, idx: number) => ({
      ...normalizeTestCase(tc, idx),
      is_hidden: false,
    }));
  }

  // 2. Direct test_cases filtering for non-hidden
  const allCases =
    Array.isArray(problem.test_cases) && problem.test_cases.length > 0
      ? problem.test_cases
      : Array.isArray(problem.testCases) && problem.testCases.length > 0
      ? problem.testCases
      : Array.isArray(starter.test_cases) && starter.test_cases.length > 0
      ? starter.test_cases
      : [];

  const publicCases = allCases.filter((tc: any) => !tc.is_hidden && !tc.isHidden && !tc.hidden);
  if (publicCases.length > 0) {
    return publicCases.map((tc: any, idx: number) => ({
      ...normalizeTestCase(tc, idx),
      is_hidden: false,
    }));
  }

  // If all cases exist but none explicitly marked !is_hidden, use first case as visible sample
  if (allCases.length > 0) {
    return [
      {
        ...normalizeTestCase(allCases[0], 0),
        is_hidden: false,
      },
    ];
  }

  // 3. Fallback to example cases ONLY if they contain actual expected output
  const examples =
    Array.isArray(problem.example_cases) && problem.example_cases.length > 0
      ? problem.example_cases
      : Array.isArray(problem.examples) && problem.examples.length > 0
      ? problem.examples
      : Array.isArray(starter.example_cases) && starter.example_cases.length > 0
      ? starter.example_cases
      : [];

  const validExamples = examples.filter((eg: any) => {
    const out = normalizeExpectedOutput(eg);
    return out.trim().length > 0;
  });

  if (validExamples.length > 0) {
    return validExamples.map((eg: any, idx: number) => ({
      id: `sample_eg_${idx + 1}`,
      name: `Sample Case ${idx + 1}`,
      input: normalizeTestInput(eg.input),
      expected_output: normalizeExpectedOutput(eg),
      is_hidden: false,
    }));
  }

  // 4. Default single case
  return [
    {
      id: "tc_sample_1",
      name: "Sample Case 1",
      input: "",
      expected_output: "",
      is_hidden: false,
    },
  ];
}

