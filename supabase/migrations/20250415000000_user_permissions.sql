BEGIN;
  CREATE TABLE IF NOT EXISTS public.user_permissions (
    user_id uuid PRIMARY KEY,
    permissions text[] NOT NULL DEFAULT '{}'::text[],
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
  );

  ALTER TABLE public.user_permissions
    ADD CONSTRAINT user_permissions_user_fk
    FOREIGN KEY (user_id)
    REFERENCES public.user_profiles (user_id)
    ON DELETE CASCADE;

  CREATE INDEX IF NOT EXISTS user_permissions_user_idx ON public.user_permissions (user_id);

  COMMENT ON TABLE public.user_permissions IS 'Stores fine-grained permission overrides for admin-managed users.';

  CREATE OR REPLACE FUNCTION public.set_user_permissions_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS set_user_permissions_updated_at ON public.user_permissions;

  CREATE TRIGGER set_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_permissions_updated_at();
COMMIT;
