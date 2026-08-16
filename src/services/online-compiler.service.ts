import https from "node:https";
import type { NormalizedExecutionResult } from "./jobe/types";

/**
 * Maps our internal language IDs to Wandbox compiler IDs.
 * Wandbox is a free, reliable online code execution sandbox.
 * https://wandbox.org/api/list.json for full compiler list.
 */
const WANDBOX_COMPILER_MAP: Record<string, string> = {
  python: "cpython-3.11.10",
  python3: "cpython-3.11.10",
  py: "cpython-3.11.10",
  java: "openjdk-jdk-22+36",
  javascript: "nodejs-20.17.0",
  nodejs: "nodejs-20.17.0",
  js: "nodejs-20.17.0",
  typescript: "nodejs-20.17.0", // transpiled to JS before sending
  ts: "nodejs-20.17.0",
  c: "gcc-13.2.0-c",
  cpp: "gcc-13.2.0",
  "c++": "gcc-13.2.0",
  rust: "rust-1.82.0",
  go: "go-1.23.2",
  ruby: "ruby-3.3.11",
  php: "php-8.3.12",
  scala: "scala-3.5.1",
  kotlin: "openjdk-jdk-22+36", // Kotlin not on Wandbox; use JVM stub
  swift: "swift-6.0.1",
  csharp: "mono-6.12.0.199",
  cs: "mono-6.12.0.199",
};

/**
 * Normalizes raw Wandbox response into our standard NormalizedExecutionResult.
 */
function normalizeWandboxResponse(
  parsed: Record<string, any>,
  startTime: number
): NormalizedExecutionResult {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const compileErr = (parsed.compiler_error || "").trim();
  const programOut = (parsed.program_output || parsed.program_message || "").trim();
  const programErr = (parsed.program_error || "").trim();

  // Compilation failed
  if (compileErr && !programOut && parsed.status !== "0") {
    return {
      stdout: "",
      stderr: compileErr,
      compile_output: compileErr,
      message: "Compilation Error",
      status: { id: 6, description: "Compilation Error" },
      outcome: 11,
      time: elapsed,
      memory: 12000,
    };
  }

  const isSuccess = parsed.status === "0";
  return {
    stdout: programOut,
    stderr: programErr,
    compile_output: compileErr,
    message: isSuccess ? "Accepted" : "Runtime Error",
    status: {
      id: isSuccess ? 3 : 7,
      description: isSuccess ? "Accepted" : "Runtime Error",
    },
    outcome: isSuccess ? 15 : 12,
    time: elapsed,
    memory: 12000,
  };
}

/**
 * Performs an HTTPS POST request to Wandbox and returns the NormalizedExecutionResult.
 * Works in any Node.js environment including serverless (Vercel, AWS Lambda).
 */
function executeOnWandbox(
  compiler: string,
  code: string,
  stdin: string,
  timeoutMs: number
): Promise<NormalizedExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const payload = JSON.stringify({
      compiler,
      code,
      stdin: stdin || "",
    });

    const req = https.request(
      {
        hostname: "wandbox.org",
        path: "/api/compile.json",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = "";
        res.on("data", (c: Buffer) => {
          data += c;
        });
        res.on("end", () => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          try {
            const parsed = JSON.parse(data);
            resolve(normalizeWandboxResponse(parsed, startTime));
          } catch {
            resolve({
              stdout: "",
              stderr: "Online compiler response parse error",
              compile_output: "",
              message: "Execution Error",
              status: { id: 13, description: "Internal Error" },
              outcome: 20,
              time: elapsed,
              memory: 0,
            });
          }
        });
      }
    );

    req.on("error", (err: Error) => {
      resolve({
        stdout: "",
        stderr: `Online execution service unreachable: ${err.message}`,
        compile_output: "",
        message: "Service Unavailable",
        status: { id: 13, description: "Internal Error" },
        outcome: 20,
        time: "0.00",
        memory: 0,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        stdout: "",
        stderr: "Execution timed out",
        compile_output: "",
        message: "Time Limit Exceeded",
        status: { id: 5, description: "Time Limit Exceeded" },
        outcome: 13,
        time: (timeoutMs / 1000).toFixed(2),
        memory: 0,
      });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Pre-process Java code for Wandbox JDK:
 * - Strips package declarations (not supported in sandbox)
 * - Ensures at least one public class exists
 */
function preprocessJavaForSandbox(code: string): string {
  // Remove package declarations
  let src = code.replace(/^\s*package\s+[^;]+;/gm, "");
  const publicClassMatch = src.match(/public\s+class\s+([A-Za-z0-9_]+)/);
  const anyClassMatch = src.match(/class\s+([A-Za-z0-9_]+)/);
  if (!anyClassMatch) {
    src = `import java.util.*;\nimport java.io.*;\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    ${src}\n  }\n}`;
  } else if (!publicClassMatch) {
    const cls = anyClassMatch[1];
    src = src.replace(new RegExp(`(?<!public\\s{1,10})class\\s+${cls}`), `public class ${cls}`);
  }
  return src;
}

/**
 * Pre-process TypeScript: strip type annotations so it runs as plain JS on Node.js.
 * This is a best-effort basic transform — for complex TS, the server should have tsc or use Jobe.
 */
function preprocessTypeScriptForNode(code: string): string {
  return code
    .replace(/:\s*(string|number|boolean|void|any|never|undefined|null|object|bigint)(\[\])?(\s*[,)=;])/g, "$3")
    .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, "")
    .replace(/<[A-Za-z,\s]+>/g, "")
    .replace(/\bpublic\b\s+/g, "")
    .replace(/\bprivate\b\s+/g, "")
    .replace(/\bprotected\b\s+/g, "")
    .replace(/\breadonly\b\s+/g, "");
}

/**
 * Online Compiler Service — Universal serverless-safe code execution via Wandbox.
 * 
 * This service works in ANY deployment environment:
 * - Local development (no compilers needed)
 * - Vercel serverless functions
 * - AWS Lambda
 * - Any cloud function environment
 * 
 * It uses the free Wandbox.org API as the execution backend.
 */
export class OnlineCompilerService {
  /**
   * Executes code online using Wandbox.
   * Automatically maps language to the best available Wandbox compiler.
   */
  public static async execute(
    language: string,
    code: string,
    stdin: string = "",
    timeoutMs: number = 10000
  ): Promise<NormalizedExecutionResult> {
    const lang = (language || "").toLowerCase().trim();
    const compiler = WANDBOX_COMPILER_MAP[lang];

    if (!compiler) {
      return {
        stdout: "",
        stderr: `Language '${language}' is not supported by the online execution engine.`,
        compile_output: "",
        message: "Unsupported Language",
        status: { id: 13, description: "Unsupported Language" },
        outcome: 20,
        time: "0.00",
        memory: 0,
      };
    }

    let processedCode = code;
    if (lang === "java") {
      processedCode = preprocessJavaForSandbox(code);
    } else if (lang === "typescript" || lang === "ts") {
      processedCode = preprocessTypeScriptForNode(code);
    }

    const cleanStdin = (stdin || "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n");

    return executeOnWandbox(compiler, processedCode, cleanStdin, timeoutMs);
  }
}
