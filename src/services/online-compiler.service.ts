import https from "node:https";
import http from "node:http";
import type { NormalizedExecutionResult } from "./jobe/types";
import { adaptCodeForExecution } from "@/lib/compiler/code-adapter";
import { isInfrastructureFailure } from "@/lib/compiler/comparator";

/**
 * Maps our internal language IDs to Judge0 CE language IDs.
 * Judge0 CE provides fast, isolated, standard containerized execution with standard REST API.
 * https://ce.judge0.com/languages
 */
const JUDGE0_LANGUAGE_MAP: Record<string, number> = {
  c: 103, // C (GCC 14.1.0)
  cpp: 105, // C++ (GCC 14.1.0)
  "c++": 105,
  python: 100, // Python (3.12.5)
  python3: 100,
  py: 100,
  java: 91, // Java (JDK 17.0.6)
  javascript: 102, // JavaScript (Node.js 22.08.0)
  nodejs: 102,
  js: 102,
  typescript: 101, // TypeScript (5.6.2)
  ts: 101,
  go: 107, // Go (1.23.5)
  rust: 108, // Rust (1.85.0)
  php: 98, // PHP (8.3.11)
  csharp: 51, // C# (Mono 6.6.0.161)
  cs: 51,
  kotlin: 111, // Kotlin (2.1.10)
  kt: 111,
  ruby: 72, // Ruby (2.7.0)
  rb: 72,
  swift: 83, // Swift (5.2.3)
  scala: 112, // Scala (3.4.2)
  dart: 90, // Dart (2.19.2)
  bash: 46, // Bash (5.0.0)
  sh: 46,
  r: 99, // R (4.4.1)
  lua: 64, // Lua (5.3.5)
  perl: 85, // Perl (5.28.1)
  pl: 85,
  sql: 82, // SQL (SQLite 3.27.2)
};

/**
 * Maps our internal language IDs to Wandbox compiler IDs.
 * Used as secondary/fallback sandbox engine.
 */
const WANDBOX_COMPILER_MAP: Record<string, string> = {
  python: "cpython-3.14.0",
  python3: "cpython-3.14.0",
  py: "cpython-3.14.0",
  java: "openjdk-jdk-22+36",
  javascript: "nodejs-20.17.0",
  nodejs: "nodejs-20.17.0",
  js: "nodejs-20.17.0",
  typescript: "typescript-5.6.2",
  ts: "typescript-5.6.2",
  c: "gcc-13.2.0-c",
  cpp: "gcc-13.2.0",
  "c++": "gcc-13.2.0",
  rust: "rust-1.82.0",
  go: "go-1.23.2",
  ruby: "ruby-3.3.11",
  php: "php-8.3.12",
  scala: "scala-3.5.1",
  kotlin: "openjdk-jdk-22+36",
  swift: "swift-6.0.1",
  csharp: "mono-6.12.0.199",
  cs: "mono-6.12.0.199",
  bash: "bash",
  r: "r-4.4.1",
  lua: "lua-5.4.7",
  perl: "perl-5.40.0",
};

/**
 * Detects whether an execution failure was caused by memory exhaustion.
 */
function isMemoryError(errStr: string): boolean {
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

// Persistent keep-alive HTTPS agent to eliminate TCP & TLS handshake overhead on every execution
const compilerHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
});

/**
 * Normalizes raw Judge0 response into our standard NormalizedExecutionResult.
 */
function normalizeJudge0Response(
  parsed: Record<string, any>,
  startTime: number
): NormalizedExecutionResult {
  const elapsed =
    parsed.time !== undefined && parsed.time !== null
      ? String(parsed.time)
      : ((Date.now() - startTime) / 1000).toFixed(2);
  const memoryKb = parsed.memory ? Number(parsed.memory) : 256000;
  const stdout = (parsed.stdout || "").trimEnd();
  const stderr = (parsed.stderr || "").trimEnd();
  const compileOutput = (parsed.compile_output || "").trimEnd();
  const statusId = parsed.status?.id;
  const statusDesc = parsed.status?.description || "";

  // 1. Detect infrastructure failures (e.g. OCI runtime errors, crun clone failures)
  if (
    isInfrastructureFailure(stderr) ||
    isInfrastructureFailure(compileOutput) ||
    isInfrastructureFailure(parsed.message || "")
  ) {
    return {
      stdout: "",
      stderr: "The remote execution sandbox is temporarily overloaded. Please retry in a few moments.",
      compile_output: "",
      message: "Infrastructure Error",
      status: { id: 13, description: "Internal Error" },
      outcome: 20,
      time: elapsed,
      memory: 0,
    };
  }

  // 2. Compilation Error (status 6)
  if (statusId === 6 || (compileOutput && !stdout && statusId !== 3)) {
    const errText = compileOutput || stderr || "Compilation Failed";
    return {
      stdout: "",
      stderr: errText,
      compile_output: errText,
      message: "Compilation Error",
      status: { id: 6, description: "Compilation Error" },
      outcome: 11,
      time: elapsed,
      memory: memoryKb,
    };
  }

  // 3. Time Limit Exceeded (status 5)
  if (statusId === 5) {
    return {
      stdout,
      stderr: stderr || "Time Limit Exceeded: Process execution took longer than permitted time limit.",
      compile_output: compileOutput,
      message: "Time Limit Exceeded",
      status: { id: 5, description: "Time Limit Exceeded" },
      outcome: 13,
      time: elapsed,
      memory: memoryKb,
    };
  }

  // 4. Memory Limit Exceeded (status 4)
  if (statusId === 4 || isMemoryError(stderr)) {
    return {
      stdout,
      stderr: stderr || "Memory Limit Exceeded: Process exhausted allowed memory bounds.",
      compile_output: compileOutput,
      message: "Memory Limit Exceeded",
      status: { id: 4, description: "Memory Limit Exceeded" },
      outcome: 17,
      time: elapsed,
      memory: memoryKb,
    };
  }

  // 5. Accepted (status 3)
  if (statusId === 3) {
    return {
      stdout,
      stderr,
      compile_output: compileOutput,
      message: "Accepted",
      status: { id: 3, description: "Accepted" },
      outcome: 15,
      time: elapsed,
      memory: memoryKb,
    };
  }

  // 6. Runtime Error (status 7..12)
  if (statusId >= 7 && statusId <= 12) {
    return {
      stdout,
      stderr: stderr || parsed.message || "Runtime Error",
      compile_output: compileOutput,
      message: statusDesc || "Runtime Error",
      status: { id: 11, description: statusDesc || "Runtime Error" },
      outcome: 12,
      time: elapsed,
      memory: memoryKb,
    };
  }

  // 7. Internal / System Error
  if (statusId === 13 || statusId === 14) {
    return {
      stdout,
      stderr: stderr || "Internal execution error occurred.",
      compile_output: compileOutput,
      message: "Internal Error",
      status: { id: 13, description: "Internal Error" },
      outcome: 20,
      time: elapsed,
      memory: memoryKb,
    };
  }

  // Fallback status resolution
  const isSuccess = !stderr && !compileOutput;
  return {
    stdout,
    stderr,
    compile_output: compileOutput,
    message: isSuccess ? "Accepted" : "Runtime Error",
    status: { id: isSuccess ? 3 : 7, description: isSuccess ? "Accepted" : "Runtime Error" },
    outcome: isSuccess ? 15 : 12,
    time: elapsed,
    memory: memoryKb,
  };
}

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
  const lowerErr = `${programErr} ${programOut}`.toLowerCase();
  const signal = String(parsed.signal || "").toUpperCase();

  // CRITICAL: Filter out Wandbox container / OCI / crun failures so they are NEVER
  // reported as student compilation errors
  if (isInfrastructureFailure(compileErr) || isInfrastructureFailure(programErr)) {
    return {
      stdout: "",
      stderr: "Online execution sandbox temporarily overloaded. Please retry in a few moments.",
      compile_output: "",
      message: "Infrastructure Error",
      status: { id: 13, description: "Internal Error" },
      outcome: 20,
      time: elapsed,
      memory: 0,
    };
  }

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
      memory: 256000,
    };
  }

  // Time Limit Exceeded
  if (
    signal === "XCPU" ||
    signal === "KILL" ||
    parsed.status === "137" ||
    lowerErr.includes("time out") ||
    lowerErr.includes("cpu time limit") ||
    lowerErr.includes("timed out")
  ) {
    return {
      stdout: programOut,
      stderr: programErr || "Time Limit Exceeded: Process execution took longer than permitted time limit.",
      compile_output: compileErr,
      message: "Time Limit Exceeded",
      status: { id: 5, description: "Time Limit Exceeded" },
      outcome: 13,
      time: elapsed,
      memory: 256000,
    };
  }

  // Memory Limit Exceeded
  if (
    lowerErr.includes("out of memory") ||
    lowerErr.includes("bad_alloc") ||
    lowerErr.includes("heap out of memory") ||
    lowerErr.includes("outofmemoryerror")
  ) {
    return {
      stdout: programOut,
      stderr: programErr || "Memory Limit Exceeded: Process exhausted allowed memory bounds.",
      compile_output: compileErr,
      message: "Memory Limit Exceeded",
      status: { id: 4, description: "Memory Limit Exceeded" },
      outcome: 17,
      time: elapsed,
      memory: 256000,
    };
  }

  // Output Limit Exceeded
  if (
    lowerErr.includes("file size limit exceeded") ||
    lowerErr.includes("output limit") ||
    lowerErr.includes("excessive output")
  ) {
    return {
      stdout: programOut.slice(0, 5000),
      stderr: "Output Limit Exceeded: Process generated excessive output.",
      compile_output: compileErr,
      message: "Output Limit Exceeded",
      status: { id: 14, description: "Output Limit Exceeded" },
      outcome: 18,
      time: elapsed,
      memory: 256000,
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
    memory: 256000,
  };
}

/**
 * Performs an HTTPS/HTTP POST request to Judge0 CE and returns NormalizedExecutionResult.
 */
function executeOnJudge0(
  languageId: number,
  code: string,
  stdin: string,
  timeoutMs: number,
  compilerOptions?: string
): Promise<NormalizedExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const rawUrl = process.env.JUDGE0_URL || "https://ce.judge0.com";
    const baseUrl = rawUrl.replace(/\/+$/, "");

    let hostname = "ce.judge0.com";
    let pathname = "/submissions?base64_encoded=false&wait=true";
    let isHttps = true;
    let port: number | undefined = undefined;

    try {
      const parsed = new URL(baseUrl);
      hostname = parsed.hostname;
      port = parsed.port ? parseInt(parsed.port, 10) : undefined;
      isHttps = parsed.protocol === "https:";
      const prefix = parsed.pathname.replace(/\/+$/, "");
      pathname = `${prefix}/submissions?base64_encoded=false&wait=true`;
    } catch {
      // Fall back to ce.judge0.com
    }

    const timeLimitSec = Math.max(Math.ceil(timeoutMs / 1000), 2);
    const payloadObj: Record<string, any> = {
      language_id: languageId,
      source_code: code,
      stdin: stdin || "",
      cpu_time_limit: timeLimitSec,
      wall_time_limit: timeLimitSec * 2,
      memory_limit: 256000,
    };
    if (compilerOptions) {
      payloadObj.compiler_options = compilerOptions;
    }
    const payload = JSON.stringify(payloadObj);
    const httpTransportTimeoutMs = Math.max(timeoutMs + 30000, 60000);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(payload)),
      "User-Agent": "SensiLearn-LMS-Judge/2.0",
      "Accept": "application/json",
    };

    if (process.env.JUDGE0_API_KEY) {
      headers["X-Auth-Token"] = process.env.JUDGE0_API_KEY;
      headers["X-RapidAPI-Key"] = process.env.JUDGE0_API_KEY;
    }
    if (process.env.JUDGE0_HOST) {
      headers["X-RapidAPI-Host"] = process.env.JUDGE0_HOST;
    }

    const httpModule = isHttps ? https : http;
    const req = httpModule.request(
      {
        hostname,
        port,
        path: pathname,
        method: "POST",
        agent: isHttps ? compilerHttpsAgent : undefined,
        headers,
        timeout: httpTransportTimeoutMs,
      },
      (res: any) => {
        let data = "";
        res.on("data", (c: Buffer) => {
          data += c;
        });
        res.on("end", () => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          if (res.statusCode === 429) {
            return resolve({
              stdout: "",
              stderr: "The code execution service is temporarily rate limited. Please retry in a few moments.",
              compile_output: "",
              message: "Provider Rate Limit",
              status: { id: 13, description: "Provider Rate Limit" },
              outcome: 21,
              time: elapsed,
              memory: 0,
            });
          }

          if (res.statusCode && res.statusCode >= 500) {
            return resolve({
              stdout: "",
              stderr: `Execution service error (HTTP ${res.statusCode}).`,
              compile_output: "",
              message: "Provider Error",
              status: { id: 13, description: "Provider Error" },
              outcome: 20,
              time: elapsed,
              memory: 0,
            });
          }

          try {
            const parsed = JSON.parse(data);
            resolve(normalizeJudge0Response(parsed, startTime));
          } catch {
            resolve({
              stdout: "",
              stderr: `Invalid response from code execution service: ${data.slice(0, 300)}`,
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
        stderr: `Code execution service unreachable: ${err.message}`,
        compile_output: "",
        message: "Infrastructure Error",
        status: { id: 13, description: "Infrastructure Error" },
        outcome: 20,
        time: "0.00",
        memory: 0,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        stdout: "",
        stderr: "Compiler infrastructure timeout: The remote execution service did not respond within deadline.",
        compile_output: "",
        message: "Infrastructure Error",
        status: { id: 13, description: "Infrastructure Error" },
        outcome: 20,
        time: "0.00",
        memory: 0,
      });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Performs an HTTPS POST request to Wandbox and returns NormalizedExecutionResult.
 */
function executeOnWandbox(
  compiler: string,
  code: string,
  stdin: string,
  timeoutMs: number,
  compilerOptionRaw?: string
): Promise<NormalizedExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const payloadObj: Record<string, any> = {
      compiler,
      code,
      stdin: stdin || "",
    };
    if (compilerOptionRaw) {
      payloadObj.compiler_option_raw = compilerOptionRaw;
    }
    const payload = JSON.stringify(payloadObj);
    const httpTransportTimeoutMs = Math.max(timeoutMs + 30000, 60000);

    const req = https.request(
      {
        hostname: "wandbox.org",
        path: "/api/compile.json",
        method: "POST",
        agent: compilerHttpsAgent,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(payload)),
          "User-Agent": "SensiLearn-LMS-Sandbox/2.0",
          "Accept": "application/json, text/plain, */*",
        },
        timeout: httpTransportTimeoutMs,
      },
      (res) => {
        let data = "";
        res.on("data", (c: Buffer) => {
          data += c;
        });
        res.on("end", () => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          if (res.statusCode === 429) {
            return resolve({
              stdout: "",
              stderr: "The code execution service is temporarily rate limited. Please retry in a few moments.",
              compile_output: "",
              message: "Provider Rate Limit",
              status: { id: 13, description: "Provider Rate Limit" },
              outcome: 21,
              time: elapsed,
              memory: 0,
            });
          }

          if (res.statusCode && res.statusCode >= 500) {
            return resolve({
              stdout: "",
              stderr: `Execution service error (HTTP ${res.statusCode}).`,
              compile_output: "",
              message: "Provider Error",
              status: { id: 13, description: "Provider Error" },
              outcome: 20,
              time: elapsed,
              memory: 0,
            });
          }

          try {
            const parsed = JSON.parse(data);
            resolve(normalizeWandboxResponse(parsed, startTime));
          } catch {
            resolve({
              stdout: "",
              stderr: `Online compiler response parse error (HTTP ${res.statusCode}): ${data.slice(0, 300)}`,
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
        message: "Infrastructure Error",
        status: { id: 13, description: "Infrastructure Error" },
        outcome: 20,
        time: "0.00",
        memory: 0,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        stdout: "",
        stderr: "Compiler infrastructure timeout: The remote execution service did not respond within deadline.",
        compile_output: "",
        message: "Infrastructure Error",
        status: { id: 13, description: "Infrastructure Error" },
        outcome: 20,
        time: "0.00",
        memory: 0,
      });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Pre-processes Java code for sandboxed execution:
 * - Strips package declarations (not supported in sandbox)
 * - Ensures a Main class exists with public static void main
 * - Renames arbitrary class containing main() to Main for Judge0/standard JDK runners
 */
function preprocessJavaForSandbox(code: string): string {
  let src = code.replace(/^\s*package\s+[^;]+;/gm, "");

  // Auto-inject standard utility imports if missing
  if (!src.includes("import java.util")) {
    src = `import java.util.*;\nimport java.io.*;\n${src}`;
  }

  const anyClassMatch = src.match(/\bclass\s+([A-Za-z0-9_]+)/);
  if (!anyClassMatch) {
    src = `import java.util.*;\nimport java.io.*;\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    ${src}\n  }\n}`;
  } else if (!/\bclass\s+Main\b/.test(src)) {
    // If no Main class exists, find class that has main method and rename to Main
    const classWithMain = src.match(/(?:public\s+)?class\s+([A-Za-z0-9_]+)\s*\{[\s\S]*?public\s+static\s+void\s+main/);
    if (classWithMain && classWithMain[1] && classWithMain[1] !== "Main") {
      const origClass = classWithMain[1];
      const re = new RegExp(`\\bclass\\s+${origClass}\\b`, "g");
      src = src.replace(re, "class Main");
    } else {
      // Replace the first class with Main
      src = src.replace(/\bclass\s+([A-Za-z0-9_]+)\b/, "class Main");
    }
    // Make sure Main has public modifier
    src = src.replace(/\bclass\s+Main\b/, "public class Main");
  }

  return src;
}

/**
 * Pre-processes TypeScript: strip type annotations so it runs as plain JS on Node.js.
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
 * Online Compiler Service — Universal resilient multi-provider code execution engine.
 * 
 * Multi-Tier Failover Architecture:
 * - Tier 1: High-Speed Isolated Judge0 CE (supports 70+ languages, C17/23, C++20, Java 17+, Python 3.12+, Node 22+)
 * - Tier 2: Wandbox Sandbox Runner (with OCI container error interception)
 * - Self-Healing: Automatic circuit breaking and provider switching if an upstream container runtime fails
 */
export class OnlineCompilerService {
  /**
   * Executes code online with multi-provider failover.
   */
  public static async execute(
    language: string,
    code: string,
    stdin: string = "",
    timeoutMs: number = 25000,
    version?: string
  ): Promise<NormalizedExecutionResult> {
    const lang = (language || "").toLowerCase().trim();
    const judge0Id = JUDGE0_LANGUAGE_MAP[lang];
    const wandboxCompiler = WANDBOX_COMPILER_MAP[lang];

    if (!judge0Id && !wandboxCompiler) {
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

    let processedCode = adaptCodeForExecution(lang, code);
    if (lang === "java") {
      processedCode = preprocessJavaForSandbox(processedCode);
    }

    const cleanStdin = (stdin || "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n");

    // ── Tier 1: High-Performance Judge0 CE ─────────────────────────────────────
    if (judge0Id) {
      try {
        let compilerOptions: string | undefined;
        if (lang === "c") {
          const v = (version || "").toLowerCase().trim();
          if (v === "c23" || v === "23") compilerOptions = "-std=c23";
          else if (v === "c11" || v === "11") compilerOptions = "-std=c11";
          else compilerOptions = "-std=c17";
        } else if (lang === "cpp" || lang === "c++") {
          const v = (version || "").toLowerCase().trim();
          if (v === "c++23" || v === "23") compilerOptions = "-std=c++23";
          else if (v === "c++17" || v === "17") compilerOptions = "-std=c++17";
          else compilerOptions = "-std=c++20";
        }

        const j0Result = await executeOnJudge0(judge0Id, processedCode, cleanStdin, timeoutMs, compilerOptions);

        // If execution succeeded or returned genuine student errors (compile error, runtime error, TLE), return it!
        // ONLY failover if outcome is 20 (Infrastructure Error) or 21 (Rate Limit)
        if (j0Result.outcome !== 20 && j0Result.outcome !== 21) {
          return j0Result;
        }
      } catch {
        // Fall through to Tier 2
      }
    }

    // ── Tier 2: Wandbox Sandbox Fallback ────────────────────────────────────────
    if (wandboxCompiler) {
      try {
        let compilerOptionRaw: string | undefined;
        if (lang === "cpp" || lang === "c++") {
          const v = (version || "").toLowerCase().trim();
          if (v === "c++23" || v === "23") compilerOptionRaw = "-std=c++23";
          else if (v === "c++17" || v === "17") compilerOptionRaw = "-std=c++17";
          else compilerOptionRaw = "-std=c++20";
        } else if (lang === "c") {
          const v = (version || "").toLowerCase().trim();
          if (v === "c23" || v === "23") compilerOptionRaw = "-std=c23";
          else if (v === "c11" || v === "11") compilerOptionRaw = "-std=c11";
          else compilerOptionRaw = "-std=c17";
        }

        const wbResult = await executeOnWandbox(wandboxCompiler, processedCode, cleanStdin, timeoutMs, compilerOptionRaw);
        if (wbResult.outcome !== 20 && wbResult.outcome !== 21) {
          return wbResult;
        }
      } catch {
        // Fall through to error
      }
    }

    // Both tiers exhausted by infrastructure errors or rate limits
    return {
      stdout: "",
      stderr: "The remote code execution sandbox is temporarily overloaded. Please retry in a few moments.",
      compile_output: "",
      message: "Infrastructure Unavailable",
      status: { id: 13, description: "Internal Error" },
      outcome: 20,
      time: "0.00",
      memory: 0,
    };
  }
}
