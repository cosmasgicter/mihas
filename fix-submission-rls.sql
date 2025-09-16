-- Fix RLS policies for application submission
-- This ensures users can properly submit their applications

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own applications" ON applications_new;
DROP POLICY IF EXISTS "Users can insert own applications" ON applications_new;
DROP POLICY IF EXISTS "Users can update own applications" ON applications_new;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications_new;

-- Create improved RLS policies
CREATE POLICY "users_select_own_applications" ON applications_new
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_applications" ON applications_new
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_applications" ON applications_new
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "admins_full_access" ON applications_new
  FOR ALL USING (
    auth.email() = 'cosmas@beanola.com' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'super_admin')
    )
  );

-- Ensure RLS is enabled
ALTER TABLE applications_new ENABLE ROW LEVEL SECURITY;

-- Fix application_grades policies
DROP POLICY IF EXISTS "Users can manage own grades" ON application_grades;
DROP POLICY IF EXISTS "Admins can manage all grades" ON application_grades;

CREATE POLICY "users_manage_own_grades" ON application_grades
  FOR ALL USING (
    application_id IN (
      SELECT id FROM applications_new WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_all_grades" ON application_grades
  FOR ALL USING (
    auth.email() = 'cosmas@beanola.com' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'super_admin')
    )
  );

-- Ensure RLS is enabled
ALTER TABLE application_grades ENABLE ROW LEVEL SECURITY;