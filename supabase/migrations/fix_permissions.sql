-- ============================================================
-- FALCON ENTERPRISE LMS — PERMISSION GRANT FIX
-- Run this in Supabase SQL Editor to grant table access to all roles
-- ============================================================

-- 1. Grant Schema Permissions
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role, public;

-- 2. Grant Permissions on all existing tables, sequences & routines
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, public;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, public;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role, public;

-- 3. Set Default Privileges for all future tables & sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role, public;

-- 4. Re-apply Open RLS Policies on every table
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public full access" ON public.%I;', t);
    EXECUTE format('CREATE POLICY "Public full access" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;
