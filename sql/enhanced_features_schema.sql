-- Enhanced Features Database Schema
-- Supporting AI, predictive analytics, and workflow automation

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  optimal_timing BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'immediate',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Notification logs for tracking
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  channels TEXT[] DEFAULT '{}',
  success_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Document analysis results
CREATE TABLE IF NOT EXISTS document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications_new(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  quality VARCHAR(20) DEFAULT 'unknown',
  completeness INTEGER DEFAULT 0,
  ocr_confidence DECIMAL(3,2) DEFAULT 0,
  extracted_data JSONB DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

-- Predictive analytics results
CREATE TABLE IF NOT EXISTS prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications_new(id) ON DELETE CASCADE,
  admission_probability DECIMAL(3,2) DEFAULT 0,
  processing_time_estimate INTEGER DEFAULT 0,
  risk_factors TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0,
  model_version VARCHAR(20) DEFAULT 'v1.0',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow execution logs
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id VARCHAR(100) NOT NULL,
  application_id UUID REFERENCES applications_new(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Application assignments for workflow
CREATE TABLE IF NOT EXISTS application_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications_new(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'assigned'
);

-- Application escalations
CREATE TABLE IF NOT EXISTS application_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications_new(id) ON DELETE CASCADE,
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to VARCHAR(100),
  reason TEXT,
  escalated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'open'
);

-- AI assistant conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications_new(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- System analytics for trends
CREATE TABLE IF NOT EXISTS system_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  dimensions JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON in_app_notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_document_analysis_app ON document_analysis(application_id);
CREATE INDEX IF NOT EXISTS idx_predictions_app ON prediction_results(application_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_app ON workflow_execution_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_assignments_reviewer ON application_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON application_escalations(status);
CREATE INDEX IF NOT EXISTS idx_analytics_metric_time ON system_analytics(metric_name, recorded_at);

-- RLS Policies
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_analytics ENABLE ROW LEVEL SECURITY;

-- User can manage their own preferences
CREATE POLICY "Users can manage own notification preferences" ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- User can see their own notifications
CREATE POLICY "Users can see own notifications" ON in_app_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- User can update read status of their notifications
CREATE POLICY "Users can update own notifications" ON in_app_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can see all analytics and logs
CREATE POLICY "Admins can see all analytics" ON system_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Users can see their own AI conversations
CREATE POLICY "Users can manage own AI conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

-- Admins can see workflow logs
CREATE POLICY "Admins can see workflow logs" ON workflow_execution_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Functions for analytics
CREATE OR REPLACE FUNCTION record_system_metric(
  p_metric_name VARCHAR(100),
  p_metric_value DECIMAL(10,2),
  p_dimensions JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO system_analytics (metric_name, metric_value, dimensions)
  VALUES (p_metric_name, p_metric_value, p_dimensions)
  RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$;

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  email_enabled BOOLEAN,
  sms_enabled BOOLEAN,
  whatsapp_enabled BOOLEAN,
  push_enabled BOOLEAN,
  in_app_enabled BOOLEAN,
  optimal_timing BOOLEAN,
  frequency VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unp.email_enabled,
    unp.sms_enabled,
    unp.whatsapp_enabled,
    unp.push_enabled,
    unp.in_app_enabled,
    unp.optimal_timing,
    unp.frequency
  FROM user_notification_preferences unp
  WHERE unp.user_id = p_user_id;
  
  -- If no preferences exist, return defaults
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT true, false, false, true, true, true, 'immediate'::VARCHAR(20);
  END IF;
END;
$$;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title VARCHAR(255),
  p_content TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_action_url VARCHAR(500) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO in_app_notifications (user_id, title, content, type, action_url)
  VALUES (p_user_id, p_title, p_content, p_type, p_action_url)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to get predictive insights
CREATE OR REPLACE FUNCTION get_predictive_insights()
RETURNS TABLE (
  avg_admission_probability DECIMAL(5,2),
  total_predictions INTEGER,
  high_risk_applications INTEGER,
  processing_efficiency DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(pr.admission_probability), 0)::DECIMAL(5,2) as avg_admission_probability,
    COUNT(pr.id)::INTEGER as total_predictions,
    COUNT(CASE WHEN array_length(pr.risk_factors, 1) > 2 THEN 1 END)::INTEGER as high_risk_applications,
    COALESCE(AVG(CASE WHEN pr.processing_time_estimate <= 3 THEN 100 ELSE 50 END), 75)::DECIMAL(5,2) as processing_efficiency
  FROM prediction_results pr
  WHERE pr.created_at >= NOW() - INTERVAL '30 days';
END;
$$;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_user_notification_preferences_updated_at 
  BEFORE UPDATE ON user_notification_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at 
  BEFORE UPDATE ON ai_conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO user_notification_preferences (user_id, email_enabled, sms_enabled, in_app_enabled)
SELECT id, true, false, true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_notification_preferences)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;