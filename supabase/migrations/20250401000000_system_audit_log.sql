BEGIN;
  CREATE TABLE IF NOT EXISTS public.system_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    actor_id uuid,
    actor_email text,
    actor_roles text[] DEFAULT ARRAY[]::text[],
    target_table text,
    target_id text,
    target_label text,
    request_id text,
    request_ip inet,
    user_agent text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
  );

  COMMENT ON TABLE public.system_audit_log IS 'Immutable audit log capturing sensitive system actions performed through the platform APIs.';
  COMMENT ON COLUMN public.system_audit_log.action IS 'Fully qualified action identifier (e.g. applications.status.update).';
  COMMENT ON COLUMN public.system_audit_log.actor_id IS 'Identifier of the user who initiated the action, if authenticated.';
  COMMENT ON COLUMN public.system_audit_log.actor_roles IS 'Set of application roles resolved for the actor when the action executed.';
  COMMENT ON COLUMN public.system_audit_log.target_table IS 'Logical table or entity that the action interacted with.';
  COMMENT ON COLUMN public.system_audit_log.target_id IS 'Primary identifier of the record that was affected by the action.';
  COMMENT ON COLUMN public.system_audit_log.metadata IS 'Structured JSON payload describing the action inputs, results, or request context.';

  CREATE INDEX IF NOT EXISTS system_audit_log_created_at_idx ON public.system_audit_log (created_at DESC);
  CREATE INDEX IF NOT EXISTS system_audit_log_action_idx ON public.system_audit_log (action);
  CREATE INDEX IF NOT EXISTS system_audit_log_actor_idx ON public.system_audit_log (actor_id);
  CREATE INDEX IF NOT EXISTS system_audit_log_target_idx ON public.system_audit_log (target_table, target_id);
COMMIT;
