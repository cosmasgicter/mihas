-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel notification_channel DEFAULT 'in_app',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "users_own_notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
