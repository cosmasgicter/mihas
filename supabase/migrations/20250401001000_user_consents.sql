BEGIN;
  CREATE TABLE IF NOT EXISTS public.user_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    consent_type text NOT NULL,
    granted_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    granted_by uuid,
    revoked_at timestamptz,
    revoked_by uuid,
    source text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    notes text
  );

  ALTER TABLE public.user_consents
    ADD CONSTRAINT user_consents_user_fk
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE;

  CREATE INDEX IF NOT EXISTS user_consents_user_idx ON public.user_consents (user_id);
  CREATE INDEX IF NOT EXISTS user_consents_type_idx ON public.user_consents (consent_type);
  CREATE UNIQUE INDEX IF NOT EXISTS user_consents_active_idx ON public.user_consents (user_id, consent_type)
    WHERE revoked_at IS NULL;

  COMMENT ON TABLE public.user_consents IS 'Tracks explicit data processing consents granted by students and staff.';
  COMMENT ON COLUMN public.user_consents.consent_type IS 'Semantic consent scope, e.g. outreach or analytics.';
  COMMENT ON COLUMN public.user_consents.granted_at IS 'Timestamp recording when the consent was last granted.';
  COMMENT ON COLUMN public.user_consents.revoked_at IS 'Timestamp recording when the consent was revoked. Null indicates active consent.';
COMMIT;
