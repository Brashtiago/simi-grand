-- Add room_id column to room_photos as an alias for room_slug
-- This fixes "column room_photos.room_id does not exist" errors from queries using room_id
ALTER TABLE room_photos ADD COLUMN IF NOT EXISTS room_id text;

-- Populate room_id from room_slug for existing rows
UPDATE room_photos SET room_id = room_slug WHERE room_id IS NULL;

-- Add a trigger to keep room_id in sync with room_slug
CREATE OR REPLACE FUNCTION public.sync_room_photos_room_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.room_id = NEW.room_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_photos_sync_room_id ON room_photos;
CREATE TRIGGER room_photos_sync_room_id
  BEFORE INSERT OR UPDATE ON room_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_room_photos_room_id();
