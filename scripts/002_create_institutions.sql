-- Institutions table for multi-tenant support
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1f2937',
  secondary_color TEXT DEFAULT '#3b82f6',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  payment_gateway_config JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- Policies for institutions
CREATE POLICY "institutions_public_read" ON institutions
  FOR SELECT USING (true);

CREATE POLICY "institutions_admin_write" ON institutions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role = 'super_admin'
    )
  );

-- Insert default institutions
INSERT INTO institutions (id, slug, name, contact_email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'mukuba', 'Mukuba University', 'admissions@mukuba.edu.zm'),
  ('22222222-2222-2222-2222-222222222222', 'katc', 'Kasisi Agricultural Training Centre', 'admissions@katc.org.zm');
