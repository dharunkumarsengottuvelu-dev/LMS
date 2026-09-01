// Professional Falcon Light Theme & Language-Aware Tokenizer System
// Designed for Enterprise Coding Platforms (LeetCode Light + VS Code Light)
// Single Source of Truth for Syntax Highlighting and Code Indentation

import type * as Monaco from "monaco-editor";

type MonacoInstance = typeof Monaco;

// ── Centralized Semantic Syntax Color Palette (Falcon Light) ────────────────
export const syntaxColors = {
  defaultText: "#334155",
  keyword: "#2563EB",
  controlKeyword: "#7C3AED",
  string: "#15803D",
  character: "#15803D",
  number: "#C2410C",
  boolean: "#2563EB",
  nullValue: "#2563EB",
  comment: "#64748B",
  documentationComment: "#64748B",
  function: "#B45309",
  method: "#B45309",
  className: "#0F766E",
  interface: "#0F766E",
  enum: "#0F766E",
  type: "#0F766E",
  variable: "#334155",
  parameter: "#475569",
  constant: "#0369A1",
  property: "#0369A1",
  objectMember: "#0369A1",
  annotation: "#9333EA",
  decorator: "#9333EA",
  operator: "#475569",
  bracket: "#475569",
  punctuation: "#64748B",
  import: "#7C3AED",
  package: "#0F766E",
  regex: "#BE123C",
  error: "#DC2626",
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
    { token: "keyword.import", foreground: c(syntaxColors.import), fontStyle: "bold" },
    { token: "keyword.package", foreground: c(syntaxColors.package), fontStyle: "bold" },
    { token: "meta.preprocessor", foreground: c(syntaxColors.controlKeyword) },

    // Types, Classes, Interfaces, Enums, Namespaces
    { token: "type", foreground: c(syntaxColors.type) },
    { token: "type.identifier", foreground: c(syntaxColors.type) },
    { token: "type.primitive", foreground: c(syntaxColors.type), fontStyle: "bold" },
    { token: "type.sql", foreground: c(syntaxColors.type) },
    { token: "class", foreground: c(syntaxColors.className), fontStyle: "bold" },
    { token: "interface", foreground: c(syntaxColors.interface), fontStyle: "bold" },
    { token: "enum", foreground: c(syntaxColors.enum), fontStyle: "bold" },
    { token: "struct", foreground: c(syntaxColors.type) },
    { token: "namespace", foreground: c(syntaxColors.package) },
    { token: "entity.name.type", foreground: c(syntaxColors.type) },
    { token: "entity.name.type.class", foreground: c(syntaxColors.className), fontStyle: "bold" },
    { token: "entity.name.class", foreground: c(syntaxColors.className), fontStyle: "bold" },
    { token: "entity.name.interface", foreground: c(syntaxColors.interface), fontStyle: "bold" },
    { token: "entity.name.enum", foreground: c(syntaxColors.enum), fontStyle: "bold" },
    { token: "entity.name.namespace", foreground: c(syntaxColors.package) },
    { token: "entity.name.package", foreground: c(syntaxColors.package) },
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
    { token: "constant.language.null", foreground: c(syntaxColors.nullValue) },

    // Functions & Methods
    { token: "function", foreground: c(syntaxColors.function) },
    { token: "method", foreground: c(syntaxColors.method) },
    { token: "member", foreground: c(syntaxColors.method) },
    { token: "entity.name.function", foreground: c(syntaxColors.function) },
    { token: "entity.name.method", foreground: c(syntaxColors.method) },
    { token: "support.function", foreground: c(syntaxColors.function) },

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
    { token: "comment.doc", foreground: c(syntaxColors.documentationComment), fontStyle: "italic" },
    { token: "comment.line", foreground: c(syntaxColors.comment), fontStyle: "italic" },
    { token: "comment.block", foreground: c(syntaxColors.comment), fontStyle: "italic" },
    { token: "comment.block.documentation", foreground: c(syntaxColors.documentationComment), fontStyle: "italic" },

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

    // HTML / XML / CSS tags & attributes
    { token: "tag", foreground: c(syntaxColors.keyword) },
    { token: "tag.name", foreground: c(syntaxColors.keyword) },
    { token: "tag.id", foreground: c(syntaxColors.property) },
    { token: "tag.class", foreground: c(syntaxColors.property) },
    { token: "attribute.name", foreground: c(syntaxColors.property) },
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

// ── Language-Specific Intelligent Tokenizer Providers ─────────────────────────

export const JAVA_MONARCH_DEFINITION: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".java",

  controlKeywords: [
    "if", "else", "for", "while", "do", "switch", "case", "default",
    "break", "continue", "return", "try", "catch", "finally", "throw",
    "throws", "yield", "import", "package"
  ],

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

      [/\bimport\b/, "keyword.import"],
      [/\bpackage\b/, "keyword.package"],

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
      [/\d+[eE][\-+]?\d+[fFdD]?/, "number.float"],
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

  keywords: [
    "auto", "bool", "char", "class", "const", "constexpr", "delete",
    "double", "enum", "explicit", "export", "extern", "float", "friend",
    "inline", "int", "long", "mutable", "namespace", "new", "noexcept",
    "nullptr", "operator", "private", "protected", "public", "register",
    "reinterpret_cast", "short", "signed", "sizeof", "static", "static_assert",
    "static_cast", "struct", "template", "this", "thread_local", "typedef",
    "typeid", "typename", "union", "unsigned", "using", "virtual", "void",
    "volatile", "wchar_t", "cin", "cout", "endl", "vector", "string", "map", "set"
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

      [/^\s*#\s*\w+/, "keyword.preprocessor"],
      [/[{}()[\]]/, "@brackets"],

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
    "yield", "try", "except", "finally", "raise", "pass", "import", "from",
    "as", "with", "match", "case"
  ],

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
      [/(\+|\-|\*|\/|\/\/|\%|\*\*|\=\=|\!\=|\<|\>|\<\=|\>\=|\=|\+\=|\-\=|\*\=|\/\=|\/\/\=|\%\=|\&\=|\|\=|\^\=|\&\&|\|\||\!|\~|\&|\||\^|\-\>)/, "operator"]
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
    "yield", "await", "import", "export", "from", "as"
  ],

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
    "throw", "yield", "using", "namespace"
  ],

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
    "go", "select", "import", "package"
  ],

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
  if (!monaco?.languages || themesRegistered) return;
  themesRegistered = true;

  try {
    // Register high-accuracy Monarch tokenizers for all supported languages
    monaco.languages.setMonarchTokensProvider("java", JAVA_MONARCH_DEFINITION);
    monaco.languages.setMonarchTokensProvider("cpp", CPP_MONARCH_DEFINITION);
    monaco.languages.setMonarchTokensProvider("c", CPP_MONARCH_DEFINITION);
    monaco.languages.setMonarchTokensProvider("python", PYTHON_MONARCH_DEFINITION);
    monaco.languages.setMonarchTokensProvider("javascript", JAVASCRIPT_MONARCH_DEFINITION);
    monaco.languages.setMonarchTokensProvider("typescript", JAVASCRIPT_MONARCH_DEFINITION);
    monaco.languages.setMonarchTokensProvider("csharp", CSHARP_MONARCH_DEFINITION);
    monaco.languages.setMonarchTokensProvider("go", GO_MONARCH_DEFINITION);
    monaco.languages.setMonarchTokensProvider("sql", SQL_MONARCH_DEFINITION);

    // Register native language-aware indentation, brackets, and enter rules
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
      decreaseIndentPattern: /^((?!\/\/).)*(\}[^}"']*|\)[^)"']*|\][^\]"']*)$/,
      indentNextLinePattern: /^\s*(if|else|for|while|do)\b[^{]*$/,
    },
    onEnterRules: [
      {
        beforeText: /^\s*({|\[|\().*$/,
        afterText: /^\s*(}|\]|\)).*$/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      {
        beforeText: /^\s*({|\[|\()|(\b(class|interface|record|enum|if|else|for|while|do|switch|case|try|catch|finally|synchronized|func|function)\b[^{]*\{?)\s*$/,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
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
        beforeText: /^\s*({|\[|\().*$/,
        afterText: /^\s*(}|\]|\)).*$/,
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

  try {
    monaco.languages.setLanguageConfiguration("python", pythonConfig);
  } catch (e) {
    console.warn("[SyntaxTheme] Failed to set language config for python:", e);
  }
}
