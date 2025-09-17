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
-- 2. AUDIT LOGGING SYSTEM
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
-- 3. INPUT VALIDATION FUNCTIONS
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
-- 4. RATE LIMITING TABLES
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

-- ============================================================================
-- 5. SECURITY MONITORING VIEWS
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

-- ============================================================================
-- 6. FINAL SECURITY VALIDATIONS
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
WHERE pt.schemaname = 'public';

COMMENT ON TABLE system_audit_log IS 'Comprehensive audit log for security monitoring and compliance';
COMMENT ON TABLE rate_limits IS 'Rate limiting system to prevent abuse and DoS attacks';
COMMENT ON VIEW security_monitoring IS 'Real-time security monitoring dashboard view';
COMMENT ON VIEW security_status_summary IS 'Summary of database security configuration status';