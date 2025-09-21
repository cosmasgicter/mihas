-- Consolidate legacy application records into the unified applications_new table
-- and provide a compatibility view for any remaining references.
--
-- This script is idempotent and can be re-run safely. It performs the
-- following steps:
--   1. Copies any records that exist in the legacy applications table but
--      are missing from applications_new (matching on the primary key).
--   2. Renames the legacy table to applications_legacy (if it still exists)
--      so that the canonical name can be reclaimed.
--   3. Creates a compatibility view named applications that proxies reads and
--      writes to applications_new, ensuring older integrations continue to
--      function while everything uses the new storage layer.
--
-- NOTE: The copy step automatically determines the overlapping columns between
--       the legacy and new tables so schema changes do not cause failures.

BEGIN;

-- Step 1: backfill any legacy rows that have not yet been moved into applications_new
DO $$
DECLARE
  shared_columns TEXT;
  insert_sql TEXT;
BEGIN
  IF to_regclass('public.applications') IS NULL THEN
    RAISE NOTICE 'Legacy applications table not found, skipping backfill.';
    RETURN;
  END IF;

  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY column_name)
  INTO shared_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'applications_new'
    AND column_name IN (
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'applications'
    );

  IF shared_columns IS NULL THEN
    RAISE NOTICE 'No overlapping columns detected between applications and applications_new; skipping backfill.';
  ELSE
    insert_sql := format(
      'INSERT INTO applications_new (%1$s)
       SELECT %1$s FROM applications legacy
       WHERE NOT EXISTS (
         SELECT 1 FROM applications_new unified WHERE unified.id = legacy.id
       );',
      shared_columns
    );

    EXECUTE insert_sql;
    RAISE NOTICE 'Legacy applications backfill complete.';
  END IF;
END $$;

-- Step 2: rename the legacy table so the canonical name can host a view
DO $$
BEGIN
  IF to_regclass('public.applications') IS NOT NULL THEN
    IF to_regclass('public.applications_legacy') IS NULL THEN
      EXECUTE 'ALTER TABLE applications RENAME TO applications_legacy';
      RAISE NOTICE 'Renamed applications table to applications_legacy.';
    ELSE
      EXECUTE 'ALTER TABLE applications RENAME TO applications_legacy_backup';
      RAISE NOTICE 'Renamed applications table to applications_legacy_backup because applications_legacy already exists.';
    END IF;
  END IF;
END $$;

-- Step 3: create a compatibility view so older references continue to work
DROP VIEW IF EXISTS applications CASCADE;
CREATE VIEW applications AS
SELECT * FROM applications_new;

-- Ensure common privileges are preserved for the compatibility view
DO $$
BEGIN
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON applications TO anon, authenticated, service_role';
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'One or more roles (anon, authenticated, service_role) do not exist in this environment; skipping grants.';
END $$;

COMMIT;
