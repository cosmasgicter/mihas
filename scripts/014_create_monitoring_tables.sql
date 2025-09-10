-- Web vitals tracking table
CREATE TABLE IF NOT EXISTS web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  rating TEXT,
  delta NUMERIC,
  metric_id TEXT,
  user_agent TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_name ON web_vitals(metric_name);
CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON web_vitals(created_at);

-- Custom metrics table
CREATE TABLE IF NOT EXISTS custom_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT DEFAULT 'ms',
  timestamp TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_metrics_name ON custom_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_custom_metrics_timestamp ON custom_metrics(timestamp);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  user_id UUID REFERENCES auth.users(id),
  url TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'error',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'cpu', 'memory', 'disk', 'network', etc.
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  hostname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);

-- Enable RLS on monitoring tables
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for monitoring tables (admin access only)
CREATE POLICY "admin_read_web_vitals" ON web_vitals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('super_admin', 'registrar')
        AND r.revoked_at IS NULL
    )
  );

CREATE POLICY "admin_read_custom_metrics" ON custom_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('super_admin', 'registrar')
        AND r.revoked_at IS NULL
    )
  );

CREATE POLICY "admin_read_error_logs" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('super_admin', 'registrar')
        AND r.revoked_at IS NULL
    )
  );

CREATE POLICY "admin_read_system_metrics" ON system_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('super_admin', 'registrar')
        AND r.revoked_at IS NULL
    )
  );

-- Function to clean up old monitoring data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Keep web vitals for 30 days
  DELETE FROM web_vitals WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Keep custom metrics for 90 days
  DELETE FROM custom_metrics WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Keep error logs for 90 days
  DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Keep system metrics for 7 days
  DELETE FROM system_metrics WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;
