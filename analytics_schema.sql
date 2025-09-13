-- Analytics and Reporting Schema
-- This file contains the database schema for analytics and reporting features

-- Application Statistics Table
CREATE TABLE IF NOT EXISTS application_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_applications INTEGER DEFAULT 0,
  submitted_applications INTEGER DEFAULT 0,
  approved_applications INTEGER DEFAULT 0,
  rejected_applications INTEGER DEFAULT 0,
  pending_applications INTEGER DEFAULT 0,
  program_id UUID REFERENCES programs(id),
  intake_id UUID REFERENCES intakes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Engagement Metrics Table
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  page_path TEXT,
  action_type TEXT, -- 'page_view', 'form_start', 'form_submit', 'document_upload', etc.
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course/Program Analytics Table
CREATE TABLE IF NOT EXISTS program_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES programs(id),
  date DATE NOT NULL,
  applications_count INTEGER DEFAULT 0,
  approval_rate DECIMAL(5,2),
  completion_rate DECIMAL(5,2),
  average_processing_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eligibility Success Rate Tracking
CREATE TABLE IF NOT EXISTS eligibility_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_eligibility_checks INTEGER DEFAULT 0,
  passed_eligibility INTEGER DEFAULT 0,
  failed_eligibility INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  common_failure_reasons JSONB,
  program_id UUID REFERENCES programs(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automated Reports Table
CREATE TABLE IF NOT EXISTS automated_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'regulatory'
  report_name TEXT NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  file_url TEXT,
  status TEXT DEFAULT 'generated' -- 'generated', 'sent', 'archived'
);

-- System Performance Metrics
CREATE TABLE IF NOT EXISTS system_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,2),
  metric_unit TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_application_statistics_date ON application_statistics(date);
CREATE INDEX IF NOT EXISTS idx_application_statistics_program ON application_statistics(program_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_created_at ON user_engagement_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_program_analytics_date ON program_analytics(date);
CREATE INDEX IF NOT EXISTS idx_program_analytics_program ON program_analytics(program_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_analytics_date ON eligibility_analytics(date);
CREATE INDEX IF NOT EXISTS idx_automated_reports_type ON automated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_system_performance_recorded_at ON system_performance_metrics(recorded_at);

-- Create RLS policies
ALTER TABLE application_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Admin access policies
CREATE POLICY "Admin can view all application statistics" ON application_statistics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can view all user engagement metrics" ON user_engagement_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can view all program analytics" ON program_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can view all eligibility analytics" ON eligibility_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can view all automated reports" ON automated_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can view all system performance metrics" ON system_performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Insert policies for system to record metrics
CREATE POLICY "System can insert engagement metrics" ON user_engagement_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert performance metrics" ON system_performance_metrics
  FOR INSERT WITH CHECK (true);

-- Functions for automated data aggregation
CREATE OR REPLACE FUNCTION update_daily_application_statistics()
RETURNS void AS $$
BEGIN
  INSERT INTO application_statistics (date, total_applications, submitted_applications, approved_applications, rejected_applications, pending_applications)
  SELECT 
    CURRENT_DATE,
    COUNT(*) as total_applications,
    COUNT(*) FILTER (WHERE status = 'submitted') as submitted_applications,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_applications,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_applications,
    COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review')) as pending_applications
  FROM applications_new
  WHERE DATE(created_at) = CURRENT_DATE
  ON CONFLICT (date) DO UPDATE SET
    total_applications = EXCLUDED.total_applications,
    submitted_applications = EXCLUDED.submitted_applications,
    approved_applications = EXCLUDED.approved_applications,
    rejected_applications = EXCLUDED.rejected_applications,
    pending_applications = EXCLUDED.pending_applications,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_program_analytics()
RETURNS void AS $$
BEGIN
  INSERT INTO program_analytics (program_id, date, applications_count, approval_rate, average_processing_days)
  SELECT 
    program_id,
    CURRENT_DATE,
    COUNT(*) as applications_count,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'approved')::decimal / NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')), 0)) * 100,
      2
    ) as approval_rate,
    ROUND(
      AVG(EXTRACT(days FROM (COALESCE(reviewed_at, NOW()) - submitted_at)))
    ) as average_processing_days
  FROM applications_new
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY program_id
  ON CONFLICT (program_id, date) DO UPDATE SET
    applications_count = EXCLUDED.applications_count,
    approval_rate = EXCLUDED.approval_rate,
    average_processing_days = EXCLUDED.average_processing_days,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;