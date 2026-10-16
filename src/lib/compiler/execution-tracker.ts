export type ExecutionStage =
  | "FRONTEND"
  | "BACKEND"
  | "VALIDATION"
  | "COMPILER_API"
  | "QUEUE"
  | "EXECUTION"
  | "SANDBOX"
  | "RESULT_PROCESSING";

export interface ExecutionTimings {
  validationMs: number;
  queueWaitMs: number;
  compilerSetupMs: number;
  executionMs: number;
  resultProcessingMs: number;
  totalMs: number;
  timeoutStage?: ExecutionStage;
}

/**
 * Tracks granular execution pipeline timing metrics for code runs & submissions.
 * Automatically logs structured diagnostics without exposing internal infrastructure to students.
 */
export class ExecutionMetricsTracker {
  private executionId: string;
  private language: string;
  private startTime: number;
  private validationStart = 0;
  private validationEnd = 0;
  private queueStart = 0;
  private queueEnd = 0;
  private compilerStart = 0;
  private compilerEnd = 0;
  private execStart = 0;
  private execEnd = 0;
  private resultStart = 0;
  private resultEnd = 0;
  private timeoutStage?: ExecutionStage;

  constructor(language: string, customId?: string) {
    this.executionId = customId || `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.language = language;
    this.startTime = Date.now();
  }

  public get id(): string {
    return this.executionId;
  }

  public startValidation(): void {
    this.validationStart = Date.now();
  }

  public endValidation(): void {
    this.validationEnd = Date.now();
  }

  public startQueueWait(): void {
    this.queueStart = Date.now();
  }

  public endQueueWait(): void {
    this.queueEnd = Date.now();
  }

  public startCompilerSetup(): void {
    this.compilerStart = Date.now();
  }

  public endCompilerSetup(): void {
    this.compilerEnd = Date.now();
  }

  public startExecution(): void {
    this.execStart = Date.now();
  }

  public endExecution(): void {
    this.execEnd = Date.now();
  }

  public startResultProcessing(): void {
    this.resultStart = Date.now();
  }

  public endResultProcessing(): void {
    this.resultEnd = Date.now();
  }

  public recordTimeout(stage: ExecutionStage): void {
    this.timeoutStage = stage;
  }

  public getMetrics(): ExecutionTimings {
    const now = Date.now();
    const valMs = this.validationEnd > 0 ? this.validationEnd - this.validationStart : 0;
    const qMs = this.queueEnd > 0 ? this.queueEnd - this.queueStart : 0;
    const compMs = this.compilerEnd > 0 ? this.compilerEnd - this.compilerStart : 0;
    const execMs = this.execEnd > 0 ? this.execEnd - this.execStart : 0;
    const resMs = this.resultEnd > 0 ? this.resultEnd - this.resultStart : 0;
    const totalMs = now - this.startTime;

    return {
      validationMs: Math.max(0, valMs),
      queueWaitMs: Math.max(0, qMs),
      compilerSetupMs: Math.max(0, compMs),
      executionMs: Math.max(0, execMs),
      resultProcessingMs: Math.max(0, resMs),
      totalMs: Math.max(0, totalMs),
      timeoutStage: this.timeoutStage,
    };
  }

  /**
   * Logs execution timing summary to server console for internal monitoring.
   */
  public logSummary(statusDesc: string, errorDetail?: string): void {
    const metrics = this.getMetrics();
    const stageInfo = this.timeoutStage ? ` | TIMEOUT_STAGE: ${this.timeoutStage}` : "";
    const errInfo = errorDetail ? ` | Error: ${errorDetail.slice(0, 120)}` : "";

    if (this.timeoutStage || statusDesc.includes("TIME_LIMIT") || statusDesc.includes("TIMEOUT")) {
      console.warn(
        `[CODE_EXEC_TIMEOUT] ID=${this.executionId} | Lang=${this.language} | Status=${statusDesc}${stageInfo} | Total=${metrics.totalMs}ms (Val=${metrics.validationMs}ms, Queue=${metrics.queueWaitMs}ms, Compiler=${metrics.compilerSetupMs}ms, Exec=${metrics.executionMs}ms, Res=${metrics.resultProcessingMs}ms)${errInfo}`
      );
    } else {
      console.log(
        `[CODE_EXEC] ID=${this.executionId} | Lang=${this.language} | Status=${statusDesc} | Total=${metrics.totalMs}ms (Exec=${metrics.executionMs}ms, Queue=${metrics.queueWaitMs}ms)`
      );
    }
  }
}
