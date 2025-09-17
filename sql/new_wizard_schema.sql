-- New 4-step wizard database schema
-- This replaces the complex multi-step application system

-- Grade 12 subjects reference table
CREATE TABLE IF NOT EXISTS grade12_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard Grade 12 subjects
INSERT INTO grade12_subjects (name, code) VALUES
('English', 'ENG'),
('Mathematics', 'MATH'),
('Biology', 'BIO'),
('Chemistry', 'CHEM'),
('Physics', 'PHY'),
('Geography', 'GEO'),
('History', 'HIST'),
('Civic Education', 'CE'),
('Religious Education', 'RE'),
('Computer Studies', 'CS'),
('Additional Mathematics', 'ADD_MATH'),
('Agricultural Science', 'AGR'),
('Home Economics', 'HE'),
('Art', 'ART'),
('Music', 'MUS'),
('Physical Education', 'PE')
ON CONFLICT (name) DO NOTHING;

-- Simplified applications table for wizard
DROP TABLE IF EXISTS applications_new CASCADE;
CREATE TABLE applications_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Step 1: Basic KYC
  full_name VARCHAR(255) NOT NULL,
  nrc_number VARCHAR(20),
  passport_number VARCHAR(50),
  date_of_birth DATE NOT NULL,
  sex VARCHAR(10) NOT NULL CHECK (sex IN ('Male', 'Female')),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  residence_town VARCHAR(100) NOT NULL,
  guardian_name VARCHAR(255),
  guardian_phone VARCHAR(20),
  program VARCHAR(50) NOT NULL CHECK (program IN ('Clinical Medicine', 'Environmental Health', 'Registered Nursing')),
  intake VARCHAR(50) NOT NULL,
  institution VARCHAR(10) NOT NULL CHECK (institution IN ('KATC', 'MIHAS')),
  
  -- Step 2: Education & Documents
  result_slip_url VARCHAR(500),
  extra_kyc_url VARCHAR(500),
  
  -- Step 3: Payment
  application_fee DECIMAL(10,2) DEFAULT 153.00,
  payment_method VARCHAR(20),
  payer_name VARCHAR(255),
  payer_phone VARCHAR(20),
  amount DECIMAL(10,2),
  paid_at TIMESTAMP WITH TIME ZONE,
  momo_ref VARCHAR(100),
  pop_url VARCHAR(500),
  payment_status VARCHAR(20) DEFAULT 'pending_review' CHECK (payment_status IN ('pending_review', 'verified', 'rejected')),
  
  -- Step 4: Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  public_tracking_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_identification CHECK (
    (nrc_number IS NOT NULL AND passport_number IS NULL) OR 
    (nrc_number IS NULL AND passport_number IS NOT NULL)
  )
);

-- Application grades table
CREATE TABLE IF NOT EXISTS application_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications_new(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES grade12_subjects(id),
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 9),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(application_id, subject_id)
);

-- Admin summary view
CREATE OR REPLACE VIEW admin_application_summary AS
SELECT 
  a.id,
  a.application_number,
  a.full_name,
  a.email,
  a.phone,
  a.program,
  a.intake,
  a.institution,
  a.status,
  a.payment_status,
  a.application_fee,
  a.amount as paid_amount,
  a.submitted_at,
  a.created_at,
  a.result_slip_url,
  a.extra_kyc_url,
  a.pop_url,
  STRING_AGG(
    gs.name || ': ' || ag.grade, 
    ', ' ORDER BY gs.name
  ) as grades_summary,
  COUNT(ag.id) as total_subjects
FROM applications_new a
LEFT JOIN application_grades ag ON a.id = ag.application_id
LEFT JOIN grade12_subjects gs ON ag.subject_id = gs.id
GROUP BY a.id, a.application_number, a.full_name, a.email, a.phone, 
         a.program, a.intake, a.institution, a.status, a.payment_status,
         a.application_fee, a.amount, a.submitted_at, a.created_at,
         a.result_slip_url, a.extra_kyc_url, a.pop_url;

-- Function to replace grades atomically
CREATE OR REPLACE FUNCTION rpc_replace_grades(
  p_application_id UUID,
  p_grades JSONB
) RETURNS VOID AS $$
BEGIN
  -- Delete existing grades
  DELETE FROM application_grades WHERE application_id = p_application_id;
  
  -- Insert new grades
  INSERT INTO application_grades (application_id, subject_id, grade)
  SELECT 
    p_application_id,
    (grade_data->>'subject_id')::UUID,
    (grade_data->>'grade')::INTEGER
  FROM jsonb_array_elements(p_grades) AS grade_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-generate application numbers
CREATE OR REPLACE FUNCTION generate_application_number() RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
  exists_check INTEGER;
BEGIN
  LOOP
    code := 'APP' || TO_CHAR(NOW(), 'YYYY') || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT COUNT(*) INTO exists_check FROM applications_new WHERE application_number = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate tracking codes
CREATE OR REPLACE FUNCTION generate_tracking_code_new() RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
  exists_check INTEGER;
BEGIN
  LOOP
    code := 'TRK' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT COUNT(*) INTO exists_check FROM applications_new WHERE public_tracking_code = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generation
CREATE OR REPLACE FUNCTION set_application_defaults() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_number IS NULL THEN
    NEW.application_number := generate_application_number();
  END IF;
  
  IF NEW.public_tracking_code IS NULL THEN
    NEW.public_tracking_code := generate_tracking_code_new();
  END IF;
  
  -- Auto-derive institution from program
  IF NEW.program IN ('Clinical Medicine', 'Environmental Health') THEN
    NEW.institution := 'KATC';
  ELSIF NEW.program = 'Registered Nursing' THEN
    NEW.institution := 'MIHAS';
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS applications_new_defaults_trigger ON applications_new;
CREATE TRIGGER applications_new_defaults_trigger
  BEFORE INSERT OR UPDATE ON applications_new
  FOR EACH ROW
  EXECUTE FUNCTION set_application_defaults();

-- Enable RLS
ALTER TABLE applications_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade12_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications_new
CREATE POLICY "Users can view own applications" ON applications_new
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own applications" ON applications_new
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own applications" ON applications_new
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON applications_new
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- RLS Policies for application_grades
CREATE POLICY "Users can manage own grades" ON application_grades
  FOR ALL USING (
    application_id IN (
      SELECT id FROM applications_new WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all grades" ON application_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- RLS Policies for grade12_subjects (read-only for all)
CREATE POLICY "Everyone can view subjects" ON grade12_subjects
  FOR SELECT USING (TRUE);

-- Storage bucket for app_docs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app_docs', 'app_docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'app_docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'app_docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can view all documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'app_docs' AND
    (EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com')
  );