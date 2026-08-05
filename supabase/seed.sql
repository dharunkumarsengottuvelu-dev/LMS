-- ============================================================
-- EduNexus Enterprise LMS — Seed Data
-- supabase/seed.sql
-- ============================================================

-- NOTE: Auth users must be created via Supabase Auth API (or dashboard).
-- This seed file creates the application-level data after auth users exist.
-- Run this after creating users in Supabase Auth.

-- ============================================================
-- CATEGORIES
-- ============================================================

INSERT INTO categories (id, name, slug, icon, color, description) VALUES
  ('cat-web-dev', 'Web Development', 'web-development', 'Code2', '#6366F1', 'Frontend, backend, and full-stack web development'),
  ('cat-data-sci', 'Data Science', 'data-science', 'BarChart3', '#8B5CF6', 'Machine learning, AI, and data analytics'),
  ('cat-cloud', 'Cloud Computing', 'cloud-computing', 'Cloud', '#3B82F6', 'AWS, Azure, GCP, and DevOps'),
  ('cat-mobile', 'Mobile Development', 'mobile-development', 'Smartphone', '#EC4899', 'iOS, Android, and cross-platform apps'),
  ('cat-cybersec', 'Cybersecurity', 'cybersecurity', 'Shield', '#EF4444', 'Security, ethical hacking, and compliance'),
  ('cat-dsa', 'Data Structures & Algorithms', 'dsa', 'Binary', '#F59E0B', 'Coding interviews and algorithmic thinking'),
  ('cat-devops', 'DevOps & CI/CD', 'devops', 'GitBranch', '#10B981', 'Docker, Kubernetes, and deployment pipelines'),
  ('cat-design', 'UI/UX Design', 'ui-ux-design', 'Palette', '#F97316', 'Design systems, Figma, and user research');

-- ============================================================
-- SAMPLE COURSES (trainer_id must be replaced with real UUIDs after seeding)
-- ============================================================

-- These will be linked to trainers after auth users are created.
-- Placeholder UUIDs are used here.

SELECT 'Categories seeded successfully. Create auth users via Supabase Auth, then run the application seed script.' AS status;
