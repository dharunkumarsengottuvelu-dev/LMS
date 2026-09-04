-- ============================================================
-- FALCON LMS — High-Performance Composite Indexes Migration
-- Migration: 20260904120000_performance_composite_indexes.sql
-- Optimizes query waterfalls, heatmaps, reports, and real-time tracking
-- ============================================================

-- 1. Coding Submissions: Fast lookup of student problem progress & submission timestamps
CREATE INDEX IF NOT EXISTS idx_coding_submissions_student_problem 
  ON coding_submissions (student_id, problem_id);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_student_submitted 
  ON coding_submissions (student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_student_status 
  ON coding_submissions (student_id, status);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_submitted_desc 
  ON coding_submissions (submitted_at DESC);

-- 2. Assessment Attempts: Fast history, attempt lookups, and reporting
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_student_submitted 
  ON assessment_attempts (student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_student_assessment 
  ON assessment_attempts (student_id, assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment_status 
  ON assessment_attempts (assessment_id, status);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_submitted_desc 
  ON assessment_attempts (submitted_at DESC);

-- 3. Enrollments: Fast filtering of active enrollments by student and course
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status 
  ON enrollments (student_id, status);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_status 
  ON enrollments (course_id, status);

-- 4. Lesson Progress: Fast course completion tracking and student progress aggregates
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_course 
  ON lesson_progress (student_id, course_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_completed 
  ON lesson_progress (student_id, is_completed);

-- 5. Notifications: Fast heartbeat queries for active learning time tracking
CREATE INDEX IF NOT EXISTS idx_notifications_user_type 
  ON notifications (user_id, type);

CREATE INDEX IF NOT EXISTS idx_notifications_type_user 
  ON notifications (type, user_id);

-- 6. Activity Logs: Fast user activity history and admin dashboard timelines
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created 
  ON activity_logs (user_id, created_at DESC);
