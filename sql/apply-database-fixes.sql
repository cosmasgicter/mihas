-- Apply these SQL commands directly in your Supabase SQL Editor
-- Go to: Supabase Dashboard > SQL Editor > New Query

-- 1. Ensure user_profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'admin', 'super_admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS and create policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

CREATE POLICY "Admins can manage all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- 3. Fix applications_new RLS policies
DROP POLICY IF EXISTS "Users can view own applications" ON applications_new;
DROP POLICY IF EXISTS "Users can insert own applications" ON applications_new;
DROP POLICY IF EXISTS "Users can update own applications" ON applications_new;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications_new;
DROP POLICY IF EXISTS "Admins can manage all applications" ON applications_new;

CREATE POLICY "Users can view own applications" ON applications_new
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own applications" ON applications_new
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own applications" ON applications_new
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON applications_new
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

CREATE POLICY "Admins can manage all applications" ON applications_new
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- 4. Create missing tables
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications_new(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  system_generated BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications_new(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS on new tables
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for new tables
CREATE POLICY "Users can view own documents" ON application_documents
  FOR SELECT USING (
    application_id IN (
      SELECT id FROM applications_new WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all documents" ON application_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

CREATE POLICY "Users can view own history" ON application_status_history
  FOR SELECT USING (
    application_id IN (
      SELECT id FROM applications_new WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all history" ON application_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- 7. Create bulk operation functions
CREATE OR REPLACE FUNCTION rpc_bulk_update_status(
  p_application_ids UUID[],
  p_status VARCHAR(50)
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  app_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'staff')
  ) AND auth.email() != 'cosmas@beanola.com' THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Update applications
  FOREACH app_id IN ARRAY p_application_ids
  LOOP
    UPDATE applications_new 
    SET 
      status = p_status,
      updated_at = NOW()
    WHERE id = app_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;

-- 8. Create dashboard stats function
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_applications BIGINT,
  draft_applications BIGINT,
  submitted_applications BIGINT,
  under_review_applications BIGINT,
  approved_applications BIGINT,
  rejected_applications BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'staff')
  ) AND auth.email() != 'cosmas@beanola.com' THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*) as total_applications,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_applications,
    COUNT(*) FILTER (WHERE status = 'submitted') as submitted_applications,
    COUNT(*) FILTER (WHERE status = 'under_review') as under_review_applications,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_applications,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_applications
  FROM applications_new;
END;
$$;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_new_status ON applications_new(status);
CREATE INDEX IF NOT EXISTS idx_applications_new_user_id ON applications_new(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- 10. Insert admin profile if it doesn't exist
INSERT INTO user_profiles (user_id, email, full_name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'super_admin'
FROM auth.users 
WHERE email = 'cosmas@beanola.com'
AND NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_id = auth.users.id
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'super_admin',
  updated_at = NOW();