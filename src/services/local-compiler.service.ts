/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * LocalCompilerService
 *
 * Runs student code via spawn (local binaries) in non-serverless environments,
 * and automatically falls back to OnlineCompilerService (Wandbox) when:
 *   - Deployed to Vercel / AWS Lambda / Netlify / GCF (serverless)
 *   - Local binary not found (e.g. javac missing)
 *   - Any spawn-related error occurs
 *
 * This means: no "Jobe execution server unreachable" errors ever appear in production.
 */

import type { NormalizedExecutionResult } from "./jobe/types";
import { OnlineCompilerService } from "@/services/online-compiler.service";

// Safe dynamic access to Node.js modules preventing Turbopack client bundling failures
const isNode = typeof window === "undefined";
const getFs = () => (isNode ? eval("require('node:fs')") : null);
const getPath = () => (isNode ? eval("require('node:path')") : null);
const getOs = () => (isNode ? eval("require('node:os')") : null);
const getChildProcess = () => (isNode ? eval("require('node:child_process')") : null);
const getHttps = () => (isNode ? eval("require('node:https')") : null);

/**
 * Returns true when running inside a serverless function environment
 * where child_process.spawn and tmp filesystem writes are unavailable.
 */
function isServerless(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_NAME
  );
}

/** Normalise stdin: convert escaped \n sequences to real newlines. */
function cleanStdinStr(s: string): string {
  return (s || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
}

export class LocalCompilerService {
  public static async execute(
    language: string,
    code: string,
    stdin: string = "",
    timeoutMs: number = 10000
  ): Promise<NormalizedExecutionResult> {
    const lang = (language || "").toLowerCase().trim();
    const cleanStdin = cleanStdinStr(stdin);

    // ── Client-side safe guard ──────────────────────────────────────────────
    if (!isNode) {
      return OnlineCompilerService.execute(language, code, cleanStdin, timeoutMs);
    }

    // ── Serverless: always use online compiler ───────────────────────────────
    if (isServerless()) {
      return OnlineCompilerService.execute(language, code, cleanStdin, timeoutMs);
    }

    const fs = getFs();
    const path = getPath();
    const os = getOs();

    if (!fs || !path || !os) {
      return OnlineCompilerService.execute(language, code, cleanStdin, timeoutMs);
    }

    // ── Local / self-hosted server: try spawn, fall back to online ───────────
    let tempDir: string | null = null;
    try {
      const createdTempDir: string = fs.mkdtempSync(path.join(os.tmpdir(), "lms_sandbox_"));
      tempDir = createdTempDir;

      let result: NormalizedExecutionResult;

      if (lang === "python" || lang === "python3" || lang === "py") {
        result = await this.executePython(code, cleanStdin, createdTempDir, timeoutMs);
      } else if (lang === "java") {
        result = await this.executeJava(code, cleanStdin, createdTempDir, timeoutMs);
      } else if (
        lang === "javascript" || lang === "nodejs" ||
        lang === "js" || lang === "typescript" || lang === "ts"
      ) {
        result = await this.executeNode(code, cleanStdin, createdTempDir, timeoutMs);
      } else if (lang === "c" || lang === "cpp" || lang === "c++") {
        result = await this.executeCAndCpp(lang, code, cleanStdin, createdTempDir, timeoutMs);
      } else if (lang === "sql") {
        const { SQLExecutionService, DEFAULT_SQL_SCHEMA, DEFAULT_SQL_SEED } = await import("@/services/sql-execution.service");
        const script = SQLExecutionService.generateRunnerScript({
          engine: "sqlite",
          schemaSql: DEFAULT_SQL_SCHEMA,
          seedSql: DEFAULT_SQL_SEED,
          query: code,
        });
        result = await this.executePython(script, cleanStdin, createdTempDir, timeoutMs);
      } else {
        // Language not handled locally — use online compiler
        return OnlineCompilerService.execute(language, code, cleanStdin, timeoutMs);
      }

      // If local execution returned an internal error (e.g. binary not found), fall back online
      if (result.status?.id === 13 || result.outcome === 20) {
        return OnlineCompilerService.execute(language, code, cleanStdin, timeoutMs);
      }
      return result;
    } catch {
      // Any unexpected error — fall back silently to online compiler
      return OnlineCompilerService.execute(language, code, cleanStdin, timeoutMs);
    } finally {
      if (tempDir) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }
    }
  }

  // ── Python ─────────────────────────────────────────────────────────────────

  private static executePython(
    code: string,
    stdin: string,
    tempDir: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    return new Promise((resolve) => {
      const fs = getFs();
      const path = getPath();
      const cp = getChildProcess();
      if (!fs || !path || !cp) return resolve(errResult("Node environment unavailable"));

      const filePath = path.join(tempDir, "solution.py");
      fs.writeFileSync(filePath, code, "utf8");

      const startTime = Date.now();
      const proc = cp.spawn("python", [filePath], { cwd: tempDir });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => { timedOut = true; proc.kill(); }, timeoutMs);

      if (stdin) { proc.stdin.write(stdin); proc.stdin.end(); }
      else { proc.stdin.end(); }

      proc.stdout.on("data", (d: any) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: any) => { stderr += d.toString(); });

      proc.on("close", (exitCode: number | null) => {
        clearTimeout(timer);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        if (timedOut) return resolve(tlResult(elapsed));
        const ok = exitCode === 0;
        resolve(runResult(ok, stdout.trimEnd(), stderr.trimEnd(), elapsed, 18000));
      });

      proc.on("error", (err: Error) => {
        clearTimeout(timer);
        resolve(errResult(err.message));
      });
    });
  }

  // ── Java ───────────────────────────────────────────────────────────────────

  private static executeJava(
    code: string,
    stdin: string,
    tempDir: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    return new Promise((resolve) => {
      const fs = getFs();
      const path = getPath();
      const cp = getChildProcess();
      if (!fs || !path || !cp) return resolve(errResult("Node environment unavailable"));

      // Strip package declarations — not valid in sandbox temp dir
      let src = code.replace(/^\s*package\s+[^;]+;/gm, "");
      
      // Auto-inject standard utility imports if missing
      if (!src.includes("import java.util")) {
        src = `import java.util.*;\nimport java.io.*;\n${src}`;
      }

      const pubMatch = src.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      const anyMatch = src.match(/class\s+([A-Za-z0-9_]+)/);
      const className: string = (pubMatch?.[1] ?? anyMatch?.[1] ?? "Main");

      if (!anyMatch) {
        src = `import java.util.*;\nimport java.io.*;\npublic class Main {\n  public static void main(String[] args) throws Exception {\n${src}\n  }\n}`;
      } else if (!pubMatch) {
        src = src.replace(new RegExp(`class\\s+${className}`), `public class ${className}`);
      }

      fs.writeFileSync(path.join(tempDir, `${className}.java`), src, "utf8");

      const startTime = Date.now();
      const javac = cp.spawn("javac", [`${className}.java`], { cwd: tempDir });
      let compileErr = "";

      javac.stderr.on("data", (d: any) => { compileErr += d.toString(); });
      javac.on("close", (cc: number | null) => {
        if (cc !== 0) {
          return resolve({
            stdout: "", stderr: compileErr.trimEnd(), compile_output: compileErr.trimEnd(),
            message: "Compilation Error", status: { id: 6, description: "Compilation Error" },
            outcome: 11, time: "0.00", memory: 0,
          });
        }

        const javaProc = cp.spawn("java", [className], { cwd: String(tempDir) });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; javaProc.kill(); }, timeoutMs);

        if (stdin) { javaProc.stdin.write(stdin); javaProc.stdin.end(); }
        else { javaProc.stdin.end(); }

        javaProc.stdout.on("data", (d: any) => { stdout += d.toString(); });
        javaProc.stderr.on("data", (d: any) => { stderr += d.toString(); });

        javaProc.on("close", (rc: number | null) => {
          clearTimeout(timer);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          if (timedOut) return resolve(tlResult(elapsed));
          resolve(runResult(rc === 0, stdout.trimEnd(), stderr.trimEnd(), elapsed, 32000));
        });
        javaProc.on("error", (err: Error) => { clearTimeout(timer); resolve(errResult(err.message, 13, "Internal Error", 20)); });
      });

      javac.on("error", (err: Error) => {
        resolve(errResult(`javac: ${err.message}`, 13, "Internal Error", 20));
      });
    });
  }

  // ── Node.js / JavaScript / TypeScript ─────────────────────────────────────

  private static executeNode(
    code: string,
    stdin: string,
    tempDir: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    return new Promise((resolve) => {
      const fs = getFs();
      const path = getPath();
      const cp = getChildProcess();
      if (!fs || !path || !cp) return resolve(errResult("Node environment unavailable"));

      const filePath = path.join(tempDir, "solution.js");
      fs.writeFileSync(filePath, code, "utf8");

      const startTime = Date.now();
      const proc = cp.spawn("node", [filePath], { cwd: tempDir });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; proc.kill(); }, timeoutMs);

      if (stdin) { proc.stdin.write(stdin); proc.stdin.end(); }
      else { proc.stdin.end(); }

      proc.stdout.on("data", (d: any) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: any) => { stderr += d.toString(); });

      proc.on("close", (exitCode: number | null) => {
        clearTimeout(timer);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        if (timedOut) return resolve(tlResult(elapsed));
        resolve(runResult(exitCode === 0, stdout.trimEnd(), stderr.trimEnd(), elapsed, 20000));
      });

      proc.on("error", (err: Error) => { clearTimeout(timer); resolve(errResult(err.message)); });
    });
  }

  // ── C / C++ ────────────────────────────────────────────────────────────────

  private static async executeCAndCpp(
    lang: string,
    code: string,
    stdin: string,
    tempDir: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    const cp = getChildProcess();
    if (!cp) return this.executeWandboxGcc(lang, code, stdin, timeoutMs);

    const compiler = lang === "c" ? "gcc" : "g++";
    const hasLocal = await new Promise<boolean>((res) => {
      const p = cp.spawn(compiler, ["--version"]);
      p.on("error", () => res(false));
      p.on("close", (c: number | null) => res(c === 0));
    });

    if (hasLocal) return this.executeLocalGcc(lang, code, stdin, tempDir, timeoutMs);
    return this.executeWandboxGcc(lang, code, stdin, timeoutMs);
  }

  private static executeLocalGcc(
    lang: string,
    code: string,
    stdin: string,
    tempDir: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    return new Promise((resolve) => {
      const fs = getFs();
      const path = getPath();
      const cp = getChildProcess();
      if (!fs || !path || !cp) return resolve(errResult("Node environment unavailable"));

      const ext = lang === "c" ? "c" : "cpp";
      const src = path.join(tempDir, `solution.${ext}`);
      const out = path.join(tempDir, "solution_out");
      fs.writeFileSync(src, code, "utf8");

      const compiler = lang === "c" ? "gcc" : "g++";
      const comp = cp.spawn(compiler, [`solution.${ext}`, "-o", "solution_out"], { cwd: tempDir });
      let compErr = "";

      comp.stderr.on("data", (d: any) => { compErr += d.toString(); });
      comp.on("close", (cc: number | null) => {
        if (cc !== 0) return resolve({
          stdout: "", stderr: compErr, compile_output: compErr,
          message: "Compilation Error", status: { id: 6, description: "Compilation Error" },
          outcome: 11, time: "0.00", memory: 0,
        });

        const proc = cp.spawn(out, [], { cwd: tempDir });
        let stdout = ""; let stderr = "";
        const timer = setTimeout(() => proc.kill(), timeoutMs);

        if (stdin) { proc.stdin.write(stdin); proc.stdin.end(); }
        else { proc.stdin.end(); }

        proc.stdout.on("data", (d: any) => { stdout += d.toString(); });
        proc.stderr.on("data", (d: any) => { stderr += d.toString(); });
        proc.on("close", (ec: number | null) => {
          clearTimeout(timer);
          resolve(runResult(ec === 0, stdout.trimEnd(), stderr.trimEnd(), "0.05", 12000));
        });
      });

      comp.on("error", () => this.executeWandboxGcc(lang, code, stdin, timeoutMs).then(resolve));
    });
  }

  private static executeWandboxGcc(
    lang: string,
    code: string,
    stdin: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    return new Promise((resolve) => {
      const httpsModule = getHttps();
      if (!httpsModule) return resolve(errResult("HTTPS module unavailable"));

      const startTime = Date.now();
      const compiler = lang === "c" ? "gcc-13.2.0-c" : "gcc-13.2.0";
      const payload = JSON.stringify({ compiler, code, stdin: stdin || "" });

      const req = httpsModule.request({
        hostname: "wandbox.org",
        path: "/api/compile.json",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      }, (res: any) => {
        let data = "";
        res.on("data", (c: any) => { data += c; });
        res.on("end", () => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          try {
            const parsed = JSON.parse(data);
            const compileErr = (parsed.compiler_error || "").trim();
            const programOut = (parsed.program_output || parsed.program_message || "").trim();
            const programErr = (parsed.program_error || "").trim();
            if (compileErr && !programOut && parsed.status !== "0") {
              return resolve({
                stdout: "", stderr: compileErr, compile_output: compileErr,
                message: "Compilation Error", status: { id: 6, description: "Compilation Error" },
                outcome: 11, time: elapsed, memory: 12000,
              });
            }
            const ok = parsed.status === "0";
            resolve(runResult(ok, programOut, programErr, elapsed, 12000, compileErr));
          } catch {
            resolve(errResult("Wandbox response parse error"));
          }
        });
      });

      req.on("error", (err: Error) => resolve(errResult(err.message)));
      req.on("timeout", () => { req.destroy(); resolve(tlResult((timeoutMs / 1000).toFixed(2))); });
      req.write(payload);
      req.end();
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function runResult(
  ok: boolean,
  stdout: string,
  stderr: string,
  time: string,
  memory: number,
  compile_output = ""
): NormalizedExecutionResult {
  return {
    stdout,
    stderr,
    compile_output,
    message: ok ? "Accepted" : "Runtime Error",
    status: { id: ok ? 3 : 7, description: ok ? "Accepted" : "Runtime Error" },
    outcome: ok ? 15 : 12,
    time,
    memory,
  };
}

function tlResult(time: string): NormalizedExecutionResult {
  return {
    stdout: "", stderr: "Time Limit Exceeded", compile_output: "",
    message: "Time Limit Exceeded", status: { id: 5, description: "Time Limit Exceeded" },
    outcome: 13, time, memory: 0,
  };
}

function errResult(
  msg: string,
  statusId = 13,
  desc = "Internal Error",
  outcome = 20
): NormalizedExecutionResult {
  return {
    stdout: "", stderr: msg, compile_output: msg,
    message: desc, status: { id: statusId, description: desc },
    outcome, time: "0.00", memory: 0,
  };
}
