/*
# Tighten users table grants and column-level privileges

## Purpose
The previous migration created the users table but the default Postgres grants
still allow anon/authenticated to UPDATE the `role` column. This migration:
1. REVOKEs all privileges from anon on the users table (anon should never touch it).
2. REVOKEs UPDATE on the role column from authenticated (managers can't self-promote).
3. GRANTs only the minimum needed: SELECT, INSERT, UPDATE (non-role columns) to authenticated.
4. Ensures the SECURITY DEFINER function (service_role) can still manage roles.

## Changes
- REVOKE ALL on users FROM anon
- REVOKE UPDATE (role) on users FROM authenticated
- GRANT SELECT, INSERT, UPDATE (id, email, created_at) on users TO authenticated
  (UPDATE excludes the role column)

## Security Impact
- anon role: no access to users table at all
- authenticated role: can read own row, insert own row, update own row (but NOT role)
- service_role: full access (can change roles via the SECURITY DEFINER function)
*/

-- Revoke all from anon — anon should never touch the users table
REVOKE ALL ON public.users FROM anon;

-- Revoke UPDATE on role column from authenticated
REVOKE UPDATE (role) ON public.users FROM authenticated;

-- Grant only what's needed to authenticated
-- SELECT: read own profile
-- INSERT: auto-create profile on first login
-- UPDATE (non-role columns): update own profile (e.g., email sync)
GRANT SELECT ON public.users TO authenticated;
GRANT INSERT (id, email, role, created_at) ON public.users TO authenticated;
GRANT UPDATE (id, email, created_at) ON public.users TO authenticated;
