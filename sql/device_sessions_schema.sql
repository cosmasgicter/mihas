-- Device Sessions Table for Multi-Device Session Management
CREATE TABLE IF NOT EXISTS device_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_info TEXT,
    session_token TEXT NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one session per device per user
    UNIQUE(user_id, device_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_active ON device_sessions(is_active, last_activity);
CREATE INDEX IF NOT EXISTS idx_device_sessions_cleanup ON device_sessions(last_activity) WHERE is_active = false;

-- RLS Policies
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own device sessions" ON device_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can create own device sessions" ON device_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own device sessions" ON device_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own device sessions" ON device_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all device sessions" ON device_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin') 
            AND is_active = true
        )
    );

-- Function to clean up old sessions
CREATE OR REPLACE FUNCTION cleanup_old_device_sessions()
RETURNS void AS $$
BEGIN
    -- Delete sessions older than 30 days
    DELETE FROM device_sessions 
    WHERE last_activity < NOW() - INTERVAL '30 days';
    
    -- Deactivate sessions older than 7 days
    UPDATE device_sessions 
    SET is_active = false 
    WHERE last_activity < NOW() - INTERVAL '7 days' 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_sessions_updated_at
    BEFORE UPDATE ON device_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_device_sessions_updated_at();

-- Schedule cleanup job (if pg_cron is available)
-- SELECT cron.schedule('cleanup-device-sessions', '0 2 * * *', 'SELECT cleanup_old_device_sessions();');