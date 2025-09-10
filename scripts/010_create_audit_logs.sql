-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit logs
CREATE POLICY "admin_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('registrar', 'super_admin')
        AND r.revoked_at IS NULL
    )
  );

-- Function to log application status changes
CREATE OR REPLACE FUNCTION log_application_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      metadata
    ) VALUES (
      auth.uid(),
      'status_change',
      'application',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      jsonb_build_object(
        'application_number', NEW.application_number,
        'previous_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for application status changes
CREATE TRIGGER audit_application_changes
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION log_application_changes();
