-- Add storage policy for public application slip uploads
-- This allows the PublicApplicationTracker to generate and store slips without user authentication

-- Create policy for public slip uploads (when no user context is available)
CREATE POLICY "Allow public slip uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'app_docs' AND
    (storage.foldername(name))[1] = 'public'
  );

-- Create policy for public slip access
CREATE POLICY "Allow public slip access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'app_docs' AND
    (storage.foldername(name))[1] = 'public'
  );

-- Update existing user policy to be more specific
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'app_docs' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update existing user view policy to be more specific  
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'app_docs' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );