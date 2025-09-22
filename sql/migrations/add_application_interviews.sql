BEGIN;
  CREATE TABLE IF NOT EXISTS public.application_interviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES public.applications_new(id) ON DELETE CASCADE,
    scheduled_at timestamptz NOT NULL,
    interview_date date GENERATED ALWAYS AS (scheduled_at::date) STORED,
    interview_time time with time zone GENERATED ALWAYS AS (scheduled_at::time with time zone) STORED,
    mode text NOT NULL CHECK (mode IN ('in_person', 'virtual', 'phone')),
    location text,
    status text NOT NULL CHECK (status IN ('scheduled', 'rescheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
  );

  CREATE UNIQUE INDEX IF NOT EXISTS application_interviews_application_id_idx
    ON public.application_interviews(application_id);

  CREATE INDEX IF NOT EXISTS application_interviews_status_idx
    ON public.application_interviews(status);

  CREATE INDEX IF NOT EXISTS application_interviews_scheduled_at_idx
    ON public.application_interviews(scheduled_at DESC);

  CREATE OR REPLACE FUNCTION public.set_application_interviews_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS set_application_interviews_updated_at ON public.application_interviews;

  CREATE TRIGGER set_application_interviews_updated_at
    BEFORE UPDATE ON public.application_interviews
    FOR EACH ROW
    EXECUTE FUNCTION public.set_application_interviews_updated_at();
COMMIT;
