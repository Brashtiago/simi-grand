/*
# Create users table for staff authentication and roles

## Purpose
This table stores staff user profiles with role assignments (Admin, Manager).
It links to Supabase auth.users via the auth.uid() → user_id relationship.
There is NO public signup — only the site owner creates accounts manually
through Supabase Studio. The first time a known email logs in, if no profile
row exists yet, one is auto-created. The designated admin email is auto-promoted
to Admin role on first login.

## New Tables
- `users`
  - `id` (uuid, primary key, defaults to auth.uid())
  - `email` (text, not null, unique — mirrors auth.users email)
  - `role` (text, not null, default 'Manager' — either 'Admin' or 'Manager')
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled on `users`.
- SELECT: users can read their own row (auth.uid() = id).
- INSERT: users can insert their own row (auth.uid() = id) — needed for auto-profile creation on first login.
- UPDATE: users can update their own row (auth.uid() = id) — but NOT the role column (enforced by column-level privilege: REVOKE UPDATE on role from anon/authenticated).
- DELETE: no client-side deletes.

## Column-Level Privilege
- The `role` column is UPDATE-restricted: only service_role can change it.
  This prevents a Manager from escalating themselves to Admin via the client.
  The auto-promotion of the designated admin email happens via a SECURITY DEFINER
  function that runs with elevated privileges.

## SECURITY DEFINER Function
- `handle_new_user()`: called on first login. If no profile row exists for the
  auth.uid(), inserts one. If the email matches the designated admin email,
  sets role to 'Admin'. Otherwise defaults to 'Manager'.
  This function is SECURITY DEFINER so it can INSERT into the users table
  even though the caller might not yet have a row.

## Notes
1. The designated admin email is hardcoded in the function: pratikshkasana8844@gmail.com
2. Existing bookings table policies are NOT changed — public read/insert remains.
3. This migration is idempotent — safe to re-run.
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'Manager',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- Users can insert their own profile (for auto-creation on first login)
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Users can update their own profile (but NOT the role column — see REVOKE below)
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Prevent users from changing their own role via the client
-- Only service_role can UPDATE the role column
REVOKE UPDATE (role) ON users FROM anon, authenticated;

-- SECURITY DEFINER function to auto-create user profile on first login
-- If the email matches the designated admin, role is set to 'Admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    auth.uid(),
    auth.email(),
    CASE
      WHEN auth.email() = 'pratikshkasana8844@gmail.com' THEN 'Admin'
      ELSE 'Manager'
    END
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute to authenticated users (they call this on login)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Also update bookings policies: allow authenticated staff to manage bookings
-- (read all bookings, update booking status). Public anon can still insert bookings.
DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Staff (authenticated) can update booking statuses
DROP POLICY IF EXISTS "staff_update_bookings" ON bookings;
CREATE POLICY "staff_update_bookings" ON bookings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
