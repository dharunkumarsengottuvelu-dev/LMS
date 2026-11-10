-- ============================================================
-- SENSILEARN LMS — RLS Query Planner Optimization Rollback
-- Migration: 20261110_optimize_rls_functions_down.sql
-- ============================================================

-- 1. Revert user_role() to legacy implementation
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 2. Revert profile_id() to legacy implementation
CREATE OR REPLACE FUNCTION public.profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 3. Revert is_enrolled() to legacy implementation
CREATE OR REPLACE FUNCTION public.is_enrolled(p_course_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = public.profile_id()
    AND course_id = p_course_id
    AND status != 'dropped'
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 4. Drop supporting index
DROP INDEX IF EXISTS idx_enrollments_student_course_active;

