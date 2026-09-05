-- ============================================================
-- EduNexus Enterprise LMS — Institution Performance Portal Schema
-- Migration: 20260905000000_institution_portal.sql
-- ============================================================

-- 1. Create institutions table if not exists
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  website TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create institution_batches mapping table
CREATE TABLE IF NOT EXISTS public.institution_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id, batch_id)
);

-- 3. Composite indexes for high-speed multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_institution_batches_inst_batch
  ON public.institution_batches (institution_id, batch_id);

CREATE INDEX IF NOT EXISTS idx_institution_batches_batch
  ON public.institution_batches (batch_id);

-- 4. Ensure profiles table supports institution role and optional institution reference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch TEXT;

-- 5. Row-level security for multi-tenant safety
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_batches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read institution records if assigned
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'institutions' AND policyname = 'institutions_read_policy'
  ) THEN
    CREATE POLICY institutions_read_policy ON public.institutions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'institution_batches' AND policyname = 'institution_batches_read_policy'
  ) THEN
    CREATE POLICY institution_batches_read_policy ON public.institution_batches
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
