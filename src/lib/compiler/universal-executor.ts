/* eslint-disable @typescript-eslint/no-require-imports */
import { getLanguageDefinition, type SourceFileInfo } from "./language-registry";
import { sanitizeCompilerOutput, resolveStandardStatus, type StandardExecutionStatus } from "./comparator";
import { OnlineCompilerService } from "@/services/online-compiler.service";

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
}

const isNode = typeof window === "undefined";
const getFs = () => (isNode ? eval("require('node:fs')") : null);
const getPath = () => (isNode ? eval("require('node:path')") : null);
const getOs = () => (isNode ? eval("require('node:os')") : null);
const getChildProcess = () => (isNode ? eval("require('node:child_process')") : null);

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

export class UniversalExecutor {
  /**
   * Universal entry point for executing any supported programming language.
   */
  public static async execute(
    language: string,
    code: string,
    stdin: string = "",
    timeoutMs?: number
  ): Promise<UniversalExecutionResult> {
    const langDef = getLanguageDefinition(language);
    const cleanStdin = cleanInputString(stdin);
    const effectiveTimeout = timeoutMs || langDef.defaultTimeoutMs;

    // 1. Resolve source filename dynamically
    const sourceInfo: SourceFileInfo = langDef.sourceFilenameStrategy(code);

    if (sourceInfo.error) {
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
      };
    }

    // 2. Client-side or Serverless environment -> Online Sandbox
    if (!isNode || isServerless()) {
      return this.executeOnline(langDef.id, code, cleanStdin, effectiveTimeout, sourceInfo.filename);
    }

    const fs = getFs();
    const path = getPath();
    const os = getOs();
    const cp = getChildProcess();

    if (!fs || !path || !os || !cp) {
      return this.executeOnline(langDef.id, code, cleanStdin, effectiveTimeout, sourceInfo.filename);
    }

    // 3. Create isolated temporary workspace
    let tempDir: string | null = null;
    try {
      const createdDir: string = fs.mkdtempSync(path.join(os.tmpdir(), "lms_sandbox_"));
      tempDir = createdDir;
      const sourcePath = path.join(createdDir, sourceInfo.filename);
      fs.writeFileSync(sourcePath, code, "utf8");

      let result: UniversalExecutionResult;

      switch (langDef.id) {
        case "java":
          result = await this.executeJava(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
          break;
        case "python":
          result = await this.executePython(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
          break;
        case "cpp":
          result = await this.executeCpp(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
          break;
        case "c":
          result = await this.executeC(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
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
        case "bash" as any:
          result = await this.executeBash(sourceInfo, createdDir, cleanStdin, effectiveTimeout);
          break;
        default:
          return this.executeOnline(langDef.id, code, cleanStdin, effectiveTimeout, sourceInfo.filename);
      }

      // If local execution failed due to missing local compiler binary, seamlessly fallback to Online Sandbox
      if (result.outcome === 20 || result.status.id === 13) {
        return this.executeOnline(langDef.id, code, cleanStdin, effectiveTimeout, sourceInfo.filename);
      }

      return result;
    } catch {
      return this.executeOnline(langDef.id, code, cleanStdin, effectiveTimeout, sourceInfo.filename);
    } finally {
      if (tempDir && fs) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
      }
    }
  }

  // ── Language Runners ────────────────────────────────────────────────────────

  private static executeJava(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return new Promise((resolve) => {
      const cp = getChildProcess();
      const startTime = Date.now();
      const className = sourceInfo.entryClass || "Main";

      const javac = cp.spawn("javac", [sourceInfo.filename], { cwd: tempDir });
      let compileErr = "";

      javac.stderr.on("data", (d: any) => { compileErr += d.toString(); });
      javac.on("close", (cc: number | null) => {
        if (cc !== 0) {
          const sanitizedErr = sanitizeCompilerOutput(compileErr, sourceInfo.filename);
          return resolve({
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
        }

        const javaProc = cp.spawn("java", ["-cp", ".", className], { cwd: tempDir });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; javaProc.kill(); }, timeoutMs);

        if (stdin) {
          javaProc.stdin.write(stdin);
          javaProc.stdin.end();
        } else {
          javaProc.stdin.end();
        }

        javaProc.stdout.on("data", (d: any) => { stdout += d.toString(); });
        javaProc.stderr.on("data", (d: any) => { stderr += d.toString(); });

        javaProc.on("close", (rc: number | null) => {
          clearTimeout(timer);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          if (timedOut) {
            return resolve(this.createTimeoutResult(elapsed, sourceInfo.filename, "java"));
          }
          const isOk = rc === 0;
          const sanitizedErr = sanitizeCompilerOutput(stderr, sourceInfo.filename);
          const statusDesc: StandardExecutionStatus = isOk ? "ACCEPTED" : "RUNTIME_ERROR";
          resolve({
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
          clearTimeout(timer);
          resolve(this.createInternalError(err.message, sourceInfo.filename, "java"));
        });
      });

      javac.on("error", (err: Error) => {
        resolve(this.createInternalError(`javac: ${err.message}`, sourceInfo.filename, "java"));
      });
    });
  }

  private static executePython(
    sourceInfo: SourceFileInfo,
    tempDir: string,
    stdin: string,
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.executeProcessRunner("python", [sourceInfo.filename], tempDir, stdin, timeoutMs, sourceInfo.filename, "python", 18000);
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
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.compileAndExecuteRunner(
      "g++",
      ["-std=c++17", "-O2", sourceInfo.filename, "-o", "program"],
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
    timeoutMs: number
  ): Promise<UniversalExecutionResult> {
    return this.compileAndExecuteRunner(
      "gcc",
      ["-std=c17", "-O2", sourceInfo.filename, "-o", "program"],
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
      const cp = getChildProcess();
      const startTime = Date.now();
      const proc = cp.spawn(cmd, args, { cwd });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeoutMs);

      if (stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      } else {
        proc.stdin.end();
      }

      proc.stdout.on("data", (d: any) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: any) => { stderr += d.toString(); });

      proc.on("close", (code: number | null) => {
        clearTimeout(timer);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        if (timedOut) {
          return resolve(this.createTimeoutResult(elapsed, filename, language));
        }
        const isOk = code === 0;
        const sanitizedErr = sanitizeCompilerOutput(stderr, filename);
        const statusDesc: StandardExecutionStatus = isOk ? "ACCEPTED" : "RUNTIME_ERROR";
        resolve({
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
        resolve(this.createInternalError(err.message, filename, language));
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
      const cp = getChildProcess();
      const startTime = Date.now();
      const comp = cp.spawn(compilerCmd, compilerArgs, { cwd });
      let compileErr = "";

      comp.stderr.on("data", (d: any) => { compileErr += d.toString(); });
      comp.on("close", (cc: number | null) => {
        if (cc !== 0) {
          const sanitized = sanitizeCompilerOutput(compileErr, filename);
          return resolve({
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

        const runArgs = executableCmd.startsWith("./") ? [executableCmd.slice(2)] : [executableCmd];
        const runProc = cp.spawn(runArgs[0], [], { cwd });

        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; runProc.kill(); }, timeoutMs);

        if (stdin) {
          runProc.stdin.write(stdin);
          runProc.stdin.end();
        } else {
          runProc.stdin.end();
        }

        runProc.stdout.on("data", (d: any) => { stdout += d.toString(); });
        runProc.stderr.on("data", (d: any) => { stderr += d.toString(); });

        runProc.on("close", (rc: number | null) => {
          clearTimeout(timer);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          if (timedOut) {
            return resolve(this.createTimeoutResult(elapsed, filename, language));
          }
          const isOk = rc === 0;
          const sanitizedErr = sanitizeCompilerOutput(stderr, filename);
          const statusDesc: StandardExecutionStatus = isOk ? "ACCEPTED" : "RUNTIME_ERROR";
          resolve({
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
          resolve(this.createInternalError(err.message, filename, language));
        });
      });

      comp.on("error", (err: Error) => {
        resolve(this.createInternalError(`${compilerCmd}: ${err.message}`, filename, language));
      });
    });
  }

  // ── Online Sandbox Fallback ────────────────────────────────────────────────

  private static async executeOnline(
    language: string,
    code: string,
    stdin: string,
    timeoutMs: number,
    filename: string
  ): Promise<UniversalExecutionResult> {
    const raw = await OnlineCompilerService.execute(language, code, stdin, timeoutMs);
    const sanitizedErr = sanitizeCompilerOutput(raw.stderr || "", filename);
    const sanitizedComp = sanitizeCompilerOutput(raw.compile_output || "", filename);
    const isOk = raw.outcome === 15 || raw.status?.id === 3;
    const isCompileErr = raw.outcome === 11 || raw.status?.id === 6;
    const isTimeout = raw.outcome === 13 || raw.status?.id === 5;

    let statusDesc: StandardExecutionStatus = "ACCEPTED";
    if (isTimeout) statusDesc = "TIME_LIMIT_EXCEEDED";
    else if (isCompileErr) statusDesc = "COMPILE_ERROR";
    else if (!isOk) statusDesc = "RUNTIME_ERROR";

    return {
      stdout: raw.stdout || "",
      stderr: sanitizedErr,
      compile_output: sanitizedComp,
      message: raw.message || (isOk ? "Accepted" : "Execution Error"),
      status: {
        id: raw.status?.id || (isOk ? 3 : 7),
        description: statusDesc,
      },
      outcome: raw.outcome || (isOk ? 15 : 12),
      time: raw.time || "0.00",
      memory: raw.memory || 12000,
      filename,
      language,
    };
  }

  // ── Error Response Builders ────────────────────────────────────────────────

  private static createTimeoutResult(time: string, filename: string, language: string): UniversalExecutionResult {
    return {
      stdout: "",
      stderr: "Time Limit Exceeded",
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

  private static createInternalError(errMsg: string, filename: string, language: string): UniversalExecutionResult {
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
