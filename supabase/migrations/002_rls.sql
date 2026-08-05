-- ============================================================
-- EduNexus Enterprise LMS — Row Level Security Policies
-- Migration: 002_rls.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's profile id
CREATE OR REPLACE FUNCTION public.profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: check if current user is enrolled in a course
CREATE OR REPLACE FUNCTION public.is_enrolled(p_course_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = public.profile_id()
    AND course_id = p_course_id
    AND status != 'dropped'
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================

-- Users can read their own profile; admins can read all
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.user_role() IN ('admin', 'trainer')
  );

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Only admins can insert/delete profiles (handled by trigger otherwise)
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
  USING (public.user_role() = 'admin');

-- ============================================================
-- BATCHES
-- ============================================================

CREATE POLICY "batches_select" ON batches FOR SELECT
  USING (public.user_role() IN ('admin', 'trainer'));

CREATE POLICY "batches_admin_write" ON batches FOR ALL
  USING (public.user_role() = 'admin');

CREATE POLICY "batch_members_select" ON batch_members FOR SELECT
  USING (
    user_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

CREATE POLICY "batch_members_admin_write" ON batch_members FOR ALL
  USING (public.user_role() = 'admin');

-- ============================================================
-- CATEGORIES
-- ============================================================

-- Everyone can read categories
CREATE POLICY "categories_read_all" ON categories FOR SELECT USING (TRUE);

-- Only admins can write
CREATE POLICY "categories_admin_write" ON categories FOR ALL
  USING (public.user_role() = 'admin');

-- ============================================================
-- COURSES
-- ============================================================

-- Public courses visible to everyone; private/enrolled courses only to enrolled students
CREATE POLICY "courses_select" ON courses FOR SELECT
  USING (
    status = 'published'
    AND (
      visibility = 'public'
      OR public.user_role() IN ('admin', 'trainer')
      OR (visibility = 'enrolled_only' AND public.is_enrolled(id))
    )
    OR public.user_role() = 'admin'
    OR (public.user_role() = 'trainer' AND trainer_id = public.profile_id())
  );

-- Admins and course trainers can update
CREATE POLICY "courses_update" ON courses FOR UPDATE
  USING (
    public.user_role() = 'admin'
    OR (public.user_role() = 'trainer' AND trainer_id = public.profile_id())
  );

CREATE POLICY "courses_insert" ON courses FOR INSERT
  WITH CHECK (
    public.user_role() IN ('admin', 'trainer')
  );

CREATE POLICY "courses_delete" ON courses FOR DELETE
  USING (public.user_role() = 'admin');

-- ============================================================
-- MODULES
-- ============================================================

CREATE POLICY "modules_select" ON modules FOR SELECT
  USING (
    public.user_role() IN ('admin', 'trainer')
    OR public.is_enrolled(course_id)
  );

CREATE POLICY "modules_write" ON modules FOR ALL
  USING (
    public.user_role() = 'admin'
    OR (
      public.user_role() = 'trainer'
      AND EXISTS (SELECT 1 FROM courses WHERE id = modules.course_id AND trainer_id = public.profile_id())
    )
  );

-- ============================================================
-- LESSONS
-- ============================================================

CREATE POLICY "lessons_select" ON lessons FOR SELECT
  USING (
    is_free_preview = TRUE
    OR public.user_role() IN ('admin', 'trainer')
    OR public.is_enrolled(course_id)
  );

CREATE POLICY "lessons_write" ON lessons FOR ALL
  USING (
    public.user_role() = 'admin'
    OR (
      public.user_role() = 'trainer'
      AND EXISTS (SELECT 1 FROM courses WHERE id = lessons.course_id AND trainer_id = public.profile_id())
    )
  );

-- ============================================================
-- RESOURCES
-- ============================================================

CREATE POLICY "resources_select" ON resources FOR SELECT
  USING (
    public.user_role() IN ('admin', 'trainer')
    OR public.is_enrolled(course_id)
  );

CREATE POLICY "resources_write" ON resources FOR ALL
  USING (public.user_role() IN ('admin', 'trainer'));

-- ============================================================
-- ENROLLMENTS
-- ============================================================

CREATE POLICY "enrollments_select" ON enrollments FOR SELECT
  USING (
    student_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

CREATE POLICY "enrollments_insert" ON enrollments FOR INSERT
  WITH CHECK (
    student_id = public.profile_id()
    OR public.user_role() = 'admin'
  );

CREATE POLICY "enrollments_admin_write" ON enrollments FOR ALL
  USING (public.user_role() = 'admin');

-- ============================================================
-- LESSON PROGRESS
-- ============================================================

CREATE POLICY "lesson_progress_select" ON lesson_progress FOR SELECT
  USING (
    student_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

CREATE POLICY "lesson_progress_write" ON lesson_progress FOR ALL
  USING (student_id = public.profile_id() OR public.user_role() = 'admin');

-- ============================================================
-- ASSESSMENTS
-- ============================================================

CREATE POLICY "assessments_select" ON assessments FOR SELECT
  USING (
    public.user_role() IN ('admin', 'trainer')
    OR (
      status = 'active'
      AND (
        available_from IS NULL OR available_from <= NOW()
      )
      AND (
        expires_at IS NULL OR expires_at >= NOW()
      )
      AND EXISTS (
        SELECT 1 FROM assessment_assignments aa
        WHERE aa.assessment_id = assessments.id
        AND (
          (aa.assigned_to_type = 'student' AND aa.assigned_to_id = public.profile_id())
          OR (aa.assigned_to_type = 'course' AND public.is_enrolled(aa.assigned_to_id))
          OR (aa.assigned_to_type = 'batch' AND EXISTS (
            SELECT 1 FROM batch_members WHERE batch_id = aa.assigned_to_id AND user_id = public.profile_id()
          ))
        )
      )
    )
  );

CREATE POLICY "assessments_write" ON assessments FOR ALL
  USING (public.user_role() IN ('admin', 'trainer'));

-- ============================================================
-- QUESTIONS
-- ============================================================

-- Students cannot see correct answers
CREATE POLICY "questions_select_student" ON questions FOR SELECT
  USING (
    public.user_role() IN ('admin', 'trainer')
    OR EXISTS (
      SELECT 1 FROM assessments a
      JOIN assessment_attempts at ON at.assessment_id = a.id
      WHERE a.id = questions.assessment_id
        AND at.student_id = public.profile_id()
        AND at.status = 'in_progress'
    )
  );

CREATE POLICY "questions_write" ON questions FOR ALL
  USING (public.user_role() IN ('admin', 'trainer'));

-- ============================================================
-- ASSESSMENT ATTEMPTS
-- ============================================================

CREATE POLICY "attempts_select" ON assessment_attempts FOR SELECT
  USING (
    student_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

CREATE POLICY "attempts_insert" ON assessment_attempts FOR INSERT
  WITH CHECK (student_id = public.profile_id());

CREATE POLICY "attempts_update" ON assessment_attempts FOR UPDATE
  USING (
    (student_id = public.profile_id() AND status = 'in_progress')
    OR public.user_role() IN ('admin', 'trainer')
  );

-- ============================================================
-- CODING PROBLEMS
-- ============================================================

CREATE POLICY "coding_problems_select" ON coding_problems FOR SELECT
  USING (
    is_public = TRUE
    OR public.user_role() IN ('admin', 'trainer')
    OR (course_id IS NOT NULL AND public.is_enrolled(course_id))
  );

CREATE POLICY "coding_problems_write" ON coding_problems FOR ALL
  USING (public.user_role() IN ('admin', 'trainer'));

-- ============================================================
-- CODING SUBMISSIONS
-- ============================================================

CREATE POLICY "coding_submissions_select" ON coding_submissions FOR SELECT
  USING (
    student_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

CREATE POLICY "coding_submissions_insert" ON coding_submissions FOR INSERT
  WITH CHECK (student_id = public.profile_id());

-- ============================================================
-- TESTS
-- ============================================================

CREATE POLICY "tests_select" ON tests FOR SELECT
  USING (
    public.user_role() IN ('admin', 'trainer')
    OR (
      status IN ('live', 'completed')
      AND (
        ARRAY[public.profile_id()] && eligible_student_ids
        OR EXISTS (
          SELECT 1 FROM batch_members bm
          WHERE bm.user_id = public.profile_id()
          AND ARRAY[bm.batch_id] && eligible_batch_ids
        )
      )
    )
  );

CREATE POLICY "tests_write" ON tests FOR ALL
  USING (public.user_role() IN ('admin', 'trainer'));

-- ============================================================
-- TEST ATTEMPTS
-- ============================================================

CREATE POLICY "test_attempts_select" ON test_attempts FOR SELECT
  USING (
    student_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

CREATE POLICY "test_attempts_write" ON test_attempts FOR ALL
  USING (
    student_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

-- ============================================================
-- ASSIGNMENTS
-- ============================================================

CREATE POLICY "assignments_select" ON assignments FOR SELECT
  USING (
    public.user_role() IN ('admin', 'trainer')
    OR public.is_enrolled(course_id)
  );

CREATE POLICY "assignments_write" ON assignments FOR ALL
  USING (public.user_role() IN ('admin', 'trainer'));

-- ============================================================
-- ASSIGNMENT SUBMISSIONS
-- ============================================================

CREATE POLICY "assignment_submissions_select" ON assignment_submissions FOR SELECT
  USING (
    student_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

CREATE POLICY "assignment_submissions_insert" ON assignment_submissions FOR INSERT
  WITH CHECK (student_id = public.profile_id());

CREATE POLICY "assignment_submissions_update" ON assignment_submissions FOR UPDATE
  USING (
    student_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

-- ============================================================
-- CERTIFICATES
-- ============================================================

CREATE POLICY "certificates_select" ON certificates FOR SELECT
  USING (
    student_id = public.profile_id()
    OR public.user_role() IN ('admin', 'trainer')
  );

CREATE POLICY "certificates_write" ON certificates FOR ALL
  USING (public.user_role() = 'admin');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (user_id = public.profile_id());

CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = public.profile_id());

CREATE POLICY "notifications_write" ON notifications FOR ALL
  USING (public.user_role() IN ('admin', 'trainer'));

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT
  USING (
    user_id = public.profile_id()
    OR public.user_role() = 'admin'
  );

CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT
  WITH CHECK (user_id = public.profile_id() OR public.user_role() = 'admin');
