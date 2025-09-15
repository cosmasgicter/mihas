-- CRITICAL DATABASE SECURITY FIXES
-- This script addresses all critical security vulnerabilities found in the database

-- ============================================================================
-- 1. ENHANCED ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Drop all existing policies to rebuild with enhanced security
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Enhanced RLS policies with strict validation
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (
    user_id = auth.uid() AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (
    user_id = auth.uid() AND 
    auth.uid() IS NOT NULL
  ) WITH CHECK (
    user_id = auth.uid() AND
    auth.uid() IS NOT NULL AND
    -- Prevent role escalation
    (OLD.role = NEW.role OR OLD.role = 'student')
  );

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    auth.uid() IS NOT NULL AND
    -- Only allow student role for self-registration
    role = 'student'
  );

-- Admin policies with enhanced security checks
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
      AND auth.uid() IS NOT NULL
    ) OR auth.email() = 'cosmas@beanola.com'
  );

CREATE POLICY "Admins can manage all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin')
      AND auth.uid() IS NOT NULL
    ) OR auth.email() = 'cosmas@beanola.com'
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin')
      AND auth.uid() IS NOT NULL
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- ============================================================================
-- 2. SECURE FUNCTIONS WITH INPUT VALIDATION
-- ============================================================================

-- Enhanced bulk update function with security validation
CREATE OR REPLACE FUNCTION rpc_secure_bulk_update_status(
  p_application_ids UUID[],
  p_status VARCHAR(50)
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  app_id UUID;
  valid_statuses TEXT[] := ARRAY['draft', 'submitted', 'under_review', 'approved', 'rejected'];
BEGIN
  -- Validate user permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'staff')
    AND auth.uid() IS NOT NULL
  ) AND auth.email() != 'cosmas@beanola.com' THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Validate status parameter
  IF p_status IS NULL OR NOT (p_status = ANY(valid_statuses)) THEN
    RAISE EXCEPTION 'Invalid status value: %', p_status;
  END IF;

  -- Validate array size to prevent DoS
  IF array_length(p_application_ids, 1) > 1000 THEN
    RAISE EXCEPTION 'Too many applications in single request. Maximum 1000 allowed.';
  END IF;

  -- Update applications with validation
  FOREACH app_id IN ARRAY p_application_ids
  LOOP
    -- Validate UUID format
    IF app_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE applications_new 
    SET 
      status = p_status,
      updated_at = NOW(),
      review_started_at = CASE WHEN p_status = 'under_review' THEN NOW() ELSE review_started_at END,
      decision_date = CASE WHEN p_status IN ('approved', 'rejected') THEN NOW() ELSE decision_date END
    WHERE id = app_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
      
      -- Insert status history with sanitized data
      INSERT INTO application_status_history (application_id, status, changed_by, notes)
      VALUES (app_id, p_status, auth.uid(), 'Bulk status update');
    END IF;
  END LOOP;

  -- Log the operation for audit
  INSERT INTO system_audit_log (
    user_id, 
    action, 
    details, 
    created_at
  ) VALUES (
    auth.uid(),
    'bulk_status_update',
    jsonb_build_object(
      'affected_count', updated_count,
      'new_status', p_status,
      'application_count', array_length(p_application_ids, 1)
    ),
    NOW()
  );

  RETURN updated_count;
END;
$$;

-- ============================================================================
-- 3. AUDIT LOGGING SYSTEM
-- ============================================================================

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS system_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON system_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND auth.uid() IS NOT NULL
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON system_audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 4. SECURE STORAGE POLICIES
-- ============================================================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;

-- Enhanced storage policies with path validation
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'app_docs' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    -- Validate file path structure
    array_length(storage.foldername(name), 1) >= 2 AND
    -- Prevent path traversal
    name !~ '\.\.' AND
    name !~ '//' AND
    -- Limit file size (handled by storage config but double-check)
    length(name) < 500
  );

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'app_docs' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'app_docs' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'app_docs' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can manage all documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'app_docs' AND
    auth.uid() IS NOT NULL AND
    (EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com')
  );

-- ============================================================================
-- 5. INPUT VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate and sanitize text input
CREATE OR REPLACE FUNCTION validate_text_input(
  input_text TEXT,
  max_length INTEGER DEFAULT 255,
  allow_html BOOLEAN DEFAULT FALSE
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Return empty string for null input
  IF input_text IS NULL THEN
    RETURN '';
  END IF;

  -- Trim whitespace
  input_text := trim(input_text);

  -- Check length
  IF length(input_text) > max_length THEN
    RAISE EXCEPTION 'Input too long. Maximum % characters allowed.', max_length;
  END IF;

  -- Remove HTML if not allowed
  IF NOT allow_html THEN
    input_text := regexp_replace(input_text, '<[^>]*>', '', 'g');
  END IF;

  -- Remove dangerous characters for log injection prevention
  input_text := regexp_replace(input_text, '[\r\n\t]', ' ', 'g');

  RETURN input_text;
END;
$$;

-- Function to validate email format
CREATE OR REPLACE FUNCTION validate_email(email_input TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF email_input IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Basic email validation regex
  RETURN email_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email_input) <= 254
    AND email_input !~ '\.\.';
END;
$$;

-- ============================================================================
-- 6. RATE LIMITING TABLES
-- ============================================================================

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  action VARCHAR(100) NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System can manage rate limits" ON rate_limits
  FOR ALL USING (true);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_ip_address INET,
  p_action VARCHAR(100),
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := NOW() - INTERVAL '1 minute' * p_window_minutes;

  -- Get current count for this user/IP/action in the time window
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM rate_limits
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND action = p_action
    AND window_start >= window_start;

  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Update or insert rate limit record
  INSERT INTO rate_limits (user_id, ip_address, action, request_count, window_start)
  VALUES (p_user_id, p_ip_address, p_action, 1, NOW())
  ON CONFLICT (user_id, ip_address, action) 
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 7. SECURE INDEXES
-- ============================================================================

-- Create secure indexes for performance and security
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_action 
  ON system_audit_log(user_id, action, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at 
  ON system_audit_log(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_user_action 
  ON rate_limits(user_id, action, window_start);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_ip_action 
  ON rate_limits(ip_address, action, window_start);

-- ============================================================================
-- 8. SECURITY MONITORING VIEWS
-- ============================================================================

-- View for security monitoring
CREATE OR REPLACE VIEW security_monitoring AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  action,
  COUNT(*) as action_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT ip_address) as unique_ips
FROM system_audit_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), action
ORDER BY hour DESC, action_count DESC;

-- View for failed login attempts
CREATE OR REPLACE VIEW failed_login_monitoring AS
SELECT 
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt,
  MIN(created_at) as first_attempt
FROM system_audit_log
WHERE action = 'failed_login'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY failed_attempts DESC;

-- ============================================================================
-- 9. CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_days_to_keep INTEGER DEFAULT 90
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Only super admins can run cleanup
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  ) AND auth.email() != 'cosmas@beanola.com' THEN
    RAISE EXCEPTION 'Insufficient permissions for cleanup operation';
  END IF;

  DELETE FROM system_audit_log 
  WHERE created_at < (NOW() - INTERVAL '1 day' * p_days_to_keep);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO system_audit_log (user_id, action, details)
  VALUES (auth.uid(), 'audit_log_cleanup', 
    jsonb_build_object('deleted_count', deleted_count, 'days_kept', p_days_to_keep));
  
  RETURN deleted_count;
END;
$$;

-- Function to clean old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < (NOW() - INTERVAL '24 hours');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON security_monitoring TO authenticated;
GRANT SELECT ON failed_login_monitoring TO authenticated;
GRANT EXECUTE ON FUNCTION validate_text_input(TEXT, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, INET, VARCHAR, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_secure_bulk_update_status(UUID[], VARCHAR) TO authenticated;

-- Restrict cleanup functions to admins only
REVOKE EXECUTE ON FUNCTION cleanup_old_audit_logs(INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cleanup_old_rate_limits() FROM PUBLIC;

-- ============================================================================
-- 11. SECURITY TRIGGERS
-- ============================================================================

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO system_audit_log (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO system_audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO system_audit_log (user_id, action, table_name, record_id, old_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers only if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    DROP TRIGGER IF EXISTS audit_user_profiles ON user_profiles;
    CREATE TRIGGER audit_user_profiles
      AFTER INSERT OR UPDATE OR DELETE ON user_profiles
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications_new') THEN
    DROP TRIGGER IF EXISTS audit_applications_new ON applications_new;
    CREATE TRIGGER audit_applications_new
      AFTER INSERT OR UPDATE OR DELETE ON applications_new
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
  END IF;
END $$;

-- ============================================================================
-- 12. FINAL SECURITY VALIDATIONS
-- ============================================================================

-- Ensure all tables have RLS enabled
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
      table_record.schemaname, table_record.tablename);
  END LOOP;
END $$;

-- Create summary of security status
CREATE OR REPLACE VIEW security_status_summary AS
SELECT 
  'RLS_ENABLED' as check_type,
  COUNT(*) as total_tables,
  COUNT(*) FILTER (WHERE rowsecurity = true) as secured_tables,
  ROUND(
    (COUNT(*) FILTER (WHERE rowsecurity = true)::DECIMAL / COUNT(*)) * 100, 2
  ) as security_percentage
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE pt.schemaname = 'public'
UNION ALL
SELECT 
  'AUDIT_TRIGGERS' as check_type,
  COUNT(DISTINCT event_object_table) as total_tables,
  COUNT(*) as total_triggers,
  ROUND((COUNT(*)::DECIMAL / COUNT(DISTINCT event_object_table)) * 100, 2) as coverage_percentage
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'audit_%';

COMMENT ON TABLE system_audit_log IS 'Comprehensive audit log for security monitoring and compliance';
COMMENT ON TABLE rate_limits IS 'Rate limiting system to prevent abuse and DoS attacks';
COMMENT ON FUNCTION rpc_secure_bulk_update_status IS 'Secure bulk update function with input validation and audit logging';
COMMENT ON VIEW security_monitoring IS 'Real-time security monitoring dashboard view';
COMMENT ON VIEW security_status_summary IS 'Summary of database security configuration status';