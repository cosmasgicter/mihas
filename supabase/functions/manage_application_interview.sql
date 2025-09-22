-- Function: manage_application_interview
-- Provides a consistent way to schedule, reschedule and cancel interviews
-- while capturing audit metadata.

CREATE OR REPLACE FUNCTION public.manage_application_interview(
  p_application_id uuid,
  p_action text,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_mode text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.application_interviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_existing public.application_interviews;
  v_result public.application_interviews;
BEGIN
  IF p_action NOT IN ('schedule', 'reschedule', 'cancel') THEN
    RAISE EXCEPTION 'Unsupported interview action: %', p_action USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.application_interviews
   WHERE application_id = p_application_id;

  IF p_action = 'schedule' THEN
    IF p_scheduled_at IS NULL THEN
      RAISE EXCEPTION 'Scheduled at timestamp is required to schedule an interview' USING ERRCODE = '22023';
    END IF;

    IF p_mode IS NULL THEN
      RAISE EXCEPTION 'Interview mode is required to schedule an interview' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.application_interviews AS ai (
      application_id,
      scheduled_at,
      mode,
      location,
      status,
      notes,
      created_by,
      updated_by
    )
    VALUES (
      p_application_id,
      p_scheduled_at,
      p_mode,
      p_location,
      CASE WHEN v_existing.id IS NULL THEN 'scheduled' ELSE 'rescheduled' END,
      p_notes,
      COALESCE(v_existing.created_by, v_actor_id),
      v_actor_id
    )
    ON CONFLICT (application_id)
    DO UPDATE SET
      scheduled_at = EXCLUDED.scheduled_at,
      mode = EXCLUDED.mode,
      location = EXCLUDED.location,
      status = EXCLUDED.status,
      notes = COALESCE(EXCLUDED.notes, public.application_interviews.notes),
      updated_by = EXCLUDED.updated_by,
      updated_at = timezone('utc'::text, now())
    RETURNING *
      INTO v_result;

  ELSIF p_action = 'reschedule' THEN
    IF v_existing.id IS NULL THEN
      RAISE EXCEPTION 'No interview to reschedule for application %', p_application_id USING ERRCODE = '22023';
    END IF;

    IF p_scheduled_at IS NULL THEN
      RAISE EXCEPTION 'Scheduled at timestamp is required to reschedule an interview' USING ERRCODE = '22023';
    END IF;

    v_result := (
      UPDATE public.application_interviews
         SET scheduled_at = p_scheduled_at,
             mode = COALESCE(p_mode, mode),
             location = COALESCE(p_location, location),
             status = 'rescheduled',
             notes = COALESCE(p_notes, notes),
             updated_by = v_actor_id,
             updated_at = timezone('utc'::text, now())
       WHERE application_id = p_application_id
       RETURNING *
    );

  ELSE -- cancel
    IF v_existing.id IS NULL THEN
      RAISE EXCEPTION 'No interview to cancel for application %', p_application_id USING ERRCODE = '22023';
    END IF;

    v_result := (
      UPDATE public.application_interviews
         SET status = 'cancelled',
             notes = COALESCE(p_notes, notes),
             updated_by = v_actor_id,
             updated_at = timezone('utc'::text, now())
       WHERE application_id = p_application_id
       RETURNING *
    );
  END IF;

  INSERT INTO public.system_audit_log (
    action,
    actor_id,
    target_table,
    target_id,
    metadata
  ) VALUES (
    'applications.interview.' || p_action,
    v_actor_id,
    'application_interviews',
    COALESCE(v_result.id::text, p_application_id::text),
    jsonb_build_object(
      'applicationId', p_application_id,
      'scheduledAt', v_result.scheduled_at,
      'status', v_result.status,
      'mode', v_result.mode,
      'location', v_result.location,
      'notes', v_result.notes
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manage_application_interview(uuid, text, timestamptz, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.manage_application_interview(uuid, text, timestamptz, text, text, text) TO authenticated;
