-- ============================================================
-- SENSILEARN LMS — RLS Query Planner Optimization Migration
-- Migration: 20261110_optimize_rls_functions.sql
-- 
-- Performance Impact:
-- Eliminates N+1 recursive profile lookups during RLS evaluation.
-- Prioritizes in-memory JWT metadata lookup for roles (0ms, zero DB I/O).
-- Wraps auth.uid() in scalar subquery (SELECT auth.uid()) so PostgreSQL
-- evaluates it once per query (InitPlan) rather than once per row.
-- ============================================================

-- 1. Optimized user_role() with JWT in-memory fast path
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (
      SELECT role::TEXT
      FROM public.profiles
      WHERE user_id = (SELECT auth.uid())
      LIMIT 1
    )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- 2. Optimized profile_id() with cached scalar subquery
CREATE OR REPLACE FUNCTION public.profile_id()
RETURNS UUID AS $$
  SELECT id
  FROM public.profiles
  WHERE user_id = (SELECT auth.uid())
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- 3. Optimized is_enrolled() with scalar subqueries
CREATE OR REPLACE FUNCTION public.is_enrolled(p_course_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE student_id = (SELECT public.profile_id())
      AND course_id = p_course_id
      AND status != 'dropped'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- 4. Composite index to support RLS is_enrolled lookups instantaneously
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_student_course_active
  ON public.enrollments (student_id, course_id)
  WHERE status != 'dropped';

