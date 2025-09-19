BEGIN;
  ALTER TABLE public.user_notification_preferences
    ADD COLUMN IF NOT EXISTS sms_opt_in_at timestamptz,
    ADD COLUMN IF NOT EXISTS sms_opt_in_source text,
    ADD COLUMN IF NOT EXISTS sms_opt_in_actor uuid,
    ADD COLUMN IF NOT EXISTS sms_opt_out_at timestamptz,
    ADD COLUMN IF NOT EXISTS sms_opt_out_source text,
    ADD COLUMN IF NOT EXISTS sms_opt_out_actor uuid,
    ADD COLUMN IF NOT EXISTS sms_opt_out_reason text,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source text,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in_actor uuid,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at timestamptz,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_out_source text,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_out_actor uuid,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_out_reason text;

  COMMENT ON COLUMN public.user_notification_preferences.sms_opt_in_at IS 'Timestamp recording when the user granted SMS delivery consent.';
  COMMENT ON COLUMN public.user_notification_preferences.sms_opt_in_source IS 'Source describing how SMS consent was granted (e.g. student_settings_page).';
  COMMENT ON COLUMN public.user_notification_preferences.sms_opt_in_actor IS 'Identifier of the actor who granted SMS consent (usually the user).';
  COMMENT ON COLUMN public.user_notification_preferences.sms_opt_out_at IS 'Timestamp recording when SMS consent was revoked.';
  COMMENT ON COLUMN public.user_notification_preferences.sms_opt_out_source IS 'Source describing how SMS consent was revoked.';
  COMMENT ON COLUMN public.user_notification_preferences.sms_opt_out_actor IS 'Identifier of the actor who revoked SMS consent.';
  COMMENT ON COLUMN public.user_notification_preferences.sms_opt_out_reason IS 'Optional reason supplied when SMS consent was revoked.';
  COMMENT ON COLUMN public.user_notification_preferences.whatsapp_opt_in_at IS 'Timestamp recording when the user granted WhatsApp delivery consent.';
  COMMENT ON COLUMN public.user_notification_preferences.whatsapp_opt_in_source IS 'Source describing how WhatsApp consent was granted.';
  COMMENT ON COLUMN public.user_notification_preferences.whatsapp_opt_in_actor IS 'Identifier of the actor who granted WhatsApp consent.';
  COMMENT ON COLUMN public.user_notification_preferences.whatsapp_opt_out_at IS 'Timestamp recording when WhatsApp consent was revoked.';
  COMMENT ON COLUMN public.user_notification_preferences.whatsapp_opt_out_source IS 'Source describing how WhatsApp consent was revoked.';
  COMMENT ON COLUMN public.user_notification_preferences.whatsapp_opt_out_actor IS 'Identifier of the actor who revoked WhatsApp consent.';
  COMMENT ON COLUMN public.user_notification_preferences.whatsapp_opt_out_reason IS 'Optional reason supplied when WhatsApp consent was revoked.';

  ALTER TABLE public.notification_logs
    ADD COLUMN IF NOT EXISTS channel_statuses jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS provider_message_ids jsonb NOT NULL DEFAULT '{}'::jsonb;

  COMMENT ON COLUMN public.notification_logs.channel_statuses IS 'Per-channel delivery states captured after dispatch (e.g. sent, blocked, failed).';
  COMMENT ON COLUMN public.notification_logs.provider_message_ids IS 'Provider message identifiers keyed by channel for traceability.';
COMMIT;
