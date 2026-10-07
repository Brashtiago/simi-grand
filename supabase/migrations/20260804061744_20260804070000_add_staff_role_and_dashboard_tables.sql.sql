/*
# Add Staff role, room statuses, booking notes, and staff tasks

## Purpose
Introduce a new "Staff" role in the existing Admin → Manager → Staff hierarchy.
Create tables for daily hotel operations: room statuses, internal booking notes,
and operational tasks. Add SECURITY DEFINER helper functions for role checks
and staff management. Update RLS policies so Staff can read bookings and rooms
but cannot modify room prices, delete rooms, or manage other accounts.

## New Tables
1. `room_statuses`
   - `room_slug` (text, primary key) — references rooms.slug
   - `status` (text, not null) — 'Available', 'Occupied', 'Cleaning', 'Maintenance'
   - `updated_at` (timestamptz, default now())
   - `updated_by` (uuid, nullable — auth.users id of who last changed it)

2. `booking_notes`
   - `id` (uuid, primary key)
   - `booking_id` (uuid, not null — references bookings.id)
   - `note` (text, not null)
   - `created_by` (uuid, not null — auth.users id)
   - `created_by_email` (text, not null)
   - `created_at` (timestamptz, default now())

3. `staff_tasks`
   - `id` (uuid, primary key)
   - `title` (text, not null)
   - `description` (text, nullable)
   - `assigned_to` (uuid, nullable — auth.users id of assigned staff)
   - `status` (text, not null, default 'Pending') — 'Pending', 'In Progress', 'Completed'
   - `priority` (text, not null, default 'Normal') — 'Low', 'Normal', 'High'
   - `due_date` (date, nullable)
   - `created_by` (uuid, not null — auth.users id)
   - `created_at` (timestamptz, default now())
   - `updated_at` (timestamptz, default now())

## New Functions
1. `is_staff_role()` — returns true if current user's role is 'Staff'
2. `is_admin_or_manager()` — returns true if role is 'Admin' or 'Manager'
3. `set_user_role(p_user_id uuid, p_role text)` — SECURITY DEFINER, callable
   only by Admins; changes a user's role. Used by the edge function.
4. `deactivate_staff(p_user_id uuid)` — SECURITY DEFINER, Admin-only; bans
   the auth user so they can no longer log in.

## Modified Tables
1. `users` — no schema change; the `role` column already accepts text.
   The CHECK constraint ensures role is one of 'Admin', 'Manager', 'Staff'.

2. `room_price_overrides` — tighten INSERT/UPDATE/DELETE to is_admin_or_manager()
   so Staff cannot change prices.

3. `rooms` — tighten INSERT/UPDATE/DELETE to is_admin_or_manager() so Staff
   cannot create, edit, or delete rooms.

## Security (RLS)
- `room_statuses`: SELECT for all authenticated staff; INSERT/UPDATE for all
  authenticated staff (Admin, Manager, Staff can change room status).
- `booking_notes`: SELECT for all authenticated staff; INSERT for authenticated
  staff (actor_id = auth.uid()).
- `staff_tasks`: SELECT for all authenticated staff; INSERT for admin_or_manager;
  UPDATE for all authenticated staff (so assigned staff can update status);
  DELETE for admin_or_manager only.

## Important Notes
1. The existing `is_staff()` function checks for Admin OR Manager — it is
   NOT the same as the new `is_staff_role()` which checks for the 'Staff' role.
   `is_staff()` is renamed conceptually to `is_admin_or_manager()` via a new
   function; the old function remains for backward compatibility with existing
   photo management policies.
2. The `handle_new_user()` function now defaults new users to 'Staff' instead
   of 'Manager' — only the designated admin email gets 'Admin', and existing
   manager emails get 'Manager'. New invited users default to 'Staff' unless
   the edge function explicitly sets their role.
3. All migrations are idempotent — safe to re-run.
*/

-- ============================================================
-- 1. Add CHECK constraint on users.role
-- ============================================================
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_user_role;
ALTER TABLE public.users ADD CONSTRAINT valid_user_role
  CHECK (role IN ('Admin', 'Manager', 'Staff'));

-- ============================================================
-- 2. New helper functions
-- ============================================================

-- is_staff_role(): true if current user has role = 'Staff'
CREATE OR REPLACE FUNCTION public.is_staff_role()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Staff'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff_role() TO authenticated;

-- is_admin_or_manager(): true if current user has role 'Admin' or 'Manager'
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('Admin', 'Manager')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

-- set_user_role(): Admin-only function to change a user's role
CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_role NOT IN ('Admin', 'Manager', 'Staff') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;
  UPDATE public.users SET role = p_role WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

-- deactivate_staff(): Admin-only function to ban a user's auth account
CREATE OR REPLACE FUNCTION public.deactivate_staff(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  -- Ban the user so they can no longer log in
  UPDATE auth.users SET banned_until = '2999-01-01'::timestamptz WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_staff(uuid) TO authenticated;

-- reactivate_staff(): Admin-only function to unban a user's auth account
CREATE OR REPLACE FUNCTION public.reactivate_staff(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reactivate_staff(uuid) TO authenticated;

-- ============================================================
-- 3. Update handle_new_user() to default to 'Staff' role
-- ============================================================
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
      WHEN auth.email() = 'pratikshkasana10@gmail.com' THEN 'Manager'
      ELSE 'Staff'
    END
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ============================================================
-- 4. Create room_statuses table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_statuses (
  room_slug text PRIMARY KEY REFERENCES public.rooms(slug) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Available'
    CHECK (status IN ('Available', 'Occupied', 'Cleaning', 'Maintenance')),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.room_statuses ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read room statuses
DROP POLICY IF EXISTS "staff_select_room_statuses" ON public.room_statuses;
CREATE POLICY "staff_select_room_statuses"
  ON public.room_statuses FOR SELECT
  TO authenticated USING (true);

-- All authenticated staff can insert room status
DROP POLICY IF EXISTS "staff_insert_room_statuses" ON public.room_statuses;
CREATE POLICY "staff_insert_room_statuses"
  ON public.room_statuses FOR INSERT
  TO authenticated WITH CHECK (true);

-- All authenticated staff can update room status
DROP POLICY IF EXISTS "staff_update_room_statuses" ON public.room_statuses;
CREATE POLICY "staff_update_room_statuses"
  ON public.room_statuses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger for room_statuses
CREATE OR REPLACE FUNCTION public.set_room_status_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_statuses_updated_at ON public.room_statuses;
CREATE TRIGGER room_statuses_updated_at
  BEFORE UPDATE ON public.room_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_room_status_updated_at();

-- Seed initial room statuses for existing rooms
INSERT INTO public.room_statuses (room_slug, status)
SELECT slug, 'Available' FROM public.rooms
WHERE slug NOT IN (SELECT room_slug FROM public.room_statuses)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Create booking_notes table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid NOT NULL,
  created_by_email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.booking_notes ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read booking notes
DROP POLICY IF EXISTS "staff_select_booking_notes" ON public.booking_notes;
CREATE POLICY "staff_select_booking_notes"
  ON public.booking_notes FOR SELECT
  TO authenticated USING (true);

-- All authenticated staff can add notes
DROP POLICY IF EXISTS "staff_insert_booking_notes" ON public.booking_notes;
CREATE POLICY "staff_insert_booking_notes"
  ON public.booking_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_booking_notes_booking_id ON public.booking_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_notes_created_at ON public.booking_notes(created_at DESC);

-- ============================================================
-- 6. Create staff_tasks table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  priority text NOT NULL DEFAULT 'Normal'
    CHECK (priority IN ('Low', 'Normal', 'High')),
  due_date date,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read tasks
DROP POLICY IF EXISTS "staff_select_tasks" ON public.staff_tasks;
CREATE POLICY "staff_select_tasks"
  ON public.staff_tasks FOR SELECT
  TO authenticated USING (true);

-- Admin/Manager can create tasks
DROP POLICY IF EXISTS "admin_manager_insert_tasks" ON public.staff_tasks;
CREATE POLICY "admin_manager_insert_tasks"
  ON public.staff_tasks FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

-- All authenticated staff can update tasks (status changes, assignment)
DROP POLICY IF EXISTS "staff_update_tasks" ON public.staff_tasks;
CREATE POLICY "staff_update_tasks"
  ON public.staff_tasks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Admin/Manager can delete tasks
DROP POLICY IF EXISTS "admin_manager_delete_tasks" ON public.staff_tasks;
CREATE POLICY "admin_manager_delete_tasks"
  ON public.staff_tasks FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON public.staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON public.staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON public.staff_tasks(due_date);

-- updated_at trigger for staff_tasks
CREATE OR REPLACE FUNCTION public.set_task_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_tasks_updated_at ON public.staff_tasks;
CREATE TRIGGER staff_tasks_updated_at
  BEFORE UPDATE ON public.staff_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_updated_at();

-- ============================================================
-- 7. Tighten rooms table: Staff cannot INSERT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "staff_insert_rooms" ON public.rooms;
CREATE POLICY "staff_insert_rooms"
  ON public.rooms FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "staff_update_rooms" ON public.rooms;
CREATE POLICY "staff_update_rooms"
  ON public.rooms FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "staff_delete_rooms" ON public.rooms;
CREATE POLICY "staff_delete_rooms"
  ON public.rooms FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

-- ============================================================
-- 8. Tighten room_price_overrides: Staff cannot INSERT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "staff_insert_price_overrides" ON public.room_price_overrides;
CREATE POLICY "staff_insert_price_overrides"
  ON public.room_price_overrides FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "staff_update_price_overrides" ON public.room_price_overrides;
CREATE POLICY "staff_update_price_overrides"
  ON public.room_price_overrides FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "staff_delete_price_overrides" ON public.room_price_overrides;
CREATE POLICY "staff_delete_price_overrides"
  ON public.room_price_overrides FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

-- ============================================================
-- 9. Tighten room_photos: Staff cannot INSERT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "staff_insert_room_photos" ON public.room_photos;
CREATE POLICY "staff_insert_room_photos"
  ON public.room_photos FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "staff_update_room_photos" ON public.room_photos;
CREATE POLICY "staff_update_room_photos"
  ON public.room_photos FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "staff_delete_room_photos" ON public.room_photos;
CREATE POLICY "staff_delete_room_photos"
  ON public.room_photos FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

-- ============================================================
-- 10. Tighten gallery_photos: Staff cannot INSERT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "staff_insert_gallery_photos" ON public.gallery_photos;
CREATE POLICY "staff_insert_gallery_photos"
  ON public.gallery_photos FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "staff_update_gallery_photos" ON public.gallery_photos;
CREATE POLICY "staff_update_gallery_photos"
  ON public.gallery_photos FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "staff_delete_gallery_photos" ON public.gallery_photos;
CREATE POLICY "staff_delete_gallery_photos"
  ON public.gallery_photos FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

-- ============================================================
-- 11. Allow all authenticated staff to read the users table (for task assignment)
--     But only Admin can read ALL users; Manager/Staff can read a limited view
--     via the existing policies (own row + admin_select_all).
--     We add a new policy: admin_or_manager can read all users for task assignment.
-- ============================================================
DROP POLICY IF EXISTS "admin_manager_select_all_users" ON public.users;
CREATE POLICY "admin_manager_select_all_users"
  ON public.users FOR SELECT
  TO authenticated USING (public.is_admin_or_manager());

-- Staff can read a directory of staff users (id, email, role) for task assignment
-- via a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_staff_directory()
RETURNS TABLE (id uuid, email text, role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, email, role FROM public.users
  WHERE role IN ('Admin', 'Manager', 'Staff')
  ORDER BY role, email;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_directory() TO authenticated;
