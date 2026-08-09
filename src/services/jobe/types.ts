import type { CodingLanguage } from "@/types/coding";

export interface JobeRunSpec {
  language_id: string;
  sourcecode: string;
  sourcefilename?: string;
  input?: string;
  parameters?: Record<string, unknown>;
  files?: Array<[string, string]>;
}

export interface JobeRunSpecPayload {
  run_spec: JobeRunSpec;
}

export interface JobeRunResult {
  outcome: number; // 15 = success, 11 = compile error, 12 = runtime error, 13 = time limit, 17 = memory limit, 19 = illegal syscall, 20 = internal error, 21 = overload
  cmpinfo: string;
  stdout: string;
  stderr: string;
  time?: number;
  memory?: number;
}

export type JobeLanguageTuple = [string, string]; // [language_id, version]

export interface JobeLanguageInfo {
  language_id: string;
  version: string;
}

export interface ExecutionLimits {
  timeLimit?: number; // seconds
  memoryLimit?: number; // MB
}

export interface NormalizedExecutionResult {
  stdout: string;
  stderr: string;
  compile_output: string;
  message: string;
  status: {
    id: number;
    description: string;
  };
  outcome: number;
  time: string | null;
  memory: number | null; // in KB or MB
}
