import type { CodingLanguage } from "@/types/coding";

export type ExecutionCategory = "compiled" | "interpreted" | "sql" | "web";

export type OutputComparisonMode =
  | "EXACT"
  | "TRIMMED"
  | "WHITESPACE_NORMALIZED"
  | "CASE_INSENSITIVE";

export interface SourceFileInfo {
  filename: string;
  entryClass?: string;
  executableName?: string;
  error?: string;
}

export interface LanguageDefinition {
  id: CodingLanguage;
  name: string;
  monacoLanguage: string;
  jobeLanguage: string;
  wandboxCompiler: string;
  defaultExtension: string;
  category: ExecutionCategory;
  compilationRequired: boolean;
  version: string;
  sourceFilenameStrategy: (code: string) => SourceFileInfo;
  starterTemplate: string;
  defaultTimeoutMs: number;
  defaultMemoryMb: number;
}

/**
 * Robust Java Source Filename Resolution Strategy:
 * - Detects top-level `public class <ClassName>` and matches `<ClassName>.java`.
 * - If multiple public top-level classes exist, returns a descriptive Java compilation error.
 * - If non-public class `<ClassName>` exists, uses `<ClassName>.java` (or `Main.java`).
 * - Preserves imports, packages, comments, and structure without destructive modification.
 */
export function resolveJavaSourceFile(code: string): SourceFileInfo {
  const publicClassMatches = Array.from(
    code.matchAll(/\bpublic\s+(?:final\s+|abstract\s+|static\s+)*class\s+([A-Za-z0-9_$]+)/g)
  );

  if (publicClassMatches.length > 1) {
    const classNames = publicClassMatches.map((m) => m[1]).join(", ");
    return {
      filename: "Main.java",
      error: `Compilation Error: Multiple public classes found (${classNames}). In Java, only one public class is permitted per file.`,
    };
  }

  if (publicClassMatches.length === 1) {
    const className = publicClassMatches[0]?.[1] || "Main";
    return {
      filename: `${className}.java`,
      entryClass: className,
      executableName: className,
    };
  }

  const anyClassMatch = code.match(/\bclass\s+([A-Za-z0-9_$]+)/);
  if (anyClassMatch) {
    const className = anyClassMatch[1];
    return {
      filename: `${className}.java`,
      entryClass: className,
      executableName: className,
    };
  }

  return {
    filename: "Main.java",
    entryClass: "Main",
    executableName: "Main",
  };
}

/**
 * Universal Language Registry
 */
export const UNIVERSAL_LANGUAGES: Record<CodingLanguage, LanguageDefinition> = {
  java: {
    id: "java",
    name: "Java (OpenJDK 21+)",
    monacoLanguage: "java",
    jobeLanguage: "java",
    wandboxCompiler: "openjdk-jdk-22+36",
    defaultExtension: ".java",
    category: "compiled",
    compilationRequired: true,
    version: "21 LTS",
    sourceFilenameStrategy: resolveJavaSourceFile,
    starterTemplate: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your code here
        
    }
}`,
    defaultTimeoutMs: 15000,
    defaultMemoryMb: 256,
  },

  python: {
    id: "python",
    name: "Python 3",
    monacoLanguage: "python",
    jobeLanguage: "python3",
    wandboxCompiler: "cpython-3.11.10",
    defaultExtension: ".py",
    category: "interpreted",
    compilationRequired: false,
    version: "3.10+",
    sourceFilenameStrategy: () => ({ filename: "main.py" }),
    starterTemplate: `# Write your code here
import sys

def main():
    pass

if __name__ == "__main__":
    main()`,
    defaultTimeoutMs: 10000,
    defaultMemoryMb: 128,
  },

  cpp: {
    id: "cpp",
    name: "C++ (GCC 17)",
    monacoLanguage: "cpp",
    jobeLanguage: "cpp",
    wandboxCompiler: "gcc-13.2.0",
    defaultExtension: ".cpp",
    category: "compiled",
    compilationRequired: true,
    version: "C++17 / GCC 13+",
    sourceFilenameStrategy: () => ({
      filename: "main.cpp",
      executableName: process.platform === "win32" ? "program.exe" : "program",
    }),
    starterTemplate: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your code here
    
    return 0;
}`,
    defaultTimeoutMs: 10000,
    defaultMemoryMb: 256,
  },

  c: {
    id: "c",
    name: "C (GCC)",
    monacoLanguage: "c",
    jobeLanguage: "c",
    wandboxCompiler: "gcc-13.2.0-c",
    defaultExtension: ".c",
    category: "compiled",
    compilationRequired: true,
    version: "C17 / GCC 13+",
    sourceFilenameStrategy: () => ({
      filename: "main.c",
      executableName: process.platform === "win32" ? "program.exe" : "program",
    }),
    starterTemplate: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Write your code here
    
    return 0;
}`,
    defaultTimeoutMs: 10000,
    defaultMemoryMb: 128,
  },

  javascript: {
    id: "javascript",
    name: "JavaScript (Node.js)",
    monacoLanguage: "javascript",
    jobeLanguage: "nodejs",
    wandboxCompiler: "nodejs-20.17.0",
    defaultExtension: ".js",
    category: "interpreted",
    compilationRequired: false,
    version: "Node.js 20 LTS",
    sourceFilenameStrategy: () => ({ filename: "main.js" }),
    starterTemplate: `const fs = require("fs");

function main() {
    const input = fs.readFileSync(0, "utf-8");
    // Write your code here
}

main();`,
    defaultTimeoutMs: 8000,
    defaultMemoryMb: 128,
  },

  typescript: {
    id: "typescript",
    name: "TypeScript",
    monacoLanguage: "typescript",
    jobeLanguage: "nodejs",
    wandboxCompiler: "nodejs-20.17.0",
    defaultExtension: ".ts",
    category: "interpreted",
    compilationRequired: false,
    version: "TypeScript 5+",
    sourceFilenameStrategy: () => ({ filename: "main.ts" }),
    starterTemplate: `import * as fs from "fs";

function main(): void {
    const input: string = fs.readFileSync(0, "utf-8");
    // Write your code here
}

main();`,
    defaultTimeoutMs: 10000,
    defaultMemoryMb: 128,
  },

  go: {
    id: "go",
    name: "Go",
    monacoLanguage: "go",
    jobeLanguage: "go",
    wandboxCompiler: "go-1.23.2",
    defaultExtension: ".go",
    category: "compiled",
    compilationRequired: true,
    version: "Go 1.23+",
    sourceFilenameStrategy: () => ({ filename: "main.go" }),
    starterTemplate: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    _ = reader
    // Write your code here
}`,
    defaultTimeoutMs: 10000,
    defaultMemoryMb: 256,
  },

  rust: {
    id: "rust",
    name: "Rust",
    monacoLanguage: "rust",
    jobeLanguage: "rust",
    wandboxCompiler: "rust-1.82.0",
    defaultExtension: ".rs",
    category: "compiled",
    compilationRequired: true,
    version: "Rust 1.82+",
    sourceFilenameStrategy: () => ({
      filename: "main.rs",
      executableName: process.platform === "win32" ? "program.exe" : "program",
    }),
    starterTemplate: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    let _ = io::stdin().read_to_string(&mut input);
    // Write your code here
}`,
    defaultTimeoutMs: 12000,
    defaultMemoryMb: 256,
  },

  php: {
    id: "php",
    name: "PHP",
    monacoLanguage: "php",
    jobeLanguage: "php",
    wandboxCompiler: "php-8.3.12",
    defaultExtension: ".php",
    category: "interpreted",
    compilationRequired: false,
    version: "PHP 8.3+",
    sourceFilenameStrategy: () => ({ filename: "main.php" }),
    starterTemplate: `<?php
$stdin = file_get_contents("php://stdin");
// Write your code here
`,
    defaultTimeoutMs: 8000,
    defaultMemoryMb: 128,
  },

  csharp: {
    id: "csharp",
    name: "C# (.NET)",
    monacoLanguage: "csharp",
    jobeLanguage: "cs",
    wandboxCompiler: "mono-6.12.0.199",
    defaultExtension: ".cs",
    category: "compiled",
    compilationRequired: true,
    version: ".NET 8 / C# 12",
    sourceFilenameStrategy: () => ({ filename: "Program.cs" }),
    starterTemplate: `using System;

class Program {
    static void Main(string[] args) {
        // Write your code here
        
    }
}`,
    defaultTimeoutMs: 12000,
    defaultMemoryMb: 256,
  },

  kotlin: {
    id: "kotlin",
    name: "Kotlin",
    monacoLanguage: "kotlin",
    jobeLanguage: "kotlin",
    wandboxCompiler: "openjdk-jdk-22+36",
    defaultExtension: ".kt",
    category: "compiled",
    compilationRequired: true,
    version: "Kotlin 1.9+",
    sourceFilenameStrategy: () => ({ filename: "Main.kt" }),
    starterTemplate: `import java.util.Scanner

fun main() {
    val scanner = Scanner(System.\`in\`)
    // Write your code here
}`,
    defaultTimeoutMs: 12000,
    defaultMemoryMb: 256,
  },

  ruby: {
    id: "ruby",
    name: "Ruby",
    monacoLanguage: "ruby",
    jobeLanguage: "ruby",
    wandboxCompiler: "ruby-3.3.11",
    defaultExtension: ".rb",
    category: "interpreted",
    compilationRequired: false,
    version: "Ruby 3.3+",
    sourceFilenameStrategy: () => ({ filename: "main.rb" }),
    starterTemplate: `# Write your code here
input = ARGF.read
`,
    defaultTimeoutMs: 8000,
    defaultMemoryMb: 128,
  },

  swift: {
    id: "swift",
    name: "Swift",
    monacoLanguage: "swift",
    jobeLanguage: "swift",
    wandboxCompiler: "swift-6.0.1",
    defaultExtension: ".swift",
    category: "compiled",
    compilationRequired: true,
    version: "Swift 6.0",
    sourceFilenameStrategy: () => ({ filename: "main.swift" }),
    starterTemplate: `import Foundation

// Write your code here
`,
    defaultTimeoutMs: 12000,
    defaultMemoryMb: 256,
  },

  scala: {
    id: "scala",
    name: "Scala",
    monacoLanguage: "scala",
    jobeLanguage: "scala",
    wandboxCompiler: "scala-3.5.1",
    defaultExtension: ".scala",
    category: "compiled",
    compilationRequired: true,
    version: "Scala 3.5",
    sourceFilenameStrategy: () => ({ filename: "Main.scala" }),
    starterTemplate: `object Main extends App {
  // Write your code here
}`,
    defaultTimeoutMs: 12000,
    defaultMemoryMb: 256,
  },

  dart: {
    id: "dart",
    name: "Dart",
    monacoLanguage: "dart",
    jobeLanguage: "dart",
    wandboxCompiler: "cpython-3.11.10",
    defaultExtension: ".dart",
    category: "interpreted",
    compilationRequired: false,
    version: "Dart 3.0+",
    sourceFilenameStrategy: () => ({ filename: "main.dart" }),
    starterTemplate: `import 'dart:io';

void main() {
  // Write your code here
}`,
    defaultTimeoutMs: 8000,
    defaultMemoryMb: 128,
  },

  sql: {
    id: "sql",
    name: "SQL (SQLite/Postgres)",
    monacoLanguage: "sql",
    jobeLanguage: "sql",
    wandboxCompiler: "",
    defaultExtension: ".sql",
    category: "sql",
    compilationRequired: false,
    version: "SQLite 3 / Postgres",
    sourceFilenameStrategy: () => ({ filename: "query.sql" }),
    starterTemplate: `-- Write your SQL query here
SELECT * FROM students;`,
    defaultTimeoutMs: 6000,
    defaultMemoryMb: 128,
  },

  html: {
    id: "html",
    name: "HTML5",
    monacoLanguage: "html",
    jobeLanguage: "html",
    wandboxCompiler: "",
    defaultExtension: ".html",
    category: "web",
    compilationRequired: false,
    version: "HTML5",
    sourceFilenameStrategy: () => ({ filename: "index.html" }),
    starterTemplate: `<!DOCTYPE html>
<html>
<head>
  <title>Preview</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>`,
    defaultTimeoutMs: 2000,
    defaultMemoryMb: 64,
  },

  css: {
    id: "css",
    name: "CSS3",
    monacoLanguage: "css",
    jobeLanguage: "css",
    wandboxCompiler: "",
    defaultExtension: ".css",
    category: "web",
    compilationRequired: false,
    version: "CSS3",
    sourceFilenameStrategy: () => ({ filename: "style.css" }),
    starterTemplate: `body {
  font-family: sans-serif;
  margin: 0;
  padding: 20px;
}`,
    defaultTimeoutMs: 2000,
    defaultMemoryMb: 64,
  },

  react: {
    id: "react",
    name: "React",
    monacoLanguage: "typescript",
    jobeLanguage: "react",
    wandboxCompiler: "",
    defaultExtension: ".tsx",
    category: "web",
    compilationRequired: false,
    version: "React 18",
    sourceFilenameStrategy: () => ({ filename: "App.tsx" }),
    starterTemplate: `import React from 'react';

export default function App() {
  return (
    <div>
      <h1>Hello React</h1>
    </div>
  );
}`,
    defaultTimeoutMs: 2000,
    defaultMemoryMb: 64,
  },

  bash: {
    id: "bash",
    name: "Bash",
    monacoLanguage: "shell",
    jobeLanguage: "bash",
    wandboxCompiler: "bash",
    defaultExtension: ".sh",
    category: "interpreted",
    compilationRequired: false,
    version: "GNU Bash 5+",
    sourceFilenameStrategy: () => ({ filename: "main.sh" }),
    starterTemplate: `#!/bin/bash
# Write your script here
`,
    defaultTimeoutMs: 6000,
    defaultMemoryMb: 64,
  },
};

export function getLanguageDefinition(language: string): LanguageDefinition {
  const norm = (language || "").toLowerCase().trim() as CodingLanguage;
  if (norm in UNIVERSAL_LANGUAGES) {
    return UNIVERSAL_LANGUAGES[norm];
  }

  // Alias maps
  if (norm === ("py" as any) || norm === ("python3" as any)) return UNIVERSAL_LANGUAGES.python;
  if (norm === ("js" as any) || norm === ("nodejs" as any)) return UNIVERSAL_LANGUAGES.javascript;
  if (norm === ("ts" as any)) return UNIVERSAL_LANGUAGES.typescript;
  if (norm === ("c++" as any) || norm === ("cpp17" as any)) return UNIVERSAL_LANGUAGES.cpp;
  if (norm === ("cs" as any)) return UNIVERSAL_LANGUAGES.csharp;

  // Fallback default
  return UNIVERSAL_LANGUAGES.python;
}
