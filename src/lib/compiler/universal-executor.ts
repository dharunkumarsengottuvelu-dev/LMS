/* eslint-disable @typescript-eslint/no-require-imports */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import cp from "node:child_process";

import { getLanguageDefinition, type SourceFileInfo } from "./language-registry";
import { sanitizeCompilerOutput, type StandardExecutionStatus } from "./comparator";
import { OnlineCompilerService } from "@/services/online-compiler.service";
import { adaptCodeForExecution } from "./code-adapter";
import { ExecutionMetricsTracker, type ExecutionTimings } from "./execution-tracker";
import { CompilerConcurrencyManager } from "./concurrency-manager";

export interface UniversalExecutionResult {
  stdout: string;
  stderr: string;
  compile_output: string;
  message: string;
  status: {
    id: number;
    description: StandardExecutionStatus;
  };
  outcome: number;
  time: string;
  memory: number;
  filename: string;
  language: string;
  stageTimings?: ExecutionTimings;
}

const MAX_OUTPUT_BYTES = 256 * 1024; // 256 KB max output size
const COMPILATION_TIMEOUT_MS = 10000; // 10 seconds compilation timeout

function isServerless(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_NAME
  );
}

function cleanInputString(s: string): string {
  return (s || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
}

/**
 * Safely kills a child process and its entire process tree.
 * On Windows, calls taskkill /F /T /PID to prevent orphan background processes.
 * On POSIX, sends SIGKILL to the process group.
 */
export function killProcessTree(proc: cp.ChildProcess | null | undefined): void {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === "win32") {
      cp.exec(`taskkill /F /T /PID ${proc.pid}`, () => {});
    } else {
      try {
        process.kill(-proc.pid, "SIGKILL");
      } catch {
        proc.kill("SIGKILL");
      }
    }
  } catch {
    try {
      proc.kill();
    } catch {}
  }
}

/**
 * Detects whether an execution failure was caused by memory exhaustion.
 */
function isMemoryError(errStr: string, exitCode?: number | null): boolean {
  if (exitCode === 137) return true;
  const lower = (errStr || "").toLowerCase();
  return (
    lower.includes("outofmemoryerror") ||
    lower.includes("heap out of memory") ||
    lower.includes("memoryerror") ||
    lower.includes("bad_alloc") ||
    lower.includes("std::bad_alloc") ||
    lower.includes("allocation failed") ||
    lower.includes("fatal error: ineffective mark-compacts")
  );
}

export class UniversalExecutor {
  /**
   * Universal entry point for executing any supported programming language.
   * Manages concurrency, tracking metrics, sandbox isolation, and resource limits.
   */
  public static async execute(
    language: string,
    code: string,
    stdin: string = "",
    timeoutMs?: number,
    version?: string
  ): Promise<UniversalExecutionResult> {
    const tracker = new ExecutionMetricsTracker(language);
    tracker.startValidation();

    const langDef = getLanguageDefinition(language);
    const cleanStdin = cleanInputString(stdin);
    const effectiveTimeout = timeoutMs || langDef.defaultTimeoutMs;
    const adaptedCode = adaptCodeForExecution(langDef.id, code);

    // 1. Resolve source filename dynamically
    const sourceInfo: SourceFileInfo = langDef.sourceFilenameStrategy(adaptedCode);
    tracker.endValidation();

    if (sourceInfo.error) {
      tracker.recordTimeout("VALIDATION");
      tracker.logSummary("COMPILE_ERROR", sourceInfo.error);
      return {
        stdout: "",
        stderr: sourceInfo.error,
        compile_output: sourceInfo.error,
        message: "Compilation Error",
        status: { id: 6, description: "COMPILE_ERROR" },
        outcome: 11,
        time: "0.00",
        memory: 0,
        filename: sourceInfo.filename,
        language: langDef.id,
        stageTimings: tracker.getMetrics(),
      };
    }

    // 2. Serverless environment -> Online Sandbox
    if (isServerless()) {
      tracker.startCompilerSetup();
      const res = await this.executeOnline(langDef.id, adaptedCode, cleanStdin, effectiveTimeout, sourceInfo.filename, version);
      tracker.endCompilerSetup();
      tracker.endExecution();
      res.stageTimings = tracker.getMetrics();
      tracker.logSummary(res.status.description, res.stderr || res.compile_output);
      return res;
    }

    // 3. Local Execution with Concurrency Management & Isolation
    return CompilerConcurrencyManager.runWithConcurrency(
      tracker.id,
      (waitMs) => {
        tracker.startQueueWait();
        tracker.endQueueWait();
      },
      async () => {
        let tempDir: string | null = null;
        tracker.startExecution();

        try {
          const createdDir: string = fs.mkdtempSync(path.join(os.tmpdir(), "lms_sandbox_"));
          tempDir = createdDir;
          const sourcePath = path.join(createdDir, sourceInfo.filename);
          fs.writeFileSync(sourcePath, adaptedCode, "utf8");

          let result: UniversalExecutionResult;

          switch (langDef.id) {
            case "java":
              result = await this.executeJava(sourceInfo, createdDir, cleanStdin, effectiveTimeout, version);
              break;
            case "python":
              result = await this.executePython(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "cpp":
              result = await this.executeCpp(sourceInfo, createdDir, cleanStdin, effectiveTimeout, version);
              break;
            case "c":
              result = await this.executeC(sourceInfo, createdDir, cleanStdin, effectiveTimeout, version);
              break;
            case "javascript":
              result = await this.executeJavaScript(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "typescript":
              result = await this.executeTypeScript(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "go":
              result = await this.executeGo(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "rust":
              result = await this.executeRust(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "php":
              result = await this.executePhp(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "ruby":
              result = await this.executeRuby(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "csharp":
              result = await this.executeCSharp(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "kotlin":
              result = await this.executeKotlin(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "bash":
              result = await this.executeBash(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
              break;
            case "r":
            case "lua":
            case "perl":
            default:
              result = await this.executeOnline(langDef.id, adaptedCode, cleanStdin, effectiveTimeout, sourceInfo.filename, version);
              break;
          }

          // If local execution failed due to missing local compiler binary (ENOENT), seamlessly fallback to Online Sandbox
          if (result.outcome === 20 || result.status.id === 13) {
            result = await this.executeOnline(langDef.id, adaptedCode, cleanStdin, effectiveTimeout, sourceInfo.filename, version);
          }

          tracker.endExecution();
          result.stageTimings = tracker.getMetrics();
          if (result.status.description === "TIME_LIMIT_EXCEEDED") {
            tracker.recordTimeout("EXECUTION");
          }
          tracker.logSummary(result.status.description, result.stderr || result.compile_output);
          return result;
        } catch (err: any) {
          tracker.startCompilerSetup();
          const fallbackRes = await this.executeOnline(langDef.id, adaptedCode, cleanStdin, effectiveTimeout, sourceInfo.filename, version);
          tracker.endCompilerSetup();
          tracker.endExecution();
          fallbackRes.stageTimings = tracker.getMetrics();
          tracker.logSummary(fallbackRes.status.description, fallbackRes.stderr || fallbackRes.compile_output);
          return fallbackRes;
        } finally {
          if (tempDir) {
            try {
              fs.rmSync(tempDir, { recursive: true, force: true });
            } catch {}
          }
        }
      }
    );
  }

  // ── Language Runners ────────────────────────────────────────────────────────

  private static resolvePythonCommand(): string {
    if (process.platform === "win32") {
      const candidates = [
        path.join(process.env.LOCALAPPDATA || "", "Python", "bin", "python.exe"),
        path.join(process.env.USERPROFILE || "", "AppData", "Local", "Python", "bin", "python.exe"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python314", "python.exe"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python313", "python.exe"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python312", "python.exe"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python311", "python.exe"),
        "C:\\Users\\KaaviyaDharun\\AppData\\Local\\Python\\bin\\python.exe",
      ];
      for (const c of candidates) {
        if (c && fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
      }
    }
    return "python3";
  }

  private static executeJava(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number,
    version?: string
  ): Promise<UniversalExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const className = sourceInfo.entryClass || "Main";
      let resolved = false;

      const doResolve = (res: UniversalExecutionResult) => {
        if (resolved) return;
        resolved = true;
        resolve(res);
      };

      // Runs the compiled Java class
      const runJavaProcess = (extraArgs: string[] = []) => {
        let javaProc: cp.ChildProcess | null = null;
        let stdout = "";
        let stderr = "";
        let stdoutBytes = 0;
        let timer: NodeJS.Timeout | null = null;

        timer = setTimeout(() => {
          killProcessTree(javaProc);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          doResolve(UniversalExecutor.createTimeoutResult(elapsed, sourceInfo.filename, "java"));
        }, timeoutMs);

        try {
          javaProc = cp.spawn("java", [...extraArgs, "-Xmx256m", "-cp", ".", className], { cwd: tempDir });
        } catch (spawnErr: any) {
          if (timer) clearTimeout(timer);
          return doResolve(UniversalExecutor.createInternalError(`java spawn: ${spawnErr.message}`, sourceInfo.filename, "java"));
        }

        if (stdin && javaProc.stdin) {
          javaProc.stdin.write(stdin);
          javaProc.stdin.end();
        } else if (javaProc.stdin) {
          javaProc.stdin.end();
        }

        javaProc.stdout?.on("data", (d: any) => {
          const len = typeof d === "string" ? Buffer.byteLength(d) : d.length;
          stdoutBytes += len;
          if (stdoutBytes > MAX_OUTPUT_BYTES) {
            killProcessTree(javaProc);
            if (timer) clearTimeout(timer);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            return doResolve(UniversalExecutor.createOutputLimitResult(elapsed, sourceInfo.filename, "java"));
          }
          stdout += d.toString();
        });

        javaProc.stderr?.on("data", (d: any) => {
          stderr += d.toString();
        });

        javaProc.on("close", (rc: number | null) => {
          if (timer) clearTimeout(timer);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          const isOk = rc === 0;
          const sanitizedErr = sanitizeCompilerOutput(stderr, sourceInfo.filename);

          if (isMemoryError(sanitizedErr, rc)) {
            return doResolve(UniversalExecutor.createMemoryLimitResult(elapsed, sourceInfo.filename, "java"));
          }

          const statusDesc: StandardExecutionStatus = isOk ? "ACCEPTED" : "RUNTIME_ERROR";
          doResolve({
            stdout: stdout.trimEnd(),
            stderr: sanitizedErr,
            compile_output: "",
            message: isOk ? "Accepted" : "Runtime Error",
            status: { id: isOk ? 3 : 7, description: statusDesc },
            outcome: isOk ? 15 : 12,
            time: elapsed,
            memory: 32000,
            filename: sourceInfo.filename,
            language: "java",
          });
        });

        javaProc.on("error", (err: Error) => {
          if (timer) clearTimeout(timer);
          doResolve(UniversalExecutor.createInternalError(err.message, sourceInfo.filename, "java"));
        });
      };

      // Compiles code with javac with a compilation timeout
      const compileWithJavac = (args: string[], isRetry: boolean = false) => {
        let javac: cp.ChildProcess | null = null;
        let compileErr = "";

        const compTimer = setTimeout(() => {
          killProcessTree(javac);
          doResolve({
            stdout: "",
            stderr: "Compilation timed out after 10 seconds.",
            compile_output: "Compilation timed out after 10 seconds.",
            message: "Compilation Timeout",
            status: { id: 6, description: "COMPILE_ERROR" },
            outcome: 11,
            time: "10.00",
            memory: 0,
            filename: sourceInfo.filename,
            language: "java",
          });
        }, COMPILATION_TIMEOUT_MS);

        try {
          javac = cp.spawn("javac", args, { cwd: tempDir });
        } catch (jerr: any) {
          clearTimeout(compTimer);
          return doResolve(UniversalExecutor.createInternalError(`javac spawn: ${jerr.message}`, sourceInfo.filename, "java"));
        }

        javac.stderr?.on("data", (d: any) => { compileErr += d.toString(); });
        javac.on("close", (cc: number | null) => {
          clearTimeout(compTimer);
          if (cc === 0) {
            const hasPreview = args.includes("--enable-preview");
            return runJavaProcess(hasPreview ? ["--enable-preview"] : []);
          }

          if (!isRetry && args.includes("--release")) {
            return compileWithJavac([sourceInfo.filename], true);
          }

          if (!isRetry && (compileErr.includes("preview feature") || compileErr.includes("--enable-preview"))) {
            return compileWithJavac(["--enable-preview", "--release", "25", sourceInfo.filename], true);
          }

          const sanitizedErr = sanitizeCompilerOutput(compileErr, sourceInfo.filename);
          return doResolve({
            stdout: "",
            stderr: sanitizedErr,
            compile_output: sanitizedErr,
            message: "Compilation Error",
            status: { id: 6, description: "COMPILE_ERROR" },
            outcome: 11,
            time: "0.00",
            memory: 0,
            filename: sourceInfo.filename,
            language: "java",
          });
        });

        javac.on("error", (err: Error) => {
          clearTimeout(compTimer);
          doResolve(UniversalExecutor.createInternalError(`javac: ${err.message}`, sourceInfo.filename, "java"));
        });
      };

      compileWithJavac([sourceInfo.filename]);
    });
  }

  private static async executePython(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    const pyCmd = this.resolvePythonCommand();
    const res = await this.executeProcessRunner(pyCmd, [sourceInfo.filename], tempDir, stdin, timeoutMs, sourceInfo.filename, "python", 18000);
    if (res.stderr && res.stderr.includes("Python was not found")) {
      return { ...res, outcome: 20 };
    }
    return res;
  }

  private static executeJavaScript(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.executeProcessRunner("node", [sourceInfo.filename], tempDir, stdin, timeoutMs, sourceInfo.filename, "javascript", 20000);
  }

  private static executeTypeScript(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.executeProcessRunner("npx", ["tsx", sourceInfo.filename], tempDir, stdin, timeoutMs, sourceInfo.filename, "typescript", 28000);
  }

  private static executeCpp(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number,
    version?: string
  ): Promise<UniversalExecutionResult> {
    let stdFlag = "-std=c++20";
    const v = (version || "").toLowerCase().trim();
    if (v === "c++23" || v === "23") stdFlag = "-std=c++23";
    else if (v === "c++17" || v === "17") stdFlag = "-std=c++17";

    return this.compileAndExecuteRunner(
      "g++",
      [stdFlag, "-O2", sourceInfo.filename, "-o", "program"],
      process.platform === "win32" ? "program.exe" : "./program",
      tempDir,
      stdin,
      timeoutMs,
      sourceInfo.filename,
      "cpp",
      16000
    );
  }

  private static executeC(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number,
    version?: string
  ): Promise<UniversalExecutionResult> {
    let stdFlag = "-std=c17";
    const v = (version || "").toLowerCase().trim();
    if (v === "c23" || v === "23") stdFlag = "-std=c23";
    else if (v === "c11" || v === "11") stdFlag = "-std=c11";

    return this.compileAndExecuteRunner(
      "gcc",
      [stdFlag, "-O2", sourceInfo.filename, "-o", "program"],
      process.platform === "win32" ? "program.exe" : "./program",
      tempDir,
      stdin,
      timeoutMs,
      sourceInfo.filename,
      "c",
      12000
    );
  }

  private static executeGo(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.executeProcessRunner("go", ["run", sourceInfo.filename], tempDir, stdin, timeoutMs, sourceInfo.filename, "go", 24000);
  }

  private static executeRust(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.compileAndExecuteRunner(
      "rustc",
      [sourceInfo.filename, "-o", "program"],
      process.platform === "win32" ? "program.exe" : "./program",
      tempDir,
      stdin,
      timeoutMs,
      sourceInfo.filename,
      "rust",
      18000
    );
  }

  private static executePhp(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.executeProcessRunner("php", [sourceInfo.filename], tempDir, stdin, timeoutMs, sourceInfo.filename, "php", 16000);
  }

  private static executeRuby(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.executeProcessRunner("ruby", [sourceInfo.filename], tempDir, stdin, timeoutMs, sourceInfo.filename, "ruby", 16000);
  }

  private static executeCSharp(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.executeOnline("csharp", tempDir, stdin, timeoutMs, sourceInfo.filename);
  }

  private static executeKotlin(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.executeOnline("kotlin", tempDir, stdin, timeoutMs, sourceInfo.filename);
  }

  private static executeBash(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.executeProcessRunner("bash", [sourceInfo.filename], tempDir, stdin, timeoutMs, sourceInfo.filename, "bash", 8000);
  }

  // ── Helper Subprocess Runners ───────────────────────────────────────────────

  private static executeProcessRunner(
    cmd: string,
    args: string[],
    cwd: string,
    stdin: string,
    timeoutMs: number,
    filename: string,
    language: string,
    memoryKb: number
  ): Promise<UniversalExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let proc: cp.ChildProcess | null = null;
      let stdout = "";
      let stderr = "";
      let stdoutBytes = 0;
      let resolved = false;

      const doResolve = (res: UniversalExecutionResult) => {
        if (resolved) return;
        resolved = true;
        resolve(res);
      };

      const timer = setTimeout(() => {
        killProcessTree(proc);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        doResolve(this.createTimeoutResult(elapsed, filename, language));
      }, timeoutMs);

      try {
        proc = cp.spawn(cmd, args, { cwd });
      } catch (spawnErr: any) {
        clearTimeout(timer);
        return doResolve(this.createInternalError(spawnErr.message, filename, language));
      }

      if (stdin && proc.stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      } else if (proc.stdin) {
        proc.stdin.end();
      }

      proc.stdout?.on("data", (d: any) => {
        const len = typeof d === "string" ? Buffer.byteLength(d) : d.length;
        stdoutBytes += len;
        if (stdoutBytes > MAX_OUTPUT_BYTES) {
          killProcessTree(proc);
          clearTimeout(timer);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          return doResolve(this.createOutputLimitResult(elapsed, filename, language));
        }
        stdout += d.toString();
      });

      proc.stderr?.on("data", (d: any) => {
        stderr += d.toString();
      });

      proc.on("close", (code: number | null) => {
        clearTimeout(timer);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const isOk = code === 0;
        const sanitizedErr = sanitizeCompilerOutput(stderr, filename);

        if (isMemoryError(sanitizedErr, code)) {
          return doResolve(this.createMemoryLimitResult(elapsed, filename, language));
        }

        const statusDesc: StandardExecutionStatus = isOk ? "ACCEPTED" : "RUNTIME_ERROR";
        doResolve({
          stdout: stdout.trimEnd(),
          stderr: sanitizedErr,
          compile_output: "",
          message: isOk ? "Accepted" : "Runtime Error",
          status: { id: isOk ? 3 : 7, description: statusDesc },
          outcome: isOk ? 15 : 12,
          time: elapsed,
          memory: memoryKb,
          filename,
          language,
        });
      });

      proc.on("error", (err: Error) => {
        clearTimeout(timer);
        doResolve(this.createInternalError(err.message, filename, language));
      });
    });
  }

  private static compileAndExecuteRunner(
    compilerCmd: string,
    compilerArgs: string[],
    executableCmd: string,
    cwd: string,
    stdin: string,
    timeoutMs: number,
    filename: string,
    language: string,
    memoryKb: number
  ): Promise<UniversalExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let comp: cp.ChildProcess | null = null;
      let compileErr = "";
      let resolved = false;

      const doResolve = (res: UniversalExecutionResult) => {
        if (resolved) return;
        resolved = true;
        resolve(res);
      };

      const compTimer = setTimeout(() => {
        killProcessTree(comp);
        doResolve({
          stdout: "",
          stderr: `Compilation timed out after ${(COMPILATION_TIMEOUT_MS / 1000).toFixed(0)} seconds.`,
          compile_output: `Compilation timed out after ${(COMPILATION_TIMEOUT_MS / 1000).toFixed(0)} seconds.`,
          message: "Compilation Timeout",
          status: { id: 6, description: "COMPILE_ERROR" },
          outcome: 11,
          time: "10.00",
          memory: 0,
          filename,
          language,
        });
      }, COMPILATION_TIMEOUT_MS);

      try {
        comp = cp.spawn(compilerCmd, compilerArgs, { cwd });
      } catch (cerr: any) {
        clearTimeout(compTimer);
        return doResolve(this.createInternalError(`${compilerCmd}: ${cerr.message}`, filename, language));
      }

      comp.stderr?.on("data", (d: any) => { compileErr += d.toString(); });
      comp.on("close", (cc: number | null) => {
        clearTimeout(compTimer);
        if (cc !== 0) {
          const sanitized = sanitizeCompilerOutput(compileErr, filename);
          return doResolve({
            stdout: "",
            stderr: sanitized,
            compile_output: sanitized,
            message: "Compilation Error",
            status: { id: 6, description: "COMPILE_ERROR" },
            outcome: 11,
            time: "0.00",
            memory: 0,
            filename,
            language,
          });
        }

        const binaryName = executableCmd.startsWith("./") ? executableCmd.slice(2) : executableCmd;
        let runProc: cp.ChildProcess | null = null;
        let stdout = "";
        let stderr = "";
        let stdoutBytes = 0;

        const timer = setTimeout(() => {
          killProcessTree(runProc);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          doResolve(this.createTimeoutResult(elapsed, filename, language));
        }, timeoutMs);

        try {
          runProc = cp.spawn(path.join(cwd, binaryName), [], { cwd });
        } catch (rerr: any) {
          clearTimeout(timer);
          return doResolve(this.createInternalError(`run ${binaryName}: ${rerr.message}`, filename, language));
        }

        if (stdin && runProc.stdin) {
          runProc.stdin.write(stdin);
          runProc.stdin.end();
        } else if (runProc.stdin) {
          runProc.stdin.end();
        }

        runProc.stdout?.on("data", (d: any) => {
          const len = typeof d === "string" ? Buffer.byteLength(d) : d.length;
          stdoutBytes += len;
          if (stdoutBytes > MAX_OUTPUT_BYTES) {
            killProcessTree(runProc);
            clearTimeout(timer);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            return doResolve(this.createOutputLimitResult(elapsed, filename, language));
          }
          stdout += d.toString();
        });

        runProc.stderr?.on("data", (d: any) => {
          stderr += d.toString();
        });

        runProc.on("close", (rc: number | null) => {
          clearTimeout(timer);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          const isOk = rc === 0;
          const sanitizedErr = sanitizeCompilerOutput(stderr, filename);

          if (isMemoryError(sanitizedErr, rc)) {
            return doResolve(this.createMemoryLimitResult(elapsed, filename, language));
          }

          const statusDesc: StandardExecutionStatus = isOk ? "ACCEPTED" : "RUNTIME_ERROR";
          doResolve({
            stdout: stdout.trimEnd(),
            stderr: sanitizedErr,
            compile_output: "",
            message: isOk ? "Accepted" : "Runtime Error",
            status: { id: isOk ? 3 : 7, description: statusDesc },
            outcome: isOk ? 15 : 12,
            time: elapsed,
            memory: memoryKb,
            filename,
            language,
          });
        });

        runProc.on("error", (err: Error) => {
          clearTimeout(timer);
          doResolve(this.createInternalError(err.message, filename, language));
        });
      });

      comp.on("error", (err: Error) => {
        clearTimeout(compTimer);
        doResolve(this.createInternalError(`${compilerCmd}: ${err.message}`, filename, language));
      });
    });
  }

  // ── Online Sandbox Fallback ────────────────────────────────────────────────

  private static async executeOnline(
    language: string,
    code: string,
    stdin: string,
    timeoutMs: number,
    filename: string,
    version?: string
  ): Promise<UniversalExecutionResult> {
    const raw = await OnlineCompilerService.execute(language, code, stdin, timeoutMs, version);
    const sanitizedErr = sanitizeCompilerOutput(raw.stderr || "", filename);
    const sanitizedComp = sanitizeCompilerOutput(raw.compile_output || "", filename);
    const isOk = raw.outcome === 15 || raw.status?.id === 3;
    const isCompileErr = raw.outcome === 11 || raw.status?.id === 6;
    const isTimeout = raw.outcome === 13 || raw.status?.id === 5;
    const isMemory = raw.outcome === 17 || raw.status?.id === 4 || isMemoryError(sanitizedErr);
    const isOutputLimit = raw.outcome === 18 || raw.status?.id === 14;

    let statusDesc: StandardExecutionStatus = "ACCEPTED";
    if (isTimeout) statusDesc = "TIME_LIMIT_EXCEEDED";
    else if (isOutputLimit) statusDesc = "OUTPUT_LIMIT_EXCEEDED";
    else if (isMemory) statusDesc = "MEMORY_LIMIT_EXCEEDED";
    else if (isCompileErr) statusDesc = "COMPILE_ERROR";
    else if (!isOk) statusDesc = "RUNTIME_ERROR";

    return {
      stdout: raw.stdout || "",
      stderr: sanitizedErr,
      compile_output: sanitizedComp,
      message: raw.message || (isOk ? "Accepted" : "Execution Error"),
      status: {
        id: isOutputLimit ? 14 : isMemory ? 4 : isTimeout ? 5 : isCompileErr ? 6 : (raw.status?.id || (isOk ? 3 : 7)),
        description: statusDesc,
      },
      outcome: isOutputLimit ? 18 : isMemory ? 17 : isTimeout ? 13 : isCompileErr ? 11 : (raw.outcome || (isOk ? 15 : 12)),
      time: raw.time || "0.00",
      memory: raw.memory || 12000,
      filename,
      language,
    };
  }

  // ── Error Response Builders ────────────────────────────────────────────────

  public static createTimeoutResult(time: string, filename: string, language: string): UniversalExecutionResult {
    return {
      stdout: "",
      stderr: "Time Limit Exceeded: Process execution took longer than permitted time limit.",
      compile_output: "",
      message: "Time Limit Exceeded",
      status: { id: 5, description: "TIME_LIMIT_EXCEEDED" },
      outcome: 13,
      time,
      memory: 0,
      filename,
      language,
    };
  }

  public static createOutputLimitResult(time: string, filename: string, language: string): UniversalExecutionResult {
    return {
      stdout: "",
      stderr: "Output Limit Exceeded: Program produced excessive output (exceeded 256 KB limit). Please check for infinite print loops.",
      compile_output: "",
      message: "Output Limit Exceeded",
      status: { id: 14, description: "OUTPUT_LIMIT_EXCEEDED" },
      outcome: 18,
      time,
      memory: 0,
      filename,
      language,
    };
  }

  public static createMemoryLimitResult(time: string, filename: string, language: string): UniversalExecutionResult {
    return {
      stdout: "",
      stderr: "Memory Limit Exceeded: Process exhausted allowed memory bounds.",
      compile_output: "",
      message: "Memory Limit Exceeded",
      status: { id: 4, description: "MEMORY_LIMIT_EXCEEDED" },
      outcome: 17,
      time,
      memory: 256000,
      filename,
      language,
    };
  }

  public static createInternalError(errMsg: string, filename: string, language: string): UniversalExecutionResult {
    return {
      stdout: "",
      stderr: sanitizeCompilerOutput(errMsg, filename),
      compile_output: "",
      message: "Internal Execution Error",
      status: { id: 13, description: "SYSTEM_ERROR" },
      outcome: 20,
      time: "0.00",
      memory: 0,
      filename,
      language,
    };
  }
}
