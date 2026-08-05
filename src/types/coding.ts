export type CodingLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "cpp"
  | "c"
  | "csharp"
  | "go"
  | "rust"
  | "kotlin"
  | "swift"
  | "php"
  | "ruby"
  | "scala";

export type Difficulty = "easy" | "medium" | "hard";
export type SubmissionStatus = "accepted" | "wrong_answer" | "time_limit_exceeded" | "compilation_error" | "runtime_error" | "pending";

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  explanation?: string;
}

export interface TestCaseResult {
  test_case_id: string;
  passed: boolean;
  actual_output?: string;
  expected_output?: string;
  error?: string;
  time_seconds?: number;
  memory_kb?: number;
}

export interface CodeTemplate {
  language: CodingLanguage;
  template: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  constraints?: string;
  sample_input?: string;
  sample_output?: string;
  templates: Record<string, string>;
  test_cases: TestCase[];
  created_at: string;
  updated_at: string;
}

export interface CodingSubmission {
  id: string;
  problem_id: string;
  student_id: string;
  language: CodingLanguage;
  code: string;
  status: SubmissionStatus;
  passed_test_cases: number;
  total_test_cases: number;
  results?: TestCaseResult[];
  created_at: string;
}

export interface ExecuteCodeInput {
  language: CodingLanguage;
  code: string;
  stdin?: string;
}

export interface ExecuteCodeResult {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status: {
    id: number;
    description: string;
  };
  time?: string | null;
  memory?: number | null;
}

export interface SubmitCodeInput {
  problem_id: string;
  language: CodingLanguage;
  code: string;
}

export interface CreateCodingProblemInput {
  title: string;
  description: string;
  difficulty: Difficulty;
  constraints?: string;
  templates: Record<string, string>;
  test_cases: TestCase[];
}

// Judge0 Language ID map
export const JUDGE0_LANGUAGE_MAP: Record<CodingLanguage, number> = {
  javascript: 93,
  typescript: 94,
  python: 92,
  java: 91,
  cpp: 54,
  c: 50,
  csharp: 51,
  go: 60,
  rust: 73,
  kotlin: 78,
  swift: 83,
  php: 68,
  ruby: 72,
  scala: 81,
};

export const LANGUAGE_DISPLAY_NAMES: Record<CodingLanguage, string> = {
  javascript: "JavaScript (Node.js)",
  typescript: "TypeScript",
  python: "Python 3",
  java: "Java 17",
  cpp: "C++ 17",
  c: "C",
  csharp: "C# (.NET)",
  go: "Go",
  rust: "Rust",
  kotlin: "Kotlin",
  swift: "Swift",
  php: "PHP 8",
  ruby: "Ruby",
  scala: "Scala",
};

export const LANGUAGE_FILE_EXTENSIONS: Record<CodingLanguage, string> = {
  javascript: ".js",
  typescript: ".ts",
  python: ".py",
  java: ".java",
  cpp: ".cpp",
  c: ".c",
  csharp: ".cs",
  go: ".go",
  rust: ".rs",
  kotlin: ".kt",
  swift: ".swift",
  php: ".php",
  ruby: ".rb",
  scala: ".scala",
};

export const JUDGE0_STATUS = {
  1: "In Queue",
  2: "Processing",
  3: "Accepted",
  4: "Wrong Answer",
  5: "Time Limit Exceeded",
  6: "Compilation Error",
  7: "Runtime Error (SIGSEGV)",
  8: "Runtime Error (SIGXFSZ)",
  9: "Runtime Error (SIGFPE)",
  10: "Runtime Error (SIGABRT)",
  11: "Runtime Error (NZEC)",
  12: "Runtime Error (Other)",
  13: "Internal Error",
  14: "Exec Format Error",
} as const;

export type Judge0StatusCode = keyof typeof JUDGE0_STATUS;
