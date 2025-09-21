-- Drop the problematic email constraint
ALTER TABLE applications_new DROP CONSTRAINT IF EXISTS check_email_format;

-- Add a working email constraint
ALTER TABLE applications_new ADD CONSTRAINT check_email_format 
CHECK (email IS NULL OR email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');