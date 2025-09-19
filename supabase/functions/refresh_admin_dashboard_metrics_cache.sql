-- Function: refresh_admin_dashboard_metrics_cache
-- Recomputes and stores the admin dashboard overview snapshot

CREATE OR REPLACE FUNCTION public.refresh_admin_dashboard_metrics_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overview jsonb;
BEGIN
  SELECT public.get_admin_dashboard_overview() INTO overview;

  INSERT INTO public.admin_dashboard_metrics_cache AS cache (id, metrics, generated_at)
  VALUES ('overview', overview, NOW())
  ON CONFLICT (id)
  DO UPDATE
    SET metrics = EXCLUDED.metrics,
        generated_at = EXCLUDED.generated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_admin_dashboard_metrics_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_admin_dashboard_metrics_cache() TO authenticated;
