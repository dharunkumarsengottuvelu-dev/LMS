import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import https from "node:https";
import type { NormalizedExecutionResult } from "./jobe/types";

export class LocalCompilerService {
  public static async execute(
    language: string,
    code: string,
    stdin: string = "",
    timeoutMs: number = 7000
  ): Promise<NormalizedExecutionResult> {
    const lang = (language || "").toLowerCase().trim();
    const cleanStdin = (stdin || "").replace(/\\n/g, "\n");
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lms_sandbox_"));

    try {
      if (lang === "python" || lang === "python3" || lang === "py") {
        return await this.executePython(code, cleanStdin, tempDir, timeoutMs);
      } else if (lang === "java") {
        return await this.executeJava(code, cleanStdin, tempDir, timeoutMs);
      } else if (lang === "javascript" || lang === "nodejs" || lang === "js" || lang === "typescript" || lang === "ts") {
        return await this.executeNode(code, cleanStdin, tempDir, timeoutMs);
      } else if (lang === "c" || lang === "cpp" || lang === "c++") {
        return await this.executeCAndCpp(lang, code, cleanStdin, tempDir, timeoutMs);
      } else {
        return {
          stdout: "",
          stderr: `Local compiler execution for '${language}' is not supported without Jobe.`,
          compile_output: `Language '${language}' requires Jobe server.`,
          message: "Unsupported Language",
          status: { id: 13, description: "Internal Error" },
          outcome: 20,
          time: "0.00",
          memory: 0
        };
      }
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  private static executePython(
    code: string,
    stdin: string,
    tempDir: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    return new Promise((resolve) => {
      const filePath = path.join(tempDir, "solution.py");
      fs.writeFileSync(filePath, code, "utf8");

      const startTime = Date.now();
      const proc = spawn(/*turbopackIgnore: true*/ "python", [filePath], { cwd: tempDir }) as ChildProcessWithoutNullStreams;

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

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (exitCode: number | null) => {
        clearTimeout(timer);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        if (timedOut) {
          return resolve({
            stdout: "",
            stderr: "Time Limit Exceeded",
            compile_output: "",
            message: "Time Limit Exceeded",
            status: { id: 5, description: "Time Limit Exceeded" },
            outcome: 13,
            time: elapsed,
            memory: 16000
          });
        }

        const isSuccess = exitCode === 0;
        resolve({
          stdout: stdout.trimEnd(),
          stderr: stderr.trimEnd(),
          compile_output: "",
          message: isSuccess ? "Accepted" : "Runtime Error",
          status: {
            id: isSuccess ? 3 : 7,
            description: isSuccess ? "Accepted" : "Runtime Error"
          },
          outcome: isSuccess ? 15 : 12,
          time: elapsed,
          memory: 18000
        });
      });

      proc.on("error", (err: Error) => {
        clearTimeout(timer);
        resolve({
          stdout: "",
          stderr: err.message,
          compile_output: err.message,
          message: "Execution Failed",
          status: { id: 7, description: "Runtime Error" },
          outcome: 12,
          time: "0.00",
          memory: 0
        });
      });
    });
  }

  private static executeJava(
    code: string,
    stdin: string,
    tempDir: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    return new Promise((resolve) => {
      const classMatch = code.match(/(?:public\s+)?class\s+([A-Za-z0-9_]+)/);
      const className: string = (classMatch && classMatch[1]) ? classMatch[1] : "Main";
      
      let sourceCode = code;
      if (!classMatch) {
        sourceCode = `import java.util.*;\nimport java.io.*;\npublic class Main {\n  public static void main(String[] args) {\n    ${code}\n  }\n}`;
      } else if (!code.includes("public class " + className)) {
        sourceCode = code.replace(new RegExp(`class\\s+${className}`), `public class ${className}`);
      }

      const filePath = path.join(tempDir, `${className}.java`);
      fs.writeFileSync(filePath, sourceCode, "utf8");

      const startTime = Date.now();

      // 1. Compile Java file
      const javac = spawn(/*turbopackIgnore: true*/ "javac", [`${className}.java`], { cwd: tempDir }) as ChildProcessWithoutNullStreams;
      let compileErr = "";

      javac.stderr.on("data", (data: Buffer) => {
        compileErr += data.toString();
      });

      javac.on("close", (compileCode: number | null) => {
        if (compileCode !== 0) {
          return resolve({
            stdout: "",
            stderr: compileErr.trimEnd(),
            compile_output: compileErr.trimEnd(),
            message: "Compilation Error",
            status: { id: 6, description: "Compilation Error" },
            outcome: 11,
            time: "0.00",
            memory: 0
          });
        }

        // 2. Execute Compiled Java class
        const javaProcess = spawn(/*turbopackIgnore: true*/ "java", [className], { cwd: tempDir }) as ChildProcessWithoutNullStreams;
        let stdout = "";
        let stderr = "";
        let timedOut = false;

        const timer = setTimeout(() => {
          timedOut = true;
          javaProcess.kill();
        }, timeoutMs);

        if (stdin) {
          javaProcess.stdin.write(stdin);
          javaProcess.stdin.end();
        } else {
          javaProcess.stdin.end();
        }

        javaProcess.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        javaProcess.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        javaProcess.on("close", (runCode: number | null) => {
          clearTimeout(timer);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

          if (timedOut) {
            return resolve({
              stdout: "",
              stderr: "Time Limit Exceeded",
              compile_output: "",
              message: "Time Limit Exceeded",
              status: { id: 5, description: "Time Limit Exceeded" },
              outcome: 13,
              time: elapsed,
              memory: 32000
            });
          }

          const isSuccess = runCode === 0;
          resolve({
            stdout: stdout.trimEnd(),
            stderr: stderr.trimEnd(),
            compile_output: "",
            message: isSuccess ? "Accepted" : "Runtime Error",
            status: {
              id: isSuccess ? 3 : 7,
              description: isSuccess ? "Accepted" : "Runtime Error"
            },
            outcome: isSuccess ? 15 : 12,
            time: elapsed,
            memory: 32000
          });
        });

        javaProcess.on("error", (err: Error) => {
          clearTimeout(timer);
          resolve({
            stdout: "",
            stderr: err.message,
            compile_output: "",
            message: "Execution Failed",
            status: { id: 7, description: "Runtime Error" },
            outcome: 12,
            time: "0.00",
            memory: 0
          });
        });
      });

      javac.on("error", (err: Error) => {
        resolve({
          stdout: "",
          stderr: `Javac compilation failed: ${err.message}`,
          compile_output: err.message,
          message: "Compilation Error",
          status: { id: 6, description: "Compilation Error" },
          outcome: 11,
          time: "0.00",
          memory: 0
        });
      });
    });
  }

  private static executeNode(
    code: string,
    stdin: string,
    tempDir: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    return new Promise((resolve) => {
      const filePath = path.join(tempDir, "solution.js");
      fs.writeFileSync(filePath, code, "utf8");

      const startTime = Date.now();
      const nodeBinary = process.execPath || "node";
      const proc = spawn(/*turbopackIgnore: true*/ nodeBinary, [filePath], { cwd: tempDir }) as ChildProcessWithoutNullStreams;

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

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (exitCode: number | null) => {
        clearTimeout(timer);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        if (timedOut) {
          return resolve({
            stdout: "",
            stderr: "Time Limit Exceeded",
            compile_output: "",
            message: "Time Limit Exceeded",
            status: { id: 5, description: "Time Limit Exceeded" },
            outcome: 13,
            time: elapsed,
            memory: 20000
          });
        }

        const isSuccess = exitCode === 0;
        resolve({
          stdout: stdout.trimEnd(),
          stderr: stderr.trimEnd(),
          compile_output: "",
          message: isSuccess ? "Accepted" : "Runtime Error",
          status: {
            id: isSuccess ? 3 : 7,
            description: isSuccess ? "Accepted" : "Runtime Error"
          },
          outcome: isSuccess ? 15 : 12,
          time: elapsed,
          memory: 20000
        });
      });

      proc.on("error", (err: Error) => {
        clearTimeout(timer);
        resolve({
          stdout: "",
          stderr: err.message,
          compile_output: err.message,
          message: "Execution Failed",
          status: { id: 7, description: "Runtime Error" },
          outcome: 12,
          time: "0.00",
          memory: 0
        });
      });
    });
  }

  private static async executeCAndCpp(
    lang: string,
    code: string,
    stdin: string,
    tempDir: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    // 1. Check if local gcc/g++ exists
    const hasLocalGcc = await new Promise<boolean>((res) => {
      const p = spawn(/*turbopackIgnore: true*/ lang === "c" ? "gcc" : "g++", ["--version"]);
      p.on("error", () => res(false));
      p.on("close", (c) => res(c === 0));
    });

    if (hasLocalGcc) {
      return this.executeLocalGcc(lang, code, stdin, tempDir, timeoutMs);
    }

    // 2. Seamless Online GCC Sandbox Execution (Wandbox GCC-head)
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
      const ext = lang === "c" ? "c" : "cpp";
      const srcPath = path.join(tempDir, `solution.${ext}`);
      const outPath = path.join(tempDir, "solution.exe");
      fs.writeFileSync(srcPath, code, "utf8");

      const compilerCmd = lang === "c" ? "gcc" : "g++";
      const gpp = spawn(/*turbopackIgnore: true*/ compilerCmd, [`solution.${ext}`, "-o", "solution.exe"], { cwd: tempDir }) as ChildProcessWithoutNullStreams;
      let compileErr = "";

      gpp.stderr.on("data", (d: Buffer) => { compileErr += d.toString(); });
      gpp.on("close", (c: number | null) => {
        if (c !== 0) {
          return resolve({
            stdout: "",
            stderr: compileErr || "Compilation error",
            compile_output: compileErr,
            message: "Compilation Error",
            status: { id: 6, description: "Compilation Error" },
            outcome: 11,
            time: "0.00",
            memory: 0
          });
        }

        const proc = spawn(/*turbopackIgnore: true*/ outPath, [], { cwd: tempDir }) as ChildProcessWithoutNullStreams;
        let stdout = "";
        let stderr = "";
        const timer = setTimeout(() => proc.kill(), timeoutMs);

        if (stdin) {
          proc.stdin.write(stdin);
          proc.stdin.end();
        } else {
          proc.stdin.end();
        }

        proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
        proc.stderr.on("data", (d: Buffer) => stderr += d.toString());
        proc.on("close", (ec: number | null) => {
          clearTimeout(timer);
          const isSuccess = ec === 0;
          resolve({
            stdout: stdout.trimEnd(),
            stderr: stderr.trimEnd(),
            compile_output: "",
            message: isSuccess ? "Accepted" : "Runtime Error",
            status: { id: isSuccess ? 3 : 7, description: isSuccess ? "Accepted" : "Runtime Error" },
            outcome: isSuccess ? 15 : 12,
            time: "0.05",
            memory: 12000
          });
        });
      });

      gpp.on("error", () => {
        return this.executeWandboxGcc(lang, code, stdin, timeoutMs).then(resolve);
      });
    });
  }

  private static executeWandboxGcc(
    lang: string,
    code: string,
    stdin: string,
    timeoutMs: number
  ): Promise<NormalizedExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const payload = JSON.stringify({
        code,
        compiler: "gcc-head",
        stdin: stdin || ""
      });

      const req = https.request({
        hostname: "wandbox.org",
        path: "/api/compile.json",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        },
        timeout: timeoutMs
      }, (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          try {
            const parsed = JSON.parse(data);
            const compileErr = (parsed.compiler_error || parsed.compiler_message || "").trim();
            const programOut = (parsed.program_output || parsed.program_message || "").trim();
            const programErr = (parsed.program_error || "").trim();

            if (parsed.status !== "0" && compileErr && !programOut) {
              return resolve({
                stdout: "",
                stderr: compileErr,
                compile_output: compileErr,
                message: "Compilation Error",
                status: { id: 6, description: "Compilation Error" },
                outcome: 11,
                time: elapsed,
                memory: 12000
              });
            }

            const isSuccess = parsed.status === "0";
            resolve({
              stdout: programOut,
              stderr: programErr,
              compile_output: compileErr,
              message: isSuccess ? "Accepted" : "Runtime Error",
              status: { id: isSuccess ? 3 : 7, description: isSuccess ? "Accepted" : "Runtime Error" },
              outcome: isSuccess ? 15 : 12,
              time: elapsed,
              memory: 12000
            });
          } catch {
            resolve({
              stdout: "",
              stderr: "Wandbox compilation response format error",
              compile_output: "",
              message: "Execution Error",
              status: { id: 13, description: "Internal Error" },
              outcome: 20,
              time: elapsed,
              memory: 0
            });
          }
        });
      });

      req.on("error", (err) => {
        resolve({
          stdout: "",
          stderr: `C/C++ Sandbox Execution Error: ${err.message}`,
          compile_output: err.message,
          message: "Compiler Error",
          status: { id: 6, description: "Compilation Error" },
          outcome: 11,
          time: "0.00",
          memory: 0
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          stdout: "",
          stderr: "Time Limit Exceeded",
          compile_output: "",
          message: "Time Limit Exceeded",
          status: { id: 5, description: "Time Limit Exceeded" },
          outcome: 13,
          time: "5.00",
          memory: 12000
        });
      });

      req.write(payload);
      req.end();
    });
  }
}
