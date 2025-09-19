-- Function: get_admin_dashboard_overview
-- Provides aggregated metrics for the admin dashboard in a single RPC call

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overview jsonb;
BEGIN
  WITH status_counts AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'draft') AS draft,
      COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
      COUNT(*) FILTER (WHERE status = 'under_review') AS under_review,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
    FROM applications_new
  ),
  active_programs AS (
    SELECT COUNT(*) AS count
    FROM programs
    WHERE COALESCE(is_active, false) = true
  ),
  active_intakes AS (
    SELECT COUNT(*) AS count
    FROM intakes
    WHERE COALESCE(is_active, false) = true
      AND (
        start_date IS NULL
        OR end_date IS NULL
        OR CURRENT_DATE BETWEEN start_date AND end_date
      )
  ),
  student_totals AS (
    SELECT COUNT(*) AS count
    FROM user_profiles
    WHERE role = 'student'
  ),
  date_buckets AS (
    SELECT
      COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW())) AS today,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS this_week,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS this_month
    FROM applications_new
  ),
  processing AS (
    SELECT
      ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(reviewed_at, updated_at, NOW()) - submitted_at)))/3600, 2) AS average_hours,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (COALESCE(reviewed_at, updated_at, NOW()) - submitted_at))/3600
      ), 2) AS median_hours,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (COALESCE(reviewed_at, updated_at, NOW()) - submitted_at))/3600
      ), 2) AS p95_hours,
      COUNT(*) FILTER (
        WHERE status IN ('approved', 'rejected')
          AND COALESCE(reviewed_at, updated_at, NOW()) >= NOW() - INTERVAL '24 hours'
      ) AS decision_velocity_24h,
      COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')) AS completed_count
    FROM applications_new
    WHERE submitted_at IS NOT NULL
  ),
  active_admins AS (
    SELECT
      COUNT(DISTINCT ds.user_id) FILTER (
        WHERE ds.last_activity >= NOW() - INTERVAL '24 hours' AND ds.is_active = true
      ) AS active_last_24h,
      COUNT(DISTINCT ds.user_id) FILTER (
        WHERE ds.last_activity >= NOW() - INTERVAL '7 days' AND ds.is_active = true
      ) AS active_last_7d
    FROM device_sessions ds
    WHERE ds.user_id IN (
      SELECT user_id
      FROM user_roles
      WHERE role IN ('admin', 'super_admin', 'admissions_officer')
        AND is_active = true
    )
  ),
  recent AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'full_name', a.full_name,
          'status', a.status,
          'payment_status', a.payment_status,
          'submitted_at', a.submitted_at,
          'updated_at', a.updated_at,
          'created_at', a.created_at,
          'program', a.program,
          'intake', a.intake
        )
        ORDER BY COALESCE(a.updated_at, a.created_at) DESC
      ) AS items
    FROM (
      SELECT
        id,
        full_name,
        status,
        payment_status,
        submitted_at,
        updated_at,
        created_at,
        program,
        intake
      FROM applications_new
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 10
    ) a
  )
  SELECT jsonb_build_object(
    'status_counts', jsonb_build_object(
      'total', COALESCE(status_counts.total, 0),
      'draft', COALESCE(status_counts.draft, 0),
      'submitted', COALESCE(status_counts.submitted, 0),
      'under_review', COALESCE(status_counts.under_review, 0),
      'approved', COALESCE(status_counts.approved, 0),
      'rejected', COALESCE(status_counts.rejected, 0)
    ),
    'totals', jsonb_build_object(
      'active_programs', COALESCE(active_programs.count, 0),
      'active_intakes', COALESCE(active_intakes.count, 0),
      'students', COALESCE(student_totals.count, 0)
    ),
    'application_counts', jsonb_build_object(
      'today', COALESCE(date_buckets.today, 0),
      'this_week', COALESCE(date_buckets.this_week, 0),
      'this_month', COALESCE(date_buckets.this_month, 0)
    ),
    'processing_metrics', jsonb_build_object(
      'average_hours', COALESCE(processing.average_hours, 0),
      'median_hours', COALESCE(processing.median_hours, 0),
      'p95_hours', COALESCE(processing.p95_hours, 0),
      'decision_velocity_24h', COALESCE(processing.decision_velocity_24h, 0),
      'completed_count', COALESCE(processing.completed_count, 0),
      'active_admins_last_24h', COALESCE(active_admins.active_last_24h, 0),
      'active_admins_last_7d', COALESCE(active_admins.active_last_7d, 0)
    ),
    'recent_activity', COALESCE(recent.items, '[]'::jsonb)
  )
  INTO overview
  FROM status_counts
  CROSS JOIN active_programs
  CROSS JOIN active_intakes
  CROSS JOIN student_totals
  CROSS JOIN date_buckets
  CROSS JOIN processing
  CROSS JOIN active_admins
  CROSS JOIN recent;

  RETURN overview;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_overview() TO service_role;
