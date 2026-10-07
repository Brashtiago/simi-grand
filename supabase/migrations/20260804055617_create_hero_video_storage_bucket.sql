/*
# Create hero-video storage bucket

## Summary
Creates a public storage bucket to host the hotel's hero video, so it's
served from our own Supabase project instead of Cloudinary.

## Changes
1. New storage bucket `hero-video` (public, 50MB file size limit, video/mp4 allowed).
2. Public read policy for all visitors.
3. Staff upload/delete policy for authenticated Admin/Manager users.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hero-video', 'hero-video', true, 52428800, ARRAY['video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read hero video" ON storage.objects;
CREATE POLICY "Public read hero video"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'hero-video');

-- Staff upload
DROP POLICY IF EXISTS "Staff upload hero video" ON storage.objects;
CREATE POLICY "Staff upload hero video"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hero-video' AND public.is_staff());

-- Staff delete
DROP POLICY IF EXISTS "Staff delete hero video" ON storage.objects;
CREATE POLICY "Staff delete hero video"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'hero-video' AND public.is_staff());
