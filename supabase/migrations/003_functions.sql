-- ============================================================
-- EduNexus Enterprise LMS — PostgreSQL Functions & Views
-- Migration: 003_functions.sql
-- ============================================================

-- ============================================================
-- FUNCTION: get_student_progress
-- ============================================================

CREATE OR REPLACE FUNCTION get_student_progress(
  p_student_id UUID,
  p_course_id UUID
)
RETURNS TABLE (
  completed_lessons BIGINT,
  total_lessons BIGINT,
  progress_percentage DECIMAL(5,2),
  time_spent_minutes INTEGER,
  last_accessed TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE) AS completed_lessons,
    COUNT(l.id) AS total_lessons,
    CASE
      WHEN COUNT(l.id) = 0 THEN 0
      ELSE (COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE)::DECIMAL / COUNT(l.id)) * 100
    END AS progress_percentage,
    COALESCE(SUM(lp.watched_seconds) / 60, 0)::INTEGER AS time_spent_minutes,
    MAX(lp.last_accessed) AS last_accessed
  FROM lessons l
  LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = p_student_id
  WHERE l.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- FUNCTION: calculate_leaderboard
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_leaderboard(
  p_course_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  student_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  total_score DECIMAL,
  assessments_completed BIGINT,
  courses_completed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH scores AS (
    SELECT
      p.id AS student_id,
      p.first_name,
      p.last_name,
      p.avatar_url,
      COALESCE(SUM(aa.score), 0) AS total_score,
      COUNT(DISTINCT aa.assessment_id) FILTER (WHERE aa.status = 'submitted') AS assessments_completed,
      COUNT(DISTINCT e.course_id) FILTER (WHERE e.status = 'completed') AS courses_completed
    FROM profiles p
    LEFT JOIN assessment_attempts aa ON aa.student_id = p.id
    LEFT JOIN enrollments e ON e.student_id = p.id
      AND (p_course_id IS NULL OR e.course_id = p_course_id)
    WHERE p.role = 'student' AND p.status = 'active'
    GROUP BY p.id, p.first_name, p.last_name, p.avatar_url
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY s.total_score DESC, s.assessments_completed DESC) AS rank,
    s.student_id,
    s.first_name,
    s.last_name,
    s.avatar_url,
    s.total_score,
    s.assessments_completed,
    s.courses_completed
  FROM scores s
  ORDER BY rank
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- FUNCTION: issue_certificate (auto-issue when course complete)
-- ============================================================

CREATE OR REPLACE FUNCTION issue_certificate(
  p_student_id UUID,
  p_course_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_cert_id UUID;
  v_progress DECIMAL;
BEGIN
  -- Check progress
  SELECT progress_percentage INTO v_progress
  FROM enrollments
  WHERE student_id = p_student_id AND course_id = p_course_id;

  IF v_progress < 100 THEN
    RAISE EXCEPTION 'Course not completed (%.2f%%)', v_progress;
  END IF;

  -- Insert or return existing certificate
  INSERT INTO certificates (student_id, course_id)
  VALUES (p_student_id, p_course_id)
  ON CONFLICT (student_id, course_id) DO NOTHING
  RETURNING id INTO v_cert_id;

  -- If cert already existed, fetch its id
  IF v_cert_id IS NULL THEN
    SELECT id INTO v_cert_id FROM certificates
    WHERE student_id = p_student_id AND course_id = p_course_id;
  END IF;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    p_student_id,
    'certificate_issued',
    'Certificate Issued!',
    'Congratulations! Your certificate for completing the course is ready.',
    '/student/certificates'
  );

  RETURN v_cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: evaluate_assessment_attempt
-- ============================================================

CREATE OR REPLACE FUNCTION evaluate_assessment_attempt(
  p_attempt_id UUID
)
RETURNS TABLE (
  score DECIMAL,
  total_marks DECIMAL,
  percentage DECIMAL,
  passed BOOLEAN,
  correct_count INTEGER,
  wrong_count INTEGER,
  unanswered_count INTEGER
) AS $$
DECLARE
  v_attempt assessment_attempts;
  v_assessment assessments;
  v_score DECIMAL := 0;
  v_correct INTEGER := 0;
  v_wrong INTEGER := 0;
  v_unanswered INTEGER := 0;
  v_question RECORD;
  v_student_answers TEXT[];
  v_correct_answers TEXT[];
  v_is_correct BOOLEAN;
BEGIN
  -- Fetch attempt
  SELECT * INTO v_attempt FROM assessment_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;

  -- Fetch assessment
  SELECT * INTO v_assessment FROM assessments WHERE id = v_attempt.assessment_id;

  -- Evaluate each question
  FOR v_question IN
    SELECT * FROM questions WHERE assessment_id = v_attempt.assessment_id
  LOOP
    v_student_answers := ARRAY(
      SELECT jsonb_array_elements_text(v_attempt.answers->v_question.id::TEXT)
    );
    v_correct_answers := v_question.correct_answers;

    IF array_length(v_student_answers, 1) IS NULL OR array_length(v_student_answers, 1) = 0 THEN
      v_unanswered := v_unanswered + 1;
    ELSE
      -- Check if answer is correct (handles both single and multiple choice)
      v_is_correct := (
        array_length(v_student_answers, 1) = array_length(v_correct_answers, 1)
        AND v_student_answers @> v_correct_answers
        AND v_correct_answers @> v_student_answers
      );

      IF v_is_correct THEN
        v_score := v_score + v_question.marks;
        v_correct := v_correct + 1;
      ELSIF v_assessment.negative_marking THEN
        v_score := v_score - v_question.negative_marks;
        v_wrong := v_wrong + 1;
      ELSE
        v_wrong := v_wrong + 1;
      END IF;
    END IF;
  END LOOP;

  -- Ensure score doesn't go below 0
  v_score := GREATEST(0, v_score);

  -- Update attempt record
  UPDATE assessment_attempts SET
    score = v_score,
    total_marks = v_assessment.total_marks,
    percentage = (v_score / NULLIF(v_assessment.total_marks, 0)) * 100,
    passed = v_score >= v_assessment.passing_marks,
    status = 'evaluated',
    submitted_at = COALESCE(submitted_at, NOW())
  WHERE id = p_attempt_id;

  RETURN QUERY SELECT
    v_score,
    v_assessment.total_marks,
    (v_score / NULLIF(v_assessment.total_marks, 0)) * 100,
    v_score >= v_assessment.passing_marks,
    v_correct,
    v_wrong,
    v_unanswered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: get_admin_dashboard_stats
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_students', (SELECT COUNT(*) FROM profiles WHERE role = 'student' AND status = 'active'),
    'total_trainers', (SELECT COUNT(*) FROM profiles WHERE role = 'trainer' AND status = 'active'),
    'total_courses', (SELECT COUNT(*) FROM courses WHERE status = 'published'),
    'total_assessments', (SELECT COUNT(*) FROM assessments WHERE status = 'active'),
    'total_tests', (SELECT COUNT(*) FROM tests WHERE status != 'cancelled'),
    'total_coding_problems', (SELECT COUNT(*) FROM coding_problems),
    'active_enrollments', (SELECT COUNT(*) FROM enrollments WHERE status = 'active'),
    'recent_registrations', (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '7 days'),
    'certificates_issued', (SELECT COUNT(*) FROM certificates),
    'pending_submissions', (SELECT COUNT(*) FROM assignment_submissions WHERE status = 'submitted')
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- VIEW: student_dashboard_view
-- ============================================================

CREATE OR REPLACE VIEW student_dashboard_data AS
SELECT
  p.id AS student_id,
  p.first_name,
  p.last_name,
  COUNT(DISTINCT e.course_id) AS enrolled_courses,
  COUNT(DISTINCT e.course_id) FILTER (WHERE e.status = 'completed') AS completed_courses,
  COUNT(DISTINCT aa.assessment_id) FILTER (WHERE aa.status = 'submitted') AS completed_assessments,
  COUNT(DISTINCT cs.problem_id) FILTER (WHERE cs.status = 'accepted') AS solved_problems,
  COUNT(DISTINCT cert.id) AS certificates_earned,
  AVG(aa.percentage) FILTER (WHERE aa.status = 'submitted') AS avg_score
FROM profiles p
LEFT JOIN enrollments e ON e.student_id = p.id
LEFT JOIN assessment_attempts aa ON aa.student_id = p.id
LEFT JOIN coding_submissions cs ON cs.student_id = p.id
LEFT JOIN certificates cert ON cert.student_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.first_name, p.last_name;
