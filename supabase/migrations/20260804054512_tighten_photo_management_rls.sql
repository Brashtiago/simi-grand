/*
# Restrict photo management to Admin and Manager roles only

## Summary
Currently the `room_photos` and `gallery_photos` tables allow ANY authenticated
user to insert, update, and delete. This migration tightens those policies so
only users with the `Admin` or `Manager` role can modify photo data. Public
visitors (anon) retain read-only access.

## Changes
1. New function `is_staff()` — returns true if the authenticated user's role
   is `Admin` or `Manager` in the `users` table.
2. `room_photos` — replace INSERT/UPDATE/DELETE policies to check `is_staff()`.
3. `gallery_photos` — replace INSERT/UPDATE/DELETE policies to check `is_staff()`.

## Security
- SELECT remains public (anon + authenticated) — visitors can see photos.
- INSERT/UPDATE/DELETE restricted to `is_staff()` — only Admin and Manager
  roles can add, reorder, or remove photos.
*/

-- 1. Create is_staff() helper function
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('Admin', 'Manager')
  );
$$;

-- 2. Tighten room_photos RLS
DROP POLICY IF EXISTS "staff_delete_room_photos" ON room_photos;
CREATE POLICY "staff_delete_room_photos"
  ON room_photos FOR DELETE
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "staff_insert_room_photos" ON room_photos;
CREATE POLICY "staff_insert_room_photos"
  ON room_photos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_update_room_photos" ON room_photos;
CREATE POLICY "staff_update_room_photos"
  ON room_photos FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 3. Tighten gallery_photos RLS
DROP POLICY IF EXISTS "staff_delete_gallery_photos" ON gallery_photos;
CREATE POLICY "staff_delete_gallery_photos"
  ON gallery_photos FOR DELETE
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "staff_insert_gallery_photos" ON gallery_photos;
CREATE POLICY "staff_insert_gallery_photos"
  ON gallery_photos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_update_gallery_photos" ON gallery_photos;
CREATE POLICY "staff_update_gallery_photos"
  ON gallery_photos FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
