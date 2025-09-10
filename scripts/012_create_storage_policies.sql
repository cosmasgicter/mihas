-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies for documents bucket
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Staff can view documents in their institution" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' 
    AND EXISTS (
      SELECT 1 FROM applications a
      JOIN documents d ON d.application_id = a.id
      JOIN user_roles r ON r.institution_id = a.institution_id
      WHERE d.file_path = name
        AND r.user_id = auth.uid()
        AND r.role IN ('admissions_officer', 'registrar', 'super_admin')
        AND r.revoked_at IS NULL
    )
  );

CREATE POLICY "Users can update their own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
