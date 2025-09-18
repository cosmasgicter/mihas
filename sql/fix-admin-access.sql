-- Fix admin access by updating user profiles
-- This will make all existing users admins for testing

-- First, let's see what users exist
SELECT 
  up.id,
  up.user_id,
  up.full_name,
  up.email,
  up.role,
  au.email as auth_email
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id::text;

-- Update all users to have admin role
UPDATE user_profiles 
SET role = 'admin' 
WHERE role != 'admin' AND role != 'super_admin';

-- Create user_roles entries for admin access
INSERT INTO user_roles (user_id, role, permissions, is_active)
SELECT 
  user_id,
  'admin',
  ARRAY['*'],
  true
FROM user_profiles 
WHERE user_id NOT IN (SELECT user_id FROM user_roles WHERE is_active = true)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  permissions = ARRAY['*'],
  is_active = true;

-- Verify the changes
SELECT 
  up.full_name,
  up.email,
  up.role as profile_role,
  ur.role as user_role,
  ur.permissions,
  ur.is_active
FROM user_profiles up
LEFT JOIN user_roles ur ON up.user_id = ur.user_id
ORDER BY up.created_at;