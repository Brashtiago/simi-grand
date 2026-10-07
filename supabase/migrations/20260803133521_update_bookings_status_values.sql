/*
# Update bookings table with standardized status values and CHECK constraints

## Purpose
Align the bookings table with the required enum-like values for payment_method,
payment_status, and booking_status. Add CHECK constraints to enforce valid
values at the database level.

## Changes to `bookings` table
1. `payment_method`: values restricted to 'Pay Now' or 'Pay at Checkout'
   - Default changed from 'pay_at_hotel' to 'Pay at Checkout'
2. `payment_status`: values restricted to 'Pending Verification', 'Paid', 'Pay at Checkout', 'Offline'
   - Default changed from 'pending' to 'Pending Verification'
3. `booking_status`: values restricted to 'Confirmed', 'Pending', 'Cancelled'
   - Default changed from 'confirmed' to 'Pending'

## CHECK Constraints
- `valid_payment_method`: payment_method IN ('Pay Now', 'Pay at Checkout')
- `valid_payment_status`: payment_status IN ('Pending Verification', 'Paid', 'Pay at Checkout', 'Offline')
- `valid_booking_status`: booking_status IN ('Confirmed', 'Pending', 'Cancelled')

## Security
No RLS policy changes — existing policies remain in place.

## Notes
1. This migration is idempotent — constraints are dropped before re-adding.
2. Existing rows with old values ('pay_at_hotel', 'pay_online', 'pending', 'confirmed')
   are updated to the new standardized values before constraints are applied.
3. New bookings default to booking_status='Pending' (staff must confirm) and
   payment_status='Pending Verification' (until payment is verified or marked as pay at checkout).
*/

-- Migrate existing data to new values
UPDATE bookings SET payment_method = 'Pay at Checkout' WHERE payment_method = 'pay_at_hotel';
UPDATE bookings SET payment_method = 'Pay Now' WHERE payment_method = 'pay_online';
UPDATE bookings SET payment_status = 'Pending Verification' WHERE payment_status = 'pending';
UPDATE bookings SET payment_status = 'Paid' WHERE payment_status = 'paid';
UPDATE bookings SET booking_status = 'Pending' WHERE booking_status = 'pending';
UPDATE bookings SET booking_status = 'Confirmed' WHERE booking_status = 'confirmed';
UPDATE bookings SET booking_status = 'Cancelled' WHERE booking_status = 'cancelled';

-- Update defaults
ALTER TABLE bookings ALTER COLUMN payment_method SET DEFAULT 'Pay at Checkout';
ALTER TABLE bookings ALTER COLUMN payment_status SET DEFAULT 'Pending Verification';
ALTER TABLE bookings ALTER COLUMN booking_status SET DEFAULT 'Pending';

-- Add CHECK constraints (drop first for idempotency)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_payment_method;
ALTER TABLE bookings ADD CONSTRAINT valid_payment_method
  CHECK (payment_method IN ('Pay Now', 'Pay at Checkout'));

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_payment_status;
ALTER TABLE bookings ADD CONSTRAINT valid_payment_status
  CHECK (payment_status IN ('Pending Verification', 'Paid', 'Pay at Checkout', 'Offline'));

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_booking_status;
ALTER TABLE bookings ADD CONSTRAINT valid_booking_status
  CHECK (booking_status IN ('Confirmed', 'Pending', 'Cancelled'));
