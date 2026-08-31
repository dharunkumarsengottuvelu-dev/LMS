# LMS Universal Multi-Language Compiler & Sandbox Architecture

## Overview
EduNexus LMS features a production-grade multi-language online judge and code execution engine. It securely compiles and runs student code across 15+ languages with automated source filename resolution (e.g. Java `public class <Name>` -> `<Name>.java`), STDIN/STDOUT/STDERR isolation, memory/CPU limiting, and process tree termination.

---

## Execution Pipeline

```
Student Code & Selected Language
               │
               ▼
   [Universal Language Registry]
      - Dynamic Filename Strategy
      - Compiler & Runtime Definition
               │
               ▼
      [Isolated Workspace]
      - /tmp/lms_sandbox/job-<uuid>/
      - Correct File Created (Main.java, main.cpp, main.py...)
               │
               ▼
   [Sandbox Execution & Sandbox Fallback]
      - Native Fast-Path Execution (local compilers)
      - Dockerized Container Isolation (production workers)
      - High-Availability Online Sandbox (zero-downtime fallback)
               │
               ▼
     [Output Sanitization]
      - Path scrubbing (removes /tmp/, C:\Users\, server traces)
      - Standardized Statuses (ACCEPTED, WRONG_ANSWER, COMPILE_ERROR, TIME_LIMIT_EXCEEDED)
               │
               ▼
     [Test Case Evaluation & DB Persistence]
```

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `JOBE_URL` | `http://localhost/jobe/index.php/restapi` | Optional Jobe REST API endpoint |
| `JOBE_API_KEY` | `undefined` | Optional Jobe API Key |
| `JOBE_TIMEOUT` | `10000` | HTTP request timeout in milliseconds |
| `JOBE_DEFAULT_TIME_LIMIT` | `10` | Hard process execution timeout in seconds |
| `JOBE_DEFAULT_MEMORY_LIMIT`| `256` | Execution memory limit in megabytes |

---

## Supported Languages & Strategies

| Language | Extension | Source Filename Strategy | Compiler / Runtime |
| :--- | :--- | :--- | :--- |
| **Java** | `.java` | Matches `public class <Name>` -> `<Name>.java` | `javac` & `java -cp .` |
| **C** | `.c` | `main.c` | `gcc -std=c17 main.c -o program` |
| **C++** | `.cpp` | `main.cpp` | `g++ -std=c++17 main.cpp -o program` |
| **Python** | `.py` | `main.py` | `python3 main.py` |
| **JavaScript** | `.js` | `main.js` | `node main.js` |
| **TypeScript** | `.ts` | `main.ts` | `tsx main.ts` |
| **Go** | `.go` | `main.go` | `go run main.go` |
| **Rust** | `.rs` | `main.rs` | `rustc main.rs -o program` |
| **PHP** | `.php` | `main.php` | `php main.php` |
| **C#** | `.cs` | `Program.cs` | `.NET 8 / Mono` |
| **Kotlin** | `.kt` | `Main.kt` | `kotlinc / java` |
| **Ruby** | `.rb` | `main.rb` | `ruby main.rb` |
| **SQL** | `.sql` | `query.sql` | In-memory isolated SQLite |

---

## Running with Docker Compose

To start the isolated compiler runner and optional Jobe container:

```bash
docker compose -f docker/docker-compose.compiler.yml up -d --build
```
