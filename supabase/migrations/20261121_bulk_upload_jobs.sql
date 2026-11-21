-- ============================================================
-- MIGRATION: 20261121_bulk_upload_jobs.sql
-- Enterprise Bulk Question Upload Jobs & Record Traceability
-- ============================================================

-- Table: bulk_upload_jobs
CREATE TABLE IF NOT EXISTS public.bulk_upload_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename   TEXT NOT NULL,
  uploaded_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_records       INTEGER NOT NULL DEFAULT 0,
  validated_records   INTEGER NOT NULL DEFAULT 0,
  processing_records  INTEGER NOT NULL DEFAULT 0,
  successful_records  INTEGER NOT NULL DEFAULT 0,
  failed_records      INTEGER NOT NULL DEFAULT 0,
  duplicate_records   INTEGER NOT NULL DEFAULT 0,
  current_batch       INTEGER NOT NULL DEFAULT 0,
  total_batches       INTEGER NOT NULL DEFAULT 0,
  upload_status       TEXT NOT NULL DEFAULT 'CREATED',
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  last_error          TEXT,
  retry_count         INTEGER NOT NULL DEFAULT 0,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: bulk_upload_job_records
CREATE TABLE IF NOT EXISTS public.bulk_upload_job_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID NOT NULL REFERENCES public.bulk_upload_jobs(id) ON DELETE CASCADE,
  source_row_number   INTEGER NOT NULL,
  title               TEXT NOT NULL,
  difficulty          TEXT,
  status              TEXT NOT NULL DEFAULT 'PENDING',
  problem_id          UUID REFERENCES public.coding_problems(id) ON DELETE SET NULL,
  error_message       TEXT,
  error_category      TEXT,
  retry_count         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast lookups & monitoring queries
CREATE INDEX IF NOT EXISTS idx_bulk_upload_jobs_status ON public.bulk_upload_jobs(upload_status);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_jobs_uploaded_by ON public.bulk_upload_jobs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_jobs_created_at ON public.bulk_upload_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_upload_records_job_id ON public.bulk_upload_job_records(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_records_status ON public.bulk_upload_job_records(status);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_records_row ON public.bulk_upload_job_records(job_id, source_row_number);

-- Enable Row Level Security
ALTER TABLE public.bulk_upload_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_upload_job_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins and Trainers have full read/write
CREATE POLICY "bulk_upload_jobs_select" ON public.bulk_upload_jobs FOR SELECT
  USING (public.user_role() IN ('admin', 'super_admin', 'trainer'));

CREATE POLICY "bulk_upload_jobs_write" ON public.bulk_upload_jobs FOR ALL
  USING (public.user_role() IN ('admin', 'super_admin', 'trainer'));

CREATE POLICY "bulk_upload_records_select" ON public.bulk_upload_job_records FOR SELECT
  USING (public.user_role() IN ('admin', 'super_admin', 'trainer'));

CREATE POLICY "bulk_upload_records_write" ON public.bulk_upload_job_records FOR ALL
  USING (public.user_role() IN ('admin', 'super_admin', 'trainer'));
