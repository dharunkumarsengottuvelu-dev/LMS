# EduNexus — Enterprise Learning Management System (LMS)

EduNexus is an enterprise-grade Learning Management System built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Supabase**. It provides comprehensive portals for **Students**, **Trainers**, and **Admins**, featuring real-time proctored assessment engines, interactive multi-language coding & SQL execution environments, automated grading workflows, and batch analytics.

---

## 🌟 Key Features

### 🎓 Student Portal
- **Interactive Learning Modules**: Structured learning tracks with video content, documentation, practice exercises, and day-by-day progress tracking.
- **Online Code & SQL Compiler**: Integrated IDE supporting multi-language code execution (Java, Python, C, C++, JavaScript, TypeScript, SQL) with test-case validation.
- **Proctored Assessments**: Real-time webcam proctoring, browser focus monitoring, tab-switch detection, and timed exam runners.
- **Certificates & Progress**: Automated completion certificates and real-time student notification streams.

### 👩‍🏫 Trainer Portal
- **Course & Module Management**: Create, sequence, and manage learning tracks and modules.
- **Practice & Assignment Hub**: Design coding challenges, MCQ quizzes, and manage assignment evaluations.
- **Performance Tracking**: Monitor batch-level progress, assessment results, and coding accuracy.

### 🛡️ Admin Portal
- **Live Inspection & Proctoring Hub**: Real-time security dashboard tracking active test sessions, flags, and violation logs.
- **Cohort & User Management**: Dynamic enrollment management for student cohorts, trainer assignments, and batch scheduling.
- **System Administration**: Centralized management of learning modules, practice problem banks, and system configurations.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16.3 (Turbopack, App Router)
- **UI Library**: React 19, TypeScript 5
- **Styling**: Tailwind CSS v4, Lucide Icons, Shadcn UI / Radix UI Primitives
- **Data Visualization & Motion**: Recharts, Framer Motion
- **Code Editor Component**: Monaco Editor (`@monaco-editor/react`)

### Backend & API
- **API Engine**: Next.js App Router API Routes
- **Database & Authentication**: Supabase (PostgreSQL, Row Level Security, SSR Auth)
- **State Management**: Zustand Client Store (`useLMSStore`)
- **Code Execution Services**: Jobe REST API Server integration, Standalone Compiler Microservice

### DevOps & Deployment
- **Containerization**: Docker, Docker Compose
- **Hosting & Infrastructure**: Railway, Supabase Migrations

---

## 📂 High-Level Project Architecture

```text
enterprise-lms/
├── compiler/               # Code execution microservice container
├── docs/                   # System documentation & deployment guides
├── public/                 # Static public web assets
├── src/
│   ├── app/                # Next.js App Router pages & API endpoints
│   │   ├── (auth)/         # Authentication routes (Login, Register, Reset)
│   │   ├── admin/          # Admin portal pages
│   │   ├── api/            # Backend API routes (Auth, Code Execution, SQL)
│   │   ├── ide/            # Standalone playground IDE
│   │   ├── student/        # Student portal pages
│   │   └── trainer/        # Trainer portal pages
│   ├── components/         # Reusable React components
│   │   ├── admin/          # Management hubs & analytics views
│   │   ├── coding/         # Code editor & SQL execution components
│   │   ├── layouts/        # Portal sidebars & navigation headers
│   │   ├── proctoring/     # Exam proctoring & anti-cheat engines
│   │   ├── providers/      # Application context providers
│   │   ├── quiz/           # MCQ and practice challenge runners
│   │   └── ui/             # UI primitive components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Client stores, Supabase handlers, & security utils
│   ├── services/           # Service abstraction layer
│   ├── types/              # TypeScript definitions
│   └── middleware.ts       # Route protection & RBAC middleware
├── supabase/               # SQL migrations & database seed scripts
├── .env.example            # Environment template configuration
├── .gitignore              # Version control ignore configuration
├── docker-compose.yml      # Container orchestration manifest
├── Dockerfile              # Container image definition
├── next.config.ts          # Next.js configuration
├── package.json            # Node.js dependencies & scripts
└── tsconfig.json           # TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **Package Manager**: `npm`, `yarn`, or `pnpm`
- **Docker**: *(optional, for local code execution server)*

### 1. Installation

Clone the repository and install project dependencies:

```bash
git clone <repository-url>
cd enterprise-lms
npm install
```

### 2. Environment Setup

Copy `.env.example` to create your local environment file:

```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
JOBE_URL=http://localhost/jobe/index.php/restapi
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 💻 Running the Application

### Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Type Checking

Verify TypeScript types across all application routes:

```bash
npx tsc --noEmit
```

### Production Build

Create an optimized production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

---

## 🐳 Docker Deployment

To launch the application alongside the compiler microservice using Docker Compose:

```bash
docker-compose up --build
```

---

## 📄 License

This project is proprietary software developed for enterprise learning management.
