-- Deploy admin_dashboard_metrics_cache snapshot storage and refresh job
CREATE EXTENSION IF NOT EXISTS pg_cron;

BEGIN;
  CREATE TABLE IF NOT EXISTS public.admin_dashboard_metrics_cache (
    id text PRIMARY KEY,
    metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
    generated_at timestamptz NOT NULL DEFAULT NOW()
  );

  COMMENT ON TABLE public.admin_dashboard_metrics_cache IS 'Stores cached admin dashboard overview metrics for quick retrieval.';
  COMMENT ON COLUMN public.admin_dashboard_metrics_cache.metrics IS 'Serialized metrics payload produced by get_admin_dashboard_overview.';
  COMMENT ON COLUMN public.admin_dashboard_metrics_cache.generated_at IS 'Timestamp indicating when the snapshot was generated.';

  GRANT SELECT ON TABLE public.admin_dashboard_metrics_cache TO authenticated;
  GRANT SELECT ON TABLE public.admin_dashboard_metrics_cache TO service_role;

  \ir ../functions/refresh_admin_dashboard_metrics_cache.sql

  -- Ensure a fresh cron schedule exists to refresh the snapshot every minute
  DO $$
  DECLARE
    existing_job_id bigint;
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'refresh-admin-dashboard-metrics-cache'
    ) THEN
      SELECT jobid
      INTO existing_job_id
      FROM cron.job
      WHERE jobname = 'refresh-admin-dashboard-metrics-cache'
      LIMIT 1;

      IF existing_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(existing_job_id);
      END IF;
    END IF;

    PERFORM cron.schedule(
      'refresh-admin-dashboard-metrics-cache',
      '* * * * *',
      $$SELECT public.refresh_admin_dashboard_metrics_cache();$$
    );
  END
  $$;

  -- Seed the cache immediately so the API has data before the first cron run
  PERFORM public.refresh_admin_dashboard_metrics_cache();
COMMIT;
