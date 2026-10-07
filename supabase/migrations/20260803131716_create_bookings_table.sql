/*
# Create bookings table (single-tenant, no auth)

1. New Tables
- `bookings`
  - `id` (uuid, primary key)
  - `booking_reference` (text, unique — human-readable reference code)
  - `room_id` (text, not null — references room slug from static data)
  - `room_name` (text, not null — room name at time of booking)
  - `check_in` (date, not null)
  - `check_out` (date, not null)
  - `nights` (integer, not null — number of nights)
  - `number_of_rooms` (integer, not null, default 1)
  - `guests` (integer, not null, default 1)
  - `guest_name` (text, not null)
  - `guest_email` (text, not null)
  - `guest_phone` (text, not null)
  - `guest_country` (text)
  - `special_requests` (text)
  - `total_price` (numeric, not null)
  - `payment_method` (text, not null, default 'pay_at_hotel')
  - `payment_status` (text, not null, default 'pending')
  - `booking_status` (text, not null, default 'confirmed')
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `bookings`.
- Allow anon + authenticated to create bookings (INSERT) — this is a public booking form.
- Allow anon + authenticated to read bookings by reference (SELECT) — needed for confirmation page lookup.
- No UPDATE or DELETE from the client; bookings are immutable once created.

3. Notes
- This is a single-tenant app with no sign-in screen. All policies use `TO anon, authenticated`.
- `booking_reference` is generated client-side as a short alphanumeric code.
- Payment is handled as "pay at hotel" — no payment processing in this version.
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text UNIQUE NOT NULL,
  room_id text NOT NULL,
  room_name text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer NOT NULL,
  number_of_rooms integer NOT NULL DEFAULT 1,
  guests integer NOT NULL DEFAULT 1,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text NOT NULL,
  guest_country text,
  special_requests text,
  total_price numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'pay_at_hotel',
  payment_status text NOT NULL DEFAULT 'pending',
  booking_status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT
TO anon, authenticated WITH CHECK (true);
