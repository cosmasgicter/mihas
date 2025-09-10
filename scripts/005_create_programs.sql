-- Programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_years INTEGER,
  qualification_level TEXT,
  prerequisites TEXT[],
  required_documents TEXT[],
  application_fee_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(institution_id, code)
);

-- Enable RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Policies for programs
CREATE POLICY "programs_public_read" ON programs
  FOR SELECT USING (is_active = true);

CREATE POLICY "programs_staff_manage" ON programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.institution_id = programs.institution_id
        AND r.role IN ('admissions_officer', 'registrar', 'super_admin')
        AND r.revoked_at IS NULL
    )
  );
