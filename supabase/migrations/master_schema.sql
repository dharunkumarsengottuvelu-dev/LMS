-- ============================================================
-- FALCON ENTERPRISE LMS — MASTER DATABASE SCHEMA & SEED
-- Clean reset + All Tables + Batch System + Compiler + Auto-Sync
-- ============================================================

-- 1. CLEAN RESET: DROP ALL OLD SCHEMAS & TABLES
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 2. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public;

-- ============================================================
-- 3. CREATE ALL CORE TABLES
-- ============================================================

-- TABLE: profiles
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL DEFAULT 'User',
  last_name       TEXT DEFAULT '',
  email           TEXT,
  role            TEXT NOT NULL DEFAULT 'student',
  status          TEXT NOT NULL DEFAULT 'active',
  avatar_url      TEXT,
  phone           TEXT,
  bio             TEXT,
  skills          TEXT[] DEFAULT '{}',
  batch_id        UUID,
  batch_name      TEXT,
  batch           TEXT,
  college         TEXT,
  branch          TEXT,
  leetcode        TEXT,
  github          TEXT,
  linkedin        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: batches
CREATE TABLE public.batches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  batch_name      TEXT,
  code            TEXT UNIQUE,
  description     TEXT,
  trainer_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  course_id       UUID,
  start_date      DATE,
  end_date        DATE,
  max_students    INT DEFAULT 100,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: batch_members
CREATE TABLE public.batch_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id        UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, user_id)
);

-- TABLE: courses
CREATE TABLE public.courses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,
  category        TEXT NOT NULL DEFAULT 'Technical Training',
  difficulty      TEXT NOT NULL DEFAULT 'beginner',
  status          TEXT NOT NULL DEFAULT 'published',
  visibility      TEXT NOT NULL DEFAULT 'public',
  assigned_batches JSONB DEFAULT '[]'::jsonb,
  is_common       BOOLEAN DEFAULT true,
  tags            TEXT[] DEFAULT '{}',
  trainer_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: modules
CREATE TABLE public.modules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  order_index     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: lessons
CREATE TABLE public.lessons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id       UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  content         TEXT,
  type            TEXT NOT NULL DEFAULT 'video',
  video_url       TEXT,
  duration_minutes INT DEFAULT 15,
  order_index     INT NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: practice_tracks
CREATE TABLE public.practice_tracks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'Practice Track',
  difficulty      TEXT NOT NULL DEFAULT 'medium',
  description     TEXT,
  thumbnail       TEXT,
  assigned_batches JSONB DEFAULT '[]'::jsonb,
  assigned_students JSONB DEFAULT '[]'::jsonb,
  is_common       BOOLEAN DEFAULT true,
  tags            TEXT[] DEFAULT '{}',
  assigned_by     TEXT DEFAULT 'Admin',
  assigned_by_name TEXT DEFAULT 'Admin',
  sub_modules     JSONB DEFAULT '[]'::jsonb,
  status          TEXT NOT NULL DEFAULT 'published',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: assessments
CREATE TABLE public.assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL DEFAULT 'mcq',
  status          TEXT NOT NULL DEFAULT 'active',
  duration_minutes INT NOT NULL DEFAULT 60,
  pass_percentage NUMERIC(5,2) NOT NULL DEFAULT 60.00,
  total_marks     INT NOT NULL DEFAULT 100,
  scheduled_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  assigned_batches JSONB DEFAULT '[]'::jsonb,
  assigned_students JSONB DEFAULT '[]'::jsonb,
  is_common       BOOLEAN DEFAULT true,
  tags            TEXT[] DEFAULT '{}',
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: questions
CREATE TABLE public.questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id   UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'single_choice',
  options         JSONB NOT NULL DEFAULT '[]',
  correct_answer  TEXT NOT NULL,
  explanation     TEXT,
  marks           INT NOT NULL DEFAULT 1,
  negative_marks  NUMERIC(4,2) DEFAULT 0.00,
  order_index     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: assessment_attempts
CREATE TABLE public.assessment_attempts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id   UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'in_progress',
  score           NUMERIC(6,2),
  total_marks     INT,
  percentage      NUMERIC(5,2),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  answers         JSONB DEFAULT '{}',
  tab_switch_count INT DEFAULT 0,
  proctoring_flags JSONB DEFAULT '[]',
  feedback        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: coding_problems
CREATE TABLE public.coding_problems (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT NOT NULL,
  difficulty      TEXT NOT NULL DEFAULT 'medium',
  tags            TEXT[] DEFAULT '{}',
  time_limit_ms   INT NOT NULL DEFAULT 2000,
  memory_limit_mb INT NOT NULL DEFAULT 256,
  starter_code    JSONB NOT NULL DEFAULT '{}',
  solution_code   JSONB,
  status          TEXT NOT NULL DEFAULT 'published',
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: test_cases
CREATE TABLE public.test_cases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id      UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  input           TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden       BOOLEAN NOT NULL DEFAULT false,
  order_index     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: coding_submissions
CREATE TABLE public.coding_submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id      UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  language        TEXT NOT NULL,
  source_code     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  execution_time_ms INT,
  memory_used_kb  INT,
  passed_test_cases INT DEFAULT 0,
  total_test_cases INT DEFAULT 0,
  test_results    JSONB DEFAULT '[]',
  compile_output  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: tests
CREATE TABLE public.tests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL DEFAULT 'mcq',
  status          TEXT NOT NULL DEFAULT 'scheduled',
  duration_minutes INT NOT NULL DEFAULT 60,
  pass_percentage NUMERIC(5,2) NOT NULL DEFAULT 60.00,
  total_marks     INT NOT NULL DEFAULT 100,
  scheduled_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  assigned_batches JSONB DEFAULT '[]'::jsonb,
  is_proctored    BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: assignments
CREATE TABLE public.assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  batch_id        UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  due_date        TIMESTAMPTZ NOT NULL,
  max_score       INT NOT NULL DEFAULT 100,
  assigned_batches JSONB DEFAULT '[]'::jsonb,
  is_common       BOOLEAN DEFAULT true,
  tags            TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'published',
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: assignment_submissions
CREATE TABLE public.assignment_submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id   UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url        TEXT,
  submission_text TEXT,
  status          TEXT NOT NULL DEFAULT 'submitted',
  score           NUMERIC(6,2),
  feedback        TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at       TIMESTAMPTZ,
  graded_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: enrollments
CREATE TABLE public.enrollments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'active',
  progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(student_id, course_id)
);

-- TABLE: notifications
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'general',
  is_read         BOOLEAN NOT NULL DEFAULT false,
  link_url        TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: compiler_languages
CREATE TABLE public.compiler_languages (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  monaco_id       TEXT NOT NULL,
  version         TEXT NOT NULL DEFAULT 'latest',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  template        TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default compiler languages
INSERT INTO public.compiler_languages (id, name, monaco_id, version, is_active, template)
VALUES
  ('python', 'Python 3', 'python', '3.10', true, 'def solution():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solution()\n'),
  ('javascript', 'JavaScript (Node.js)', 'javascript', '18.x', true, 'function solution() {\n    // Write your solution here\n}\n\nsolution();\n'),
  ('java', 'Java (OpenJDK)', 'java', '17', true, 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n'),
  ('cpp', 'C++ (GCC)', 'cpp', '17', true, '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n'),
  ('c', 'C (GCC)', 'c', '11', true, '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n'),
  ('sql', 'PostgreSQL / SQL', 'sql', 'latest', true, 'SELECT * FROM users;\n')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. AUTOMATIC AUTH USER -> PROFILES SYNC TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name  TEXT;
  v_full_name  TEXT;
  v_role       TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(v_full_name, ' ', 1), split_part(NEW.email, '@', 1), 'User');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', substr(v_full_name, length(v_first_name) + 2), '');
  
  IF NEW.email ILIKE '%admin%' THEN
    v_role := 'admin';
  ELSIF NEW.email ILIKE '%trainer%' THEN
    v_role := 'trainer';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  END IF;

  INSERT INTO public.profiles (user_id, first_name, last_name, email, role, status, created_at, updated_at)
  VALUES (NEW.id, v_first_name, v_last_name, NEW.email, v_role, 'active', NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = CASE WHEN public.profiles.first_name = 'User' THEN EXCLUDED.first_name ELSE public.profiles.first_name END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Automatically backfill profiles for any existing users in auth.users
INSERT INTO public.profiles (user_id, first_name, last_name, email, role, status, created_at, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'first_name', split_part(COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email), ' ', 1), 'User'),
  COALESCE(raw_user_meta_data->>'last_name', ''),
  email,
  CASE WHEN email ILIKE '%admin%' THEN 'admin' WHEN email ILIKE '%trainer%' THEN 'trainer' ELSE 'student' END,
  'active',
  NOW(),
  NOW()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY & OPEN PERMISSIVE POLICIES
-- ============================================================

DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public full access" ON public.%I;', t);
    EXECUTE format('CREATE POLICY "Public full access" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;
