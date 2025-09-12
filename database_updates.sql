-- Database updates for enhanced application form
-- Run these SQL commands in your Supabase SQL editor

-- Add new fields to applications table for Zambian standards
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS nrc_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(10),
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Zambian',
ADD COLUMN IF NOT EXISTS province VARCHAR(50),
ADD COLUMN IF NOT EXISTS district VARCHAR(50),
ADD COLUMN IF NOT EXISTS postal_address TEXT,
ADD COLUMN IF NOT EXISTS physical_address TEXT,
ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS guardian_relationship VARCHAR(50),
ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
ADD COLUMN IF NOT EXISTS disabilities TEXT,
ADD COLUMN IF NOT EXISTS criminal_record BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS criminal_record_details TEXT,
ADD COLUMN IF NOT EXISTS professional_registration_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS professional_body VARCHAR(100),
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS employer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS employer_address TEXT,
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS motivation_letter TEXT,
ADD COLUMN IF NOT EXISTS career_goals TEXT,
ADD COLUMN IF NOT EXISTS financial_sponsor VARCHAR(255),
ADD COLUMN IF NOT EXISTS sponsor_relationship VARCHAR(100),
ADD COLUMN IF NOT EXISTS application_fee_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS application_fee_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS application_fee_receipt VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_feedback TEXT,
ADD COLUMN IF NOT EXISTS admin_feedback_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_feedback_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS public_tracking_code VARCHAR(20) UNIQUE;

-- Create index for public tracking
CREATE INDEX IF NOT EXISTS idx_applications_tracking_code ON applications(public_tracking_code);

-- Add new intakes for 2026
INSERT INTO intakes (name, year, semester, start_date, end_date, application_deadline, total_capacity, available_spots, is_active)
VALUES 
('January 2026 Intake', 2026, 'First Semester', '2026-01-15', '2026-06-30', '2025-12-15', 200, 200, true),
('July 2026 Intake', 2026, 'Second Semester', '2026-07-15', '2026-12-31', '2026-06-15', 200, 200, true)
ON CONFLICT DO NOTHING;

-- Deactivate non-relevant programs, keep only the three specified
UPDATE programs 
SET is_active = FALSE 
WHERE name NOT IN (
  'Diploma in Clinical Medicine',
  'Diploma in Environmental Health', 
  'Diploma in Nursing',
  'Diploma in Registered Nursing'
);

-- Ensure the three main programs are active and have correct names
UPDATE programs 
SET is_active = TRUE,
    name = 'Diploma in Registered Nursing'
WHERE name = 'Diploma in Nursing';

-- Create application status tracking table
CREATE TABLE IF NOT EXISTS application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create public application tracking view
CREATE OR REPLACE VIEW public_application_status AS
SELECT 
  a.public_tracking_code,
  a.application_number,
  a.status,
  a.submitted_at,
  a.updated_at,
  p.name as program_name,
  i.name as intake_name,
  a.admin_feedback,
  a.admin_feedback_date
FROM applications a
LEFT JOIN programs p ON a.program_id = p.id
LEFT JOIN intakes i ON a.intake_id = i.id
WHERE a.public_tracking_code IS NOT NULL;

-- Function to generate tracking code
CREATE OR REPLACE FUNCTION generate_tracking_code() RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
  exists_check INTEGER;
BEGIN
  LOOP
    code := 'MIHAS' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT COUNT(*) INTO exists_check FROM applications WHERE public_tracking_code = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate tracking code
CREATE OR REPLACE FUNCTION set_tracking_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_tracking_code IS NULL THEN
    NEW.public_tracking_code := generate_tracking_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS applications_tracking_code_trigger ON applications;
CREATE TRIGGER applications_tracking_code_trigger
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION set_tracking_code();

-- Enable RLS on new tables
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for application_status_history
CREATE POLICY "Users can view their own application history" ON application_status_history
  FOR SELECT USING (
    application_id IN (
      SELECT id FROM applications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all application history" ON application_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admins can insert application history" ON application_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- Update existing applications with tracking codes
UPDATE applications 
SET public_tracking_code = generate_tracking_code() 
WHERE public_tracking_code IS NULL;