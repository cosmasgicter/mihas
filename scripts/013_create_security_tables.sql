-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON rate_limits(key, created_at);

-- Security settings table
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default security settings
INSERT INTO security_settings (key, value, description) VALUES
  ('max_login_attempts', '5', 'Maximum login attempts before account lockout'),
  ('lockout_duration_minutes', '30', 'Account lockout duration in minutes'),
  ('session_timeout_hours', '24', 'Session timeout in hours'),
  ('require_email_verification', 'true', 'Require email verification for new accounts'),
  ('enable_two_factor', 'false', 'Enable two-factor authentication'),
  ('password_min_length', '8', 'Minimum password length'),
  ('password_require_special', 'false', 'Require special characters in passwords')
ON CONFLICT (key) DO NOTHING;

-- User sessions table for enhanced session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Enable RLS on security tables
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for security tables
CREATE POLICY "admin_manage_security_settings" ON security_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role = 'super_admin'
        AND r.revoked_at IS NULL
    )
  );

CREATE POLICY "users_own_sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Create a scheduled job to clean up expired data (if pg_cron is available)
-- SELECT cron.schedule('cleanup-expired-data', '0 * * * *', 'SELECT cleanup_expired_sessions();');
