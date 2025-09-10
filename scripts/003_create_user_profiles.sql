-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  phone TEXT,
  nrc_passport TEXT,
  date_of_birth DATE,
  gender TEXT,
  nationality TEXT DEFAULT 'Zambian',
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user profiles
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "staff_read_profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('admissions_officer', 'registrar', 'super_admin')
    )
  );
