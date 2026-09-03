-- Migration: Enterprise Live Meeting Architecture (Access Modes, Join Requests, Host Sessions)

-- 1. Extend live_classes table
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS access_mode TEXT DEFAULT 'ask_to_join'; -- 'open', 'ask_to_join', 'restricted'
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS host_session_id TEXT DEFAULT '';
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- 2. Create Join Requests Table
CREATE TABLE IF NOT EXISTS public.live_class_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT DEFAULT '',
  user_role TEXT DEFAULT 'student',
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired', 'cancelled'
  requested_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for rapid lookup by class and status
CREATE INDEX IF NOT EXISTS idx_join_requests_class_status ON public.live_class_join_requests (live_class_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON public.live_class_join_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_class_user ON public.live_class_join_requests (live_class_id, user_id);

-- 3. Enable RLS
ALTER TABLE public.live_class_join_requests ENABLE ROW LEVEL SECURITY;

-- Policies for live_class_join_requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read live_class_join_requests') THEN
    CREATE POLICY "Allow authenticated read live_class_join_requests" ON public.live_class_join_requests FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert live_class_join_requests') THEN
    CREATE POLICY "Allow authenticated insert live_class_join_requests" ON public.live_class_join_requests FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated update live_class_join_requests') THEN
    CREATE POLICY "Allow authenticated update live_class_join_requests" ON public.live_class_join_requests FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
