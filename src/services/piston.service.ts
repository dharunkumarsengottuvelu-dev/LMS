import type { NormalizedExecutionResult } from "./jobe/types";
import { CodingLanguage } from "@/types/coding";

const PISTON_URL = "https://emacs.piston.rs/api/v2";

const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  java: "java",
  cpp: "c++",
  c: "c",
  nodejs: "javascript",
  javascript: "javascript",
  js: "javascript",
  php: "php",
  cs: "csharp",
  csharp: "csharp",
  go: "go",
  rust: "rust",
  kotlin: "kotlin",
  swift: "swift",
  ruby: "ruby",
  scala: "scala",
  typescript: "typescript",
  ts: "typescript",
};

class PistonService {
  public validateLanguage(language: string): { valid: boolean; pistonLangId: string } {
    const normalized = (language || "").toLowerCase().trim();
    const pistonLangId = LANGUAGE_MAP[normalized] || normalized;
    return { valid: true, pistonLangId };
  }

  public validatePayload(code: string, stdin?: string): { valid: boolean; error?: string } {
    if (!code || !code.trim()) {
      return { valid: false, error: "Source code cannot be empty." };
    }
    return { valid: true };
  }

  public async executeCode(
    language: string,
    code: string,
    stdin?: string
  ): Promise<NormalizedExecutionResult> {
    const { pistonLangId } = this.validateLanguage(language);

    const payload = {
      language: pistonLangId,
      version: "*",
      files: [
        {
          content: code,
        },
      ],
      stdin: stdin || "",
    };

    try {
      const response = await fetch(`${PISTON_URL}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return this.createErrorResult(`Piston API Error: ${response.statusText}`, 502);
      }

      const data = await response.json();
      return this.normalizeResult(data);
    } catch (error: any) {
      return this.createErrorResult(`Execution failed: ${error.message}`, 500);
    }
  }

  private normalizeResult(data: any): NormalizedExecutionResult {
    const compile = data.compile || {};
    const run = data.run || {};

    let statusId = 3;
    let statusDesc = "Accepted";

    if (compile.code !== 0 && compile.code !== null && compile.code !== undefined) {
      statusId = 6;
      statusDesc = "Compilation Error";
    } else if (run.code !== 0 && run.code !== null) {
      statusId = 7;
      statusDesc = "Runtime Error";
    }

    return {
      stdout: run.stdout || "",
      stderr: run.stderr || "",
      compile_output: compile.stderr || compile.stdout || "",
      message: statusDesc,
      status: {
        id: statusId,
        description: statusDesc,
      },
      outcome: statusId === 3 ? 15 : statusId === 6 ? 11 : 12,
      time: "0.1",
      memory: 12000,
    };
  }

  private createErrorResult(message: string, statusCode: number): NormalizedExecutionResult {
    return {
      stdout: "",
      stderr: message,
      compile_output: "",
      message,
      status: {
        id: statusCode >= 500 ? 13 : 6,
        description: "System Error",
      },
      outcome: 20,
      time: null,
      memory: null,
    };
  }
}

export const pistonService = new PistonService();
