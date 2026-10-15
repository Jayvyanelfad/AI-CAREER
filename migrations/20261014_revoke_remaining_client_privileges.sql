-- The app reads and writes public-schema data only through its Express API,
-- which uses the service_role client after route-level authentication/authorization.
-- No frontend code performs direct PostgREST table queries. Remove residual
-- privileges from browser roles as defense in depth (including PostgreSQL 17's
-- MAINTAIN privilege and earlier column-level grants).
--
-- This migration changes permissions only; it does not change or delete rows.
-- service_role grants are deliberately untouched.
BEGIN;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- REVOKE table-level grants does not necessarily remove independently granted
-- column privileges. Remove any remaining column-level privileges as well.
DO $$
DECLARE
  grant_row RECORD;
BEGIN
  FOR grant_row IN
    SELECT table_schema, table_name, column_name, privilege_type, grantee
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
  LOOP
    EXECUTE format(
      'REVOKE %s (%I) ON TABLE %I.%I FROM %I',
      grant_row.privilege_type,
      grant_row.column_name,
      grant_row.table_schema,
      grant_row.table_name,
      grant_row.grantee
    );
  END LOOP;
END;
$$;

-- Keep future objects created by postgres least-privileged too.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
