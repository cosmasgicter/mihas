-- Supabase Database Optimization and Performance Enhancements
-- Run these SQL commands in your Supabase SQL editor

-- ============================================================================
-- 1. DATABASE INDEXING FOR PERFORMANCE
-- ============================================================================

-- Applications table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_user_id ON applications_new(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_status ON applications_new(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_payment_status ON applications_new(payment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_program ON applications_new(program);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_intake ON applications_new(intake);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_submitted_at ON applications_new(submitted_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_created_at ON applications_new(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_tracking_code ON applications_new(public_tracking_code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_email ON applications_new(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_nrc ON applications_new(nrc_number) WHERE nrc_number IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_passport ON applications_new(passport_number) WHERE passport_number IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_status_program ON applications_new(status, program);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_payment_status_created ON applications_new(payment_status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_user_status ON applications_new(user_id, status);

-- User profiles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_email ON user_profiles(email) WHERE email IS NOT NULL;

-- Application documents indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_documents_app_id ON application_documents(application_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_documents_type ON application_documents(document_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_documents_status ON application_documents(verification_status);

-- Application grades indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_grades_app_id ON application_grades(application_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_grades_subject_id ON application_grades(subject_id);

-- Email notifications indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_notifications_app_id ON email_notifications(application_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);

-- ============================================================================
-- 2. DATA ARCHIVING FOR COMPLETED APPLICATIONS
-- ============================================================================

-- Create archived applications table
CREATE TABLE IF NOT EXISTS archived_applications (
  LIKE applications_new INCLUDING ALL
);

-- Add archival metadata
ALTER TABLE archived_applications 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Function to archive old applications
CREATE OR REPLACE FUNCTION archive_old_applications(
  p_cutoff_date DATE DEFAULT (CURRENT_DATE - INTERVAL '2 years')
) RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Move applications older than cutoff date to archive
  WITH archived AS (
    INSERT INTO archived_applications 
    SELECT *, NOW(), auth.uid(), 'Automatic archival - older than 2 years'
    FROM applications_new 
    WHERE created_at < p_cutoff_date 
    AND status IN ('approved', 'rejected')
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM archived;
  
  -- Delete from main table
  DELETE FROM applications_new 
  WHERE created_at < p_cutoff_date 
  AND status IN ('approved', 'rejected');
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. DATABASE MONITORING AND ALERTING
-- ============================================================================

-- Create monitoring table for database metrics
CREATE TABLE IF NOT EXISTS db_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit VARCHAR(20),
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  status VARCHAR(20) DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to check database health
CREATE OR REPLACE FUNCTION check_database_health() RETURNS TABLE (
  metric VARCHAR(100),
  current_value NUMERIC,
  status VARCHAR(20),
  message TEXT
) AS $$
BEGIN
  -- Check table sizes
  RETURN QUERY
  SELECT 
    'applications_table_size'::VARCHAR(100),
    pg_total_relation_size('applications_new')::NUMERIC / 1024 / 1024, -- MB
    CASE 
      WHEN pg_total_relation_size('applications_new') > 1073741824 THEN 'warning'::VARCHAR(20) -- 1GB
      WHEN pg_total_relation_size('applications_new') > 5368709120 THEN 'critical'::VARCHAR(20) -- 5GB
      ELSE 'normal'::VARCHAR(20)
    END,
    'Applications table size in MB'::TEXT;
    
  -- Check application count
  RETURN QUERY
  SELECT 
    'total_applications'::VARCHAR(100),
    (SELECT COUNT(*)::NUMERIC FROM applications_new),
    CASE 
      WHEN (SELECT COUNT(*) FROM applications_new) > 10000 THEN 'warning'::VARCHAR(20)
      WHEN (SELECT COUNT(*) FROM applications_new) > 50000 THEN 'critical'::VARCHAR(20)
      ELSE 'normal'::VARCHAR(20)
    END,
    'Total number of applications'::TEXT;
    
  -- Check pending applications
  RETURN QUERY
  SELECT 
    'pending_applications'::VARCHAR(100),
    (SELECT COUNT(*)::NUMERIC FROM applications_new WHERE status = 'under_review'),
    CASE 
      WHEN (SELECT COUNT(*) FROM applications_new WHERE status = 'under_review') > 100 THEN 'warning'::VARCHAR(20)
      WHEN (SELECT COUNT(*) FROM applications_new WHERE status = 'under_review') > 500 THEN 'critical'::VARCHAR(20)
      ELSE 'normal'::VARCHAR(20)
    END,
    'Applications pending review'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. DATABASE MAINTENANCE SCHEDULES
-- ============================================================================

-- Function for routine maintenance
CREATE OR REPLACE FUNCTION perform_maintenance() RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  vacuum_result TEXT;
  analyze_result TEXT;
BEGIN
  -- Vacuum and analyze main tables
  EXECUTE 'VACUUM ANALYZE applications_new';
  result := result || 'Vacuumed applications_new. ';
  
  EXECUTE 'VACUUM ANALYZE user_profiles';
  result := result || 'Vacuumed user_profiles. ';
  
  EXECUTE 'VACUUM ANALYZE application_documents';
  result := result || 'Vacuumed application_documents. ';
  
  -- Update table statistics
  EXECUTE 'ANALYZE applications_new';
  EXECUTE 'ANALYZE user_profiles';
  EXECUTE 'ANALYZE application_documents';
  result := result || 'Updated table statistics. ';
  
  -- Log maintenance activity
  INSERT INTO db_monitoring (metric_name, metric_value, metric_unit, status)
  VALUES ('maintenance_completed', 1, 'boolean', 'normal');
  
  RETURN result || 'Maintenance completed at ' || NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. BACKUP AND RECOVERY PROCEDURES
-- ============================================================================

-- Create backup metadata table
CREATE TABLE IF NOT EXISTS backup_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'schema_only'
  table_name VARCHAR(100),
  backup_size_bytes BIGINT,
  backup_location TEXT,
  backup_status VARCHAR(20) DEFAULT 'in_progress' CHECK (backup_status IN ('in_progress', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to create logical backup metadata
CREATE OR REPLACE FUNCTION create_backup_record(
  p_backup_type VARCHAR(50),
  p_table_name VARCHAR(100) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  backup_id UUID;
BEGIN
  INSERT INTO backup_metadata (backup_type, table_name, created_by)
  VALUES (p_backup_type, p_table_name, auth.uid())
  RETURNING id INTO backup_id;
  
  RETURN backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update backup status
CREATE OR REPLACE FUNCTION update_backup_status(
  p_backup_id UUID,
  p_status VARCHAR(20),
  p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE backup_metadata 
  SET 
    backup_status = p_status,
    completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
    error_message = p_error_message
  WHERE id = p_backup_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for application processing metrics
CREATE OR REPLACE VIEW application_metrics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE status = 'submitted') as submitted_count,
  COUNT(*) FILTER (WHERE status = 'under_review') as under_review_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE payment_status = 'verified') as paid_count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_processing_hours
FROM applications_new
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- View for system performance metrics
CREATE OR REPLACE VIEW system_performance AS
SELECT 
  'applications_new' as table_name,
  pg_size_pretty(pg_total_relation_size('applications_new')) as table_size,
  (SELECT COUNT(*) FROM applications_new) as row_count,
  (SELECT COUNT(*) FROM applications_new WHERE created_at >= CURRENT_DATE) as today_count,
  (SELECT COUNT(*) FROM applications_new WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_count
UNION ALL
SELECT 
  'user_profiles' as table_name,
  pg_size_pretty(pg_total_relation_size('user_profiles')) as table_size,
  (SELECT COUNT(*) FROM user_profiles) as row_count,
  (SELECT COUNT(*) FROM user_profiles WHERE created_at >= CURRENT_DATE) as today_count,
  (SELECT COUNT(*) FROM user_profiles WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_count;

-- ============================================================================
-- 7. AUTOMATED CLEANUP PROCEDURES
-- ============================================================================

-- Function to clean up old draft applications
CREATE OR REPLACE FUNCTION cleanup_old_drafts(
  p_days_old INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete draft applications older than specified days
  DELETE FROM applications_new 
  WHERE status = 'draft' 
  AND created_at < (CURRENT_DATE - INTERVAL '1 day' * p_days_old);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO db_monitoring (metric_name, metric_value, metric_unit, status)
  VALUES ('drafts_cleaned', deleted_count, 'count', 'normal');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old monitoring data
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data(
  p_days_old INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM db_monitoring 
  WHERE created_at < (CURRENT_DATE - INTERVAL '1 day' * p_days_old);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on monitoring tables
ALTER TABLE db_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_applications ENABLE ROW LEVEL SECURITY;

-- Policies for db_monitoring
CREATE POLICY "Admins can view monitoring data" ON db_monitoring
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

CREATE POLICY "System can insert monitoring data" ON db_monitoring
  FOR INSERT WITH CHECK (true);

-- Policies for backup_metadata
CREATE POLICY "Admins can manage backups" ON backup_metadata
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- Policies for archived_applications
CREATE POLICY "Admins can view archived applications" ON archived_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION check_database_health() TO authenticated;
GRANT EXECUTE ON FUNCTION perform_maintenance() TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_applications(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_drafts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_monitoring_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_backup_record(VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_backup_status(UUID, VARCHAR, TEXT) TO authenticated;

-- Grant select permissions on views
GRANT SELECT ON application_metrics TO authenticated;
GRANT SELECT ON system_performance TO authenticated;

COMMENT ON TABLE db_monitoring IS 'Stores database performance and health metrics';
COMMENT ON TABLE backup_metadata IS 'Tracks database backup operations and metadata';
COMMENT ON TABLE archived_applications IS 'Stores archived applications for long-term retention';
COMMENT ON FUNCTION check_database_health() IS 'Returns current database health metrics and status';
COMMENT ON FUNCTION perform_maintenance() IS 'Performs routine database maintenance tasks';
COMMENT ON FUNCTION archive_old_applications(DATE) IS 'Archives applications older than specified date';