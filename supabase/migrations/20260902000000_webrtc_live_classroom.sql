-- Migration: WebRTC Live Classroom Database Architecture
-- Creates and ensures tables for Live Classes, Sessions, Participants, and Attendance

-- 1. Live Classes Table
CREATE TABLE IF NOT EXISTS public.live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID,
  scheduled_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT DEFAULT 'upcoming', -- 'upcoming', 'live', 'completed', 'cancelled'
  is_common BOOLEAN DEFAULT true,
  assigned_batches TEXT[] DEFAULT '{}',
  assigned_students TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index on date and status
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled_date ON public.live_classes (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_live_classes_status ON public.live_classes (status);
CREATE INDEX IF NOT EXISTS idx_live_classes_trainer_id ON public.live_classes (trainer_id);

-- 2. Live Class Sessions Table (Running Classroom instance)
CREATE TABLE IF NOT EXISTS public.live_class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_class_sessions_class_id ON public.live_class_sessions (live_class_id);
CREATE INDEX IF NOT EXISTS idx_live_class_sessions_active ON public.live_class_sessions (active);

-- 3. Live Class Participants Table
CREATE TABLE IF NOT EXISTS public.live_class_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  attendance_status TEXT DEFAULT 'absent', -- 'attended', 'partial', 'absent'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (live_class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_class_participants_class_id ON public.live_class_participants (live_class_id);
CREATE INDEX IF NOT EXISTS idx_live_class_participants_student_id ON public.live_class_participants (student_id);

-- 4. Live Class Attendance Table (Automatic Detailed logs)
CREATE TABLE IF NOT EXISTS public.live_class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_name TEXT,
  student_email TEXT,
  cohort_batch TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  attendance_status TEXT DEFAULT 'attended', -- 'attended', 'partial', 'absent'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_class_attendance_class_id ON public.live_class_attendance (live_class_id);
CREATE INDEX IF NOT EXISTS idx_live_class_attendance_student_id ON public.live_class_attendance (student_id);

-- 5. RLS Policies
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_attendance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view live classes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read live_classes') THEN
    CREATE POLICY "Allow authenticated read live_classes" ON public.live_classes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read live_class_sessions') THEN
    CREATE POLICY "Allow authenticated read live_class_sessions" ON public.live_class_sessions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read live_class_participants') THEN
    CREATE POLICY "Allow authenticated read live_class_participants" ON public.live_class_participants FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read live_class_attendance') THEN
    CREATE POLICY "Allow authenticated read live_class_attendance" ON public.live_class_attendance FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
