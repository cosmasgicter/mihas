-- Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES auth.users(id),
  program_id UUID NOT NULL REFERENCES programs(id),
  intake_id UUID NOT NULL REFERENCES program_intakes(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  application_number TEXT UNIQUE,
  status application_status DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  decision_notes TEXT,
  completeness_score INTEGER DEFAULT 0,
  payment_reference TEXT,
  payment_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(applicant_id, program_id, intake_id)
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Policies for applications
CREATE POLICY "applicants_own_applications" ON applications
  FOR ALL USING (auth.uid() = applicant_id);

CREATE POLICY "staff_read_applications" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.institution_id = applications.institution_id
        AND r.role IN ('admissions_officer', 'registrar', 'super_admin')
        AND r.revoked_at IS NULL
    )
  );

CREATE POLICY "staff_update_applications" ON applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.institution_id = applications.institution_id
        AND r.role IN ('admissions_officer', 'registrar', 'super_admin')
        AND r.revoked_at IS NULL
    )
  );

-- Function to generate application number
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  inst_code TEXT;
  year_code TEXT;
  sequence_num INTEGER;
BEGIN
  -- Get institution code
  SELECT slug INTO inst_code FROM institutions WHERE id = NEW.institution_id;
  
  -- Get year code
  year_code := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get next sequence number for this institution and year
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM applications 
  WHERE institution_id = NEW.institution_id 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  -- Generate application number: INST-YYYY-NNNN
  NEW.application_number := UPPER(inst_code) || '-' || year_code || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$;

-- Trigger to generate application number
CREATE TRIGGER generate_app_number_trigger
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION generate_application_number();
