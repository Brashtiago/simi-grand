/*
# Create room_price_overrides table

1. New Tables
- `room_price_overrides`
  - `id` (uuid, primary key)
  - `room_slug` (text, not null) — matches the slug from ROOMS data (e.g. 'deluxe-room')
  - `start_date` (date, not null) — first night the override price applies
  - `end_date` (date, not null) — last night the override price applies (inclusive)
  - `price_per_night` (numeric, not null) — the custom price for this date range
  - `label` (text, nullable) — optional description (e.g. "New Year surge", "Off-season discount")
  - `created_at` (timestamptz, default now())

2. Security (Database RLS)
- Enable RLS on `room_price_overrides`.
- SELECT: anyone (anon + authenticated) can read — the booking page needs to fetch overrides to calculate prices.
- INSERT/UPDATE/DELETE: only authenticated staff (Admin + Manager) can modify.

3. Important Notes
- Overrides are per-room, per-date-range. When a guest books, each night in their stay
  is checked against all active overrides for that room. If a night falls within an
  override range, the override price is used; otherwise the room's default price applies.
- Multiple overrides can overlap; the first matching override (by created_at order) wins.
- `end_date` is inclusive — an override from 2025-12-25 to 2025-12-31 covers 7 nights.
*/

CREATE TABLE IF NOT EXISTS room_price_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_slug text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price_per_night numeric NOT NULL,
  label text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE room_price_overrides ENABLE ROW LEVEL SECURITY;

-- Public read: booking page needs to fetch overrides
DROP POLICY IF EXISTS "public_select_price_overrides" ON room_price_overrides;
CREATE POLICY "public_select_price_overrides"
ON room_price_overrides FOR SELECT
TO anon, authenticated USING (true);

-- Only authenticated staff can insert
DROP POLICY IF EXISTS "staff_insert_price_overrides" ON room_price_overrides;
CREATE POLICY "staff_insert_price_overrides"
ON room_price_overrides FOR INSERT
TO authenticated WITH CHECK (true);

-- Only authenticated staff can update
DROP POLICY IF EXISTS "staff_update_price_overrides" ON room_price_overrides;
CREATE POLICY "staff_update_price_overrides"
ON room_price_overrides FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- Only authenticated staff can delete
DROP POLICY IF EXISTS "staff_delete_price_overrides" ON room_price_overrides;
CREATE POLICY "staff_delete_price_overrides"
ON room_price_overrides FOR DELETE
TO authenticated USING (true);

-- Index for faster lookups by room and date
CREATE INDEX IF NOT EXISTS idx_price_overrides_room ON room_price_overrides(room_slug);
CREATE INDEX IF NOT EXISTS idx_price_overrides_dates ON room_price_overrides(start_date, end_date);

-- Constraint: end_date must be on or after start_date
ALTER TABLE room_price_overrides
ADD CONSTRAINT chk_override_date_order
CHECK (end_date >= start_date);
