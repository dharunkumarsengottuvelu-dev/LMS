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
  private static isJobeAvailable: boolean = true;
  private static lastJobeCheck: number = 0;

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
    if (typeof Buffer !== "undefined") {
      if (Buffer.byteLength(code, "utf8") > 64 * 1024) {
        return { valid: false, error: "Source code exceeds maximum size limit (64 KB)." };
      }
      if (stdin && Buffer.byteLength(stdin, "utf8") > 32 * 1024) {
        return { valid: false, error: "Input stdin exceeds maximum size limit (32 KB)." };
      }
    } else {
      if (code.length > 64 * 1024) {
        return { valid: false, error: "Source code exceeds maximum size limit (64 KB)." };
      }
      if (stdin && stdin.length > 32 * 1024) {
        return { valid: false, error: "Input stdin exceeds maximum size limit (32 KB)." };
      }
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
      "sql",
    ];

    const valid = supported.includes(jobeLangId);
    return { valid, jobeLangId };
  }

  /**
   * Executes code using the sandboxed execution system.
   * In browser context, dispatches to /api/code/run backend route.
   * In server context, communicates directly with Jobe server with local fast-path.
   */
  public async executeCode(
    language: CodingLanguage | string,
    code: string,
    stdin?: string,
    limits?: ExecutionLimits
  ): Promise<NormalizedExecutionResult> {
    // 1. If running in browser environment, dispatch to Next.js API route
    if (typeof window !== "undefined") {
      try {
        const response = await fetch("/api/code/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            code,
            stdin: stdin ?? "",
            limits,
          }),
        });

        if (response.ok) {
          return (await response.json()) as NormalizedExecutionResult;
        }

        const errData = await response.json().catch(() => ({}));
        return this.createErrorResult(errData.error || `Execution failed with status ${response.status}`, response.status);
      } catch (clientErr) {
        return this.createErrorResult(`Network error during code execution: ${getErrorMessage(clientErr)}`, 500);
      }
    }

    // 2. Server-side Execution
    this.refreshConfig();

    const payloadVal = this.validatePayload(code, stdin);
    if (!payloadVal.valid) {
      return this.createErrorResult(payloadVal.error || "Invalid request payload", 400);
    }

    const isLocalhostJobe = this.config.baseUrl.includes("localhost") || this.config.baseUrl.includes("127.0.0.1");
    const hasCustomJobeUrl = Boolean(process.env.JOBE_URL);
    const now = Date.now();

    // Circuit Breaker: if Jobe is not explicitly configured or was recently unreachable, fast-path straight to local compiler
    const shouldBypassJobe = (!hasCustomJobeUrl && isLocalhostJobe) || (!JobeService.isJobeAvailable && (now - JobeService.lastJobeCheck < 60000));

    if (shouldBypassJobe) {
      try {
        const { LocalCompilerService } = await import("@/services/local-compiler.service");
        return await LocalCompilerService.execute(language, code, stdin ?? "", (limits?.timeLimit ?? 5) * 1000);
      } catch (localErr) {
        const msg = getErrorMessage(localErr);
        return this.createErrorResult(`Execution failed: ${msg}`, 500);
      }
    }

    const { jobeLangId } = this.validateLanguage(language);

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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (this.config.apiKey) {
      headers["X-API-KEY"] = this.config.apiKey;
    }

    const runsUrl = `${this.config.baseUrl}/runs`;
    const effectiveTimeout = hasCustomJobeUrl ? this.config.timeoutMs : 1500;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const response = await fetch(runsUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        JobeService.isJobeAvailable = true;
        const jobeResult = (await response.json()) as JobeRunResult;
        return this.normalizeResult(jobeResult);
      }
      
      JobeService.isJobeAvailable = false;
      JobeService.lastJobeCheck = Date.now();
    } catch {
      clearTimeout(timeoutId);
      JobeService.isJobeAvailable = false;
      JobeService.lastJobeCheck = Date.now();
    }

    // Seamless automatic fallback to local compiler runtime
    try {
      const { LocalCompilerService } = await import("@/services/local-compiler.service");
      return await LocalCompilerService.execute(language, code, stdin ?? "", (limits?.timeLimit ?? 5) * 1000);
    } catch (localErr) {
      const msg = getErrorMessage(localErr);
      return this.createErrorResult(`Execution failed: ${msg}`, 500);
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
        statusId = 11;
        statusDesc = "Runtime Error (NZEC)";
        break;
      case 13: // RESULT_TIME_LIMIT
        statusId = 5;
        statusDesc = "Time Limit Exceeded";
        break;
      case 17: // RESULT_MEMORY_LIMIT
        statusId = 4;
        statusDesc = "Memory Limit Exceeded";
        break;
      case 19: // RESULT_ILLEGAL_SYSCALL
        statusId = 12;
        statusDesc = "Security Violation: Illegal System Call";
        break;
      case 20: // RESULT_INTERNAL_ERROR
      default:
        statusId = 13;
        statusDesc = "Internal Execution Error";
        break;
    }

    return {
      stdout: stdout.trimEnd(),
      stderr: stderr.trimEnd(),
      compile_output: compileOutput.trimEnd(),
      message: "",
      status: {
        id: statusId,
        description: statusDesc,
      },
      outcome,
      time: "0.02",
      memory: 12400,
    };
  }

  /**
   * Health check for API route compatibility.
   */
  public async healthCheck(): Promise<{ available: boolean; url: string; latencyMs: number; languages: JobeLanguageTuple[] }> {
    const startTime = Date.now();
    const languages = await this.getLanguages();
    const latencyMs = Date.now() - startTime;
    return {
      available: languages.length > 0,
      url: this.config.baseUrl,
      latencyMs,
      languages,
    };
  }

  /**
   * Retrieves list of supported languages from Jobe server.
   */
  public async getLanguages(): Promise<JobeLanguageTuple[]> {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/code/languages");
        if (res.ok) {
          const data = await res.json();
          return data.languages || [];
        }
      } catch {}
    }

    const languagesUrl = `${this.config.baseUrl}/languages`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(languagesUrl, {
        headers: this.config.apiKey ? { "X-API-KEY": this.config.apiKey } : {},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.getDefaultLanguages();
      }

      return (await response.json()) as JobeLanguageTuple[];
    } catch {
      clearTimeout(timeoutId);
      return this.getDefaultLanguages();
    }
  }

  /**
   * Retrieves language specific configuration or version info.
   */
  public async getLanguageInfo(languageId: string): Promise<JobeLanguageInfo | null> {
    const langInfoUrl = `${this.config.baseUrl}/languages/${languageId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(langInfoUrl, {
        headers: this.config.apiKey ? { "X-API-KEY": this.config.apiKey } : {},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) return null;
      return (await response.json()) as JobeLanguageInfo;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }

  /**
   * Health check to determine if Jobe execution engine is available.
   */
  public async checkHealth(): Promise<{ healthy: boolean; message: string; responseTimeMs: number }> {
    const startTime = Date.now();
    const healthUrl = `${this.config.baseUrl}/languages`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(healthUrl, {
        headers: this.config.apiKey ? { "X-API-KEY": this.config.apiKey } : {},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      if (response.ok) {
        return {
          healthy: true,
          message: `Jobe server is operational (${responseTimeMs}ms)`,
          responseTimeMs,
        };
      }

      return {
        healthy: false,
        message: `Jobe server returned status ${response.status}`,
        responseTimeMs,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;
      return {
        healthy: false,
        message: `Jobe server is unreachable: ${getErrorMessage(error)}`,
        responseTimeMs,
      };
    }
  }

  /**
   * Constructs standardized error result.
   */
  private createErrorResult(message: string, statusCode: number): NormalizedExecutionResult {
    return {
      stdout: "",
      stderr: message,
      compile_output: message,
      message,
      status: {
        id: statusCode === 400 ? 7 : 13,
        description: statusCode === 400 ? "Bad Request" : "Execution Error",
      },
      outcome: 20,
      time: "0.00",
      memory: 0,
    };
  }

  /**
   * Default fallback language list when Jobe service is offline.
   */
  private getDefaultLanguages(): JobeLanguageTuple[] {
    return [
      ["python3", "3.10"],
      ["java", "17"],
      ["cpp", "11"],
      ["c", "11"],
      ["nodejs", "18"],
    ];
  }
}

export const jobeService = new JobeService();
