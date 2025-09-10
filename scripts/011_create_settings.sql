-- Settings table for configuration
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  scope TEXT DEFAULT 'global', -- 'global' or institution_id
  scope_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(key, scope, scope_id)
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings
CREATE POLICY "admin_manage_settings" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role = 'super_admin'
        AND r.revoked_at IS NULL
    )
  );

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
  ('registration_open', 'true', 'Enable/disable new registrations'),
  ('max_file_size_mb', '10', 'Maximum file upload size in MB'),
  ('allowed_file_types', '["pdf", "jpg", "jpeg", "png", "doc", "docx"]', 'Allowed file types for uploads');
