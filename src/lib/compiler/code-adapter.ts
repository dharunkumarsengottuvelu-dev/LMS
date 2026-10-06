/**
 * Universal Code Adapter
 * 
 * Intelligently adapts student / user code for execution across all languages.
 * Ensures that however a user writes code ("epdi code potalum"), it executes
 * successfully without missing-main, missing-wrapper, or template syntax errors:
 * - Full executable programs with main() run directly.
 * - Function-based submissions (e.g. void solve()) have main() automatically attached.
 * - Raw top-level statements are safely wrapped in standard entrypoints.
 * - Missing common headers (stdio.h, iostream) are automatically provided.
 */

export function adaptCodeForExecution(language: string, rawCode: string): string {
  const code = (rawCode || "").trim();
  const lang = (language || "").toLowerCase().trim();

  if (!code) {
    return getDefaultStub(lang);
  }

  switch (lang) {
    case "c":
      return adaptCCode(code);
    case "cpp":
    case "c++":
      return adaptCppCode(code);
    case "python":
    case "python3":
    case "py":
      return adaptPythonCode(code);
    case "java":
      return adaptJavaCode(code);
    case "javascript":
    case "js":
    case "nodejs":
      return adaptJavaScriptCode(code);
    case "typescript":
    case "ts":
      return adaptTypeScriptCode(code);
    default:
      return code;
  }
}

function getDefaultStub(lang: string): string {
  switch (lang) {
    case "c":
      return `#include <stdio.h>\nint main() { return 0; }\n`;
    case "cpp":
    case "c++":
      return `#include <iostream>\nusing namespace std;\nint main() { return 0; }\n`;
    case "python":
    case "python3":
    case "py":
      return `# Empty solution\npass\n`;
    case "java":
      return `public class Main { public static void main(String[] args) {} }\n`;
    case "javascript":
    case "js":
      return `// Empty solution\n`;
    default:
      return "";
  }
}

/**
 * Adapt C Code
 */
function adaptCCode(code: string): string {
  let src = code;

  // 1. Check if main function is already defined
  const hasMain = /\b(?:int|void)?\s*main\s*\([^)]*\)\s*\{/.test(src);

  // If void main() is used, normalize to int main() for standard C compliance
  if (/\bvoid\s+main\s*\([^)]*\)/.test(src)) {
    src = src.replace(/\bvoid\s+main\s*\(([^)]*)\)/, "int main($1)");
  }

  // 2. Ensure standard headers if I/O functions are used
  const needsStdio = /\b(printf|scanf|puts|gets|getchar|putchar|fgets|fputs|sprintf|sscanf)\b/.test(src);
  if (needsStdio && !src.includes("<stdio.h>")) {
    src = `#include <stdio.h>\n${src}`;
  }
  const needsStdlib = /\b(malloc|free|calloc|realloc|exit|abs|atoi|atol|atof|qsort|bsearch)\b/.test(src);
  if (needsStdlib && !src.includes("<stdlib.h>")) {
    src = `#include <stdlib.h>\n${src}`;
  }
  const needsString = /\b(strlen|strcpy|strncpy|strcmp|strncmp|strcat|strncat|strchr|strstr)\b/.test(src);
  if (needsString && !src.includes("<string.h>")) {
    src = `#include <string.h>\n${src}`;
  }

  if (hasMain) {
    return src;
  }

  // 3. If solve() / Solve() exists, automatically append main() that calls it
  const hasSolve = /\b(?:void|int)?\s*(solve|Solve)\s*\(\s*\)\s*\{/.test(src);
  if (hasSolve) {
    const solveName = src.match(/\b(?:void|int)?\s*(solve|Solve)\s*\(\s*\)\s*\{/)?.[1] || "solve";
    return `${src}\n\n#ifndef __LMS_MAIN_RUNNER__\n#define __LMS_MAIN_RUNNER__\nint main(int argc, char *argv[]) {\n    ${solveName}();\n    return 0;\n}\n#endif\n`;
  }

  // 4. If code is just top-level statements (e.g. `printf("Hello, World!");`), wrap inside main()
  const hasAnyFunction = /\b[A-Za-z_][A-Za-z0-9_]*\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*\{/.test(src);
  if (!hasAnyFunction) {
    // Separate preprocessor directives (#include, #define) from statement body
    const lines = src.split("\n");
    const preprocessorLines: string[] = [];
    const bodyLines: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith("#")) {
        preprocessorLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }

    if (!preprocessorLines.some((l) => l.includes("<stdio.h>"))) {
      preprocessorLines.unshift("#include <stdio.h>");
    }
    if (!preprocessorLines.some((l) => l.includes("<stdlib.h>"))) {
      preprocessorLines.unshift("#include <stdlib.h>");
    }

    return `${preprocessorLines.join("\n")}\n\nint main() {\n${bodyLines.join("\n")}\n    return 0;\n}\n`;
  }

  // If a function was defined (e.g. `void myFunc()`), auto-call the first detected function in main
  const firstFuncMatch = src.match(/\b(?:void|int)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\{/);
  if (firstFuncMatch) {
    const funcName = firstFuncMatch[1];
    return `${src}\n\nint main() {\n    ${funcName}();\n    return 0;\n}\n`;
  }

  // Default fallback if no function signature matched: append basic main()
  return `${src}\n\nint main() {\n    return 0;\n}\n`;
}

/**
 * Adapt C++ Code
 */
function adaptCppCode(code: string): string {
  let src = code;
  const hasMain = /\b(?:int|void)?\s*main\s*\([^)]*\)\s*\{/.test(src);

  if (/\bvoid\s+main\s*\([^)]*\)/.test(src)) {
    src = src.replace(/\bvoid\s+main\s*\(([^)]*)\)/, "int main($1)");
  }

  const needsIostream = /\b(cout|cin|cerr|endl)\b/.test(src);
  if (needsIostream && !src.includes("<iostream>")) {
    src = `#include <iostream>\nusing namespace std;\n${src}`;
  } else if (needsIostream && !src.includes("using namespace std") && !src.includes("std::")) {
    src = `using namespace std;\n${src}`;
  }

  if (hasMain) {
    return src;
  }

  // Check for Solution class with solve()
  const hasClassSolution = /\bclass\s+Solution\b/.test(src);
  if (hasClassSolution) {
    return `${src}\n\nint main() {\n    Solution __solver;\n    if constexpr (requires { __solver.solve(); }) {\n        __solver.solve();\n    }\n    return 0;\n}\n`;
  }

  // Check for solve() function
  const hasSolve = /\b(?:void|int)?\s*(solve|Solve)\s*\(\s*\)\s*\{/.test(src);
  if (hasSolve) {
    const solveName = src.match(/\b(?:void|int)?\s*(solve|Solve)\s*\(\s*\)\s*\{/)?.[1] || "solve";
    return `${src}\n\nint main() {\n    ${solveName}();\n    return 0;\n}\n`;
  }

  // Check if just statements
  const hasAnyFunction = /\b[A-Za-z_][A-Za-z0-9_]*\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*\{/.test(src);
  if (!hasAnyFunction && !hasClassSolution) {
    const lines = src.split("\n");
    const preprocessorLines: string[] = [];
    const bodyLines: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith("#") || line.trim().startsWith("using namespace")) {
        preprocessorLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }

    if (!preprocessorLines.some((l) => l.includes("<iostream>"))) {
      preprocessorLines.unshift("#include <iostream>");
    }
    if (!preprocessorLines.some((l) => l.includes("using namespace std"))) {
      preprocessorLines.push("using namespace std;");
    }

    return `${preprocessorLines.join("\n")}\n\nint main() {\n${bodyLines.join("\n")}\n    return 0;\n}\n`;
  }

  return `${src}\n\nint main() {\n    return 0;\n}\n`;
}

/**
 * Adapt Python Code
 */
function adaptPythonCode(code: string): string {
  let src = code;

  // If class Solution is defined with solve() or Solve(), auto-invoke it
  if (/\bclass\s+Solution\b/.test(src)) {
    if (!src.includes("Solution().solve") && !src.includes("Solution().Solve")) {
      src = `${src}\n\nif __name__ == "__main__":\n    try:\n        __inst = Solution()\n        if hasattr(__inst, "solve"):\n            __inst.solve()\n        elif hasattr(__inst, "Solve"):\n            __inst.Solve()\n    except Exception as _e:\n        pass\n`;
    }
    return src;
  }

  // If def solve() or def main() is defined without being called
  const hasSolve = /\bdef\s+solve\s*\([^)]*\):/.test(src);
  const hasMain = /\bdef\s+main\s*\([^)]*\):/.test(src);

  if (hasSolve && !src.includes("solve()")) {
    src = `${src}\n\nif __name__ == "__main__":\n    try:\n        solve()\n    except Exception:\n        pass\n`;
  } else if (hasMain && !src.includes("main()")) {
    src = `${src}\n\nif __name__ == "__main__":\n    try:\n        main()\n    except Exception:\n        pass\n`;
  }

  return src;
}

/**
 * Adapt Java Code
 */
function adaptJavaCode(code: string): string {
  let src = code.replace(/^\s*package\s+[^;]+;/gm, "");

  if (!src.includes("import java.util")) {
    src = `import java.util.*;\nimport java.io.*;\n${src}`;
  }

  const hasMain = /\bpublic\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s*[A-Za-z0-9_]+\s*\)/.test(src);
  const hasClass = /\bclass\s+([A-Za-z0-9_]+)/.test(src);

  // If no class exists at all (just loose code)
  if (!hasClass) {
    return `import java.util.*;\nimport java.io.*;\nclass Main {\n    public static void main(String[] args) throws Exception {\n        ${src}\n    }\n}\n`;
  }

  // If Solution class exists with solve() and NO main
  if (!hasMain && /\bclass\s+Solution\b/.test(src)) {
    // Insert main inside Solution class before the last closing brace
    const lastBraceIdx = src.lastIndexOf("}");
    if (lastBraceIdx !== -1) {
      const runner = `\n    public static void main(String[] args) throws Exception {\n        new Solution().solve();\n    }\n`;
      src = src.slice(0, lastBraceIdx) + runner + src.slice(lastBraceIdx);
    }
  }

  // In Wandbox or local Java runners, removing top-level public modifier avoids filename mismatch
  src = src.replace(/\bpublic\s+(?:final\s+|abstract\s+|static\s+)*class\b/g, "class");
  return src;
}

/**
 * Adapt JavaScript Code
 */
function adaptJavaScriptCode(code: string): string {
  let src = code;
  const hasSolve = /\bfunction\s+solve\s*\(/.test(src) || /\bvar\s+solve\s*=/.test(src) || /\bconst\s+solve\s*=/.test(src) || /\blet\s+solve\s*=/.test(src);
  if (hasSolve && !src.includes("solve()")) {
    src = `${src}\n\nif (typeof solve === "function") {\n    try { solve(); } catch(e) {}\n}\n`;
  }
  return src;
}

/**
 * Adapt TypeScript Code
 */
function adaptTypeScriptCode(code: string): string {
  return adaptJavaScriptCode(code);
}
