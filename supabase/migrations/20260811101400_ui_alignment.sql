-- ============================================================
-- EduNexus Enterprise LMS — Database Schema
-- Migration: 004_ui_alignment.sql
-- ============================================================

-- Add UI-specific columns to batches table
ALTER TABLE batches ADD COLUMN IF NOT EXISTS college_name TEXT DEFAULT 'ABC College';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS course_name TEXT DEFAULT 'Fullstack Enterprise React/Next.js';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS joining_time TEXT DEFAULT 'Morning Session (09:00 AM)';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS trainer_name TEXT DEFAULT 'Dr. Aris Thorne';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add UI-specific columns to profiles (Students) table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tech_track TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mcq_accuracy DECIMAL(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coding_accuracy DECIMAL(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS proctoring_compliance DECIMAL(5,2) DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS violation_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joined_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS batch_name TEXT;

-- Drop foreign key on created_by if we want to allow anonymous creations temporarily
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_created_by_fkey;
ALTER TABLE batches ALTER COLUMN created_by DROP NOT NULL;
