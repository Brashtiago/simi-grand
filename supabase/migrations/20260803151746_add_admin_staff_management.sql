/*
# Add admin-only staff management support

## Purpose
Enable the Admin dashboard to list all staff accounts and invite new managers
by email. The edge function handles the actual invite (via the Supabase Admin
API), but the Admin page needs to read the full users table to display the
staff directory. Currently users can only read their own row.

## Changes

### New function: is_admin()
- SECURITY DEFINER, STABLE, returns boolean.
- Checks whether the current auth.uid() has role = 'Admin' in the users table.
- Used by the new SELECT policy so only Admins can list all staff.

### Modified table: users
- New SELECT policy "admin_select_all_users": Admins can SELECT all rows.
- The existing "users_select_own" policy remains so non-admins still read
  their own row.

## Security
- is_admin() runs as SECURITY DEFINER so it can read the role column even
  though the caller may not have direct UPDATE access to it.
- Only authenticated users with role 'Admin' pass the check.
- No INSERT/UPDATE/DELETE policy changes — staff creation is handled by
  the edge function using the service role key, not by the client.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admins can read all staff profiles
DROP POLICY IF EXISTS "admin_select_all_users" ON users;
CREATE POLICY "admin_select_all_users" ON users FOR SELECT
  TO authenticated USING (public.is_admin());
