-- Fix RLS policies for admin dashboard functionality
-- This script addresses all RLS issues preventing admin features from working

-- First, ensure user_profiles table exists and has proper structure
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'admin', 'super_admin', 'staff')),
  date_of_birth DATE,
  sex VARCHAR(10),
  nationality VARCHAR(50) DEFAULT 'Zambian',
  address TEXT,
  city VARCHAR(100),
  next_of_kin_name VARCHAR(255),
  next_of_kin_phone VARCHAR(20),
  avatar_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Create comprehensive RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

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

-- Fix applications_new table RLS policies
DROP POLICY IF EXISTS "Users can view own applications" ON applications_new;
DROP POLICY IF EXISTS "Users can insert own applications" ON applications_new;
DROP POLICY IF EXISTS "Users can update own applications" ON applications_new;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications_new;
DROP POLICY IF EXISTS "Admins can manage all applications" ON applications_new;

-- Create proper RLS policies for applications_new
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

-- Create application_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications_new(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on application_documents
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own documents" ON application_documents;
DROP POLICY IF EXISTS "Users can manage own documents" ON application_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON application_documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON application_documents;

-- Create RLS policies for application_documents
CREATE POLICY "Users can view own documents" ON application_documents
  FOR SELECT USING (
    application_id IN (
      SELECT id FROM applications_new WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own documents" ON application_documents
  FOR ALL USING (
    application_id IN (
      SELECT id FROM applications_new WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all documents" ON application_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

CREATE POLICY "Admins can manage all documents" ON application_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- Create application_status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications_new(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on application_status_history
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own application history" ON application_status_history;
DROP POLICY IF EXISTS "Admins can view all application history" ON application_status_history;
DROP POLICY IF EXISTS "Admins can insert application history" ON application_status_history;
DROP POLICY IF EXISTS "Admins can manage all history" ON application_status_history;

-- Create RLS policies for application_status_history
CREATE POLICY "Users can view own application history" ON application_status_history
  FOR SELECT USING (
    application_id IN (
      SELECT id FROM applications_new WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all application history" ON application_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

CREATE POLICY "Admins can manage all history" ON application_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;

-- Create RLS policies for notifications
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

-- Create email_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications_new(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on email_notifications
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_notifications
CREATE POLICY "Admins can manage email notifications" ON email_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com'
  );

-- Fix storage bucket policies
-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;

-- Create comprehensive storage policies for app_docs bucket
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
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'super_admin', 'staff')
    ) OR auth.email() = 'cosmas@beanola.com')
  );

-- Create bulk operation functions for admin use
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
      updated_at = NOW(),
      review_started_at = CASE WHEN p_status = 'under_review' THEN NOW() ELSE review_started_at END,
      decision_date = CASE WHEN p_status IN ('approved', 'rejected') THEN NOW() ELSE decision_date END
    WHERE id = app_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
      
      -- Insert status history
      INSERT INTO application_status_history (application_id, status, changed_by)
      VALUES (app_id, p_status, auth.uid());
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_bulk_update_payment_status(
  p_application_ids UUID[],
  p_payment_status VARCHAR(50)
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
      payment_status = p_payment_status,
      updated_at = NOW()
    WHERE id = app_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;

-- Create function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_applications BIGINT,
  draft_applications BIGINT,
  submitted_applications BIGINT,
  under_review_applications BIGINT,
  approved_applications BIGINT,
  rejected_applications BIGINT,
  pending_payment_review BIGINT,
  verified_payments BIGINT,
  rejected_payments BIGINT
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
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_applications,
    COUNT(*) FILTER (WHERE payment_status = 'pending_review') as pending_payment_review,
    COUNT(*) FILTER (WHERE payment_status = 'verified') as verified_payments,
    COUNT(*) FILTER (WHERE payment_status = 'rejected') as rejected_payments
  FROM applications_new;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_new_status ON applications_new(status);
CREATE INDEX IF NOT EXISTS idx_applications_new_payment_status ON applications_new(payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_new_user_id ON applications_new(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_new_created_at ON applications_new(created_at);
CREATE INDEX IF NOT EXISTS idx_applications_new_updated_at ON applications_new(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_app_id ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_app_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Insert default admin user profile if it doesn't exist
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