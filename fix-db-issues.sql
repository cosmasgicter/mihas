-- Fix database issues for login/signup

-- Create missing admin profile
INSERT INTO user_profiles (
  user_id,
  email,
  full_name,
  role,
  is_active
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'alexisstar8@gmail.com'),
  'alexisstar8@gmail.com',
  'Admin User',
  'admin',
  true
) ON CONFLICT (user_id) DO NOTHING;

-- Add INSERT policy for user_profiles (needed for signup)
DROP POLICY IF EXISTS "users can insert own profile" ON user_profiles;
CREATE POLICY "users can insert own profile" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add INSERT policy for service role (needed for server-side operations)
DROP POLICY IF EXISTS "service role can insert profiles" ON user_profiles;
CREATE POLICY "service role can insert profiles" ON user_profiles
FOR INSERT TO service_role
WITH CHECK (true);