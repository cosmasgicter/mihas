-- Add missing columns to email_notifications table for queue processing
ALTER TABLE email_notifications 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_notifications_status_created 
ON email_notifications(status, created_at) 
WHERE status IN ('pending', 'failed');

-- Add index for retry logic
CREATE INDEX IF NOT EXISTS idx_email_notifications_retry 
ON email_notifications(retry_count, created_at) 
WHERE status = 'failed' AND retry_count < 3;