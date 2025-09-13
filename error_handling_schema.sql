-- Error Handling & Recovery Database Schema
-- Run these SQL commands in your Supabase SQL editor

-- ============================================================================
-- 1. ERROR LOGGING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  user_id UUID REFERENCES auth.users(id),
  operation VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  recovery_attempted BOOLEAN DEFAULT FALSE,
  recovery_successful BOOLEAN,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_operation ON error_logs(operation);

-- ============================================================================
-- 2. DATA VALIDATION AT DATABASE LEVEL
-- ============================================================================

-- Function to validate email format
CREATE OR REPLACE FUNCTION validate_email(email TEXT) RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate Zambian phone number
CREATE OR REPLACE FUNCTION validate_zambian_phone(phone TEXT) RETURNS BOOLEAN AS $$
BEGIN
  -- Remove spaces and check format
  RETURN REPLACE(phone, ' ', '') ~* '^(\+260|0)?[79][0-9]{8}$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate NRC format
CREATE OR REPLACE FUNCTION validate_nrc(nrc TEXT) RETURNS BOOLEAN AS $$
BEGIN
  RETURN nrc ~* '^[0-9]{6}/[0-9]{2}/[0-9]{1}$';
END;
$$ LANGUAGE plpgsql;

-- Add validation constraints to applications table
ALTER TABLE applications_new 
ADD CONSTRAINT check_email_format 
CHECK (email IS NULL OR validate_email(email));

ALTER TABLE applications_new 
ADD CONSTRAINT check_phone_format 
CHECK (phone IS NULL OR validate_zambian_phone(phone));

ALTER TABLE applications_new 
ADD CONSTRAINT check_nrc_format 
CHECK (nrc_number IS NULL OR validate_nrc(nrc_number));

-- ============================================================================
-- 3. TRANSACTION ROLLBACK FUNCTIONS
-- ============================================================================

-- Function to safely create application with rollback
CREATE OR REPLACE FUNCTION create_application_safe(
  p_application_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_application_id UUID;
  v_error_occurred BOOLEAN := FALSE;
BEGIN
  -- Start transaction
  BEGIN
    -- Insert application
    INSERT INTO applications_new (
      user_id, full_name, email, phone, nrc_number, passport_number,
      date_of_birth, sex, residence_town, guardian_name, guardian_phone,
      program, intake, institution, application_fee, status
    )
    SELECT 
      (p_application_data->>'user_id')::UUID,
      p_application_data->>'full_name',
      p_application_data->>'email',
      p_application_data->>'phone',
      p_application_data->>'nrc_number',
      p_application_data->>'passport_number',
      (p_application_data->>'date_of_birth')::DATE,
      p_application_data->>'sex',
      p_application_data->>'residence_town',
      p_application_data->>'guardian_name',
      p_application_data->>'guardian_phone',
      p_application_data->>'program',
      p_application_data->>'intake',
      p_application_data->>'institution',
      (p_application_data->>'application_fee')::DECIMAL,
      COALESCE(p_application_data->>'status', 'draft')
    RETURNING id INTO v_application_id;

    -- Validate the created application
    IF NOT EXISTS (
      SELECT 1 FROM applications_new 
      WHERE id = v_application_id 
      AND email IS NOT NULL 
      AND full_name IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Application validation failed after creation';
    END IF;

    RETURN v_application_id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error
      INSERT INTO error_logs (error_code, error_message, error_details, operation)
      VALUES (SQLSTATE, SQLERRM, p_application_data, 'create_application_safe');
      
      -- Re-raise the exception to trigger rollback
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. DATA INTEGRITY CHECKING AND REPAIR
-- ============================================================================

-- Function to check and repair data integrity
CREATE OR REPLACE FUNCTION check_data_integrity() RETURNS TABLE (
  issue_type TEXT,
  issue_count INTEGER,
  repaired_count INTEGER,
  description TEXT
) AS $$
DECLARE
  v_missing_tracking_codes INTEGER := 0;
  v_repaired_tracking_codes INTEGER := 0;
  v_orphaned_documents INTEGER := 0;
  v_repaired_documents INTEGER := 0;
  v_invalid_emails INTEGER := 0;
  v_missing_app_numbers INTEGER := 0;
  v_repaired_app_numbers INTEGER := 0;
BEGIN
  -- Check for missing tracking codes
  SELECT COUNT(*) INTO v_missing_tracking_codes
  FROM applications_new 
  WHERE public_tracking_code IS NULL;

  -- Repair missing tracking codes
  UPDATE applications_new 
  SET public_tracking_code = 'MIHAS' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
  WHERE public_tracking_code IS NULL;
  
  GET DIAGNOSTICS v_repaired_tracking_codes = ROW_COUNT;

  -- Check for orphaned documents
  SELECT COUNT(*) INTO v_orphaned_documents
  FROM application_documents ad
  WHERE NOT EXISTS (
    SELECT 1 FROM applications_new a WHERE a.id = ad.application_id
  );

  -- Remove orphaned documents
  DELETE FROM application_documents 
  WHERE NOT EXISTS (
    SELECT 1 FROM applications_new a WHERE a.id = application_documents.application_id
  );
  
  GET DIAGNOSTICS v_repaired_documents = ROW_COUNT;

  -- Check for invalid emails
  SELECT COUNT(*) INTO v_invalid_emails
  FROM applications_new 
  WHERE email IS NOT NULL AND NOT validate_email(email);

  -- Check for missing application numbers
  SELECT COUNT(*) INTO v_missing_app_numbers
  FROM applications_new 
  WHERE application_number IS NULL;

  -- Repair missing application numbers
  UPDATE applications_new 
  SET application_number = 'APP' || EXTRACT(EPOCH FROM NOW())::BIGINT || FLOOR(RANDOM() * 1000)::TEXT
  WHERE application_number IS NULL;
  
  GET DIAGNOSTICS v_repaired_app_numbers = ROW_COUNT;

  -- Return results
  RETURN QUERY VALUES 
    ('missing_tracking_codes', v_missing_tracking_codes, v_repaired_tracking_codes, 'Applications without tracking codes'),
    ('orphaned_documents', v_orphaned_documents, v_repaired_documents, 'Documents without valid application references'),
    ('invalid_emails', v_invalid_emails, 0, 'Applications with invalid email formats'),
    ('missing_app_numbers', v_missing_app_numbers, v_repaired_app_numbers, 'Applications without application numbers');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. AUTOMATIC ERROR RECOVERY PROCEDURES
-- ============================================================================

-- Function for automatic error recovery
CREATE OR REPLACE FUNCTION attempt_error_recovery(
  p_error_code TEXT,
  p_operation TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_recovery_successful BOOLEAN := FALSE;
BEGIN
  CASE p_error_code
    WHEN '23505' THEN -- Unique constraint violation
      IF p_operation = 'create_application' THEN
        -- Generate new unique values
        IF p_data ? 'application_number' THEN
          p_data := jsonb_set(p_data, '{application_number}', 
            to_jsonb('APP' || EXTRACT(EPOCH FROM NOW())::BIGINT));
        END IF;
        
        IF p_data ? 'public_tracking_code' THEN
          p_data := jsonb_set(p_data, '{public_tracking_code}', 
            to_jsonb('MIHAS' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')));
        END IF;
        
        v_recovery_successful := TRUE;
      END IF;
      
    WHEN '23503' THEN -- Foreign key constraint violation
      -- Log for manual review
      INSERT INTO error_logs (error_code, error_message, error_details, operation, recovery_attempted)
      VALUES (p_error_code, 'Foreign key constraint violation', p_data, p_operation, TRUE);
      
    WHEN 'PGRST116' THEN -- Row not found
      -- Log for manual review
      INSERT INTO error_logs (error_code, error_message, error_details, operation, recovery_attempted)
      VALUES (p_error_code, 'Row not found', p_data, p_operation, TRUE);
      
    ELSE
      -- Unknown error, log for review
      INSERT INTO error_logs (error_code, error_message, error_details, operation, recovery_attempted)
      VALUES (p_error_code, 'Unknown error during recovery attempt', p_data, p_operation, TRUE);
  END CASE;

  -- Update recovery status
  UPDATE error_logs 
  SET recovery_successful = v_recovery_successful
  WHERE error_code = p_error_code 
  AND operation = p_operation 
  AND recovery_attempted = TRUE
  AND created_at >= NOW() - INTERVAL '1 minute';

  RETURN v_recovery_successful;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. MONITORING AND ALERTING
-- ============================================================================

-- Function to get error statistics
CREATE OR REPLACE FUNCTION get_error_statistics(
  p_hours INTEGER DEFAULT 24
) RETURNS TABLE (
  error_code TEXT,
  error_count BIGINT,
  last_occurrence TIMESTAMP WITH TIME ZONE,
  recovery_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.error_code,
    COUNT(*) as error_count,
    MAX(el.created_at) as last_occurrence,
    ROUND(
      (COUNT(*) FILTER (WHERE el.recovery_successful = TRUE)::NUMERIC / 
       NULLIF(COUNT(*) FILTER (WHERE el.recovery_attempted = TRUE), 0)) * 100, 2
    ) as recovery_rate
  FROM error_logs el
  WHERE el.created_at >= NOW() - INTERVAL '1 hour' * p_hours
  GROUP BY el.error_code
  ORDER BY error_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Enable RLS on error_logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all error logs
CREATE POLICY "Admins can view all error logs" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- Policy for system to insert error logs
CREATE POLICY "System can insert error logs" ON error_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION validate_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_zambian_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_nrc(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_application_safe(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION check_data_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION attempt_error_recovery(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_error_statistics(INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE error_logs IS 'Comprehensive error logging for debugging and monitoring';
COMMENT ON FUNCTION create_application_safe(JSONB) IS 'Safely creates application with automatic rollback on failure';
COMMENT ON FUNCTION check_data_integrity() IS 'Checks and repairs common data integrity issues';
COMMENT ON FUNCTION attempt_error_recovery(TEXT, TEXT, JSONB) IS 'Attempts automatic recovery from common database errors';