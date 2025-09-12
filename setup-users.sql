-- Setup script to create new user accounts
-- Run this in your Supabase SQL editor

-- Remove existing test users
DELETE FROM user_profiles WHERE email IN ('ycwlaodj@minimax.com', 'cbldpgkd@minimax.com');
DELETE FROM auth.users WHERE email IN ('ycwlaodj@minimax.com', 'cbldpgkd@minimax.com');

-- Create admin user: alexisstar8@gmail.com
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'alexisstar8@gmail.com',
  crypt('Beanola2025', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated'
);

-- Create student user: cosmas@beanola.com  
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'cosmas@beanola.com',
  crypt('Beanola2025', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated'
);

-- Create admin profile
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
);

-- Create student profile
INSERT INTO user_profiles (
  user_id,
  email,
  full_name,
  role,
  is_active
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'cosmas@beanola.com'),
  'cosmas@beanola.com',
  'Student User',
  'student',
  true
);