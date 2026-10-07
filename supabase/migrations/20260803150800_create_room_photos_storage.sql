/*
# Create room_photos table and storage bucket

1. New Tables
- `room_photos`
  - `id` (uuid, primary key)
  - `room_slug` (text, not null) — matches the slug from the ROOMS data (e.g. 'deluxe-room')
  - `photo_url` (text, not null) — public URL of the uploaded image in Supabase Storage
  - `storage_path` (text, not null) — the path within the storage bucket (for deletion)
  - `created_at` (timestamptz, default now())
  - `sort_order` (integer, default 0) — for ordering photos within a room

2. Storage
- Creates a public storage bucket `room-photos` for uploading room images.
- Storage policies allow authenticated users (Admin + Manager) to upload, read, and delete photos.
- Public read access so guests can view room photos on the website.

3. Security (Database RLS)
- Enable RLS on `room_photos`.
- SELECT: anyone (anon + authenticated) can read — room photos are public on the website.
- INSERT/UPDATE/DELETE: only authenticated staff (Admin + Manager) can modify.
*/

CREATE TABLE IF NOT EXISTS room_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_slug text NOT NULL,
  photo_url text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  sort_order integer DEFAULT 0
);

ALTER TABLE room_photos ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can view room photos
DROP POLICY IF EXISTS "public_select_room_photos" ON room_photos;
CREATE POLICY "public_select_room_photos"
ON room_photos FOR SELECT
TO anon, authenticated USING (true);

-- Only authenticated staff can insert
DROP POLICY IF EXISTS "staff_insert_room_photos" ON room_photos;
CREATE POLICY "staff_insert_room_photos"
ON room_photos FOR INSERT
TO authenticated WITH CHECK (true);

-- Only authenticated staff can update
DROP POLICY IF EXISTS "staff_update_room_photos" ON room_photos;
CREATE POLICY "staff_update_room_photos"
ON room_photos FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- Only authenticated staff can delete
DROP POLICY IF EXISTS "staff_delete_room_photos" ON room_photos;
CREATE POLICY "staff_delete_room_photos"
ON room_photos FOR DELETE
TO authenticated USING (true);

-- Create the storage bucket (public so images are viewable on the website)
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-photos', 'room-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload and delete, anyone can read
DROP POLICY IF EXISTS "Public read room photos" ON storage.objects;
CREATE POLICY "Public read room photos"
ON storage.objects FOR SELECT
TO public USING (bucket_id = 'room-photos');

DROP POLICY IF EXISTS "Staff upload room photos" ON storage.objects;
CREATE POLICY "Staff upload room photos"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'room-photos');

DROP POLICY IF EXISTS "Staff delete room photos" ON storage.objects;
CREATE POLICY "Staff delete room photos"
ON storage.objects FOR DELETE
TO authenticated USING (bucket_id = 'room-photos');

-- Index for faster lookups by room
CREATE INDEX IF NOT EXISTS idx_room_photos_slug ON room_photos(room_slug);
