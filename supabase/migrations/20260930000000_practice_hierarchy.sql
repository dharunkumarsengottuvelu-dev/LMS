-- ============================================================
-- FALCON ENTERPRISE LMS — Practice 3-Level Hierarchy Schema
-- Migration: 20260930000000_practice_hierarchy.sql
-- ============================================================

-- 1. Ensure practice_tracks (Main Module) has display_order and created_by
ALTER TABLE public.practice_tracks ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE public.practice_tracks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Create Level 2: practice_submodules (Child of practice_tracks)
CREATE TABLE IF NOT EXISTS public.practice_submodules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_module_id  UUID NOT NULL REFERENCES public.practice_tracks(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  display_order   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Level 3: practice_modules (Child of practice_submodules)
CREATE TABLE IF NOT EXISTS public.practice_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submodule_id    UUID NOT NULL REFERENCES public.practice_submodules(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  display_order   INT NOT NULL DEFAULT 0,
  type            TEXT NOT NULL DEFAULT 'mixed',
  duration_minutes INT NOT NULL DEFAULT 60,
  total_marks     INT NOT NULL DEFAULT 100,
  question_count  INT NOT NULL DEFAULT 0,
  mcq_questions   JSONB DEFAULT '[]'::jsonb,
  coding_questions JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Indexes for High Performance Hierarchical Lookups
CREATE INDEX IF NOT EXISTS idx_practice_submodules_main_module
  ON public.practice_submodules (main_module_id, display_order);

CREATE INDEX IF NOT EXISTS idx_practice_modules_submodule
  ON public.practice_modules (submodule_id, display_order);

-- 5. Row-Level Security
ALTER TABLE public.practice_submodules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_modules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'practice_submodules' AND policyname = 'practice_submodules_read_policy'
  ) THEN
    CREATE POLICY practice_submodules_read_policy ON public.practice_submodules
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'practice_submodules' AND policyname = 'practice_submodules_admin_all'
  ) THEN
    CREATE POLICY practice_submodules_admin_all ON public.practice_submodules
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'practice_modules' AND policyname = 'practice_modules_read_policy'
  ) THEN
    CREATE POLICY practice_modules_read_policy ON public.practice_modules
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'practice_modules' AND policyname = 'practice_modules_admin_all'
  ) THEN
    CREATE POLICY practice_modules_admin_all ON public.practice_modules
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
