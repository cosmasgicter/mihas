-- Final database fixes - handles all existing issues
-- Run this in Supabase SQL Editor

-- 1. Drop ALL existing policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
    DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
    DROP POLICY IF EXISTS "users_select_own" ON user_profiles;
    DROP POLICY IF EXISTS "users_update_own" ON user_profiles;
    DROP POLICY IF EXISTS "users_insert_own" ON user_profiles;
    DROP POLICY IF EXISTS "admins_all_access" ON user_profiles;
    
    DROP POLICY IF EXISTS "Users can view own applications" ON applications_new;
    DROP POLICY IF EXISTS "Users can insert own applications" ON applications_new;
    DROP POLICY IF EXISTS "Users can update own applications" ON applications_new;
    DROP POLICY IF EXISTS "Admins can view all applications" ON applications_new;
    DROP POLICY IF EXISTS "Admins can manage all applications" ON applications_new;
    DROP POLICY IF EXISTS "apps_users_select_own" ON applications_new;
    DROP POLICY IF EXISTS "apps_users_insert_own" ON applications_new;
    DROP POLICY IF EXISTS "apps_users_update_own" ON applications_new;
    DROP POLICY IF EXISTS "apps_admins_all_access" ON applications_new;
    
    DROP POLICY IF EXISTS "Users can view own application history" ON application_status_history;
    DROP POLICY IF EXISTS "Users can view their own application history" ON application_status_history;
    DROP POLICY IF EXISTS "Admins can view all application history" ON application_status_history;
    DROP POLICY IF EXISTS "Admins can insert application history" ON application_status_history;
    DROP POLICY IF EXISTS "Admins can manage all history" ON application_status_history;
    DROP POLICY IF EXISTS "history_users_select_own" ON application_status_history;
    DROP POLICY IF EXISTS "history_admins_all_access" ON application_status_history;
    
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Add missing columns to user_profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email') THEN
        ALTER TABLE user_profiles ADD COLUMN email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'full_name') THEN
        ALTER TABLE user_profiles ADD COLUMN full_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'phone') THEN
        ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'role') THEN
        ALTER TABLE user_profiles ADD COLUMN role VARCHAR(50) DEFAULT 'student';
    END IF;
END $$;

-- 3. Enable RLS and create user_profiles policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "up_select" ON user_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "up_update" ON user_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "up_insert" ON user_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "up_admin" ON user_profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'staff'))
    OR auth.email() = 'cosmas@beanola.com'
);

-- 4. Create applications_new policies
CREATE POLICY "app_select" ON applications_new FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "app_insert" ON applications_new FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "app_update" ON applications_new FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "app_admin" ON applications_new FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'staff'))
    OR auth.email() = 'cosmas@beanola.com'
);

-- 5. Create missing tables
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

-- 6. Enable RLS on new tables
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for new tables
CREATE POLICY "hist_select" ON application_status_history FOR SELECT USING (
    application_id IN (SELECT id FROM applications_new WHERE user_id = auth.uid())
);
CREATE POLICY "hist_admin" ON application_status_history FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'staff'))
    OR auth.email() = 'cosmas@beanola.com'
);

CREATE POLICY "notif_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notif_admin" ON notifications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'staff'))
    OR auth.email() = 'cosmas@beanola.com'
);

-- 8. Create RPC functions
CREATE OR REPLACE FUNCTION rpc_bulk_update_status(
  p_application_ids UUID[],
  p_status VARCHAR(50)
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  app_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'staff')
  ) AND auth.email() != 'cosmas@beanola.com' THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  FOREACH app_id IN ARRAY p_application_ids LOOP
    UPDATE applications_new SET status = p_status, updated_at = NOW() WHERE id = app_id;
    IF FOUND THEN
      updated_count := updated_count + 1;
      INSERT INTO application_status_history (application_id, status, changed_by)
      VALUES (app_id, p_status, auth.uid());
    END IF;
  END LOOP;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_applications BIGINT,
  draft_applications BIGINT,
  submitted_applications BIGINT,
  under_review_applications BIGINT,
  approved_applications BIGINT,
  rejected_applications BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'staff')
  ) AND auth.email() != 'cosmas@beanola.com' THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'draft'),
    COUNT(*) FILTER (WHERE status = 'submitted'),
    COUNT(*) FILTER (WHERE status = 'under_review'),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected')
  FROM applications_new;
END;
$$;

-- 9. Create indexes
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications_new(status);
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON applications_new(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON user_profiles(role);

-- 10. Insert admin profile (only user_id and role to avoid missing column errors)
INSERT INTO user_profiles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users 
WHERE email = 'cosmas@beanola.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';