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
  | "bash";

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

export interface LanguageConfig {
  id: CodingLanguage;
  name: string;
  monacoLanguage: string;
  jobeLanguage: string;
  extension: string;
  category: ExecutionCategory;
  compilationRequired: boolean;
  version: string;
}

export const LANGUAGE_REGISTRY: Record<CodingLanguage, LanguageConfig> = {
  javascript: { id: "javascript", name: "JavaScript", monacoLanguage: "javascript", jobeLanguage: "nodejs", extension: ".js", category: "general", compilationRequired: false, version: "v18+" },
  typescript: { id: "typescript", name: "TypeScript", monacoLanguage: "typescript", jobeLanguage: "nodejs", extension: ".ts", category: "general", compilationRequired: false, version: "v5+" },
  python: { id: "python", name: "Python", monacoLanguage: "python", jobeLanguage: "python3", extension: ".py", category: "general", compilationRequired: false, version: "v3.10+" },
  java: { id: "java", name: "Java", monacoLanguage: "java", jobeLanguage: "java", extension: ".java", category: "general", compilationRequired: true, version: "v17" },
  cpp: { id: "cpp", name: "C++", monacoLanguage: "cpp", jobeLanguage: "cpp", extension: ".cpp", category: "general", compilationRequired: true, version: "GCC 11+" },
  c: { id: "c", name: "C", monacoLanguage: "c", jobeLanguage: "c", extension: ".c", category: "general", compilationRequired: true, version: "GCC 11+" },
  csharp: { id: "csharp", name: "C#", monacoLanguage: "csharp", jobeLanguage: "cs", extension: ".cs", category: "general", compilationRequired: true, version: ".NET 8" },
  go: { id: "go", name: "Go", monacoLanguage: "go", jobeLanguage: "go", extension: ".go", category: "general", compilationRequired: true, version: "v1.20+" },
  rust: { id: "rust", name: "Rust", monacoLanguage: "rust", jobeLanguage: "rust", extension: ".rs", category: "general", compilationRequired: true, version: "v1.70+" },
  kotlin: { id: "kotlin", name: "Kotlin", monacoLanguage: "kotlin", jobeLanguage: "kotlin", extension: ".kt", category: "general", compilationRequired: true, version: "v1.9+" },
  swift: { id: "swift", name: "Swift", monacoLanguage: "swift", jobeLanguage: "swift", extension: ".swift", category: "general", compilationRequired: true, version: "v5.9" },
  php: { id: "php", name: "PHP", monacoLanguage: "php", jobeLanguage: "php", extension: ".php", category: "general", compilationRequired: false, version: "v8.2" },
  ruby: { id: "ruby", name: "Ruby", monacoLanguage: "ruby", jobeLanguage: "ruby", extension: ".rb", category: "general", compilationRequired: false, version: "v3.2" },
  scala: { id: "scala", name: "Scala", monacoLanguage: "scala", jobeLanguage: "scala", extension: ".scala", category: "general", compilationRequired: true, version: "v3.3" },
  dart: { id: "dart", name: "Dart", monacoLanguage: "dart", jobeLanguage: "dart", extension: ".dart", category: "general", compilationRequired: false, version: "v3.0" },
  sql: { id: "sql", name: "SQL", monacoLanguage: "sql", jobeLanguage: "sql", extension: ".sql", category: "sql", compilationRequired: false, version: "MySQL 8.0" },
  html: { id: "html", name: "HTML", monacoLanguage: "html", jobeLanguage: "html", extension: ".html", category: "web", compilationRequired: false, version: "HTML5" },
  css: { id: "css", name: "CSS", monacoLanguage: "css", jobeLanguage: "css", extension: ".css", category: "web", compilationRequired: false, version: "CSS3" },
  react: { id: "react", name: "React", monacoLanguage: "typescript", jobeLanguage: "react", extension: ".tsx", category: "web", compilationRequired: false, version: "React 18" },
  bash: { id: "bash", name: "Bash", monacoLanguage: "shell", jobeLanguage: "bash", extension: ".sh", category: "general", compilationRequired: false, version: "GNU Bash 5+" },
};

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
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  category?: string;
  constraints?: string;
  input_format?: string;
  output_format?: string;
  points?: number;
  sample_input?: string;
  sample_output?: string;
  templates: Record<string, string>;
  test_cases: TestCase[];
  reveal_hidden_testcases?: boolean;
  dataset_name?: string;
  sql_engine?: SQLEngine;
  sql_question_mode?: SQLQuestionMode;
  provide_tables?: boolean;
  schema_sql?: string;
  seed_sql?: string;
  comparison_mode?: SQLComparisonMode;
  duration_minutes?: number;
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

