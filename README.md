# EduNexus LMS (Enterprise Platform)

## Overview

EduNexus LMS is a web-based Learning Management System designed to provide a centralized platform for managing learning programs, students, trainers, courses, batches, coding practice, assignments, assessments, and learning progress.

The platform provides separate role-based experiences for administrators, trainers, and students. It is designed to support structured learning programs while allowing students to practice programming problems and submit solutions through an integrated coding environment.

The system is designed to provide a complete learning workflow from course and batch management to student practice, coding submissions, assessments, and progress tracking.

---

## Key Features

### Role-Based Access

The platform supports different user roles with role-specific access and functionality.

#### Admin

Administrators can manage and control the overall learning platform, including:

* Student management
* Trainer management
* Course management
* Batch management
* Assignment management
* Practice content
* Learning programs
* User access
* Platform-level monitoring
* Reports and analytics

#### Trainer

Trainers can manage learning activities assigned to their batches and students.

Depending on the configured permissions, trainers can:

* Manage assigned courses
* Manage learning content
* Create assignments
* Manage coding practice
* Monitor student submissions
* Review student performance
* Track learning progress
* Manage batch-related activities

#### Student

Students have access to their learning and practice environment.

Students can:

* Access assigned courses
* View learning materials
* Participate in coding practice
* Solve programming problems
* Submit solutions
* View evaluation results
* Complete assignments
* Track their learning progress
* Access available assessments

---

# Learning Management

The LMS provides functionality for organizing learning content into structured programs.

The platform can manage:

* Courses
* Modules
* Lessons
* Learning materials
* Assignments
* Practice activities
* Assessments
* Batches
* Student assignments

The system is designed so that learning content can be assigned to the appropriate students or batches through the existing management workflow.

---

# Coding Practice

One of the major components of the platform is the programming practice system.

Students can practice programming problems using the integrated coding environment.

The coding practice workflow supports:

1. Selecting an available programming problem
2. Reading the problem statement
3. Understanding input and output requirements
4. Writing the solution
5. Selecting the supported programming language
6. Running/submitting the solution
7. Compiling and executing the submitted code
8. Evaluating the solution
9. Displaying the result to the student

The platform uses an external code execution service (**Jobe**) according to the current project configuration.

---

# Programming Evaluation

The coding practice system is designed to evaluate submitted programs against predefined test cases.

Depending on the configured problem, evaluation can include:

* Compilation checking
* Program execution
* Input/output validation
* Test-case evaluation
* Execution status
* Submission result
* Programming language support

The evaluation service is separated from the main LMS application so that code execution can be handled through the configured compiler/execution service.

---

# Course Management

The course management functionality allows authorized users to organize learning content.

A course can contain structured learning resources such as:

* Modules
* Lessons
* Topics
* Practice activities
* Assignments
* Assessments

The exact course structure is determined by the current application implementation.

---

# Batch Management

The platform supports batch-based learning management.

Batches can be used to organize students who are participating in a particular learning program or schedule.

Batch management can include:

* Creating batches
* Assigning students
* Assigning trainers
* Associating courses
* Managing learning schedules
* Tracking batch-related progress

This allows the same learning content and activities to be managed for groups of students.

---

# Assignment Management

The LMS supports assignment-based learning.

Authorized users can create and manage assignments for students or batches.

Assignments may contain:

* Problem statements
* Coding problems
* Learning tasks
* Assessment requirements
* Submission requirements
* Due-date information

Students can access their assigned activities and submit their work through the platform.

---

# Student Practice

The platform is designed to support continuous programming practice.

Students can work on coding problems based on their assigned learning content.

The practice environment provides:

* Problem descriptions
* Input/output specifications
* Constraints
* Examples
* Code editor
* Language selection
* Code execution
* Submission
* Evaluation results

This allows students to practice programming in an environment integrated directly into the LMS.

---

# Dashboard

The application provides role-specific dashboards.

Dashboards provide relevant information such as:

* Learning activities
* Courses
* Batches
* Assignments
* Practice activities
* Submission information
* Progress
* Performance information
* Available tasks

Dashboard information is generated from actual application data rather than hardcoded demonstration data.

---

# Reports and Analytics

The platform provides learning and performance-related information based on available application data.

Depending on the current implementation, this may include:

* Student performance
* Assignment progress
* Coding submissions
* Assessment results
* Course progress
* Batch-level information
* Learning activity statistics

Analytics are based on actual stored data. When no data is available, the application displays appropriate empty states rather than fake or demonstration information.

---

# Authentication and Authorization

The application uses authentication and role-based authorization to control access to different parts of the platform.

Access to platform functionality is determined by the authenticated user's role and permissions.

The system separates access between:

* Admin
* Trainer
* Student

Sensitive credentials and authentication secrets are stored through environment configuration and are not included in the repository documentation.

---

# Technology Stack

The README documents the technologies actually used by the current implementation.

Based on the current project configuration, the relevant technologies include:

### Frontend & Application

* Next.js (App Router)
* React
* TypeScript
* Tailwind CSS
* Shadcn UI (Component Library)
* Framer Motion (Animations)
* Zustand (State Management)
* Recharts (Data Visualization)

### Database & Backend Services

* Supabase (Authentication, PostgreSQL Database, Storage)

### Coding Execution

* Jobe Code Execution Service

Jobe is configured through the project's environment configuration for executing programming submissions.

### Development Tools

* npm
* Git
* TypeScript
* ESLint

---

# High-Level Architecture

The application follows a web-based application architecture consisting of the user interface, application services, database services, and external integrations.

High-level flow:

```text
User
  │
  ▼
Web Application (Next.js)
  │
  ├── Authentication (Supabase Auth)
  │
  ├── LMS Features
  │
  ├── Course Management
  │
  ├── Batch Management
  │
  ├── Assignment Management
  │
  ├── Coding Practice
  │
  └── Reports / Analytics
  │
  ▼
External Services
  │
  ├── Supabase (PostgreSQL & Storage)
  │
  └── Jobe Code Execution Service
```

---

# Environment Configuration

The project uses environment variables for external services and application configuration.

Create a local environment file (`.env.local`) and configure the required variables.

Required environment variables include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_JOBE_URL
NEXT_PUBLIC_APP_URL
```

### Security

Never commit the actual `.env` or `.env.local` file to Git.

Never publish:

* Service role keys
* API keys
* Passwords
* Access tokens
* Authentication secrets
* Database credentials

Use `.env.example` to document required configuration without exposing real credentials.

The actual values must be provided locally by the person running the application.

---

# Installation

## Prerequisites

Install the tools required by the current project before starting.

Typical requirements include:

* Node.js
* npm
* Git
* Supabase project/database
* Jobe service for coding execution

---

# Project Setup

Clone or obtain the project source code and open the project directory.

Install the project dependencies using npm:

```bash
npm install
```

Create the required environment configuration using the project's `.env.example` file.

Configure the required Supabase and Jobe settings locally.

---

# Running the Application

Start the development server using the command configured in the project's `package.json`.

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

Do not hardcode production credentials into the project.

---

# Database Configuration

The application uses Supabase/PostgreSQL according to the current project configuration.

Database-related configuration should be provided through environment variables.

The repository does not contain:

* Production database passwords
* Service-role credentials
* Private connection strings
* Sensitive database information

Database migrations or setup instructions follow the migration/configuration files present in the current project.

---

# Jobe Configuration

The coding practice system can communicate with a Jobe code execution service.

The service URL is configured using:

```text
NEXT_PUBLIC_JOBE_URL
```

For local development, the configured Jobe service may use a local URL such as:

```text
http://localhost/jobe/index.php/restapi
```

The actual URL is configured through the environment file rather than hardcoded into public documentation or source code.

---

# Project Structure

```text
project/
│
├── src/
│   ├── app/           # Next.js App Router pages and layouts
│   ├── components/    # Reusable React components (UI, layout, features)
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility functions and Supabase client setup
│   ├── services/      # Data fetching and business logic services
│   └── types/         # TypeScript definitions and interfaces
├── public/            # Static assets
├── .env.example       # Example environment variables
├── .gitignore         # Git ignore rules
├── package.json       # Project dependencies and scripts
└── README.md          # Project documentation
```

---

# Data Management

The application is designed to work with actual application data.

The project does not depend on permanent dummy or demonstration records for normal operation.

When no data exists, the application provides appropriate empty states such as:

* No students available
* No courses available
* No batches available
* No assignments available
* No submissions available
* No reports available
* No analytics data available

This allows the system to operate correctly from a fresh installation.

---

# Security Considerations

The application follows secure configuration practices.

Important security requirements include:

* Keep environment files private.
* Never commit secrets to Git.
* Never expose service-role credentials.
* Do not hardcode passwords.
* Do not expose private API credentials.
* Use role-based access control.
* Validate user input.
* Keep production credentials outside the source repository.

---

# Git Configuration

The repository uses a project-specific `.gitignore`.

The `.gitignore` prevents accidental commits of:

* Environment files
* Dependencies
* Build output
* Cache files
* Logs
* IDE configuration
* Operating-system files
* Local development files
* Other generated files

Source code and required project configuration remain tracked.

---

# Development Guidelines

When modifying the project:

* Preserve existing functionality.
* Follow the existing project structure.
* Do not commit secrets.
* Do not introduce unnecessary dependencies.
* Keep environment-specific configuration outside the source code.
* Test changes before committing.
* Avoid unnecessary changes to unrelated functionality.

---

# Privacy

This project documentation intentionally does not contain:

* Personal information
* Developer contact information
* Personal profiles
* Private credentials
* API keys
* Database passwords
* Source code
* Proprietary algorithms
* Internal AI prompts
* Private business logic

The README provides a technical overview of the application without exposing confidential implementation details.

---

## Important Note

This README describes the project at a **high level**.

The actual implementation, source code, business logic, credentials, private configuration, and proprietary processing remain within the project and are not reproduced in this documentation.
