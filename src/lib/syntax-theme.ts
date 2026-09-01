// Professional Falcon Light Theme & Language-Aware Tokenizer System
// Designed for Enterprise Coding Platforms (LeetCode Light + VS Code Light)
// Single Source of Truth for Syntax Highlighting and Code Indentation
// Centralized Semantic Architecture for All Programming Languages

import type * as Monaco from "monaco-editor";
import { formatSourceCode } from "@/lib/compiler/code-formatter";

type MonacoInstance = typeof Monaco;

// ── Centralized Semantic Syntax Color Palette (Falcon Light) ────────────────
export const syntaxColors = {
  keyword: "#2563EB",
  controlKeyword: "#7C3AED",
  importKeyword: "#9333EA",
  type: "#0F766E",
  className: "#0F766E",
  interface: "#0F766E",
  enum: "#0F766E",
  function: "#B45309",
  method: "#B45309",
  variable: "#334155",
  parameter: "#475569",
  property: "#0369A1",
  constant: "#0369A1",
  string: "#15803D",
  character: "#15803D",
  number: "#C2410C",
  boolean: "#2563EB",
  null: "#2563EB",
  nullValue: "#2563EB",
  comment: "#64748B",
  documentation: "#64748B",
  documentationComment: "#64748B",
  annotation: "#9333EA",
  decorator: "#9333EA",
  package: "#0F766E",
  module: "#0F766E",
  operator: "#475569",
  bracket: "#475569",
  punctuation: "#475569",
  regex: "#BE123C",
  tag: "#2563EB",
  attribute: "#0369A1",
  selector: "#7C3AED",
  error: "#DC2626",
  defaultText: "#334155",
} as const;

const c = (hex: string) => hex.replace("#", "");

export const FALCON_LIGHT_THEME_NAME = "falcon-light";
export const LMS_LIGHT_THEME_NAME = "falcon-light";
export const LMS_DARK_THEME_NAME = "falcon-light";

// ── Monaco Falcon Light Theme Data ──────────────────────────────────────────
export const falconLightTheme: Monaco.editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    // Base default text
    { token: "", foreground: c(syntaxColors.defaultText) },

    // Keywords & Declarations
    { token: "keyword", foreground: c(syntaxColors.keyword), fontStyle: "bold" },
    { token: "keyword.modifier", foreground: c(syntaxColors.keyword), fontStyle: "bold" },
    { token: "keyword.declaration", foreground: c(syntaxColors.keyword), fontStyle: "bold" },
    { token: "keyword.operator", foreground: c(syntaxColors.operator) },
    { token: "storage", foreground: c(syntaxColors.keyword), fontStyle: "bold" },
    { token: "storage.type", foreground: c(syntaxColors.keyword), fontStyle: "bold" },
    { token: "storage.modifier", foreground: c(syntaxColors.keyword), fontStyle: "bold" },

    // Control Flow & Structure Keywords
    { token: "keyword.control", foreground: c(syntaxColors.controlKeyword), fontStyle: "bold" },
    { token: "keyword.flow", foreground: c(syntaxColors.controlKeyword), fontStyle: "bold" },
    { token: "keyword.control.flow", foreground: c(syntaxColors.controlKeyword), fontStyle: "bold" },
    { token: "keyword.directive", foreground: c(syntaxColors.controlKeyword) },
    { token: "keyword.preprocessor", foreground: c(syntaxColors.controlKeyword) },
    { token: "keyword.import", foreground: c(syntaxColors.importKeyword), fontStyle: "bold" },
    { token: "keyword.from", foreground: c(syntaxColors.importKeyword), fontStyle: "bold" },
    { token: "keyword.export", foreground: c(syntaxColors.importKeyword), fontStyle: "bold" },
    { token: "keyword.using", foreground: c(syntaxColors.importKeyword), fontStyle: "bold" },
    { token: "keyword.use", foreground: c(syntaxColors.importKeyword), fontStyle: "bold" },
    { token: "keyword.require", foreground: c(syntaxColors.importKeyword), fontStyle: "bold" },
    { token: "keyword.include", foreground: c(syntaxColors.importKeyword), fontStyle: "bold" },
    { token: "keyword.package", foreground: c(syntaxColors.package), fontStyle: "bold" },
    { token: "keyword.module", foreground: c(syntaxColors.module), fontStyle: "bold" },
    { token: "meta.preprocessor", foreground: c(syntaxColors.controlKeyword) },

    // Types, Classes, Interfaces, Enums, Namespaces
    { token: "type", foreground: c(syntaxColors.type) },
    { token: "type.identifier", foreground: c(syntaxColors.type) },
    { token: "type.primitive", foreground: c(syntaxColors.type), fontStyle: "bold" },
    { token: "type.sql", foreground: c(syntaxColors.type) },
    { token: "class", foreground: c(syntaxColors.className), fontStyle: "bold" },
    { token: "interface", foreground: c(syntaxColors.interface), fontStyle: "bold" },
    { token: "enum", foreground: c(syntaxColors.enum), fontStyle: "bold" },
    { token: "struct", foreground: c(syntaxColors.type), fontStyle: "bold" },
    { token: "trait", foreground: c(syntaxColors.interface), fontStyle: "bold" },
    { token: "namespace", foreground: c(syntaxColors.package) },
    { token: "entity.name.type", foreground: c(syntaxColors.type) },
    { token: "entity.name.type.class", foreground: c(syntaxColors.className), fontStyle: "bold" },
    { token: "entity.name.class", foreground: c(syntaxColors.className), fontStyle: "bold" },
    { token: "entity.name.interface", foreground: c(syntaxColors.interface), fontStyle: "bold" },
    { token: "entity.name.enum", foreground: c(syntaxColors.enum), fontStyle: "bold" },
    { token: "entity.name.struct", foreground: c(syntaxColors.type), fontStyle: "bold" },
    { token: "entity.name.trait", foreground: c(syntaxColors.interface), fontStyle: "bold" },
    { token: "entity.name.namespace", foreground: c(syntaxColors.package) },
    { token: "entity.name.package", foreground: c(syntaxColors.package) },
    { token: "entity.name.module", foreground: c(syntaxColors.module) },
    { token: "support.type", foreground: c(syntaxColors.type) },
    { token: "support.class", foreground: c(syntaxColors.className) },

    // Variables, Parameters, Properties, Identifiers
    { token: "identifier", foreground: c(syntaxColors.variable) },
    { token: "variable", foreground: c(syntaxColors.variable) },
    { token: "variable.name", foreground: c(syntaxColors.variable) },
    { token: "variable.parameter", foreground: c(syntaxColors.parameter) },
    { token: "variable.other", foreground: c(syntaxColors.variable) },
    { token: "variable.field", foreground: c(syntaxColors.property) },
    { token: "variable.language", foreground: c(syntaxColors.keyword) },
    { token: "property", foreground: c(syntaxColors.property) },
    { token: "support.variable", foreground: c(syntaxColors.variable) },
    { token: "support.variable.property", foreground: c(syntaxColors.property) },
    { token: "support.type.property-name", foreground: c(syntaxColors.property) },

    // Constants & Booleans
    { token: "constant", foreground: c(syntaxColors.constant) },
    { token: "constant.other", foreground: c(syntaxColors.constant) },
    { token: "constant.character", foreground: c(syntaxColors.character) },
    { token: "constant.numeric", foreground: c(syntaxColors.number) },
    { token: "constant.language", foreground: c(syntaxColors.boolean) },
    { token: "constant.language.boolean", foreground: c(syntaxColors.boolean) },
    { token: "constant.language.null", foreground: c(syntaxColors.null) },
    { token: "constant.language.nil", foreground: c(syntaxColors.null) },
    { token: "constant.language.undefined", foreground: c(syntaxColors.null) },

    // Functions & Methods
    { token: "function", foreground: c(syntaxColors.function) },
    { token: "method", foreground: c(syntaxColors.method) },
    { token: "member", foreground: c(syntaxColors.method) },
    { token: "entity.name.function", foreground: c(syntaxColors.function) },
    { token: "entity.name.method", foreground: c(syntaxColors.method) },
    { token: "support.function", foreground: c(syntaxColors.function) },
    { token: "support.function.builtin", foreground: c(syntaxColors.function) },

    // Annotations & Decorators
    { token: "annotation", foreground: c(syntaxColors.annotation) },
    { token: "meta.annotation", foreground: c(syntaxColors.annotation) },
    { token: "tag.decorator", foreground: c(syntaxColors.decorator) },
    { token: "storage.type.annotation", foreground: c(syntaxColors.annotation) },

    // Strings & Characters
    { token: "string", foreground: c(syntaxColors.string) },
    { token: "string.quoted", foreground: c(syntaxColors.string) },
    { token: "string.quoted.double", foreground: c(syntaxColors.string) },
    { token: "string.quoted.single", foreground: c(syntaxColors.string) },
    { token: "string.quoted.triple", foreground: c(syntaxColors.string) },
    { token: "string.template", foreground: c(syntaxColors.string) },
    { token: "string.character", foreground: c(syntaxColors.character) },
    { token: "character", foreground: c(syntaxColors.character) },
    { token: "string.escape", foreground: c(syntaxColors.character) },

    // Numbers
    { token: "number", foreground: c(syntaxColors.number) },
    { token: "number.hex", foreground: c(syntaxColors.number) },
    { token: "number.octal", foreground: c(syntaxColors.number) },
    { token: "number.float", foreground: c(syntaxColors.number) },
    { token: "number.binary", foreground: c(syntaxColors.number) },

    // Comments & Documentation Comments
    { token: "comment", foreground: c(syntaxColors.comment), fontStyle: "italic" },
    { token: "comment.doc", foreground: c(syntaxColors.documentation), fontStyle: "italic" },
    { token: "comment.line", foreground: c(syntaxColors.comment), fontStyle: "italic" },
    { token: "comment.block", foreground: c(syntaxColors.comment), fontStyle: "italic" },
    { token: "comment.block.documentation", foreground: c(syntaxColors.documentation), fontStyle: "italic" },

    // Delimiters, Brackets, Parentheses, Punctuation
    { token: "delimiter", foreground: c(syntaxColors.punctuation) },
    { token: "delimiter.bracket", foreground: c(syntaxColors.bracket) },
    { token: "delimiter.curly", foreground: c(syntaxColors.bracket) },
    { token: "delimiter.square", foreground: c(syntaxColors.bracket) },
    { token: "delimiter.brace", foreground: c(syntaxColors.bracket) },
    { token: "delimiter.parenthesis", foreground: c(syntaxColors.bracket) },
    { token: "delimiter.paren", foreground: c(syntaxColors.bracket) },
    { token: "punctuation", foreground: c(syntaxColors.punctuation) },

    // Operators
    { token: "operator", foreground: c(syntaxColors.operator) },
    { token: "operator.symbol", foreground: c(syntaxColors.operator) },
    { token: "operator.arithmetic", foreground: c(syntaxColors.operator) },
    { token: "operator.logical", foreground: c(syntaxColors.operator) },
    { token: "operator.comparison", foreground: c(syntaxColors.operator) },
    { token: "operator.assignment", foreground: c(syntaxColors.operator) },
    { token: "operator.bitwise", foreground: c(syntaxColors.operator) },

    // Regular Expressions & Errors
    { token: "regexp", foreground: c(syntaxColors.regex) },
    { token: "string.regexp", foreground: c(syntaxColors.regex) },
    { token: "invalid", foreground: c(syntaxColors.error) },
    { token: "error", foreground: c(syntaxColors.error) },

    // HTML / XML / CSS / SCSS tags, attributes, selectors
    { token: "tag", foreground: c(syntaxColors.tag), fontStyle: "bold" },
    { token: "tag.name", foreground: c(syntaxColors.tag), fontStyle: "bold" },
    { token: "entity.name.tag", foreground: c(syntaxColors.tag), fontStyle: "bold" },
    { token: "tag.id", foreground: c(syntaxColors.selector), fontStyle: "bold" },
    { token: "tag.class", foreground: c(syntaxColors.selector), fontStyle: "bold" },
    { token: "selector", foreground: c(syntaxColors.selector), fontStyle: "bold" },
    { token: "entity.other.attribute-name.class", foreground: c(syntaxColors.selector), fontStyle: "bold" },
    { token: "entity.other.attribute-name.id", foreground: c(syntaxColors.selector), fontStyle: "bold" },
    { token: "attribute.name", foreground: c(syntaxColors.attribute) },
    { token: "entity.other.attribute-name", foreground: c(syntaxColors.attribute) },
    { token: "attribute.value", foreground: c(syntaxColors.string) },
    { token: "attribute.value.number", foreground: c(syntaxColors.number) },
    { token: "attribute.value.unit", foreground: c(syntaxColors.number) },
  ],
  colors: {
    "editor.background": "#FFFFFF",
    "editor.foreground": "#334155",
    "editorGutter.background": "#FFFFFF",
    "editorGutter.border": "#00000000",
    "editorLineNumber.foreground": "#94A3B8",
    "editorLineNumber.activeForeground": "#334155",
    "editor.lineHighlightBackground": "#FFFFFF",
    "editor.lineHighlightBorder": "#00000000",
    "editor.selectionBackground": "#DBEAFE",
    "editorCursor.foreground": "#2563EB",
    "editorIndentGuide.background": "#E2E8F0",
    "editorIndentGuide.activeBackground": "#CBD5E1",
    "editorOverviewRuler.border": "#00000000",
    "editorRuler.foreground": "#F1F5F9",
    "editorBracketMatch.background": "#DBEAFE80",
    "editorBracketMatch.border": "#93C5FD",
  },
};

export const lmsLightTheme = falconLightTheme;
export const lmsDarkTheme = falconLightTheme;

// ── Multi-Language High-Accuracy Monarch Tokenizer Definitions ──────────────

export const JAVA_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".java",
  controlKeywords: [
    "if", "else", "for", "while", "do", "switch", "case", "default",
    "break", "continue", "return", "try", "catch", "finally", "throw",
    "throws", "yield"
  ],
  importKeywords: ["import", "package"],
  keywords: [
    "abstract", "assert", "boolean", "byte", "char", "class", "const",
    "double", "enum", "extends", "final", "float", "goto", "implements",
    "instanceof", "int", "interface", "long", "native", "new", "private",
    "protected", "public", "short", "static", "strictfp", "super",
    "synchronized", "this", "transient", "void", "volatile", "record",
    "sealed", "non-sealed", "permits", "var"
  ],
  constants: ["true", "false", "null"],
  types: [
    "String", "Integer", "Long", "Double", "Float", "Boolean", "Character",
    "Byte", "Short", "Object", "Class", "System", "Scanner", "Math",
    "Arrays", "Collections", "List", "ArrayList", "Map", "HashMap",
    "Set", "HashSet", "Queue", "Deque", "LinkedList", "PriorityQueue",
    "StringBuilder", "StringBuffer", "Thread", "Runnable", "Exception",
    "RuntimeException", "Throwable", "Override", "Deprecated", "SuppressWarnings"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/@\s*[a-zA-Z_]\w*/, "annotation"],
      [/\b(import|package)\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@constants": "constant.language",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "^[A-Z_][A-Z0-9_]+$": "constant",
          "@default": "identifier"
        }
      }],
      [/0[xX][0-9a-fA-F_]+[lL]?/, "number.hex"],
      [/0[bB][01_]+[lL]?/, "number.binary"],
      [/\d+\.\d+([eE][\-+]?\d+)?[fFdD]?/, "number.float"],
      [/\d+[lLfFdD]?/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string.character"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<|\>|\<\=|\>\=|\=|\+\=|\-\=|\*\=|\/\=|\&\=|\|\=|\^\=|\&\&|\|\||\!|\~|\&|\||\^|\?|\:)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const CPP_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".cpp",
  controlKeywords: [
    "if", "else", "for", "while", "do", "switch", "case", "default",
    "break", "continue", "return", "try", "catch", "throw", "goto"
  ],
  importKeywords: ["include", "import", "using", "namespace"],
  keywords: [
    "auto", "bool", "char", "class", "const", "constexpr", "delete",
    "double", "enum", "explicit", "export", "extern", "float", "friend",
    "inline", "int", "long", "mutable", "new", "noexcept", "nullptr",
    "operator", "private", "protected", "public", "register", "reinterpret_cast",
    "short", "signed", "sizeof", "static", "static_assert", "static_cast",
    "struct", "template", "this", "thread_local", "typedef", "typeid",
    "typename", "union", "unsigned", "virtual", "void", "volatile",
    "wchar_t", "cin", "cout", "endl", "vector", "string", "map", "set"
  ],
  constants: ["true", "false", "NULL", "nullptr"],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/^\s*#\s*(include|import|define|ifdef|ifndef|endif|pragma)\b/, "keyword.import"],
      [/^\s*#\s*\w+/, "keyword.preprocessor"],
      [/[{}()[\]]/, "@brackets"],
      [/\b(using\s+namespace|namespace)\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@constants": "constant.language",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "^[A-Z_][A-Z0-9_]+$": "constant",
          "@default": "identifier"
        }
      }],
      [/0[xX][0-9a-fA-F_]+/, "number.hex"],
      [/0[bB][01_]+/, "number.binary"],
      [/\d+\.\d+([eE][\-+]?\d+)?[fFlL]?/, "number.float"],
      [/\d+[uUlL]*/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string.character"],
      [/::/, "delimiter"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<|\>|\<\=|\>\=|\=|\+\=|\-\=|\*\=|\/\=|\&\=|\|\=|\^\=|\&\&|\|\||\!|\~|\&|\||\^|\?|\:|\-\>)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const PYTHON_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".py",
  controlKeywords: [
    "if", "elif", "else", "for", "while", "break", "continue", "return",
    "yield", "try", "except", "finally", "raise", "pass", "with", "match", "case"
  ],
  importKeywords: ["import", "from", "as"],
  keywords: [
    "def", "class", "lambda", "global", "nonlocal", "async", "await",
    "assert", "del", "in", "is", "not", "and", "or"
  ],
  constants: ["True", "False", "None"],
  builtins: [
    "print", "len", "range", "str", "int", "float", "list", "dict", "set",
    "tuple", "type", "sum", "min", "max", "sorted", "reversed", "enumerate",
    "zip", "map", "filter", "open", "input", "isinstance", "super", "self"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/@[a-zA-Z_]\w*/, "tag.decorator"],
      [/[{}()[\]]/, "@brackets"],
      [/\b(import|from|as)\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@builtins": "support.function",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@constants": "constant.language",
          "@builtins": "support.type",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "^[A-Z_][A-Z0-9_]+$": "constant",
          "@default": "identifier"
        }
      }],
      [/0[xX][0-9a-fA-F_]+/, "number.hex"],
      [/0[bB][01_]+/, "number.binary"],
      [/0[oO][0-7_]+/, "number.octal"],
      [/\d+\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/\d+/, "number"],
      [/"""/, "string", "@multistring_double"],
      [/'''/, "string", "@multistring_single"],
      [/[fFrRuUbB]?"([^"\\]|\\.)*"/, "string"],
      [/[fFrRuUbB]?'([^'\\]|\\.)*'/, "string"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\/\/|\*\*|\=\=|\!\=|\<|\>|\<\=|\>\=|\=|\+\=|\-\=|\*\=|\/\=|\&\=|\|\=|\^\=|\&\&|\|\||\!|\~|\&|\||\^|\-\>)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/#.*$/, "comment"]
    ],
    multistring_double: [
      [/[^\\"]+/, "string"],
      [/"""/, "string", "@pop"],
      [/"/, "string"]
    ],
    multistring_single: [
      [/[^\\']+/, "string"],
      [/'''/, "string", "@pop"],
      [/'/, "string"]
    ]
  }
};

export const JAVASCRIPT_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".js",
  controlKeywords: [
    "if", "else", "for", "while", "do", "switch", "case", "default",
    "break", "continue", "return", "try", "catch", "finally", "throw",
    "yield", "await"
  ],
  importKeywords: ["import", "export", "from", "require"],
  keywords: [
    "const", "let", "var", "function", "class", "extends", "super",
    "this", "new", "delete", "typeof", "instanceof", "void", "in",
    "of", "async", "static", "get", "set", "interface", "type",
    "enum", "implements", "public", "private", "protected", "readonly"
  ],
  constants: ["true", "false", "null", "undefined", "NaN", "Infinity"],
  types: [
    "Array", "Object", "String", "Number", "Boolean", "Symbol", "BigInt",
    "Promise", "Map", "Set", "Date", "RegExp", "Error", "JSON", "Math",
    "console", "window", "document", "React", "useState", "useEffect", "useMemo"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/\b(import|export|from|require)\b/, "keyword.import"],
      [/([a-zA-Z_$]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_$]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@constants": "constant.language",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "^[A-Z_][A-Z0-9_]+$": "constant",
          "@default": "identifier"
        }
      }],
      [/0[xX][0-9a-fA-F_]+/, "number.hex"],
      [/0[bB][01_]+/, "number.binary"],
      [/\d+\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/\d+n?/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/`[^`]*`/, "string.template"],
      [/=>/, "operator"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\*\*|\=\=\=|\!\=\=|\=\=|\!\=|\<|\>|\<\=|\>\=|\=|\+\=|\-\=|\*\=|\/\=|\&\=|\|\=|\^\=|\&\&|\|\||\?\?|\!|\~|\&|\||\^|\?|\:)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const CSHARP_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".cs",
  controlKeywords: [
    "if", "else", "for", "foreach", "while", "do", "switch", "case",
    "default", "break", "continue", "return", "try", "catch", "finally",
    "throw", "yield"
  ],
  importKeywords: ["using", "namespace"],
  keywords: [
    "abstract", "as", "base", "bool", "byte", "char", "checked", "class",
    "const", "decimal", "delegate", "double", "enum", "event", "explicit",
    "extern", "float", "implicit", "in", "int", "interface", "internal",
    "is", "lock", "long", "new", "object", "operator", "out", "override",
    "params", "private", "protected", "public", "readonly", "ref", "sbyte",
    "sealed", "short", "sizeof", "stackalloc", "static", "string", "struct",
    "this", "typeof", "uint", "ulong", "unchecked", "unsafe", "ushort",
    "virtual", "void", "volatile", "var", "record", "init"
  ],
  constants: ["true", "false", "null"],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/\[[a-zA-Z_]\w*(\(.*\))?\]/, "annotation"],
      [/\b(using|namespace)\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@constants": "constant.language",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "^[A-Z_][A-Z0-9_]+$": "constant",
          "@default": "identifier"
        }
      }],
      [/0[xX][0-9a-fA-F_]+/, "number.hex"],
      [/0[bB][01_]+/, "number.binary"],
      [/\d+\.\d+([eE][\-+]?\d+)?[fFmMdD]?/, "number.float"],
      [/\d+[uUlL]*/, "number"],
      [/\$?"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string.character"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<|\>|\<\=|\>\=|\=|\+\=|\-\=|\*\=|\/\=|\&\=|\|\=|\^\=|\&\&|\|\||\?\?|\!|\~|\&|\||\^|\?|\:|\=\>)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const GO_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".go",
  controlKeywords: [
    "if", "else", "for", "range", "switch", "case", "default",
    "fallthrough", "break", "continue", "return", "goto", "defer",
    "go", "select"
  ],
  importKeywords: ["import", "package"],
  keywords: ["chan", "const", "func", "interface", "map", "struct", "type", "var"],
  constants: ["nil", "true", "false", "iota"],
  types: [
    "bool", "byte", "complex64", "complex128", "error", "float32",
    "float64", "int", "int8", "int16", "int32", "int64", "rune",
    "string", "uint", "uint8", "uint16", "uint32", "uint64", "uintptr",
    "any", "fmt", "sync", "time", "context", "os", "io"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/\b(import|package)\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@constants": "constant.language",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "^[A-Z_][A-Z0-9_]+$": "constant",
          "@default": "identifier"
        }
      }],
      [/0[xX][0-9a-fA-F_]+/, "number.hex"],
      [/0[bB][01_]+/, "number.binary"],
      [/\d+\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/`[^`]*`/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/:=/, "operator"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<|\>|\<\=|\>\=|\=|\+\=|\-\=|\*\=|\/\=|\&\=|\|\=|\^\=|\&\&|\|\||\<-)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const RUST_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".rs",
  controlKeywords: [
    "if", "else", "match", "loop", "while", "for", "in", "return",
    "break", "continue", "yield", "await", "try"
  ],
  importKeywords: ["use", "mod", "extern", "crate"],
  keywords: [
    "fn", "let", "mut", "const", "static", "struct", "enum", "trait",
    "impl", "type", "where", "as", "pub", "unsafe", "async", "dyn",
    "ref", "self", "Self", "move"
  ],
  constants: ["true", "false", "None", "Some", "Ok", "Err"],
  types: [
    "i8", "i16", "i32", "i64", "i128", "isize", "u8", "u16", "u32", "u64",
    "u128", "usize", "f32", "f64", "bool", "char", "str", "String", "Vec",
    "Option", "Result", "Box", "Rc", "Arc", "HashMap", "HashSet"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/#\[.*\]/, "annotation"],
      [/\b(use|mod|extern\s+crate)\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)!/, "function"], // Macros like println!, vec!
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@constants": "constant.language",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "^[A-Z_][A-Z0-9_]+$": "constant",
          "@default": "identifier"
        }
      }],
      [/0[xX][0-9a-fA-F_]+/, "number.hex"],
      [/0[bB][01_]+/, "number.binary"],
      [/0[oO][0-7_]+/, "number.octal"],
      [/\d+\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/\d+[uif0-9_]*/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/b"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string.character"],
      [/::/, "delimiter"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<|\>|\<\=|\>\=|\=|\+\=|\-\=|\*\=|\/\=|\&\=|\|\=|\^\=|\&\&|\|\||\!|\~|\&|\||\^|\-\>|\=\>)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const KOTLIN_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".kt",
  controlKeywords: [
    "if", "else", "when", "for", "while", "do", "return", "break",
    "continue", "throw", "try", "catch", "finally"
  ],
  importKeywords: ["import", "package"],
  keywords: [
    "fun", "val", "var", "class", "interface", "object", "enum", "sealed",
    "data", "companion", "override", "open", "abstract", "private", "protected",
    "public", "internal", "lazy", "suspend", "inline", "tailrec", "operator",
    "infix", "typealias", "this", "super", "null", "true", "false", "is",
    "as", "in", "!in", "!is"
  ],
  types: [
    "Int", "Long", "Short", "Byte", "Double", "Float", "Boolean", "Char",
    "String", "Array", "List", "ArrayList", "Map", "HashMap", "Set", "HashSet",
    "Unit", "Nothing", "Any"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/@[a-zA-Z_]\w*/, "annotation"],
      [/\b(import|package)\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "@default": "identifier"
        }
      }],
      [/\d+\.\d+([eE][\-+]?\d+)?[fF]?/, "number.float"],
      [/\d+[lL]?/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string.character"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\=\=\=|\!\=\=|\<|\>|\<\=|\>\=|\=|\+\=|\-\=|\*\=|\/\=|\&\&|\|\||\?\.|\?\:|\!|\:)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const SWIFT_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".swift",
  controlKeywords: [
    "if", "else", "guard", "switch", "case", "default", "for", "in",
    "while", "repeat", "return", "break", "continue", "fallthrough",
    "throw", "throws", "rethrows", "try", "catch", "defer", "where"
  ],
  importKeywords: ["import"],
  keywords: [
    "func", "var", "let", "class", "struct", "enum", "protocol", "extension",
    "init", "deinit", "subscript", "typealias", "associatedtype", "static",
    "final", "public", "private", "fileprivate", "internal", "open", "override",
    "mutating", "nonmutating", "async", "await", "actor", "self", "Self",
    "nil", "true", "false", "as", "is"
  ],
  types: [
    "Int", "Double", "Float", "Bool", "String", "Character", "Array",
    "Dictionary", "Set", "Optional", "Any", "AnyObject", "Void"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/@[a-zA-Z_]\w*/, "annotation"],
      [/\bimport\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "@default": "identifier"
        }
      }],
      [/\d+\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<\=|\>\=|\<|\>|\=|\+\=|\-\=|\*\=|\/\=|\&\&|\|\||\!|\?|\:\-\>)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const PHP_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".php",
  controlKeywords: [
    "if", "else", "elseif", "while", "do", "for", "foreach", "as",
    "switch", "case", "default", "break", "continue", "return",
    "try", "catch", "finally", "throw", "yield", "match"
  ],
  importKeywords: ["use", "namespace", "require", "require_once", "include", "include_once"],
  keywords: [
    "function", "fn", "class", "interface", "trait", "extends", "implements",
    "public", "protected", "private", "static", "final", "abstract", "const",
    "var", "global", "echo", "print", "exit", "die", "isset", "empty",
    "new", "clone", "instanceof", "readonly", "enum"
  ],
  constants: ["true", "false", "null", "TRUE", "FALSE", "NULL"],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/\b(use|namespace|require|require_once|include|include_once)\b/, "keyword.import"],
      [/\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/, "variable"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@constants": "constant.language",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "@default": "identifier"
        }
      }],
      [/\d+\.\d+/, "number.float"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\=\=\=|\!\=\=|\<\=|\>\=|\<|\>|\=|\+\=|\-\=|\*\=|\/\=|\&\&|\|\||\!|\-\>|\:\:)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"],
      [/#.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const RUBY_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".rb",
  controlKeywords: [
    "if", "elsif", "else", "unless", "while", "until", "for", "in",
    "case", "when", "then", "break", "next", "redo", "retry",
    "return", "yield", "begin", "rescue", "ensure", "raise", "end"
  ],
  importKeywords: ["require", "require_relative", "load", "include", "extend"],
  keywords: [
    "def", "class", "module", "self", "super", "alias", "undef",
    "and", "or", "not", "attr_accessor", "attr_reader", "attr_writer",
    "puts", "print", "p"
  ],
  constants: ["nil", "true", "false"],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/\b(require|require_relative|load|include|extend)\b/, "keyword.import"],
      [/@{1,2}[a-zA-Z_]\w*/, "variable"],
      [/:[a-zA-Z_]\w*/, "constant"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@constants": "constant.language",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "@default": "identifier"
        }
      }],
      [/\d+\.\d+/, "number.float"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/[,;.]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<\=|\>\=|\<|\>|\=|\+\=|\-\=|\*\=|\/\=|\&\&|\|\||\!)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/#.*$/, "comment"]
    ]
  }
};

export const DART_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".dart",
  controlKeywords: [
    "if", "else", "for", "while", "do", "switch", "case", "default",
    "break", "continue", "return", "try", "catch", "finally", "throw",
    "rethrow", "yield", "await", "async", "sync"
  ],
  importKeywords: ["import", "export", "part", "library"],
  keywords: [
    "class", "enum", "mixin", "extension", "typedef", "abstract",
    "static", "final", "const", "var", "late", "required", "dynamic",
    "void", "new", "this", "super", "is", "as", "factory", "get", "set"
  ],
  constants: ["true", "false", "null"],
  types: [
    "int", "double", "num", "bool", "String", "List", "Map", "Set",
    "Future", "Stream", "Object"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/@[a-zA-Z_]\w*/, "annotation"],
      [/\b(import|export|part|library)\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "@default": "identifier"
        }
      }],
      [/\d+\.\d+/, "number.float"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<\=|\>\=|\<|\>|\=|\+\=|\-\=|\*\=|\/\=|\&\&|\|\||\?|\:|\=\>)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const SCALA_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".scala",
  controlKeywords: [
    "if", "else", "while", "do", "for", "yield", "match", "case",
    "return", "throw", "try", "catch", "finally"
  ],
  importKeywords: ["import", "package"],
  keywords: [
    "def", "val", "var", "class", "object", "trait", "extends", "with",
    "type", "implicit", "lazy", "override", "abstract", "final",
    "sealed", "private", "protected", "new", "this", "super"
  ],
  constants: ["true", "false", "null", "Nil"],
  types: [
    "Int", "Long", "Short", "Byte", "Double", "Float", "Boolean", "Char",
    "String", "Unit", "Any", "AnyRef", "AnyVal", "List", "Array", "Map",
    "Set", "Option", "Some", "Vector"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/\b(import|package)\b/, "keyword.import"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@types": "type.identifier",
          "^[A-Z][a-zA-Z0-9_]*$": "type.identifier",
          "@default": "identifier"
        }
      }],
      [/\d+\.\d+/, "number.float"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string.character"],
      [/[,;.:]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<\=|\>\=|\<|\>|\=|\+\=|\-\=|\*\=|\/\=|\&\&|\|\||\=\>|\<\-)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const R_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".r",
  controlKeywords: ["if", "else", "repeat", "while", "for", "in", "next", "break", "return"],
  importKeywords: ["library", "require", "source"],
  keywords: ["function", "TRUE", "FALSE", "NULL", "NA", "NaN", "Inf"],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/\b(library|require|source)\b/, "keyword.import"],
      [/([a-zA-Z._]\w*)(?=\s*\()/, "function"],
      [/[a-zA-Z._]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@default": "identifier"
        }
      }],
      [/\d+\.\d+/, "number.float"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/[,;:]/, "delimiter"],
      [/(\<\-|\<\<\-|\-\>|\-\>\>|\%\>\%|\%in\%|\+|\-|\*|\/|\^|\%\%|\%\/\%|\=\=|\!\=|\<\=|\>\=|\<|\>|\=)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/#.*$/, "comment"]
    ]
  }
};

export const SQL_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".sql",
  ignoreCase: true,
  controlKeywords: [
    "IF", "ELSE", "CASE", "WHEN", "THEN", "END", "RETURN", "BEGIN",
    "COMMIT", "ROLLBACK"
  ],
  keywords: [
    "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE",
    "SET", "DELETE", "CREATE", "TABLE", "DROP", "ALTER", "ADD", "COLUMN",
    "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "OUTER", "ON",
    "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "OFFSET",
    "UNION", "ALL", "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE", "IS",
    "NULL", "AS", "DISTINCT", "PRIMARY", "KEY", "FOREIGN", "REFERENCES",
    "DATABASE", "SCHEMA", "VIEW", "INDEX", "UNIQUE", "CHECK", "DEFAULT",
    "CONSTRAINT", "EXISTS", "SHOW", "DESCRIBE", "USE"
  ],
  functions: [
    "COUNT", "SUM", "AVG", "MIN", "MAX", "CONCAT", "COALESCE", "NOW",
    "DATE", "SUBSTRING", "UPPER", "LOWER", "LENGTH", "ROUND", "ABS",
    "IFNULL", "CAST", "CONVERT"
  ],
  types: [
    "INT", "INTEGER", "VARCHAR", "CHAR", "TEXT", "BOOLEAN", "BOOL",
    "DATE", "DATETIME", "TIMESTAMP", "TIME", "DECIMAL", "NUMERIC",
    "FLOAT", "DOUBLE", "REAL", "BLOB", "JSON", "BIGINT", "SMALLINT",
    "TINYINT"
  ],
  brackets: [
    { open: "(", close: ")", token: "delimiter.parenthesis" },
    { open: "[", close: "]", token: "delimiter.bracket" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[()[\]]/, "@brackets"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@functions": "function",
          "@types": "type.identifier",
          "@default": "function"
        }
      }],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@keywords": "keyword",
          "@functions": "function",
          "@types": "type.identifier",
          "@default": "identifier"
        }
      }],
      [/\d+\.\d+/, "number.float"],
      [/\d+/, "number"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/`[^`]*`/, "identifier"],
      [/[,;.]/, "delimiter"],
      [/(\+|\-|\*|\/|\%|\=\=|\!\=|\<|\>|\<\=|\>\=|\=|\<\>)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/--.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const HTML_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".html",
  ignoreCase: true,
  tokenizer: {
    root: [
      [/<!DOCTYPE[^>]*>/i, "keyword.control"],
      [/<!--/, "comment", "@comment"],
      [/(<)(\w+)/, ["delimiter.bracket", { token: "tag.name", next: "@tag" }]],
      [/(<\/)([\w\-]+)(\s*>)/, ["delimiter.bracket", "tag.name", "delimiter.bracket"]],
      [/[^<]+/, ""]
    ],
    tag: [
      [/\s+/, "white"],
      [/([\w\-]+)(?=\s*=)/, "attribute.name"],
      [/=/, "operator"],
      [/"[^"]*"/, "attribute.value"],
      [/'[^']*'/, "attribute.value"],
      [/(\/)?>/, "delimiter.bracket", "@pop"]
    ],
    comment: [
      [/[^-]+/, "comment"],
      [/-->/, "comment", "@pop"],
      [/-/, "comment"]
    ]
  }
};

export const CSS_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".css",
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/@[a-zA-Z\-]+/, "keyword.control"],
      [/[{}()]/, "@brackets"],
      [/\.[a-zA-Z0-9_\-]+/, "tag.class"],
      [/\#[a-zA-Z0-9_\-]+/, "tag.id"],
      [/:[a-zA-Z\-]+/, "selector"],
      [/([a-zA-Z\-]+)(?=\s*:)/, "property"],
      [/\#[0-9a-fA-F]{3,8}/, "constant"],
      [/-?\d+(\.\d+)?(px|rem|em|%|vh|vw|s|ms|deg|fr)?/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/[,;:]/, "delimiter"],
      [/(\+|\-|\*|\/)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const SCSS_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".scss",
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/\$[a-zA-Z0-9_\-]+/, "variable"],
      [/@[a-zA-Z\-]+/, "keyword.control"],
      [/[{}()]/, "@brackets"],
      [/\.[a-zA-Z0-9_\-]+/, "tag.class"],
      [/\#[a-zA-Z0-9_\-]+/, "tag.id"],
      [/:[a-zA-Z\-]+/, "selector"],
      [/([a-zA-Z\-]+)(?=\s*:)/, "property"],
      [/\#[0-9a-fA-F]{3,8}/, "constant"],
      [/-?\d+(\.\d+)?(px|rem|em|%|vh|vw|s|ms|deg|fr)?/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/[,;:]/, "delimiter"],
      [/(\+|\-|\*|\/)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};

export const JSON_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".json",
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" }
  ],
  tokenizer: {
    root: [
      [/[{}()[\]]/, "@brackets"],
      [/"([^"\\]|\\.)*"(?=\s*:)/, "property"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, "number"],
      [/\b(true|false)\b/, "constant.language.boolean"],
      [/\bnull\b/, "constant.language.null"],
      [/[,:]/, "delimiter"],
      [/[ \t\r\n]+/, "white"]
    ]
  }
};

export const XML_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".xml",
  tokenizer: {
    root: [
      [/<!--/, "comment", "@comment"],
      [/<!\[CDATA\[/, "string", "@cdata"],
      [/<\?[^?]+\?>/, "keyword.control"],
      [/(<)(\w+)/, ["delimiter.bracket", { token: "tag.name", next: "@tag" }]],
      [/(<\/)([\w\-]+)(\s*>)/, ["delimiter.bracket", "tag.name", "delimiter.bracket"]],
      [/[^<]+/, ""]
    ],
    tag: [
      [/\s+/, "white"],
      [/([\w\-:]+)(?=\s*=)/, "attribute.name"],
      [/=/, "operator"],
      [/"[^"]*"/, "attribute.value"],
      [/'[^']*'/, "attribute.value"],
      [/(\/)?>/, "delimiter.bracket", "@pop"]
    ],
    cdata: [
      [/[^\]]+/, "string"],
      [/\]\]>/, "string", "@pop"],
      [/\]/, "string"]
    ],
    comment: [
      [/[^-]+/, "comment"],
      [/-->/, "comment", "@pop"],
      [/-/, "comment"]
    ]
  }
};

export const YAML_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".yaml",
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/^---/, "delimiter"],
      [/^[\w\-]+(?=\s*:)/, "property"],
      [/\b(true|false|yes|no|null)\b/i, "constant.language"],
      [/-?\d+(\.\d+)?/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/[:,-]/, "delimiter"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/#.*$/, "comment"]
    ]
  }
};

export const SHELL_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".shell",
  controlKeywords: [
    "if", "then", "else", "elif", "fi", "for", "in", "do", "done",
    "while", "until", "case", "esac", "function", "return", "exit"
  ],
  commands: [
    "echo", "cd", "ls", "mkdir", "rm", "cp", "mv", "grep", "awk",
    "sed", "cat", "curl", "wget", "git", "npm", "yarn", "docker",
    "node", "python", "java", "gcc", "g++", "make", "chmod", "chown",
    "sudo", "export", "source", "alias"
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.bracket" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" }
  ],
  tokenizer: {
    root: [
      { include: "@whitespace" },
      [/[{}()[\]]/, "@brackets"],
      [/\$[a-zA-Z_0-9{}]*/, "variable"],
      [/([a-zA-Z_]\w*)(?=\s*\()/, "function"],
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@controlKeywords": "keyword.control",
          "@commands": "function",
          "@default": "identifier"
        }
      }],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/[,;.:]/, "delimiter"],
      [/(\&\&|\|\||\||\>|\>\>|\<|\=\=|\!\=|\=)/, "operator"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/#.*$/, "comment"]
    ]
  }
};

// ── Theme & Tokenizer Registration Engine ─────────────────────────────────────
let themesRegistered = false;

export function registerLMSThemes(monaco: MonacoInstance) {
  if (!monaco?.editor) return;

  try {
    monaco.editor.defineTheme(FALCON_LIGHT_THEME_NAME, falconLightTheme);
    monaco.editor.defineTheme("vs", falconLightTheme);
    monaco.editor.defineTheme("lms-light", falconLightTheme);
    monaco.editor.defineTheme("lms-dark", falconLightTheme);
  } catch (err) {
    console.warn("[SyntaxTheme] Theme registration notice:", err);
  }
}

export function registerEnhancedTokenizers(monaco: MonacoInstance) {
  if (!monaco?.languages) return;

  try {
    // 1. Register high-accuracy Monarch tokenizers for all supported languages
    const tokenizers: Record<string, Monaco.languages.IMonarchLanguage> = {
      java: JAVA_MONARCH_DEFINITION,
      cpp: CPP_MONARCH_DEFINITION,
      c: CPP_MONARCH_DEFINITION,
      csharp: CSHARP_MONARCH_DEFINITION,
      cs: CSHARP_MONARCH_DEFINITION,
      python: PYTHON_MONARCH_DEFINITION,
      py: PYTHON_MONARCH_DEFINITION,
      javascript: JAVASCRIPT_MONARCH_DEFINITION,
      js: JAVASCRIPT_MONARCH_DEFINITION,
      jsx: JAVASCRIPT_MONARCH_DEFINITION,
      typescript: JAVASCRIPT_MONARCH_DEFINITION,
      ts: JAVASCRIPT_MONARCH_DEFINITION,
      tsx: JAVASCRIPT_MONARCH_DEFINITION,
      react: JAVASCRIPT_MONARCH_DEFINITION,
      go: GO_MONARCH_DEFINITION,
      golang: GO_MONARCH_DEFINITION,
      rust: RUST_MONARCH_DEFINITION,
      rs: RUST_MONARCH_DEFINITION,
      kotlin: KOTLIN_MONARCH_DEFINITION,
      kt: KOTLIN_MONARCH_DEFINITION,
      swift: SWIFT_MONARCH_DEFINITION,
      php: PHP_MONARCH_DEFINITION,
      ruby: RUBY_MONARCH_DEFINITION,
      rb: RUBY_MONARCH_DEFINITION,
      dart: DART_MONARCH_DEFINITION,
      scala: SCALA_MONARCH_DEFINITION,
      r: R_MONARCH_DEFINITION,
      sql: SQL_MONARCH_DEFINITION,
      mysql: SQL_MONARCH_DEFINITION,
      pgsql: SQL_MONARCH_DEFINITION,
      sqlite: SQL_MONARCH_DEFINITION,
      html: HTML_MONARCH_DEFINITION,
      css: CSS_MONARCH_DEFINITION,
      scss: SCSS_MONARCH_DEFINITION,
      sass: SCSS_MONARCH_DEFINITION,
      less: SCSS_MONARCH_DEFINITION,
      json: JSON_MONARCH_DEFINITION,
      xml: XML_MONARCH_DEFINITION,
      yaml: YAML_MONARCH_DEFINITION,
      yml: YAML_MONARCH_DEFINITION,
      shell: SHELL_MONARCH_DEFINITION,
      bash: SHELL_MONARCH_DEFINITION,
      sh: SHELL_MONARCH_DEFINITION,
      powershell: SHELL_MONARCH_DEFINITION,
      ps1: SHELL_MONARCH_DEFINITION,
      bat: SHELL_MONARCH_DEFINITION,
    };

    for (const [langId, tokenizer] of Object.entries(tokenizers)) {
      try {
        monaco.languages.setMonarchTokensProvider(langId, tokenizer);
      } catch {}
    }

    // 2. Register native language-aware indentation, brackets, and enter rules
    registerLanguageConfigurations(monaco);
  } catch (err) {
    console.warn("[SyntaxTheme] Tokenizer registration notice:", err);
  }
}

export function registerLanguageConfigurations(monaco: MonacoInstance) {
  if (!monaco?.languages) return;

  const cStyleConfig: Monaco.languages.LanguageConfiguration = {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "'", close: "'", notIn: ["string", "comment"] },
      { open: "`", close: "`", notIn: ["string", "comment"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
    ],
    indentationRules: {
      increaseIndentPattern: /^((?!\/\/).)*(\{[^}"']*|\([^)"']*|\[[^\]"']*)$/,
      decreaseIndentPattern: /^(.*\*\/)?\s*(\}[;\s]*|\)[;\s]*|\][;\s]*)$/,
      indentNextLinePattern: /^\s*(if|else|for|while|do)\b[^{;]*$/,
    },
    onEnterRules: [
      // 1. Enter between braces `{}` -> Indent + Outdent closing brace
      {
        beforeText: /\{[^}]*$/,
        afterText: /^\s*\}/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      // 2. Enter between brackets `[]` -> Indent + Outdent closing bracket
      {
        beforeText: /\[[^\]]*$/,
        afterText: /^\s*\]/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      // 3. Enter between parentheses `()` -> Indent + Outdent closing parenthesis
      {
        beforeText: /\([^)]*$/,
        afterText: /^\s*\)/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      // 4. Line ending in `{` or `(` or `[` -> Indent
      {
        beforeText: /\{[^}]*$/,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
      // 5. Block headers without braces (e.g. single-line if/else)
      {
        beforeText: /^\s*(class|interface|record|enum|if|else|for|while|do|switch|case|try|catch|finally|synchronized|func|function|public|private|protected|static|void|int|bool|def)\b.*[^;{]$/,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
      // 6. Javadoc & block comment continuation
      {
        beforeText: /^\s*\/\*\*.*$/,
        afterText: /^\s*\*\/$/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent, appendText: " * " },
      },
      {
        beforeText: /^\s*\/\*\*.*$/,
        action: { indentAction: monaco.languages.IndentAction.None, appendText: " * " },
      },
      {
        beforeText: /^(\t|(\ \ ))*\ \*\ ([^\*]|\*(?!\/))*$/,
        action: { indentAction: monaco.languages.IndentAction.None, appendText: "* " },
      },
      {
        beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
        action: { indentAction: monaco.languages.IndentAction.None, removeText: 1 },
      },
    ],
  };

  const pythonConfig: Monaco.languages.LanguageConfiguration = {
    comments: {
      lineComment: "#",
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "'", close: "'", notIn: ["string", "comment"] },
      { open: '"""', close: '"""' },
      { open: "'''", close: "'''" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    indentationRules: {
      increaseIndentPattern: /^\s*(def|class|if|elif|else|for|while|try|except|finally|with|async\s+(def|for|with)|match|case)\b.*:\s*$/,
      decreaseIndentPattern: /^\s*(elif|else|except|finally)\b.*:\s*$/,
    },
    onEnterRules: [
      {
        beforeText: /^\s*(def|class|if|elif|else|for|while|try|except|finally|with|async\s+(def|for|with)|match|case)\b.*:\s*$/,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
      {
        beforeText: /:\s*$/,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
      {
        beforeText: /\{[^}]*$/,
        afterText: /^\s*\}/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      {
        beforeText: /\[[^\]]*$/,
        afterText: /^\s*\]/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      {
        beforeText: /\([^)]*$/,
        afterText: /^\s*\)/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      {
        beforeText: /^\s*(return|pass|break|continue|raise)\b.*$/,
        action: { indentAction: monaco.languages.IndentAction.None },
      },
    ],
  };

  const htmlConfig: Monaco.languages.LanguageConfiguration = {
    comments: {
      blockComment: ["<!--", "-->"],
    },
    brackets: [
      ["<", ">"],
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "<", close: ">" },
    ],
    onEnterRules: [
      {
        beforeText: /<([_a-zA-Z0-9-]+)([^>]*[^\/])?>$/,
        afterText: /^<\/([_a-zA-Z0-9-]+)>/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      {
        beforeText: /<([_a-zA-Z0-9-]+)([^>]*[^\/])?>$/,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
      {
        beforeText: /\{[^}]*$/,
        afterText: /^\s*\}/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
    ],
  };

  const cssConfig: Monaco.languages.LanguageConfiguration = {
    comments: {
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    onEnterRules: [
      {
        beforeText: /\{[^}]*$/,
        afterText: /^\s*\}/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      {
        beforeText: /\{[^}]*$/,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
    ],
  };

  const sqlConfig: Monaco.languages.LanguageConfiguration = {
    comments: {
      lineComment: "--",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    onEnterRules: [
      {
        beforeText: /\b(BEGIN|CASE|LOOP|IF|THEN|ELSE|ELSEIF|WHEN)\b[^;]*$/i,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
      {
        beforeText: /\b(END)\b/i,
        action: { indentAction: monaco.languages.IndentAction.Outdent },
      },
    ],
  };

  const shellConfig: Monaco.languages.LanguageConfiguration = {
    comments: {
      lineComment: "#",
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
    ],
    onEnterRules: [
      {
        beforeText: /^\s*(if|then|else|elif|for|while|until|do|case)\b.*$/,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
      {
        beforeText: /\{[^}]*$/,
        afterText: /^\s*\}/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
    ],
  };

  const cStyleLangs = ["java", "cpp", "c", "csharp", "go", "php", "javascript", "typescript", "rust", "kotlin", "swift", "scala", "dart"];
  for (const lang of cStyleLangs) {
    try {
      monaco.languages.setLanguageConfiguration(lang, cStyleConfig);
    } catch (e) {
      console.warn(`[SyntaxTheme] Failed to set language config for ${lang}:`, e);
    }
  }

  try { monaco.languages.setLanguageConfiguration("python", pythonConfig); } catch {}
  try { monaco.languages.setLanguageConfiguration("html", htmlConfig); } catch {}
  try { monaco.languages.setLanguageConfiguration("xml", htmlConfig); } catch {}
  try { monaco.languages.setLanguageConfiguration("css", cssConfig); } catch {}
  try { monaco.languages.setLanguageConfiguration("scss", cssConfig); } catch {}
  try { monaco.languages.setLanguageConfiguration("less", cssConfig); } catch {}
  try { monaco.languages.setLanguageConfiguration("sql", sqlConfig); } catch {}
  try { monaco.languages.setLanguageConfiguration("shell", shellConfig); } catch {}
  try { monaco.languages.setLanguageConfiguration("bat", shellConfig); } catch {}

  // Register Native Document Formatting & On-Type Formatting Providers
  const allSupportedLangs = [...cStyleLangs, "python", "html", "css", "scss", "sql", "shell", "ruby", "r", "yaml", "json"];
  for (const lang of allSupportedLangs) {
    try {
      // 1. Full Document Formatter (Shift + Alt + F / formatOnPaste / formatDocument)
      monaco.languages.registerDocumentFormattingEditProvider(lang, {
        provideDocumentFormattingEdits(model, options) {
          const text = model.getValue();
          const formatted = formatSourceCode(text, lang, { tabSize: options.tabSize, insertSpaces: options.insertSpaces });
          return [
            {
              range: model.getFullModelRange(),
              text: formatted,
            },
          ];
        },
      });

      // 2. On-Type Smart Formatter (triggers on typing closing braces or Enter)
      monaco.languages.registerOnTypeFormattingEditProvider(lang, {
        autoFormatTriggerCharacters: ["}", ";", "\n", "{", ":"],
        provideOnTypeFormattingEdits(model, position, ch, options) {
          const lineContent = model.getLineContent(position.lineNumber);
          // Auto-normalize space around `{`: e.g. `class Main{` -> `class Main {`
          if (ch === "{" && lineContent.includes("{")) {
            const normalized = lineContent.replace(/([a-zA-Z0-9_\)\]])\{/, "$1 {");
            if (normalized !== lineContent) {
              return [
                {
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: lineContent.length + 1,
                  },
                  text: normalized,
                },
              ];
            }
          }
          return [];
        },
      });
    } catch {}
  }
}
