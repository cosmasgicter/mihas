-- Application system improvements and fixes

-- Add missing columns to applications_new table
ALTER TABLE applications_new 
ADD COLUMN IF NOT EXISTS eligibility_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS eligibility_score INTEGER,
ADD COLUMN IF NOT EXISTS eligibility_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_feedback TEXT,
ADD COLUMN IF NOT EXISTS admin_feedback_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_feedback_by UUID REFERENCES auth.users(id);

-- Create application status history table
CREATE TABLE IF NOT EXISTS application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications_new(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create application drafts table for better persistence
CREATE TABLE IF NOT EXISTS application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL,
  step_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Function to save application draft
CREATE OR REPLACE FUNCTION save_application_draft(
  p_user_id UUID,
  p_draft_data JSONB,
  p_step_completed INTEGER DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  draft_id UUID;
BEGIN
  INSERT INTO application_drafts (user_id, draft_data, step_completed, updated_at)
  VALUES (p_user_id, p_draft_data, p_step_completed, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    draft_data = EXCLUDED.draft_data,
    step_completed = EXCLUDED.step_completed,
    updated_at = NOW()
  RETURNING id INTO draft_id;
  
  RETURN draft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get application draft
CREATE OR REPLACE FUNCTION get_application_draft(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  draft_data JSONB,
  step_completed INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT ad.id, ad.draft_data, ad.step_completed, ad.updated_at
  FROM application_drafts ad
  WHERE ad.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete application draft
CREATE OR REPLACE FUNCTION delete_application_draft(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM application_drafts WHERE user_id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to calculate eligibility
CREATE OR REPLACE FUNCTION calculate_eligibility(
  p_program VARCHAR(50),
  p_grades JSONB
) RETURNS TABLE (
  eligible BOOLEAN,
  score INTEGER,
  message TEXT,
  recommendations TEXT[]
) AS $$
DECLARE
  grade_record RECORD;
  total_grade INTEGER := 0;
  grade_count INTEGER := 0;
  required_subjects TEXT[];
  missing_subjects TEXT[] := ARRAY[]::TEXT[];
  low_grade_subjects TEXT[] := ARRAY[]::TEXT[];
  min_grade INTEGER := 6;
  avg_score INTEGER;
BEGIN
  -- Define required subjects per program
  CASE p_program
    WHEN 'Clinical Medicine' THEN
      required_subjects := ARRAY['English', 'Mathematics', 'Biology', 'Chemistry', 'Physics'];
    WHEN 'Environmental Health' THEN
      required_subjects := ARRAY['English', 'Mathematics', 'Biology', 'Chemistry'];
    WHEN 'Registered Nursing' THEN
      required_subjects := ARRAY['English', 'Mathematics', 'Biology', 'Chemistry'];
    ELSE
      required_subjects := ARRAY[]::TEXT[];
  END CASE;

  -- Check each grade
  FOR grade_record IN 
    SELECT 
      (grade_data->>'subject_name')::TEXT as subject_name,
      (grade_data->>'grade')::INTEGER as grade_value
    FROM jsonb_array_elements(p_grades) AS grade_data
  LOOP
    total_grade := total_grade + grade_record.grade_value;
    grade_count := grade_count + 1;
    
    -- Check if this is a required subject with low grade
    IF grade_record.subject_name = ANY(required_subjects) AND grade_record.grade_value < min_grade THEN
      low_grade_subjects := array_append(low_grade_subjects, grade_record.subject_name);
    END IF;
  END LOOP;

  -- Check for missing required subjects
  SELECT array_agg(req_subject) INTO missing_subjects
  FROM unnest(required_subjects) AS req_subject
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_grades) AS grade_data
    WHERE (grade_data->>'subject_name')::TEXT ILIKE '%' || req_subject || '%'
  );

  -- Calculate average score
  IF grade_count > 0 THEN
    avg_score := ROUND((total_grade::NUMERIC / grade_count / 9) * 100);
  ELSE
    avg_score := 0;
  END IF;

  -- Determine eligibility
  IF grade_count < 5 THEN
    RETURN QUERY SELECT 
      FALSE, 
      avg_score, 
      'Minimum 5 subjects required',
      ARRAY['Add more subjects to meet minimum requirements'];
  ELSIF array_length(missing_subjects, 1) > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      avg_score, 
      'Missing required subjects: ' || array_to_string(missing_subjects, ', '),
      ARRAY['Add the following subjects: ' || array_to_string(missing_subjects, ', ')];
  ELSIF array_length(low_grade_subjects, 1) > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      avg_score, 
      'Grades below 6 in: ' || array_to_string(low_grade_subjects, ', '),
      ARRAY['Improve grades in: ' || array_to_string(low_grade_subjects, ', ')];
  ELSE
    RETURN QUERY SELECT 
      TRUE, 
      avg_score, 
      'Eligible for ' || p_program,
      ARRAY['All requirements met', 'Good academic performance'];
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RLS policies for new tables
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_drafts ENABLE ROW LEVEL SECURITY;

-- Policies for application_status_history
CREATE POLICY "Users can view own application history" ON application_status_history
  FOR SELECT USING (
    application_id IN (
      SELECT id FROM applications_new WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all application history" ON application_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- Policies for application_drafts
CREATE POLICY "Users can manage own drafts" ON application_drafts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all drafts" ON application_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- Update trigger for application_drafts
CREATE OR REPLACE FUNCTION update_draft_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS application_drafts_update_trigger ON application_drafts;
CREATE TRIGGER application_drafts_update_trigger
  BEFORE UPDATE ON application_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_draft_timestamp();

-- Ensure storage bucket exists with correct policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'app_docs', 
  'app_docs', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Update storage policies to be more specific
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;

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

CREATE POLICY "Users can update own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'app_docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'app_docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can manage all documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'app_docs' AND
    (EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com')
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_new_user_id ON applications_new(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_new_status ON applications_new(status);
CREATE INDEX IF NOT EXISTS idx_applications_new_program ON applications_new(program);
CREATE INDEX IF NOT EXISTS idx_applications_new_submitted_at ON applications_new(submitted_at);
CREATE INDEX IF NOT EXISTS idx_application_grades_application_id ON application_grades(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_drafts_user_id ON application_drafts(user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;