-- User roles table for role-based access control
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  institution_id UUID REFERENCES institutions(id),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, role, institution_id)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user roles
CREATE POLICY "users_read_own_roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role = 'super_admin'
        AND r.revoked_at IS NULL
    )
  );

-- Function to automatically create applicant role on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );
  
  -- Assign applicant role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'applicant');
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile and role on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
