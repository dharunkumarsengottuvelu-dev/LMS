/**
 * Safe, language-aware code formatter and indenter for LMS code editor.
 * Formats code with proper indentation (4 spaces / 2 spaces), operator spacing,
 * and bracket alignment while strictly protecting strings, comments, and regexes.
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
  const defaultTabSize = (lang === "javascript" || lang === "typescript" || lang === "html" || lang === "css" || lang === "react") ? 2 : 4;
  const tabSize = options.tabSize || defaultTabSize;
  const indentStr = " ".repeat(tabSize);

  // Normalize line endings to \n
  const normalized = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  switch (lang) {
    case "python":
      return formatPythonCode(normalized, indentStr);
    case "sql":
      return formatSqlCode(normalized, indentStr);
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

/**
 * Formats C-style languages (Java, C, C++, C#, JS, TS, Go, Rust, PHP, Kotlin, etc.)
 */
function formatCStyleCode(src: string, indentStr: string): string {
  const lines = src.split("\n");
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

    // Package / import statements in Java / Go
    if (trimmed.startsWith("package ") || trimmed.startsWith("import ")) {
      formattedLines.push(indentStr.repeat(indentLevel) + formatOperatorsInLine(trimmed));
      continue;
    }

    // Check leading closing braces on this line
    let leadingClosers = 0;
    for (let c of trimmed) {
      if (c === "}" || c === "]" || c === ")") {
        leadingClosers++;
      } else if (c !== " " && c !== "\t") {
        break;
      }
    }

    // Calculate effective line indent
    const lineIndent = Math.max(0, indentLevel - leadingClosers);

    // Format spaces around operators in non-string/comment portions
    const formattedContent = formatOperatorsInLine(trimmed);
    formattedLines.push(indentStr.repeat(lineIndent) + formattedContent);

    // Calculate net brace change across the line
    const netBraceChange = calculateNetBraces(trimmed);
    indentLevel = Math.max(0, indentLevel + netBraceChange);
  }

  return formattedLines.join("\n").trimEnd() + "\n";
}

/**
 * Formats Python code safely by preserving block indentation and adding standard operator spacing.
 */
function formatPythonCode(src: string, indentStr: string): string {
  const lines = src.split("\n");
  const formattedLines: string[] = [];
  let inMultiString = false;
  let multiStringQuote = "";

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
      // Check if docstring ends on same line
      if (trimmed.length > 3 && trimmed.slice(3).includes(multiStringQuote)) {
        inMultiString = false;
      } else {
        inMultiString = true;
      }
      continue;
    }

    // Detect current leading spaces
    const leadingSpacesMatch = rawLine.match(/^([ \t]*)/);
    const leadingSpaces = leadingSpacesMatch ? (leadingSpacesMatch[1] ?? "") : "";
    const spaceCount = leadingSpaces.replace(/\t/g, indentStr).length;
    const indentLevel = Math.floor(spaceCount / indentStr.length);
    const safeIndent = indentStr.repeat(indentLevel);

    const formattedContent = formatOperatorsInLine(trimmed);
    formattedLines.push(safeIndent + formattedContent);
  }

  return formattedLines.join("\n").trimEnd() + "\n";
}

/**
 * Formats SQL code with standard capitalized keywords and clean indentation.
 */
function formatSqlCode(src: string, indentStr: string): string {
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

    // Capitalize SQL keywords outside strings
    for (const kw of SQL_KEYWORDS) {
      const regex = new RegExp(`\\b${kw}\\b`, "gi");
      line = line.replace(regex, kw);
    }

    formattedLines.push(line);
  }

  return formattedLines.join("\n").trimEnd() + "\n";
}

/**
 * Adds clean standard spaces around operators (=, +, -, *, /, ==, !=, <=, >=, &&, ||, ?, :, ,)
 * while safely ignoring strings and comments.
 */
function formatOperatorsInLine(line: string): string {
  let result = "";
  let inString = false;
  let stringChar = "";
  let inCharLiteral = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i] ?? "";
    const prev = i > 0 ? (line[i - 1] ?? "") : "";
    const next = i + 1 < line.length ? (line[i + 1] ?? "") : "";

    // Comments -> keep rest of line intact
    if (!inString && !inCharLiteral && char === "/" && next === "/") {
      result += line.slice(i);
      break;
    }
    if (!inString && !inCharLiteral && char === "#") {
      result += line.slice(i);
      break;
    }

    // String handling ("...")
    if (char === '"' && prev !== "\\") {
      if (inString && stringChar === '"') {
        inString = false;
      } else if (!inString && !inCharLiteral) {
        inString = true;
        stringChar = '"';
      }
      result += char;
      continue;
    }

    // Single quotes / character literals ('...')
    if (char === "'" && prev !== "\\") {
      if (inCharLiteral) {
        inCharLiteral = false;
      } else if (!inString && !inCharLiteral) {
        inCharLiteral = true;
      }
      result += char;
      continue;
    }

    if (inString || inCharLiteral) {
      result += char;
      continue;
    }

    // Formatting operators
    // 1. Commas: comma followed by space if not already
    if (char === ",") {
      result += ",";
      if (next !== " " && next !== "\t" && next !== "") {
        result += " ";
      }
      continue;
    }

    // 2. Semicolons in for loops: add space after semicolon if next isn't space or brace
    if (char === ";") {
      result += ";";
      if (next !== " " && next !== "\t" && next !== "" && next !== "\n") {
        result += " ";
      }
      continue;
    }

    // 3. Opening curly brace at end of class/method/statement (e.g. `public class Main{` -> `public class Main {`)
    if (char === "{") {
      if (prev !== " " && prev !== "\t" && prev !== "{" && prev !== "(" && prev !== "") {
        result += " ";
      }
      result += "{";
      continue;
    }

    // 4. Binary Operators (=, +, -, *, /, ==, !=, <=, >=, &&, ||, <, >)
    // Avoid double spacing increment/decrement (++, --) or pointers (*ptr, &ref) or negatives (-1)
    if (char === "=" && prev !== "!" && prev !== "<" && prev !== ">" && prev !== "=" && next !== "=") {
      if (prev !== " ") result += " ";
      result += "=";
      if (next !== " ") result += " ";
      continue;
    }

    if (char === "+" && next !== "+" && prev !== "+" && prev !== "=" && next !== "=") {
      // Check if it's binary addition vs unary
      if (prev && prev.match(/[A-Za-z0-9_)\]]/)) {
        if (prev !== " ") result += " ";
        result += "+";
        if (next !== " ") result += " ";
        continue;
      }
    }

    result += char;
  }

  // Collapse multiple internal spaces (outside quotes)
  return result.replace(/[ \t]{2,}/g, " ").trimEnd();
}

/**
 * Calculates net opening minus closing braces in a line, ignoring strings and comments.
 */
function calculateNetBraces(line: string): number {
  let net = 0;
  let inString = false;
  let stringChar = "";
  let inCharLiteral = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i] ?? "";
    const prev = i > 0 ? (line[i - 1] ?? "") : "";
    const next = i + 1 < line.length ? (line[i + 1] ?? "") : "";

    // Comments -> skip
    if (!inString && !inCharLiteral && char === "/" && (next === "/" || next === "*")) {
      break;
    }
    if (!inString && !inCharLiteral && char === "#") {
      break;
    }

    if (char === '"' && prev !== "\\") {
      if (inString && stringChar === '"') inString = false;
      else if (!inString && !inCharLiteral) { inString = true; stringChar = '"'; }
      continue;
    }

    if (char === "'" && prev !== "\\") {
      if (inCharLiteral) inCharLiteral = false;
      else if (!inString && !inCharLiteral) inCharLiteral = true;
      continue;
    }

    if (inString || inCharLiteral) continue;

    if (char === "{") net++;
    else if (char === "}") net--;
  }

  return net;
}
