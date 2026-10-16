-- ============================================================
-- SENSILEARN LMS — Speed & Scale Performance Indexes Migration
-- Migration: 20261016_performance_indexes.sql
-- Optimizes Authentication, Compiler Test Cases, Dashboard Analytics,
-- Practice Tracks, and Submissions
-- ============================================================

-- 1. Profiles: Instant Authentication & Role Filtering
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
  ON profiles (lower(email));

CREATE INDEX IF NOT EXISTS idx_profiles_role_status 
  ON profiles (role, status);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
  ON profiles (user_id);

-- 2. Test Cases: Fast Problem Execution & Grading
CREATE INDEX IF NOT EXISTS idx_test_cases_problem_hidden_order 
  ON test_cases (problem_id, is_hidden, order_index);

-- 3. Coding Problems: Fast Slug & Category Lookup
CREATE INDEX IF NOT EXISTS idx_coding_problems_slug 
  ON coding_problems (slug);

CREATE INDEX IF NOT EXISTS idx_coding_problems_category 
  ON coding_problems (category);

-- 4. Notifications: Fast Session Heartbeats & Active Analytics
CREATE INDEX IF NOT EXISTS idx_notifications_type_created 
  ON notifications (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications (user_id, is_read, created_at DESC);

-- 5. Practice Tracks & Assessments: Fast Dashboard & Catalog Retrieval
CREATE INDEX IF NOT EXISTS idx_practice_tracks_status_created 
  ON practice_tracks (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_status_created 
  ON assessments (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_courses_status_created 
  ON courses (status, created_at DESC);
