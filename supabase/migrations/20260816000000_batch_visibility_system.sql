-- ============================================================
-- EduNexus Enterprise LMS — Batch Visibility & Access Control
-- Migration: 20260816000000_batch_visibility_system.sql
-- ============================================================

-- 1. Ensure batches table columns match required fields and start_date is nullable
ALTER TABLE batches ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS batch_name TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS college_name TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS trainer_name TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update batch_name from name if empty
UPDATE batches SET batch_name = name WHERE batch_name IS NULL AND name IS NOT NULL;
UPDATE batches SET name = batch_name WHERE name IS NULL AND batch_name IS NOT NULL;

-- 2. Ensure batch_members table exists and has proper cascading
CREATE TABLE IF NOT EXISTS batch_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_members_batch ON batch_members(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_members_user ON batch_members(user_id);

-- 3. Ensure assignments table has visibility & batch fields
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assigned_batches TEXT[] DEFAULT '{}';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT TRUE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE assignments ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE assignments ALTER COLUMN created_by DROP NOT NULL;

-- 4. Ensure assessments table has batch assignment fields & flexible foreign keys
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assigned_batches TEXT[] DEFAULT '{}';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT TRUE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE assessments ALTER COLUMN created_by DROP NOT NULL;

-- 5. Ensure practice_tracks table has batch assignment fields
ALTER TABLE practice_tracks ADD COLUMN IF NOT EXISTS assigned_batches TEXT[] DEFAULT '{}';
ALTER TABLE practice_tracks ADD COLUMN IF NOT EXISTS assigned_students TEXT[] DEFAULT '{}';
ALTER TABLE practice_tracks ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT TRUE;

-- 6. Ensure courses table has visibility fields
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT TRUE;
ALTER TABLE courses ALTER COLUMN trainer_id DROP NOT NULL;
ALTER TABLE courses ALTER COLUMN category_id DROP NOT NULL;
