/*
# Create rooms table for editable room data

## Purpose
Move room data (name, description, prices, capacity, bed type, etc.) from
the hardcoded src/data/hotel.ts into a database table so Admin and Manager
can edit rooms through the dashboard without touching code.

## New Table: rooms
- id (text, primary key) — matches existing static IDs ('1', '2', '3')
- slug (text, unique, not null) — URL slug (e.g. 'deluxe-room')
- name (text, not null)
- description (text, not null)
- price (numeric, not null) — default weekday price per night
- weekend_price (numeric, not null)
- seasonal_price (numeric, not null)
- capacity (integer, not null) — max guests
- bed_type (text, not null)
- room_size (text, not null)
- view_type (text, not null)
- amenities (text[], not null) — array of amenity strings
- total_rooms (integer, not null) — inventory count
- sort_order (integer, default 0)
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## Security (RLS)
- SELECT: anyone (anon + authenticated) — room data is public on the website
- INSERT/UPDATE/DELETE: only authenticated staff (Admin + Manager)

## Seed Data
- Inserts the 3 existing rooms from the static data with their current values.

## Notes
- The room_photos table already references room_slug; this table provides
  the canonical room definitions.
- updated_at is maintained by a trigger to track edits.
*/

CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  weekend_price numeric NOT NULL,
  seasonal_price numeric NOT NULL,
  capacity integer NOT NULL,
  bed_type text NOT NULL,
  room_size text NOT NULL,
  view_type text NOT NULL,
  amenities text[] NOT NULL DEFAULT '{}',
  total_rooms integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Public read: room data is displayed on the website
DROP POLICY IF EXISTS "public_select_rooms" ON rooms;
CREATE POLICY "public_select_rooms"
ON rooms FOR SELECT
TO anon, authenticated USING (true);

-- Staff can insert new rooms
DROP POLICY IF EXISTS "staff_insert_rooms" ON rooms;
CREATE POLICY "staff_insert_rooms"
ON rooms FOR INSERT
TO authenticated WITH CHECK (true);

-- Staff can update rooms
DROP POLICY IF EXISTS "staff_update_rooms" ON rooms;
CREATE POLICY "staff_update_rooms"
ON rooms FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- Staff can delete rooms
DROP POLICY IF EXISTS "staff_delete_rooms" ON rooms;
CREATE POLICY "staff_delete_rooms"
ON rooms FOR DELETE
TO authenticated USING (true);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_rooms_sort_order ON rooms(sort_order);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_updated_at ON rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Seed existing room data
INSERT INTO rooms (id, slug, name, description, price, weekend_price, seasonal_price, capacity, bed_type, room_size, view_type, amenities, total_rooms, sort_order)
VALUES
  ('1', 'deluxe-room', 'Deluxe Room',
   'A few quiet steps between you and the mountains. The Deluxe Room frames the Himalayas through a single generous window — warm cedar interiors, considered lighting, and a bed positioned for waking to morning mist.',
   4500, 5500, 7500, 2, 'King Bed', '240 sq ft', 'Valley & Mountain Views',
   ARRAY['High-Speed Wi-Fi','Mountain View','24-Hour Front Desk','Hot Water','Room Service','Tea/Coffee Maker'],
   6, 1),
  ('2', 'premium-room', 'Premium Room',
   'Considered comforts, mountain hospitality. The Premium Room offers an expanded layout with a private balcony, a reading nook by the window, and panoramic Himalayan vistas that shift with the light.',
   6500, 7800, 10500, 2, 'King Bed', '320 sq ft', 'Panoramic Mountain View',
   ARRAY['High-Speed Wi-Fi','Mountain View','Private Balcony','24-Hour Front Desk','Hot Water','Room Service','Tea/Coffee Maker','Mini Bar'],
   4, 2),
  ('3', 'luxury-room', 'Luxury Room',
   'A viewfinder on the peaks. The Luxury Room is our most spacious category — floor-to-ceiling windows, a cedar-clad sitting area, and an open terrace that places the full grandeur of the range at your feet.',
   8500, 9800, 13500, 3, 'King Bed + Day Bed', '420 sq ft', 'Panoramic Mountain View with Terrace',
   ARRAY['High-Speed Wi-Fi','Mountain View','Private Terrace','24-Hour Front Desk','Hot Water','Room Service','Tea/Coffee Maker','Mini Bar','Heating','Premium Toiletries'],
   2, 3)
ON CONFLICT (id) DO NOTHING;
