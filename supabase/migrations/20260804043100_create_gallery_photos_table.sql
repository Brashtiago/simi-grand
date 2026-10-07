/*
# Create gallery_photos table and storage bucket

## Purpose
Allow Admin and Manager to upload and manage photos for the public Gallery page.

## New Table: gallery_photos
- id (uuid, primary key)
- photo_url (text, not null) — public URL in Supabase Storage
- storage_path (text, not null) — path within the bucket (for deletion)
- label (text, nullable) — optional caption
- sort_order (integer, default 0)
- created_at (timestamptz, default now())

## Storage
- Public storage bucket `gallery-photos`.
- Authenticated users can upload/delete; public can read.

## Security (RLS)
- SELECT: public (anon + authenticated).
- INSERT/UPDATE/DELETE: authenticated staff only.
*/

CREATE TABLE IF NOT EXISTS gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url text NOT NULL,
  storage_path text NOT NULL,
  label text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_gallery_photos" ON gallery_photos;
CREATE POLICY "public_select_gallery_photos"
ON gallery_photos FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_gallery_photos" ON gallery_photos;
CREATE POLICY "staff_insert_gallery_photos"
ON gallery_photos FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "staff_update_gallery_photos" ON gallery_photos;
CREATE POLICY "staff_update_gallery_photos"
ON gallery_photos FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_delete_gallery_photos" ON gallery_photos;
CREATE POLICY "staff_delete_gallery_photos"
ON gallery_photos FOR DELETE
TO authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-photos', 'gallery-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read gallery photos" ON storage.objects;
CREATE POLICY "Public read gallery photos"
ON storage.objects FOR SELECT
TO public USING (bucket_id = 'gallery-photos');

DROP POLICY IF EXISTS "Staff upload gallery photos" ON storage.objects;
CREATE POLICY "Staff upload gallery photos"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'gallery-photos');

DROP POLICY IF EXISTS "Staff delete gallery photos" ON storage.objects;
CREATE POLICY "Staff delete gallery photos"
ON storage.objects FOR DELETE
TO authenticated USING (bucket_id = 'gallery-photos');

CREATE INDEX IF NOT EXISTS idx_gallery_photos_sort_order ON gallery_photos(sort_order);
