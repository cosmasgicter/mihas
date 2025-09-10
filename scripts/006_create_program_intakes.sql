-- Program intakes table
CREATE TABLE program_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  intake_period TEXT NOT NULL, -- e.g., 'January', 'September'
  capacity INTEGER,
  application_start_date TIMESTAMPTZ,
  application_end_date TIMESTAMPTZ,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE program_intakes ENABLE ROW LEVEL SECURITY;

-- Policies for program intakes
CREATE POLICY "intakes_public_read" ON program_intakes
  FOR SELECT USING (
    is_open = true 
    AND application_start_date <= NOW() 
    AND application_end_date >= NOW()
  );

CREATE POLICY "intakes_staff_manage" ON program_intakes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      JOIN programs p ON p.institution_id = r.institution_id
      WHERE r.user_id = auth.uid()
        AND p.id = program_intakes.program_id
        AND r.role IN ('admissions_officer', 'registrar', 'super_admin')
        AND r.revoked_at IS NULL
    )
  );
