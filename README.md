# SensilLearn LMS (Enterprise Platform)

An enterprise-grade, high-performance Learning Management System (LMS) built with **Next.js 16 (App Router)**, **TypeScript**, **Supabase (PostgreSQL & Auth)**, and an isolated **Jobe Code Execution Engine**. Designed for modern universities, training institutions, and enterprises to administer structured course tracks, manage cohorts, conduct live classes, and evaluate real-world technical assessments.

---

## Table of Contents

- [Overview](#overview)
- [Key Highlights](#key-highlights)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Core Features](#core-features)
- [User Roles](#user-roles)
- [Platform Modules](#platform-modules)
- [Authentication & Authorization](#authentication--authorization)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Project Structure](#project-structure)
- [Database Architecture](#database-architecture)
- [Environment Configuration](#environment-configuration)
- [Local Development Setup](#local-development-setup)
- [Available Scripts](#available-scripts)
- [Authentication Flow](#authentication-flow)
- [Role-Based Access](#role-based-access)
- [Institution & Batch Management](#institution--batch-management)
- [Course & Curriculum Management](#course--curriculum-management)
- [Practice & Assessment System](#practice--assessment-system)
- [Coding Platform & Execution Engine](#coding-platform--execution-engine)
- [Security & Data Protection](#security--data-protection)
- [API & Backend Architecture](#api--backend-architecture)
- [Error Handling & Performance](#error-handling--performance)
- [Testing & Production Readiness](#testing--production-readiness)
- [Deployment Guidelines](#deployment-guidelines)
- [Troubleshooting](#troubleshooting)
- [Git & Repository Security](#git--repository-security)
- [License & Project Information](#license--project-information)

---

## Overview

**SensilLearn LMS** is a unified digital learning and technical evaluation platform. It centralizes educational curricula, batch administration, academic partner coordination, interactive code labs, and real-time proctored assessments into an integrated, role-based platform.

SensilLearn provides specialized portals tailored to four primary stakeholders: **Administrators**, **Trainers**, **Students**, and **Partner Institutions**, backed by multi-tenant batch isolation and fine-grained role-based access control.

---

## Key Highlights

- **Multi-Tenant Academic Architecture**: Partner institutions can manage college-specific cohorts, review cohort performance analytics, and access individual learner deep-dives.
- **Integrated Code Lab & Online Compiler**: Full-featured Monaco code editor supporting C, C++, Java, Python, JavaScript, and SQL with automated test case evaluation.
- **Isolated Code Execution**: Secure execution of untrusted user code via dedicated containerized Jobe sandboxes.
- **Proctored Assessments & Anti-Cheat**: Tab-switch detection, fullscreen enforcement, and continuous active time tracking.
- **Real-Time Active Time Tracking**: Pulse-based activity heartbeats measuring actual active engaged learning time.
- **Production Performance**: Zero dummy data, optimized PostgreSQL indexes, and responsive Next.js 16 server-rendered components.

---

## Problem Statement

Educational institutions and enterprise training organizations face several friction points:
1. **Fragmented Learning Tools**: Theory, practical exercises, and coding evaluations are often dispersed across disparate platforms.
2. **Opaque Cohort Tracking**: Academic partner colleges often lack visibility into their enrolled students' actual progress and attendance.
3. **Unreliable Evaluation Sandboxes**: Manual code checking is labor-intensive and prone to inconsistencies.
4. **Superficial Attendance Metrics**: Traditional login timestamps do not reflect genuine student engagement or active time.

---

## Solution

SensilLearn consolidates these workflows into a cohesive ecosystem:
- **Centralized Curriculum**: Courses organized into structured modules, lessons, and hands-on exercises.
- **Institutional Visibility**: Dedicated Institution Portal for academic SPOCs to inspect real-time student benchmark metrics.
- **Automated Grading Engine**: Submissions evaluated in seconds against public and hidden test cases.
- **Active Time Telemetry**: Background heartbeats record genuine interactive engagement per course and assignment.

---

## Core Features

### 1. Student Portal
- **Dashboard**: Track enrolled courses, upcoming assessments, active coding assignments, and attendance metrics.
- **Learning Hub**: Video lessons, lesson notes, and module progress trackers.
- **Skill Lab**: Hands-on coding exercises categorized by language, difficulty, and algorithmic topic.
- **Code Lab**: Monaco code editor with custom input, syntax validation, compiler error formatting, and testcase verification.
- **Assessments**: Timed quizzes, multiple-choice questions, and coding tests with instant scorecards.
- **Certificates**: Automatically issued upon curriculum completion.

### 2. Trainer Portal
- **Cohort Management**: Track student progress across assigned batches.
- **Problem & Quiz Creator**: Author coding problems with customizable inputs, outputs, time limits, and memory limits.
- **Assignment Hub**: Create assignments with deadlines, review submissions, and manage test cases.
- **Live Classroom**: Real-time virtual classroom sessions.
- **Performance Analytics**: Inspect batch performance distributions and identify learners needing support.

### 3. Administrator Portal
- **User & Access Management**: Manage Students, Employees/Trainers, and Partner Institutions.
- **Institution Management**: Onboard academic partners, configure college codes, and link existing cohorts.
- **Batch Orchestration**: Create, schedule, and assign batches to trainers and institutions.
- **Course & Module Builder**: Define learning tracks, assign curriculum prerequisites, and publish modules.
- **System Reports**: Platform-wide activity audit logs and operational analytics.

### 4. Institution Portal
- **Partner Dashboard**: View aggregate student progress across learning tracks, skill labs, code labs, and assessments.
- **Cohort Roster**: View all cohorts assigned to the institution.
- **Student Deep-Dive**: Inspect student attendance, assessment percentages, active learning hours, and submission history.
- **Exportable Reports**: Generate academic performance data for institutional evaluation.

---

## User Roles

| Role | Access Scope | Primary Responsibilities |
|---|---|---|
| **`student`** | Student Portal (`/student/*`) | Learn curricula, solve coding problems, take assessments, track performance. |
| **`trainer`** | Trainer Portal (`/trainer/*`) | Author content, review code submissions, manage batches, conduct live classes. |
| **`admin`** | Admin Portal (`/admin/*`) | Global management of users, institutions, batches, courses, and platform analytics. |
| **`institution`** | Institution Portal (`/institution/*`) | Oversight of college-affiliated cohorts, student rosters, and academic metrics. |

---

## System Architecture

```text
                                  ┌────────────────────────┐
                                  │   End Users / Clients   │
                                  └───────────┬────────────┘
                                              │ (HTTPS)
                                              ▼
                                  ┌────────────────────────┐
                                  │ Next.js 16 App Router  │
                                  │ (Turbopack / Edge SSR) │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      │                       │                       │
                      ▼                       ▼                       ▼
            ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
            │  Authentication  │    │  Backend APIs &  │    │  Proxy Gateway   │
            │  (Supabase Auth) │    │  Route Handlers  │    │  & Middleware    │
            └─────────┬────────┘    └─────────┬────────┘    └─────────┬────────┘
                      │                       │                       │
                      └───────────────────────┼───────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
            ┌──────────────────┐                            ┌──────────────────┐
            │ PostgreSQL DB    │                            │ Jobe Execution   │
            │ (Supabase Cloud) │                            │ Sandbox (Docker) │
            │ RLS & Multi-     │                            │ Multi-Language   │
            │ Tenant Schema    │                            │ Compiler Service │
            └──────────────────┘                            └──────────────────┘
```

---

## Technology Stack

- **Framework**: Next.js 16 (React 19, Turbopack, App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS & CSS Variables Design System
- **UI Primitives**: Radix UI, Shadcn UI Components
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: Zustand & React Context
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth, Storage)
- **Code Execution**: Jobe Sandbox (`Dockerfile.jobe`)
- **Spreadsheets**: SheetJS (`xlsx`) with safe workbook sanitization
- **Runtime & Deployment**: Node.js 20+ / Docker / Vercel

---

## Project Structure

```text
enterprise-lms/
├── public/                     # Static assets, branding, and icons
│   ├── favicon.ico             # Multi-resolution favicon (16x16, 32x32, 48x48)
│   ├── site.webmanifest        # PWA & Web App Manifest
│   └── ...
├── src/
│   ├── app/                    # Next.js App Router (Pages, Layouts, APIs)
│   │   ├── (auth)/             # Authentication routes (login, register, reset)
│   │   ├── admin/              # Administrator portal pages
│   │   ├── institution/        # Partner institution portal pages
│   │   ├── student/            # Student learning & coding portal pages
│   │   ├── trainer/            # Trainer portal pages
│   │   ├── api/                # REST API route handlers
│   │   │   ├── admin/          # Admin management API endpoints
│   │   │   ├── code/           # Code compilation and test execution
│   │   │   ├── institution/    # Institution batch and student analytics
│   │   │   ├── student/        # Student activities and assessments
│   │   │   └── ...
│   │   └── layout.tsx          # Root layout with providers and metadata
│   ├── components/             # Reusable UI components
│   │   ├── admin/              # Admin hub panels & creators
│   │   ├── coding/             # Monaco code runner & problem interfaces
│   │   ├── layouts/            # Navigation bars & sidebars
│   │   ├── providers/          # Theme, Auth, and active time providers
│   │   └── ui/                 # Shadcn/Radix UI base primitives
│   ├── config/                 # Navigation schemas & static configurations
│   ├── hooks/                  # Custom React hooks (active time, toast, etc.)
│   ├── lib/                    # Supabase clients, utils, and security utilities
│   ├── services/               # Data services (batches, courses, submissions)
│   └── types/                  # TypeScript domain models and interfaces
├── supabase/
│   └── migrations/             # Production database migrations
├── Dockerfile                  # Next.js standalone container definition
├── Dockerfile.jobe             # Jobe compilation sandbox definition
├── docker-compose.yml          # Local multi-service orchestration
├── .env.example                # Example environment configuration template
├── .gitignore                  # Production Git ignore rules
├── package.json                # Project dependencies and script definitions
└── tsconfig.json               # TypeScript compiler configuration
```

---

## Database Architecture

SensilLearn runs on PostgreSQL via Supabase. Core entities include:

- **`profiles`**: User identities with role metadata (`admin`, `trainer`, `student`, `institution`), institutional affiliation (`college`, `branch`), and student sequence identifier (`student_id`).
- **`batches`**: Cohort definitions containing schedule, course track, trainer assignments, and JSON metadata linking partner institutions.
- **`batch_members`**: Many-to-many junction mapping students to assigned cohorts.
- **`courses`**: Course curricula with title, description, prerequisites, and publish state.
- **`modules` & `lessons`**: Hierarchical units within courses containing structured educational content.
- **`coding_problems`**: Programming challenges with test cases, constraints, and boilerplates.
- **`coding_submissions`**: Student code submissions, execution times, language, and pass/fail test results.
- **`assessments` & `assessment_submissions`**: Proctored quizzes, multi-question tests, and student scorecards.
- **`student_active_time`**: Telemetry heartbeats measuring genuine on-platform engagement.

---

## Environment Configuration

Create a local environment configuration file:

```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:

```env
# =============================================================
# SUPABASE CONFIGURATION (Required)
# =============================================================
# Found in Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-public-anon-key>

# Server-only service role key (NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# =============================================================
# JOBE CODE EXECUTION SERVER
# =============================================================
# Local development default:
JOBE_URL=http://localhost/jobe/index.php/restapi
JOBE_API_KEY=
JOBE_TIMEOUT=10000

# =============================================================
# APPLICATION METADATA
# =============================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=SensilLearn LMS
NEXT_PUBLIC_APP_DESCRIPTION=Enterprise Learning Management System
```

> **SECURITY NOTE**: Never commit `.env.local` or any production secret keys to version control.

---

## Local Development Setup

### Prerequisites
- **Node.js**: `v20.x` or later (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **Git**
- **Docker** *(Optional, for local Jobe compiler container)*

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd enterprise-lms
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Update .env.local with your Supabase credentials
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application at:
   ```text
   http://localhost:3000
   ```

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| **Development** | `npm run dev` | Starts Turbopack development server on port `3000`. |
| **Build** | `npm run build` | Compiles production bundle and statically generates pages. |
| **Start** | `npm run start` | Runs the compiled standalone production server. |
| **Lint** | `npm run lint` | Runs ESLint across all TypeScript and React source files. |
| **Type Check** | `npx tsc --noEmit` | Validates TypeScript types across the entire project. |

---

## Authentication Flow

```text
User Submits Credentials
          │
          ▼
Supabase Auth Service ───► Generates Encrypted JWT & Session Tokens
          │
          ▼
Next.js Server Proxy ────► Sets Secure, HttpOnly Session Cookies
          │
          ▼
Next.js Middleware ──────► Verifies Token Authenticity & Extracts Role
          │
          ▼
Role-Based Routing ──────► Directs User to Dedicated Portal
                           • admin       ──► /admin/dashboard
                           • trainer     ──► /trainer/dashboard
                           • student     ──► /student/dashboard
                           • institution ──► /institution/overview
```

---

## Role-Based Access

The platform enforces strict server-side authorization:
- **Middleware Guards**: Unauthenticated requests to protected paths (`/admin/*`, `/trainer/*`, `/student/*`, `/institution/*`) are redirected to `/login`.
- **Cross-Role Defense**: Students cannot access trainer, admin, or institution interfaces. Role elevation attempts result in redirect or `403 Forbidden`.
- **API Guard Utilities**: All backend route handlers authenticate sessions using `authenticateAdminSession`, `authenticateTrainerSession`, or `authenticateInstitutionSession`.

---

## Institution & Batch Management

### Admin to Institution Workflow
1. Admin logs into **Management** (`/admin/users?tab=institution`).
2. Admin selects an existing **Partner Institution**.
3. Admin clicks **Existing Batches** to open the Batch Management modal.
4. The modal shows existing batches categorized as:
   - **Assigned**: Batches already affiliated with this institution.
   - **Available**: Batches in the system ready for assignment.
5. Clicking **Assign** links the existing batch to the institution in the database without duplicating records.
6. The institution immediately sees the assigned cohort in their dashboard.

---

## Practice & Assessment System

- **Continuous Skill Lab**: Students work through curated problems with difficulty tiers (*Easy*, *Medium*, *Hard*) and track-specific categories.
- **Timed Assessments**: Instructors can set fixed assessment windows with automated countdown timers and submission locks.
- **Anti-Cheat System**: Integrated focus loss listeners alert instructors if a student navigates away from the exam tab.

---

## Coding Platform & Execution Engine

SensilLearn integrates with the **Jobe Execution Sandbox** to run student code safely:
1. Student writes code in the Monaco editor.
2. Code is dispatched to `/api/code/run` or `/api/code/submit`.
3. The server forwards the payload to the isolated Jobe service.
4. Jobe compiles and runs the code against test cases with enforced memory limits and execution timeouts.
5. Standard output, errors, and pass/fail states return to the student's browser with millisecond precision.

---

## Security & Data Protection

- **No Hardcoded Secrets**: All private keys and service credentials live exclusively in environment variables.
- **Service-Role Isolation**: The Supabase service role key is restricted to trusted server-side API routes and is never sent to the client.
- **Input Sanitization**: User-submitted spreadsheet imports and form payloads are validated before database transactions.
- **HTTP Security Headers**: Strict HSTS, X-Content-Type-Options, X-Frame-Options, and Content Security Policies applied globally.

---

## API & Backend Architecture

Key REST API endpoints:

- **Authentication**: `/api/auth/login`, `/api/auth/register`, `/api/auth/callback`
- **Admin**:
  - `/api/admin/batches`: Fetch and create batches.
  - `/api/admin/batches/[id]/assign-institution`: Assign existing batch to an institution.
  - `/api/admin/institutions`: Fetch partner institutions and cohort counts.
  - `/api/admin/users`: Manage platform users.
- **Institution**:
  - `/api/institution/overview`: Aggregate institutional benchmark analytics.
  - `/api/institution/batches`: Retrieve cohorts assigned to the authenticated institution.
  - `/api/institution/students/[id]`: Retrieve comprehensive student performance data.
- **Student**:
  - `/api/student/courses`: Access enrolled learning tracks.
  - `/api/student/active-time/heartbeat`: Telemetry pulse for active learning time.
  - `/api/code/submit`: Evaluate coding problem submissions.

---

## Error Handling & Performance

- **Graceful Error Boundaries**: Dedicated Next.js `error.tsx` handlers display clear recovery actions instead of crashing.
- **Optimized Re-renders**: Dynamic imports and memoized hooks minimize unnecessary client computations.
- **Multi-Tenant Indexing**: Composite PostgreSQL indexes on foreign keys and user identifiers ensure high-concurrency throughput.

---

## Testing & Production Readiness

Before committing or deploying, verify system correctness:

```bash
# 1. Type check the entire codebase
npx tsc --noEmit

# 2. Lint the project
npm run lint

# 3. Create a production build
npm run build
```

---

## Deployment Guidelines

### Vercel Deployment
1. Import the repository into Vercel.
2. Select the **Next.js** framework preset.
3. Configure the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JOBE_URL`).
4. Deploy.

### Docker Deployment
The project includes a standalone production Docker configuration:

```bash
docker compose up -d --build
```

---

## Troubleshooting

- **Supabase Connectivity Error**: Verify that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` match your active Supabase project.
- **Jobe Execution Timeout**: Ensure the Jobe compiler service is running and accessible via the URL specified in `JOBE_URL`.
- **Session Expiry**: Clear browser cookies or call `/api/auth/clear-cookies` if an invalid session token is cached locally.

---

## Git & Repository Security

- **Tracked Configuration**: Only generic templates (`.env.example`, `.env.production.example`) are tracked in Git.
- **Ignored Files**: All `.env*.local` files, build directories (`.next/`, `out/`), and temporary logs are excluded via `.gitignore`.
- **Zero Credentials**: The repository is scanned to ensure zero API keys or private tokens are stored in source files.

---

## License & Project Information

**SensilLearn LMS** — Enterprise Learning & Technical Assessment Platform.  
Built for universities, technical institutions, and enterprise learning programs.
