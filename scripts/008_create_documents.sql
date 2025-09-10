-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  checksum TEXT,
  verdict document_verdict DEFAULT 'pending',
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policies for documents
CREATE POLICY "applicants_own_documents" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = documents.application_id
        AND a.applicant_id = auth.uid()
    )
  );

CREATE POLICY "staff_manage_documents" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN user_roles r ON r.institution_id = a.institution_id
      WHERE a.id = documents.application_id
        AND r.user_id = auth.uid()
        AND r.role IN ('admissions_officer', 'registrar', 'super_admin')
        AND r.revoked_at IS NULL
    )
  );
