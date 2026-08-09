# Complete Production-Grade Online Compiler & Coding Platform

## Architecture Overview

The EduNexus Enterprise LMS Online Compiler Platform is built as a multi-tier, high-security code execution system.

```text
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                            LMS FRONTEND                                 │
 │                                                                         │
 │  Monaco Code Editor  │  Multi-Language Tabs  │  Input / Output Console │
 │  Web Live Preview    │  SQL IDE Schema Inspector  │ Test Suite Judging  │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                            LMS BACKEND                                  │
 │                                                                         │
 │  Authentication      │  RBAC Security        │  Rate Limiter           │
 │  Language Registry   │  Test Suite Judge     │  Submission Database    │
 └──────────────┬─────────────────────┬─────────────────────┬──────────────┘
                │                     │                     │
                ▼                     ▼                     ▼
 ┌──────────────────────────┐ ┌───────────────────┐ ┌────────────────────┐
 │ SECURE EXECUTION LAYER   │ │ WEB LIVE PREVIEW  │ │ ISOLATED SQL ENGINE│
 │                          │ │                   │ │                    │
 │ Jobe REST API Server     │ │ Sandboxed iframe  │ │ MySQL Dataset      │
 │ Local Fallback Sandbox   │ │ Console Recorder  │ │ Query Evaluator    │
 └──────────────────────────┘ └───────────────────┘ └────────────────────┘
```

---

## Key Features

1. **Multi-Language Support**:
   - **General Programming**: Python 3, Java 17, C++ 17, C, C#, Go, Rust, Kotlin, Swift, PHP 8, Ruby, Scala, Dart, JavaScript, TypeScript.
   - **Web Development**: HTML5, CSS3, JavaScript, React (JSX/TSX) with live sandboxed preview.
   - **Database Practice**: MySQL SQL engine with database schema table inspector and automated dataset table comparison.

2. **Automated Judging & Scoring**:
   - Public and hidden test cases.
   - Execution metrics (execution time in seconds, memory consumption in KB).
   - Sanitized test case responses (hidden test inputs are never exposed to browser client).

3. **Multi-Mode Code Workspace**:
   - Monaco Code Editor mode for general programming.
   - Dual-pane Editor + Live Sandboxed `iframe` Preview for Web & React challenges.
   - Database Schema Inspector + SQL Editor + Output Grid Table for SQL challenges.

---

## API Specifications

### `POST /api/code/run`
Executes code with custom stdin inputs or returns Web/SQL previews.

**Request Payload**:
```json
{
  "language": "python",
  "code": "print('Hello World')",
  "stdin": ""
}
```

**Response**:
```json
{
  "stdout": "Hello World\n",
  "stderr": null,
  "compile_output": null,
  "message": null,
  "status": {
    "id": 3,
    "description": "Accepted"
  },
  "time": "0.02",
  "memory": 12400
}
```

---

### `POST /api/code/submit`
Evaluates a solution against public and hidden test cases, returning score breakdown.

---

### `GET /api/code/languages`
Returns central registry of supported languages, file extensions, and versions.

---

### `POST /api/sql/run`
Executes SQL queries against an isolated test dataset and returns formatted query tables.

---

## Production Deployment & Jobe Server Setup

For full details on deploying the isolated Jobe VPS server, see [JOBE_DEPLOYMENT.md](file:///d:/LMS/enterprise-lms/docs/JOBE_DEPLOYMENT.md).
