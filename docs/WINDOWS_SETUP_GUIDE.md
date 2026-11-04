# Sensilearn LMS — Fresh Windows Setup & Restoration Guide

This document provides complete, production-grade instructions to set up, configure, run, and test **Sensilearn LMS** on a brand-new Windows 10 or 11 installation following system recovery.

---

## 1. System Requirements & Prerequisites

| Tool | Recommended Version | Purpose | Installation Command / Link |
| :--- | :--- | :--- | :--- |
| **Windows OS** | Windows 10/11 (64-bit) | Operating System | Build 19041+ |
| **Git** | 2.40+ (Tested on 2.56.0) | Version Control | `winget install --id Git.Git -e --source winget` |
| **Node.js** | v20.x or v22.x LTS (Tested on v26) | Application Runtime | `winget install --id OpenJS.NodeJS.LTS -e` |
| **npm** | 10.x or 11.x (Included with Node) | Package Manager | Bundled with Node.js |
| **Python** | 3.11+ (Tested on 3.13) | Local Python Runner | `winget install --id Python.Python.3.13 -e` |
| **Java JDK** | OpenJDK 17 or 21 | Local Java Compiler (`javac`) | `winget install --id EclipseAdoptium.Temurin.21.JDK -e` |
| **MinGW-w64 (GCC)** | GCC 13+ (Optional for local C/C++) | Native C/C++ Compiler | `winget install --id BrechtSanders.MinGW-w64 -e` |
| **Docker Desktop** | Latest (Optional for container Jobe) | Compiler Containerization | `winget install --id Docker.DockerDesktop -e` |

---

## 2. Git Setup & Repository Cloning

Open **PowerShell** as Administrator or standard user:

```powershell
# Verify Git
git --version

# Configure Git Line Endings (CRLF / LF compatibility)
git config --global core.autocrlf true
git config --global core.longpaths true

# Clone repository
git clone https://github.com/your-org/LMS.git "d:\Sensi Learn\LMS-main\LMS"
cd "d:\Sensi Learn\LMS-main\LMS"
```

---

## 3. Dependency Installation

Sensilearn LMS uses `npm` with clean lockfile reproducibility:

```powershell
# Clean reproducible dependency install
npm ci
```

> [!NOTE]
> If you encounter an occasional Windows sandbox/file lock warning (`EPERM`), re-run `npm ci`.

---

## 4. Environment Variables Setup

Create your local `.env.local` file by copying `.env.example`:

```powershell
Copy-Item .env.example .env.local
```

### Complete `.env.local` Reference

```env
# =============================================================
# SUPABASE (Production Active Project)
# =============================================================
NEXT_PUBLIC_SUPABASE_URL=https://vdpokcnbslgzyufybxey.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcG9rY25ic2xnenl1ZnlieGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzU2NTIsImV4cCI6MjEwMTUxMTY1Mn0.TpGuQ61f7i1RYuB4uOfz3BQoVzCQsYqdfZNnYjDSTUE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcG9rY25ic2xnenl1ZnlieGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkzNTY1MiwiZXhwIjoyMTAxNTExNjUyfQ.49urHYZdnUAcKdvNJekLIFtCdUF8Ftz2UzoQCvH0gLw

# =============================================================
# APP BRANDING & URLS
# =============================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=SensiLearn LMS
NEXT_PUBLIC_APP_DESCRIPTION=Enterprise Learning Management System & Coding Platform
NEXT_PUBLIC_COMPANY_NAME=SensiLearn Learning Technologies
NEXT_PUBLIC_SUPPORT_EMAIL=support@sensilearn.com

# =============================================================
# COMPILER SERVICE (Render / Local)
# =============================================================
JOBE_URL=http://localhost/jobe/index.php/restapi
JOBE_API_KEY=
JOBE_TIMEOUT=10000
JOBE_DEFAULT_TIME_LIMIT=5
JOBE_DEFAULT_MEMORY_LIMIT=256
CODE_MAX_SOURCE_SIZE=65536
CODE_MAX_INPUT_SIZE=32768
CODE_MAX_OUTPUT_SIZE=65536
SQL_EXECUTION_URL=/api/sql/run

# =============================================================
# GOOGLE IDENTITY SERVICES (Optional Client-Side GIS)
# =============================================================
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

---

## 5. Local Development Commands

```powershell
# Start Next.js development server with Turbopack
npm run dev

# App will start on: http://localhost:3000
```

---

## 6. Verification & Automated Test Suites

Before pushing any changes or preparing for deployment, run the automated verification suites:

```powershell
# 1. Type check (TypeScript)
npm run typecheck

# 2. Lint check (ESLint)
npm run lint

# 3. Compiler regression suite (TLE prevention, status classification, memory bounds)
npm run test:compiler

# 4. Multi-language test suite (Java, Python, C++, C, JavaScript, SQL)
npm run test:languages

# 5. Batch visibility & RBAC access system test suite
npm run test:batches

# 6. Run all automated tests in sequence
npm run test:all

# 7. Production build test
npm run build
```

---

## 7. Render Compiler Deployment

The standalone compiler server is located in `./compiler/`.

### Deployment Options:

#### Option A: Automatic via Render Blueprint (`render.yaml`)
1. In the Render Dashboard, click **New +** -> **Blueprint**.
2. Connect your Git repository.
3. Render reads `render.yaml` automatically and configures:
   - **Type**: Web Service
   - **Runtime**: Docker (`compiler/Dockerfile`)
   - **Health Check**: `/health`
   - **Port**: 10000 (binds via `process.env.PORT`)

#### Option B: Manual Web Service on Render
- **Build Type**: Docker
- **Docker Context**: `./compiler`
- **Docker Command**: `node server.js`
- **Health Check Path**: `/health`

Once deployed, copy the Render URL (e.g. `https://sensilearn-compiler.onrender.com`) and set in Vercel environment:
```env
JOBE_URL=https://sensilearn-compiler.onrender.com/jobe/index.php/restapi
```

---

## 8. Google OAuth & Domain Configuration

### Issue: Account chooser displays `To continue to vdpokcnbslgzyufybxey.supabase.co`

### Explanation:
In Supabase's server-side OAuth redirect flow (`supabase.auth.signInWithOAuth`), the browser redirects to Google with:
`redirect_uri=https://vdpokcnbslgzyufybxey.supabase.co/auth/v1/callback`
Google explicitly displays the hostname of the registered callback URL. Changing the "Site URL" in Supabase only affects post-login redirects, **not** the domain shown in Google's account selection modal.

### Solutions:
1. **Option 1 (Supabase Custom Domain - Official)**:
   - In Supabase Dashboard -> **Project Settings** -> **Custom Domains**.
   - Add a custom domain such as `auth.sensilearn.com`.
   - Update Google Cloud Console Authorized Redirect URIs to:
     `https://auth.sensilearn.com/auth/v1/callback`
   - Google will now display: **"To continue to auth.sensilearn.com"**.
   - *Requirement*: Requires Supabase Pro tier + Custom Domain add-on.

2. **Option 2 (Google Identity Services Client-Side Sign-In - Zero Extra Cost)**:
   - Already built into this codebase in `src/app/(auth)/login/page.tsx`!
   - In Google Cloud Console, add `https://sensilearn.com` and `http://localhost:3000` to **Authorized JavaScript Origins**.
   - Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in your environment.
   - The sign-in prompt is initiated directly on `sensilearn.com`, displaying **"Sign in to Sensilearn with Google"**, and uses `supabase.auth.signInWithIdToken` to create or retrieve the Supabase session securely without leaving `sensilearn.com`.

---

## 9. Vercel Production Deployment

1. Connect the Git repository to Vercel.
2. Build Settings:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`
3. Environment Variables:
   - Copy all variables from `.env.production.example` into Vercel Settings -> Environment Variables.
4. Custom Domain:
   - Ensure `sensilearn.com` and `www.sensilearn.com` are assigned with `sensilearn.com` as canonical.

