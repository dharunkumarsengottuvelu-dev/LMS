-- ============================================================
-- EduNexus Enterprise LMS — Database Schema
-- Migration: 001_schema.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'trainer', 'student');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE course_visibility AS ENUM ('public', 'private', 'enrolled_only');
CREATE TYPE course_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE lesson_type AS ENUM ('video', 'pdf', 'text', 'quiz', 'coding');
CREATE TYPE assessment_type AS ENUM ('mcq', 'coding', 'mixed');
CREATE TYPE assessment_status AS ENUM ('draft', 'active', 'expired', 'archived');
CREATE TYPE question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false');
CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'evaluated', 'expired');
CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'graded', 'returned', 'late');
CREATE TYPE test_type AS ENUM ('mcq', 'coding', 'mixed');
CREATE TYPE test_status AS ENUM ('draft', 'scheduled', 'live', 'completed', 'cancelled');
CREATE TYPE coding_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE code_submission_status AS ENUM ('pending', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'internal_error');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE resource_type AS ENUM ('pdf', 'video', 'link', 'zip', 'image', 'other');
CREATE TYPE notification_type AS ENUM ('assessment_assigned', 'test_scheduled', 'assignment_deadline', 'course_updated', 'new_lesson', 'result_published', 'certificate_issued', 'general');

-- ============================================================
-- TABLE: profiles (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  avatar_url      TEXT,
  bio             TEXT,
  phone           TEXT,
  date_of_birth   DATE,
  gender          TEXT CHECK (gender IN ('male', 'female', 'other')),
  location        TEXT,
  linkedin_url    TEXT,
  github_url      TEXT,
  website_url     TEXT,
  skills          TEXT[] DEFAULT '{}',
  role            user_role NOT NULL DEFAULT 'student',
  status          user_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- ============================================================
-- TABLE: batches
-- ============================================================

CREATE TABLE batches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  start_date    DATE NOT NULL,
  end_date      DATE,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE batch_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id   UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, user_id)
);

CREATE INDEX idx_batch_members_batch ON batch_members(batch_id);
CREATE INDEX idx_batch_members_user ON batch_members(user_id);

-- ============================================================
-- TABLE: categories
-- ============================================================

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  color       TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: courses
-- ============================================================

CREATE TABLE courses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT NOT NULL,
  short_description TEXT,
  thumbnail_url     TEXT,
  category_id       UUID NOT NULL REFERENCES categories(id),
  trainer_id        UUID NOT NULL REFERENCES profiles(id),
  difficulty        course_difficulty NOT NULL DEFAULT 'beginner',
  visibility        course_visibility NOT NULL DEFAULT 'private',
  status            course_status NOT NULL DEFAULT 'draft',
  duration_hours    DECIMAL(5,2),
  language          TEXT NOT NULL DEFAULT 'English',
  tags              TEXT[] DEFAULT '{}',
  what_you_learn    TEXT[] DEFAULT '{}',
  requirements      TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_trainer ON courses(trainer_id);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_search ON courses USING gin(to_tsvector('english', title || ' ' || description));

-- ============================================================
-- TABLE: modules
-- ============================================================

CREATE TABLE modules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  "order"     INTEGER NOT NULL DEFAULT 0,
  is_locked   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, "order")
);

CREATE INDEX idx_modules_course ON modules(course_id);

-- ============================================================
-- TABLE: lessons
-- ============================================================

CREATE TABLE lessons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  type            lesson_type NOT NULL DEFAULT 'video',
  content         TEXT,
  video_url       TEXT,
  video_duration  INTEGER, -- seconds
  pdf_url         TEXT,
  "order"         INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);

-- ============================================================
-- TABLE: resources
-- ============================================================

CREATE TABLE resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id   UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        resource_type NOT NULL DEFAULT 'pdf',
  url         TEXT NOT NULL,
  size_bytes  BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_lesson ON resources(lesson_id);
CREATE INDEX idx_resources_course ON resources(course_id);

-- ============================================================
-- TABLE: enrollments
-- ============================================================

CREATE TABLE enrollments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  status              enrollment_status NOT NULL DEFAULT 'active',
  progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

-- ============================================================
-- TABLE: lesson_progress
-- ============================================================

CREATE TABLE lesson_progress (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id        UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  is_completed     BOOLEAN NOT NULL DEFAULT FALSE,
  watched_seconds  INTEGER NOT NULL DEFAULT 0,
  last_accessed    TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  UNIQUE(student_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_course ON lesson_progress(course_id);

-- ============================================================
-- TABLE: assessments
-- ============================================================

CREATE TABLE assessments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                   TEXT NOT NULL,
  description             TEXT,
  type                    assessment_type NOT NULL DEFAULT 'mcq',
  course_id               UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_by              UUID NOT NULL REFERENCES profiles(id),
  duration_minutes        INTEGER NOT NULL DEFAULT 60,
  passing_marks           DECIMAL(5,2) NOT NULL DEFAULT 40,
  total_marks             DECIMAL(5,2) NOT NULL DEFAULT 100,
  max_attempts            INTEGER NOT NULL DEFAULT 1,
  shuffle_questions        BOOLEAN NOT NULL DEFAULT FALSE,
  negative_marking        BOOLEAN NOT NULL DEFAULT FALSE,
  negative_marks_per_wrong DECIMAL(5,2) NOT NULL DEFAULT 0,
  available_from          TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,
  status                  assessment_status NOT NULL DEFAULT 'draft',
  instructions            TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_course ON assessments(course_id);
CREATE INDEX idx_assessments_creator ON assessments(created_by);
CREATE INDEX idx_assessments_status ON assessments(status);

-- ============================================================
-- TABLE: questions
-- ============================================================

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  type            question_type NOT NULL DEFAULT 'single_choice',
  text            TEXT NOT NULL,
  options         JSONB NOT NULL DEFAULT '[]', -- [{id, text}]
  correct_answers TEXT[] NOT NULL DEFAULT '{}', -- option ids
  marks           DECIMAL(5,2) NOT NULL DEFAULT 1,
  negative_marks  DECIMAL(5,2) NOT NULL DEFAULT 0,
  explanation     TEXT,
  "order"         INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_assessment ON questions(assessment_id);

-- ============================================================
-- TABLE: assessment_assignments (assign to students/batches)
-- ============================================================

CREATE TABLE assessment_assignments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id    UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  assigned_to_type TEXT NOT NULL CHECK (assigned_to_type IN ('student', 'batch', 'course')),
  assigned_to_id   UUID NOT NULL,
  assigned_by      UUID NOT NULL REFERENCES profiles(id),
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessment_assignments_assessment ON assessment_assignments(assessment_id);
CREATE INDEX idx_assessment_assignments_target ON assessment_assignments(assigned_to_id);

-- ============================================================
-- TABLE: assessment_attempts
-- ============================================================

CREATE TABLE assessment_attempts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id    UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ NOT NULL,
  status           attempt_status NOT NULL DEFAULT 'in_progress',
  answers          JSONB NOT NULL DEFAULT '{}', -- {questionId: [optionIds]}
  score            DECIMAL(5,2),
  total_marks      DECIMAL(5,2),
  percentage       DECIMAL(5,2),
  passed           BOOLEAN,
  time_taken_seconds INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_student ON assessment_attempts(student_id);
CREATE INDEX idx_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX idx_attempts_status ON assessment_attempts(status);

-- ============================================================
-- TABLE: coding_problems
-- ============================================================

CREATE TABLE coding_problems (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT NOT NULL,
  difficulty        coding_difficulty NOT NULL DEFAULT 'easy',
  tags              TEXT[] DEFAULT '{}',
  time_limit_ms     INTEGER NOT NULL DEFAULT 2000,
  memory_limit_kb   INTEGER NOT NULL DEFAULT 262144,
  course_id         UUID REFERENCES courses(id) ON DELETE SET NULL,
  assessment_id     UUID REFERENCES assessments(id) ON DELETE SET NULL,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  is_public         BOOLEAN NOT NULL DEFAULT FALSE,
  templates         JSONB NOT NULL DEFAULT '{}', -- {language: starterCode}
  sample_test_cases JSONB NOT NULL DEFAULT '[]',
  hidden_test_cases JSONB NOT NULL DEFAULT '[]',
  accepted_count    INTEGER NOT NULL DEFAULT 0,
  submission_count  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coding_problems_course ON coding_problems(course_id);
CREATE INDEX idx_coding_problems_assessment ON coding_problems(assessment_id);
CREATE INDEX idx_coding_problems_difficulty ON coding_problems(difficulty);
CREATE INDEX idx_coding_problems_search ON coding_problems USING gin(to_tsvector('english', title));

-- ============================================================
-- TABLE: coding_submissions
-- ============================================================

CREATE TABLE coding_submissions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  problem_id            UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  assessment_attempt_id UUID REFERENCES assessment_attempts(id) ON DELETE SET NULL,
  language              TEXT NOT NULL,
  code                  TEXT NOT NULL,
  status                code_submission_status NOT NULL DEFAULT 'pending',
  score                 DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_score             DECIMAL(5,2) NOT NULL DEFAULT 100,
  passed_test_cases     INTEGER NOT NULL DEFAULT 0,
  total_test_cases      INTEGER NOT NULL DEFAULT 0,
  time_ms               INTEGER,
  memory_kb             INTEGER,
  judge0_token          TEXT,
  error_message         TEXT,
  test_results          JSONB NOT NULL DEFAULT '[]',
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coding_submissions_student ON coding_submissions(student_id);
CREATE INDEX idx_coding_submissions_problem ON coding_submissions(problem_id);
CREATE INDEX idx_coding_submissions_attempt ON coding_submissions(assessment_attempt_id);

-- ============================================================
-- TABLE: tests
-- ============================================================

CREATE TABLE tests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT NOT NULL,
  description           TEXT,
  type                  test_type NOT NULL DEFAULT 'mcq',
  course_id             UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_by            UUID NOT NULL REFERENCES profiles(id),
  scheduled_at          TIMESTAMPTZ NOT NULL,
  duration_minutes      INTEGER NOT NULL DEFAULT 60,
  passing_marks         DECIMAL(5,2) NOT NULL DEFAULT 40,
  total_marks           DECIMAL(5,2) NOT NULL DEFAULT 100,
  max_attempts          INTEGER NOT NULL DEFAULT 1,
  eligible_batch_ids    UUID[] DEFAULT '{}',
  eligible_student_ids  UUID[] DEFAULT '{}',
  status                test_status NOT NULL DEFAULT 'draft',
  auto_submit           BOOLEAN NOT NULL DEFAULT TRUE,
  shuffle_questions     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tests_creator ON tests(created_by);
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_scheduled ON tests(scheduled_at);

-- ============================================================
-- TABLE: test_questions
-- ============================================================

CREATE TABLE test_questions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id     UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  problem_id  UUID REFERENCES coding_problems(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('mcq', 'coding')),
  "order"     INTEGER NOT NULL DEFAULT 0,
  UNIQUE(test_id, question_id),
  UNIQUE(test_id, problem_id)
);

CREATE INDEX idx_test_questions_test ON test_questions(test_id);

-- ============================================================
-- TABLE: test_attempts
-- ============================================================

CREATE TABLE test_attempts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id      UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL,
  score        DECIMAL(5,2),
  passed       BOOLEAN,
  rank         INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(test_id, student_id)
);

CREATE INDEX idx_test_attempts_test ON test_attempts(test_id);
CREATE INDEX idx_test_attempts_student ON test_attempts(student_id);

-- ============================================================
-- TABLE: assignments
-- ============================================================

CREATE TABLE assignments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  deadline         TIMESTAMPTZ NOT NULL,
  max_marks        DECIMAL(5,2) NOT NULL DEFAULT 100,
  submission_types TEXT[] NOT NULL DEFAULT '{"pdf"}',
  instructions     TEXT,
  attachments      TEXT[] DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignments_creator ON assignments(created_by);

-- ============================================================
-- TABLE: assignment_submissions
-- ============================================================

CREATE TABLE assignment_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url      TEXT,
  github_link   TEXT,
  text_content  TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        submission_status NOT NULL DEFAULT 'submitted',
  marks         DECIMAL(5,2),
  feedback      TEXT,
  graded_at     TIMESTAMPTZ,
  graded_by     UUID REFERENCES profiles(id),
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student ON assignment_submissions(student_id);

-- ============================================================
-- TABLE: certificates
-- ============================================================

CREATE TABLE certificates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_id TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  pdf_url         TEXT,
  UNIQUE(student_id, course_id)
);

CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_certificates_course ON certificates(course_id);
CREATE INDEX idx_certificates_verification ON certificates(verification_id);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL DEFAULT 'general',
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

-- ============================================================
-- TABLE: activity_logs
-- ============================================================

CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- ============================================================
-- TRIGGERS: auto-update updated_at timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_assessments_updated_at BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tests_updated_at BEFORE UPDATE ON tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: auto-create profile when user signs up
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: update course enrollment progress
-- ============================================================

CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_progress DECIMAL(5,2);
BEGIN
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons WHERE course_id = NEW.course_id;

  SELECT COUNT(*) INTO v_completed_lessons
  FROM lesson_progress
  WHERE student_id = NEW.student_id
    AND course_id = NEW.course_id
    AND is_completed = TRUE;

  IF v_total_lessons > 0 THEN
    v_progress := (v_completed_lessons::DECIMAL / v_total_lessons) * 100;
  ELSE
    v_progress := 0;
  END IF;

  UPDATE enrollments
  SET
    progress_percentage = v_progress,
    completed_at = CASE WHEN v_progress >= 100 THEN NOW() ELSE NULL END,
    status = CASE WHEN v_progress >= 100 THEN 'completed' ELSE 'active' END
  WHERE student_id = NEW.student_id AND course_id = NEW.course_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_progress
  AFTER INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_enrollment_progress();
