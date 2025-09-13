-- Monitoring & Maintenance Database Schema

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric VARCHAR(100) NOT NULL,
  value DECIMAL NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('error', 'warning', 'info')),
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'general')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  page VARCHAR(255),
  user_agent TEXT,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id VARCHAR(100) NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  success BOOLEAN NOT NULL,
  duration INTEGER, -- milliseconds
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled updates table
CREATE TABLE IF NOT EXISTS scheduled_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Application drafts cleanup table (for maintenance)
CREATE TABLE IF NOT EXISTS application_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  draft_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric ON performance_metrics(metric);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_task_id ON maintenance_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_executed_at ON maintenance_logs(executed_at);

-- RLS Policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_drafts ENABLE ROW LEVEL SECURITY;

-- Admin access to monitoring tables
CREATE POLICY "Admin access to performance_metrics" ON performance_metrics FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access to system_alerts" ON system_alerts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access to error_logs" ON error_logs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access to maintenance_logs" ON maintenance_logs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access to scheduled_updates" ON scheduled_updates FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User feedback policies
CREATE POLICY "Users can insert their own feedback" ON user_feedback FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);

CREATE POLICY "Users can view their own feedback" ON user_feedback FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can update feedback status" ON user_feedback FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Application drafts policies
CREATE POLICY "Users can manage their own drafts" ON application_drafts FOR ALL TO authenticated USING (
  auth.uid() = user_id
);

-- Functions for cleanup
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM performance_metrics WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '7 days';
  DELETE FROM maintenance_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;