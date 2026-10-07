/*
# Create activity_log table

1. New Tables
- `activity_log`
  - `id` (uuid, primary key)
  - `actor_id` (uuid, not null — the auth.users id of the manager/admin who performed the action)
  - `actor_email` (text, not null — denormalized email for display)
  - `actor_role` (text, not null — 'Admin' or 'Manager')
  - `action_type` (text, not null — e.g. 'manual_booking_created', 'payment_status_changed', 'booking_status_changed', 'room_updated', 'price_override_created', 'price_override_deleted', 'photo_uploaded', 'photo_deleted')
  - `entity_type` (text, not null — e.g. 'booking', 'room', 'price_override', 'photo')
  - `entity_id` (text, nullable — the id/slug/reference of the affected entity)
  - `description` (text, not null — human-readable summary of the action)
  - `metadata` (jsonb, nullable — structured details about the action, e.g. old/new values)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `activity_log`.
- SELECT: authenticated users can read all activity logs (admin & manager both need to see).
- INSERT: authenticated users can insert their own activity logs (actor_id = auth.uid()).
- No UPDATE or DELETE — activity logs are immutable audit records.

3. Indexes
- Index on `created_at` DESC for efficient chronological queries.
- Index on `actor_id` for filtering by manager.
*/

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_email text NOT NULL,
  actor_role text NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_activity_log" ON activity_log;
CREATE POLICY "select_activity_log"
  ON activity_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_activity_log" ON activity_log;
CREATE POLICY "insert_activity_log"
  ON activity_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = actor_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id ON activity_log (actor_id);
