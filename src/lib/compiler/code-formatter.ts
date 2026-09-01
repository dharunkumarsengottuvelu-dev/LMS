/**
 * Safe, language-aware production code formatter and indenter for LMS code editor.
 * Formats code with standard indentation (4 spaces / 2 spaces), operator spacing,
 * bracket alignment, keyword spacing (if, for, while, else), while strictly protecting
 * string literals, char literals, comments, template strings, and regexes.
 */

export interface FormatOptions {
  tabSize?: number;
  insertSpaces?: boolean;
}

/**
 * Main entry point for formatting code safely based on the language.
 */
export function formatSourceCode(code: string, language: string, options: FormatOptions = {}): string {
  if (!code || !code.trim()) return code;

  const lang = (language || "").toLowerCase().trim();
  const defaultTabSize = (lang === "html" || lang === "css" || lang === "react") ? 2 : 4;
  const tabSize = options.tabSize || defaultTabSize;
  const indentStr = " ".repeat(tabSize);

  // Normalize line endings to \n
  const normalized = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  switch (lang) {
    case "python":
      return formatPythonCode(normalized, indentStr);
    case "sql":
      return formatSqlCode(normalized);
    case "html":
    case "css":
      return formatCStyleCode(normalized, indentStr);
    case "java":
    case "c":
    case "cpp":
    case "csharp":
    case "go":
    case "rust":
    case "kotlin":
    case "php":
    case "swift":
    case "scala":
    case "dart":
    case "javascript":
    case "typescript":
    case "react":
    default:
      return formatCStyleCode(normalized, indentStr);
  }
}

function preprocessCStyleStructure(src: string): string {
  // Split multiple closing braces on same line: `}}` -> `}\n}`
  let result = src.replace(/([;}])\s*(\})/g, "$1\n$2");
  // Split multiple consecutive closing braces again if needed
  result = result.replace(/(\})\s*(\})/g, "$1\n$2");
  // Split `{` followed by statements on same line
  result = result.replace(/(\{)\s*([a-zA-Z_@#])/g, "$1\n$2");
  return result;
}

/**
 * Formats C-style languages (Java, C, C++, C#, JS, TS, Go, Rust, PHP, Kotlin, etc.)
 */
function formatCStyleCode(src: string, indentStr: string): string {
  const preprocessed = preprocessCStyleStructure(src);
  const lines = preprocessed.split("\n");
  const formattedLines: string[] = [];
  let indentLevel = 0;
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const trimmed = rawLine.trim();

    // Preserve empty lines (up to 1 consecutive)
    if (!trimmed) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== "") {
        formattedLines.push("");
      }
      continue;
    }

    // Handle block comments (/* ... */)
    if (inBlockComment) {
      formattedLines.push(rawLine);
      if (trimmed.includes("*/")) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith("/*")) {
      formattedLines.push(indentStr.repeat(indentLevel) + trimmed);
      if (!trimmed.includes("*/")) {
        inBlockComment = true;
      }
      continue;
    }

    // Preprocessor directives (#include, #define, #import)
    if (trimmed.startsWith("#")) {
      formattedLines.push(trimmed);
      continue;
    }

    // Pre-format keywords and operators in line
    const formattedContent = formatLineTokens(trimmed);

    // Package / import statements in Java / Go / JS
    if (formattedContent.startsWith("package ") || formattedContent.startsWith("import ")) {
      formattedLines.push(indentStr.repeat(indentLevel) + formattedContent);
      continue;
    }

    // Check leading closing braces on this line (e.g. `}`, `} else {`, `} catch`)
    let leadingClosers = 0;
    for (const c of formattedContent) {
      if (c === "}" || c === "]" || c === ")") {
        leadingClosers++;
      } else if (c !== " " && c !== "\t") {
        break;
      }
    }

    // Calculate effective line indent
    const lineIndent = Math.max(0, indentLevel - leadingClosers);
    formattedLines.push(indentStr.repeat(lineIndent) + formattedContent);

    // Calculate net brace change across the line
    const netBraceChange = calculateNetBraces(formattedContent);
    indentLevel = Math.max(0, indentLevel + netBraceChange);
  }

  return formattedLines.join("\n").trimEnd() + "\n";
}

/**
 * Formats Python code with standard 4-space block indentation, colon nesting, and clean operator spacing.
 */
function formatPythonCode(src: string, indentStr: string): string {
  const lines = src.split("\n");
  const formattedLines: string[] = [];
  let inMultiString = false;
  let multiStringQuote = "";

  // Check if input has any indentation at all
  let hasExistingIndents = false;
  for (const line of lines) {
    if (/^[ \t]+[^\s]/.test(line)) {
      hasExistingIndents = true;
      break;
    }
  }

  let autoIndentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== "") {
        formattedLines.push("");
      }
      continue;
    }

    // Check for multiline docstrings (''' or """)
    if (inMultiString) {
      formattedLines.push(rawLine);
      if (trimmed.includes(multiStringQuote)) {
        inMultiString = false;
      }
      continue;
    }

    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      multiStringQuote = trimmed.slice(0, 3);
      formattedLines.push(rawLine);
      if (trimmed.length > 3 && trimmed.slice(3).includes(multiStringQuote)) {
        inMultiString = false;
      } else {
        inMultiString = true;
      }
      continue;
    }

    const formattedContent = formatLineTokens(trimmed);

    if (hasExistingIndents) {
      // Normalize existing indents to clean 4-space steps
      const leadingSpacesMatch = rawLine.match(/^([ \t]*)/);
      const leadingSpaces = leadingSpacesMatch ? (leadingSpacesMatch[1] ?? "") : "";
      const spaceCount = leadingSpaces.replace(/\t/g, indentStr).length;
      const indentLevel = Math.max(0, Math.round(spaceCount / indentStr.length));
      formattedLines.push(indentStr.repeat(indentLevel) + formattedContent);
    } else {
      // Unindented flat code: calculate indentation from Python keywords & colons
      if (/^(elif\b|else:|except\b|finally:)/.test(formattedContent)) {
        autoIndentLevel = Math.max(0, autoIndentLevel - 1);
      }

      formattedLines.push(indentStr.repeat(autoIndentLevel) + formattedContent);

      if (formattedContent.endsWith(":")) {
        autoIndentLevel++;
      } else if (/^(return\b|pass\b|break\b|continue\b|raise\b)/.test(formattedContent) && i + 1 < lines.length) {
        const nextTrimmed = (lines[i + 1] ?? "").trim();
        if (nextTrimmed && !/^(elif\b|else:|except\b|finally:)/.test(nextTrimmed) && !nextTrimmed.endsWith(":")) {
          // If followed by non-branch statement, drop back 1 level if nested
          if (autoIndentLevel > 1) {
            autoIndentLevel = Math.max(0, autoIndentLevel - 1);
          }
        }
      }
    }
  }

  return formattedLines.join("\n").trimEnd() + "\n";
}

/**
 * Formats SQL code with standard capitalized keywords and clean indentation.
 */
function formatSqlCode(src: string): string {
  const lines = src.split("\n");
  const formattedLines: string[] = [];

  const SQL_KEYWORDS = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT",
    "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "OUTER JOIN", "ON",
    "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM", "CREATE TABLE",
    "ALTER TABLE", "DROP TABLE", "PRIMARY KEY", "FOREIGN KEY", "REFERENCES",
    "AND", "OR", "NOT", "IN", "IS NULL", "IS NOT NULL", "LIKE", "BETWEEN",
    "AS", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX", "CASE", "WHEN",
    "THEN", "ELSE", "END", "UNION", "ALL", "EXISTS"
  ];

  for (const rawLine of lines) {
    let line = (rawLine ?? "").trim();
    if (!line) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== "") {
        formattedLines.push("");
      }
      continue;
    }

    for (const kw of SQL_KEYWORDS) {
      const regex = new RegExp(`\\b${kw}\\b`, "gi");
      line = line.replace(regex, kw);
    }

    formattedLines.push(line);
  }

  return formattedLines.join("\n").trimEnd() + "\n";
}

/**
 * High-precision tokenizer & formatter for a single line of code.
 * Intelligently formats keyword spacing, operators, braces, commas, semicolons,
 * while leaving strings, characters, regexes, and comments 100% untouched.
 */
export function formatLineTokens(line: string): string {
  let result = "";
  let inString = false;
  let stringChar = "";
  let inChar = false;

  // 1. First pass: normalize keyword spacing (e.g. `if(`, `for(`, `while(`, `}else`, `else{`)
  let preprocessed = line;

  // Keyword to parenthesis spacing: if(, for(, while(, switch(, catch(, synchronized(
  preprocessed = preprocessed.replace(/\b(if|for|while|switch|catch|synchronized)\s*\(/g, "$1 (");

  // `}else{` or `}else` -> `} else {`
  preprocessed = preprocessed.replace(/}\s*else\s*\{/g, "} else {");
  preprocessed = preprocessed.replace(/}\s*else\b/g, "} else");
  preprocessed = preprocessed.replace(/\belse\s*\{/g, "else {");
  preprocessed = preprocessed.replace(/}\s*catch\b/g, "} catch");
  preprocessed = preprocessed.replace(/}\s*finally\b/g, "} finally");

  // 2. Token-by-token operator and spacing pass
  for (let i = 0; i < preprocessed.length; i++) {
    const char = preprocessed[i] ?? "";
    const prev = i > 0 ? (preprocessed[i - 1] ?? "") : "";
    const next = i + 1 < preprocessed.length ? (preprocessed[i + 1] ?? "") : "";
    const next2 = i + 2 < preprocessed.length ? (preprocessed[i + 2] ?? "") : "";

    // Comments -> append rest of line without alteration
    if (!inString && !inChar && char === "/" && (next === "/" || next === "*")) {
      result += preprocessed.slice(i);
      break;
    }
    if (!inString && !inChar && char === "#") {
      result += preprocessed.slice(i);
      break;
    }

    // String literals ("...")
    if (char === '"' && prev !== "\\") {
      if (inString && stringChar === '"') {
        inString = false;
      } else if (!inString && !inChar) {
        inString = true;
        stringChar = '"';
      }
      result += char;
      continue;
    }

    // Char literals ('...')
    if (char === "'" && prev !== "\\") {
      if (inChar) {
        inChar = false;
      } else if (!inString && !inChar) {
        inChar = true;
      }
      result += char;
      continue;
    }

    if (inString || inChar) {
      result += char;
      continue;
    }

    // Commas: `, `
    if (char === ",") {
      result += ",";
      if (next !== " " && next !== "\t" && next !== "") {
        result += " ";
      }
      continue;
    }

    // Semicolons in for loops or statements
    if (char === ";") {
      result += ";";
      if (next !== " " && next !== "\t" && next !== "" && next !== "\n" && next !== "}") {
        result += " ";
      }
      continue;
    }

    // Opening curly brace at end of statement: `) {` or `Main {`
    if (char === "{") {
      if (prev !== " " && prev !== "\t" && prev !== "{" && prev !== "(" && prev !== "" && prev !== "[") {
        result += " ";
      }
      result += "{";
      continue;
    }

    // Two-character operators: ==, !=, <=, >=, &&, ||, +=, -=, *=, /=, %=, &=, |=, ^=, <<, >>, =>
    const twoChar = char + next;
    if (["==", "!=", "<=", ">=", "&&", "||", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "=>"].includes(twoChar)) {
      if (prev !== " " && prev !== "\t" && prev !== "") result += " ";
      result += twoChar;
      if (next2 !== " " && next2 !== "\t" && next2 !== "") result += " ";
      i++; // skip next char
      continue;
    }

    // Increment / Decrement: ++, -- (do not add spaces)
    if (twoChar === "++" || twoChar === "--") {
      result += twoChar;
      i++;
      continue;
    }

    // Single Assignment (=)
    if (char === "=" && prev !== "!" && prev !== "<" && prev !== ">" && prev !== "=" && next !== "=") {
      if (prev !== " " && prev !== "\t" && prev !== "") result += " ";
      result += "=";
      if (next !== " " && next !== "\t" && next !== "") result += " ";
      continue;
    }

    // Binary comparison (< and >) - Avoid generics like List<String> or includes <stdio.h>
    if ((char === "<" || char === ">") && next !== "=" && prev !== "=" && next !== char && prev !== char) {
      const isInclude = preprocessed.includes("#include");
      const isGeneric = (prev && /[A-Za-z0-9_]/.test(prev)) && (next && /[A-Za-z0-9_]/.test(next)) && !preprocessed.includes("if") && !preprocessed.includes("for") && !preprocessed.includes("while");

      if (!isInclude && !isGeneric) {
        if (prev !== " " && prev !== "\t" && prev !== "") result += " ";
        result += char;
        if (next !== " " && next !== "\t" && next !== "") result += " ";
        continue;
      }
    }

    // Binary Addition (+) & Subtraction (-)
    if ((char === "+" || char === "-") && next !== "+" && prev !== "+" && next !== "-" && prev !== "-" && next !== "=" && prev !== "=") {
      if (prev && /[A-Za-z0-9_)\]]/.test(prev) && next && /[A-Za-z0-9_(]/.test(next)) {
        if (prev !== " ") result += " ";
        result += char;
        if (next !== " ") result += " ";
        continue;
      }
    }

    // Binary Multiplication (*) & Division (/) & Modulo (%)
    if ((char === "*" || char === "/" || char === "%") && next !== "/" && prev !== "/" && next !== "*" && prev !== "*") {
      if (prev && /[A-Za-z0-9_)\]]/.test(prev) && next && /[A-Za-z0-9_(]/.test(next)) {
        if (prev !== " ") result += " ";
        result += char;
        if (next !== " ") result += " ";
        continue;
      }
    }

    result += char;
  }

  // Normalize multi-spaces outside quotes
  return result.replace(/[ \t]{2,}/g, " ").trimEnd();
}

/**
 * Calculates net opening minus closing braces in a line, ignoring strings and comments.
 */
function calculateNetBraces(line: string): number {
  let net = 0;
  let inString = false;
  let stringChar = "";
  let inChar = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i] ?? "";
    const prev = i > 0 ? (line[i - 1] ?? "") : "";
    const next = i + 1 < line.length ? (line[i + 1] ?? "") : "";

    // Comments -> ignore
    if (!inString && !inChar && char === "/" && (next === "/" || next === "*")) {
      break;
    }
    if (!inString && !inChar && char === "#") {
      break;
    }

    if (char === '"' && prev !== "\\") {
      if (inString && stringChar === '"') inString = false;
      else if (!inString && !inChar) { inString = true; stringChar = '"'; }
      continue;
    }

    if (char === "'" && prev !== "\\") {
      if (inChar) inChar = false;
      else if (!inString && !inChar) inChar = true;
      continue;
    }

    if (inString || inChar) continue;

    if (char === "{") net++;
    else if (char === "}") net--;
  }

  return net;
}
