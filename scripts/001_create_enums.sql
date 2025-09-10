-- Create custom types for the application
CREATE TYPE application_status AS ENUM (
  'draft',
  'submitted', 
  'under_review',
  'needs_more_info',
  'accepted',
  'rejected',
  'withdrawn',
  'matriculated'
);

CREATE TYPE document_verdict AS ENUM (
  'pending',
  'approved', 
  'rejected'
);

CREATE TYPE user_role_type AS ENUM (
  'applicant',
  'admissions_officer',
  'registrar',
  'super_admin'
);

CREATE TYPE notification_channel AS ENUM (
  'in_app',
  'email',
  'web_push'
);
