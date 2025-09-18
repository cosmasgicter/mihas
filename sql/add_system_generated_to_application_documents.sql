-- Ensure the application_documents table has a system_generated flag
ALTER TABLE application_documents
  ADD COLUMN IF NOT EXISTS system_generated BOOLEAN NOT NULL DEFAULT FALSE;
