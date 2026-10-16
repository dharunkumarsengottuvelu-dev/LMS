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
  | "scala"
  | "dart"
  | "sql"
  | "html"
  | "css"
  | "react"
  | "bash"
  | "r"
  | "lua"
  | "perl";

export type ExecutionCategory = "general" | "web" | "sql";

export interface CodeFile {
  name: string;
  content: string;
}

export interface MultiFilePayload {
  language: CodingLanguage;
  files: CodeFile[];
  stdin?: string;
}

export type SQLEngine = "sqlite" | "mysql" | "postgresql" | "mariadb";
export type SQLComparisonMode = "ORDER_SENSITIVE" | "ORDER_INSENSITIVE";
export type SQLQuestionMode = "QUERY_ONLY" | "TABLE_CREATION_AND_QUERY";

export interface SQLColumnSchema {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  description?: string;
}

export interface SQLTableSchema {
  name: string;
  columns: SQLColumnSchema[];
  rows: Record<string, any>[];
  description?: string;
}

export interface SQLDatasetSchema {
  name: string;
  tables: SQLTableSchema[];
}

export interface SQLQueryInput {
  query: string;
  datasetName?: string;
  engine?: SQLEngine;
  mode?: SQLQuestionMode;
  provideTables?: boolean;
  schemaSql?: string;
  seedSql?: string;
  comparisonMode?: SQLComparisonMode;
  timeoutMs?: number;
}

export interface SQLQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  engine?: SQLEngine;
}

export interface LanguageVersionConfig {
  id: string;
  name: string;
  label: string;
  compilerFlag?: string;
  isDefault?: boolean;
}

export interface LanguageConfig {
  id: CodingLanguage;
  name: string;
  monacoLanguage: string;
  jobeLanguage: string;
  extension: string;
  category: ExecutionCategory;
  compilationRequired: boolean;
  version: string;
  supportedVersions?: LanguageVersionConfig[];
}

export const LANGUAGE_REGISTRY: Record<CodingLanguage, LanguageConfig> = {
  javascript: {
    id: "javascript",
    name: "JavaScript",
    monacoLanguage: "javascript",
    jobeLanguage: "nodejs",
    extension: ".js",
    category: "general",
    compilationRequired: false,
    version: "Node.js 24 LTS",
    supportedVersions: [
      { id: "node24", name: "Node.js 24 LTS", label: "Node.js 24", isDefault: true },
      { id: "node20", name: "Node.js 20 LTS", label: "Node.js 20" },
    ],
  },
  typescript: {
    id: "typescript",
    name: "TypeScript",
    monacoLanguage: "typescript",
    jobeLanguage: "nodejs",
    extension: ".ts",
    category: "general",
    compilationRequired: false,
    version: "TypeScript 5.6+",
    supportedVersions: [
      { id: "ts5", name: "TypeScript 5.6+", label: "TypeScript 5.6", isDefault: true },
    ],
  },
  python: {
    id: "python",
    name: "Python",
    monacoLanguage: "python",
    jobeLanguage: "python3",
    extension: ".py",
    category: "general",
    compilationRequired: false,
    version: "Python 3.14+",
    supportedVersions: [
      { id: "3.14", name: "Python 3.14+", label: "Python 3.14", isDefault: true },
      { id: "3.11", name: "Python 3.11", label: "Python 3.11" },
    ],
  },
  java: {
    id: "java",
    name: "Java",
    monacoLanguage: "java",
    jobeLanguage: "java",
    extension: ".java",
    category: "general",
    compilationRequired: true,
    version: "Java 25 LTS",
    supportedVersions: [
      { id: "25", name: "Java 25 (LTS)", label: "Java 25", isDefault: true },
      { id: "21", name: "Java 21 (LTS)", label: "Java 21" },
      { id: "17", name: "Java 17 (LTS)", label: "Java 17" },
    ],
  },
  cpp: {
    id: "cpp",
    name: "C++",
    monacoLanguage: "cpp",
    jobeLanguage: "cpp",
    extension: ".cpp",
    category: "general",
    compilationRequired: true,
    version: "C++20 / GCC 13+",
    supportedVersions: [
      { id: "c++20", name: "C++20 (GCC 13+)", label: "C++20", compilerFlag: "-std=c++20", isDefault: true },
      { id: "c++17", name: "C++17 (GCC 13+)", label: "C++17", compilerFlag: "-std=c++17" },
      { id: "c++23", name: "C++23 (GCC 13+)", label: "C++23", compilerFlag: "-std=c++23" },
    ],
  },
  c: {
    id: "c",
    name: "C",
    monacoLanguage: "c",
    jobeLanguage: "c",
    extension: ".c",
    category: "general",
    compilationRequired: true,
    version: "C17 / GCC 13+",
    supportedVersions: [
      { id: "c17", name: "C17 (GCC 13+)", label: "C17", compilerFlag: "-std=c17", isDefault: true },
    ],
  },
  csharp: {
    id: "csharp",
    name: "C#",
    monacoLanguage: "csharp",
    jobeLanguage: "cs",
    extension: ".cs",
    category: "general",
    compilationRequired: true,
    version: "C# 10 / Mono 6.12",
    supportedVersions: [
      { id: "mono6", name: "C# 10 / Mono 6.12", label: "C# 10", isDefault: true },
    ],
  },
  go: {
    id: "go",
    name: "Go",
    monacoLanguage: "go",
    jobeLanguage: "go",
    extension: ".go",
    category: "general",
    compilationRequired: true,
    version: "Go 1.23+",
    supportedVersions: [
      { id: "1.23", name: "Go 1.23+", label: "Go 1.23", isDefault: true },
    ],
  },
  rust: {
    id: "rust",
    name: "Rust",
    monacoLanguage: "rust",
    jobeLanguage: "rust",
    extension: ".rs",
    category: "general",
    compilationRequired: true,
    version: "Rust 1.82+",
    supportedVersions: [
      { id: "1.82", name: "Rust 1.82+", label: "Rust 1.82", isDefault: true },
    ],
  },
  kotlin: {
    id: "kotlin",
    name: "Kotlin",
    monacoLanguage: "kotlin",
    jobeLanguage: "kotlin",
    extension: ".kt",
    category: "general",
    compilationRequired: true,
    version: "Kotlin 1.9+",
    supportedVersions: [
      { id: "1.9", name: "Kotlin 1.9+", label: "Kotlin 1.9", isDefault: true },
    ],
  },
  swift: {
    id: "swift",
    name: "Swift",
    monacoLanguage: "swift",
    jobeLanguage: "swift",
    extension: ".swift",
    category: "general",
    compilationRequired: true,
    version: "Swift 6.0",
    supportedVersions: [
      { id: "6.0", name: "Swift 6.0", label: "Swift 6.0", isDefault: true },
    ],
  },
  php: {
    id: "php",
    name: "PHP",
    monacoLanguage: "php",
    jobeLanguage: "php",
    extension: ".php",
    category: "general",
    compilationRequired: false,
    version: "PHP 8.3+",
    supportedVersions: [
      { id: "8.3", name: "PHP 8.3+", label: "PHP 8.3", isDefault: true },
    ],
  },
  ruby: {
    id: "ruby",
    name: "Ruby",
    monacoLanguage: "ruby",
    jobeLanguage: "ruby",
    extension: ".rb",
    category: "general",
    compilationRequired: false,
    version: "Ruby 3.3+",
    supportedVersions: [
      { id: "3.3", name: "Ruby 3.3+", label: "Ruby 3.3", isDefault: true },
    ],
  },
  scala: {
    id: "scala",
    name: "Scala",
    monacoLanguage: "scala",
    jobeLanguage: "scala",
    extension: ".scala",
    category: "general",
    compilationRequired: true,
    version: "Scala 3.5",
    supportedVersions: [
      { id: "3.5", name: "Scala 3.5", label: "Scala 3.5", isDefault: true },
    ],
  },
  dart: {
    id: "dart",
    name: "Dart",
    monacoLanguage: "dart",
    jobeLanguage: "dart",
    extension: ".dart",
    category: "general",
    compilationRequired: false,
    version: "Dart 3.0+",
    supportedVersions: [
      { id: "3.0", name: "Dart 3.0+", label: "Dart 3.0", isDefault: true },
    ],
  },
  sql: {
    id: "sql",
    name: "SQL",
    monacoLanguage: "sql",
    jobeLanguage: "sql",
    extension: ".sql",
    category: "sql",
    compilationRequired: false,
    version: "SQLite 3 / Postgres",
    supportedVersions: [
      { id: "sqlite3", name: "SQLite 3 Sandbox", label: "SQLite 3", isDefault: true },
    ],
  },
  html: { id: "html", name: "HTML", monacoLanguage: "html", jobeLanguage: "html", extension: ".html", category: "web", compilationRequired: false, version: "HTML5" },
  css: { id: "css", name: "CSS", monacoLanguage: "css", jobeLanguage: "css", extension: ".css", category: "web", compilationRequired: false, version: "CSS3" },
  react: { id: "react", name: "React", monacoLanguage: "typescript", jobeLanguage: "react", extension: ".tsx", category: "web", compilationRequired: false, version: "React 18" },
  bash: {
    id: "bash",
    name: "Bash",
    monacoLanguage: "shell",
    jobeLanguage: "bash",
    extension: ".sh",
    category: "general",
    compilationRequired: false,
    version: "GNU Bash 5+",
    supportedVersions: [
      { id: "5", name: "GNU Bash 5+", label: "Bash 5", isDefault: true },
    ],
  },
  r: {
    id: "r",
    name: "R",
    monacoLanguage: "r",
    jobeLanguage: "r",
    extension: ".r",
    category: "general",
    compilationRequired: false,
    version: "R 4.4+",
    supportedVersions: [
      { id: "4.4", name: "R 4.4+", label: "R 4.4", isDefault: true },
    ],
  },
  lua: {
    id: "lua",
    name: "Lua",
    monacoLanguage: "lua",
    jobeLanguage: "lua",
    extension: ".lua",
    category: "general",
    compilationRequired: false,
    version: "Lua 5.4+",
    supportedVersions: [
      { id: "5.4", name: "Lua 5.4+", label: "Lua 5.4", isDefault: true },
    ],
  },
  perl: {
    id: "perl",
    name: "Perl",
    monacoLanguage: "perl",
    jobeLanguage: "perl",
    extension: ".pl",
    category: "general",
    compilationRequired: false,
    version: "Perl 5.40+",
    supportedVersions: [
      { id: "5.40", name: "Perl 5.40+", label: "Perl 5.40", isDefault: true },
    ],
  },
};

export type Difficulty = "easy" | "medium" | "hard";
export type SubmissionStatus =
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "memory_limit_exceeded"
  | "output_limit_exceeded"
  | "compilation_error"
  | "runtime_error"
  | "pending";

export interface ExampleCase {
  id?: string;
  input: string;
  output: string;
  explanation?: string;
}

export interface SolutionApproach {
  name: string;
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
  code: Record<string, string>;
}

export interface SolutionEditorial {
  overview: string;
  approaches: SolutionApproach[];
}

export interface TestCase {
  id: string;
  name?: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  explanation?: string;
  weight?: number;
  is_enabled?: boolean;
  order_index?: number;
}

export interface TestCaseResult {
  test_case_id: string;
  passed: boolean;
  is_hidden?: boolean;
  input?: string;
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
  problem_number?: number | string;
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  category?: string;
  type?: string;
  topic_tags?: string[];
  points?: number;
  acceptance_rate?: string;
  constraints?: string;
  input_format?: string;
  output_format?: string;
  explanation?: string;
  sample_input?: string;
  sample_output?: string;
  example_cases?: ExampleCase[];
  solution_editorial?: SolutionEditorial;
  templates: Record<string, string>;
  allowed_languages?: string[];
  allowedLanguages?: string[];
  default_language?: string;
  function_signature?: string;
  test_cases: TestCase[];
  sample_test_cases?: TestCase[];
  hidden_test_cases?: TestCase[];
  reveal_hidden_testcases?: boolean;
  dataset_name?: string;
  sql_engine?: SQLEngine;
  sql_question_mode?: SQLQuestionMode;
  provide_tables?: boolean;
  schema_sql?: string;
  seed_sql?: string;
  comparison_mode?: SQLComparisonMode;
  duration_minutes?: number;
  time_limit_ms?: number;
  memory_limit_mb?: number;
  max_attempts?: number;
  status?: "draft" | "published";
  start_date?: string;
  due_date?: string;
  allow_run?: boolean;
  allow_submit?: boolean;
  is_mandatory?: boolean;
  enforce_fullscreen?: boolean;
  restrict_copy_paste?: boolean;
  restrict_screenshot?: boolean;
  scope?: "codelab" | "practice" | "assessment";
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
  execution_time?: number;
  memory_used?: number;
  results?: TestCaseResult[];
  created_at: string;
}

export interface ExecuteCodeInput {
  language: CodingLanguage;
  version?: string;
  code: string;
  files?: CodeFile[];
  stdin?: string;
  html?: string;
  css?: string;
  js?: string;
  sql_engine?: SQLEngine;
  sql_question_mode?: SQLQuestionMode;
  provide_tables?: boolean;
  schema_sql?: string;
  seed_sql?: string;
  comparison_mode?: SQLComparisonMode;
  dataset_name?: string;
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
  sqlResult?: SQLQueryResult | null;
}

export interface SubmitCodeInput {
  problem_id: string;
  language: CodingLanguage;
  version?: string;
  code: string;
  files?: CodeFile[];
  test_cases?: TestCase[];
  sql_engine?: SQLEngine;
  sql_question_mode?: SQLQuestionMode;
  provide_tables?: boolean;
  schema_sql?: string;
  seed_sql?: string;
  comparison_mode?: SQLComparisonMode;
}

export interface CreateCodingProblemInput {
  title: string;
  description: string;
  difficulty: Difficulty;
  constraints?: string;
  templates: Record<string, string>;
  test_cases: TestCase[];
  sql_engine?: SQLEngine;
  sql_question_mode?: SQLQuestionMode;
  provide_tables?: boolean;
  schema_sql?: string;
  seed_sql?: string;
  comparison_mode?: SQLComparisonMode;
  dataset_name?: string;
}

// Jobe Language ID map (Jobe language identifiers used by trampgeek/jobe)
export const JOBE_LANGUAGE_MAP: Record<CodingLanguage, string> = {
  python: "python3",
  java: "java",
  cpp: "cpp",
  c: "c",
  javascript: "nodejs",
  typescript: "nodejs",
  php: "php",
  octave: "octave",
  pascal: "pascal",
  csharp: "cs",
  go: "go",
  rust: "rust",
  kotlin: "kotlin",
  swift: "swift",
  ruby: "ruby",
  scala: "scala",
  dart: "dart",
  sql: "sql",
  html: "html",
  css: "css",
  react: "react",
  bash: "bash",
  r: "r",
  lua: "lua",
  perl: "perl",
} as unknown as Record<CodingLanguage, string>;

// Backward compatibility map for legacy references
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
  dart: 90,
  sql: 82,
  html: 95,
  css: 96,
  react: 97,
  bash: 46,
  r: 80,
  lua: 64,
  perl: 85,
} as unknown as Record<CodingLanguage, number>;

export const LANGUAGE_DISPLAY_NAMES: Record<CodingLanguage, string> = Object.fromEntries(
  Object.entries(LANGUAGE_REGISTRY).map(([key, val]) => [key, val.name])
) as Record<CodingLanguage, string>;

export const LANGUAGE_FILE_EXTENSIONS: Record<CodingLanguage, string> = Object.fromEntries(
  Object.entries(LANGUAGE_REGISTRY).map(([key, val]) => [key, val.extension])
) as Record<CodingLanguage, string>;

// Official Jobe Outcome codes (trampgeek/jobe specification)
export const JOBE_OUTCOME = {
  SUCCESS: 15,
  SUCCESS_ALT: 0,
  COMPILATION_ERROR: 11,
  RUNTIME_ERROR: 12,
  TIME_LIMIT_EXCEEDED: 13,
  MEMORY_LIMIT_EXCEEDED: 17,
  ILLEGAL_SYSTEM_CALL: 19,
  INTERNAL_ERROR: 20,
  SERVER_OVERLOAD: 21,
} as const;

export const JOBE_OUTCOME_DESCRIPTION: Record<number, string> = {
  15: "Success",
  0: "Success",
  11: "Compilation Error",
  12: "Runtime Error",
  13: "Time Limit Exceeded",
  17: "Memory Limit Exceeded",
  19: "Illegal System Call",
  20: "Internal Server Error",
  21: "Server Overload",
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

