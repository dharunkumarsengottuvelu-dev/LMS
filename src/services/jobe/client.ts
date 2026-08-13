import type { CodingLanguage } from "@/types/coding";
import { JOBE_OUTCOME_DESCRIPTION } from "@/types/coding";
import { getErrorMessage } from "@/lib/utils";
import { getJobeConfig, mapLanguageToJobeId, type JobeConfig } from "./config";
import type {
  JobeRunSpecPayload,
  JobeRunResult,
  JobeLanguageTuple,
  JobeLanguageInfo,
  ExecutionLimits,
  NormalizedExecutionResult,
} from "./types";

export class JobeService {
  private config: JobeConfig;

  constructor(customConfig?: Partial<JobeConfig>) {
    this.config = {
      ...getJobeConfig(),
      ...customConfig,
    };
  }

  /**
   * Refreshes the service configuration from current environment variables.
   */
  public refreshConfig(): void {
    this.config = getJobeConfig();
  }

  /**
   * Validates code size and stdin length before dispatching to Jobe.
   */
  public validatePayload(code: string, stdin?: string): { valid: boolean; error?: string } {
    if (!code || !code.trim()) {
      return { valid: false, error: "Source code cannot be empty." };
    }

    // 64 KB code size limit
    if (Buffer.byteLength(code, "utf8") > 64 * 1024) {
      return { valid: false, error: "Source code exceeds maximum size limit (64 KB)." };
    }

    // 32 KB stdin input size limit
    if (stdin && Buffer.byteLength(stdin, "utf8") > 32 * 1024) {
      return { valid: false, error: "Input stdin exceeds maximum size limit (32 KB)." };
    }

    return { valid: true };
  }

  /**
   * Validates whether a programming language is supported.
   */
  public validateLanguage(language: CodingLanguage | string): { valid: boolean; jobeLangId: string } {
    const jobeLangId = mapLanguageToJobeId(language);
    const supported = [
      "python3",
      "java",
      "cpp",
      "c",
      "nodejs",
      "php",
      "octave",
      "pascal",
      "cs",
      "go",
      "rust",
      "kotlin",
      "swift",
      "ruby",
      "scala",
    ];

    const valid = supported.includes(jobeLangId);
    return { valid, jobeLangId };
  }

  /**
   * Executes code using the sandboxed Jobe REST API server.
   */
  public async executeCode(
    language: CodingLanguage | string,
    code: string,
    stdin?: string,
    limits?: ExecutionLimits
  ): Promise<NormalizedExecutionResult> {
    // 1. Refresh config for fresh env state
    this.refreshConfig();

    // 2. Validate payload limits
    const payloadVal = this.validatePayload(code, stdin);
    if (!payloadVal.valid) {
      return this.createErrorResult(payloadVal.error || "Invalid request payload", 400);
    }

    // 3. Map language to Jobe identifier
    const { jobeLangId } = this.validateLanguage(language);

    // 4. Build Jobe run_spec payload
    const payload: JobeRunSpecPayload = {
      run_spec: {
        language_id: jobeLangId,
        sourcecode: code,
        input: stdin ?? "",
        parameters: {
          cputime: limits?.timeLimit ?? this.config.defaultTimeLimitSec,
          memory: limits?.memoryLimit ?? this.config.defaultMemoryLimitMb,
        },
      },
    };

    // 5. Build HTTP request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (this.config.apiKey) {
      headers["X-API-KEY"] = this.config.apiKey;
    }

    const runsUrl = `${this.config.baseUrl}/runs`;

    // 6. Setup request timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(runsUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Jobe API HTTP ${response.status}: ${errorText}`);
        
        if (response.status === 404) {
          return this.createErrorResult(
            `Jobe server endpoint not found (${runsUrl}). Verify JOBE_URL configuration.`,
            503
          );
        }

        return this.createErrorResult(
          `Jobe server error (${response.status}): ${errorText || response.statusText}`,
          502
        );
      }

      const jobeResult = (await response.json()) as JobeRunResult;
      return this.normalizeResult(jobeResult);
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        console.error(`Jobe server timed out after ${this.config.timeoutMs / 1000}s`);
        return this.createErrorResult("Execution timed out or Jobe server is unresponsive.", 504);
      }

      const msg = getErrorMessage(error);
      console.error("Jobe Server Connection Error:", msg);

      return this.createErrorResult(`Connection to compiler failed: ${msg}`, 503);
    }
  }

  /**
   * Normalizes raw Jobe result outcomes into standard LMS execution results.
   */
  public normalizeResult(jobeResult: JobeRunResult): NormalizedExecutionResult {
    const outcome = jobeResult.outcome ?? 20;
    const stdout = jobeResult.stdout ?? "";
    const stderr = jobeResult.stderr ?? "";
    const compileOutput = jobeResult.cmpinfo ?? "";

    let statusId = 13; // Default internal error
    let statusDesc = JOBE_OUTCOME_DESCRIPTION[outcome] ?? "Unknown Error";

    switch (outcome) {
      case 15: // RESULT_SUCCESS
      case 0:
        statusId = 3;
        statusDesc = "Accepted";
        break;
      case 11: // RESULT_COMPILATION_ERROR
        statusId = 6;
        statusDesc = "Compilation Error";
        break;
      case 12: // RESULT_RUNTIME_ERROR
        statusId = 7;
        statusDesc = "Runtime Error";
        break;
      case 13: // RESULT_TIME_LIMIT_EXCEEDED
        statusId = 5;
        statusDesc = "Time Limit Exceeded";
        break;
      case 17: // RESULT_MEMORY_LIMIT_EXCEEDED
        statusId = 8;
        statusDesc = "Memory Limit Exceeded";
        break;
      case 19: // RESULT_ILLEGAL_SYSTEM_CALL
        statusId = 9;
        statusDesc = "Illegal System Call";
        break;
      case 20: // RESULT_INTERNAL_ERROR
        statusId = 13;
        statusDesc = "Internal Error";
        break;
      case 21: // RESULT_SERVER_OVERLOAD
        statusId = 13;
        statusDesc = "Server Overload";
        break;
      default:
        statusId = 13;
        statusDesc = `Jobe Execution Outcome (${outcome})`;
    }

    return {
      stdout,
      stderr,
      compile_output: compileOutput,
      message: statusDesc,
      status: {
        id: statusId,
        description: statusDesc,
      },
      outcome,
      time: jobeResult.time !== undefined ? jobeResult.time.toFixed(3) : null,
      memory: jobeResult.memory ?? null,
    };
  }

  /**
   * Health check endpoint to test connection to Jobe execution server.
   */
  public async healthCheck(): Promise<{
    available: boolean;
    url: string;
    latencyMs: number;
    languages?: JobeLanguageInfo[];
    error?: string;
  }> {
    this.refreshConfig();
    const startTime = Date.now();
    const languagesUrl = `${this.config.baseUrl}/languages`;

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    if (this.config.apiKey) {
      headers["X-API-KEY"] = this.config.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(languagesUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          available: false,
          url: this.config.baseUrl,
          latencyMs,
          error: `Jobe HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const rawLangs = (await response.json()) as JobeLanguageTuple[];
      const languages: JobeLanguageInfo[] = Array.isArray(rawLangs)
        ? rawLangs.map(([lang, version]) => ({ language_id: lang, version }))
        : [];

      return {
        available: true,
        url: this.config.baseUrl,
        latencyMs,
        languages,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const msg = getErrorMessage(error);
      
      return {
        available: false,
        url: this.config.baseUrl,
        latencyMs,
        error: msg,
      };
    }
  }



  private createErrorResult(message: string, statusCode: number): NormalizedExecutionResult {
    return {
      stdout: "",
      stderr: message,
      compile_output: "",
      message,
      status: {
        id: statusCode >= 500 ? 13 : 6,
        description: statusCode === 504 ? "Time Limit Exceeded" : "System Error",
      },
      outcome: statusCode === 504 ? 13 : 20,
      time: null,
      memory: null,
    };
  }
}

export const jobeService = new JobeService();
