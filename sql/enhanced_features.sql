-- Enhanced features for application management

-- Email notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications_new(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment audit ledger to capture verification trails
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id BIGSERIAL PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applications_new(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  reference VARCHAR(100),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_by_name VARCHAR(255),
  recorded_by_email VARCHAR(255),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to send status change notifications
CREATE OR REPLACE FUNCTION notify_status_change() RETURNS TRIGGER AS $$
BEGIN
  -- Only send notification if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO email_notifications (application_id, recipient_email, subject, body)
    VALUES (
      NEW.id,
      NEW.email,
      'Application Status Update - ' || NEW.application_number,
      'Your application status has been updated to: ' || UPPER(REPLACE(NEW.status, '_', ' '))
    );
  END IF;
  
  -- Send payment status notifications
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO email_notifications (application_id, recipient_email, subject, body)
    VALUES (
      NEW.id,
      NEW.email,
      'Payment Status Update - ' || NEW.application_number,
      'Your payment status has been updated to: ' || UPPER(REPLACE(NEW.payment_status, '_', ' '))
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for email notifications
DROP TRIGGER IF EXISTS status_change_notification ON applications_new;
CREATE TRIGGER status_change_notification
  AFTER UPDATE ON applications_new
  FOR EACH ROW
  EXECUTE FUNCTION notify_status_change();

-- Bulk status update function
CREATE OR REPLACE FUNCTION rpc_bulk_update_status(
  p_application_ids UUID[],
  p_status VARCHAR(20),
  p_updated_by UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE applications_new 
  SET 
    status = p_status,
    updated_at = NOW()
  WHERE id = ANY(p_application_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk payment status update function
CREATE OR REPLACE FUNCTION rpc_bulk_update_payment_status(
  p_application_ids UUID[],
  p_payment_status VARCHAR(20),
  p_updated_by UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE applications_new 
  SET 
    payment_status = p_payment_status,
    updated_at = NOW()
  WHERE id = ANY(p_application_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced admin view with more filtering options
CREATE OR REPLACE VIEW admin_application_detailed AS
SELECT
  a.id,
  a.application_number,
  a.full_name,
  a.email,
  a.phone,
  a.nrc_number,
  a.passport_number,
  a.date_of_birth,
  a.sex,
  a.residence_town,
  a.guardian_name,
  a.guardian_phone,
  a.program,
  a.intake,
  a.institution,
  a.status,
  a.payment_status,
  a.payment_verified_at,
  a.payment_verified_by,
  verifier.full_name AS payment_verified_by_name,
  verifier.email AS payment_verified_by_email,
  a.application_fee,
  a.amount as paid_amount,
  a.payment_method,
  a.payer_name,
  a.payer_phone,
  a.paid_at,
  a.momo_ref,
  a.submitted_at,
  a.created_at,
  a.updated_at,
  a.result_slip_url,
  a.extra_kyc_url,
  a.pop_url,
  a.public_tracking_code,
  pal.id AS last_payment_audit_id,
  pal.recorded_at AS last_payment_audit_at,
  pal.recorded_by_name AS last_payment_audit_by_name,
  pal.recorded_by_email AS last_payment_audit_by_email,
  pal.notes AS last_payment_audit_notes,
  pal.reference AS last_payment_reference,
  pal.amount AS last_payment_audit_amount,
  pal.payment_method AS last_payment_audit_method,
  STRING_AGG(
    gs.name || ': ' || ag.grade,
    ', ' ORDER BY gs.name
  ) as grades_summary,
  COUNT(ag.id) as total_subjects,
  AVG(ag.grade::NUMERIC) as average_grade,
  -- Age calculation
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_of_birth)) as age,
  -- Days since submission
  CASE
    WHEN a.submitted_at IS NOT NULL
    THEN EXTRACT(DAY FROM NOW() - a.submitted_at)::INTEGER
    ELSE NULL
  END as days_since_submission
FROM applications_new a
LEFT JOIN application_grades ag ON a.id = ag.application_id
LEFT JOIN grade12_subjects gs ON ag.subject_id = gs.id
LEFT JOIN user_profiles verifier ON a.payment_verified_by = verifier.user_id
LEFT JOIN LATERAL (
  SELECT
    id,
    amount,
    payment_method,
    reference,
    notes,
    recorded_at,
    recorded_by,
    recorded_by_name,
    recorded_by_email
  FROM payment_audit_log
  WHERE application_id = a.id
  ORDER BY recorded_at DESC
  LIMIT 1
) pal ON TRUE
GROUP BY a.id, a.application_number, a.full_name, a.email, a.phone,
         a.nrc_number, a.passport_number, a.date_of_birth, a.sex,
         a.residence_town, a.guardian_name, a.guardian_phone,
         a.program, a.intake, a.institution, a.status, a.payment_status,
         a.payment_verified_at, a.payment_verified_by, verifier.full_name,
         verifier.email, a.application_fee, a.amount, a.payment_method,
         a.payer_name, a.payer_phone, a.paid_at, a.momo_ref, a.submitted_at,
         a.created_at, a.updated_at, a.result_slip_url, a.extra_kyc_url,
         a.pop_url, a.public_tracking_code, pal.id, pal.recorded_at,
         pal.recorded_by_name, pal.recorded_by_email, pal.notes,
         pal.reference, pal.amount, pal.payment_method;

-- RLS for email notifications
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" ON email_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );